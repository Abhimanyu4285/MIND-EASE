import { HELPLINES, type Activity } from "@/lib/mindease/data";

export type Suggestion = { title?: string; kind?: string; why?: string; steps?: string[]; minutes?: number };

export function Contact({ value }: { value: string }) {
  return /^https?:\/\//.test(value) ? (
    <a href={value} target="_blank" rel="noreferrer">
      {value}
    </a>
  ) : (
    <>{value}</>
  );
}

export function Helplines({ title }: { title: string }) {
  return (
    <div className="me-alert" role="alert">
      <strong>{title}</strong>
      <ul>
        {HELPLINES.map((h) => (
          <li key={h.name}>
            <b>{h.name}:</b> <Contact value={h.contact} /> <span className="muted">{h.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityCard({ a }: { a: Activity }) {
  return (
    <details className="me-card">
      <summary>
        <span>
          {a.title}
          <br />
          <span className="muted small" style={{ fontWeight: 400 }}>
            {a.type} · about {a.minutes} min
          </span>
        </span>
      </summary>
      <ol>
        {a.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </details>
  );
}

export function SuggestionCard({ s, open }: { s: Suggestion; open: boolean }) {
  const steps = Array.isArray(s.steps) ? s.steps.slice(0, 4) : [];
  const mins = Number(s.minutes) > 0 ? ` · about ${Math.round(Number(s.minutes))} min` : "";
  return (
    <details className="me-card" open={open}>
      <summary>
        <span>
          {String(s.title || "Try this")}
          <br />
          <span className="muted small" style={{ fontWeight: 400 }}>
            {String(s.kind || "idea")}
            {mins}
          </span>
        </span>
      </summary>
      {s.why ? <p>{String(s.why)}</p> : null}
      {steps.length ? (
        <ol>
          {steps.map((x, i) => (
            <li key={i}>{String(x)}</li>
          ))}
        </ol>
      ) : null}
    </details>
  );
}
