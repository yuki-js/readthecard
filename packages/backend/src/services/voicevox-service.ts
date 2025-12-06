/**
 * VOICEVOX Coreサービス
 * C FFI経由で音声合成を行う
 *
 * VOICEVOX Coreは動的ライブラリ(.dll/.so/.dylib)を同梱して使用します。
 * 必要なファイル:
 * - voicevox_core.dll/.so/.dylib (C APIライブラリ)
 * - onnxruntime.dll/.so/.dylib (ONNX Runtime)
 * - open_jtalk_dic_utf_8-1.11/ (Open JTalk辞書)
 * - model/ (音声モデル VVMファイル)
 *
 * ずんだもんのスタイルID: 3 (ノーマル)
 */

import koffi from "koffi";
import path from "path";
import { existsSync } from "fs";

// VOICEVOX Core のパス（環境変数で指定可能）
const VOICEVOX_CORE_DIR = process.env.VOICEVOX_CORE_DIR || "./voicevox_core";

// プラットフォームに応じたライブラリファイル名
function getLibraryName(): string {
  switch (process.platform) {
    case "win32":
      return "voicevox_core.dll";
    case "darwin":
      return "libvoicevox_core.dylib";
    default:
      return "libvoicevox_core.so";
  }
}

// ずんだもん ノーマル のスタイルID
const ZUNDAMON_STYLE_ID = 3;

export class VoicevoxService {
  private initialized = false;
  private lib: koffi.IKoffiLib | null = null;
  private synthesizer: unknown = null;
  private onnxruntime: unknown = null;
  private openJtalk: unknown = null;

  // C API関数
  private voicevox_onnxruntime_load_once:
    | ((options: unknown, out: unknown) => number)
    | null = null;
  private voicevox_open_jtalk_rc_new:
    | ((path: string, out: unknown) => number)
    | null = null;
  private voicevox_synthesizer_new:
    | ((
        onnx: unknown,
        jtalk: unknown,
        options: unknown,
        out: unknown,
      ) => number)
    | null = null;
  private voicevox_voice_model_file_open:
    | ((path: string, out: unknown) => number)
    | null = null;
  private voicevox_synthesizer_load_voice_model:
    | ((synth: unknown, model: unknown) => number)
    | null = null;
  private voicevox_voice_model_file_delete: ((model: unknown) => void) | null =
    null;
  private voicevox_synthesizer_tts:
    | ((
        synth: unknown,
        text: string,
        styleId: number,
        options: unknown,
        outLen: unknown,
        outWav: unknown,
      ) => number)
    | null = null;
  private voicevox_wav_free: ((wav: unknown) => void) | null = null;
  private voicevox_make_default_load_onnxruntime_options:
    | (() => unknown)
    | null = null;
  private voicevox_make_default_initialize_options: (() => unknown) | null =
    null;
  private voicevox_make_default_tts_options: (() => unknown) | null = null;

