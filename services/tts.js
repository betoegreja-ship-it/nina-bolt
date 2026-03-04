import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

export async function textToSpeech(text) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  return buffer;
}
