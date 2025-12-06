# @aokiapp/jsapdu-over-ip をビルド・パックして readthecard/local-packages に配置するスクリプト
# Windows PowerShell 用
# 使い方: PowerShell でこのスクリプトを実行してください

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = $PSScriptRoot
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR
$REPO_DIR = Join-Path $ROOT_DIR "..\jsapdu-over-ip"
$WORKSPACE_LOCAL_PACKAGES = Join-Path $ROOT_DIR "local-packages"
$REPO_LOCAL_PACKAGES = Join-Path $REPO_DIR "local-packages"
$INTERFACE_TGZ_NAME = "aokiapp-jsapdu-interface-0.0.1.tgz"
$OUTPUT_TGZ_NAME = "aokiapp-jsapdu-over-ip-0.0.1.tgz"

Write-Host "=== jsapdu-over-ip セットアップスクリプト ==="
Write-Host "Workspace root: $ROOT_DIR"
Write-Host "Repo dir:       $REPO_DIR"

# リポジトリ存在チェック
if (-not (Test-Path $REPO_DIR)) {
    throw "jsapdu-over-ip のリポジトリが見つかりません: $REPO_DIR"
}

# local-packages を作成
New-Item -ItemType Directory -Path $WORKSPACE_LOCAL_PACKAGES -Force | Out-Null

# jsapdu-interface の tarball 確保
$workspaceInterfaceTgz = Join-Path $WORKSPACE_LOCAL_PACKAGES $INTERFACE_TGZ_NAME
if (-not (Test-Path $workspaceInterfaceTgz)) {
    Write-Host "jsapdu-interface tarball が workspace にありません。scripts/setup-jsapdu.ps1 を実行して取得します..."
    $jsapduSetup = Join-Path $ROOT_DIR "scripts\setup-jsapdu.ps1"
    if (-not (Test-Path $jsapduSetup)) {
        throw "scripts/setup-jsapdu.ps1 が見つかりません。先に jsapdu パッケージを取得してください。"
    }
    & $jsapduSetup
    if (-not (Test-Path $workspaceInterfaceTgz)) {
        throw "jsapdu-interface tarball の取得に失敗しました: $workspaceInterfaceTgz"
    }
}

# リポジトリ側の local-packages を作成して tarball をコピー
New-Item -ItemType Directory -Path $REPO_LOCAL_PACKAGES -Force | Out-Null
Copy-Item -Path $workspaceInterfaceTgz -Destination $REPO_LOCAL_PACKAGES -Force

# 依存関係インストール・ビルド・パック
Push-Location $REPO_DIR
try {
    Write-Host "npm install 実行中..."
    npm install

    Write-Host "ビルド (tsc) 実行中..."
    npm run build

    Write-Host "パッケージング (npm pack) 実行中..."
    npm run pack:tgz
}
finally {
    Pop-Location
}

# 生成された tarball を workspace の local-packages にコピー
$repoOutputTgz = Join-Path $REPO_DIR $OUTPUT_TGZ_NAME
if (-not (Test-Path $repoOutputTgz)) {
    throw "生成された tarball が見つかりません: $repoOutputTgz"
}
Copy-Item -Path $repoOutputTgz -Destination $WORKSPACE_LOCAL_PACKAGES -Force

Write-Host ""
Write-Host "=== セットアップ完了 ==="
Write-Host "配置されたファイル:"
Get-ChildItem $WORKSPACE_LOCAL_PACKAGES | Format-Table Name, Length, LastWriteTime