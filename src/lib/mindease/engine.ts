/* Offline companion engine: pure logic ported from the original MindEase app. */
import { ACTIVITIES, CRISIS, ELEVATED, FOLLOW, MOODS, REFLECT, RESOURCES, type Activity } from "./data";

/* ============ RAG (BM25) ============ */
const STOP = new Set(
  "a an the and or but if of to in on at for with is are was were be been it this that i me my you your we they do does did have has had not no so as by from about just can will would should could into than then there".split(
    " ",
  ),
);
export const tok = (t: string) => (t.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => !STOP.has(w) && w.length > 1);

export type Chunk = { title: string; section: string; text: string; toks: string[] };
const CHUNKS: Chunk[] = [];
RESOURCES.forEach((r) =>
  r.sections.forEach(([h, t]) => CHUNKS.push({ title: r.title, section: h, text: t, toks: tok(r.title + " " + h + " " + r.tags + " " + t) })),
);
const DF: Record<string, number> = {};
CHUNKS.forEach((c) => new Set(c.toks).forEach((w) => (DF[w] = (DF[w] || 0) + 1)));
const AVG = CHUNKS.reduce((s, c) => s + c.toks.length, 0) / CHUNKS.length;

export function retrieve(q: string, k = 3): Chunk[] {
  const qt = tok(q);
  const n = CHUNKS.length;
  const out: [number, Chunk][] = [];
  CHUNKS.forEach((c) => {
    const tf: Record<string, number> = {};
    c.toks.forEach((w) => (tf[w] = (tf[w] || 0) + 1));
    let s = 0;
    qt.forEach((w) => {
      const f = tf[w];
      if (!f) return;
      const df = DF[w] ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      s += (idf * (f * 2.5)) / (f + 1.5 * (0.25 + (0.75 * c.toks.length) / AVG));
    });
    if (s > 0) out.push([s, c]);
  });
  return out
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .map((x) => x[1]);
}

/* ============ AGENT HELPERS ============ */
export type Level = "crisis" | "elevated" | "none";
export const assess = (t: string): Level => (CRISIS.some((r) => r.test(t)) ? "crisis" : ELEVATED.some((r) => r.test(t)) ? "elevated" : "none");

const ACT_RE =
  /\b(activity|activities|exercise|exercises|breathing|breathe|ground(ing)?|story|game|micro[- ]?task|something to do|calm me|help me relax|distract me|try something|journal(l)?ing)\b/i;
const RES_RE =
  /\b(resources?|tips?|techniques?|guide|article|read(ing)? about|how (do|can|to)|what should i do|any advice|advice|strategies|strategy|ways to|help me (with|sleep|study|focus|cope|deal))\b/i;
export type Intent = "activity" | "resource" | "talk";
export const route = (t: string): Intent => (ACT_RE.test(t) ? "activity" : RES_RE.test(t) ? "resource" : "talk");

export function detectMood(t: string): string | null {
  t = t.toLowerCase();
  for (const m in MOODS) if ((MOODS[m] ?? []).some((k) => t.includes(k))) return m;
  return null;
}

export function suggest(mood: string | null, n: number, rand: () => number = Math.random): Activity[] {
  let pool = ACTIVITIES.slice();
  if (mood) {
    const m = pool.filter((a) => a.moods.includes(mood));
    if (m.length) pool = m;
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, n);
}

const pick = (a: string[] | undefined, s: number) => (a && a.length ? (a[s % a.length] ?? "") : "");

export function craftReply(ctx: { intent: Intent; mood: string | null; acts: Activity[]; rag: Chunk[]; turn: number; recalled: string | null }) {
  const { intent, mood, acts, rag, turn, recalled } = ctx;
  if (intent === "activity" && acts.length)
    return (
      "Happy to. Here are a couple of things we could try, only if they feel right:\n" +
      acts.map((a) => `- **${a.title}** (about ${a.minutes} min)`).join("\n") +
      "\n\nWant to try one together, or would you rather keep talking?"
    );
  const top = rag[0];
  if (intent === "resource" && top) {
    let b = top.text;
    if (b.length > 420) b = b.slice(0, 420).replace(/\s+\S*$/, "") + "...";
    return `Here is something that might help, from *${top.title}*:\n\n${b}\n\nDoes that fit your situation, or should we look at it differently?`;
  }
  const m = mood || "none";
  let r = pick(REFLECT[m], turn);
  if (recalled) r += ` Earlier you mentioned: ${recalled.toLowerCase()}. Is that still part of this?`;
  else r += " " + pick(FOLLOW[m], turn);
  return r;
}

export function contextFor(mood: string | null, rag: Chunk[], acts: Activity[], mems: string[], level: Level) {
  const p: string[] = [];
  if (mems.length) p.push("Things the student chose to let you remember (use only if relevant, never list them): " + mems.join("; "));
  if (mood) p.push("A keyword check guessed the mood might be: " + mood + ". It may be wrong; trust their actual words.");
  if (rag.length)
    p.push(
      "The student wants practical help. Vetted material you may paraphrase warmly, in your own words and only the part that fits:\n" +
        rag.map((c) => `[${c.title} / ${c.section}] ${c.text}`).join("\n"),
    );
  if (acts.length)
    p.push(
      "They asked for an activity. The app shows these cards under your reply, so just invite them briefly to pick one: " +
        acts.map((a) => a.title).join(", "),
    );
  if (level === "elevated")
    p.push("They may be in serious distress. Stay warm, do not minimise it, and gently encourage reaching a real person; Tele-MANAS 14416 is free and 24/7.");
  return p.length ? "\n\n[App context for you only, not from the student. Never mention it.]\n" + p.join("\n") : "";
}

