# SUGAR Task — Claude セッション引き継ぎメモ

## プロジェクト概要
建設会社（株式会社SUGAR）向けの業務特化タスク管理Webアプリ。
Claudeとの対話のみで開発。コード直打ちゼロ。

- **本番URL**: https://daily-focus-hq.vercel.app
- **ログインPW**: `kamada0918`（APP_PASSWORD）
- **GitHub**: https://github.com/dsato0918-lab0918/daily-focus-hq

## 技術スタック
- Next.js 15.5 / TypeScript / App Router / Vercel
- Notion REST API（DB直接呼び出し、SDK不使用）
- Groq API（llama-3.1-8b-instant）→ AIチャット・LINE解析
- LINE Messaging API（Incoming Webhook）→ タスク自動追加
- Slack Incoming Webhook → スタッフへタスク依頼送信

## Git操作
```bash
rm -rf /tmp/daily-focus-hq && git clone https://<GITHUB_TOKEN>@github.com/dsato0918-lab0918/daily-focus-hq.git /tmp/daily-focus-hq
cd /tmp/daily-focus-hq
git config user.email "d.sato0918@gmail.com"
git config user.name "Daisuke Sato"
# ビルド確認
npm install --legacy-peer-deps --silent && node_modules/.bin/next build
```

## Vercel 環境変数（設定済み）
| 変数名 | 用途 |
|--------|------|
| `APP_PASSWORD` | ログインPW: `kamada0918` |
| `NOTION_TOKEN` | `<Vercel環境変数参照>` |
| `NOTION_PROJECTS_DB_ID` | `178509ee0e144c0982dfbf1c74f60c3b` |
| `NOTION_TASKS_DB_ID` | `578bac9d879142dd95a9629d9cbf7deb` |
| `NOTION_DOMAINS_DB_ID` | `e6d570347ad14e5c8b50dc91287e1d4e` |
| `NOTION_MISSION_DB_ID` | `375072cc-8cf2-81da-b79f-f37f7180d047` |
| `GROQ_API_KEY` | `<Vercel環境変数参照>`（コードにハードコード禁止） |
| `LINE_CHANNEL_SECRET` | `<Vercel環境変数参照>` |
| `LINE_CHANNEL_ACCESS_TOKEN` | Vercel参照 |
| `SLACK_WEBHOOK_URL` | `<Vercel環境変数参照>` |

## Notionデータ構造

### Projects DB（178509ee...）
| プロパティ | 型 | 備考 |
|-----------|-----|------|
| 名前 | title | プロジェクト名 |
| セクション | select | design/const/mgmt/staff |
| ステータス | select | g/a/r |
| アーカイブ | checkbox | |

### Tasks DB（578bac9d...）
| プロパティ | 型 | 備考 |
|-----------|-----|------|
| タイトル | title | ※「名前」ではない |
| プロジェクト | relation | Projects DBへ |
| 期日 | rich_text | ※date型ではない、"YYYY-MM-DD"文字列 |
| 完了 | checkbox | |
| 急ぎ | checkbox | |
| メモ | rich_text | |
| スタッフ依頼済 | checkbox | |
| 業者依頼済 | checkbox | |

### Domains DB（e6d570...）
| プロパティ | 型 |
|-----------|-----|
| 名前 | title |
| アイコン | rich_text |
| 背景色 | rich_text |
| 文字色 | rich_text |

### Mission DB（375072cc...）
| プロパティ | 型 | 備考 |
|-----------|-----|------|
| 日付 | title | "YYYY-MM-DD" |
| タスクIDs | rich_text | `id1,id2,id3\|\|bonus1,bonus2` （\|\|でボーナス区切り）|

## ドメインキーマッピング
```typescript
const LABEL_TO_KEY: Record<string, string> = {
  "設計": "design",
  "施工": "const",
  "経営": "mgmt",
  "スタッフ管理": "staff",
};
```
⚠️ Notionから取得したdomainはUUID。プロジェクトのdomain値は英語キー。`pageToDomain`でLABEL_TO_KEYを使って変換。

