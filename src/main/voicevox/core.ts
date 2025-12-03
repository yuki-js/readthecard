/**
 * VOICEVOX Core FFI バインディング
 * koffiを使用してVOICEVOX CoreのC APIを呼び出す
 * 
 * VOICEVOX Core 0.16.2 (MIT LICENSE)
 * https://github.com/VOICEVOX/voicevox_core
 */

import koffi from 'koffi';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

/** VOICEVOX Core結果コード */
enum VoicevoxResultCode {
  VOICEVOX_RESULT_OK = 0,
  VOICEVOX_RESULT_NOT_LOADED_OPENJTALK_DICT_ERROR = 1,
  VOICEVOX_RESULT_GET_SUPPORTED_DEVICES_ERROR = 3,
  VOICEVOX_RESULT_GPU_SUPPORT_ERROR = 4,
  VOICEVOX_RESULT_STYLE_NOT_FOUND_ERROR = 6,
  VOICEVOX_RESULT_MODEL_NOT_FOUND_ERROR = 7,
  VOICEVOX_RESULT_RUN_MODEL_ERROR = 8,
}

/** koffi型定義 */
let lib: koffi.IKoffiLib | null = null;

// C関数の型定義
let voicevox_open_jtalk_rc_new: koffi.KoffiFunction | null = null;
let voicevox_open_jtalk_rc_delete: koffi.KoffiFunction | null = null;
let voicevox_synthesizer_new: koffi.KoffiFunction | null = null;
let voicevox_synthesizer_delete: koffi.KoffiFunction | null = null;
let voicevox_synthesizer_load_voice_model: koffi.KoffiFunction | null = null;
let voicevox_synthesizer_tts: koffi.KoffiFunction | null = null;
let voicevox_make_default_initialize_options: koffi.KoffiFunction | null = null;
let voicevox_make_default_tts_options: koffi.KoffiFunction | null = null;
let voicevox_voice_model_file_open: koffi.KoffiFunction | null = null;
let voicevox_voice_model_file_delete: koffi.KoffiFunction | null = null;
let voicevox_onnxruntime_load_once: koffi.KoffiFunction | null = null;
let voicevox_make_default_load_onnxruntime_options: koffi.KoffiFunction | null = null;
let voicevox_wav_free: koffi.KoffiFunction | null = null;
let voicevox_error_result_to_message: koffi.KoffiFunction | null = null;

/** 初期化状態 */
let isInitialized = false;
let synthesizerHandle: Buffer | null = null;
let openJtalkHandle: Buffer | null = null;

/**
 * VOICEVOX Coreライブラリのパスを取得
 */
function getLibraryPath(): string {
  // 開発時: voicevox/ディレクトリ
  // パッケージ時: resources/voicevox/
  const devPath = path.join(process.cwd(), 'voicevox', 'voicevox_core.dll');
  const prodPath = path.join(app.getPath('exe'), '..', 'resources', 'voicevox', 'voicevox_core.dll');
  
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  
  throw new Error('VOICEVOX Coreライブラリが見つかりません');
}

/**
 * Open JTalk辞書のパスを取得
 */
function getOpenJtalkDictPath(): string {
  const devPath = path.join(process.cwd(), 'voicevox', 'open_jtalk_dic_utf_8-1.11');
  const prodPath = path.join(app.getPath('exe'), '..', 'resources', 'voicevox', 'open_jtalk_dic_utf_8-1.11');
  
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  
  throw new Error('Open JTalk辞書が見つかりません');
}

/**
 * VVMファイル（ずんだもん）のパスを取得
 */
function getZundamonVvmPath(): string {
  const devPath = path.join(process.cwd(), 'voicevox', 'model', 'zundamon.vvm');
  const prodPath = path.join(app.getPath('exe'), '..', 'resources', 'voicevox', 'model', 'zundamon.vvm');
  
  // zundamon.vvmがなければsample.vvmを試す
  for (const p of [devPath, prodPath]) {
    if (fs.existsSync(p)) return p;
  }
  
  // 見つからない場合はエラー
  throw new Error('ずんだもんVVMファイルが見つかりません');
}

/**
 * VOICEVOX Coreを初期化
 */
