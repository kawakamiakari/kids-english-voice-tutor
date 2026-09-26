"use client";

import { TalkButton } from "@/components/TalkButton";
import { ChatHistory } from "@/components/ChatHistory";
import { useVoiceChat } from "@/hooks/useVoiceChat";

export default function Home() {
  const { phase, messages, startConversation, endConversation } = useVoiceChat();

  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        background: "#fff9db",
      }}
    >
      <h1 style={{ fontSize: "2rem", margin: 0, padding: "1rem", textAlign: "center" }}>
        English Time! 🦜
      </h1>
      <ChatHistory messages={messages} phase={phase} />
      <div style={{ padding: "1.5rem", background: "#fff9db" }}>
        <TalkButton phase={phase} onStart={startConversation} onStop={endConversation} />
      </div>
    </main>
  );
}
