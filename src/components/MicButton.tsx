"use client";
import { useEffect, useRef, useState } from "react";

// Minimal types for Web Speech API (not in lib.dom.d.ts on all targets)
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type Props = {
  /** Called on every interim/final transcript update. Receives the cumulative text since this listening session started. */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Optional language. Defaults to "en-IN". */
  lang?: string;
  /** Visual size. */
  size?: "sm" | "md";
  /** Auto-stop after this many ms of silence/listening. Default 12s. */
  maxDurationMs?: number;
  /** When this prop changes truthy, automatically start listening (used to auto-trigger from a parent button). */
  autoStart?: boolean;
  className?: string;
};

/**
 * Tap-to-talk mic button. Uses the Web Speech API (Chrome / Edge / Safari /
 * Android WebView). Falls back to disabled+tooltip if unsupported.
 */
export default function MicButton({
  onTranscript,
  lang = "en-IN",
  size = "md",
  maxDurationMs = 12000,
  autoStart = false,
  className = "",
}: Props) {
  const [supported, setSupported] = useState<boolean>(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  function start() {
    if (listening) return stop();
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let cumulative = "";
      let lastIsFinal = false;
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        cumulative += r[0].transcript;
        if (r.isFinal) lastIsFinal = true;
      }
      onTranscript(cumulative.trim(), lastIsFinal);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
      stopTimerRef.current = setTimeout(() => {
        try { rec.stop(); } catch { /* noop */ }
      }, maxDurationMs);
    } catch {
      setListening(false);
    }
  }

  function stop() {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  }

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort(); } catch { /* noop */ }
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  // Auto-start when parent flips autoStart=true (e.g. user tapped a "voice log" CTA)
  useEffect(() => {
    if (autoStart && supported && !listening) {
      // small delay so the modal/keyboard has time to settle
      const t = setTimeout(() => start(), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, supported]);

  if (!supported) {
    // Render a disabled mic so users know the feature exists; common reasons it's
    // unsupported: Firefox, plain http (not https), Capacitor WebView w/o the
    // SpeechRecognition shim. We surface a tooltip rather than hiding silently.
    const sizeClsOff = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";
    return (
      <button
        type="button"
        disabled
        title="Voice input not supported on this browser. Open in Chrome/Safari over HTTPS."
        aria-label="Voice input unavailable"
        className={`shrink-0 rounded-full flex items-center justify-center bg-neutral-900 text-neutral-600 cursor-not-allowed opacity-60 ${sizeClsOff} ${className}`}
      >
        🎤
      </button>
    );
  }

  const sizeCls = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";
  const stateCls = listening
    ? "bg-amber-500 text-black animate-pulse"
    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700";

  return (
    <button
      type="button"
      onClick={start}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      className={`shrink-0 rounded-full flex items-center justify-center transition-colors ${sizeCls} ${stateCls} ${className}`}
    >
      {listening ? "■" : "🎤"}
    </button>
  );
}
