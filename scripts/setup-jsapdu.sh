#!/bin/bash
# jsapduをクローン・ビルド・パックするスクリプト
# CIとローカル開発の両方で使用

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_PACKAGES_DIR="$ROOT_DIR/local-packages"

# OSの一時ディレクトリを使用（クリーンかつパフォーマント）
JSAPDU_DIR="$(mktemp -d)"
trap "rm -rf '$JSAPDU_DIR'" EXIT

echo "=== jsapdu セットアップスクリプト ==="
echo "一時ディレクトリ: $JSAPDU_DIR"

# jsapduをクローン
echo "jsapduをクローン中..."
git clone --depth=1 --branch dev https://github.com/AokiApp/jsapdu.git "$JSAPDU_DIR"

# local-packagesディレクトリを作成
mkdir -p "$LOCAL_PACKAGES_DIR"

# 既にパッケージがあるかチェック
if ls "$LOCAL_PACKAGES_DIR"/*.tgz 1> /dev/null 2>&1; then
  echo "local-packagesに既にパッケージが存在します。スキップします。"
  echo "再ビルドする場合は local-packages/ を削除してください。"
  exit 0
fi

echo "jsapduパッケージをビルド中..."
cd "$JSAPDU_DIR"

# npm workspacesを使ってルートからビルド
echo "ルート依存関係をインストール中..."
npm install

# turborepoでビルド
echo "turboでビルド中..."
npx turbo run build --filter='@aokiapp/*'

# 各パッケージをパック
echo "パッケージを作成中..."
for pkg in interface apdu-utils mynacard pcsc-ffi-node pcsc; do
  echo "  - packages/$pkg"
  cd "$JSAPDU_DIR/packages/$pkg"
  npm pack
  mv *.tgz "$LOCAL_PACKAGES_DIR/"
done

echo ""
echo "=== jsapdu セットアップ完了 ==="
echo "パッケージ一覧:"
ls -la "$LOCAL_PACKAGES_DIR/"
