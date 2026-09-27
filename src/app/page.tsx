"use client";

import { useEffect, useState } from "react";
import { TalkButton } from "@/components/TalkButton";
import { ChatHistory } from "@/components/ChatHistory";
import { useVoiceChat } from "@/hooks/useVoiceChat";

type ChildOption = { id: string; name: string };

const STORAGE_KEY = "englishTime.selectedChildId";

function VoiceChatScreen({
  childId,
  childName,
  onSwitch,
}: {
  childId: string;
  childName: string;
  onSwitch: () => void;
}) {
  const { phase, sessions, startConversation, endConversation } = useVoiceChat(childId);

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
      <h1 style={{ fontSize: "2rem", margin: 0, padding: "1rem 1rem 0", textAlign: "center" }}>
        English Time! 🦜
      </h1>
      <p style={{ textAlign: "center", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
        {childName}{" "}
        <button onClick={onSwitch} style={{ marginLeft: "0.5rem" }}>
          きりかえる
        </button>
      </p>
      <ChatHistory sessions={sessions} phase={phase} />
      <div style={{ padding: "1.5rem", background: "#fff9db" }}>
        <TalkButton phase={phase} onStart={startConversation} onStop={endConversation} />
      </div>
    </main>
  );
}

export default function Home() {
  const [children, setChildren] = useState<ChildOption[] | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/children")
      .then((res) => res.json())
      .then((data) => {
        const list: ChildOption[] = data.children ?? [];
        setChildren(list);
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved && list.some((c) => c.id === saved)) {
          setSelectedChildId(saved);
        }
      })
      .catch(() => setChildren([]));
  }, []);

  const handleSelect = (id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setSelectedChildId(id);
  };

  const handleSwitch = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSelectedChildId(null);
  };

  if (children === null) {
    return <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>よみこみちゅう...</main>;
  }

  if (children.length === 0) {
    return (
      <main
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff9db",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <p>保護者ダッシュボード(/parent)から、お子さんのプロフィールを追加してください。</p>
      </main>
    );
  }

  if (!selectedChildId) {
    return (
      <main
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          background: "#fff9db",
        }}
      >
        <h1 style={{ fontSize: "1.5rem" }}>だれと おはなし する?</h1>
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSelect(c.id)}
            style={{ fontSize: "1.5rem", padding: "1rem 2rem", borderRadius: "1rem" }}
          >
            {c.name}
          </button>
        ))}
      </main>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);
  if (!selectedChild) {
    // Stale localStorage entry pointing at a since-deleted child; drop it and re-pick.
    window.localStorage.removeItem(STORAGE_KEY);
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <button onClick={handleSwitch}>だれと おはなし するか えらびなおす</button>
      </main>
    );
  }

  return (
    <VoiceChatScreen
      key={selectedChildId}
      childId={selectedChildId}
      childName={selectedChild.name}
      onSwitch={handleSwitch}
    />
  );
}
