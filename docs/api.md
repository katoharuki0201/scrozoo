# API 定義

## 1. 共通仕様

- ベースパス: `/api`
- JSON: `camelCase`
- 日時: UTC・ISO 8601
- ID: UUID または ULID
- 認証: Better Auth の Cookie セッション
- 一覧: `cursor` と `limit`（初期値20、最大50）によるカーソルページング
- 決済などの重複実行を防ぐ API は `Idempotency-Key` ヘッダーを受け取る

### レスポンス

```json
{
  "data": {}
}
```

一覧は `page.nextCursor`、失敗時は `error.code`、`error.message`、必要に応じて `error.fields` を返す。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "fields": {}
  }
}
```

主に `400`、`401`、`403`、`404`、`409`、`422`、`429`、`500` を使う。

## 2. 認証

Better Auth の handler を `/api/auth/*` にマウントする。

| メソッド | パス | 用途 |
| --- | --- | --- |
| `POST` | `/api/auth/sign-up/email` | メール登録 |
| `POST` | `/api/auth/sign-in/email` | メールログイン |
| `POST` | `/api/auth/sign-in/social` | Google ログイン |
| `GET` | `/api/auth/get-session` | セッション取得 |
| `POST` | `/api/auth/sign-out` | ログアウト |
| `POST` | `/api/auth/request-password-reset` | 再設定メール送信 |
| `POST` | `/api/auth/reset-password` | パスワード再設定 |

## 3. プロフィール

| メソッド | パス | 認証 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/api/me` | 必須 | 本人情報、メールアドレス、権限を取得 |
| `PATCH` | `/api/me` | 必須 | ユーザー名、アイコン、自己紹介を更新 |
| `DELETE` | `/api/me` | 必須 | 退会し、公開名を退会済み表示に変更 |
| `GET` | `/api/users/:userId` | 不要 | 公開プロフィール |
| `GET` | `/api/users/:userId/gallery` | 不要 | 公開ギャラリー |

## 4. 動物園・動物

| メソッド | パス | 認証 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/api/zoos` | 不要 | 動物園の一覧・検索 |
| `GET` | `/api/zoos/:zooId` | 不要 | プロフィール、SNS、加入状態 |
| `GET` | `/api/zoos/:zooId/animals` | 不要 | 所属動物一覧 |
| `GET` | `/api/animals/:animalId` | 不要 | 動物詳細 |

`GET /api/zoos` は `q`、`region`、`cursor`、`limit` を受け取る。

## 5. 動画・コメント・お気に入り

| メソッド | パス | 認証 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/api/videos` | 不要 | 動画一覧・検索 |
| `GET` | `/api/videos/:videoId` | 不要 | 動画詳細と視聴可能な URL |
| `GET` | `/api/videos/:videoId/comments` | 不要 | コメント一覧 |
| `POST` | `/api/videos/:videoId/comments` | 必須 | 通常コメントを投稿 |
| `PUT` | `/api/videos/:videoId/favorite` | 必須 | お気に入り追加 |
| `DELETE` | `/api/videos/:videoId/favorite` | 必須 | お気に入り解除 |
| `GET` | `/api/me/favorites` | 必須 | お気に入り動画一覧 |

`GET /api/videos` は `q`、`zooId`、`animalId`、`species`、`tag`、`cursor`、`limit` を受け取る。

動画詳細は `previewUrl`、`fullUrl`、`canPlayFull`、`expiresAt` を含む。加入者と投稿元の動物園にだけ `fullUrl` を返す。

## 6. 応援プラン・投げ銭

| メソッド | パス | 認証 | 用途 |
| --- | --- | --- | --- |
| `POST` | `/api/zoos/:zooId/subscription-checkout` | 必須 | 月額プラン用 Stripe Checkout Session を作成 |
| `GET` | `/api/me/subscriptions` | 必須 | 加入中・解約予定のプラン一覧 |
| `POST` | `/api/subscriptions/:subscriptionId/cancel` | 必須 | 期間末での解約を予約 |
| `POST` | `/api/videos/:videoId/tip-checkout` | 必須 | 投げ銭コメントと Checkout Session を作成 |
| `GET` | `/api/me/support-logs` | 必須 | 月額加入と投げ銭履歴 |
| `POST` | `/api/webhooks/stripe` | Stripe | Webhook を検証し、決済状態と権限を反映 |

投げ銭 API は `amount`（100〜3,000）と `comment` を受け取り、Webhook 成功後にコメントを公開する。Stripe Sandbox のみ使用する。

## 7. QR 認証・ギャラリー

| メソッド | パス | 認証 | 用途 |
| --- | --- | --- | --- |
| `POST` | `/api/visits/verify` | 必須 | QR トークンを検証し、2時間の投稿権限を発行 |
| `GET` | `/api/zoos/:zooId/gallery` | 不要 | 動物園のギャラリー |
| `GET` | `/api/gallery/:postId` | 不要 | ギャラリー投稿詳細 |
| `POST` | `/api/gallery` | QR 認証済み | タイトル、画像、対象動物を指定して投稿 |
| `GET` | `/api/me/gallery` | 必須 | 自分のギャラリー投稿 |

`POST /api/visits/verify` は `token` を受け取り、`visitPermitId`、`zooId`、`expiresAt` を返す。

## 8. サポーターチャット

| メソッド | パス | 認証 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/api/zoos/:zooId/chat/messages` | 加入者・投稿者 | 新着メッセージをポーリング取得 |
| `POST` | `/api/zoos/:zooId/chat/messages` | 加入者・投稿者 | テキストメッセージを投稿 |

GET は `after`、`cursor`、`limit` を受け取る。メッセージは最大500文字とする。

## 9. R2 アップロード

| メソッド | パス | 認証 | 用途 |
| --- | --- | --- | --- |
| `POST` | `/api/uploads` | 必須 | R2 アップロード用の署名付き URL を発行 |
| `POST` | `/api/uploads/:uploadId/complete` | 必須 | 完了を確認し、`objectKey` を有効化 |

`POST /api/uploads` は `purpose`（`avatar`、`zooProfile`、`animalProfile`、`video`、`videoPreview`、`galleryImage`）、`contentType`、`size`、`fileName` を受け取る。ロール、形式、サイズ、R2 使用量を検査してから URL を発行する。フロントエンドは返された `headers` を付けてR2へ直接PUTし、その後に完了APIを呼ぶ。

## 10. 投稿者向け API

動物園アカウントのみ利用できる。対象はセッションの動物園に限定し、リクエストの `zooId` は信頼しない。

| メソッド | パス | 用途 |
| --- | --- | --- |
| `GET` | `/api/publisher/zoo` | 自身の動物園情報 |
| `PATCH` | `/api/publisher/zoo` | プロフィールと SNS リンクを更新 |
| `GET` | `/api/publisher/animals` | 所属動物一覧 |
| `POST` | `/api/publisher/animals` | 動物を登録 |
| `PATCH` | `/api/publisher/animals/:animalId` | 動物情報を更新 |
| `GET` | `/api/publisher/videos` | 自身の投稿動画一覧 |
| `POST` | `/api/publisher/videos` | アップロード済み動画から投稿を作成 |
| `PATCH` | `/api/publisher/videos/:videoId` | 説明、動物、タグ、公開状態を更新 |
| `DELETE` | `/api/publisher/videos/:videoId` | 投稿動画を非公開化 |
| `GET` | `/api/publisher/supporters` | プラン加入者と投げ銭利用者 |
| `GET` | `/api/publisher/visit-qr` | 来園認証 URL と QR 表示用情報 |

## 11. 運用確認

| メソッド | パス | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | Hono API の起動確認 |
| `GET` | `/api/ready` | Turso、R2 など必須依存先の接続確認 |

## 12. 実装順序

1. 共通エラー、認証、`/api/me`
2. 動物園、動物、動画の参照 API
3. R2 アップロードと投稿者の動画管理
4. コメント、お気に入り、公開プロフィール
5. Stripe Sandbox、応援プラン、投げ銭、サポートログ
6. QR 認証とギャラリー
7. サポーターチャットとサポーター一覧
