"use client";

import { useVoiceChat } from "@/hooks/useVoiceChat";

const LABELS: Record<string, string> = {
  idle: "🎤 START",
  recording: "🎤 Listening...",
  thinking: "🤔 ...",
  speaking: "🔊 Pico is talking",
  error: "😵 Oops, try again",
  limit_reached: "⏰ See you tomorrow!",
};

const COLORS: Record<string, string> = {
  idle: "#4dabf7",
  recording: "#ff6b6b",
  thinking: "#ffd43b",
  speaking: "#69db7c",
  error: "#adb5bd",
  limit_reached: "#adb5bd",
};

export function TalkButton() {
  const { phase, aiText, startRecording, stopRecordingAndSend } = useVoiceChat();

  const handlePress = () => {
    if (phase === "idle" || phase === "error") startRecording();
  };
  const handleRelease = () => {
    if (phase === "recording") stopRecordingAndSend();
  };

  const disabled = phase === "thinking" || phase === "speaking" || phase === "limit_reached";

  return (
    <div style={{ textAlign: "center" }}>
      <button
        onMouseDown={handlePress}
        onMouseUp={handleRelease}
        onTouchStart={handlePress}
        onTouchEnd={handleRelease}
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
      {aiText && <p style={{ fontSize: "1.5rem", marginTop: "2rem" }}>{aiText}</p>}
      <p style={{ marginTop: "1rem", color: "#868e96" }}>
        Hold the button down and speak, then let go.
      </p>
    </div>
  );
}