/* ============ MEMORY (opt-in, stored only in this browser) ============ */
export type Note = { id: number; text: string };
export type Memory = { consent: boolean; notes: Note[] };

const NOTE_RX = [
  /\bI(?:'m| am) (?:in|studying|preparing for|worried about|stressed about|struggling with|homesick|new to)\b[^.!?\n]{3,100}/i,
  /\bI have (?:an? |my )?(?:exam|exams|test|deadline|project|interview|presentation)\b[^.!?\n]{0,80}/i,
  /\bmy (?:exam|exams|deadline|project|roommate|parents|friend|friends|hostel|college|semester)\b[^.!?\n]{3,100}/i,
  /\bI (?:feel|felt) (?:lonely|alone|tired|stressed|anxious|overwhelmed)\b[^.!?\n]{0,80}/i,
];

export function addNote(notes: Note[], raw: string): Note[] {
  const n = String(raw).replace(/\s+/g, " ").trim().slice(0, 140);
  if (n.length > 8 && !notes.some((x) => x.text.toLowerCase() === n.toLowerCase())) return [{ id: Date.now() + Math.random(), text: n }, ...notes];
  return notes;
}

/** Rule-based note extraction (offline). Returns the updated notes list, capped at 50. */
export function extractNotes(notes: Note[], text: string): Note[] {
  let out = notes;
  NOTE_RX.forEach((rx) => {
    const m = text.match(rx);
    if (!m) return;
    let n = m[0].replace(/\s+/g, " ").trim().slice(0, 140);
    n = n.charAt(0).toUpperCase() + n.slice(1);
    out = addNote(out, n);
  });
  return out.slice(0, 50);
}

export function recall(mem: Memory, text: string): string | null {
  if (!mem.consent) return null;
  const q = new Set(tok(text));
  const hit = mem.notes.find((n) => tok(n.text).some((w) => q.has(w)));
  return hit ? hit.text : null;
}

/* ============ Spoken or typed commands ============ */
export type TabKey = "memory" | "activities" | "resources" | "support" | "theme";
export type Command =
  | { kind: "reset" }
  | { kind: "open"; tab: TabKey | null; label: string }
  | { kind: "memory"; on: boolean }
  | { kind: "suggest" }
  | { kind: "stopSpeaking" }
  | { kind: "readAloud" };

export function parseCommand(t: string): Command | null {
  const s = t.toLowerCase().replace(/[.!?,]+/g, "").trim();
  if (s.length > 45) return null;
  let m: RegExpMatchArray | null;
  if (/^(start a )?(new chat|start over|clear (the )?chat)$/.test(s)) return { kind: "reset" };
  if ((m = s.match(/^(?:open|show|go to)(?: me)?(?: the)? (memory|activities|resources|support|get support|theme|tools)$/))) {
    const w = m[1] ?? "";
    return { kind: "open", tab: w === "get support" ? "support" : w === "tools" ? null : (w as TabKey), label: w === "tools" ? "the tools" : w };
  }
  if ((m = s.match(/^(?:turn|switch) (on|off) (?:my )?memory$/))) return { kind: "memory", on: m[1] === "on" };
  if (/^(suggest|give me suggestions|what can help|what might help|what should i do)/.test(s) && s.length < 40) return { kind: "suggest" };
  if (/^(stop (reading|talking|speaking)|be quiet)$/.test(s)) return { kind: "stopSpeaking" };
  if (/^(read (replies )?aloud|turn on voice)$/.test(s)) return { kind: "readAloud" };
  return null;
}

/* ============ Markdown-lite renderer (escapes everything first) ============ */
export const esc = (s: unknown) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export function inline(s: string) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])_([^_]+)_/g, "$1<em>$2</em>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/(https?:\/\/[^\s)<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}
export function md(t: string) {
  let out = "";
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out += "<ul>" + list.map((l) => "<li>" + inline(l) + "</li>").join("") + "</ul>";
      list = [];
    }
  };
  t.split("\n").forEach((l) => {
    if (/^\s*[-•]\s+/.test(l)) list.push(l.replace(/^\s*[-•]\s+/, ""));
    else {
      flush();
      if (l.trim()) out += "<p>" + inline(l) + "</p>";
    }
  });
  flush();
  return out;
}

export function parseJSONLoose(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    /* fall through */
  }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1] ?? "");
    } catch {
      /* fall through */
    }
  }
  const a = t.search(/[[{]/);
  const b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(t.slice(a, b + 1));
    } catch {
      /* fall through */
    }
  }
  throw { code: "invalid_json", message: "no JSON in reply", text: t };
}
