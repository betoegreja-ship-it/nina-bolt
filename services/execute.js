import Anthropic from "@anthropic-ai/sdk";
import { allMsgs, saveMsg } from "../memory/db.js";
import { browseWeb } from "./browser.js";
import { searchFlights } from "./flights.js";
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `Voce e a Nina Egreja, assistente pessoal inteligente e autonoma.
Para passagens aereas, SEMPRE use search_flights com codigos IATA.
Para outras pesquisas, use browse_web. Use apenas UMA ferramenta por resposta.
Responda sempre em portugues do Brasil.`;

export async function executeBolt(userId, userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const history = allMsgs(userId, 20);
  saveMsg(userId, "user", userMessage);
  const messages = [
    ...history.slice(0,-1).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage }
  ];
  const tools = [
    { name: "search_flights",
      description: "Busca passagens aereas reais. Use para voos, passagens, precos de viagem aerea.",
      input_schema: { type: "object", properties: {
        origin: { type: "string", description: "Codigo IATA origem ex: GRU" },
        destination: { type: "string", description: "Codigo IATA destino ex: HKG" },
        outbound_date: { type: "string", description: "Data ida YYYY-MM-DD" },
        return_date: { type: "string", description: "Data volta YYYY-MM-DD" },
        adults: { type: "number", description: "Passageiros adultos" },
        travel_class: { type: "number", description: "1=economica 2=executiva 3=primeira" }
      }, required: ["origin","destination","outbound_date"] }
    },
    { name: "browse_web",
      description: "Pesquisa na internet. NAO usar para passagens aereas.",
      input_schema: { type: "object", properties: {
        task: { type: "string" }, url: { type: "string" }
      }, required: ["task"] }
    }
  ];
  const response = await client.messages.create({
    model: process.env.MODEL || "claude-sonnet-4-6",
    max_tokens: 1024, system: SYSTEM_PROMPT, tools, messages,
  });
  let finalText = "";
  if (response.stop_reason === "tool_use") {
    const toolBlock = response.content.find(b => b.type === "tool_use");
    console.log("Tool:", toolBlock.name);
    let toolResult = "Erro.";
    try {
      if (toolBlock.name === "search_flights") {
        toolResult = await searchFlights(toolBlock.input);
      } else {
        toolResult = await browseWeb(toolBlock.input.task, toolBlock.input.url);
      }
    } catch (err) { toolResult = "Erro: " + err.message; }
    const followUp = await client.messages.create({
      model: process.env.MODEL || "claude-sonnet-4-6",
      max_tokens: 1024, system: SYSTEM_PROMPT, tools,
      messages: [...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: [{ type: "tool_result", tool_use_id: toolBlock.id, content: toolResult }] }
      ],
    });
    finalText = followUp.content.filter(b => b.type === "text").map(b => b.text).join("");
  } else {
    finalText = response.content.filter(b => b.type === "text").map(b => b.text).join("");
  }
  if (!finalText) finalText = "Desculpe, nao consegui processar.";
  saveMsg(userId, "assistant", finalText);
  return finalText;
}
