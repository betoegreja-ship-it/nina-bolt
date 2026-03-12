import Imap from "imap-simple";
import { simpleParser } from "mailparser";
import Anthropic from "@anthropic-ai/sdk";
import { sendEmail } from "./email.js";
import dotenv from "dotenv";
dotenv.config();

const imapConfig = {
  imap: {
    user: "ninaegreja@gmail.com",
    password: "cjanecctdyqgdric",
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false, family: 4 },
    authTimeout: 10000,
  },
};

async function generateReply(from, subject, body) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.MODEL || "claude-sonnet-4-6",
    max_tokens: 512,
    system: `Você é a Nina Egreja, assistente pessoal inteligente e simpática.
Responda emails de forma profissional, calorosa e em português.
Assine sempre como: Nina Egreja | Assistente Pessoal | ninaegreja@gmail.com`,
    messages: [{
      role: "user",
      content: `Recebi este email:\nDe: ${from}\nAssunto: ${subject}\nMensagem: ${body}\n\nEscreva uma resposta adequada.`
    }],
  });
  return res.content[0].text;
}

const replied = new Set();

export async function checkAndReplyEmails() {
  // Só roda se não estiver no Railway
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log("📧 Email watcher desativado no Railway (limitação de rede)");
    return;
  }

  let connection;
  try {
    connection = await Imap.connect(imapConfig);
    await connection.openBox("INBOX");
    const messages = await connection.search(["UNSEEN"], {
      bodies: [""],
      markSeen: false,
    });

    console.log(`📬 ${messages.length} email(s) não lido(s)`);

    for (const msg of messages) {
      const all = msg.parts.find(p => p.which === "");
      if (!all) continue;
      const parsed = await simpleParser(all.body);
      const from = parsed.from?.text || "";
      const subject = parsed.subject || "(sem assunto)";
      const body = parsed.text || "";
      const msgId = parsed.messageId || subject;

      if (from.includes("ninaegreja@gmail.com")) continue;
      if (replied.has(msgId)) continue;

      console.log(`📧 Respondendo: ${subject} — de ${from}`);
      const reply = await generateReply(from, subject, body);
      await sendEmail({
        to: parsed.from?.value[0]?.address,
        subject: `Re: ${subject}`,
        body: reply,
      });
      replied.add(msgId);
      console.log(`✅ Respondido!`);
    }
    connection.end();
  } catch (err) {
    console.error("Erro:", err.message);
    if (connection) try { connection.end(); } catch(_) {}
  }
}

export function startEmailWatcher(intervalMinutes = 2) {
  console.log("📧 Email watcher desativado (modo seguro)");
  return;
  if (process.env.RAILWAY_ENVIRONMENT) {
    return;
  }
  console.log(`👁 Nina monitorando emails a cada ${intervalMinutes} min...`);
  checkAndReplyEmails();
  setInterval(checkAndReplyEmails, intervalMinutes * 60 * 1000);
}
