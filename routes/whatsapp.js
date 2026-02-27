import { Router } from "express";
import { executeBolt } from "../services/execute.js";
import { transcribeAudio } from "../services/whisper.js";

const router = Router();

router.post("/", async (req, res) => {
  console.log("WA:", JSON.stringify(req.body));
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;
  const mediaType = req.body.MediaContentType0 || "";
  let userMessage = req.body.Body?.trim();
  if (!from) return res.status(400).send("<Response></Response>");
  const userId = from.replace("whatsapp:", "");
  if (mediaUrl && mediaType.includes("audio")) {
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
  res.set("Content-Type", "text/xml");
  res.send("<Response><Message>" + reply.replace(/&/g,"&amp;") + "</Message></Response>");
});

export default router;
