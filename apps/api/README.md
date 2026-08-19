# Scrozoo API

Hono、Turso、Drizzle ORM、Better Authを使用するAPIです。

## セットアップ

```sh
bun install
cp .env.example .env
```

`.env` にTursoの接続情報と32文字以上の `BETTER_AUTH_SECRET` を設定してください。

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
