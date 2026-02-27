import { Router } from "express";
import { executeBolt } from "../services/execute.js";
import { transcribeAudio } from "../services/whisper.js";
import { textToSpeech } from "../services/tts.js";
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

router.post("/", async (req, res) => {
  console.log("WA:", JSON.stringify(req.body));
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;
  const mediaType = req.body.MediaContentType0 || "";
  let userMessage = req.body.Body?.trim();
  const isAudio = mediaUrl && mediaType.includes("audio");

  if (!from) return res.status(400).send("<Response></Response>");
  const userId = from.replace("whatsapp:", "");

  if (isAudio) {
    console.log("Audio:", mediaUrl);
    try {
      userMessage = await transcribeAudio(mediaUrl);
      console.log("Transcrito:", userMessage);
    } catch (err) {
      console.error("Erro audio:", err.message);
      userMessage = "Recebi um audio mas nao consegui entender.";
    }
  }

  if (!userMessage) return res.send("<Response></Response>");

  let reply = "Erro.";
  try { reply = await executeBolt(userId, userMessage); } catch (err) { console.error(err.message); }

  // Se veio audio, responde com audio
  if (isAudio) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const audioBuffer = await textToSpeech(reply);
      const base64Audio = audioBuffer.toString("base64");
      const mediaDataUrl = "data:audio/mpeg;base64," + base64Audio;

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        mediaUrl: [mediaDataUrl],
      });

      return res.send("<Response></Response>");
    } catch (err) {
      console.error("Erro TTS:", err.message);
    }
  }

  res.set("Content-Type", "text/xml");
  res.send("<Response><Message>" + reply.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") + "</Message></Response>");
});

export default router;
