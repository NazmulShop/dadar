import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

function getSpeechRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SR;
    webkitSpeechRecognition?: SR;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceSearch(onResult: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("Voice search isn't supported on this device.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        setTranscript(text);
        const last = e.results[e.results.length - 1];
        if (last?.isFinal) {
          onResultRef.current(text.trim());
        }
      };
      rec.onerror = (e: any) => {
        setError(e?.error ?? "Voice error");
        setListening(false);
      };
      rec.onend = () => setListening(false);
      rec.start();
      recRef.current = rec;
      setError(null);
      setTranscript("");
      setListening(true);
    } catch (err) {
      setError("Could not start microphone.");
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, transcript, error, start, stop };
}