  /**
   * サービスの初期化
   */
  async initialize(): Promise<void> {
    const libPath = path.join(VOICEVOX_CORE_DIR, "c_api", getLibraryName());
    const dictPath = path.join(
      VOICEVOX_CORE_DIR,
      "dict",
      "open_jtalk_dic_utf_8-1.11",
    );
    const modelDir = path.join(VOICEVOX_CORE_DIR, "models", "vvms");

    // VOICEVOX Core の存在確認
    if (!existsSync(libPath)) {
      console.warn(`VOICEVOX Coreが見つかりません: ${libPath}`);
      console.warn("VOICEVOX Downloaderを使用してダウンロードしてください。");
      console.warn("https://github.com/VOICEVOX/voicevox_core/releases");
      return;
    }

    try {
      // koffiでライブラリをロード
      this.lib = koffi.load(libPath);

      // 型定義
      const VoicevoxOnnxruntime = koffi.opaque("VoicevoxOnnxruntime");
      const OpenJtalkRc = koffi.opaque("OpenJtalkRc");
      const VoicevoxSynthesizer = koffi.opaque("VoicevoxSynthesizer");
      const VoicevoxVoiceModelFile = koffi.opaque("VoicevoxVoiceModelFile");

      const VoicevoxLoadOnnxruntimeOptions = koffi.struct(
        "VoicevoxLoadOnnxruntimeOptions",
        {
          filename: "const char *",
        },
      );

      const VoicevoxInitializeOptions = koffi.struct(
        "VoicevoxInitializeOptions",
        {
          acceleration_mode: "int32",
          cpu_num_threads: "uint16",
        },
      );

      const VoicevoxTtsOptions = koffi.struct("VoicevoxTtsOptions", {
        enable_interrogative_upspeak: "bool",
      });

      // 関数定義
      this.voicevox_make_default_load_onnxruntime_options = this.lib.func(
        "voicevox_make_default_load_onnxruntime_options",
        VoicevoxLoadOnnxruntimeOptions,
        [],
      );

      this.voicevox_onnxruntime_load_once = this.lib.func(
        "voicevox_onnxruntime_load_once",
        "int32",
        [
          VoicevoxLoadOnnxruntimeOptions,
          koffi.out(koffi.pointer(VoicevoxOnnxruntime)),
        ],
      );

      this.voicevox_open_jtalk_rc_new = this.lib.func(
        "voicevox_open_jtalk_rc_new",
        "int32",
        ["const char *", koffi.out(koffi.pointer(OpenJtalkRc))],
      );

      this.voicevox_make_default_initialize_options = this.lib.func(
        "voicevox_make_default_initialize_options",
        VoicevoxInitializeOptions,
        [],
      );

      this.voicevox_synthesizer_new = this.lib.func(
        "voicevox_synthesizer_new",
        "int32",
        [
          koffi.pointer(VoicevoxOnnxruntime),
          koffi.pointer(OpenJtalkRc),
          VoicevoxInitializeOptions,
          koffi.out(koffi.pointer(VoicevoxSynthesizer)),
        ],
      );

      this.voicevox_voice_model_file_open = this.lib.func(
        "voicevox_voice_model_file_open",
        "int32",
        ["const char *", koffi.out(koffi.pointer(VoicevoxVoiceModelFile))],
      );

      this.voicevox_synthesizer_load_voice_model = this.lib.func(
        "voicevox_synthesizer_load_voice_model",
        "int32",
        [
          koffi.pointer(VoicevoxSynthesizer),
          koffi.pointer(VoicevoxVoiceModelFile),
        ],
      );

      this.voicevox_voice_model_file_delete = this.lib.func(
        "voicevox_voice_model_file_delete",
        "void",
        [koffi.pointer(VoicevoxVoiceModelFile)],
      );

      this.voicevox_make_default_tts_options = this.lib.func(
        "voicevox_make_default_tts_options",
        VoicevoxTtsOptions,
        [],
      );

      this.voicevox_synthesizer_tts = this.lib.func(
        "voicevox_synthesizer_tts",
        "int32",
        [
          koffi.pointer(VoicevoxSynthesizer),
          "const char *",
          "uint32",
          VoicevoxTtsOptions,
          koffi.out("uintptr_t *"),
          koffi.out("uint8_t **"),
        ],
      );

      this.voicevox_wav_free = this.lib.func("voicevox_wav_free", "void", [
        "uint8_t *",
      ]);

      // ONNX Runtimeをロード
      const onnxruntimeOptions =
        this.voicevox_make_default_load_onnxruntime_options();
      const onnxruntimeOut: unknown[] = [null];
      const onnxResult = this.voicevox_onnxruntime_load_once(
        onnxruntimeOptions,
        onnxruntimeOut,
      );
      if (onnxResult !== 0) {
        throw new Error(`ONNX Runtimeのロードに失敗: ${onnxResult}`);
      }
      this.onnxruntime = onnxruntimeOut[0];

      // Open JTalkを初期化
      const openJtalkOut: unknown[] = [null];
      const jtalkResult = this.voicevox_open_jtalk_rc_new(
        dictPath,
        openJtalkOut,
      );
      if (jtalkResult !== 0) {
        throw new Error(`Open JTalkの初期化に失敗: ${jtalkResult}`);
      }
      this.openJtalk = openJtalkOut[0];

      // Synthesizerを初期化
      const initOptions = this.voicevox_make_default_initialize_options();
      const synthesizerOut: unknown[] = [null];
      const synthResult = this.voicevox_synthesizer_new(
        this.onnxruntime,
        this.openJtalk,
        initOptions,
        synthesizerOut,
      );
      if (synthResult !== 0) {
        throw new Error(`Synthesizerの初期化に失敗: ${synthResult}`);
      }
      this.synthesizer = synthesizerOut[0];

      // ずんだもんの音声モデルをロード（0.vvmにずんだもんが含まれている）
      const modelPath = path.join(modelDir, "0.vvm");
      if (existsSync(modelPath)) {
        const modelOut: unknown[] = [null];
        const modelOpenResult = this.voicevox_voice_model_file_open(
          modelPath,
          modelOut,
        );
        if (modelOpenResult === 0) {
          const loadResult = this.voicevox_synthesizer_load_voice_model(
            this.synthesizer,
            modelOut[0],
          );
          if (loadResult !== 0) {
            console.warn(`音声モデルのロードに失敗: ${loadResult}`);
          }
          this.voicevox_voice_model_file_delete(modelOut[0]);
        }
      }

      this.initialized = true;
      console.log("VOICEVOX Coreを初期化しました");
    } catch (error) {
      console.warn("VOICEVOX Coreの初期化に失敗しました:", error);
    }
  }

  /**
   * テキストを音声合成
   * @param text 読み上げるテキスト
   * @param speakerId スピーカーID（デフォルト: 3 = ずんだもん ノーマル）
   * @returns WAV形式の音声データ
   */
  async synthesis(
    text: string,
    speakerId: number = ZUNDAMON_STYLE_ID,
  ): Promise<Uint8Array> {
    if (
      !this.initialized ||
      !this.synthesizer ||
      !this.voicevox_synthesizer_tts ||
      !this.voicevox_make_default_tts_options ||
      !this.voicevox_wav_free
    ) {
      throw new Error("VOICEVOX Coreが初期化されていません");
    }

    const ttsOptions = this.voicevox_make_default_tts_options();
    const wavLengthOut: number[] = [0];
    const wavOut: unknown[] = [null];

    const result = this.voicevox_synthesizer_tts(
      this.synthesizer,
      text,
      speakerId,
      ttsOptions,
      wavLengthOut,
      wavOut,
    );

    if (result !== 0) {
      throw new Error(`音声合成に失敗: ${result}`);
    }

    // WAVデータをコピー
    const wavLength = wavLengthOut[0];
    const wavPtr = wavOut[0] as unknown;
    const wavData = koffi.decode(wavPtr, "uint8", wavLength);

    // メモリを解放
    this.voicevox_wav_free(wavPtr);

    return new Uint8Array(wavData);
  }
}
