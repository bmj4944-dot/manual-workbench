"use server";

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001"; // 빠르고 저렴. 요약/Q&A엔 충분
const MAX_TOKENS = 800;

export type AskInput = {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

export type AskResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

/**
 * Single entry point for Claude calls (AI summary, chatbot, etc).
 * Returns a discriminated result so callers can render a friendly fallback
 * instead of crashing when the API key isn't set in the deployment env.
 */
export async function askClaudeAction(input: AskInput): Promise<AskResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      ok: false,
      reason:
        "AI 기능을 사용하려면 ANTHROPIC_API_KEY 환경 변수를 설정해주세요.",
    };
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      ...(input.system ? { system: input.system } : {}),
      messages: input.messages,
    });
    const text = res.content
      .filter(
        (b): b is { type: "text"; text: string } & typeof b =>
          b.type === "text",
      )
      .map((b) => b.text)
      .join("\n");
    return { ok: true, text };
  } catch (e) {
    console.error("askClaudeAction failed", e);
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "AI 호출 실패",
    };
  }
}
