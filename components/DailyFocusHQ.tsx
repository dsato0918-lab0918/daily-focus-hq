"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { initialDomains, DOMAIN_COLOR_PRESETS, DOMAIN_ICONS, tomorrowDue } from "@/lib/data";
import type { Domain, DomainKey, Project, Task } from "@/lib/types";
import DomainPane from "./DomainPane";
import ProjectPane from "./ProjectPane";
import TaskPane from "./TaskPane";
import DetailPane from "./DetailPane";
import FloatingAIChat from "./FloatingAIChat";

type MobilePane = "nav" | "tasks" | "detail";

const MOBILE_NAV_ITEMS = [
  { key: "nav"    as MobilePane, icon: "ti-layout-grid", label: "ナビ"   },
  { key: "tasks"  as MobilePane, icon: "ti-checkbox",    label: "タスク" },
  { key: "detail" as MobilePane, icon: "ti-file-text",   label: "詳細"   },
];

const isMobileWidth = () =>
  typeof window !== "undefined" && window.innerWidth < 768;

// ── API ヘルパー ─────────────────────────────────────────────
async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin", // クッキーを確実に送信
  });
  // 401: 未認証（スマホ等で別ブラウザからログインしていない場合）
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function DailyFocusHQ() {
  const [domains,  setDomains]  = useState<Domain[]>(() => {
    try {
      const saved = localStorage.getItem("sugar-task-domains");
      if (saved) return JSON.parse(saved) as Domain[];
    } catch { /* ignore */ }
    return initialDomains;
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [curDomain,      setCurDomain]      = useState<DomainKey>("all");
  const [curProjId,      setCurProjId]      = useState<string | null>(null);
  const [selTaskId,      setSelTaskId]      = useState<string | null>(null);
  const [activeMobilePane, setActiveMobilePane] = useState<MobilePane>("tasks");

  // クイックタスク追加（モバイル専用）
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaTitle,  setQaTitle]  = useState("");
  const [qaProjId, setQaProjId] = useState<string>("");
  const [qaDue,    setQaDue]    = useState("");
  const qaInputRef = useRef<HTMLInputElement>(null);

  // メモ保存デバウンス用
  const memoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── PTR (Pull-to-Refresh) 用 state & ref ──────────────────────
  const [ptrState, setPtrState]   = useState<"idle" | "pulling" | "refreshing">("idle");
  const [ptrY,     setPtrY]       = useState(0);   // 引っ張り量 (px)
  const ptrStartY  = useRef(0);
  const ptrActive  = useRef(false);
  const PTR_THRESHOLD = 64;   // これ以上引いたら更新発動
  const PTR_MAX       = 80;   // インジケーターの最大移動量

  const projMap   = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const selTask   = useMemo(() => tasks.find((t) => t.id === selTaskId) ?? null, [tasks, selTaskId]);
  const selProject = useMemo(() => (selTask ? projMap.get(selTask.projId) ?? null : null), [selTask, projMap]);

  // ── データ読み込み（PTR・Visibility API・初期ロード共用）────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const { projects: p, tasks: t, domains: d } = await api("/api/notion/data");
      // localStorageに保存されたプロジェクト順序を適用
      let sorted = p ?? [];
      try {
        const saved = localStorage.getItem("sugar-task-project-order");
        if (saved) {
          const order: string[] = JSON.parse(saved);
          const orderMap = new Map(order.map((id, i) => [id, i]));
          sorted = sorted.sort((a: Project, b: Project) =>
            (orderMap.get(a.id) ?? 99999) - (orderMap.get(b.id) ?? 99999)
          );
        }
      } catch { /* ignore */ }
      setProjects(sorted);
      setTasks(t ?? []);
      if (Array.isArray(d) && d.length > 0) setDomains(d);
    } catch (e: unknown) {
      // Unauthorized の場合は api() 内で /login へリダイレクト済み
      if (String(e) !== "Error: Unauthorized" && !silent) {
        setError("Notionからデータを読み込めませんでした");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 初期データ読み込み ────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Page Visibility API: バックグラウンド復帰時に再取得 ────────
  useEffect(() => {
    let lastHidden = 0;
    const STALE_MS = 60_000; // 1分以上バックグラウンドなら再取得
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        lastHidden = Date.now();
      } else if (document.visibilityState === "visible") {
        if (Date.now() - lastHidden >= STALE_MS) {
          loadData(true); // silent: ローディング表示なしで静かに更新
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadData]);

  // ── PTR ハンドラー（モバイル専用） ───────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 0) return;
    ptrStartY.current = e.touches[0].clientY;
    ptrActive.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!ptrActive.current) return;
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 0) { ptrActive.current = false; setPtrY(0); setPtrState("idle"); return; }
    const delta = e.touches[0].clientY - ptrStartY.current;
    if (delta <= 0) { ptrActive.current = false; setPtrY(0); setPtrState("idle"); return; }
    // 抵抗感を出すためにsqrtで減衰
    const clamped = Math.min(Math.sqrt(delta) * 5, PTR_MAX);
    setPtrY(clamped);
    setPtrState(delta >= PTR_THRESHOLD ? "pulling" : "pulling");
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!ptrActive.current) return;
    ptrActive.current = false;
    if (ptrY >= PTR_THRESHOLD) {
      setPtrState("refreshing");
      setPtrY(40); // リフレッシュ中は固定位置
      await loadData(true);
      setPtrState("idle");
      setPtrY(0);
    } else {
      setPtrState("idle");
      setPtrY(0);
    }
  }, [ptrY, loadData]);

  // ── 選択系 ────────────────────────────────────────────────────
  const handleSelectDomain = useCallback((domain: DomainKey) => {
    setCurDomain(domain); setCurProjId(null); setSelTaskId(null);
  }, []);

  const handleSelectProj = useCallback((projId: string | null) => {
    setCurProjId(projId); setSelTaskId(null);
    if (projId && isMobileWidth()) setActiveMobilePane("tasks");
  }, []);

  const handleSelectTask = useCallback((id: string) => {
    setSelTaskId(id);
    if (isMobileWidth()) setActiveMobilePane("detail");
  }, []);

  // ── タスク操作 ────────────────────────────────────────────────
  const handleToggleDone = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const done = !task.done;
      api(`/api/notion/tasks/${id}`, "PATCH", { done }).catch(console.error);
      return prev.map((t) => (t.id === id ? { ...t, done } : t));
    });
  }, []);

  const handleMemoChange = useCallback((id: string, memo: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, memo } : t)));
    // デバウンス: 1秒後にNotion保存
    if (memoTimer.current) clearTimeout(memoTimer.current);
    memoTimer.current = setTimeout(() => {
      api(`/api/notion/tasks/${id}`, "PATCH", { memo }).catch(console.error);
    }, 1000);
  }, []);

  const handleAddTask = useCallback(async (title: string, projId: string, due: string, urgent: boolean) => {
    // 仮IDでUI即反映
    const tempId = `temp_${Date.now()}`;
    const tempTask: Task = { id: tempId, projId, title, due, urgent, done: false, memo: "" };
    setTasks((prev) => [...prev, tempTask]);
    setSelTaskId(tempId);
    if (isMobileWidth()) setActiveMobilePane("detail");

    try {
      const created: Task = await api("/api/notion/tasks", "POST", { projId, title, due, urgent, done: false, memo: "" });
      // 仮IDを実際のIDに置換
      setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      setSelTaskId(created.id);
    } catch {
      // 失敗時は仮タスクを削除
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setSelTaskId(null);
    }
  }, []);

  const handleUpdateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    api(`/api/notion/tasks/${id}`, "PATCH", updates).catch(console.error);
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelTaskId((cur) => (cur === id ? null : cur));
    if (isMobileWidth()) setActiveMobilePane("tasks");
    api(`/api/notion/tasks/${id}`, "DELETE").catch(console.error);
  }, []);

  // ── クイック追加（モバイル専用） ──────────────────────────────
  useEffect(() => {
    if (showQuickAdd) {
      const defaultProj = curProjId ?? projects.find((p) => !p.archived)?.id ?? "";
      setQaProjId(defaultProj);
      setQaDue(tomorrowDue());
      setQaTitle("");
      setTimeout(() => qaInputRef.current?.focus(), 100);
    }
  }, [showQuickAdd]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickAddConfirm = useCallback(() => {
    if (!qaTitle.trim() || !qaProjId) return;
    handleAddTask(qaTitle.trim(), qaProjId, qaDue, false);
    setShowQuickAdd(false);
  }, [qaTitle, qaProjId, qaDue, handleAddTask]);

  // ── プロジェクト操作 ──────────────────────────────────────────
  const handleAddProject = useCallback(async (name: string, domain: DomainKey) => {
    const tempId = `temp_proj_${Date.now()}`;
    const tempProj: Project = { id: tempId, domain, name, status: "g" };
    setProjects((prev) => [...prev, tempProj]);
    try {
      const created: Project = await api("/api/notion/projects", "POST", { name, domain, status: "g", archived: false });
      setProjects((prev) => prev.map((p) => (p.id === tempId ? created : p)));
      // 仮IDのまま選択されていた場合、実IDに切り替える
      setCurProjId((prev) => prev === tempId ? created.id : prev);
    } catch {
      setProjects((prev) => prev.filter((p) => p.id !== tempId));
      setCurProjId((prev) => prev === tempId ? null : prev);
    }
  }, []);

  const handleUpdateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    api(`/api/notion/projects/${id}`, "PATCH", updates).catch(console.error);
  }, []);

  const handleDeleteProject = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.projId !== id));
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setCurProjId((cur) => (cur === id ? null : cur));
    setSelTaskId(null);
    api(`/api/notion/projects/${id}`, "DELETE").catch(console.error);
  }, []);

  const handleArchiveProject = useCallback((id: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archived: true } : p)));
    setCurProjId((cur) => (cur === id ? null : cur));
    setSelTaskId(null);
    api(`/api/notion/projects/${id}`, "PATCH", { archived: true }).catch(console.error);
  }, []);

  const handleRestoreProject = useCallback((id: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archived: false } : p)));
    api(`/api/notion/projects/${id}`, "PATCH", { archived: false }).catch(console.error);
  }, []);

  const handleReorderProjects = useCallback((fromId: string, toId: string) => {
    setProjects((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((p) => p.id === fromId);
      if (fromIdx === -1) return prev;
      const [item] = arr.splice(fromIdx, 1);
      if (toId === "__END__") {
        arr.push(item);
      } else {
        const toIdx = arr.findIndex((p) => p.id === toId);
        arr.splice(toIdx === -1 ? arr.length : toIdx, 0, item);
      }
      try { localStorage.setItem("sugar-task-project-order", JSON.stringify(arr.map((p) => p.id))); } catch { /* ignore */ }
      return arr;
    });
  }, []);

  const handleMoveDomain = useCallback((id: string, domain: string) => {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, domain } : p));
    api(`/api/notion/projects/${id}`, "PATCH", { domain }).catch(console.error);
  }, []);

  // ── セクション操作（Notion連携） ────────────────────────────
  const handleAddDomain = useCallback((name: string) => {
    const tempId = `domain_temp_${Date.now()}`;
    const preset = DOMAIN_COLOR_PRESETS[domains.length % DOMAIN_COLOR_PRESETS.length];
    const icon   = DOMAIN_ICONS[(domains.length + 3) % DOMAIN_ICONS.length];
    const newDomain = { id: tempId, label: name, icon, bgColor: preset.bgColor, textColor: preset.textColor };
    setDomains((prev) => [...prev, newDomain]);
    api("/api/notion/domains", "POST", { label: name, icon, bgColor: preset.bgColor, textColor: preset.textColor, order: domains.length })
      .then((created: Domain) => {
        setDomains((prev) => prev.map((d) => d.id === tempId ? created : d));
      })
      .catch(console.error);
  }, [domains]);

  const handleUpdateDomain = useCallback((id: string, label: string) => {
    setDomains((prev) => prev.map((d) => (d.id === id ? { ...d, label } : d)));
    // notionId（UUID）が存在する場合はそれを API URL に使用する
    const apiId = domains.find((d) => d.id === id)?.notionId ?? id;
    api(`/api/notion/domains/${apiId}`, "PATCH", { label }).catch(console.error);
  }, [domains]);

  const handleDeleteDomain = useCallback((id: string) => {
    // notionId（UUID）が存在する場合はそれを API URL に使用する
    const apiId = domains.find((d) => d.id === id)?.notionId ?? id;
    const projIds = projects.filter((p) => p.domain === id).map((p) => p.id);
    setTasks((prev) => prev.filter((t) => !projIds.includes(t.projId)));
    setProjects((prev) => prev.filter((p) => p.domain !== id));
    setDomains((prev) => prev.filter((d) => d.id !== id));
    setCurDomain((cur) => (cur === id ? "all" : cur));
    setCurProjId(null);
    setSelTaskId(null);
    api(`/api/notion/domains/${apiId}`, "DELETE").catch(console.error);
  }, [projects, domains]);

  // ── 共通 props ───────────────────────────────────────────────
  const domainProps = {
    domains, projects, curDomain,
    onSelect: handleSelectDomain,
    onAddDomain: handleAddDomain,
    onUpdateDomain: handleUpdateDomain,
    onDeleteDomain: handleDeleteDomain,
  };
  const projectProps = {
    domains, projects, tasks, curDomain, curProjId,
    onSelect: handleSelectProj,
    onAddProject: handleAddProject,
    onUpdateProject: handleUpdateProject,
    onDeleteProject: handleDeleteProject,
    onArchiveProject: handleArchiveProject,
    onRestoreProject: handleRestoreProject,
    onReorderProjects: handleReorderProjects,
    onMoveDomain: handleMoveDomain,
  };
  const taskProps = {
    tasks, projects, domains, curDomain, curProjId, selTaskId,
    onSelectTask: handleSelectTask,
    onToggleDone: handleToggleDone,
    onAddTask: handleAddTask,
    onUpdateTask: handleUpdateTask,
    onDeleteTask: handleDeleteTask,
  };
  const detailProps = {
    task: selTask, project: selProject,
    onMemoChange: handleMemoChange,
    onUpdateTask: handleUpdateTask,
    onDeleteTask: handleDeleteTask,
  };

  // ── ローディング / エラー画面 ─────────────────────────────────
  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingBox}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, animation: "spin 1s linear infinite" }} />
          <div style={{ marginTop: 12, color: "var(--color-text-secondary)", fontSize: 13 }}>
            Notionからデータを読み込み中...
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorBox}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 28, color: "var(--color-dot-red)" }} />
          <div style={{ marginTop: 10, fontWeight: 600 }}>{error}</div>
          <button
            style={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* デスクトップレイアウト */}
      <div className="desktop-layout" style={styles.desktopContainer}>
        <DomainPane  {...domainProps}  />
        <ProjectPane {...projectProps} />
        <TaskPane    {...taskProps}    />
        <DetailPane  {...detailProps}  />
      </div>

      {/* モバイルレイアウト */}
      <div className="mobile-layout">
        {/* PTR インジケーター */}
        <div
          className="ptr-indicator"
          style={{
            transform: `translateY(${ptrY - 48}px)`,
            opacity: ptrY > 8 ? Math.min(ptrY / PTR_THRESHOLD, 1) : 0,
          }}
        >
          <i
            className={`ti ${ptrState === "refreshing" ? "ti-refresh ptr-spin" : "ti-arrow-down"}`}
            style={{
              fontSize: 18,
              transform: ptrState !== "refreshing"
                ? `rotate(${Math.min(ptrY / PTR_THRESHOLD, 1) * 180}deg)`
                : undefined,
              transition: ptrState !== "refreshing" ? "none" : undefined,
            }}
            aria-hidden="true"
          />
        </div>
        <div
          className="mobile-content"
          style={{ transform: ptrState !== "idle" ? `translateY(${ptrY}px)` : undefined, transition: ptrState === "idle" ? "transform 0.2s ease" : "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {activeMobilePane === "nav" && (
            <div className="mobile-nav-pane">
              <div className="mobile-nav-domain">
                <DomainPane {...domainProps} />
              </div>
              <div className="mobile-nav-project">
                <ProjectPane {...projectProps} />
              </div>
            </div>
          )}
          {activeMobilePane === "tasks"  && <TaskPane   {...taskProps}   />}
          {activeMobilePane === "detail" && <DetailPane {...detailProps} />}
        </div>

        <nav className="mobile-bottom-nav">
          {MOBILE_NAV_ITEMS.map(({ key, icon, label }) => (
            <button
              key={key}
              className={`mobile-nav-btn${activeMobilePane === key ? " active" : ""}`}
              onClick={() => setActiveMobilePane(key)}
            >
              <i className={`ti ${icon}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <FloatingAIChat tasks={tasks} projects={projects} domains={domains} />

      {/* モバイル専用: クイックタスク追加FAB＋ボトムシート */}
      <button
        className="mobile-fab-quickadd"
        onClick={() => setShowQuickAdd(true)}
        aria-label="タスクを追加"
      >
        <i className="ti ti-plus" style={{ fontSize: 22 }} aria-hidden="true" />
      </button>

      {showQuickAdd && (
        <>
          <div className="mobile-qa-backdrop" onClick={() => setShowQuickAdd(false)} />
          <div className="mobile-qa-panel">
            <div className="mobile-qa-handle" />
            <div className="mobile-qa-title">タスクを追加</div>
            <input
              ref={qaInputRef}
              className="mobile-qa-input"
              placeholder="タスク名を入力..."
              value={qaTitle}
              onChange={(e) => setQaTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleQuickAddConfirm();
                if (e.key === "Escape") setShowQuickAdd(false);
              }}
            />
            <select
              className="mobile-qa-input"
              value={qaProjId}
              onChange={(e) => setQaProjId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              className="mobile-qa-input"
              type="date"
              value={qaDue}
              onChange={(e) => setQaDue(e.target.value)}
            />
            <div className="mobile-qa-actions">
              <button className="mobile-qa-cancel" onClick={() => setShowQuickAdd(false)}>
                キャンセル
              </button>
              <button
                className="mobile-qa-confirm"
                onClick={handleQuickAddConfirm}
                disabled={!qaTitle.trim() || !qaProjId}
              >
                追加
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  desktopContainer: {
    gridTemplateColumns: "2fr 2fr 6fr 2fr",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "var(--color-bg)",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "var(--color-bg)",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  errorBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "32px 24px",
    background: "var(--color-bg-secondary)",
    borderRadius: 12,
    border: "0.5px solid var(--color-border-mid)",
  },
  retryBtn: {
    marginTop: 8,
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    background: "var(--color-text-primary)",
    color: "var(--color-bg)",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
  },
};
