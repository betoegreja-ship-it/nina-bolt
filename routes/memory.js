// routes/memory.js — Ver e limpar memória do usuário
import { Router } from "express";
import { allMsgs, clearMsgs } from "../memory/db.js";
import { requireApiKey } from "../middleware/auth.js";

const router = Router();

// GET /memory — Ver histórico do usuário
router.get("/", requireApiKey, (req, res) => {
  const userId = req.headers["x-user-id"] || "default";
  const msgs = allMsgs(userId, 50);
  res.json({ user_id: userId, messages: msgs, count: msgs.length });
});

// DELETE /memory — Limpar histórico do usuário
router.delete("/", requireApiKey, (req, res) => {
  const userId = req.headers["x-user-id"] || "default";
  clearMsgs(userId);
  res.json({ message: "Memória limpa com sucesso.", user_id: userId });
});

export default router;
