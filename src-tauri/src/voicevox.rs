//! VOICEVOX Core音声合成モジュール
//!
//! VOICEVOX Core 0.16.2 (MIT LICENSE) を使用してずんだもんの音声を合成・再生
//! https://github.com/VOICEVOX/voicevox_core

use libloading::{Library, Symbol};
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_uint};
use std::path::Path;
use std::sync::{Arc, Mutex, OnceLock};

/// VOICEVOX Coreライブラリへのグローバルハンドル
static VOICEVOX: OnceLock<Option<Arc<VoicevoxCore>>> = OnceLock::new();

/// ずんだもんのスピーカーID
const ZUNDAMON_SPEAKER_ID: u32 = 3;

/// VOICEVOX Coreのラッパー
struct VoicevoxCore {
    _library: Library,
    initialized: Mutex<bool>,

    // FFI関数ポインタ
    initialize: Symbol<'static, unsafe extern "C" fn(*const c_char, bool) -> c_int>,
    finalize: Symbol<'static, unsafe extern "C" fn()>,
    load_model: Symbol<'static, unsafe extern "C" fn(c_uint) -> c_int>,
    tts: Symbol<
        'static,
        unsafe extern "C" fn(
            *const c_char,
            c_uint,
            *mut usize,
            *mut *mut u8,
        ) -> c_int,
    >,
    wav_free: Symbol<'static, unsafe extern "C" fn(*mut u8)>,
    error_result_to_message:
        Symbol<'static, unsafe extern "C" fn(c_int) -> *const c_char>,
}

// VoicevoxCoreはスレッド間で安全に共有可能
unsafe impl Send for VoicevoxCore {}
unsafe impl Sync for VoicevoxCore {}

/// VOICEVOX Coreの初期化
pub fn initialize(voicevox_dir: &Path) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if VOICEVOX.get().is_some() {
        return Ok(());
    }

    let dll_path = voicevox_dir.join("voicevox_core.dll");
    if !dll_path.exists() {
        return Err(format!(
            "VOICEVOX Core DLLが見つかりません: {}",
            dll_path.display()
        )
        .into());
    }

    // ライブラリをロード
    let library = unsafe { Library::new(&dll_path)? };

    // 関数シンボルを取得
    let initialize: Symbol<unsafe extern "C" fn(*const c_char, bool) -> c_int> =
        unsafe { library.get(b"voicevox_initialize")? };
    let finalize: Symbol<unsafe extern "C" fn()> =
        unsafe { library.get(b"voicevox_finalize")? };
    let load_model: Symbol<unsafe extern "C" fn(c_uint) -> c_int> =
        unsafe { library.get(b"voicevox_load_model")? };
    let tts: Symbol<
        unsafe extern "C" fn(*const c_char, c_uint, *mut usize, *mut *mut u8) -> c_int,
    > = unsafe { library.get(b"voicevox_tts")? };
    let wav_free: Symbol<unsafe extern "C" fn(*mut u8)> =
        unsafe { library.get(b"voicevox_wav_free")? };
    let error_result_to_message: Symbol<unsafe extern "C" fn(c_int) -> *const c_char> =
        unsafe { library.get(b"voicevox_error_result_to_message")? };

    // シンボルを'staticに変換（ライブラリが生存している限り安全）
    let core = VoicevoxCore {
        _library: library,
        initialized: Mutex::new(false),
        initialize: unsafe { std::mem::transmute(initialize) },
        finalize: unsafe { std::mem::transmute(finalize) },
        load_model: unsafe { std::mem::transmute(load_model) },
        tts: unsafe { std::mem::transmute(tts) },
        wav_free: unsafe { std::mem::transmute(wav_free) },
        error_result_to_message: unsafe { std::mem::transmute(error_result_to_message) },
    };

    // Open JTalk辞書パスを設定
    let dict_path = voicevox_dir.join("open_jtalk_dic_utf_8-1.11");
    let dict_path_cstr = CString::new(dict_path.to_string_lossy().as_ref())?;

    // 初期化
    let result = unsafe { (core.initialize)(dict_path_cstr.as_ptr(), false) };
    if result != 0 {
        let error_msg = unsafe {
            let msg_ptr = (core.error_result_to_message)(result);
            CStr::from_ptr(msg_ptr).to_string_lossy().into_owned()
        };
        return Err(format!("VOICEVOX初期化エラー: {}", error_msg).into());
    }

    // ずんだもんのモデルをロード
    let result = unsafe { (core.load_model)(ZUNDAMON_SPEAKER_ID) };
    if result != 0 {
        let error_msg = unsafe {
            let msg_ptr = (core.error_result_to_message)(result);
            CStr::from_ptr(msg_ptr).to_string_lossy().into_owned()
        };
        return Err(format!("モデルロードエラー: {}", error_msg).into());
    }

    *core.initialized.lock().unwrap() = true;
    let _ = VOICEVOX.set(Some(Arc::new(core)));

    Ok(())
}

