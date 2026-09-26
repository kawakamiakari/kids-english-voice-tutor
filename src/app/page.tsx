import { TalkButton } from "@/components/TalkButton";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "#fff9db",
      }}
    >
      <h1 style={{ fontSize: "3rem", margin: 0 }}>English Time! 🦜</h1>
      <TalkButton />
    </main>
  );
}
