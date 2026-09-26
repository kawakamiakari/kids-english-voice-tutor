"use client";

import { useEffect, useRef, useState } from "react";
import type { Message, Phase, Session, Summary } from "@/hooks/useVoiceChat";

function Bubble({ role, text }: Message) {
  const isPico = role === "pico";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isPico ? "flex-start" : "flex-end",
        gap: "0.5rem",
        alignItems: "flex-end",
      }}
    >
      {isPico && <span style={{ fontSize: "1.5rem" }}>🦜</span>}
      <div
        style={{
          maxWidth: "70%",
          padding: "0.75rem 1rem",
          borderRadius: "1.25rem",
          borderBottomLeftRadius: isPico ? "0.25rem" : "1.25rem",
          borderBottomRightRadius: isPico ? "1.25rem" : "0.25rem",
          background: isPico ? "#e9ecef" : "#4dabf7",
          color: isPico ? "#212529" : "white",
          fontSize: "1.1rem",
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
      {!isPico && <span style={{ fontSize: "1.5rem" }}>🧒</span>}
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", gap: "0.5rem", alignItems: "flex-end" }}>
      <span style={{ fontSize: "1.5rem" }}>🦜</span>
      <div
        style={{
          padding: "0.9rem 1.1rem",
          borderRadius: "1.25rem",
          borderBottomLeftRadius: "0.25rem",
          background: "#e9ecef",
          display: "flex",
          gap: "0.3rem",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot"
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: "#868e96",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ListeningBubble() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", alignItems: "flex-end" }}>
      <div
        style={{
          padding: "0.75rem 1.1rem",
          borderRadius: "1.25rem",
          borderBottomRightRadius: "0.25rem",
          background: "#4dabf7",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "1.1rem",
        }}
      >
        <span className="listening-pulse">🎤</span>
        <span>Listening...</span>
      </div>
      <span style={{ fontSize: "1.5rem" }}>🧒</span>
    </div>
  );
}

function SummaryLoading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", padding: "0.5rem" }}>
      <span style={{ fontSize: "1.5rem" }}>✨</span>
      <div
        style={{
          padding: "0.9rem 1.1rem",
          borderRadius: "1.25rem",
          background: "#e9ecef",
          display: "flex",
          gap: "0.3rem",
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot"
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: "#868e96",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const POINT_ICON: Record<Summary["points"][number]["kind"], string> = {
  praise: "👍",
  tip: "💡",
};

function ToggleLink({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        marginTop: "0.75rem",
        border: "none",
        background: "none",
        color: "#868e96",
        fontSize: "0.85rem",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {expanded ? "▼ Hide chat" : "▶ Show chat"}
    </button>
  );
}

function SummaryCard({
  summary,
  expanded,
  onToggle,
}: {
  summary: Summary;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        margin: "0.5rem 0.5rem 0",
        padding: "1.25rem",
        borderRadius: "1.5rem",
        background: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.75rem" }}>🎉</div>
      <p style={{ fontSize: "1.15rem", fontWeight: 600, margin: "0.4rem 0 0.75rem" }}>
        {summary.headline}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, textAlign: "left" }}>
        {summary.points.map((p, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              gap: "0.6rem",
              alignItems: "flex-start",
              padding: "0.4rem 0",
              fontSize: "1rem",
            }}
          >
            <span>{POINT_ICON[p.kind]}</span>
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
      <ToggleLink expanded={expanded} onToggle={onToggle} />
    </div>
  );
}

function EndedPlaceholder({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        margin: "0.5rem 0.5rem 0",
        padding: "1rem 1.25rem",
        borderRadius: "1.25rem",
        background: "#f1f3f5",
        color: "#868e96",
        textAlign: "center",
      }}
    >
      <span>A conversation with Pico</span>
      <ToggleLink expanded={expanded} onToggle={onToggle} />
    </div>
  );
}

function SessionBlock({
  session,
  expanded,
  onToggle,
}: {
  session: Session;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {expanded && session.messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} />)}
      {session.summary ? (
        <SummaryCard summary={session.summary} expanded={expanded} onToggle={onToggle} />
      ) : session.pending ? (
        <SummaryLoading />
      ) : (
        <EndedPlaceholder expanded={expanded} onToggle={onToggle} />
      )}
    </div>
  );
}

export function ChatHistory({ sessions, phase }: { sessions: Session[]; phase: Phase }) {
  const endRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, phase]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (sessions.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#adb5bd",
          fontSize: "1.2rem",
          textAlign: "center",
          padding: "0 2rem",
        }}
      >
        Tap the mic below to start talking with Pico! 🦜
      </div>
    );
  }

  const liveIndex =
    phase === "recording" || phase === "thinking" || phase === "speaking" ? sessions.length - 1 : -1;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {sessions.map((s, i) =>
        i === liveIndex ? (
          <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {s.messages.map((m, j) => (
              <Bubble key={j} role={m.role} text={m.text} />
            ))}
            {phase === "recording" && <ListeningBubble />}
            {phase === "thinking" && <TypingBubble />}
          </div>
        ) : (
          <SessionBlock
            key={s.id}
            session={s}
            expanded={expandedIds.has(s.id)}
            onToggle={() => toggleExpand(s.id)}
          />
        )
      )}
      <div ref={endRef} />
    </div>
  );
}
