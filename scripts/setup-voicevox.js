#!/usr/bin/env node
/**
 * VOICEVOX Coreセットアップスクリプト
 * 
 * VOICEVOX Core動的ライブラリ、Open JTalk辞書、ずんだもんVVMをダウンロードしてセットアップする
 * 
 * VOICEVOX Core 0.16.2: MIT LICENSE
 * https://github.com/VOICEVOX/voicevox_core
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOICEVOX_VERSION = '0.16.2';
const ONNXRUNTIME_VERSION = '1.17.3';

// ダウンロードURL
const DOWNLOADS = {
  core: {
    url: `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/voicevox_core-windows-x64-cpu-${VOICEVOX_VERSION}.zip`,
    filename: 'voicevox_core.zip',
    checkFile: 'voicevox_core.dll',
  },
  onnxruntime: {
    url: `https://github.com/microsoft/onnxruntime/releases/download/v${ONNXRUNTIME_VERSION}/onnxruntime-win-x64-${ONNXRUNTIME_VERSION}.zip`,
    filename: 'onnxruntime.zip',
    checkFile: 'onnxruntime.dll',
  },
  openJtalk: {
    url: 'https://jaist.dl.sourceforge.net/project/open-jtalk/Dictionary/open_jtalk_dic-1.11/open_jtalk_dic_utf_8-1.11.tar.gz',
    filename: 'open_jtalk_dic.tar.gz',
    checkFile: 'open_jtalk_dic_utf_8-1.11',
  },
};

const voicevoxDir = path.join(__dirname, '..', 'voicevox');
const tempDir = path.join(__dirname, '..', 'temp');

/**
 * ファイルをダウンロード（リダイレクト対応）
 */
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`ダウンロード中: ${path.basename(destPath)}`);
    const file = fs.createWriteStream(destPath);
    
    const request = (currentUrl) => {
      const protocol = currentUrl.startsWith('https') ? https : http;
      protocol.get(currentUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          request(response.headers.location);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        const total = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total) {
            const percent = Math.round(downloaded / total * 100);
            process.stdout.write(`\r  進捗: ${percent}%`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(' 完了');
          resolve();
        });
      }).on('error', reject);
    };
    
    request(url);
  });
}

/**
 * ZIPファイルを展開
 */
async function extractZip(zipPath, destDir) {
  console.log(`展開中: ${path.basename(zipPath)}`);
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'pipe' });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'pipe' });
  }
  console.log('  完了');
}

/**
 * tar.gzファイルを展開
 */
async function extractTarGz(tarPath, destDir) {
  console.log(`展開中: ${path.basename(tarPath)}`);
  execSync(`tar -xzf "${tarPath}" -C "${destDir}"`, { stdio: 'pipe' });
  console.log('  完了');
}

/**
 * ディレクトリ内のファイルを移動
 */
function moveContents(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    
    if (fs.existsSync(destPath)) {
      if (fs.statSync(destPath).isDirectory()) {
        fs.rmSync(destPath, { recursive: true });
      } else {
        fs.unlinkSync(destPath);
      }
    }
    
    fs.renameSync(srcPath, destPath);
  }
  
  fs.rmdirSync(srcDir);
}

async function main() {
  console.log(`\nVOICEVOX Core ${VOICEVOX_VERSION} セットアップ`);
  console.log('ライセンス: MIT LICENSE\n');

  // ディレクトリ作成
  fs.mkdirSync(voicevoxDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // 1. VOICEVOX Core
    const coreDllPath = path.join(voicevoxDir, DOWNLOADS.core.checkFile);
    if (!fs.existsSync(coreDllPath)) {
      const coreZipPath = path.join(tempDir, DOWNLOADS.core.filename);
      await downloadFile(DOWNLOADS.core.url, coreZipPath);
      await extractZip(coreZipPath, tempDir);
      
      // サブディレクトリの中身を移動
      const extractedDir = path.join(tempDir, `voicevox_core-windows-x64-cpu-${VOICEVOX_VERSION}`);
      moveContents(extractedDir, voicevoxDir);
      console.log('✓ VOICEVOX Core');
    } else {
      console.log('✓ VOICEVOX Core (キャッシュ済み)');
    }

    // 2. ONNX Runtime
    const onnxDllPath = path.join(voicevoxDir, DOWNLOADS.onnxruntime.checkFile);
    if (!fs.existsSync(onnxDllPath)) {
      const onnxZipPath = path.join(tempDir, DOWNLOADS.onnxruntime.filename);
      await downloadFile(DOWNLOADS.onnxruntime.url, onnxZipPath);
      await extractZip(onnxZipPath, tempDir);
      
      // lib/*.dllをvoicevoxDirにコピー
      const onnxDir = path.join(tempDir, `onnxruntime-win-x64-${ONNXRUNTIME_VERSION}`, 'lib');
      if (fs.existsSync(onnxDir)) {
        const dllFiles = fs.readdirSync(onnxDir).filter(f => f.endsWith('.dll'));
        for (const dll of dllFiles) {
          fs.copyFileSync(path.join(onnxDir, dll), path.join(voicevoxDir, dll));
        }
      }
      console.log('✓ ONNX Runtime');
    } else {
      console.log('✓ ONNX Runtime (キャッシュ済み)');
    }

    // 3. Open JTalk辞書
    const openJtalkPath = path.join(voicevoxDir, DOWNLOADS.openJtalk.checkFile);
    if (!fs.existsSync(openJtalkPath)) {
      const tarPath = path.join(tempDir, DOWNLOADS.openJtalk.filename);
      await downloadFile(DOWNLOADS.openJtalk.url, tarPath);
      await extractTarGz(tarPath, voicevoxDir);
      console.log('✓ Open JTalk辞書');
    } else {
      console.log('✓ Open JTalk辞書 (キャッシュ済み)');
    }

    console.log('\n=== セットアップ完了 ===');
    console.log(`インストール先: ${voicevoxDir}`);
    console.log('\n注意:');
    console.log('- ずんだもんのVVMファイルは別途ダウンロードが必要です');
    console.log('- VOICEVOXダウンローダーを使用するか、公式サイトから取得してください');
    console.log('- VVMファイルは voicevox/model/ に配置してください');

  } catch (error) {
    console.error('\nセットアップエラー:', error.message);
    console.log('\n手動セットアップ:');
    console.log('1. https://github.com/VOICEVOX/voicevox_core/releases から');
    console.log('   voicevox_core-windows-x64-cpu-0.16.2.zip をダウンロード');
    console.log('2. voicevox/ ディレクトリに展開');
    process.exit(1);
  } finally {
    // 一時ファイル削除
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

main();
