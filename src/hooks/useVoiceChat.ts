"use client";

import { useCallback, useRef, useState } from "react";

export type Phase = "idle" | "recording" | "thinking" | "speaking" | "error" | "limit_reached";

export function useVoiceChat() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [childText, setChildText] = useState("");
  const [aiText, setAiText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  // One random ID per browser tab. It is NOT a login/identity system - it just lets
  // our server keep short-term conversation context and a daily time counter.
  const sessionIdRef = useRef<string>(
    typeof window !== "undefined"
      ? window.crypto?.randomUUID?.() ?? String(Date.now())
      : ""
  );

  const startRecording = useCallback(async () => {
    setChildText("");
    setAiText("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setPhase("recording");
  }, []);

  const stopRecordingAndSend = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    await stopped;

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setPhase("thinking");

    const form = new FormData();
    form.append("audio", blob, "speech.webm");
    form.append("sessionId", sessionIdRef.current);
    form.append("seconds", String(seconds));

    try {
      const res = await fetch("/api/talk", { method: "POST", body: form });

      if (res.status === 403) {
        setPhase("limit_reached");
        return;
      }
      if (!res.ok) {
        setPhase("error");
        return;
      }

      const data = await res.json();
      setChildText(data.childText ?? "");
      setAiText(data.aiText ?? "");

      const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
      setPhase("speaking");
      audio.onended = () => setPhase("idle");
      audio.onerror = () => setPhase("idle");
      await audio.play();
    } catch {
      setPhase("error");
    }
  }, []);

  return { phase, childText, aiText, startRecording, stopRecordingAndSend };
}
