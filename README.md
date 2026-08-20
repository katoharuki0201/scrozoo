# Scrozoo

動物園の日常をショート動画で楽しみながら、月額プランや投げ銭で応援できる Web サービスです。

TechJam 2026 チームBの企画として開発しています。

## コンセプト

- 動物園が、飼育する動物の日常動画を発信する
- 無料ユーザーは冒頭 5 秒、サポーターは応援中の動物園の動画をフル視聴できる
- 月額応援、投げ銭付きコメント、サポーターチャットで動物園を応援する
- 現地 QR コードの認証後、来園者が写真をギャラリーに投稿できる

## 主なドキュメント

- [要件定義](./docs/requirements.md)
- [画面とページ遷移](./docs/screens-and-flows.md)
- [API 定義](./docs/api.md)
- [API 統合タスク](./docs/api-integration-tasks.md)
- [データベース設計](./docs/database-design.md)
- [技術構成](./docs/architecture.md)
- [決定事項](./docs/decisions.md)

## 技術スタック

- React + Vite / Hono / TypeScript
- Turso + Drizzle ORM
- Better Auth
- Cloudflare R2
- Stripe Sandbox
- Cloudflare Workers / Pages
- Bun

モックは各サービスの無料枠と Stripe Sandbox を使って公開する想定です。詳細は [技術構成](./docs/architecture.md) を参照してください。

## 開発状況

ReactフロントエンドとHono APIを統合中です。認証、プロフィール、フィード、検索、お気に入り、通常コメントはHonoとTurso/SQLiteに接続済みです。

```text
apps/web/  React + Vite
apps/api/  Hono
```

2つのディレクトリはモノレポの workspace にせず、それぞれ独立した Bun プロジェクトとして管理します。

### フロントエンド

```sh
cd apps/web
bun install
bun run dev
```

### API

```sh
cd apps/api
bun install
bun run dev
```

## チーム

加藤晴快、勝野鉱治、鈴木晟琥、塩谷咲弥、中元響介、千葉星梧
