import { useEffect, useState } from "react";

import { ACTIVITIES } from "@/lib/mindease/data";
import { retrieve, suggest, type Chunk, type Memory, type TabKey } from "@/lib/mindease/engine";
import { ACCENTS, BGS, DEF_T, FONTS, type Theme } from "@/lib/mindease/theme";
import { ActivityCard, Helplines } from "./parts";

const TABS: Record<TabKey, string> = { memory: "Memory", activities: "Activities", resources: "Resources", support: "Support", theme: "Theme" };
const MOOD_CHIPS = ["anxious", "stressed", "overwhelmed", "tired", "unmotivated", "sad", "lonely"];

type Props = {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  mem: Memory;
  setMem: (fn: (m: Memory) => Memory) => void;
  onErase: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  open: boolean;
  onClose: () => void;
};

export function SidePanel({ tab, setTab, mem, setMem, onErase, theme, setTheme, open, onClose }: Props) {
  const [actMood, setActMood] = useState("");
  const [actItems, setActItems] = useState(() => ACTIVITIES.slice(0, 4));
  const [resQ, setResQ] = useState("");
  const [resOut, setResOut] = useState<Chunk[] | null>(null);

  useEffect(() => setActItems(suggest(null, 4)), []);

  const seg = <K extends keyof Theme>(k: K, opts: [Theme[K], string][]) => (
    <div className="me-chips">
      {opts.map(([v, l]) => (
        <button key={String(v)} type="button" className="me-chip" aria-pressed={String(theme[k]) === String(v)} onClick={() => setTheme({ ...theme, [k]: v })}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <aside className={"me-aside" + (open ? " open" : "")} aria-label="Tools">
      <div className="me-row me-mobile-only" style={{ justifyContent: "flex-end" }}>
        <button className="ghost" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <nav className="me-tabs" role="tablist">
        {(Object.keys(TABS) as TabKey[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {TABS[k]}
          </button>
        ))}
      </nav>
      <div className="me-panel" role="tabpanel">
        {tab === "memory" && (
          <>
            <h3>Memory</h3>
            <p className="muted small">
              Off by default. When on, MindEase keeps short notes (like "has exams next week") so it can follow up later. Notes stay in this browser only, and you can delete
              them or switch this off any time.
            </p>
            <label className="me-switch">
              <input type="checkbox" checked={mem.consent} onChange={(e) => setMem((m) => ({ ...m, consent: e.target.checked }))} />
              <span>{mem.consent ? "Memory is ON" : "Memory is OFF"}</span>
            </label>
            {mem.notes.length ? (
              <ul className="me-mem">
                {mem.notes.map((n) => (
                  <li key={n.id}>
                    <span>{n.text}</span>
                    <button type="button" aria-label="Delete note" onClick={() => setMem((m) => ({ ...m, notes: m.notes.filter((x) => x.id !== n.id) }))}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">{mem.consent ? "Nothing remembered yet. Try telling me about an exam or a deadline." : "Nothing is being stored."}</p>
            )}
            <div className="me-row">
              {mem.notes.length ? (
                <button className="ghost" type="button" onClick={() => setMem((m) => ({ ...m, notes: [] }))}>
                  Clear all notes
                </button>
              ) : null}
              <button className="danger" type="button" onClick={onErase}>
                Erase all my data
              </button>
            </div>
          </>
        )}

        {tab === "activities" && (
          <>
            <h3>Activities</h3>
            <p className="muted small">Optional. Pick one only if it feels right. Conversation always comes first.</p>
            <div className="me-chips">
              {MOOD_CHIPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="me-chip"
                  aria-pressed={actMood === m}
                  onClick={() => {
                    const next = actMood === m ? "" : m;
                    setActMood(next);
                    setActItems(suggest(next || null, 4));
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            {actItems.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
            <div className="me-row">
              <button className="ghost" type="button" onClick={() => setActItems(suggest(actMood || null, 4))}>
                Show different ones
              </button>
            </div>
          </>
        )}

        {tab === "resources" && (
          <>
            <h3>Resource navigator</h3>
            <p className="muted small">Search curated guides on exams, loneliness, sleep, burnout and anxiety.</p>
            <form
              className="me-row"
              onSubmit={(e) => {
                e.preventDefault();
                setResOut(resQ.trim().length > 1 ? retrieve(resQ, 4) : null);
              }}
            >
              <input value={resQ} onChange={(e) => setResQ(e.target.value)} placeholder="e.g. cannot sleep before exams" aria-label="Search resources" />
              <button type="submit">Search</button>
            </form>
            {resOut === null ? null : resOut.length ? (
              resOut.map((c) => (
                <div className="me-card" key={c.title + c.section}>
                  <strong>{c.title}</strong>
                  <div className="muted small">{c.section}</div>
                  <p>{c.text}</p>
                </div>
              ))
            ) : (
              <p className="muted small">No match. Try different words.</p>
            )}
          </>
        )}

        {tab === "support" && (
          <>
            <h3>Talk to a person</h3>
            <p className="muted small">MindEase is an AI companion, not a therapist. If things feel heavy, a real person can help.</p>
            <Helplines title="Support lines" />
            <p className="muted small">Please verify numbers and hours before relying on them.</p>
          </>
        )}

        {tab === "theme" && (
          <>
            <h3>Theme</h3>
            <p className="muted small">Make MindEase comfortable for you. Your choices are saved in this browser.</p>
            <h4>Mode</h4>
            {seg("mode", [
              ["system", "Follow device"],
              ["light", "Light"],
              ["dark", "Dark"],
            ])}
            <h4>Accent colour</h4>
            <div className="me-sws">
              {ACCENTS.map(([n, c]) => (
                <button
                  key={c}
                  type="button"
                  className="me-sw"
                  style={{ background: c }}
                  aria-label={n}
                  title={n}
                  aria-pressed={String(theme.accent).toLowerCase() === c}
                  onClick={() => setTheme({ ...theme, accent: c })}
                />
              ))}
              <label className="me-custom">
                Custom <input type="color" value={theme.accent} onChange={(e) => setTheme({ ...theme, accent: e.target.value })} />
              </label>
            </div>
            <h4>Background</h4>
            {seg(
              "bg",
              Object.keys(BGS).map((k) => [k, BGS[k].name] as [string, string]),
            )}
            <h4>Text size</h4>
            {seg("size", [
              [14, "Small"],
              [15, "Medium"],
              [17, "Large"],
              [19, "Extra large"],
            ])}
            <h4>Font</h4>
            {seg(
              "font",
              Object.keys(FONTS).map((k) => [k, FONTS[k][0]] as [string, string]),
            )}
            <h4>Corners</h4>
            {seg("round", [
              ["sharp", "Sharp"],
              ["soft", "Soft"],
              ["round", "Round"],
            ])}
            <div className="me-row">
              <button className="ghost" type="button" onClick={() => setTheme({ ...DEF_T })}>
                Reset to default
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
