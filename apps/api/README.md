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
