import Anthropic from "@anthropic-ai/sdk";
import { allMsgs, saveMsg } from "../memory/db.js";
import { browseWeb } from "./browser.js";
import { searchFlights } from "./flights.js";
import { sendEmail, processEmailRequest } from "./email.js";
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `Voce e a Nina Egreja, assistente pessoal inteligente e autonoma.
Voce tem as seguintes capacidades:
- Buscar passagens aereas reais com search_flights (use codigos IATA)
- Pesquisar na internet com browse_web
- Enviar emails com send_email
- Entender audios transcritos automaticamente
- Lembrar conversas anteriores
Use apenas UMA ferramenta por resposta. Responda sempre em portugues do Brasil.`;

export async function executeBolt(userId, userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const history = allMsgs(userId, 20);
  saveMsg(userId, "user", userMessage);
  const messages = [
    ...history.slice(0,-1).filter(m => typeof m.content === "string").map(m => ({ role: m.role, content: m.content })),
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
      description: "Pesquisa na internet. NAO usar para passagens aereas ou emails.",
      input_schema: { type: "object", properties: {
        task: { type: "string" }, url: { type: "string" }
      }, required: ["task"] }
    },
    { name: "send_whatsapp",
      description: "Envia uma mensagem WhatsApp para um numero de telefone. Use quando o usuario pedir para mandar mensagem para alguem pelo WhatsApp.",
      input_schema: { type: "object", properties: {
        to: { type: "string", description: "Numero com codigo do pais ex: +5511999999999" },
        message: { type: "string", description: "Texto da mensagem a enviar" }
      }, required: ["to","message"] }
    },
    { name: "send_email",
      description: "Envia um email para o destinatario solicitado pelo usuario.",
      input_schema: { type: "object", properties: {
        to: { type: "string", description: "Email do destinatario" },
        subject: { type: "string", description: "Assunto do email" },
        body: { type: "string", description: "Corpo do email" }
      }, required: ["to","subject","body"] }
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
      } else if (toolBlock.name === "send_whatsapp") {
        const twilio = (await import("twilio")).default;
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          from: "whatsapp:+13524505624",
          to: "whatsapp:" + toolBlock.input.to,
          body: toolBlock.input.message
        });
        toolResult = "Mensagem WhatsApp enviada para " + toolBlock.input.to;
      } else if (toolBlock.name === "send_email") {
        await sendEmail(toolBlock.input);
        toolResult = "Email enviado com sucesso para " + toolBlock.input.to;
      } else {
        toolResult = await browseWeb(toolBlock.input.task, toolBlock.input.url);
      }
    } catch (err) { toolResult = "Erro: " + err.message; console.error(err.message); }
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
