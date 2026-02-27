import OpenAI from "openai";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(mediaUrl) {
  // Baixa o áudio do Twilio
  const authHeader = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  const response = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    headers: { Authorization: `Basic ${authHeader}` },
  });

  const buffer = Buffer.from(response.data);

  // Envia para o Whisper
  const form = new FormData();
  form.append("file", buffer, { filename: "audio.ogg", contentType: "audio/ogg" });
  form.append("model", "whisper-1");
  form.append("language", "pt");

  const transcription = await openai.audio.transcriptions.create({
    file: new File([buffer], "audio.ogg", { type: "audio/ogg" }),
    model: "whisper-1",
    language: "pt",
  });

  return transcription.text;
}
