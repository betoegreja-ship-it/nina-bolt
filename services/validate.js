export function validateInput(body) {
  if (!body || typeof body.message !== "string") {
    return { valid: false, reason: "Campo 'message' obrigatório." };
  }
  const msg = body.message.trim();
  if (msg.length === 0) return { valid: false, reason: "Mensagem vazia." };
  if (msg.length > 4000) return { valid: false, reason: "Mensagem muito longa (máx 4000 chars)." };
  return { valid: true, message: msg };
}
