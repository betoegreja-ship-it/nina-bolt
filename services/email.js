import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, body }) {
  await resend.emails.send({
    from: "Nina Egreja <onboarding@resend.dev>",
    to,
    subject,
    text: body,
  });
}

export async function processEmailRequest(userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.MODEL || "claude-sonnet-4-6",
    max_tokens: 512,
    system: "Extraia to, subject, body do pedido. Responda SOMENTE JSON puro sem markdown.",
    messages: [{ role: "user", content: userMessage }],
  });
  const text = res.content[0].text.replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
