// services/multiagent.js — Pipeline: Bolt → Validador → Executor
import { makeAnthropicClient, MODEL } from "./anthropic.js";

const client = () => makeAnthropicClient();

// ── Agente 1: Bolt (gera resposta/plano) ──────────────
async function agentBolt(userMessage, history = []) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `Você é o Agente Bolt. Analise a mensagem do usuário e gere um plano detalhado ou resposta completa.
Seja claro e estruturado. Responda em português.`,
    messages: [...history, { role: "user", content: userMessage }],
  });
  return res.content[0].text;
}

// ── Agente 2: Validador (revisa e melhora) ────────────
async function agentValidator(original, boltOutput) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 512,
    system: `Você é o Agente Validador. Revise a resposta gerada pelo Agente Bolt.
Verifique: precisão, clareza, completude e tom. Se estiver boa, diga "APROVADO" e repita a resposta.
Se precisar de ajustes, corrija e entregue a versão melhorada. Responda em português.`,
    messages: [
      {
        role: "user",
        content: `Mensagem original do usuário:\n"${original}"\n\nResposta do Bolt:\n"${boltOutput}"\n\nValidar e aprovar ou corrigir:`,
      },
    ],
  });
  return res.content[0].text;
}

// ── Agente 3: Executor (extrai resposta final limpa) ──
async function agentExecutor(validatorOutput) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 512,
    system: `Você é o Agente Executor. Receba a saída validada e entregue apenas a resposta final,
limpa e formatada para o usuário. Sem metadados, sem "APROVADO", sem explicações internas.
Apenas a resposta final. Responda em português.`,
    messages: [
      { role: "user", content: validatorOutput },
    ],
  });
  return res.content[0].text;
}

// ── Pipeline completo ─────────────────────────────────
export async function runMultiAgent(userMessage, history = []) {
  const t0 = Date.now();

  const boltOut = await agentBolt(userMessage, history);
  const validOut = await agentValidator(userMessage, boltOut);
  const finalOut = await agentExecutor(validOut);

  return {
    reply: finalOut,
    pipeline: {
      bolt: boltOut,
      validator: validOut,
      executor: finalOut,
      duration_ms: Date.now() - t0,
    },
  };
}
