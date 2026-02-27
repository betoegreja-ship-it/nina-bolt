import Anthropic from "@anthropic-ai/sdk";
import { allMsgs, saveMsg } from "../memory/db.js";
import { browseWeb } from "./browser.js";
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `Você é a Nina Egreja — assistente pessoal inteligente, simpática e autônoma.
Você tem acesso a um navegador real e pode acessar qualquer site, ver preços, fazer pesquisas, preencher formulários e navegar na internet.
Quando precisar de informações atuais ou acessar um site, use a ferramenta browse_web.
Responda sempre em português do Brasil, de forma clara e objetiva.
Você entende áudios (transcritos automaticamente), envia emails e tem memória das conversas.`;

export async function executeBolt(userId, userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const history = allMsgs(userId, 20);
  saveMsg(userId, "user", userMessage);

  const messages = [
    ...history.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage }
  ];

  const tools = [
    {
      name: "browse_web",
      description: "Acessa a internet. Use para ver precos, pesquisar produtos, acessar sites, verificar informacoes atuais.",
      input_schema: {
        type: "object",
        properties: {
          task: { type: "string", description: "O que pesquisar ou fazer na internet" },
          url: { type: "string", description: "URL especifica para acessar (opcional)" }
        },
        required: ["task"]
      }
    }
  ];

  let currentMessages = [...messages];
  let finalText = "";

  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: process.env.MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: currentMessages,
    });

    if (response.stop_reason === "tool_use") {
      const toolBlock = response.content.find(b => b.type === "tool_use");
      console.log("Browser task:", toolBlock.input.task);
      
      let toolResult = "";
      try {
        toolResult = await browseWeb(toolBlock.input.task, toolBlock.input.url);
      } catch (err) {
        toolResult = "Erro ao acessar: " + err.message;
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: [{ type: "tool_result", tool_use_id: toolBlock.id, content: toolResult }] }
      ];
    } else {
      finalText = response.content.filter(b => b.type === "text").map(b => b.text).join("");
      break;
    }
  }

  saveMsg(userId, "assistant", finalText);
  return finalText;
}
