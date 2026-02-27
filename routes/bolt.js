// routes/bolt.js — Rota principal /bolt (com memória)
import { Router } from "express";
import { validateInput } from "../services/validate.js";
import { executeBolt } from "../services/execute.js";
import { requireApiKey } from "../middleware/auth.js";

const router = Router();

// POST /bolt — Chat com memória por usuário
router.post("/", requireApiKey, async (req, res) => {
  const userId = req.headers["x-user-id"] || "default";
  const { valid, reason, message } = validateInput(req.body);

  if (!valid) return res.status(400).json({ error: reason });

  try {
    const reply = await executeBolt(userId, message);
    res.json({ reply, user_id: userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao chamar Claude" });
  }
});

export default router;
