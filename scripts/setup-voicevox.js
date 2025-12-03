#!/usr/bin/env node
/**
 * VOICEVOX Coreセットアップスクリプト
 * 
 * VOICEVOX Core動的ライブラリ、Open JTalk辞書をダウンロードしてセットアップする
 * 
 * 注意: バージョン0.16以上はMIT LICENSE
 *       バージョン0.16未満は別ライセンス
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VOICEVOX_VERSION = '0.16.2';
const VOICEVOX_CORE_URL = `https://github.com/VOICEVOX/voicevox_core/releases/download/${VOICEVOX_VERSION}/voicevox_core-windows-x64-cpu-${VOICEVOX_VERSION}.zip`;

const voicevoxDir = path.join(__dirname, '..', 'voicevox');
const tempDir = path.join(__dirname, '..', 'temp');

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    const file = fs.createWriteStream(destPath);
    
    const request = (url) => {
      https.get(url, (response) => {
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
            process.stdout.write(`\r  Progress: ${percent}%`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('\n  完了');
          resolve();
        });
      }).on('error', reject);
    };
    
    request(url);
  });
}

async function extractZip(zipPath, destDir) {
  console.log(`Extracting: ${zipPath}`);
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'pipe' });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'pipe' });
  }
  console.log('  完了');
}

async function main() {
  console.log(`VOICEVOX Core ${VOICEVOX_VERSION} セットアップ (MIT LICENSE)\n`);

  // ディレクトリ作成
  if (!fs.existsSync(voicevoxDir)) {
    fs.mkdirSync(voicevoxDir, { recursive: true });
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // VOICEVOX Coreが既にあるかチェック
  const coreDllPath = path.join(voicevoxDir, 'voicevox_core.dll');
  if (fs.existsSync(coreDllPath)) {
    console.log('VOICEVOX Core は既にセットアップ済みです');
    return;
  }

  try {
    // VOICEVOX Coreをダウンロード
    const coreZipPath = path.join(tempDir, 'voicevox_core.zip');
    await downloadFile(VOICEVOX_CORE_URL, coreZipPath);
    await extractZip(coreZipPath, voicevoxDir);

    // 展開されたサブディレクトリの中身を移動
    const extractedDir = path.join(voicevoxDir, `voicevox_core-windows-x64-cpu-${VOICEVOX_VERSION}`);
    if (fs.existsSync(extractedDir)) {
      const files = fs.readdirSync(extractedDir);
      for (const file of files) {
        fs.renameSync(path.join(extractedDir, file), path.join(voicevoxDir, file));
      }
      fs.rmdirSync(extractedDir);
    }

    console.log('\nVOICEVOX Core セットアップ完了');
    console.log(`インストール先: ${voicevoxDir}`);
    console.log('\n注意: VOICEVOX CoreはC APIの動的ライブラリです。');
    console.log('Node.jsから使用するにはFFIラッパーが必要です。');
  } catch (error) {
    console.error('セットアップエラー:', error.message);
    console.log('\n手動でセットアップする場合:');
    console.log(`1. ${VOICEVOX_CORE_URL} をダウンロード`);
    console.log(`2. ${voicevoxDir} に展開`);
    process.exit(1);
  } finally {
    // 一時ファイル削除
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

main();
