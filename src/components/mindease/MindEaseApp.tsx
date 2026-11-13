import { useCallback, useEffect, useRef, useState } from "react";

import { DEAD_CODES, sample, sampleJSON, type AiError } from "@/lib/mindease/ai-client";
import { CRISIS_REPLY, PERSONA, type Activity } from "@/lib/mindease/data";
import { makeDictation, type Dictation, type DictState } from "@/lib/mindease/dictation";
import {
  addNote,
  assess,
  contextFor,
  craftReply,
  detectMood,
  esc,
  extractNotes,
  md,
  parseCommand,
  recall,
  retrieve,
  route,
  suggest,
  type Command,
  type Memory,
  type TabKey,
} from "@/lib/mindease/engine";
import { applyTheme, DEF_T, loadTheme, saveTheme, type Theme } from "@/lib/mindease/theme";
import { ActivityCard, Helplines, SuggestionCard, type Suggestion } from "./parts";
import { SidePanel } from "./SidePanel";

type Msg = {
  id: number;
  role: "user" | "assistant";
  html: string;
  text: string;
  streaming?: boolean;
  acts?: Activity[] | undefined;
  sources?: string[] | undefined;
  helpline?: string | undefined;
  suggestions?: Suggestion[] | undefined;
  seeSomeone?: string | undefined;
  footnote?: string | undefined;
  notice?: string | undefined;
};
type Turn = { role: "user" | "assistant"; content: string };

const MEM_KEY = "mindease_mem";
const GREETING = "Hi, I am MindEase. This is a judgement-free space. How are you feeling today?";
const STARTERS: [string, string][] = [
  ["College stress", "I feel stressed about college."],
  ["Trouble focusing", "I cannot focus today."],
  ["Feeling lonely", "I have been feeling lonely lately."],
  ["Try an activity", "Can we try a short calming activity?"],
];
const THINKING = (label: string) => `<span class="muted">${label}</span><span class="me-cursor"></span>`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let nextId = 1;
const greeting = (): Msg => ({ id: nextId++, role: "assistant", html: md(GREETING), text: GREETING });

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

