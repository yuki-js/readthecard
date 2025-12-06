# jsapduをクローン・ビルド・パックするスクリプト
# CIとローカル開発の両方で使用

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = $PSScriptRoot
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR
$LOCAL_PACKAGES_DIR = Join-Path $ROOT_DIR "local-packages"

# OSの一時ディレクトリを使用（クリーンかつパフォーマント）
$JSAPDU_DIR = Join-Path $env:TEMP "jsapdu-$(New-Guid)"
New-Item -ItemType Directory -Path $JSAPDU_DIR | Out-Null

try {
    Write-Host "=== jsapdu セットアップスクリプト ==="
    Write-Host "一時ディレクトリ: $JSAPDU_DIR"

    # jsapduをクローン
    Write-Host "jsapduをクローン中..."
    git clone --depth=1 --branch dev https://github.com/AokiApp/jsapdu.git $JSAPDU_DIR

    # local-packagesディレクトリを作成
    New-Item -ItemType Directory -Path $LOCAL_PACKAGES_DIR -Force | Out-Null

    # 既にパッケージがあるかチェック
    if (Test-Path "$LOCAL_PACKAGES_DIR\*.tgz") {
        Write-Host "local-packagesに既にパッケージが存在します。スキップします。"
        Write-Host "再ビルドする場合は local-packages/ を削除してください。"
        exit 0
    }

    Write-Host "jsapduパッケージをビルド中..."
    Push-Location $JSAPDU_DIR

    try {
        # npm workspacesを使ってルートからビルド
        Write-Host "ルート依存関係をインストール中..."
        npm install

        # turborepoでビルド
        Write-Host "turboでビルド中..."
        npx turbo run build --filter='@aokiapp/*'

        # 各パッケージをパック
        Write-Host "パッケージを作成中..."
        $packages = @("interface", "apdu-utils", "mynacard", "pcsc-ffi-node", "pcsc")
        
        foreach ($pkg in $packages) {
            Write-Host "  - packages/$pkg"
            Push-Location (Join-Path $JSAPDU_DIR "packages\$pkg")
            
            try {
                npm pack
                Get-ChildItem -Filter "*.tgz" | Move-Item -Destination $LOCAL_PACKAGES_DIR
            }
            finally {
                Pop-Location
            }
        }

        Write-Host ""
        Write-Host "=== jsapdu セットアップ完了 ==="
        Write-Host "パッケージ一覧:"
        Get-ChildItem $LOCAL_PACKAGES_DIR | Format-Table Name, Length, LastWriteTime
    }
    finally {
        Pop-Location
    }
}
finally {
    # 一時ディレクトリをクリーンアップ
    if (Test-Path $JSAPDU_DIR) {
        Remove-Item -Recurse -Force $JSAPDU_DIR
    }
}
