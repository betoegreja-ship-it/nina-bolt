import OpenAI from "openai";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function transcribeAudio(mediaUrl) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Baixa o áudio com autenticação do Twilio
  const response = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN,
    },
  });

  const buffer = Buffer.from(response.data);

  const transcription = await openai.audio.transcriptions.create({
    file: new File([buffer], "audio.ogg", { type: "audio/ogg" }),
    model: "whisper-1",
    language: "pt",
  });

  return transcription.text;
}
