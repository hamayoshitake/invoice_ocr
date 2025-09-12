# Invoice OCR Application

**PDFファイルから請求書データを自動抽出し、データ化するWebアプリケーション**

このアプリケーションは、請求書のPDFファイルをアップロードするだけで、請求書の情報を自動的に抽出・データ化する機能を提供します。複数のAI技術を活用し、高精度な請求書データ抽出を実現しています。

## 🚀 主な機能

### OCR・AI解析機能

- **Document Intelligence**: Azure Document Intelligence APIを使用した高精度請求書解析
- **Google Document AI**: Google Document AI APIによる書類解析
- **Phi4 Analysis**: 独自のPhi4モデルを使用したテキスト解析

### データ抽出項目

- 請求元会社情報（会社名、住所、電話番号など）
- 請求先会社情報（会社名、住所、電話番号など）
- 請求書基本情報（請求書番号、発行日、支払期限など）
- 明細情報（品目、数量、単価、金額など）
- 金額情報（小計、税額、合計金額など）
- 銀行振込情報

### その他機能

- CSVファイルダウンロード
- リアルタイムプレビュー
- エラーハンドリング
- レスポンシブデザイン

## 🛠 技術スタック

### フロントエンド

- **React 18** + **TypeScript**
- **Vite** (ビルドツール)
- **Material-UI** (UIコンポーネント)
- **Sass** (スタイリング)
- **Axios** (HTTP通信)

### バックエンド

- **Firebase Functions** (サーバーレス関数)
- **Node.js 20**
- **TypeScript**
- **Firebase Admin SDK**

### AI・API

- **Google Document AI API** (メインOCR機能)
- **Phi4 Analysis** (独自解析機能)
- **Azure Document Intelligence API** (一時的に無効化中)

### テスト

- **Playwright** (E2Eテスト)

### インフラ

- **Firebase** (ホスティング・ストレージ)
- **Google Cloud Platform**

## 📋 前提条件

以下がインストールされている必要があります：

- Node.js 20以上
- npm または yarn
- Firebase CLI
- Git

## 🔧 セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd invoice-ocr-app
```

### 2. 依存関係のインストール

```bash
# ルートディレクトリ
npm install

# フロントエンド
cd frontend
npm install

# バックエンド
cd ../functions
npm install
```

### 3. 環境変数の設定

```bash
# frontend/.env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# functions/.env
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### 4. Firebase プロジェクトの初期化

```bash
firebase login
firebase use --add
```

## 🚀 実行方法

### 開発環境での実行

1. **バックエンドの起動**

```bash
cd functions
npm run serve
```

2. **フロントエンドの起動**

```bash
cd frontend
npm run dev
```

アプリケーションは `http://localhost:5173` でアクセスできます。

### プロダクションビルド

```bash
# フロントエンド
cd frontend
npm run build

# バックエンド
cd ../functions
npm run build
```

### デプロイ

```bash
firebase deploy
```

## 🧪 テスト

### E2Eテストの実行

```bash
cd frontend
npx playwright test
```

### 特定のテストファイルの実行

```bash
# CSVダウンロード機能テスト
npx playwright test tests/csv-download.spec.ts

# Document AI テスト
npx playwright test tests/invoice-ocr-document-ai.spec.ts

# Phi4 テスト
npx playwright test tests/invoice-ocr-phi4.spec.ts
```

### ヘッドレスモードでのテスト実行

```bash
npx playwright test --headed
```

## 📁 プロジェクト構造

```
invoice-ocr-app/
├── frontend/                 # フロントエンドアプリケーション
│   ├── src/
│   │   ├── components/      # Reactコンポーネント
│   │   ├── pages/          # ページコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── types/          # TypeScript型定義
│   │   └── utils/          # ユーティリティ関数
│   ├── tests/              # Playwrightテスト
│   └── public/             # 静的ファイル
├── functions/               # Firebase Functions
│   ├── src/
│   │   ├── controllers/    # APIコントローラー
│   │   ├── services/       # ビジネスロジック
│   │   ├── types/          # TypeScript型定義
│   │   └── utils/          # ユーティリティ関数
│   └── test_data/          # テスト用データ
├── firebase.json           # Firebase設定
└── package.json            # プロジェクト依存関係
```

## 🔄 APIエンドポイント

### 請求書解析API

- `POST /invoice/document-ai/analyze` - Document AI解析 (Google)
- `POST /invoice/phi4/analyze` - Phi4解析
- `POST /invoice/document-intelligence/analyze` - Document Intelligence解析 (一時的に無効化中)

### データ取得API

- `GET /csv/download` - CSVダウンロード
- `GET /key` - APIキー生成
- `GET /health` - ヘルスチェック

## 📊 テスト対象ファイル

プロジェクトには以下のテスト用PDFファイルが含まれています：

- `functions/test_data/マネーフォード_1.pdf`
- `functions/test_data/マネーフォード_2.pdf`
- `functions/test_data/lt_サンプル1.pdf`

## 🐛 トラブルシューティング

### よくある問題

1. **API認証エラー**
   - 環境変数が正しく設定されているか確認
   - APIキーの有効期限を確認

2. **Firebase Emulator接続エラー**
   - Emulatorが起動しているか確認
   - ポート番号（通常8080）が使用可能か確認

3. **Playwrightテストエラー**
   - ブラウザがインストールされているか確認: `npx playwright install`
   - テストタイムアウトの調整

## 📝 ライセンス

このプロジェクトはプライベートリポジトリです。

## 🤝 コントリビューション

1. フィーチャーブランチを作成
2. 変更をコミット
3. プルリクエストを作成

## 📞 サポート

技術的な問題や質問がある場合は、Issue を作成してください。

---

**注意**: 本アプリケーションは機密性の高い請求書データを扱うため、セキュリティ対策を十分に検討した上で運用してください。
