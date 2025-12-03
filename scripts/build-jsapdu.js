#!/usr/bin/env node
/**
 * jsapduパッケージのビルドスクリプト
 * 
 * GitHubからインストールしたjsapduパッケージはmonorepo構造のため、
 * 各パッケージのnode_modulesに依存パッケージをコピーしてからビルドを実行する。
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeModules = path.join(__dirname, '..', 'node_modules', '@aokiapp');

// ビルド順序と依存関係の定義
const packages = [
  { 
    name: 'jsapdu-interface', 
    subdir: 'packages/interface',
    deps: []
  },
  { 
    name: 'apdu-utils', 
    subdir: 'packages/apdu-utils',
    deps: ['jsapdu-interface']
  },
  { 
    name: 'mynacard', 
    subdir: 'packages/mynacard',
    deps: []
  },
  { 
    name: 'jsapdu-pcsc', 
    subdir: 'packages/pcsc',
    deps: ['jsapdu-interface', 'pcsc-ffi-node']
  },
];

/**
 * パッケージの依存関係をnode_modulesにコピー
 */
function copyDependencies(pkgPath, deps) {
  const depsDir = path.join(pkgPath, 'node_modules', '@aokiapp');
  
  // node_modules/@aokiappを作成
  fs.mkdirSync(depsDir, { recursive: true });
  
  for (const dep of deps) {
    const srcPath = path.join(nodeModules, dep, 'packages', dep.replace('jsapdu-', ''));
    const destPath = path.join(depsDir, dep);
    
    // 既に存在する場合はスキップ
    if (fs.existsSync(destPath)) continue;
    
    // ソースが存在しない場合は別の場所を試す
    let actualSrcPath = srcPath;
    if (!fs.existsSync(actualSrcPath)) {
      actualSrcPath = path.join(nodeModules, dep, 'packages', dep.split('-').pop());
    }
    if (!fs.existsSync(actualSrcPath)) {
      actualSrcPath = path.join(nodeModules, dep);
    }
    
    if (fs.existsSync(actualSrcPath)) {
      // シンボリックリンクの代わりにコピー
      fs.cpSync(actualSrcPath, destPath, { recursive: true });
    }
  }
}

/**
 * tsconfigを修正してnode moduleResolutionを使用
 */
function fixTsconfig(pkgPath) {
  const tsconfigPath = path.join(pkgPath, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return false;
  
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  
  // extendsを削除し、必要な設定を直接記述
  delete tsconfig.extends;
  
  tsconfig.compilerOptions = {
    target: 'ESNext',
    module: 'ESNext',
    strict: true,
    moduleResolution: 'node',
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    rootDir: '.',
    outDir: 'dist',
    declaration: true,
    declarationMap: true,
    ...tsconfig.compilerOptions
  };
  
  // testsを除外
  tsconfig.include = ['src'];
  tsconfig.exclude = ['tests', '**/*.test.ts', 'node_modules', 'dist'];
  
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  return true;
}

console.log('Building jsapdu packages...');

for (const pkg of packages) {
  const pkgPath = path.join(nodeModules, pkg.name, pkg.subdir);
  const distPath = path.join(pkgPath, 'dist');
  
  // パッケージが存在しない場合はスキップ
  if (!fs.existsSync(pkgPath)) {
    console.log(`⊘ ${pkg.name} (not found)`);
    continue;
  }
  
  // 既にビルド済みの場合はスキップ
  if (fs.existsSync(distPath) && fs.readdirSync(distPath).length > 0) {
    console.log(`✓ ${pkg.name} (cached)`);
    continue;
  }
  
  try {
    // 依存関係をコピー
    if (pkg.deps.length > 0) {
      copyDependencies(pkgPath, pkg.deps);
    }
    
    // tsconfigを修正
    fixTsconfig(pkgPath);
    
    // ビルド実行
    execSync('npx tsc', { cwd: pkgPath, stdio: 'pipe' });
    console.log(`✓ ${pkg.name}`);
  } catch (e) {
    console.log(`✗ ${pkg.name}: ${e.message}`);
  }
}

console.log('jsapdu build complete.');