export function MindEaseApp() {
  const [messages, setMessages] = useState<Msg[]>(() => [{ id: 0, role: "assistant", html: md(GREETING), text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showStarter, setShowStarter] = useState(true);
  const [tab, setTab] = useState<TabKey>("memory");
  const [asideOpen, setAsideOpen] = useState(false);
  const [mem, setMemState] = useState<Memory>({ consent: false, notes: [] });
  const [theme, setThemeState] = useState<Theme>(DEF_T);
  const [loaded, setLoaded] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [aiOK, setAiOK] = useState(true);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [dict, setDict] = useState<Dictation | null>(null);
  const [micState, setMicState] = useState<DictState>("idle");
  const [autosend, setAutosend] = useState(false);
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  const turnRef = useRef(0);
  const busyRef = useRef(false);
  const memRef = useRef(mem);
  memRef.current = mem;
  const stateRef = useRef({ cloudEnabled, aiOK, ttsOn, autosend, input });
  stateRef.current = { cloudEnabled, aiOK, ttsOn, autosend, input };
  const baseRef = useRef("");

  /* ---------- browser-only setup ---------- */
  useEffect(() => {
    try {
      const s = localStorage.getItem(MEM_KEY);
      if (s) setMemState(JSON.parse(s));
    } catch {
      /* ignore */
    }
    setThemeState(loadTheme());
    setTtsAvailable("speechSynthesis" in window);
    setDict(makeDictation());
    setLoaded(true);
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(MEM_KEY, JSON.stringify(mem));
    } catch {
      /* ignore */
    }
  }, [mem, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveTheme(theme);
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, loaded]);

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  const setMem = useCallback((fn: (m: Memory) => Memory) => setMemState((m) => fn(m)), []);

  /* ---------- message helpers ---------- */
  const addMsg = (m: Omit<Msg, "id">) => {
    const id = nextId++;
    setMessages((prev) => [...prev, { ...m, id }]);
    return id;
  };
  const patchMsg = (id: number, patch: Partial<Msg>) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  async function typeOut(id: number, text: string) {
    const words = text.match(/\S+\s*|\n/g) || [];
    let shown = "";
    for (const w of words) {
      shown += w;
      patchMsg(id, { html: md(shown) + '<span class="me-cursor"></span>' });
      await sleep(18);
    }
  }

  function speak(t: string) {
    if (!stateRef.current.ttsOn || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(
        t
          .replace(/^\s*[-•]\s+/gm, "")
          .replace(/[*_#>]/g, "")
          .replace(/https?:\/\/\S+/g, ""),
      );
      u.rate = 0.97;
      speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  const cloudReady = () => stateRef.current.cloudEnabled && stateRef.current.aiOK;
  const handleAiError = (e: AiError) => {
    if (DEAD_CODES.includes(e.code)) setAiOK(false);
    return e.message ? `Cloud AI is unavailable right now (${e.message}). Replying with the private companion instead.` : undefined;
  };

  function resetChat(force = false) {
    if (!force && turnsRef.current.length && !window.confirm("Start a new chat? This clears the current conversation from this page.")) return;
    turnRef.current = 0;
    turnsRef.current = [];
    setShowStarter(true);
    setMessages([greeting()]);
  }

  function exportChat() {
    const lines = messages.filter((m) => m.text.trim()).map((m) => (m.role === "user" ? "You" : "MindEase") + ":\n" + m.text.trim());
    const blob = new Blob(["MindEase conversation\nExported locally from this browser.\n\n" + lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindease-conversation.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function toggleEngine() {
    if (!cloudEnabled && !window.confirm("Cloud AI sends your messages to the configured AI provider. Only enable it if you agree. Continue?")) return;
    setCloudEnabled(!cloudEnabled);
  }

  /* ---------- commands ---------- */
  function runCommand(cmd: Command): string {
    switch (cmd.kind) {
      case "reset":
        resetChat();
        return "";
      case "open":
        if (cmd.tab) setTab(cmd.tab);
        setAsideOpen(true);
        return "Opened " + cmd.label + ".";
      case "memory":
        setMem((m) => ({ ...m, consent: cmd.on }));
        return "Memory is now " + (cmd.on ? "ON" : "OFF") + ".";
      case "suggest":
        void suggestHelp();
        return "";
      case "stopSpeaking":
        try {
          speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
        return "Okay, stopped.";
      case "readAloud":
        setTtsOn(true);
        return "I will read my replies aloud.";
    }
  }

  /* ---------- memory ---------- */
  async function rememberSmart(text: string) {
    if (!memRef.current.consent) return;
    if (cloudReady()) {
      try {
        const notes = await sampleJSON(
          'You keep short context notes about a student for a supportive companion. From the message below, extract at most 2 durable facts the student stated (for example "Has end-semester exams next week" or "Feels lonely in the hostel"). Each under 15 words, third person. Skip medical diagnoses, ID numbers and anything about self-harm. Reply with only a JSON array of strings, or [] if nothing durable.\n\nMessage: ' +
            text,
          { modelTier: "quick" },
        );
        if (Array.isArray(notes)) {
          setMem((m) => ({ ...m, notes: notes.slice(0, 2).reduce((acc: typeof m.notes, n) => addNote(acc, String(n)), m.notes).slice(0, 50) }));
          return;
        }
      } catch {
        /* fall back to local rules */
      }
    }
    setMem((m) => ({ ...m, notes: extractNotes(m.notes, text) }));
  }

  /* ---------- send ---------- */
  async function send(raw: string) {
    const text = String(raw || "").trim();
    if (!text || busyRef.current) return;
    addMsg({ role: "user", html: `<p>${esc(text)}</p>`, text });
    setShowStarter(false);
    let cmd = parseCommand(text);
    if (cmd?.kind === "readAloud" && !ttsAvailable) cmd = null;
    if (cmd) {
      const note = runCommand(cmd);
      if (note) addMsg({ role: "assistant", html: `<p><em>${esc(note)}</em></p>`, text: note });
      return;
    }

    busyRef.current = true;
    setBusy(true);
    let id = -1;
    try {
      try {
        if ("speechSynthesis" in window) speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
      const level = assess(text);
      id = addMsg({ role: "assistant", html: THINKING("Thinking"), text: "", streaming: true });
      let reply = "";
      let helpline: string | undefined;
      let sources: string[] = [];
      let acts: Activity[] = [];
      let notice: string | undefined;
      let viaAI = false;

      if (level === "crisis") {
        reply = CRISIS_REPLY;
        helpline = "Support is available right now";
        await typeOut(id, reply);
      } else {
        const mood = detectMood(text);
        const intent0 = route(text);
        const rag = intent0 === "resource" ? retrieve(text) : [];
        const intent = intent0 === "resource" && !rag.length ? "talk" : intent0;
        acts = intent === "activity" ? suggest(mood, 2) : [];
        sources = rag.map((c) => c.title).filter((v, i, a) => a.indexOf(v) === i);
        const mems = memRef.current.consent ? memRef.current.notes.slice(0, 6).map((n) => n.text) : [];

        if (cloudReady()) {
          const history: Turn[] = [
            { role: "user", content: PERSONA },
            { role: "assistant", content: "Understood. I will follow these guidelines." },
            ...turnsRef.current.slice(-12),
            { role: "user", content: text + contextFor(mood, rag, acts, mems, level) },
          ];
          try {
            const r = await sample(history, { modelTier: "quick", onText: ({ text: t }) => patchMsg(id, { html: md(t) + '<span class="me-cursor"></span>' }) });
            reply = r.text;
            viaAI = true;
          } catch (err) {
            const e = err as AiError;
            if (e.text && e.text.length > 40) {
              reply = e.text;
              viaAI = true;
            } else notice = handleAiError(e);
          }
        }
        if (!viaAI) {
          reply = craftReply({ intent, mood, acts, rag, turn: turnRef.current, recalled: recall(memRef.current, text) });
          if (level === "elevated")
            reply += "\n\n_If this heaviness keeps building, talking to a counsellor or someone you trust can really help. Tele-MANAS (14416) is free and open 24/7._";
          await typeOut(id, reply);
        }
        if (level === "elevated") helpline = "Support is available if you want it";
      }
      turnsRef.current.push({ role: "user", content: text }, { role: "assistant", content: reply });
      turnRef.current++;
      patchMsg(id, { html: md(reply), text: reply, streaming: false, acts, sources, helpline, notice });
      speak(reply);
      if (level !== "crisis") void rememberSmart(text);
    } catch (err) {
      console.error("MindEase send failed:", err);
      const fail = "Sorry, I hit a temporary problem while replying. Please try sending that again.";
      if (id >= 0) patchMsg(id, { html: md(fail), text: fail, streaming: false });
      else addMsg({ role: "assistant", html: md(fail), text: fail });
    } finally {
      busyRef.current = false;
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  /* ---------- "Suggest what might help" ---------- */
  async function suggestHelp() {
    if (busyRef.current) return;
    const mine = turnsRef.current.filter((t) => t.role === "user").map((t) => t.content);
    if (!mine.length) {
      const t = "Tell me a little about what is going on first, even a sentence or two. Then I can suggest things that actually fit.";
      addMsg({ role: "assistant", html: md(t), text: t });
      return;
    }
    const allText = mine.join(" ");
    if (assess(allText) === "crisis") {
      const t = "Right now, the most helpful thing is talking to a real person. Please reach out to one of these:";
      addMsg({ role: "assistant", html: md(t), text: t, helpline: "Support is available right now" });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    const id = addMsg({ role: "assistant", html: THINKING("Thinking about what you have shared"), text: "", streaming: true });
    const mems = memRef.current.consent ? memRef.current.notes.slice(0, 6).map((n) => n.text) : [];
    type SuggestData = { intro?: string; suggestions: Suggestion[]; seeSomeone?: string | null };
    let data = null as SuggestData | null;
    let notice: string | undefined;

    try {
      if (cloudReady()) {
        const convo = turnsRef.current
          .slice(-16)
          .map((t) => (t.role === "user" ? "Student: " : "MindEase: ") + t.content)
          .join("\n");
        const prompt = `You are MindEase, a warm companion for college students. The student has asked what might help with what they have been going through. Read the conversation and suggest things tailored to THEIR specifics.

Conversation so far:
${convo}
${mems.length ? "\nThings they chose to let you remember: " + mems.join("; ") + "\n" : ""}
Rules:
- Give exactly 3 suggestions. Each must clearly connect to something they actually said, not generic wellness advice.
- Mix the kinds: one thing to do right now to settle (kind "right now"), one that addresses the underlying situation (kind "for the cause"), and one involving a person, place or routine if it fits (kind "support" or "routine").
- Small and doable today or this week. "steps" is 2 to 4 short, concrete steps. "why" is one sentence that refers back to what they told you. "minutes" is a rough number.
- No diagnosis, no medical claims, and never promise it will fix or cure anything. Use plain, warm language in the language the student writes in.
- "seeSomeone": if what they described sounds heavy, lasting, or hard to manage alone, one gentle sentence encouraging a college counsellor, doctor or Tele-MANAS (14416). Otherwise null.

Reply with only JSON in this shape:
{"intro": "one warm sentence", "suggestions": [{"title": "...", "kind": "...", "why": "...", "steps": ["..."], "minutes": 5}], "seeSomeone": null}`;
        try {
          const d = (await sampleJSON(prompt, { modelTier: "default" })) as SuggestData | null;
          if (d && Array.isArray(d.suggestions) && d.suggestions.length) data = d;
        } catch (err) {
          notice = handleAiError(err as AiError);
        }
      }

      if (!data) {
        /* offline fallback: match mood to activities and the best-fitting guide */
        const mood = detectMood(allText);
        const acts = suggest(mood, 2);
        const g = retrieve(allText, 1)[0];
        data = {
          intro: mood
            ? `From what you have said, this sounds like ${mood} feelings. Here are a few things that often help with that.`
            : "Here are a few gentle things that often help. Pick whatever feels doable.",
          suggestions: acts.map((a) => ({ title: a.title, kind: a.type, why: "A small, low-effort way to ease how you are feeling right now.", steps: a.steps, minutes: a.minutes })),
          seeSomeone: "If this keeps weighing on you for more than a couple of weeks, talking to a counsellor or Tele-MANAS (14416) can really help.",
        };
        if (g) data.suggestions.push({ title: g.section, kind: "from " + g.title, why: "A short guide that matches what you described.", steps: [g.text], minutes: 0 });
      }

      const intro = String(data.intro || "Here are a few ideas that fit what you have shared.");
      const list = data.suggestions.slice(0, 4);
      patchMsg(id, {
        html: md(intro),
        text: intro + "\n" + list.map((s) => "- " + (s.title || "Try this")).join("\n"),
        streaming: false,
        suggestions: list,
        seeSomeone: data.seeSomeone ? String(data.seeSomeone) : undefined,
        footnote: "These are ideas to try, not treatment. Tell me how they go, or what does not feel doable.",
        notice,
      });
      turnsRef.current.push(
        { role: "user", content: "Can you suggest what might help?" },
        { role: "assistant", content: intro + " Suggestions: " + list.map((s) => s.title).join("; ") + "." },
      );
      speak(intro);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  /* ---------- voice input ---------- */
  useEffect(() => {
    if (!dict) return;
    const offP = dict.onPartial(({ text }) => setInput((baseRef.current + (text ? " " + text : "")).trimStart()));
    const offF = dict.onFinal(({ text }) => {
      baseRef.current += text;
      setInput(baseRef.current.trimStart());
    });
    const offS = dict.onState(({ state, reason }) => {
      setMicState(state);
      if (state === "idle") {
        const v = stateRef.current.input;
        if (stateRef.current.autosend && v.trim() && (reason === "stopped" || reason === "viewer_stopped")) {
          setInput("");
          void send(v);
        }
      }
    });
    return () => {
      offP();
      offF();
      offS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dict]);

  function toggleMic() {
    if (!dict) return;
    if (dict.active()) {
      dict.stop().catch(() => {});
      return;
    }
    baseRef.current = input;
    dict.start().catch((e: { code?: string }) => {
      if (e?.code === "unavailable" || e?.code === "not_granted") setDict(null);
    });
  }

  /* ---------- textarea autosize ---------- */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  const submit = () => {
    const v = input;
    setInput("");
    void send(v);
  };

  const modeText = cloudEnabled && aiOK ? "cloud AI enabled" : "private local companion";

  return (
    <div className="me-app">
      <header className="me-header">
        <div className="me-brand">
          <span className="me-brand-mark" aria-hidden="true">
            ✦
          </span>
          <h1 style={{ font: "inherit", margin: 0 }}>MindEase</h1>
          <span className="me-brand-mode">{modeText}</span>
          <button type="button" className="me-engine" aria-pressed={cloudEnabled} onClick={toggleEngine}>
            {cloudEnabled ? "AI cloud: ON" : "Private offline: ON"}
          </button>
        </div>
        <div className="me-hrow">
          {installEvt ? (
            <button
              className="ghost"
              type="button"
              aria-label="Install MindEase"
              onClick={() => {
                void installEvt.prompt();
                setInstallEvt(null);
              }}
            >
              Install app
            </button>
          ) : null}
          <button className="ghost" type="button" title="Download this conversation" onClick={exportChat} style={{ whiteSpace: "nowrap" }}>
            Export
          </button>
          <button className="ghost" type="button" onClick={() => resetChat(false)}>
            New chat
          </button>
          <button className="ghost me-mobile-only" type="button" onClick={() => setAsideOpen(true)}>
            Tools
          </button>
        </div>
      </header>

      <div className="me-layout">
        <main className="me-main">
          <div className="me-messages" ref={boxRef} aria-live="polite" aria-relevant="additions text">
            {messages.map((m) => (
              <div key={m.id} className={"me-msg " + m.role}>
                <div className="me-bubble" dangerouslySetInnerHTML={{ __html: m.html }} />
                {m.acts?.map((a) => <ActivityCard key={a.id} a={a} />)}
                {m.suggestions?.map((s, i) => <SuggestionCard key={i} s={s} open={i === 0} />)}
                {m.seeSomeone ? <div className="me-alert">{m.seeSomeone}</div> : null}
                {m.footnote ? <div className="muted small">{m.footnote}</div> : null}
                {m.sources?.length ? <div className="muted small">Drawn from: {m.sources.join(", ")}</div> : null}
                {m.helpline ? <Helplines title={m.helpline} /> : null}
                {m.notice ? <div className="me-notice">{m.notice}</div> : null}
              </div>
            ))}
          </div>
          {showStarter ? (
            <div className="me-starter" aria-label="Conversation starters">
              {STARTERS.map(([label, prompt]) => (
                <button key={label} type="button" onClick={() => void send(prompt)}>
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="me-helprow">
            <button type="button" className="ghost" onClick={() => void suggestHelp()} disabled={busy}>
              Suggest what might help
            </button>
            <span className="muted small">Ideas based on what you have told me</span>
          </div>
          <form
            className="me-composer"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {dict ? (
              <button type="button" className="ghost me-mic" aria-pressed={micState !== "idle"} aria-label="Speak your message" onClick={toggleMic}>
                {micState === "listening" ? "Listening..." : micState === "starting" ? "Starting..." : "Speak"}
              </button>
            ) : null}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Type or tap Speak. Try saying: open activities"
              aria-label="Message"
            />
            <button type="submit" disabled={busy}>
              Send
            </button>
          </form>
          <div className="me-foot muted small">
            <div className="me-opts">
              {dict ? (
                <label>
                  <input type="checkbox" checked={autosend} onChange={(e) => setAutosend(e.target.checked)} /> Send when I stop talking
                </label>
              ) : null}
              {ttsAvailable ? (
                <label>
                  <input type="checkbox" checked={ttsOn} onChange={(e) => setTtsOn(e.target.checked)} /> Read replies aloud
                </label>
              ) : null}
            </div>
            <div>MindEase is an AI companion, not a therapist or a substitute for professional care.</div>
          </div>
        </main>

        <SidePanel
          tab={tab}
          setTab={setTab}
          mem={mem}
          setMem={setMem}
          onErase={() => {
            setMemState({ consent: false, notes: [] });
            resetChat(true);
          }}
          theme={theme}
          setTheme={setThemeState}
          open={asideOpen}
          onClose={() => setAsideOpen(false)}
        />
      </div>
    </div>
  );
}

