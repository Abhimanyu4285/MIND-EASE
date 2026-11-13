/* Browser side of the AI: streams text from /api/chat (the key stays on the server). */
import { parseJSONLoose } from "./engine";

export type AiError = { code: string; message: string; text?: string | undefined };
export type AiInput = string | { role: "user" | "assistant"; content: string }[];

export async function sample(
  input: AiInput,
  opts: { modelTier?: "quick" | "default"; onText?: (p: { text: string; delta: string }) => void; signal?: AbortSignal } = {},
): Promise<{ text: string }> {
  const body = typeof input === "string" ? { prompt: input } : { messages: input };
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, tier: opts.modelTier || "quick" }),
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
  } catch (e) {
    throw { code: (e as Error)?.name === "AbortError" ? "cancelled" : "upstream_error", message: "Could not reach the AI service." } satisfies AiError;
  }
  if (!res.ok) {
    let message = "HTTP " + res.status;
    try {
      const j = await res.json();
      if (j?.error) message = String(j.error);
    } catch {
      /* ignore */
    }
    const code =
      res.status === 429 ? "rate_limited" : res.status === 402 ? "credits" : res.status === 403 ? "denied" : res.status === 404 ? "sampling_disabled" : "upstream_error";
    throw { code, message } satisfies AiError;
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const delta = dec.decode(value, { stream: true });
      if (!delta) continue;
      text += delta;
      opts.onText?.({ text, delta });
    }
  } catch (e) {
    throw { code: (e as Error)?.name === "AbortError" ? "cancelled" : "upstream_error", message: String(e), text: text || undefined } satisfies AiError;
  }
  if (!text.trim()) throw { code: "empty_completion", message: "empty reply" } satisfies AiError;
  return { text };
}

export async function sampleJSON(input: AiInput, opts: { modelTier?: "quick" | "default" } = {}) {
  return parseJSONLoose((await sample(input, opts)).text);
}

/** Errors after which cloud AI should stop being attempted until the page reloads. */
export const DEAD_CODES = ["denied", "credits", "sampling_disabled"];
