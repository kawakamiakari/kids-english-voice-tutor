"use client";

import { useCallback, useEffect, useState } from "react";

type SummaryPoint = { kind: "praise" | "tip"; text: string };
type Summary = { conversationId: string; headline: string; points: SummaryPoint[]; createdAt: number };
type FlagEvent = { childText: string; reason: string; createdAt: number };
type Dashboard = { usedSeconds: number; limitMinutes: number; summaries: Summary[]; flagEvents: FlagEvent[] };

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default function ParentPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/parent/dashboard");
      if (res.ok) {
        setDashboard(await res.json());
      } else {
        setDashboard(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError(null);
      const res = await fetch("/api/parent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      setPin("");
      if (res.ok) {
        await loadDashboard();
        return;
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const minutes = Math.ceil((data?.retryAfterMs ?? 0) / 60000);
        setLoginError(`失敗が多いため ${minutes}分後 にもう一度お試しください`);
      } else {
        setLoginError("PINが違います");
      }
    },
    [pin, loadDashboard]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/parent/logout", { method: "POST" });
    setDashboard(null);
  }, []);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      await fetch("/api/parent/reset-usage", { method: "POST" });
      await loadDashboard();
    } finally {
      setResetting(false);
    }
  }, [loadDashboard]);

  if (loading) {
    return <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>読み込み中...</main>;
  }

  if (!dashboard) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff9db",
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            width: "min(320px, 90vw)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>保護者用ページ</h1>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PINを入力"
            style={{ fontSize: "1.5rem", padding: "0.5rem", textAlign: "center", letterSpacing: "0.3em" }}
          />
          {loginError && <p style={{ color: "#c0392b", margin: 0, fontSize: "0.9rem" }}>{loginError}</p>}
          <button type="submit" style={{ fontSize: "1rem", padding: "0.6rem" }}>
            はいる
          </button>
        </form>
      </main>
    );
  }

  const usedMinutes = Math.round(dashboard.usedSeconds / 60);

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#fff9db",
        minHeight: "100dvh",
        padding: "1.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>保護者ダッシュボード</h1>
        <button onClick={handleLogout}>ログアウト</button>
      </div>

      <section style={{ background: "#fff", borderRadius: "1rem", padding: "1.25rem", marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>今日の利用時間</h2>
        <p style={{ fontSize: "1.25rem" }}>
          {usedMinutes} / {dashboard.limitMinutes} 分
        </p>
        <button onClick={handleReset} disabled={resetting}>
          {resetting ? "リセット中..." : "今日の利用時間をリセット"}
        </button>
      </section>

      <section style={{ background: "#fff", borderRadius: "1rem", padding: "1.25rem", marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>今日の会話サマリー</h2>
        {dashboard.summaries.length === 0 && <p>まだありません</p>}
        {dashboard.summaries.map((s) => (
          <div key={s.conversationId} style={{ marginBottom: "1rem" }}>
            <strong>
              {formatTime(s.createdAt)} - {s.headline}
            </strong>
            <ul style={{ margin: "0.25rem 0 0" }}>
              {s.points.map((p, i) => (
                <li key={i}>
                  {p.kind === "praise" ? "👏 " : "💡 "}
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section style={{ background: "#fff", borderRadius: "1rem", padding: "1.25rem", marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>範囲外の発言ログ</h2>
        {dashboard.flagEvents.length === 0 && <p>まだありません</p>}
        {dashboard.flagEvents.map((f, i) => (
          <div key={i} style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#666" }}>{formatTime(f.createdAt)}</div>
            <div>「{f.childText}」</div>
            <div style={{ fontSize: "0.9rem", color: "#c0392b" }}>{f.reason}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