## APIルート一覧
| パス | メソッド | 用途 |
|------|---------|------|
| `/api/auth` | POST | ログイン認証 |
| `/api/notion/data` | GET | 全データ一括取得 |
| `/api/notion/projects` | GET/POST | プロジェクト一覧/作成 |
| `/api/notion/projects/[id]` | PATCH/DELETE | プロジェクト更新/削除 |
| `/api/notion/tasks` | GET/POST | タスク一覧/作成 |
| `/api/notion/tasks/[id]` | PATCH/DELETE | タスク更新/削除 |
| `/api/notion/domains` | GET/POST | ドメイン一覧/作成 |
| `/api/notion/domains/[id]` | PATCH/DELETE | ドメイン更新/削除 |
| `/api/notion/mission` | GET/POST | 今日のミッション取得/保存 |
| `/api/slack/send` | POST | Slackメッセージ送信 |
| `/api/webhooks/line` | POST | LINE Webhookタスク自動追加 |
| `/api/ai-chat` | POST | AIチャット（Groq） |
| `/api/setup/mission-db` | GET | ミッションDB自動作成（セットアップ用） |

## middleware.ts
- 認証不要: `/login`, `/api/auth`, `/api/webhooks/*`
- APIルートへの未認証アクセス → JSON 401
- ページルート → `/login`へリダイレクト

## コンポーネント構成
```
app/
  page.tsx          → DailyFocusHQをimport
  globals.css       → PTR・紙吹雪アニメーション等
components/
  DailyFocusHQ.tsx  → メインコンテナ（state管理・API呼び出し）
  DomainPane.tsx    → 左1列目: セクション一覧
  ProjectPane.tsx   → 左2列目: プロジェクト一覧（セクション折りたたみ）
  TaskPane.tsx      → 中央: タスク一覧 + 今日のミッション
  DetailPane.tsx    → 右: タスク詳細 + Slack送信
  FloatingAIChat.tsx → AIチャットボット（Groq）
lib/
  notion.ts         → Notion API関数群
  data.ts           → todayDue/tomorrowDue/formatDueDisplay等
  types.ts          → 型定義
```

## 主要な既知の問題・解決済みバグ
1. **ドメインUUID vs 英語キー**: `pageToDomain`でLABEL_TO_KEY変換済み
2. **スマホ認証エラー**: middleware APIルートをJSON 401に変更・`credentials: "same-origin"`
3. **新規PJ直後タスク消失**: 仮ID（temp_proj_XXX）確定まで追加ボタン無効化
4. **LINEプロパティ名不一致**: Tasks DBのプロパティは「タイトル」「期日」（rich_text）

## 今日のミッション仕様
- 毎朝「今日を設定する」で3タスク選択
- localStorage（即時表示）+ Notion（端末間同期）
- ボーナスミッション: 全完了後に最大3つ追加選択可
- Notion保存形式: `missionId1,missionId2,missionId3||bonusId1,bonusId2`
- 30秒ポーリング + Page Visibility API（5秒閾値）で自動同期
- 紙吹雪は「新たにチェックした瞬間のみ」（prevRef=-1初期化で制御）

## LINE Bot仕様
- チャンネル: @463amxyv（株式会社SUGAR）
- Webhook URL: `https://daily-focus-hq.vercel.app/api/webhooks/line`
- デフォルト送り先プロジェクト: 「自動追加タスク」
- Groqで自然言語解析（タスク名・期日・急ぎ・備考を抽出）

## スマホ対応
- `@media (max-width: 767px)` でモバイルレイアウト切り替え
- PWA対応（manifest.json + ServiceWorker）
- カスタムPTR（Pull-to-Refresh）: `overscroll-behavior-y: none`
- Page Visibility API: 1分以上バックグラウンド後に自動データ更新
- iOS Safari: `onTouchEnd` バックアップをDomainPane・ProjectPane・ミッションヘッダーに追加
- モバイルフォントは16px（`.proj-item-name`, `.domain-item-label`, `.task-item-title`, `.detail-body-text`）

## Vercel直URL
- 環境変数: https://vercel.com/dsato0918-lab0918s-projects/daily-focus-hq/settings/environment-variables
- デプロイ: https://vercel.com/dsato0918-lab0918s-projects/daily-focus-hq/deployments
