#!/bin/bash

# テスト用のスクリプト
echo "Testing Tiger CLI..."

# ビルド
echo "Building..."
npm run build

# 起動
echo "Starting Tiger..."
npm start -- --no-logo