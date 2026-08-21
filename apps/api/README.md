# Scrozoo API

Hono、Turso、Drizzle ORM、Better Authを使用するAPIです。

## セットアップ

```sh
bun install
cp .env.example .env
```

`.env` にTursoの接続情報と32文字以上の `BETTER_AUTH_SECRET` を設定してください。

ローカルSQLiteを使う場合は `TURSO_DATABASE_URL=file:local.db` と設定できます。

```sh
bun run db:migrate
```

### 初期管理者の作成

マイグレーション適用後、環境変数で認証情報を渡して最初の管理者を作成します。パスワードはBetter Authでハッシュ化され、ログには出力されません。

```sh
ADMIN_NAME="SCROZOO管理者" ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="replace-me" bun run admin:create
```

## 開発用管理者アカウント

マイグレーション後、最初の管理者アカウントを作成できます。

```sh
bun run db:seed:dev-accounts
```

| 種別 | メールアドレス | パスワード |
| --- | --- | --- |
| 管理者 | `admin@scrozoo.jp` | `admin1234` |

クリエイターは管理画面の「Creatorを発行」から作成します。発行時にCreatorアカウント、管理情報、動物園がまとめて作成されます。コマンドは再実行可能で、既存管理者のパスワードは上書きしません。値を変更する場合は `DEV_ADMIN_EMAIL`、`DEV_ADMIN_PASSWORD` を設定してください。本番環境（`NODE_ENV=production`）では実行できません。

## 認証スキーマ生成

`src/auth.ts` の設定から `src/db/auth-schema.ts` を生成します。

```sh
bun run auth:generate
```

`auth-schema.ts` は Better Auth CLI の生成物として編集せず、認証部分の変更をマイグレーション対象の `schema.ts` に反映します。業務テーブルは `schema.ts` で管理します。

## 開発サーバー

```sh
bun run dev
```

- API: `http://localhost:3000`
- Better Auth: `http://localhost:3000/api/auth/*`
- ヘルスチェック: `http://localhost:3000/api/health`
- DB接続確認: `http://localhost:3000/api/ready`

Web側のVite開発サーバーは `/api` をこのAPIにプロキシします。`apps/web/.env` の
`VITE_ENABLE_MOCKS=false` または未設定でHono APIが使われます。

## 実装済みルート

- Better Authのメール登録・ログイン・ログアウト・セッション
- 本人プロフィールとアカウント情報の取得・更新
- 動物園公開プロフィール
- フィード、検索、お気に入り、通常コメント

投げ銭などの決済ルートは、Stripe SandboxとWebhookが接続されるまで成功扱いにしません。

## 認証ミドルウェア

`src/middleware/auth.ts` は次の4種類を提供します。

- `sessionMiddleware`: セッションを `c.get("session")` で取得可能にする
- `requireAuth`: 未ログインを `401` で拒否する
- `requirePublisher`: 投稿者以外を `403` で拒否する
- `requireAdmin`: 管理者以外を `403` で拒否する

`src/index.ts` で `sessionMiddleware` を適用済みのため、ログイン必須ルートには次のように追加します。

```ts
app.get("/api/me", requireAuth, (c) => {
  return c.json({ data: c.get("session")?.user });
});
```
