import { Router } from "express";
import { sendEmail, processEmailRequest } from "../services/email.js";
import { requireApiKey } from "../middleware/auth.js";

const router = Router();

router.post("/", requireApiKey, async (req, res) => {
  try {
    const { message } = req.body;
    const emailData = await processEmailRequest(message);
    await sendEmail(emailData);
    res.json({ success: true, message: `Email enviado para ${emailData.to}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar email: " + err.message });
  }
});

export default router;
