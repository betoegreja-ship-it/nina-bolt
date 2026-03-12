import Anthropic from "@anthropic-ai/sdk";

let _client;
export function makeAnthropicClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export const MODEL = process.env.MODEL || "claude-sonnet-4-6";
