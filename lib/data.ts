import type { Domain, Project, Task } from "./types";

export const initialDomains: Domain[] = [
  { id: "design", label: "設計",       icon: "ti-ruler-2",          bgColor: "#E6F1FB", textColor: "#185FA5" },
  { id: "const",  label: "施工",       icon: "ti-building-factory", bgColor: "#FAEEDA", textColor: "#854F0B" },
  { id: "mgmt",   label: "経営",       icon: "ti-chart-line",       bgColor: "#EAF3DE", textColor: "#3B6D11" },
  { id: "staff",  label: "スタッフ管理", icon: "ti-users",           bgColor: "#EEEDFE", textColor: "#3C3489" },
];

export const DOMAIN_COLOR_PRESETS = [
  { bgColor: "#E1F5EE", textColor: "#0F6E56" },
  { bgColor: "#FAECE7", textColor: "#993C1D" },
  { bgColor: "#FBEAF0", textColor: "#993556" },
  { bgColor: "#FCEBEB", textColor: "#A32D2D" },
  { bgColor: "#F1EFE8", textColor: "#5F5E5A" },
];

export const DOMAIN_ICONS = [
  "ti-layout-grid", "ti-briefcase", "ti-tool", "ti-home",
  "ti-calendar", "ti-file-text", "ti-star", "ti-truck",
];

export const initialProjects: Project[] = [
  // ── 設計 (20件) ──────────────────────────────────────────────
  { id: "d01", domain: "design", name: "山田邸リノベーション",     status: "g" },
  { id: "d02", domain: "design", name: "川口ビル改修",             status: "a" },
  { id: "d03", domain: "design", name: "鈴木クリニック改装",       status: "g" },
  { id: "d04", domain: "design", name: "佐藤マンション共用部改修", status: "a" },
  { id: "d05", domain: "design", name: "渡辺邸増築",               status: "g" },
  { id: "d06", domain: "design", name: "伊藤商業施設設計",         status: "r" },
  { id: "d07", domain: "design", name: "中村住宅団地計画",         status: "g" },
  { id: "d08", domain: "design", name: "小林邸外構設計",           status: "g" },
  { id: "d09", domain: "design", name: "加藤オフィスビル設計",     status: "a" },
  { id: "d10", domain: "design", name: "吉田介護施設設計",         status: "g" },
  { id: "d11", domain: "design", name: "山本保育園新築設計",       status: "r" },
  { id: "d12", domain: "design", name: "松本邸キッチンリノベ",     status: "g" },
  { id: "d13", domain: "design", name: "井上歯科クリニック設計",   status: "a" },
  { id: "d14", domain: "design", name: "木村邸バリアフリー改修",   status: "g" },
  { id: "d15", domain: "design", name: "林マンション新築設計",     status: "g" },
  { id: "d16", domain: "design", name: "清水倉庫改修設計",         status: "a" },
  { id: "d17", domain: "design", name: "中島ホテルロビー改装",     status: "g" },
  { id: "d18", domain: "design", name: "前田邸屋上テラス設計",     status: "g" },
  { id: "d19", domain: "design", name: "岡田工場事務所改修",       status: "r" },
  { id: "d20", domain: "design", name: "藤田保育所増築設計",       status: "g" },

  // ── 施工 (10件) ──────────────────────────────────────────────
  { id: "c01", domain: "const", name: "山田邸リノベ工事",          status: "g" },
  { id: "c02", domain: "const", name: "鈴木クリニック内装工事",    status: "a" },
  { id: "c03", domain: "const", name: "渡辺邸増築工事",            status: "g" },
  { id: "c04", domain: "const", name: "小林邸外構工事",            status: "r" },
  { id: "c05", domain: "const", name: "加藤ビル外壁補修工事",      status: "a" },
  { id: "c06", domain: "const", name: "吉田介護施設建設",          status: "g" },
  { id: "c07", domain: "const", name: "清水倉庫内装工事",          status: "g" },
  { id: "c08", domain: "const", name: "中島ホテル改装工事",        status: "a" },
  { id: "c09", domain: "const", name: "岡田工場事務所工事",        status: "g" },
  { id: "c10", domain: "const", name: "共通発注・資材管理",        status: "g" },

  // ── 経営 (10件) ──────────────────────────────────────────────
  { id: "m01", domain: "mgmt", name: "月次経理・財務管理",         status: "a" },
  { id: "m02", domain: "mgmt", name: "年次決算準備",               status: "g" },
  { id: "m03", domain: "mgmt", name: "経営戦略2026",               status: "g" },
  { id: "m04", domain: "mgmt", name: "設備投資計画",               status: "a" },
  { id: "m05", domain: "mgmt", name: "顧客管理システム導入",       status: "r" },
  { id: "m06", domain: "mgmt", name: "ホームページリニューアル",   status: "g" },
  { id: "m07", domain: "mgmt", name: "保険・契約更新管理",         status: "a" },
  { id: "m08", domain: "mgmt", name: "補助金・助成金申請",         status: "g" },
  { id: "m09", domain: "mgmt", name: "パートナー企業開拓",         status: "g" },
  { id: "m10", domain: "mgmt", name: "社内DX推進",                 status: "a" },

  // ── スタッフ管理 (5件) ───────────────────────────────────────
  { id: "s01", domain: "staff", name: "スタッフ評価・育成",        status: "a" },
  { id: "s02", domain: "staff", name: "勤怠・シフト管理",          status: "g" },
  { id: "s03", domain: "staff", name: "採用活動",                  status: "g" },
  { id: "s04", domain: "staff", name: "研修・資格取得支援",        status: "g" },
  { id: "s05", domain: "staff", name: "労務・福利厚生",            status: "a" },
];