export async function initVoicevoxCore(): Promise<void> {
  if (isInitialized) return;
  
  try {
    const libPath = getLibraryPath();
    lib = koffi.load(libPath);
    
    // 型定義
    const OpenJtalkRc = koffi.opaque('OpenJtalkRc');
    const VoicevoxOnnxruntime = koffi.opaque('VoicevoxOnnxruntime');
    const VoicevoxSynthesizer = koffi.opaque('VoicevoxSynthesizer');
    const VoicevoxVoiceModelFile = koffi.opaque('VoicevoxVoiceModelFile');
    
    // 構造体定義
    const VoicevoxLoadOnnxruntimeOptions = koffi.struct('VoicevoxLoadOnnxruntimeOptions', {
      filename: 'const char *',
    });
    
    const VoicevoxInitializeOptions = koffi.struct('VoicevoxInitializeOptions', {
      acceleration_mode: 'int32',
      cpu_num_threads: 'uint16',
    });
    
    const VoicevoxTtsOptions = koffi.struct('VoicevoxTtsOptions', {
      enable_interrogative_upspeak: 'bool',
    });
    
    // 関数定義
    voicevox_make_default_load_onnxruntime_options = lib.func(
      'voicevox_make_default_load_onnxruntime_options',
      VoicevoxLoadOnnxruntimeOptions,
      []
    );
    
    voicevox_onnxruntime_load_once = lib.func(
      'voicevox_onnxruntime_load_once',
      'int32',
      [VoicevoxLoadOnnxruntimeOptions, koffi.out(koffi.pointer(koffi.pointer(VoicevoxOnnxruntime)))]
    );
    
    voicevox_open_jtalk_rc_new = lib.func(
      'voicevox_open_jtalk_rc_new',
      'int32',
      ['const char *', koffi.out(koffi.pointer(koffi.pointer(OpenJtalkRc)))]
    );
    
    voicevox_open_jtalk_rc_delete = lib.func(
      'voicevox_open_jtalk_rc_delete',
      'void',
      [koffi.pointer(OpenJtalkRc)]
    );
    
    voicevox_make_default_initialize_options = lib.func(
      'voicevox_make_default_initialize_options',
      VoicevoxInitializeOptions,
      []
    );
    
    voicevox_synthesizer_new = lib.func(
      'voicevox_synthesizer_new',
      'int32',
      [
        koffi.pointer(VoicevoxOnnxruntime),
        koffi.pointer(OpenJtalkRc),
        VoicevoxInitializeOptions,
        koffi.out(koffi.pointer(koffi.pointer(VoicevoxSynthesizer)))
      ]
    );
    
    voicevox_synthesizer_delete = lib.func(
      'voicevox_synthesizer_delete',
      'void',
      [koffi.pointer(VoicevoxSynthesizer)]
    );
    
    voicevox_voice_model_file_open = lib.func(
      'voicevox_voice_model_file_open',
      'int32',
      ['const char *', koffi.out(koffi.pointer(koffi.pointer(VoicevoxVoiceModelFile)))]
    );
    
    voicevox_voice_model_file_delete = lib.func(
      'voicevox_voice_model_file_delete',
      'void',
      [koffi.pointer(VoicevoxVoiceModelFile)]
    );
    
    voicevox_synthesizer_load_voice_model = lib.func(
      'voicevox_synthesizer_load_voice_model',
      'int32',
      [koffi.pointer(VoicevoxSynthesizer), koffi.pointer(VoicevoxVoiceModelFile)]
    );
    
    voicevox_make_default_tts_options = lib.func(
      'voicevox_make_default_tts_options',
      VoicevoxTtsOptions,
      []
    );
    
    voicevox_synthesizer_tts = lib.func(
      'voicevox_synthesizer_tts',
      'int32',
      [
        koffi.pointer(VoicevoxSynthesizer),
        'const char *',
        'uint32',  // style_id
        VoicevoxTtsOptions,
        koffi.out(koffi.pointer('size_t')),
        koffi.out(koffi.pointer(koffi.pointer('uint8')))
      ]
    );
    
    voicevox_wav_free = lib.func(
      'voicevox_wav_free',
      'void',
      [koffi.pointer('uint8')]
    );
    
    voicevox_error_result_to_message = lib.func(
      'voicevox_error_result_to_message',
      'const char *',
      ['int32']
    );
    
    // ONNX Runtimeをロード
    const onnxOptions = voicevox_make_default_load_onnxruntime_options();
    const onnxRuntimeOut = [null];
    const onnxResult = voicevox_onnxruntime_load_once(onnxOptions, onnxRuntimeOut);
    if (onnxResult !== VoicevoxResultCode.VOICEVOX_RESULT_OK) {
      throw new Error(`ONNX Runtime初期化エラー: ${onnxResult}`);
    }
    
    // Open JTalkを初期化
    const dictPath = getOpenJtalkDictPath();
    const openJtalkOut = [null];
    const openJtalkResult = voicevox_open_jtalk_rc_new(dictPath, openJtalkOut);
    if (openJtalkResult !== VoicevoxResultCode.VOICEVOX_RESULT_OK) {
      throw new Error(`Open JTalk初期化エラー: ${openJtalkResult}`);
    }
    openJtalkHandle = openJtalkOut[0];
    
    // Synthesizerを作成
    const initOptions = voicevox_make_default_initialize_options();
    const synthesizerOut = [null];
    const synthResult = voicevox_synthesizer_new(
      onnxRuntimeOut[0],
      openJtalkHandle,
      initOptions,
      synthesizerOut
    );
    if (synthResult !== VoicevoxResultCode.VOICEVOX_RESULT_OK) {
      throw new Error(`Synthesizer初期化エラー: ${synthResult}`);
    }
    synthesizerHandle = synthesizerOut[0];
    
    // ずんだもんモデルをロード
    const vvmPath = getZundamonVvmPath();
    const modelOut = [null];
    const modelResult = voicevox_voice_model_file_open(vvmPath, modelOut);
    if (modelResult !== VoicevoxResultCode.VOICEVOX_RESULT_OK) {
      throw new Error(`VVMファイル読み込みエラー: ${modelResult}`);
    }
    
    const loadResult = voicevox_synthesizer_load_voice_model(synthesizerHandle, modelOut[0]);
    voicevox_voice_model_file_delete(modelOut[0]);
    
    if (loadResult !== VoicevoxResultCode.VOICEVOX_RESULT_OK) {
      throw new Error(`モデルロードエラー: ${loadResult}`);
    }
    
    isInitialized = true;
    console.log('VOICEVOX Core初期化完了');
    
  } catch (error) {
    console.warn('VOICEVOX Core初期化失敗:', error);
    throw error;
  }
}

