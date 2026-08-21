# API 統合タスク

## 目的

MSW で実装されているフロントエンド向け API を、Hono、Better Auth、Drizzle ORM、Turso、Cloudflare R2 を使う実 API へ移行する。

2026-08-21 時点では Wrangler を使用せず、R2 には公開用の `scrozoo-public` バケットのみを作成済みとする。

## 共通方針

- API のベースパスは `/api` とする。
- 認証は Better Auth の HttpOnly Cookie セッションを使う。
- R2 の Access Key ID、Secret Access Key は API サーバーのみが保持し、Web 側や `VITE_*` 環境変数には入れない。
- 新規 API は入力検証、認可、正常系、主要な異常系のテストを同時に追加する。
- 決済やアップロードは、DB 更新と外部サービスの結果が不整合にならないように設計する。
- 対応完了した MSW ハンドラーは削除し、最終的に MSW 依存と `mockServiceWorker.js` を削除する。

## 現在実装済み

- [x] `GET /api/health`
- [x] `GET /api/ready`
- [x] Better Auth のメール登録、ログイン、ログアウト、セッション取得
- [x] `GET /api/profiles/me/account`
- [x] `PATCH /api/profiles/me/account`
- [x] `GET /api/profiles/me`
- [x] `GET /api/zoos/:zooId/profile`
- [x] `GET /api/feed`
- [x] `GET /api/search/videos`
- [x] `GET /api/favorites`
- [x] `POST /api/feed/:videoId/like`
- [x] `GET /api/feed/:videoId/comments`
- [x] `POST /api/feed/:videoId/comments`の通常コメント
- [x] Vite から Hono への `/api` プロキシ
- [x] MSW を `VITE_ENABLE_MOCKS=true` の場合だけ起動する設定

## P0: R2 アップロード基盤

### 環境変数

- [x] `apps/api/.env.example` に以下を追加する。
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_ENDPOINT`
  - `R2_PUBLIC_BUCKET_NAME=scrozoo-public`
  - `MEDIA_PUBLIC_BASE_URL`
- [x] API 起動時に必須環境変数を検証し、設定不足を明確なエラーにする。
- [x] R2 クライアントを単一モジュールとして作成する。
- [x] Access Key ID と Secret Access Key が Git 履歴とログに出力されないことを確認する。

### 署名付きアップロード

- [x] `POST /api/uploads` を実装する。
  - 認証必須
  - `purpose`、`contentType`、`size`、元ファイル名を検証
  - UUID などで予測困難な `objectKey` を生成
  - `media_asset` に `pending` で保存
  - 有効期限が短い `PutObject` 署名付き URL を返す
  - 署名に `Content-Type` を含める
- [x] 用途ごとの許可形式と容量上限を実装する。
  - `avatar`: JPEG / PNG / WebP
  - `zooProfile`: JPEG / PNG / WebP
  - `animalProfile`: JPEG / PNG / WebP
  - `galleryImage`: JPEG / WebP
  - `videoPreview`: MP4 / WebM（ブラウザ内生成時のフォールバック）
  - `video`: MP4
- [x] `POST /api/uploads/:uploadId/complete` を実装する。
  - R2 上にオブジェクトが存在することを `HEAD` 相当で確認
  - Content-Type とサイズが事前申告と一致することを確認
  - `media_asset.status` を `ready` に更新
- [x] `pending` は24時間で期限切れとし、定期クリーンアップでR2オブジェクトとDBレコードを削除する。完了APIは期限切れを拒否する。
- [x] R2 の CORS で開発環境と本番 Web オリジンからの `PUT`、`GET`、`HEAD` だけを許可する。

### 非公開メディアの判断

- [x] フル動画の実装前に、`scrozoo-private` バケットを作成するか決定する。
- [x] 加入者限定のフル動画は `scrozoo-public` に保存しない。
- [x] 閲覧権限確認後に短時間の `GetObject` 署名付き URL を発行する。

## P0: フロントのアップロード移行

- [x] 投稿者の動画投稿を、Hono への大容量 `multipart/form-data` 送信から R2 への直接 PUT に変更する。
- [x] ギャラリー投稿を `imageDataUrl` の JSON 送信から R2 への直接 PUT に変更する。
- [x] 動画投稿にアップロード中、失敗、再試行、キャンセルの UI を実装する。
- [x] R2 の PUT 応答から `ETag` を取得し、完了 API へ送信する。

## P1: 認証とアカウント

- [ ] Google OAuth の `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を本番環境へ設定する。
- [ ] Google OAuth のコールバック URL を Google Cloud Console へ登録する。
- [x] 登録時に `user_profile` を自動作成する DB hook または初期化処理を追加する。
- [x] `viewer`、`creator`、`admin` のロール名を DB、Better Auth、フロントで統一する。
- [x] メールアドレス変更は現行画面との互換性を保つ暫定仕様とし、本番提供前に確認メール方式へ移行する。
- [x] Resend を使ったパスワード再設定メール送信を実装する。
- [x] 退会 API と「退会済みユーザー」への表示名変更を実装する。

