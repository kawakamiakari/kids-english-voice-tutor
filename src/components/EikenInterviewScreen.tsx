"use client";

import { useEikenInterview } from "@/hooks/useEikenInterview";
import { EIKEN_ILLUSTRATIONS } from "@/components/eiken/illustrations";

const PHASE_LABEL: Record<string, string> = {
  speaking: "ピコが はなしています...",
  recording: "きいています。はなしてね!",
  thinking: "かんがえています...",
  error: "エラーが おきました。もういちど ためしてね。",
};

export function EikenInterviewScreen({ childId, onExit }: { childId: string; onExit: () => void }) {
  const { phase, currentDisplayText, currentIllustrationId, feedback, start, abort } =
    useEikenInterview(childId);

  const Illustration = currentIllustrationId ? EIKEN_ILLUSTRATIONS[currentIllustrationId] : null;

  const handleExit = () => {
    abort();
    onExit();
  };

  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        background: "#fff9db",
        padding: "1rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>英検3級 めんせつ れんしゅう</h1>
        <button onClick={handleExit}>もどる</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        {phase === "idle" && (
          <>
            <p style={{ textAlign: "center", maxWidth: "320px" }}>
              パッセージを よんだり、えを せつめいしたり、しつもんに こたえたりする れんしゅうだよ。
            </p>
            <button onClick={start} style={{ fontSize: "1.3rem", padding: "1rem 2rem", borderRadius: "1rem" }}>
              はじめる
            </button>
          </>
        )}

        {phase !== "idle" && phase !== "done" && (
          <>
            {Illustration && (
              <div style={{ width: "min(320px, 90vw)", aspectRatio: "3 / 2", borderRadius: "1rem", overflow: "hidden" }}>
                <Illustration />
              </div>
            )}
            {currentDisplayText && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "1rem",
                  padding: "1.25rem",
                  maxWidth: "480px",
                  fontSize: "1.2rem",
                  lineHeight: 1.6,
                }}
              >
                {currentDisplayText}
              </div>
            )}
            <p
              className={phase === "recording" ? "listening-pulse" : undefined}
              style={{ fontSize: "1.1rem", fontWeight: "bold" }}
            >
              {PHASE_LABEL[phase] ?? ""}
            </p>
          </>
        )}

        {phase === "done" && feedback && (
          <div style={{ background: "#fff", borderRadius: "1rem", padding: "1.5rem", maxWidth: "480px" }}>
            <strong style={{ fontSize: "1.2rem" }}>{feedback.headline}</strong>
            <ul style={{ marginTop: "0.75rem" }}>
              {feedback.points.map((p, i) => (
                <li key={i} style={{ marginBottom: "0.5rem" }}>
                  {p.kind === "praise" ? "👏 " : "💡 "}
                  {p.text}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button onClick={start}>もういちど</button>
              <button onClick={handleExit}>おわる</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
