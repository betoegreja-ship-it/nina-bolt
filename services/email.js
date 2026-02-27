import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const pass = "cjanecctdyqgdric";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: "ninaegreja@gmail.com", pass },
});

export async function sendEmail({ to, subject, body }) {
  await transporter.sendMail({
    from: '"Nina Egreja" <ninaegreja@gmail.com>',
    to, subject, text: body,
  });
}

export async function processEmailRequest(userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.MODEL || "claude-sonnet-4-6",
    max_tokens: 512,
    system: 'Extraia to, subject, body do pedido. Responda SOMENTE JSON puro sem markdown: {"to":"...","subject":"...","body":"..."}',
    messages: [{ role: "user", content: userMessage }],
  });
  const text = res.content[0].text.replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
