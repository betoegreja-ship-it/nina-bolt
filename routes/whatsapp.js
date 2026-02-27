// routes/whatsapp.js — Webhook Twilio WhatsApp
import { Router } from "express";
import { executeBolt } from "../services/execute.js";

const router = Router();

// Twilio envia como form-urlencoded
router.post("/", async (req, res) => {
  const userMessage = req.body.Body?.trim();
  const from = req.body.From; // ex: "whatsapp:+5511999999999"

  if (!userMessage || !from) {
    return res.status(400).send("<Response></Response>");
  }

  // Usa o número como userId (memória separada por contato)
  const userId = from.replace("whatsapp:", "");

  let reply = "Desculpe, ocorreu um erro.";
  try {
    reply = await executeBolt(userId, userMessage);
  } catch (err) {
    console.error("Erro WhatsApp:", err);
  }

  // Twilio espera resposta TwiML
  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${escapeXml(reply)}</Message></Response>`);
});

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default router;