/**
 * テキストを音声合成してWAVデータを取得
 * @param text 読み上げるテキスト
 * @param styleId スタイルID（ずんだもん = 3）
 * @returns WAVデータ
 */
export async function synthesize(text: string, styleId: number = 3): Promise<Buffer> {
  if (!isInitialized || !synthesizerHandle || !voicevox_synthesizer_tts) {
    throw new Error('VOICEVOX Coreが初期化されていません');
  }
  
  const ttsOptions = voicevox_make_default_tts_options!();
  const wavLengthOut = [0n];  // BigInt literal
  const wavOut = [null];
  
  const result = voicevox_synthesizer_tts(
    synthesizerHandle,
    text,
    styleId,
    ttsOptions,
    wavLengthOut,
    wavOut
  );
  
  if (result !== VoicevoxResultCode.VOICEVOX_RESULT_OK) {
    const message = voicevox_error_result_to_message!(result);
    throw new Error(`音声合成エラー: ${message}`);
  }
  
  const wavLength = Number(wavLengthOut[0]);
  const wavData = Buffer.from(koffi.decode(wavOut[0], 'uint8', wavLength));
  
  // メモリを解放
  voicevox_wav_free!(wavOut[0]);
  
  return wavData;
}

/**
 * VOICEVOX Coreをクリーンアップ
 */
export function cleanupVoicevoxCore(): void {
  if (synthesizerHandle && voicevox_synthesizer_delete) {
    voicevox_synthesizer_delete(synthesizerHandle);
    synthesizerHandle = null;
  }
  if (openJtalkHandle && voicevox_open_jtalk_rc_delete) {
    voicevox_open_jtalk_rc_delete(openJtalkHandle);
    openJtalkHandle = null;
  }
  isInitialized = false;
}

/**
 * VOICEVOX Coreが利用可能かチェック
 */
export function isVoicevoxAvailable(): boolean {
  try {
    getLibraryPath();
    return true;
  } catch {
    return false;
  }
}
