"use client";

import { useCallback, useRef, useState } from "react";

export type Phase = "idle" | "recording" | "thinking" | "speaking" | "error" | "limit_reached";

export type Message = { role: "child" | "pico"; text: string };
export type SummaryPoint = { kind: "praise" | "tip"; text: string };
export type Summary = { headline: string; points: SummaryPoint[] };

// One collapsible block in the chat log: everything said between one tap-to-start
// and the matching tap-to-stop. `pending` is true while its summary is being
// fetched; a session with `pending: false` and `summary: null` was abandoned
// without a summary (e.g. an error cut the conversation short).
export type Session = {
  id: string;
  messages: Message[];
  summary: Summary | null;
  pending: boolean;
};

// Silence-detection tuning. RMS is the mic's volume on a roughly 0-1 scale.
const SPEECH_RMS_THRESHOLD = 0.02;
const SILENCE_MS_TO_STOP = 1200;
const MAX_RECORDING_MS = 15000;
const NO_SPEECH_TIMEOUT_MS = 8000;
const VAD_POLL_MS = 100;

function newId() {
  return typeof window !== "undefined"
    ? window.crypto?.randomUUID?.() ?? String(Date.now())
    : String(Math.random());
}

export function useVoiceChat() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessions, setSessions] = useState<Session[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const conversationActiveRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The session currently being recorded into. Kept as a ref (mirroring the
  // last entry appended to `sessions`) so async callbacks can read/append to
  // it synchronously without depending on React state timing.
  const currentSessionIdRef = useRef<string | null>(null);
  const currentMessagesRef = useRef<Message[]>([]);

  // Bumped on every new turn/stop so callbacks from an abandoned turn (e.g. the
  // child tapped stop while a request was in flight) know to no-op instead of
  // clobbering fresher state.
  const generationRef = useRef(0);

  // One random ID per browser tab. It is NOT a login/identity system - it just lets
  // our server keep short-term conversation context and a daily time counter.
  const sessionIdRef = useRef<string>(
    typeof window !== "undefined"
      ? window.crypto?.randomUUID?.() ?? String(Date.now())
      : ""
  );

  const stopVad = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const stopAndSendRef = useRef<() => Promise<void>>(async () => {});

  const startListening = useCallback(async () => {
    const myGen = ++generationRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (myGen !== generationRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setPhase("recording");

    // Auto-stop once the child has spoken and then gone quiet, so nobody has
    // to hold a button down. A few timeouts guard against silence forever
    // (background noise never crossing the threshold) or speech that never
    // pauses.
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    let hasSpoken = false;
    let silenceStartedAt = 0;

    vadIntervalRef.current = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const elapsed = Date.now() - startedAtRef.current;

      if (rms > SPEECH_RMS_THRESHOLD) {
        hasSpoken = true;
        silenceStartedAt = 0;
      } else if (hasSpoken && !silenceStartedAt) {
        silenceStartedAt = Date.now();
      }

      const wentQuietAfterSpeaking =
        hasSpoken && silenceStartedAt && Date.now() - silenceStartedAt > SILENCE_MS_TO_STOP;
      const timedOut = elapsed > MAX_RECORDING_MS || (!hasSpoken && elapsed > NO_SPEECH_TIMEOUT_MS);

      if (wentQuietAfterSpeaking || timedOut) {
        stopAndSendRef.current();
      }
    }, VAD_POLL_MS);
  }, []);

  const stopAndSend = useCallback(async () => {
    const myGen = generationRef.current;
    const mySessionId = currentSessionIdRef.current;
    stopVad();

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    await stopped;

    if (myGen !== generationRef.current || !mySessionId) return;

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setPhase("thinking");

    const form = new FormData();
    form.append("audio", blob, "speech.webm");
    form.append("sessionId", sessionIdRef.current);
    form.append("seconds", String(seconds));

    try {
      const res = await fetch("/api/talk", { method: "POST", body: form });
      if (myGen !== generationRef.current) return;

      if (res.status === 403) {
        conversationActiveRef.current = false;
        setPhase("limit_reached");
        return;
      }
      if (!res.ok) {
        conversationActiveRef.current = false;
        setPhase("error");
        return;
      }

      const data = await res.json();
      if (myGen !== generationRef.current) return;

      const newChildText: string = data.childText ?? "";
      const newAiText: string = data.aiText ?? "";
      const newMsgs: Message[] = [
        ...(newChildText.trim() ? [{ role: "child" as const, text: newChildText }] : []),
        ...(newAiText.trim() ? [{ role: "pico" as const, text: newAiText }] : []),
      ];

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== mySessionId) return s;
          const messages = [...s.messages, ...newMsgs];
          currentMessagesRef.current = messages;
          return { ...s, messages };
        })
      );

      const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
      setPhase("speaking");
      audio.onended = () => {
        if (myGen !== generationRef.current) return;
        if (conversationActiveRef.current) {
          startListening();
        } else {
          setPhase("idle");
        }
      };
      audio.onerror = () => {
        if (myGen !== generationRef.current) return;
        setPhase("idle");
      };
      await audio.play();
    } catch {
      if (myGen === generationRef.current) {
        conversationActiveRef.current = false;
        setPhase("error");
      }
    }
  }, [stopVad, startListening]);

  stopAndSendRef.current = stopAndSend;

  const fetchSummary = useCallback(async (sessionId: string, transcript: Message[]) => {
    const applyFallback = (summary: Summary) => {
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, summary, pending: false } : s)));
    };

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        applyFallback({
          headline: "Great job practicing English today!",
          points: [
            { kind: "praise", text: "You talked with Pico today!" },
            { kind: "tip", text: "またこんど おはなし しようね" },
          ],
        });
        return;
      }
      const data = await res.json();
      applyFallback({ headline: data.headline, points: data.points });
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        audio.play().catch(() => {});
      }
    } catch {
      applyFallback({
        headline: "Great job practicing English today!",
        points: [
          { kind: "praise", text: "You talked with Pico today!" },
          { kind: "tip", text: "またこんど おはなし しようね" },
        ],
      });
    }
  }, []);

  const startConversation = useCallback(() => {
    const id = newId();
    currentSessionIdRef.current = id;
    currentMessagesRef.current = [];
    setSessions((prev) => [...prev, { id, messages: [], summary: null, pending: false }]);
    conversationActiveRef.current = true;
    startListening();
  }, [startListening]);

  const endConversation = useCallback(() => {
    conversationActiveRef.current = false;
    generationRef.current++;
    stopVad();
    const recorder = mediaRecorderRef.current;
    recorder?.stream.getTracks().forEach((t) => t.stop());

    const sessionId = currentSessionIdRef.current;
    const transcript = currentMessagesRef.current;
    currentSessionIdRef.current = null;

    if (!sessionId || transcript.length === 0) {
      // Nothing was said - drop the empty session rather than leaving a blank card.
      if (sessionId) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
      setPhase("idle");
      return;
    }

    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, pending: true } : s)));
    setPhase("idle");
    fetchSummary(sessionId, transcript);
  }, [stopVad, fetchSummary]);

  return { phase, sessions, startConversation, endConversation };
}
