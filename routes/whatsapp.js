import { Router } from "express";
import { executeBolt } from "../services/execute.js";
import { transcribeAudio } from "../services/whisper.js";
import { textToSpeech } from "../services/tts.js";
import twilio from "twilio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.join(__dirname, "../public/audio");
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const router = Router();

async function sendWhatsApp(to, message) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({ from: "whatsapp:+13524505624", to, body: message });
}

router.post("/", async (req, res) => {
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;
  const mediaType = req.body.MediaContentType0 || "";
  let userMessage = req.body.Body?.trim();
  const isAudio = !!(mediaUrl && mediaType.includes("audio"));

  if (!from) return res.status(400).send("<Response></Response>");
  const userId = from.replace("whatsapp:", "");

  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");

  try {
    if (isAudio) {
      try { userMessage = await transcribeAudio(mediaUrl); }
      catch (err) { userMessage = "Recebi um audio mas nao consegui entender."; }
    }
    if (!userMessage) return;

    const reply = await executeBolt(userId, userMessage);

    if (isAudio) {
      try {
        const audioBuffer = await textToSpeech(reply);
        const filename = "nina_" + Date.now() + ".mp3";
        const filepath = path.join(audioDir, filename);
        fs.writeFileSync(filepath, audioBuffer);
        const publicUrl = "https://" + process.env.RAILWAY_PUBLIC_DOMAIN + "/audio/" + filename;
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({ from: "whatsapp:+13524505624", to: from, mediaUrl: [publicUrl] });
        setTimeout(() => { try { fs.unlinkSync(filepath); } catch(_) {} }, 60000);
        return;
      } catch (err) { console.error("Erro TTS:", err.message); }
    }

    await sendWhatsApp(from, reply);

  } catch (err) {
    console.error("WhatsApp error:", err.message);
    try { await sendWhatsApp(from, "Desculpe, ocorreu um erro. Tente novamente."); } catch(_) {}
  }
});

export default router;
