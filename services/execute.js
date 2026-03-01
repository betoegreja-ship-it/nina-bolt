import Anthropic from "@anthropic-ai/sdk";
import { allMsgs, saveMsg } from "../memory/db.js";
import { searchWeb } from "./search.js";
import { searchFlights } from "./flights.js";
import { sendEmail } from "./email.js";
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `Voce e a Nina Egreja, assistente pessoal inteligente e autonoma.
Voce tem as seguintes capacidades:
- Buscar passagens aereas reais com search_flights (use codigos IATA)
- Pesquisar qualquer assunto na internet com browse_web (noticias, clima, precos, etc)
- Enviar emails com send_email
- Enviar WhatsApp com send_whatsapp
- Entender audios transcritos automaticamente
- Lembrar conversas anteriores
Use apenas UMA ferramenta por resposta. Responda sempre em portugues do Brasil. O ano atual e 2026.`;

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
    description: "Pesquisa qualquer assunto na internet: noticias, precos, informacoes gerais, clima, eventos. NAO usar para passagens aereas.",
    input_schema: { type: "object", properties: {
      task: { type: "string", description: "O que pesquisar" }
    }, required: ["task"] }
  },
  { name: "send_email",
    description: "Envia um email para o destinatario solicitado pelo usuario.",
    input_schema: { type: "object", properties: {
      to: { type: "string" }, subject: { type: "string" }, body: { type: "string" }
    }, required: ["to","subject","body"] }
  },
  { name: "send_whatsapp",
    description: "Envia uma mensagem WhatsApp para um numero de telefone.",
    input_schema: { type: "object", properties: {
      to: { type: "string", description: "Numero com codigo do pais ex: +5511999999999" },
      message: { type: "string" }
    }, required: ["to","message"] }
  }
];

export async function executeBolt(userId, userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Busca historico — apenas mensagens texto puras
  const history = allMsgs(userId, 20);
  const cleanHistory = history
    .slice(0, -1)
    .filter(m => {
      if (typeof m.content !== "string") return false;
      if (m.content.trim().length === 0) return false;
      if (m.content.includes("tool_use")) return false;
      if (m.content.includes("tool_result")) return false;
      if (m.content.includes("toolu_")) return false;
      return true;
    })
    .map(m => ({ role: m.role, content: m.content }));

  saveMsg(userId, "user", userMessage);

  const messages = [...cleanHistory, { role: "user", content: userMessage }];

  let finalText = "";

  try {
    const response = await client.messages.create({
      model: process.env.MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      const toolBlock = response.content.find(b => b.type === "tool_use");
      console.log("Tool:", toolBlock.name, JSON.stringify(toolBlock.input));

      let toolResult = "Erro ao executar ferramenta.";
      try {
        if (toolBlock.name === "search_flights") {
          toolResult = await searchFlights(toolBlock.input);
        } else if (toolBlock.name === "send_email") {
          await sendEmail(toolBlock.input);
          toolResult = "Email enviado com sucesso para " + toolBlock.input.to;
        } else if (toolBlock.name === "send_whatsapp") {
          const twilio = (await import("twilio")).default;
          const client2 = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await client2.messages.create({
            from: "whatsapp:+13524505624",
            to: "whatsapp:" + toolBlock.input.to,
            body: toolBlock.input.message
          });
          toolResult = "WhatsApp enviado para " + toolBlock.input.to;
        } else {
          toolResult = await searchWeb(toolBlock.input.task);
        }
      } catch (err) {
        toolResult = "Erro: " + err.message;
        console.error("Tool error:", err.message);
      }

      // Segunda chamada com resultado da tool — SEM historico para evitar corrupcao
      const followUp = await client.messages.create({
        model: process.env.MODEL || "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: response.content },
          { role: "user", content: [{ type: "tool_result", tool_use_id: toolBlock.id, content: toolResult }] }
        ],
      });

      finalText = followUp.content.filter(b => b.type === "text").map(b => b.text).join("");
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
