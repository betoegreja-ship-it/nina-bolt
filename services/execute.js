import { makeAnthropicClient, MODEL } from "./anthropic.js";
import { allMsgs, saveMsg } from "../memory/db.js";

const SYSTEM_PROMPT = `Você é a Nina — uma assistente pessoal inteligente, simpática e eficiente.
Seu nome é Nina. Quando alguém perguntar quem é você, diga que é a Nina, assistente pessoal criada para ajudar no dia a dia.
Responda sempre em português do Brasil, de forma clara, calorosa e objetiva.
Você tem memória das mensagens anteriores e lembra o contexto da conversa.`;

export async function executeBolt(userId, userMessage) {
  const client = makeAnthropicClient();
  const history = allMsgs(userId, 20);
  saveMsg(userId, "user", userMessage);
  const messages = [...history, { role: "user", content: userMessage }];
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });
  const reply = response.content[0].text;
  saveMsg(userId, "assistant", reply);
  return reply;
}
