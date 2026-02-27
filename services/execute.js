import Anthropic from "@anthropic-ai/sdk";
import { allMsgs, saveMsg } from "../memory/db.js";
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `Voce e a Nina Egreja, assistente pessoal inteligente e autonoma. Voce tem acesso a internet para buscar precos, noticias e pesquisas. Responda sempre em portugues do Brasil.`;

export async function executeBolt(userId, userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const history = allMsgs(userId, 20);
  saveMsg(userId, "user", userMessage);
  const messages = [
    ...history.slice(0,-1).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage }
  ];
  const response = await client.messages.create({
    model: process.env.MODEL || "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages,
  });
  const finalText = response.content.filter(b => b.type === "text").map(b => b.text).join("");
  saveMsg(userId, "assistant", finalText);
  return finalText;
}
