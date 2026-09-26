"use client";

import { useEffect, useRef } from "react";
import type { Message, Phase } from "@/hooks/useVoiceChat";

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

export function ChatHistory({ messages, phase }: { messages: Message[]; phase: Phase }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  if (messages.length === 0 && phase === "idle") {
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

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      {messages.map((m, i) => (
        <Bubble key={i} role={m.role} text={m.text} />
      ))}
      {phase === "recording" && <ListeningBubble />}
      {phase === "thinking" && <TypingBubble />}
      <div ref={endRef} />
    </div>
  );
}
