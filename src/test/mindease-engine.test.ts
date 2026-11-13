import { describe, expect, it } from "vitest";

import { assess, extractNotes, parseCommand, recall, retrieve, route, suggest } from "@/lib/mindease/engine";

describe("MindEase safety and routing rules", () => {
  it("treats mentions of suicide or self-harm as a crisis", () => {
    expect(assess("I want to die")).toBe("crisis");
    expect(assess("i keep thinking about self-harm")).toBe("crisis");
  });
  it("flags hopelessness as elevated, not crisis", () => {
    expect(assess("I feel hopeless about everything")).toBe("elevated");
  });
  it("leaves ordinary stress at no risk level", () => {
    expect(assess("I have an exam tomorrow")).toBe("none");
  });
  it("routes activity and advice requests", () => {
    expect(route("Can we try a short calming activity?")).toBe("activity");
    expect(route("any advice for sleeping before exams")).toBe("resource");
    expect(route("I miss home")).toBe("talk");
  });
  it("finds the sleep guide for sleep questions", () => {
    expect(retrieve("cannot sleep before exams", 1)[0].title).toBe("Sleep for Students");
  });
  it("only suggests activities matching the chosen mood", () => {
    for (const a of suggest("lonely", 4)) expect(a.moods).toContain("lonely");
  });
});

describe("MindEase commands", () => {
  it("opens tools tabs by voice or text", () => {
    expect(parseCommand("open activities")).toEqual({ kind: "open", tab: "activities", label: "activities" });
    expect(parseCommand("Turn on memory.")).toEqual({ kind: "memory", on: true });
    expect(parseCommand("I feel stressed about my project and want to talk")).toBeNull();
  });
});

describe("MindEase memory is opt-in", () => {
  it("does not recall anything while memory is off", () => {
    expect(recall({ consent: false, notes: [{ id: 1, text: "I have exams next week" }] }, "exams")).toBeNull();
  });
  it("extracts exam notes from what the student says", () => {
    const notes = extractNotes([], "I have an exam on Monday and I'm scared.");
    expect(notes[0].text).toBe("I have an exam on Monday and I'm scared");
  });
});
