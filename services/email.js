import dotenv from "dotenv";
dotenv.config();

export async function sendEmail({ to, subject, body }) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Nina Egreja <onboarding@resend.dev>",
    to,
    subject,
    html: body
  });
}

export async function processEmailRequest({ to, subject, body }) {
  return await sendEmail({ to, subject, body });
}
