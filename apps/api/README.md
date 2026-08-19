# Scrozoo API

Hono、Turso、Drizzle ORM、Better Authを使用するAPIです。

## セットアップ

```sh
bun install
cp .env.example .env
```

`.env` にTursoの接続情報と32文字以上の `BETTER_AUTH_SECRET` を設定してください。

## 認証スキーマ生成

`src/auth.ts` の設定から `src/db/auth-schema.ts` を生成し、マイグレーション対象の `src/db/schema.ts` へコピーします。

```sh
bun run auth:schema
```

個別に実行する場合:

```sh
bun x auth@latest generate --output ./src/db/auth-schema.ts
bun run auth:sync
```

`auth-schema.ts` は Better Auth CLI の生成物として編集せず、データベース全体のスキーマとリレーションは `schema.ts` で管理します。`auth.ts` を変更した場合は、必ず再生成・同期してください。

## 開発サーバー

```sh
bun run dev
```

- API: `http://localhost:3000`
- Better Auth: `http://localhost:3000/api/auth/*`
- ヘルスチェック: `http://localhost:3000/api/health`

## 認証ミドルウェア

`src/middleware/auth.ts` は次の3種類を提供します。

- `sessionMiddleware`: セッションを `c.get("session")` で取得可能にする
- `requireAuth`: 未ログインを `401` で拒否する
- `requirePublisher`: 投稿者以外を `403` で拒否する

`src/index.ts` で `sessionMiddleware` を適用済みのため、ログイン必須ルートには次のように追加します。

```ts
app.get("/api/me", requireAuth, (c) => {
  return c.json({ data: c.get("session")?.user });
});
```
