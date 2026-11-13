/* Server handler for POST /api/chat — same contract the original Netlify function had:
   body { prompt } or { messages: [{role, content}] }, optional tier "quick" | "default";
   responds with a plain-text stream of the reply. Errors return JSON { error } with the upstream status. */
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, streamText, type ModelMessage } from "ai";

import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const BASE_INSTRUCTIONS =
  "You are the AI behind MindEase, a supportive wellbeing companion app for college students. Follow the app's instructions in the conversation. Never provide methods or instructions for self-harm; if someone may be in danger, encourage them to contact a trusted person, India emergency number 112, or Tele-MANAS 14416.";

const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 12_000;
const MAX_TOTAL_CHARS = 60_000;

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });
}

function parseBody(body: unknown): ModelMessage[] | string {
  if (!body || typeof body !== "object") return "Invalid request body.";
  const b = body as { prompt?: unknown; messages?: unknown };
  let msgs: { role: "user" | "assistant"; content: string }[];
  if (typeof b.prompt === "string") msgs = [{ role: "user", content: b.prompt }];
  else if (Array.isArray(b.messages)) {
    msgs = [];
    for (const m of b.messages) {
      if (!m || typeof m !== "object") return "Invalid message.";
      const { role, content } = m as { role?: unknown; content?: unknown };
      if ((role !== "user" && role !== "assistant") || typeof content !== "string") return "Each message needs a user/assistant role and text content.";
      msgs.push({ role, content });
    }
  } else return "Send either a prompt or a list of messages.";
  if (!msgs.length || msgs.length > MAX_MESSAGES) return "Too many or too few messages.";
  let total = 0;
  for (const m of msgs) {
    if (!m.content.trim()) return "Messages cannot be empty.";
    if (m.content.length > MAX_CHARS_PER_MESSAGE) return "A message is too long.";
    total += m.content.length;
  }
  if (total > MAX_TOTAL_CHARS) return "The conversation is too long.";
  return msgs;
}

function upstreamMessage(err: unknown): { status: number; message: string } {
  if (APICallError.isInstance(err)) {
    const status = err.statusCode ?? 502;
    let message = err.message;
    try {
      const parsed = JSON.parse(err.responseBody ?? "");
      message = parsed?.error?.message || parsed?.message || message;
    } catch {
      /* keep SDK message */
    }
    return { status, message };
  }
  return { status: 502, message: "The AI service did not respond. Please try again." };
}

export async function handleChat(request: Request): Promise<Response> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return jsonError(500, "AI is not configured for this app.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON.");
  }
  const parsed = parseBody(body);
  if (typeof parsed === "string") return jsonError(400, parsed);
  const tier = (body as { tier?: unknown }).tier === "default" ? "default" : "quick";

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: BASE_INSTRUCTIONS,
    messages: parsed,
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: tier === "default" ? "medium" : "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  // Wait for the first text (or an error) so failures keep their real HTTP status.
  const iter = result.fullStream[Symbol.asyncIterator]();
  let first = "";
  try {
    for (;;) {
      const n = await iter.next();
      if (n.done) break;
      const part = n.value;
      if (part.type === "text-delta") {
        first = part.text;
        break;
      }
      if (part.type === "error") {
        const { status, message } = upstreamMessage(part.error);
        return jsonError(status, message);
      }
    }
  } catch (err) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const { status, message } = upstreamMessage(err);
    return jsonError(status, message);
  }
  if (!first) return jsonError(502, "The AI returned an empty reply.");

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(first));
    },
    async pull(controller) {
      try {
        const n = await iter.next();
        if (n.done) return controller.close();
        const part = n.value;
        if (part.type === "text-delta" && part.text) controller.enqueue(enc.encode(part.text));
        else if (part.type === "error") controller.error(part.error);
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await iter.return?.();
    },
  });

  return withLovableAiGatewayRunIdHeader(
    new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }),
    runIdFetch,
  );
}
