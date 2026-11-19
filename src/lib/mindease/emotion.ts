/* Emotional intelligence engine: pure, offline, testable.
   Principle: words alone are weak evidence. We read tone, context and change over time,
   weigh what the student tells us directly (check-ins, "I feel...") above any guess,
   and when the evidence is thin we ask instead of naming a feeling. */
import { checkInSummary, type CheckIn } from "./checkins";

export type Feeling = "anxious" | "stressed" | "overwhelmed" | "tired" | "unmotivated" | "sad" | "lonely" | "stuck" | "frustrated" | "okay" | "good";
export type Tone = "intense" | "hesitant" | "brief" | "minimising" | "mixed" | "light" | "questioning" | "trailing";
export type Confidence = "low" | "medium" | "high";

export const FEELING_CHOICES: Feeling[] = ["stressed", "anxious", "sad", "lonely", "tired", "frustrated", "okay", "good"];

const VALENCE: Record<Feeling, number> = {
  anxious: -0.6, stressed: -0.6, overwhelmed: -0.8, tired: -0.4, unmotivated: -0.5, sad: -0.8, lonely: -0.7, stuck: -0.5, frustrated: -0.6, okay: 0.2, good: 0.8,
};

/* Word stems. Short words must match whole words; longer ones may be stems ("overwhelm" -> "overwhelmed"). */
const LEX: Record<Feeling, string[]> = {
  anxious: ["anxious", "anxiety", "nervous", "worried", "worry", "worrying", "scared", "afraid", "panic", "panicking", "on edge", "uneasy", "dread", "freaking out"],
  stressed: ["stress", "stressed", "stressful", "under pressure", "pressured", "tense"],
  overwhelmed: ["overwhelm", "too much", "drowning", "can't cope", "cannot cope", "can't handle", "swamped"],
  tired: ["tired", "exhausted", "drained", "burnt out", "burned out", "burnout", "sleepy", "no energy", "worn out", "fatigue"],
  unmotivated: ["unmotivated", "no motivation", "can't focus", "cannot focus", "procrastinat", "lazy", "can't be bothered", "can't start"],
  sad: ["sad", "down", "low", "crying", "cried", "cry", "empty", "upset", "heartbroken", "miserable", "hurt", "depressed"],
  lonely: ["lonely", "alone", "isolated", "no friends", "homesick", "left out", "nobody to talk"],
  stuck: ["stuck", "lost", "directionless", "confused", "no idea what to do"],
  frustrated: ["frustrat", "annoyed", "angry", "irritat", "fed up", "pissed", "mad at", "hate this"],
  okay: ["okay", "alright", "not bad", "fine"],
  good: ["happy", "good", "great", "better", "excited", "relieved", "proud", "calm", "amazing", "awesome"],
};

const EMOJI: [RegExp, Feeling][] = [
  [/[😭😢😞😔🙁☹💔🥺]/u, "sad"],
  [/[😰😟😬😨😥]/u, "anxious"],
  [/[😡😤🤬😠]/u, "frustrated"],
  [/[😴🥱😩😫]/u, "tired"],
  [/[😊🙂😄😁😃🥰❤💕✨]/u, "good"],
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]");
const MATCHERS: [Feeling, RegExp][] = (Object.keys(LEX) as Feeling[]).flatMap((f) =>
  LEX[f].map((k) => [f, new RegExp("\\b" + esc(k) + (k.length <= 5 || k.includes(" ") ? "\\b" : "\\w*"), "gi")] as [Feeling, RegExp]),
);

