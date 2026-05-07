"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { haptic } from "@/lib/celebrate";

type Props = {
  context: "food" | "workout" | "any";
  /** Called after a successful log so the page can refresh data. */
  onLogged?: () => void;
};

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

type Phase = "idle" | "listening" | "processing" | "done" | "error";

export default function VoiceLogFab({ context, onLogged }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function startListening() {
    if (phase === "listening") return stopListening();
    if (phase === "processing") return;
    setMessage(null);
    setTranscript("");

    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setPhase("error");
      setMessage("Voice not supported on this browser. Use Chrome or Safari over HTTPS.");
      return;
    }

    haptic("light");
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      finalText = text;
      setTranscript(text);
    };
    rec.onerror = () => {
      setPhase("error");
      setMessage("Mic error — check permission.");
    };
    rec.onend = () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = null;
      const txt = finalText.trim();
      if (!txt) {
        setPhase("idle");
        return;
      }
      void processTranscript(txt);
    };

    try {
      rec.start();
      recRef.current = rec;
      setPhase("listening");
      stopTimer.current = setTimeout(() => {
        try { rec.stop(); } catch { /* noop */ }
      }, 15000);
    } catch {
      setPhase("error");
      setMessage("Could not start mic.");
    }
  }

  function stopListening() {
    try { recRef.current?.stop(); } catch { /* noop */ }
  }

  async function processTranscript(text: string) {
    setPhase("processing");
    haptic("medium");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/voice-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ transcript: text, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase("error");
        setMessage(data?.error || "Failed to log");
        return;
      }
      setPhase("done");
      setMessage(data.summary || "Logged");
      if (data.ok) {
        haptic("medium");
        onLogged?.();
      }
      setTimeout(() => {
        setPhase("idle");
        setMessage(null);
        setTranscript("");
      }, 3500);
    } catch {
      setPhase("error");
      setMessage("Network error.");
    }
  }

  // Position so it doesn't overlap the bottom nav.
  const containerCls = "fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none";

  return (
    <div className={containerCls}>
      {(transcript || message) && (
        <div className="pointer-events-auto max-w-[calc(100vw-2rem)] sm:max-w-sm bg-[#141414]/95 backdrop-blur border border-neutral-800 rounded-2xl px-4 py-3 shadow-2xl">
          {transcript && phase !== "done" && (
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Heard</p>
          )}
          {transcript && phase !== "done" && (
            <p className="text-sm text-neutral-200 mb-1">&ldquo;{transcript}&rdquo;</p>
          )}
          {message && (
            <p className={`text-sm ${phase === "done" ? "text-emerald-400" : phase === "error" ? "text-red-400" : "text-neutral-300"}`}>
              {phase === "done" ? "✓ " : phase === "error" ? "⚠ " : ""}{message}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={startListening}
        disabled={phase === "processing"}
        aria-label={phase === "listening" ? "Stop voice log" : "Voice log"}
        title={!supported ? "Voice not supported on this browser" : phase === "listening" ? "Tap to stop" : "Tap and speak"}
        className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-2xl transition-all active:scale-95 ${
          phase === "listening"
            ? "bg-red-500 text-white animate-pulse ring-4 ring-red-500/30"
            : phase === "processing"
            ? "bg-neutral-700 text-neutral-300"
            : phase === "done"
            ? "bg-emerald-500 text-black"
            : "bg-amber-500 text-black hover:bg-amber-400"
        }`}
      >
        {phase === "listening" ? "■" : phase === "processing" ? "…" : phase === "done" ? "✓" : "🎙️"}
      </button>
    </div>
  );
}
