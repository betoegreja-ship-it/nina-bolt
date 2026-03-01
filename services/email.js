import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

export async function sendEmail({ to, subject, body }) {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to, subject, text: body,
  });
}

export async function processEmailRequest(userMessage) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.MODEL || "claude-sonnet-4-6",
    max_tokens: 512,
    system: "Extraia to, subject, body do pedido. Responda SOMENTE JSON puro sem markdown: {\"to\":\"...\",\"subject\":\"...\",\"body\":\"...\"}",
    messages: [{ role: "user", content: userMessage }],
  });
  const text = res.content[0].text.replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