const NEGATE = /\b(not|never|no|isn'?t|aren'?t|wasn'?t|don'?t|doesn'?t|didn'?t|hardly|barely|nothing)\b|n['’]t\b/i;
const INTENSIFY = /\b(really|so|very|extremely|super|too|totally|completely|incredibly|insanely|literally)\b/i;
const HEDGE = /\b(kinda|kind of|sort of|sorta|a bit|a little|slightly|maybe|i guess|idk|i don'?t know|not sure|i think|probably|somewhat)\b/i;
const MINIMISE = /^\s*(i'?m |im |it'?s |its |all )?(fine|ok|okay|k|kk|whatever|nothing|nm|nvm|never ?mind|doesn'?t matter|it'?s nothing|same|meh)\s*[.!]*\s*$/i;
const LIGHT = /\b(lol|lmao|haha+|hehe|jk)\b/i;
const EXPLICIT = /\b(i\s+(feel|felt|am|'m|’m|have been|'ve been|’ve been|keep feeling)|i'?m\s+feeling|im|feeling)\b/i;

export type Reading = {
  candidates: { label: Feeling; score: number }[];
  tone: Tone[];
  valence: number;
  intensity: number;
  words: number;
  explicit: boolean;
};

/** Read one message: emotion candidates (with weights, never certainties) and tone signals. */
export function readMessage(text: string): Reading {
  const t = String(text || "");
  const words = (t.match(/\S+/g) || []).length;
  const scores: Partial<Record<Feeling, number>> = {};
  let explicit = false;
  let negatives = 0;
  let positives = 0;

  for (const [label, rx] of MATCHERS) {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(t))) {
      const before = t.slice(Math.max(0, m.index - 28), m.index);
      const lead = before.split(/[.!?,;]/).pop() ?? "";
      const negated = NEGATE.test(lead.split(/\s+/).slice(-4).join(" "));
      let w = 1;
      if (INTENSIFY.test(lead.split(/\s+/).slice(-2).join(" "))) w *= 1.5;
      if (HEDGE.test(lead)) w *= 0.6;
      if (EXPLICIT.test(lead)) {
        w *= 1.6;
        if (!negated) explicit = true;
      }
      if (negated) {
        // "not good" leans low; "not stressed" is not evidence of stress
        if (label === "good" || label === "okay") scores.sad = (scores.sad ?? 0) + 0.4 * w;
        continue;
      }
      scores[label] = (scores[label] ?? 0) + w;
      if (VALENCE[label] < 0) negatives++;
      else positives++;
    }
  }
  for (const [rx, label] of EMOJI)
    if (rx.test(t)) {
      scores[label] = (scores[label] ?? 0) + 0.7;
      if (VALENCE[label] < 0) negatives++;
      else positives++;
    }

  const tone: Tone[] = [];
  const letters = t.replace(/[^A-Za-z]/g, "");
  const capsWords = (t.match(/\b[A-Z]{2,}\b/g) || []).filter((w) => w !== "OK").length;
  const bangs = (t.match(/!/g) || []).length;
  let intensity = Math.min(1, bangs * 0.2 + capsWords * 0.25 + (/(.)\1{3,}/.test(t) ? 0.2 : 0) + (INTENSIFY.test(t) ? 0.2 : 0));
  if (letters.length > 8 && letters === letters.toUpperCase()) intensity = Math.min(1, intensity + 0.4);
  if (intensity >= 0.4) tone.push("intense");
  if (HEDGE.test(t)) tone.push("hesitant");
  if (MINIMISE.test(t)) tone.push("minimising");
  else if (words <= 3) tone.push("brief");
  if (LIGHT.test(t)) tone.push("light");
  if (/\?\s*$/.test(t)) tone.push("questioning");
  if (/(\.\.\.|…)\s*$/.test(t)) tone.push("trailing");
  if ((negatives && positives) || (LIGHT.test(t) && negatives)) tone.push("mixed");

  const candidates = (Object.entries(scores) as [Feeling, number][])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, score]) => ({ label, score: Math.round(score * 100) / 100 }));
  const total = candidates.reduce((s, c) => s + c.score, 0);
  const valence = total ? Math.max(-1, Math.min(1, candidates.reduce((s, c) => s + VALENCE[c.label] * c.score, 0) / total)) : 0;
  return { candidates, tone, valence, intensity, words, explicit };
}

export type SelfReport = { label: Feeling; turn: number };

export type Interpretation = {
  label: Feeling | null;
  possible: Feeling | null;
  confidence: Confidence;
  source: "their words" | "check-in" | "earlier message" | "text cues" | "none";
  tone: Tone[];
  shifts: string[];
  shouldAsk: boolean;
  askLine: string | null;
  note: string;
};

const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/** Compare this message with the student's earlier ones and describe meaningful changes. */
export function detectShifts(current: Reading, history: Reading[]): string[] {
  const prev = history.slice(-5);
  if (prev.length < 2) return [];
  const out: string[] = [];
  const baseWords = avg(prev.map((r) => r.words));
  const baseVal = avg(prev.map((r) => r.valence));
  const baseInt = avg(prev.map((r) => r.intensity));
  if (baseWords >= 10 && current.words <= Math.max(3, baseWords * 0.35)) out.push("replies have become much shorter");
  if (current.valence - baseVal <= -0.6) out.push("tone has turned heavier");
  if (current.valence - baseVal >= 0.6 && baseVal < 0) out.push("sounds a little lighter than before");
  if (current.intensity - baseInt >= 0.4) out.push("words have become more intense");
  return out;
}

/** Check-in as a soft prior: what the student reported earlier today, if anything stands out. */
function checkInLean(c: CheckIn | null): Feeling | null {
  if (!c) return null;
  if (c.anxiety >= 3) return "anxious";
  if (c.mood <= 1) return "sad";
  if (c.energy <= 1) return "tired";
  if (c.mood >= 5 && c.anxiety <= 1) return "good";
  return null;
}

