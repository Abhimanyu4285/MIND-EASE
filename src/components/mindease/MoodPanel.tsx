import { useState } from "react";

import {
  CHECKIN_TAGS,
  colorStep,
  dayKey,
  EMPTY_MOOD,
  medians,
  METRICS,
  MOOD_WORDS,
  toCSV,
  todayCheckIn,
  upsertCheckIn,
  yearGrid,
  type Metric,
  type MoodStore,
} from "@/lib/mindease/checkins";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
const swatch = (step: number) => ({ background: `var(--scale-${step})` });

function ScalePicker({ metric, value, onChange }: { metric: Metric; value: number; onChange: (v: number) => void }) {
  const m = METRICS[metric];
  return (
    <div className="me-scale-pick" role="radiogroup" aria-label={m.label}>
      {Array.from({ length: m.max + 1 }, (_, v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={`${m.label} ${v} of ${m.max}`}
          style={value === v ? swatch(colorStep(metric, v)) : undefined}
          onClick={() => onChange(v)}
        >
          <span className="me-dot" style={swatch(colorStep(metric, v))} />
          {v}
        </button>
      ))}
    </div>
  );
}

function MedianRow({ metric, value, count }: { metric: Metric; value: number | null; count: number }) {
  const m = METRICS[metric];
  return (
    <div className="me-median">
      <div className="me-median-head">
        <span>
          {m.label} <span className="muted small">(x{count})</span>
        </span>
        <span className="muted small">0-{m.max}</span>
      </div>
      <div className="me-median-bar">
        {Array.from({ length: m.max + 1 }, (_, v) => (
          <span key={v} style={swatch(colorStep(metric, v))} />
        ))}
        {value !== null ? (
          <span className="me-median-pin" style={{ left: `${(value / m.max) * 100}%`, ...swatch(colorStep(metric, value)) }}>
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function MoodPanel({ data, setData }: { data: MoodStore; setData: (fn: (d: MoodStore) => MoodStore) => void }) {
  const today = todayCheckIn(data.entries);
  const [draft, setDraft] = useState(() => ({ mood: today?.mood ?? 3, anxiety: today?.anxiety ?? 2, energy: today?.energy ?? 2, tags: today?.tags ?? [] }));
  const [saved, setSaved] = useState(false);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [metric, setMetric] = useState<Metric>("mood");
  const med = medians(data.entries);
  const grid = yearGrid(data.entries, year, metric);
  const max = METRICS[metric].max;

  function save() {
    setData((d) => ({ ...d, entries: upsertCheckIn(d.entries, { date: dayKey(), ...draft, at: Date.now() }) }));
    setSaved(true);
  }
  function exportCSV() {
    const url = URL.createObjectURL(new Blob([toCSV(data.entries)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindease-mood.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <h3>Mood check-in</h3>
      <p className="muted small">
        Words in a chat only tell part of the story. A quick check-in helps MindEase understand how you actually feel. Saved in this browser only.
      </p>

      <h4>Mood · {MOOD_WORDS[draft.mood]}</h4>
      <ScalePicker metric="mood" value={draft.mood} onChange={(v) => (setDraft({ ...draft, mood: v }), setSaved(false))} />
      <h4>Anxiety</h4>
      <ScalePicker metric="anxiety" value={draft.anxiety} onChange={(v) => (setDraft({ ...draft, anxiety: v }), setSaved(false))} />
      <h4>Energy</h4>
      <ScalePicker metric="energy" value={draft.energy} onChange={(v) => (setDraft({ ...draft, energy: v }), setSaved(false))} />
      <h4>What is it about? (optional)</h4>
      <div className="me-chips">
        {CHECKIN_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            className="me-chip"
            aria-pressed={draft.tags.includes(t)}
            onClick={() => {
              setDraft({ ...draft, tags: draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] });
              setSaved(false);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="me-row">
        <button type="button" onClick={save}>
          {today ? "Update today's check-in" : "Save check-in"}
        </button>
        {saved ? <span className="muted small">Saved. MindEase will keep this in mind today.</span> : null}
      </div>

      <div className="me-card">
        <div className="me-median-head">
          <strong>14 day medians</strong>
          <span className="muted small">
            {fmt(med.from)} - {fmt(med.to)}
          </span>
        </div>
        {med.count ? (
          (Object.keys(METRICS) as Metric[]).map((k) => <MedianRow key={k} metric={k} value={med[k]} count={med.count} />)
        ) : (
          <p className="muted small">No check-ins in the last 14 days yet.</p>
        )}
      </div>

      <div className="me-card">
        <div className="me-median-head">
          <button type="button" className="ghost me-yearnav" aria-label="Previous year" onClick={() => setYear(year - 1)}>
            ←
          </button>
          <strong>{year}</strong>
          <button type="button" className="ghost me-yearnav" aria-label="Next year" onClick={() => setYear(year + 1)}>
            →
          </button>
        </div>
        <div className="me-chips" role="tablist" aria-label="What to show">
          {(Object.keys(METRICS) as Metric[]).map((k) => (
            <button key={k} type="button" className="me-chip" aria-pressed={metric === k} onClick={() => setMetric(k)}>
              {METRICS[k].label}
            </button>
          ))}
        </div>
        <div className="me-year" aria-label={`${METRICS[metric].label} by day in ${year}`}>
          <span />
          {MONTHS.map((m, i) => (
            <span key={i} className="me-year-h">
              {m}
            </span>
          ))}
          {Array.from({ length: 31 }, (_, d) => (
            <div key={d} className="me-year-row">
              <span className="me-year-h">{d + 1}</span>
              {grid.map((col, mi) => {
                const v = col[d];
                if (v === undefined) return <span key={mi} />;
                return (
                  <span
                    key={mi}
                    className={"me-dot" + (v === null ? " none" : "")}
                    style={v === null ? undefined : swatch(colorStep(metric, v))}
                    title={v === null ? undefined : `${d + 1} ${MONTHS[mi]}: ${v}/${max}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="me-legend">
          {Array.from({ length: max + 1 }, (_, v) => (
            <span key={v} style={swatch(colorStep(metric, v))}>
              {v}
            </span>
          ))}
        </div>
        <div className="muted small">
          {METRICS[metric].low} (0) to {METRICS[metric].high} ({max})
        </div>
      </div>

      <h4>How MindEase reads you</h4>
      <label className="me-switch">
        <input type="checkbox" checked={data.showRead} onChange={(e) => setData((d) => ({ ...d, showRead: e.target.checked }))} />
        <span>Show my read under replies, so you can correct it</span>
      </label>
      <div className="me-row">
        {data.entries.length ? (
          <>
            <button className="ghost" type="button" onClick={exportCSV}>
              Export check-ins
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => window.confirm("Delete all mood check-ins from this browser?") && setData(() => ({ ...EMPTY_MOOD, showRead: data.showRead }))}
            >
              Clear check-ins
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}