/// VOICEVOX Coreが利用可能かどうか
pub fn is_available() -> bool {
    VOICEVOX
        .get()
        .and_then(|opt| opt.as_ref())
        .map(|core| *core.initialized.lock().unwrap())
        .unwrap_or(false)
}

/// テキストを音声合成して再生
pub async fn speak(text: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let core = VOICEVOX
        .get()
        .and_then(|opt| opt.as_ref())
        .ok_or("VOICEVOX Coreが初期化されていません")?;

    if !*core.initialized.lock().unwrap() {
        // フォールバック: Windows TTSを使用
        return speak_windows_tts(text).await;
    }

    // 音声合成
    let text_cstr = CString::new(text)?;
    let mut wav_length: usize = 0;
    let mut wav_ptr: *mut u8 = std::ptr::null_mut();

    let result = unsafe {
        (core.tts)(
            text_cstr.as_ptr(),
            ZUNDAMON_SPEAKER_ID,
            &mut wav_length,
            &mut wav_ptr,
        )
    };

    if result != 0 {
        let error_msg = unsafe {
            let msg_ptr = (core.error_result_to_message)(result);
            CStr::from_ptr(msg_ptr).to_string_lossy().into_owned()
        };
        // VOICEVOX失敗時はWindows TTSにフォールバック
        eprintln!("VOICEVOX TTS エラー: {}, Windows TTSにフォールバック", error_msg);
        return speak_windows_tts(text).await;
    }

    // WAVデータをコピー
    let wav_data = unsafe { std::slice::from_raw_parts(wav_ptr, wav_length).to_vec() };

    // メモリを解放
    unsafe { (core.wav_free)(wav_ptr) };

    // 一時ファイルに書き出して再生
    let temp_path = std::env::temp_dir().join("readthecard_tts.wav");
    std::fs::write(&temp_path, &wav_data)?;

    // Windows Multimedia APIで再生
    play_wav_file(&temp_path)?;

    Ok(())
}

/// Windows TTSで音声合成（フォールバック）
async fn speak_windows_tts(text: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // PowerShellでSystem.Speech.Synthesisを使用
        let script = format!(
            "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('{}')",
            text.replace("'", "''")
        );

        Command::new("powershell")
            .args(["-Command", &script])
            .output()?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        eprintln!("音声合成: {} (非Windows環境では再生されません)", text);
    }

    Ok(())
}

/// WAVファイルを再生
fn play_wav_file(path: &Path) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // PowerShellでMediaPlayerを使用
        let script = format!(
            "$player = New-Object System.Media.SoundPlayer '{}'; $player.PlaySync()",
            path.display()
        );

        Command::new("powershell")
            .args(["-Command", &script])
            .output()?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        eprintln!("WAV再生: {} (非Windows環境では再生されません)", path.display());
    }

    Ok(())
}

impl Drop for VoicevoxCore {
    fn drop(&mut self) {
        if *self.initialized.lock().unwrap() {
            unsafe { (self.finalize)() };
        }
    }
}