export function interpret(input: { text: string; reading: Reading; history: Reading[]; selfReport?: SelfReport | null; turn: number; checkIn?: CheckIn | null }): Interpretation {
  const { reading, history, turn } = input;
  const checkIn = input.checkIn ?? null;
  const shifts = detectShifts(reading, history);
  const top = reading.candidates[0];
  const second = reading.candidates[1];
  const tone = reading.tone;
  const lean = checkInLean(checkIn);
  const recentSelf = input.selfReport && turn - input.selfReport.turn <= 6 ? input.selfReport : null;

  let label: Feeling | null = null;
  let possible: Feeling | null = top?.label ?? null;
  let confidence: Confidence = "low";
  let source: Interpretation["source"] = top ? "text cues" : "none";

  const ambiguous = tone.includes("mixed") || tone.includes("minimising") || (!!second && !!top && second.score >= top.score * 0.85 && VALENCE[second.label] * VALENCE[top.label] < 0);
  const mismatch = !!(lean && top && Math.sign(VALENCE[lean]) !== Math.sign(VALENCE[top.label]));

  if (top && reading.explicit && !ambiguous) {
    label = top.label;
    confidence = top.score >= 1.5 && !tone.includes("hesitant") ? "high" : "medium";
    source = "their words";
  } else if (top && !ambiguous && !mismatch && top.score >= 1.4) {
    label = top.label;
    confidence = "medium";
  } else if (!top && recentSelf) {
    label = recentSelf.label;
    possible = recentSelf.label;
    confidence = "medium";
    source = "earlier message";
  } else if (!top && lean && !tone.includes("minimising")) {
    possible = lean;
    source = "check-in";
  }
  if (label && lean && lean === label && confidence === "medium") confidence = "high";
  const masked = tone.includes("light") || tone.includes("brief") || tone.includes("minimising");
  if (mismatch && (source !== "their words" || masked)) {
    label = null;
    confidence = "low";
  }

  /* Ask only when there is something worth checking, not on every neutral message. */
  const hasCue = !!top || tone.includes("minimising") || tone.includes("intense") || tone.includes("trailing") || shifts.length > 0;
  const shouldAsk = hasCue && confidence === "low";

  let askLine: string | null = null;
  if (shouldAsk) {
    if (mismatch && lean && checkIn)
      askLine = `Earlier today your check-in looked more ${lean === "good" ? "positive" : "difficult"} than this sounds. Has something shifted, or am I reading it wrong?`;
    else if (tone.includes("minimising"))
      askLine = "That's okay. Text can hide a lot, so I'd rather ask than guess: how are you really doing right now?";
    else if (shifts.includes("replies have become much shorter"))
      askLine = "Your replies got shorter just now. That might mean nothing, but I'd rather check than assume: how are you doing?";
    else if (tone.includes("mixed")) askLine = "I'm hearing a bit of a mix, and I don't want to guess wrong. Which feels closest right now?";
    else askLine = "I don't want to assume how you're feeling from a few words. Which of these is closest, if any?";
  }

  const parts: string[] = [];
  if (label) parts.push(`${confidence === "high" ? "Likely" : "Possibly"} ${label} (from ${source}, confidence ${confidence}).`);
  else if (possible) parts.push(`Unclear. Weak hint of ${possible} from ${source}; do NOT state this as their feeling.`);
  else parts.push("No clear emotional signal; do not guess one.");
  if (tone.length) parts.push("Tone: " + tone.join(", ") + ".");
  if (shifts.length) parts.push("Change vs their earlier messages: " + shifts.join("; ") + ".");
  if (checkIn) parts.push("Their own check-in earlier today: " + checkInSummary(checkIn) + ".");
  if (recentSelf && source !== "earlier message") parts.push(`A few messages ago they said they feel ${recentSelf.label}.`);
  parts.push(
    shouldAsk
      ? "Guidance: text alone is not enough here. Reflect tentatively, never name a feeling as fact, and gently ask how they are actually feeling."
      : label
        ? "Guidance: reflect this back naturally and tentatively; let them correct you."
        : "Guidance: respond to what they said without labelling an emotion.",
  );
  return { label, possible, confidence, source, tone, shifts, shouldAsk, askLine, note: parts.join(" ") };
}

/** One-line, student-facing summary of the read, so they can correct it. Null when there is nothing worth showing. */
export function describeRead(i: Interpretation): string | null {
  const bits: string[] = [];
  if (i.label) bits.push((i.confidence === "high" ? "sounds " : "maybe ") + i.label);
  else if (i.possible && i.shouldAsk) bits.push("not sure how you feel");
  if (i.tone.includes("minimising")) bits.push("brief reply");
  else if (i.tone.includes("mixed")) bits.push("mixed signals");
  else if (i.tone.includes("intense")) bits.push("strong feelings");
  if (i.shifts[0]) bits.push(i.shifts[0]);
  return bits.length ? bits.join(" · ") : null;
}
