#!/bin/bash
# jsapduをクローン・ビルド・パックするスクリプト
# CIとローカル開発の両方で使用

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
JSAPDU_DIR="$ROOT_DIR/packages/jsapdu"
LOCAL_PACKAGES_DIR="$ROOT_DIR/local-packages"

echo "=== jsapdu セットアップスクリプト ==="

# jsapduがまだクローンされていない場合はクローン
if [ ! -d "$JSAPDU_DIR" ]; then
  echo "jsapduをクローン中..."
  git clone --depth=1 --branch dev https://github.com/AokiApp/jsapdu.git "$JSAPDU_DIR"
else
  echo "jsapduは既にクローン済みです"
fi

# local-packagesディレクトリを作成
mkdir -p "$LOCAL_PACKAGES_DIR"

# 既にパッケージがあるかチェック
if ls "$LOCAL_PACKAGES_DIR"/*.tgz 1> /dev/null 2>&1; then
  echo "local-packagesに既にパッケージが存在します。スキップします。"
  echo "再ビルドする場合は local-packages/ を削除してください。"
  exit 0
fi

echo "jsapduパッケージをビルド中..."

# interface
echo "  - @aokiapp/jsapdu-interface"
cd "$JSAPDU_DIR/packages/interface"
npm install --include=dev
npm run build
npm pack
mv *.tgz "$LOCAL_PACKAGES_DIR/"

# apdu-utils
echo "  - @aokiapp/apdu-utils"
cd "$JSAPDU_DIR/packages/apdu-utils"
npm install --include=dev
npm run build
npm pack
mv *.tgz "$LOCAL_PACKAGES_DIR/"

# mynacard
echo "  - @aokiapp/mynacard"
cd "$JSAPDU_DIR/packages/mynacard"
npm install --include=dev
npm run build
npm pack
mv *.tgz "$LOCAL_PACKAGES_DIR/"

# pcsc-ffi-node
echo "  - @aokiapp/pcsc-ffi-node"
cd "$JSAPDU_DIR/packages/pcsc-ffi-node"
npm install --include=dev
npm run build
npm pack
mv *.tgz "$LOCAL_PACKAGES_DIR/"

# pcsc
echo "  - @aokiapp/jsapdu-pcsc"
cd "$JSAPDU_DIR/packages/pcsc"
npm install --include=dev
npm run build
npm pack
mv *.tgz "$LOCAL_PACKAGES_DIR/"

echo ""
echo "=== jsapdu セットアップ完了 ==="
echo "パッケージ一覧:"
ls -la "$LOCAL_PACKAGES_DIR/"
