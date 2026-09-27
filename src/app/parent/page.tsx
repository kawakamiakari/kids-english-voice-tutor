"use client";

import { useCallback, useEffect, useState } from "react";

type Level = 1 | 2 | 3;
type SummaryPoint = { kind: "praise" | "tip"; text: string };
type Summary = { conversationId: string; headline: string; points: SummaryPoint[]; createdAt: number };
type FlagEvent = { childText: string; reason: string; createdAt: number };
type ChildBreakdown = {
  id: string;
  name: string;
  level: Level;
  usedSeconds: number;
  summaries: Summary[];
  flagEvents: FlagEvent[];
};
type Dashboard = { limitMinutes: number; children: ChildBreakdown[] };

const LEVEL_LABEL: Record<Level, string> = {
  1: "レベル1(4〜6歳ごろ)",
  2: "レベル2(7〜9歳ごろ)",
  3: "レベル3(10〜12歳ごろ)",
};

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default function ParentPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState<Level>(1);
  const [addError, setAddError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/parent/dashboard");
      setDashboard(res.ok ? await res.json() : null);
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

  const handleReset = useCallback(
    async (childId: string) => {
      setResettingId(childId);
      try {
        await fetch("/api/parent/reset-usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId }),
        });
        await loadDashboard();
      } finally {
        setResettingId(null);
      }
    },
    [loadDashboard]
  );

  const handleAddChild = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddError(null);
      const name = newName.trim();
      if (!name) {
        setAddError("名前を入力してください");
        return;
      }
      const res = await fetch("/api/parent/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, level: newLevel }),
      });
      if (!res.ok) {
        setAddError("追加に失敗しました");
        return;
      }
      setNewName("");
      setNewLevel(1);
      await loadDashboard();
    },
    [newName, newLevel, loadDashboard]
  );

  const handleDeleteChild = useCallback(
    async (childId: string) => {
      if (!window.confirm("このお子さんのプロフィールと記録を削除します。よろしいですか?")) return;
      await fetch(`/api/parent/children/${childId}`, { method: "DELETE" });
      await loadDashboard();
    },
    [loadDashboard]
  );

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

      {dashboard.children.length === 0 && (
        <p style={{ marginTop: "1.5rem" }}>まだお子さんが登録されていません。下のフォームから追加してください。</p>
      )}

      {dashboard.children.map((child) => (
        <section
          key={child.id}
          style={{ background: "#fff", borderRadius: "1rem", padding: "1.25rem", marginTop: "1.5rem" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>
              {child.name}({LEVEL_LABEL[child.level]})
            </h2>
            <button onClick={() => handleDeleteChild(child.id)} style={{ color: "#c0392b" }}>
              削除
            </button>
          </div>

          <h3 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>今日の利用時間</h3>
          <p style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>
            {Math.round(child.usedSeconds / 60)} / {dashboard.limitMinutes} 分
          </p>
          <button onClick={() => handleReset(child.id)} disabled={resettingId === child.id}>
            {resettingId === child.id ? "リセット中..." : "今日の利用時間をリセット"}
          </button>

          <h3 style={{ fontSize: "1rem", marginTop: "1rem" }}>今日の会話サマリー</h3>
          {child.summaries.length === 0 && <p>まだありません</p>}
          {child.summaries.map((s) => (
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

          <h3 style={{ fontSize: "1rem", marginTop: "1rem" }}>範囲外の発言ログ</h3>
          {child.flagEvents.length === 0 && <p>まだありません</p>}
          {child.flagEvents.map((f, i) => (
            <div key={i} style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>{formatTime(f.createdAt)}</div>
              <div>「{f.childText}」</div>
              <div style={{ fontSize: "0.9rem", color: "#c0392b" }}>{f.reason}</div>
            </div>
          ))}
        </section>
      ))}

      <section style={{ background: "#fff", borderRadius: "1rem", padding: "1.25rem", marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>お子さんを追加</h2>
        <form onSubmit={handleAddChild} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "320px" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="名前"
            style={{ padding: "0.5rem" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {([1, 2, 3] as Level[]).map((lv) => (
              <label key={lv}>
                <input
                  type="radio"
                  name="level"
                  checked={newLevel === lv}
                  onChange={() => setNewLevel(lv)}
                />{" "}
                {LEVEL_LABEL[lv]}
              </label>
            ))}
          </div>
          {addError && <p style={{ color: "#c0392b", margin: 0 }}>{addError}</p>}
          <button type="submit">追加する</button>
        </form>
      </section>
    </main>
  );
}
