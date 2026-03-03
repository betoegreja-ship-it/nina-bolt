import Anthropic from "@anthropic-ai/sdk";
import { allMsgs, saveMsg, getAgentState, saveAgentState } from "../memory/db.js";
import { searchWeb } from "./search.js";
import { searchFlights } from "./flights.js";
import { sendEmail } from "./email.js";
import dotenv from "dotenv";
dotenv.config();

const tools = [
  {
    name: "search_flights",
    description: "Busca passagens aereas reais. Use para voos, passagens, precos de viagem aerea.",
    input_schema: {
      type: "object",
      properties: {
        origin: { type: "string", description: "Codigo IATA ex: GRU" },
        destination: { type: "string", description: "Codigo IATA ex: HKG" },
        outbound_date: { type: "string", description: "Data YYYY-MM-DD" },
        return_date: { type: "string", description: "Data volta YYYY-MM-DD" },
        adults: { type: "number" },
        travel_class: { type: "number", description: "1=economica 2=executiva 3=primeira" }
      },
      required: ["origin", "destination", "outbound_date"]
    }
  },
  {
    name: "browse_web",
    description: "Pesquisa qualquer assunto na internet: noticias, clima, precos, informacoes gerais.",
    input_schema: {
      type: "object",
      properties: { task: { type: "string" } },
      required: ["task"]
    }
  },
  {
    name: "send_email",
    description: "Envia um email.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    name: "send_whatsapp",
    description: "Envia mensagem WhatsApp para um numero de telefone.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Numero com codigo do pais ex: +5511999999999" },
        message: { type: "string" }
      },
      required: ["to", "message"]
    }
  }
];

async function runTool(name, input) {
  console.log("Tool:", name, JSON.stringify(input));
  if (name === "search_flights") return await searchFlights(input);
  if (name === "browse_web") return await searchWeb(input.task);
  if (name === "send_email") {
    await sendEmail(input);
    return "Email enviado para " + input.to;
  }
  if (name === "send_whatsapp") {
    const twilio = (await import("twilio")).default;
    const tc = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await tc.messages.create({
      from: "whatsapp:+13524505624",
      to: "whatsapp:" + input.to,
      body: input.message
    });
    return "WhatsApp enviado para " + input.to;
  }
  return "Ferramenta desconhecida.";
}

function buildSystemPrompt(agentState) {
  const profile = JSON.stringify(agentState.profile || {});
  const goals = JSON.stringify(agentState.goals || []);
  const memory = JSON.stringify(agentState.memory || {});
  return `Voce e a Nina Egreja, assistente pessoal inteligente e autonoma. Ano atual: 2026.
Responda SEMPRE em portugues do Brasil. Use apenas UMA ferramenta por vez.

CONTEXTO FIXO (use como verdade absoluta):
PERFIL=${profile}
METAS=${goals}
MEMORIA=${memory}

Capacidades: search_flights, browse_web, send_email, send_whatsapp.`;
}

function safeJsonParse(txt) {
  try {
    if (!txt) return null;
    let s = String(txt).trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    return JSON.parse(s);
  } catch { return null; }
}

function mergeState(agentState, delta) {
  if (!delta || typeof delta !== "object") return agentState;
  if (delta.profile && typeof delta.profile === "object") {
    agentState.profile = agentState.profile || {};
    Object.assign(agentState.profile, delta.profile);
  }
  if (Array.isArray(delta.goals)) {
    agentState.goals = agentState.goals || [];
    for (const g of delta.goals) {
      if (!agentState.goals.includes(g)) agentState.goals.push(g);
    }
  }
  if (delta.memory && typeof delta.memory === "object") {
    agentState.memory = agentState.memory || {};
    Object.assign(agentState.memory, delta.memory);
  }
  return agentState;
}

async function extractStateDelta(client, model, userMessage, assistantReply, agentState) {
  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 200,
      system: `Extraia dados persistentes do usuario. Retorne SOMENTE JSON valido. Se nao houver nada novo, retorne {}.
Formato: {"profile": {}, "goals": [], "memory": {}}`,
      messages: [{
        role: "user",
        content: `Mensagem: ${userMessage}\nResposta Nina: ${assistantReply}\nEstado atual: PERFIL=${JSON.stringify(agentState.profile || {})} METAS=${JSON.stringify(agentState.goals || [])} MEMORIA=${JSON.stringify(agentState.memory || {})}`
      }]
    });
    const txt = resp.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    return safeJsonParse(txt) || {};
  } catch (e) {
    console.error("extractStateDelta error:", e.message);
    return {};
  }
}

export async function executeBolt(userId, userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.MODEL || "claude-sonnet-4-6";

  // Carrega estado e historico limpo
  const agentState = getAgentState(userId);
  const history = allMsgs(userId, 10)
    .filter(m => typeof m.content === "string" && m.content.trim().length > 0);

  saveMsg(userId, "user", userMessage);

  const flightKeywords = ["passagem","passagens","voo","voar","aerea","aereo","executiva","economica","gru","gig","hkg","jfk","mia","lax","cdg","lhr","ezeiza","congonhas"];
  const isFlightQuery = flightKeywords.some(k => userMessage.toLowerCase().includes(k));

  const systemPrompt = buildSystemPrompt(agentState);
  const messages = [...history, { role: "user", content: userMessage }];

  let finalText = "";

  try {
    // Primeira chamada
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
      ...(isFlightQuery ? { tool_choice: { type: "tool", name: "search_flights" } } : {})
    });

    if (response.stop_reason === "tool_use") {
      const toolBlock = response.content.find(b => b.type === "tool_use");
      let toolResult = "Erro ao executar ferramenta.";
      try {
        toolResult = String(await runTool(toolBlock.name, toolBlock.input));
      } catch (e) {
        console.error("Tool error:", toolBlock.name, e.message);
        toolResult = "Erro: " + e.message;
      }

      // Segunda chamada — sem tools, só formata resposta
      const followUp = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `O usuario pediu: "${userMessage}"\n\nResultado da busca:\n${toolResult}\n\nApresente os resultados de forma clara, curta e amigavel para WhatsApp. Sem markdown, sem tabelas. Use emojis. Maximo 5 opcoes com companhia, preco, duracao e horario. No final pergunte se quer mais detalhes.`
        }]
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

  // Atualiza agent_state
  const delta = await extractStateDelta(client, model, userMessage, finalText, agentState);
  mergeState(agentState, delta);
  agentState.memory = agentState.memory || {};
  agentState.memory.lastInteraction = { at: new Date().toISOString(), message: userMessage.slice(0, 100) };
  saveAgentState(userId, agentState);

  return finalText;
}
