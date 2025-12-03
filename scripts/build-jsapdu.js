#!/usr/bin/env node
/**
 * jsapduパッケージのビルドスクリプト
 * 
 * GitHubからインストールしたjsapduパッケージはビルド済みのdistが含まれていないため、
 * postinstall時にビルドを実行して型定義ファイルとJSファイルを生成する。
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const nodeModules = path.join(__dirname, '..', 'node_modules', '@aokiapp');

const packages = [
  { name: 'jsapdu-interface', subdir: 'packages/interface' },
  { name: 'apdu-utils', subdir: 'packages/apdu-utils' },
  { name: 'mynacard', subdir: 'packages/mynacard' },
  { name: 'jsapdu-pcsc', subdir: 'packages/pcsc' },
];

for (const pkg of packages) {
  const pkgPath = path.join(nodeModules, pkg.name, pkg.subdir);
  const distPath = path.join(pkgPath, 'dist');
  
  if (!fs.existsSync(pkgPath)) continue;
  if (fs.existsSync(distPath)) continue;

  // testsを除外するようtsconfig.jsonを修正
  const tsconfigPath = path.join(pkgPath, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      tsconfig.exclude = ['tests', '**/*.test.ts'];
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      execSync('npx tsc', { cwd: pkgPath, stdio: 'pipe' });
      console.log(`✓ ${pkg.name}`);
    } catch (e) {
      console.log(`✗ ${pkg.name}`);
    }
  }
}
