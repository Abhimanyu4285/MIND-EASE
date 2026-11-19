/* Mood check-ins: self-reported, stored only in this browser. Pure helpers, testable. */
export type Metric = "mood" | "anxiety" | "energy";
export type CheckIn = { date: string; mood: number; anxiety: number; energy: number; tags: string[]; at: number };
export type MoodStore = { entries: CheckIn[]; showRead: boolean };

export const MOOD_KEY = "mindease_mood";
export const EMPTY_MOOD: MoodStore = { entries: [], showRead: true };
export const METRICS: Record<Metric, { label: string; max: number; higherIsBetter: boolean; low: string; high: string }> = {
  mood: { label: "Mood", max: 6, higherIsBetter: true, low: "Very low", high: "Great" },
  anxiety: { label: "Anxiety", max: 4, higherIsBetter: false, low: "Calm", high: "Very anxious" },
  energy: { label: "Energy", max: 4, higherIsBetter: true, low: "Drained", high: "Energised" },
};
export const MOOD_WORDS = ["very low", "low", "somewhat low", "okay", "fairly good", "good", "great"];
export const CHECKIN_TAGS = ["studies", "sleep", "friends", "family", "health", "money", "home"];

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** One check-in per day: saving again on the same day replaces it. Newest first. */
export function upsertCheckIn(list: CheckIn[], entry: CheckIn): CheckIn[] {
  return [entry, ...list.filter((c) => c.date !== entry.date)].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const todayCheckIn = (list: CheckIn[], now: Date = new Date()) => list.find((c) => c.date === dayKey(now)) ?? null;

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : ((s[mid - 1]! + s[mid]!) / 2);
}

export function medians(list: CheckIn[], days = 14, now: Date = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const from = dayKey(start);
  const to = dayKey(end);
  const inRange = list.filter((c) => c.date >= from && c.date <= to);
  return {
    from: start,
    to: end,
    count: inRange.length,
    mood: median(inRange.map((c) => c.mood)),
    anxiety: median(inRange.map((c) => c.anxiety)),
    energy: median(inRange.map((c) => c.energy)),
  };
}

/** Colour step 0 (hard) .. 6 (good) for any metric, so anxiety reads red when high. */
export function colorStep(metric: Metric, value: number): number {
  const m = METRICS[metric];
  const step = Math.round((value / m.max) * 6);
  return m.higherIsBetter ? step : 6 - step;
}

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** 12 months x 31 days. undefined = date does not exist, null = no check-in. */
export function yearGrid(list: CheckIn[], year: number, metric: Metric): (number | null | undefined)[][] {
  const byDate = new Map(list.map((c) => [c.date, c]));
  return Array.from({ length: 12 }, (_, m) =>
    Array.from({ length: 31 }, (_, d) => {
      if (d + 1 > daysInMonth(year, m)) return undefined;
      const c = byDate.get(`${year}-${pad(m + 1)}-${pad(d + 1)}`);
      return c ? c[metric] : null;
    }),
  );
}

export function checkInSummary(c: CheckIn): string {
  return `mood ${c.mood}/6 (${MOOD_WORDS[c.mood] ?? ""}), anxiety ${c.anxiety}/4, energy ${c.energy}/4${c.tags.length ? ", about: " + c.tags.join(", ") : ""}`;
}

export function toCSV(list: CheckIn[]): string {
  const rows = [...list].sort((a, b) => (a.date < b.date ? -1 : 1)).map((c) => [c.date, c.mood, c.anxiety, c.energy, `"${c.tags.join(" ")}"`].join(","));
  return ["date,mood(0-6),anxiety(0-4),energy(0-4),tags", ...rows].join("\n");
}

export function loadMood(raw: string | null): MoodStore {
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && Array.isArray(v.entries)) return { entries: v.entries, showRead: v.showRead !== false };
  } catch {
    /* ignore */
  }
  return { ...EMPTY_MOOD };
}
