/* Voice input via the browser's built-in speech recognition (Chrome, Edge, Android Chrome, Safari). */
type Handler<T> = (p: T) => void;
export type DictState = "idle" | "starting" | "listening";
export type Dictation = {
  start(o?: { language?: string }): Promise<void>;
  stop(): Promise<void>;
  active(): boolean;
  onPartial(h: Handler<{ text: string }>): () => void;
  onFinal(h: Handler<{ text: string }>): () => void;
  onState(h: Handler<{ state: DictState; reason?: string | undefined }>): () => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function makeDictation(): Dictation | null {
  if (typeof window === "undefined") return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  let rec: any = null;
  let state: DictState = "idle";
  let stopReason: string | null = null;
  const P: Handler<{ text: string }>[] = [];
  const F: Handler<{ text: string }>[] = [];
  const S: Handler<{ state: DictState; reason?: string | undefined }>[] = [];
  const setState = (s: DictState, r?: string) => {
    state = s;
    S.forEach((h) => h({ state: s, reason: r }));
  };
  const sub = <T,>(arr: Handler<T>[], h: Handler<T>) => {
    arr.push(h);
    return () => {
      const i = arr.indexOf(h);
      if (i >= 0) arr.splice(i, 1);
    };
  };
  return {
    start(o) {
      return new Promise((resolve, reject) => {
        if (rec) return resolve();
        rec = new SR();
        rec.lang = o?.language || navigator.language || "en-IN";
        rec.interimResults = true;
        rec.continuous = false;
        stopReason = null;
        let started = false;
        rec.onstart = () => {
          started = true;
          setState("listening");
          resolve();
        };
        rec.onresult = (e: any) => {
          let interim = "";
          let fin = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) fin += r[0].transcript;
            else interim += r[0].transcript;
          }
          if (interim) P.forEach((h) => h({ text: interim }));
          if (fin) {
            P.forEach((h) => h({ text: "" }));
            F.forEach((h) => h({ text: " " + fin.trim() }));
          }
        };
        rec.onerror = (e: any) => {
          const c = e.error;
          if (c === "not-allowed" || c === "service-not-allowed") {
            stopReason = "not_granted";
            if (!started) reject({ code: "not_granted", message: c });
          } else if (c !== "no-speech" && c !== "aborted") {
            stopReason = "upstream_error";
            if (!started) reject({ code: "upstream_error", message: c });
          }
        };
        rec.onend = () => {
          rec = null;
          setState("idle", stopReason || "viewer_stopped");
        };
        setState("starting");
        try {
          rec.start();
        } catch (err) {
          rec = null;
          setState("idle", "upstream_error");
          reject({ code: "upstream_error", message: String(err) });
        }
      });
    },
    async stop() {
      if (rec) {
        stopReason = "stopped";
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    },
    active: () => state !== "idle",
    onPartial: (h) => sub(P, h),
    onFinal: (h) => sub(F, h),
    onState: (h) => sub(S, h),
  };
}