## P1: フィード・検索・プロフィールの完成

- [x] `GET /api/feed` の N+1 DBクエリをバッチ取得へ変更する。
- [x] 動画の再生回数カラムを追加し、固定値 `0` を廃止する。
- [x] 動画のサムネイル時刻を DB で管理する。
- [x] 動物園アバターを R2 のメディア URL へ置き換え、未設定時のみ既定画像を使う。
- [x] フィードに既存の配列レスポンスを維持した `cursor` と最大50件の `limit` を追加する。
- [x] 検索を DB クエリ化し、動物名、種、動物園名、タグを対象にする。
- [x] プロフィールのギャラリー投稿を DB から返す。
- [x] 動物園プロフィールの動画数、サポーター数を正しく集計する。
- [x] フロント最小差分のため、現行 `POST /api/feed/:videoId/like` toggle API を正式仕様とする。

## P1: 投稿者 API

- [x] `GET /api/publisher/zoo`
- [x] `PATCH /api/publisher/zoo`
- [x] `GET /api/publisher/animals`
- [x] `POST /api/publisher/animals`
- [x] `PATCH /api/publisher/animals/:animalId`
- [x] `GET /api/publisher/videos`
- [x] `POST /api/creator/posts`（既存フロント契約を維持）
  - `ready` の動画とプレビューメディアのみ指定可
  - セッションの動物園以外のメディアは指定不可
- [x] `PATCH /api/publisher/videos/:videoId`
- [x] `DELETE /api/publisher/videos/:videoId`
- [x] `GET /api/creator/supporters`（既存フロント契約）
- [x] `GET /api/publisher/visit-qr`
- [x] 現行フロントの `POST /api/creator/posts` を新しいアップロードフローへ置き換える。

## P1: QR 認証とギャラリー

- [x] QR トークンは暗号学的乱数で生成し、発行QRは24時間、検証後の投稿権限は2時間有効とする。
- [x] DB に保存するのは QR トークン本文ではなく SHA-256 ハッシュにする。
- [x] `POST /api/qr/verify`
- [x] `GET /api/qr/sessions/:sessionId`
- [x] `POST /api/gallery/posts`
  - `ready` の `galleryImage` メディアのみ指定可
  - セッションのユーザーが所有する画像のみ指定可
  - 有効期間内の `visit_permit` を必須にする
- [x] 2時間の来園許可中は複数枚投稿できる仕様とし、セッションの二重使用は禁止しない。
- [x] 既存フロント契約に合わせ、`GET /api/zoos/:zooId/profile` と `GET /api/profiles/me` から動物園別・ユーザー別ギャラリーを返す。

## P2: 応援目標

- [ ] `support_goal` テーブルのスキーマとマイグレーションを追加する。
- [ ] 1動物園につき有効な目標は1件までとする制約を追加する。
- [ ] `GET /api/profiles/me/support-goal`
- [ ] `PUT /api/profiles/me/support-goal`
- [ ] `DELETE /api/profiles/me/support-goal`
- [ ] 金額は Stripe Webhook で決済成功を確認した後だけ加算する。
- [ ] 期限切れと達成済みのステータス判定を共通化する。

