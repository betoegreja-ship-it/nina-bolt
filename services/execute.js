import Anthropic from "@anthropic-ai/sdk";
import { allMsgs, saveMsg } from "../memory/db.js";
import { browseWeb } from "./browser.js";
import { searchFlights } from "./flights.js";
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `Você é a Nina Egreja — assistente pessoal inteligente, simpática e autônoma.
Você tem acesso a um navegador real e pode acessar qualquer site, ver preços, fazer pesquisas.
Use browse_web apenas UMA vez por pergunta com a busca mais específica possível.
Responda sempre em português do Brasil, de forma clara e objetiva.
Você entende áudios, envia emails e tem memória das conversas.`;

export async function executeBolt(userId, userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const history = allMsgs(userId, 20);
  saveMsg(userId, "user", userMessage);

  const messages = [
    ...history.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage }
  ];

  const tools = [{
    name: "browse_web",
    description: "Acessa a internet para ver precos, pesquisar produtos, verificar informacoes atuais. Use apenas uma vez.",
    input_schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "O que pesquisar" },
        url: { type: "string", description: "URL especifica (opcional)" }
      },
      required: ["task"]
    }
  }];

  // Primeira chamada
  const response = await client.messages.create({
    model: process.env.MODEL || "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  let finalText = "";

  if (response.stop_reason === "tool_use") {
    const toolBlock = response.content.find(b => b.type === "tool_use");
    console.log("Browser task:", toolBlock.input.task);

    let toolResult = "Erro.";
    try {
      if (toolBlock.name === "search_flights") {
        toolResult = await searchFlights(toolBlock.input);
      } else {
        toolResult = await browseWeb(toolBlock.input.task, toolBlock.input.url);
      }
    } catch (err) {
      toolResult = "Erro: " + err.message;
    }

    // Segunda chamada com resultado
    const followUp = await client.messages.create({
      model: process.env.MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: [{ type: "tool_result", tool_use_id: toolBlock.id, content: toolResult }] }
      ],
    });

    finalText = followUp.content.filter(b => b.type === "text").map(b => b.text).join("");
  } else {
    finalText = response.content.filter(b => b.type === "text").map(b => b.text).join("");
  }

  if (!finalText) finalText = "Desculpe, não consegui processar sua solicitação.";
  saveMsg(userId, "assistant", finalText);
  return finalText;
}
