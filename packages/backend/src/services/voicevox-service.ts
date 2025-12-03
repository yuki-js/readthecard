/**
 * VOICEVOX Coreサービス
 * 音声合成を行う
 * 
 * 注意: VOICEVOX Coreはネイティブライブラリのため、
 * 実行環境にvoicevox_coreがインストールされている必要があります。
 * 
 * ここではVOICEVOX Coreへのインターフェースを定義し、
 * 実際の実装は環境に応じて行います。
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// VOICEVOX Core のパス（環境変数で指定可能）
const VOICEVOX_CORE_PATH = process.env.VOICEVOX_CORE_PATH || './voicevox_core';

export class VoicevoxService {
  private initialized = false;

  /**
   * サービスの初期化
   */
  async initialize(): Promise<void> {
    // VOICEVOX Core の存在確認
    if (existsSync(VOICEVOX_CORE_PATH)) {
      this.initialized = true;
      console.log('VOICEVOX Coreが見つかりました');
    } else {
      console.warn('VOICEVOX Coreが見つかりません。音声合成は利用できません。');
      console.warn('VOICEVOX_CORE_PATH環境変数でパスを指定してください。');
    }
  }

  /**
   * テキストを音声合成
   * @param text 読み上げるテキスト
   * @param speakerId スピーカーID（デフォルト: 3 = ずんだもん）
   * @returns WAV形式の音声データ
   */
  async synthesis(text: string, speakerId: number = 3): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error('VOICEVOX Coreが初期化されていません');
    }

    // VOICEVOX Core Python API を使用して音声合成
    // 実際の実装では、voicevox_core Pythonライブラリまたは
    // C API を使用します
    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
import json

try:
    import voicevox_core
    from voicevox_core import VoicevoxCore, METAS
    
    core = VoicevoxCore(open_jtalk_dict_dir="${VOICEVOX_CORE_PATH}/open_jtalk_dic_utf_8-1.11")
    core.load_model(${speakerId})
    
    text = """${text.replace(/"/g, '\\"')}"""
    audio_query = core.audio_query(text, ${speakerId})
    wav = core.synthesis(audio_query, ${speakerId})
    
    sys.stdout.buffer.write(wav)
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

      const process = spawn('python3', ['-c', pythonScript]);
      const chunks: Buffer[] = [];
      
      process.stdout.on('data', (data: Buffer) => {
        chunks.push(data);
      });
      
      process.stderr.on('data', (data: Buffer) => {
        console.error('VOICEVOX stderr:', data.toString());
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          const result = Buffer.concat(chunks);
          resolve(new Uint8Array(result));
        } else {
          reject(new Error('VOICEVOX音声合成に失敗しました'));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }
}