## P2: Stripe Sandbox、応援プラン、投げ銭

- [ ] Stripe Sandbox キーと Webhook Secret を API 環境変数に設定する。
- [ ] `POST /api/support-plans`または`POST /api/zoos/:zooId/subscription-checkout`
- [ ] `GET /api/profiles/me/support-plans`または`GET /api/me/subscriptions`
- [ ] `POST /api/support-plans/:planId/cancel`または`POST /api/subscriptions/:subscriptionId/cancel`
- [ ] `POST /api/videos/:videoId/tip-checkout`
- [ ] `POST /api/webhooks/stripe`
  - 署名を検証
  - `stripe_webhook_event.id` で重複実行を防止
  - 成功時だけ subscription、tip、comment、support goal を反映
- [ ] 現在 `501` を返す投げ銭付きコメントを Checkout フローに置き換える。
- [ ] `Idempotency-Key` を必須化し、同じ決済リクエストの二重実行を防止する。
- [ ] 決済キャンセル・失敗・Webhook 遅延を UI で扱う。

## P2: 管理画面 API

- [x] 管理者認証を Better Auth の `admin` ロールまたは admin plugin で実装する。
- [x] `POST /api/admin/auth/login`
- [x] `GET /api/admin/auth/session`
- [x] `POST /api/admin/auth/logout`
- [x] `GET /api/admin/dashboard`
- [x] `GET /api/admin/users`
- [x] `GET /api/admin/subscribers`
- [x] `GET /api/admin/revenue`
- [x] `GET /api/admin/creators`
- [x] `POST /api/admin/creators`
- [x] `PATCH /api/admin/creators/:creatorId/status`
- [x] 投稿者発行に必要な担当者名、状態、発行日の DB スキーマを追加する。
- [x] 停止された投稿者の既存セッションを失効させる。
- [x] 仮パスワードを平文で DB へ保存しない。

## P3: サポーターチャット

- [ ] `GET /api/zoos/:zooId/chat/messages`
- [ ] `POST /api/zoos/:zooId/chat/messages`
- [ ] 動物園の投稿者または有効な加入者だけがアクセスできる認可を追加する。
- [ ] 500文字上限、レート制限、90日後の削除を実装する。
- [ ] `after`、`cursor`、`limit` による新着取得を実装する。

## 共通品質タスク

- [ ] API のエラー形式を `{ error: { code, message, fields? } }` に統一する。
- [ ] JSON リクエスト検証を Zod または Hono validator で共通化する。
- [ ] `401`、`403`、`404`、`409`、`422`、`429`、`500` の使い分けを統一する。
- [ ] レート制限で使うクライアント IP ヘッダーをデプロイ先に合わせて設定する。
- [ ] 一覧 API に `cursor`、`limit`、`page.nextCursor` を実装する。
- [ ] DB index と実際のクエリの利用状況を確認する。
- [ ] 初期開発データを作成する seed スクリプトを追加する。
- [ ] API の unit test と一時 SQLite を使う integration test を追加する。
- [ ] Web の主要導線を E2E テストする。
- [ ] `bun run typecheck`、Web lint、Web build、DB migration を CI で実行する。
- [ ] 本番ログで Cookie、Authorization、R2 署名付き URL、個人情報を出力しない。

## MSW 削除の完了条件

- [ ] `apps/web/src/mocks/handlers.ts` に残るすべての API が Hono で実装されている。
- [ ] フロントの API レスポンスと Hono の応答の Zod 検証が一致する。
- [ ] ローカルと本番相当環境で MSW 無効の E2E テストが成功する。
- [ ] `msw` 依存、`src/mocks`、`public/mockServiceWorker.js`、`VITE_ENABLE_MOCKS` を削除する。

## 推奨実装順

1. R2 環境変数とクライアント
2. `POST /api/uploads` と完了 API
3. ギャラリー画像アップロード
4. プレビュー動画アップロード
5. 投稿者の動画管理 API
6. QR 認証とギャラリー
7. 応援目標
8. Stripe Sandbox、応援プラン、投げ銭
9. 管理画面 API
10. サポーターチャット
11. MSW の完全削除
