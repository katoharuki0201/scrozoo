# 技術構成

## 採用スタック

TechJam 2026 の推奨スタックに合わせ、モックを無料枠内で公開できる構成とする。

| 用途 | 技術 |
| --- | --- |
| フロントエンド | React + Vite |
| バックエンド | Hono |
| DB | Turso（SQLite / libSQL） |
| ORM | Drizzle ORM |
| 認証 | Better Auth |
| 動画・画像保存 | Cloudflare R2 |
| 決済 | Stripe Sandbox |
| QR コード | QR コード生成・読み取りライブラリ |
| デプロイ | Cloudflare Workers / Pages |
| 言語 | TypeScript |
| パッケージ管理 | Bun |

## 構成方針

- Bun workspace で `apps/web`、`apps/api`、`packages/shared` に分ける。
- React は Cloudflare Pages、Hono API は Cloudflare Workers Free にデプロイする。
- API の入出力型と Zod スキーマは `packages/shared` で共有する。
- DB 接続に `@libsql/client/web`、ORM に Drizzle の libSQL ドライバを使う。
- ローカル開発は Turso の開発 DB、またはローカル SQLite を使う。

## 認証

- Better Auth と Drizzle Adapter（`provider: "sqlite"`）を使い、Turso にユーザー、セッション、連携アカウントを保存する。
- メールアドレス・パスワード認証と Google OAuth を有効にする。
- `BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、Google OAuth の Client ID / Secret、Turso の接続情報は Workers Secrets で管理する。
- Hono の `/api/auth/*` に Better Auth の handler をマウントする。
- Pages と Workers のオリジンを `trustedOrigins` と CORS に明示し、Cookie 付きリクエストのみ許可する。
- Better Auth のスキーマは CLI で生成し、Drizzle のマイグレーションとして Turso へ適用する。

## 動画・画像

- フロントエンドが Hono API から署名付き URL を取得し、R2 へ直接アップロードする。
- 動画は MP4（H.264/AAC）、最大60秒、ギャラリー画像は JPEG / WebP を基本とする。
- 動画にはフル版と冒頭5秒のプレビュー版を用意し、API が権限に応じた URL のみ返す。
- ブラウザ内撮影は `MediaRecorder` と `getUserMedia` を使い、非対応端末ではファイル選択へフォールバックする。

## 決済モック

- Stripe は Sandbox とテスト API キーのみ使い、実際のお金を移動させない。
- 月額500円のサブスクリプションと、100円〜3,000円の投げ銭をテスト決済で再現する。
- Webhook の署名を Hono で検証し、同じイベント ID を二重反映しない。
- テストカード以外の入力を促さず、画面上に「テスト決済で実際の請求は発生しない」と表示する。

## QR コード

- QR には HTTPS の来園認証 URL を埋め込み、端末標準カメラとアプリ内カメラの両方から開けるようにする。
- 生成は `qrcode`、ブラウザ内読み取りは `BarcodeDetector` と `@zxing/browser` のフォールバックを候補とする。

## 無料枠でのデプロイ

- Cloudflare Workers / Pages と Turso は Free プランのみ使う。公開 URL は無料の `pages.dev` / `workers.dev` を使う。
- R2 は Standard ストレージの月間無料枠（10GB-month、Class A 100万回、Class B 1,000万回）内に制限する。
- 安全余裕を持たせ、R2 の合計保存量が8GB、またはユーザー単位の上限に達した場合は新規アップロードを停止する。
- Stripe は Sandbox 専用とし、ライブモードを有効にしない。
- クラウド各社の無料枠を超える規模は対象外とする。R2 は超過時に課金され得るため、使用量アラートとアプリ側の上限を必ず設ける。
