"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("パスワードが違います");
        setPassword("");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <div style={s.card}>
        {/* ロゴエリア */}
        <div style={s.logoArea}>
          <div style={s.logoIcon}>
            <i className="ti ti-building-skyscraper" style={{ fontSize: 28 }} />
          </div>
          <div style={s.appName}>SUGAR Task</div>
          <div style={s.appSub}>SUGAR DESIGN OFFICE</div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            style={s.input}
            autoFocus
            autoComplete="current-password"
          />
          {error && <div style={s.errorMsg}>{error}</div>}
          <button
            type="submit"
            style={{ ...s.btn, opacity: !password.trim() || loading ? 0.5 : 1 }}
            disabled={!password.trim() || loading}
          >
            {loading ? "確認中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color-bg-secondary)",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    background: "var(--color-bg)",
    borderRadius: 16,
    border: "0.5px solid var(--color-border-mid)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
    padding: "36px 32px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  logoArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "var(--color-design-bg)",
    color: "var(--color-design-text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--color-text-primary)",
    letterSpacing: "-0.3px",
  },
  appSub: {
    fontSize: 11,
    color: "var(--color-text-tertiary)",
    letterSpacing: "0.5px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-secondary)",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 8,
    border: "0.5px solid var(--color-border-mid)",
    background: "var(--color-bg-secondary)",
    color: "var(--color-text-primary)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  },
  errorMsg: {
    fontSize: 12,
    color: "var(--color-dot-red)",
    padding: "6px 10px",
    background: "#FEF2F2",
    borderRadius: 6,
  },
  btn: {
    width: "100%",
    padding: "12px 0",
    borderRadius: 8,
    border: "none",
    background: "var(--color-text-primary)",
    color: "var(--color-bg)",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    marginTop: 4,
    transition: "opacity 0.15s",
  },
};
