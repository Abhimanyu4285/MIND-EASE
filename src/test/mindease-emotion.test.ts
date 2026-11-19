import { describe, expect, it } from "vitest";

import { colorStep, medians, upsertCheckIn, yearGrid, type CheckIn } from "@/lib/mindease/checkins";
import { interpret, readMessage } from "@/lib/mindease/emotion";
import { craftReply, parseCommand } from "@/lib/mindease/engine";

const read = (text: string, history: string[] = [], extra: Partial<Parameters<typeof interpret>[0]> = {}) =>
  interpret({ text, reading: readMessage(text), history: history.map(readMessage), turn: history.length, ...extra });

const ci = (date: string, mood: number, anxiety = 2, energy = 2): CheckIn => ({ date, mood, anxiety, energy, tags: [], at: 0 });

describe("Emotional read does not assume feelings from text alone", () => {
  it("does not name a feeling for 'I'm fine' and asks instead", () => {
    const r = read("I'm fine");
    expect(r.label).toBeNull();
    expect(r.tone).toContain("minimising");
    expect(r.shouldAsk).toBe(true);
  });
  it("does not read a topic like an exam as an emotion", () => {
    const r = read("I have an exam tomorrow");
    expect(r.label).toBeNull();
    expect(r.shouldAsk).toBe(false);
  });
  it("ignores negated feelings", () => {
    const labels = readMessage("I'm not stressed, just tired").candidates.map((c) => c.label);
    expect(labels).toContain("tired");
    expect(labels).not.toContain("stressed");
  });
  it("trusts a feeling the student states directly", () => {
    const r = read("I feel so lonely in the hostel");
    expect(r.label).toBe("lonely");
    expect(r.source).toBe("their words");
    expect(r.confidence).not.toBe("low");
  });
  it("asks when words and today's check-in disagree", () => {
    const r = read("I'm good lol", [], { checkIn: ci("2026-11-19", 1) });
    expect(r.label).toBeNull();
    expect(r.shouldAsk).toBe(true);
  });
  it("notices when replies suddenly get much shorter", () => {
    const r = read("ok", [
      "My roommate and I had a fight about the room and I keep replaying it in my head tonight",
      "I tried talking to him after dinner but he just put headphones on and ignored me completely",
    ]);
    expect(r.shifts).toContain("replies have become much shorter");
    expect(r.shouldAsk).toBe(true);
  });
  it("offline reply asks rather than reflects a guessed feeling when unsure", () => {
    const reply = craftReply({ intent: "talk", mood: null, acts: [], rag: [], turn: 0, recalled: null, ask: "How are you really doing?" });
    expect(reply).toContain("How are you really doing?");
  });
});

describe("Mood check-ins", () => {
  it("keeps one check-in per day", () => {
    const list = upsertCheckIn([ci("2026-11-19", 2)], ci("2026-11-19", 5));
    expect(list).toHaveLength(1);
    expect(list[0]?.mood).toBe(5);
  });
  it("computes 14-day medians and ignores older days", () => {
    const list = [ci("2026-11-19", 2), ci("2026-11-18", 4), ci("2026-11-10", 3), ci("2026-10-01", 0)];
    const m = medians(list, 14, new Date(2026, 10, 19));
    expect(m.count).toBe(3);
    expect(m.mood).toBe(3);
  });
  it("shows high anxiety in the hardest colour", () => {
    expect(colorStep("anxiety", 4)).toBe(0);
    expect(colorStep("mood", 6)).toBe(6);
  });
  it("marks days that do not exist in the year view", () => {
    const g = yearGrid([ci("2026-02-03", 4)], 2026, "mood");
    expect(g[1]?.[2]).toBe(4);
    expect(g[1]?.[29]).toBeUndefined();
    expect(g[0]?.[0]).toBeNull();
  });
  it("opens the mood tab by command", () => {
    expect(parseCommand("open mood")).toMatchObject({ kind: "open", tab: "mood" });
  });
});
