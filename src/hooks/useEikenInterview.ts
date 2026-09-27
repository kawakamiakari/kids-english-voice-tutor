"use client";

import { useCallback, useRef, useState } from "react";
import {
  EIKEN3_PASSAGES,
  EIKEN3_PICTURES,
  EIKEN3_PERSONAL_QUESTIONS,
  pickRandom,
  pickTwoDistinct,
} from "@/lib/eikenContent";

export type EikenPhase = "idle" | "speaking" | "recording" | "thinking" | "done" | "error";
export type FeedbackPoint = { kind: "praise" | "tip"; text: string };
export type Feedback = { headline: string; points: FeedbackPoint[] };

type ScriptStep = {
  id: string;
  spoken: string;
  display?: string;
  illustrationId?: string;
  recordable: boolean;
};

// Same VAD tuning as useVoiceChat.ts - duplicated rather than shared because the two
// hooks drive very different step machines (freeform turn-taking vs. a fixed script),
// and the recording logic itself is only ~30 lines.
const SPEECH_RMS_THRESHOLD = 0.02;
const SILENCE_MS_TO_STOP = 1200;
const MAX_RECORDING_MS = 15000;
const NO_SPEECH_TIMEOUT_MS = 8000;
const VAD_POLL_MS = 100;

function buildScript(): { steps: ScriptStep[]; illustrationId: string } {
  const passage = pickRandom(EIKEN3_PASSAGES);
  const picture = pickRandom(EIKEN3_PICTURES);
  const [q1, q2] = pickTwoDistinct(EIKEN3_PERSONAL_QUESTIONS);

  const steps: ScriptStep[] = [
    { id: "greeting", spoken: "Hello! How are you today?", recordable: true },
    {
      id: "passage_reading",
      spoken: "Let's begin. Please read this passage out loud.",
      display: passage.text,
      recordable: true,
    },
    { id: "passage_question", spoken: passage.question, display: passage.text, recordable: true },
    {
      id: "picture_description",
      spoken: picture.descriptionPrompt,
      illustrationId: picture.illustrationId,
      recordable: true,
    },
    {
      id: "picture_followup",
      spoken: picture.followUpPrompt,
      illustrationId: picture.illustrationId,
      recordable: true,
    },
    { id: "personal_q1", spoken: q1, recordable: true },
    { id: "personal_q2", spoken: q2, recordable: true },
    {
      id: "closing",
      spoken: "That's the end of our practice interview today. Great job!",
      recordable: false,
    },
  ];

  return { steps, illustrationId: picture.illustrationId };
}

async function playAudioFromBase64(base64: string): Promise<void> {
  const audio = new Audio(`data:audio/mp3;base64,${base64}`);
  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

export function useEikenInterview(childId: string) {
  const [phase, setPhase] = useState<EikenPhase>("idle");
  const [currentStep, setCurrentStep] = useState<ScriptStep | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const generationRef = useRef(0);
  const collectedRef = useRef<{ prompt: string; answer: string }[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopVad = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const playText = useCallback(async (text: string): Promise<void> => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.audioBase64) await playAudioFromBase64(data.audioBase64);
  }, []);

  /** Records until the child goes quiet after speaking (or a timeout), then resolves with the blob. */
  const recordOneAnswer = useCallback(
    (myGen: number): Promise<Blob> =>
      new Promise((resolve) => {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          if (myGen !== generationRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            resolve(new Blob());
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

          const audioCtx = new AudioContext();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          source.connect(analyser);
          const data = new Uint8Array(analyser.fftSize);

          let hasSpoken = false;
          let silenceStartedAt = 0;
          let finished = false;

          const finish = () => {
            if (finished) return;
            finished = true;
            stopVad();
            const rec = mediaRecorderRef.current;
            if (!rec) {
              resolve(new Blob());
              return;
            }
            rec.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
            rec.stop();
            rec.stream.getTracks().forEach((t) => t.stop());
          };

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

            const wentQuiet =
              hasSpoken && silenceStartedAt && Date.now() - silenceStartedAt > SILENCE_MS_TO_STOP;
            const timedOut = elapsed > MAX_RECORDING_MS || (!hasSpoken && elapsed > NO_SPEECH_TIMEOUT_MS);

            if (wentQuiet || timedOut) finish();
          }, VAD_POLL_MS);
        });
      }),
    [stopVad]
  );

  const finishInterview = useCallback(
    async (myGen: number) => {
      setPhase("thinking");
      try {
        const res = await fetch("/api/eiken/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, grade: "3", steps: collectedRef.current }),
        });
        const data = res.ok
          ? await res.json()
          : { headline: "Great job practicing today!", points: [{ kind: "praise", text: "がんばったね" }] };
        if (myGen !== generationRef.current) return;
        setFeedback({ headline: data.headline, points: data.points });
        if (data.audioBase64) await playAudioFromBase64(data.audioBase64);
        if (myGen !== generationRef.current) return;
        setPhase("done");
      } catch {
        if (myGen === generationRef.current) setPhase("error");
      }
    },
    [childId]
  );

  const start = useCallback(() => {
    const myGen = ++generationRef.current;
    collectedRef.current = [];
    setFeedback(null);

    const { steps } = buildScript();

    (async () => {
      for (const step of steps) {
        if (myGen !== generationRef.current) return;
        setCurrentStep(step);
        setPhase("speaking");
        await playText(step.spoken);
        if (myGen !== generationRef.current) return;

        if (!step.recordable) continue;

        const blob = await recordOneAnswer(myGen);
        if (myGen !== generationRef.current) return;
        setPhase("thinking");

        let answerText = "";
        try {
          const form = new FormData();
          form.append("audio", blob, "speech.webm");
          form.append("childId", childId);
          const res = await fetch("/api/eiken/answer", { method: "POST", body: form });
          if (res.ok) {
            const data = await res.json();
            answerText = data.text ?? "";
          }
        } catch {
          // leave answerText empty - the final feedback step handles missing answers gently
        }
        collectedRef.current.push({ prompt: step.spoken, answer: answerText });
      }

      if (myGen !== generationRef.current) return;
      await finishInterview(myGen);
    })();
  }, [childId, playText, recordOneAnswer, finishInterview]);

  const abort = useCallback(() => {
    generationRef.current++;
    stopVad();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setPhase("idle");
    setCurrentStep(null);
  }, [stopVad]);

  return {
    phase,
    currentStepId: currentStep?.id ?? null,
    currentDisplayText: currentStep?.display ?? null,
    currentIllustrationId: currentStep?.illustrationId ?? null,
    feedback,
    start,
    abort,
  };
}
