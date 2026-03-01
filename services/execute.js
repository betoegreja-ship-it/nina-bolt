import Anthropic from "@anthropic-ai/sdk";
import { allMsgs, saveMsg } from "../memory/db.js";
import { searchWeb } from "./search.js";
import { searchFlights } from "./flights.js";
import { sendEmail } from "./email.js";
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `Voce e a Nina Egreja, assistente pessoal inteligente e autonoma. Ano atual: 2026.
Capacidades: search_flights (passagens aereas), browse_web (pesquisas), send_email, send_whatsapp.
IMPORTANTE: Use apenas UMA ferramenta por vez. Responda em portugues do Brasil.`;

const tools = [
  { name: "search_flights",
    description: "Busca passagens aereas reais. Use para voos, passagens, precos de viagem aerea.",
    input_schema: { type: "object", properties: {
      origin: { type: "string" }, destination: { type: "string" },
      outbound_date: { type: "string" }, return_date: { type: "string" },
      adults: { type: "number" }, travel_class: { type: "number" }
    }, required: ["origin","destination","outbound_date"] }
  },
  { name: "browse_web",
    description: "Pesquisa qualquer assunto: noticias, clima, precos, informacoes gerais.",
    input_schema: { type: "object", properties: {
      task: { type: "string" }
    }, required: ["task"] }
  },
  { name: "send_email",
    description: "Envia um email.",
    input_schema: { type: "object", properties: {
      to: { type: "string" }, subject: { type: "string" }, body: { type: "string" }
    }, required: ["to","subject","body"] }
  },
  { name: "send_whatsapp",
    description: "Envia mensagem WhatsApp.",
    input_schema: { type: "object", properties: {
      to: { type: "string" }, message: { type: "string" }
    }, required: ["to","message"] }
  }
];

async function runTool(name, input) {
  if (name === "search_flights") return await searchFlights(input);
  if (name === "browse_web") return await searchWeb(input.task);
  if (name === "send_email") {
    await sendEmail(input);
    return "Email enviado para " + input.to;
  }
  if (name === "send_whatsapp") {
    const twilio = (await import("twilio")).default;
    const tc = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await tc.messages.create({ from: "whatsapp:+13524505624", to: "whatsapp:" + input.to, body: input.message });
    return "WhatsApp enviado para " + input.to;
  }
  return "Ferramenta desconhecida.";
}

export async function executeBolt(userId, userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Historico limpo — apenas texto puro
  const history = allMsgs(userId, 10);
  const cleanHistory = history
    .slice(0, -1)
    .filter(m => typeof m.content === "string" && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content }));

  saveMsg(userId, "user", userMessage);

  const flightKeywords = ["passagem","voo","voar","passagens","aerea","aereo","executiva","economica","gru","gig","hkg","jfk","mia","lax","cdg","lhr"];
  const isFlightQuery = flightKeywords.some(k => userMessage.toLowerCase().includes(k));

  // Usa apenas a mensagem atual, sem historico, para evitar corrupcao
  const messages = [{ role: "user", content: userMessage }];

  let finalText = "";

  try {
    const response = await client.messages.create({
      model: process.env.MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
      ...(isFlightQuery ? { tool_choice: { type: "tool", name: "search_flights" } } : {})
    });

    if (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter(b => b.type === "tool_use").slice(0, 1);
      console.log("Tools:", toolBlocks.map(t => t.name));

      // Executa todas as tools e coleta resultados
      const toolResults = await Promise.all(toolBlocks.map(async (tb) => {
        try {
          const result = await runTool(tb.name, tb.input);
          return { type: "tool_result", tool_use_id: tb.id, content: String(result) };
        } catch(e) {
          console.error("Tool error:", tb.name, e.message);
          return { type: "tool_result", tool_use_id: tb.id, content: "Erro: " + e.message };
        }
      }));

      // Usa APENAS o tool_use que executamos, nao todos
      const executedToolBlock = toolBlocks[0];
      const assistantContent = [executedToolBlock];
      
      console.log('Tool result preview:', String(toolResults[0]?.content || '').slice(0, 200));
      const followUp = await client.messages.create({
        model: process.env.MODEL || "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tool_choice: { type: "none" },
        tools,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: assistantContent },
          { role: "user", content: toolResults }
        ],
      });

      finalText = followUp.content.filter(b => b.type === "text").map(b => b.text).join("");
      console.log("followUp stop_reason:", followUp.stop_reason, "finalText length:", finalText.length);
      console.log("followUp content:", JSON.stringify(followUp.content));
    } else {
      finalText = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    }
  } catch (err) {
    console.error("executeBolt error:", err.message);
    finalText = "Desculpe, ocorreu um erro. Tente novamente.";
  }

  if (!finalText) finalText = "Desculpe, nao consegui processar.";
  saveMsg(userId, "assistant", finalText);
  return finalText;
}