export const initialTasks: Task[] = [
  // ── 設計タスク ───────────────────────────────────────────────
  { id: "td01", projId: "d01", title: "山田邸 平面図最終確認・押印",         due: "05/22", urgent: true,  done: false, memo: "施主確認済み、設計部内最終チェック待ち" },
  { id: "td02", projId: "d01", title: "山田邸 確認申請書類一式準備",         due: "05/27", urgent: false, done: false, memo: "" },
  { id: "td03", projId: "d01", title: "山田邸 施主向け仕上材サンプル提示",   due: "06/03", urgent: false, done: false, memo: "" },

  { id: "td04", projId: "d02", title: "川口ビル 耐震補強案 3パターン作成",   due: "05/23", urgent: true,  done: false, memo: "オーナーへのプレゼン資料も必要" },
  { id: "td05", projId: "d02", title: "川口ビル アスベスト調査結果レビュー", due: "05/26", urgent: false, done: false, memo: "" },

  { id: "td06", projId: "d03", title: "鈴木クリニック 待合室レイアウト修正", due: "05/22", urgent: false, done: true,  memo: "施主から動線変更の要望あり、対応済み" },
  { id: "td07", projId: "d03", title: "鈴木クリニック 医療ガス配管図面作成", due: "05/28", urgent: false, done: false, memo: "" },
  { id: "td08", projId: "d03", title: "鈴木クリニック 設備業者との打合せ",   due: "05/30", urgent: false, done: false, memo: "" },

  { id: "td09", projId: "d04", title: "佐藤マンション 共用廊下仕上材選定",   due: "05/24", urgent: false, done: false, memo: "" },
  { id: "td10", projId: "d04", title: "佐藤マンション 管理組合向け説明資料", due: "05/29", urgent: true,  done: false, memo: "理事会は5/31予定" },

  { id: "td11", projId: "d05", title: "渡辺邸 増築部分 構造計算依頼",        due: "05/23", urgent: false, done: false, memo: "外部構造事務所に依頼済み、確認のこと" },
  { id: "td12", projId: "d05", title: "渡辺邸 既存部との取合い図作成",        due: "05/30", urgent: false, done: false, memo: "" },

  { id: "td13", projId: "d06", title: "伊藤商業施設 基本設計修正（3回目）",  due: "05/21", urgent: true,  done: false, memo: "施主から大幅変更要求、スケジュール見直し必至" },
  { id: "td14", projId: "d06", title: "伊藤商業施設 追加費用見積提出",        due: "05/23", urgent: true,  done: false, memo: "" },

  { id: "td15", projId: "d07", title: "中村団地 配置計画 行政事前相談",       due: "05/28", urgent: false, done: false, memo: "" },
  { id: "td16", projId: "d07", title: "中村団地 各棟 標準仕様書まとめ",       due: "06/05", urgent: false, done: false, memo: "" },

  { id: "td17", projId: "d08", title: "小林邸 外構 植栽計画書作成",           due: "05/26", urgent: false, done: false, memo: "" },
  { id: "td18", projId: "d08", title: "小林邸 外構 施主最終確認アポ調整",     due: "05/29", urgent: false, done: false, memo: "" },

  { id: "td19", projId: "d09", title: "加藤オフィス ファサード案 比較提示",   due: "05/22", urgent: true,  done: false, memo: "3案作成済み、最終1案に絞る" },
  { id: "td20", projId: "d09", title: "加藤オフィス 省エネ計算書 作成依頼",   due: "06/02", urgent: false, done: false, memo: "" },

  { id: "td21", projId: "d10", title: "吉田介護施設 消防設備設計協議",         due: "05/27", urgent: false, done: false, memo: "" },
  { id: "td22", projId: "d10", title: "吉田介護施設 福祉施設補助金要件確認",  due: "05/31", urgent: false, done: false, memo: "" },

  { id: "td23", projId: "d11", title: "山本保育園 建築確認 指摘事項回答",      due: "05/21", urgent: true,  done: false, memo: "審査機関から3点指摘あり、早急に対応" },
  { id: "td24", projId: "d11", title: "山本保育園 園庭遊具配置計画",           due: "05/29", urgent: false, done: false, memo: "" },

  { id: "td25", projId: "d12", title: "松本邸 キッチン機器メーカー選定",       due: "05/25", urgent: false, done: false, memo: "" },
  { id: "td26", projId: "d12", title: "松本邸 タイル・床材サンプル発注",       due: "05/28", urgent: false, done: false, memo: "" },

  { id: "td27", projId: "d13", title: "井上歯科 X線防護計画 専門家確認",       due: "05/24", urgent: true,  done: false, memo: "" },
  { id: "td28", projId: "d13", title: "井上歯科 診療チェア配置 最終確認",      due: "05/30", urgent: false, done: false, memo: "" },

  { id: "td29", projId: "d14", title: "木村邸 スロープ・手すり詳細図作成",    due: "05/26", urgent: false, done: false, memo: "" },
  { id: "td30", projId: "d14", title: "木村邸 介護保険適用申請書類準備",       due: "06/01", urgent: false, done: false, memo: "" },

  { id: "td31", projId: "d15", title: "林マンション 基本計画 事業者提出",      due: "05/23", urgent: true,  done: false, memo: "" },
  { id: "td32", projId: "d15", title: "林マンション 駐車場台数 条例確認",      due: "05/27", urgent: false, done: false, memo: "" },

  { id: "td33", projId: "d16", title: "清水倉庫 既存図面 現地照合",            due: "05/22", urgent: false, done: true,  memo: "完了、差異リスト作成済み" },
  { id: "td34", projId: "d16", title: "清水倉庫 断熱改修 仕様検討",            due: "05/29", urgent: false, done: false, memo: "" },

  { id: "td35", projId: "d17", title: "中島ホテル ロビーパース作成",            due: "05/24", urgent: false, done: false, memo: "3Dソフトで作成、施主プレゼン用" },
  { id: "td36", projId: "d17", title: "中島ホテル FF&E リスト作成",             due: "06/04", urgent: false, done: false, memo: "" },

  { id: "td37", projId: "d18", title: "前田邸 屋上防水種別検討",                due: "05/26", urgent: false, done: false, memo: "" },
  { id: "td38", projId: "d18", title: "前田邸 テラス荷重計算 構造確認",         due: "05/30", urgent: false, done: false, memo: "" },

  { id: "td39", projId: "d19", title: "岡田工場 事務所 実施図面 全修正",        due: "05/21", urgent: true,  done: false, memo: "施主都合でスコープ拡大、工数要確認" },
  { id: "td40", projId: "d19", title: "岡田工場 見積依頼先 3社選定",            due: "05/23", urgent: true,  done: false, memo: "" },

  { id: "td41", projId: "d20", title: "藤田保育所 増築棟 基本設計書作成",       due: "05/28", urgent: false, done: false, memo: "" },
  { id: "td42", projId: "d20", title: "藤田保育所 既存棟との接続部 詳細検討",   due: "06/05", urgent: false, done: false, memo: "" },

  // ── 施工タスク ───────────────────────────────────────────────
  { id: "tc01", projId: "c01", title: "山田邸 解体工事 近隣挨拶実施",          due: "05/22", urgent: true,  done: false, memo: "着工前日までに完了必要" },
  { id: "tc02", projId: "c01", title: "山田邸 木工事 材料発注",                 due: "05/24", urgent: false, done: false, memo: "" },
  { id: "tc03", projId: "c01", title: "山田邸 中間検査 日程調整",               due: "05/30", urgent: false, done: false, memo: "" },

  { id: "tc04", projId: "c02", title: "鈴木クリニック 内装業者 進捗確認",       due: "05/22", urgent: true,  done: false, memo: "工期遅れ気味、要フォロー" },
  { id: "tc05", projId: "c02", title: "鈴木クリニック 電気工事 配線ルート確認", due: "05/26", urgent: false, done: false, memo: "" },
  { id: "tc06", projId: "c02", title: "鈴木クリニック 竣工検査スケジュール調整",due: "06/02", urgent: false, done: false, memo: "" },

  { id: "tc07", projId: "c03", title: "渡辺邸 基礎配筋 検査立会",              due: "05/23", urgent: true,  done: false, memo: "配筋検査は立会い必須" },
  { id: "tc08", projId: "c03", title: "渡辺邸 木材プレカット 発注",             due: "05/27", urgent: false, done: false, memo: "" },

  { id: "tc09", projId: "c04", title: "小林邸 外構 土工事 下代計算",            due: "05/21", urgent: true,  done: false, memo: "見積提出期限が迫っている" },
  { id: "tc10", projId: "c04", title: "小林邸 外構 ブロック塀 下請発注",        due: "05/24", urgent: true,  done: false, memo: "" },

  { id: "tc11", projId: "c05", title: "加藤ビル 外壁タイル サンプル施工確認",  due: "05/25", urgent: false, done: false, memo: "" },
  { id: "tc12", projId: "c05", title: "加藤ビル 足場解体 日程確認",             due: "06/01", urgent: false, done: false, memo: "" },

  { id: "tc13", projId: "c06", title: "吉田介護施設 杭工事 施工管理",           due: "05/22", urgent: false, done: true,  memo: "完了、写真記録済み" },
  { id: "tc14", projId: "c06", title: "吉田介護施設 躯体工事 工程会議",         due: "05/27", urgent: false, done: false, memo: "" },
  { id: "tc15", projId: "c06", title: "吉田介護施設 月次原価報告書作成",         due: "05/31", urgent: false, done: false, memo: "" },

  { id: "tc16", projId: "c07", title: "清水倉庫 床塗装 材料確認・発注",         due: "05/23", urgent: false, done: false, memo: "" },
  { id: "tc17", projId: "c07", title: "清水倉庫 竣工写真 カメラマン手配",       due: "05/29", urgent: false, done: false, memo: "" },

  { id: "tc18", projId: "c08", title: "中島ホテル 既存設備撤去 産廃マニフェスト",due: "05/24", urgent: true,  done: false, memo: "" },
  { id: "tc19", projId: "c08", title: "中島ホテル 什器搬入 搬入計画書作成",    due: "05/30", urgent: false, done: false, memo: "" },

  { id: "tc20", projId: "c09", title: "岡田工場 鉄骨工事 ミルシート確認",       due: "05/25", urgent: false, done: false, memo: "" },
  { id: "tc21", projId: "c09", title: "岡田工場 電気容量増設 電力会社申請",     due: "05/28", urgent: false, done: false, memo: "" },

  { id: "tc22", projId: "c10", title: "5月分 資材単価 一覧更新",                due: "05/23", urgent: false, done: false, memo: "" },
  { id: "tc23", projId: "c10", title: "主要取引業者 6月末納期 発注一覧作成",    due: "05/26", urgent: false, done: false, memo: "" },
  { id: "tc24", projId: "c10", title: "購入資材 未払残高 確認・照合",            due: "05/31", urgent: false, done: false, memo: "" },

  // ── 経営タスク ───────────────────────────────────────────────
  { id: "tm01", projId: "m01", title: "4月分 経費精算 締め処理",               due: "05/22", urgent: true,  done: false, memo: "全員提出済み、確認のこと" },
  { id: "tm02", projId: "m01", title: "5月分 請求書 発行・送付",                due: "05/31", urgent: false, done: false, memo: "" },
  { id: "tm03", projId: "m01", title: "資金繰り表 6月末まで更新",               due: "05/26", urgent: true,  done: false, memo: "" },

  { id: "tm04", projId: "m02", title: "税理士との3月決算 最終打合せ",           due: "05/29", urgent: false, done: false, memo: "" },
  { id: "tm05", projId: "m02", title: "株主総会議案書 準備",                    due: "06/05", urgent: false, done: false, memo: "" },

  { id: "tm06", projId: "m03", title: "Q2業績レビュー 資料作成",                due: "05/25", urgent: false, done: false, memo: "" },
  { id: "tm07", projId: "m03", title: "下期 受注目標 見直し",                   due: "06/01", urgent: false, done: false, memo: "" },

  { id: "tm08", projId: "m04", title: "CADライセンス 更新可否 検討",            due: "05/27", urgent: false, done: false, memo: "" },
  { id: "tm09", projId: "m04", title: "測量機器 リース vs 購入 比較",           due: "06/03", urgent: false, done: false, memo: "" },

  { id: "tm10", projId: "m05", title: "CRMシステム 3社 見積比較",               due: "05/23", urgent: true,  done: false, memo: "導入判断期限が6月末" },
  { id: "tm11", projId: "m05", title: "既存顧客データ 移行要件整理",            due: "05/30", urgent: false, done: false, memo: "" },

  { id: "tm12", projId: "m06", title: "HP掲載 施工実績 写真撮影手配",           due: "05/28", urgent: false, done: false, memo: "" },
  { id: "tm13", projId: "m06", title: "制作会社へのサイトマップ 提出",          due: "06/04", urgent: false, done: false, memo: "" },

  { id: "tm14", projId: "m07", title: "工事保険 更新書類 確認・署名",           due: "05/22", urgent: true,  done: false, memo: "更新期限5/31" },
  { id: "tm15", projId: "m07", title: "下請契約書 雛形 年次改訂",               due: "05/30", urgent: false, done: false, memo: "" },

  { id: "tm16", projId: "m08", title: "省エネ改修補助金 申請書作成",            due: "05/26", urgent: true,  done: false, memo: "公募締め切り5/30" },
  { id: "tm17", projId: "m08", title: "事業再構築補助金 要件確認",              due: "06/02", urgent: false, done: false, memo: "" },

  { id: "tm18", projId: "m09", title: "設備会社2社 協力体制 打合せ",           due: "05/27", urgent: false, done: false, memo: "" },
  { id: "tm19", projId: "m09", title: "建材メーカー 新規取引 見積交渉",         due: "06/01", urgent: false, done: false, memo: "" },

  { id: "tm20", projId: "m10", title: "図面クラウド共有 運用ルール策定",        due: "05/29", urgent: false, done: false, memo: "" },
  { id: "tm21", projId: "m10", title: "現場報告 デジタル化 試験運用開始",       due: "06/05", urgent: false, done: false, memo: "" },

  // ── スタッフ管理タスク ───────────────────────────────────────
  { id: "ts01", projId: "s01", title: "Aさん 上半期評価面談 実施",              due: "05/22", urgent: true,  done: false, memo: "本人への事前通知済み" },
  { id: "ts02", projId: "s01", title: "Bさん・Cさん 評価シート 記入",          due: "05/26", urgent: false, done: false, memo: "" },
  { id: "ts03", projId: "s01", title: "技術職 等級定義 見直し",                 due: "06/03", urgent: false, done: false, memo: "" },

  { id: "ts04", projId: "s02", title: "6月シフト 作成・全員確認",               due: "05/25", urgent: false, done: false, memo: "" },
  { id: "ts05", projId: "s02", title: "有給取得状況 5月末集計",                 due: "05/31", urgent: false, done: false, memo: "" },

  { id: "ts06", projId: "s03", title: "設計スタッフ 中途採用 求人票更新",       due: "05/24", urgent: false, done: false, memo: "" },
  { id: "ts07", projId: "s03", title: "書類選考 3名 結果連絡",                  due: "05/23", urgent: true,  done: false, memo: "選考通過者へ面接日程を連絡" },
  { id: "ts08", projId: "s03", title: "Dさん 2次面接 準備・調整",               due: "05/27", urgent: false, done: false, memo: "" },

  { id: "ts09", projId: "s04", title: "一級建築士試験 受験者2名 申込手続き",    due: "05/22", urgent: true,  done: false, memo: "申込期限5/23" },
  { id: "ts10", projId: "s04", title: "施工管理 外部研修 日程調整",              due: "05/30", urgent: false, done: false, memo: "" },

  { id: "ts11", projId: "s05", title: "健康診断 6月実施 医療機関予約",          due: "05/26", urgent: false, done: false, memo: "" },
  { id: "ts12", projId: "s05", title: "社会保険 算定基礎届 準備",               due: "06/05", urgent: false, done: false, memo: "" },
];

export function todayDue(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}`;
}
