"use client";

import type { Phase } from "@/hooks/useVoiceChat";

const LABELS: Record<Phase, string> = {
  idle: "🎤 START",
  recording: "👂 Listening...",
  thinking: "🤔 ...",
  speaking: "🔊 Pico is talking",
  error: "😵 Oops, try again",
  limit_reached: "⏰ See you tomorrow!",
};

const COLORS: Record<Phase, string> = {
  idle: "#4dabf7",
  recording: "#ff6b6b",
  thinking: "#ffd43b",
  speaking: "#69db7c",
  error: "#adb5bd",
  limit_reached: "#adb5bd",
};

const HINTS: Record<Phase, string> = {
  idle: "Tap to start, then just talk to Pico!",
  recording: "Say something! Pico is listening...",
  thinking: "Pico is thinking...",
  speaking: "Listen to Pico, then talk back.",
  error: "Something went wrong. Tap to try again.",
  limit_reached: "You've used up today's talking time.",
};

type Props = {
  phase: Phase;
  onStart: () => void;
  onStop: () => void;
};

export function TalkButton({ phase, onStart, onStop }: Props) {
  const conversationActive = phase === "recording" || phase === "thinking" || phase === "speaking";

  const handleClick = () => {
    if (phase === "idle" || phase === "error") {
      onStart();
    } else if (conversationActive) {
      onStop();
    }
  };

  const disabled = phase === "limit_reached";

  return (
    <div style={{ textAlign: "center" }}>
      <button
        onClick={handleClick}
        disabled={disabled}
        style={{
          fontSize: "2rem",
          padding: "2rem 3rem",
          borderRadius: "9999px",
          border: "none",
          background: COLORS[phase],
          color: "white",
          boxShadow: "0 6px 0 rgba(0,0,0,0.15)",
          cursor: disabled ? "default" : "pointer",
        }}
      >
        {LABELS[phase]}
      </button>
      <p style={{ marginTop: "1rem", color: "#868e96" }}>{HINTS[phase]}</p>
      {conversationActive && (
        <p style={{ marginTop: "0.5rem", color: "#adb5bd", fontSize: "0.9rem" }}>
          Tap the button anytime to stop.
        </p>
      )}
    </div>
  );
}
