// routes/admin.js — Gestão de API Keys e logs (protegido por ADMIN_SECRET)
import { Router } from "express";
import crypto from "crypto";
import { createApiKey, listKeys, revokeKey, getLogs } from "../memory/db.js";

const router = Router();

// Middleware: só permite quem tem o ADMIN_SECRET correto
function adminOnly(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Acesso negado. x-admin-secret inválido." });
  }
  next();
}

// POST /admin/keys — Criar nova API key
router.post("/keys", adminOnly, (req, res) => {
  const label = req.body.label || "sem-label";
  const key = "bolt_" + crypto.randomBytes(24).toString("hex");
  createApiKey(key, label);
  res.status(201).json({ key, label });
});

// GET /admin/keys — Listar todas as keys
router.get("/keys", adminOnly, (req, res) => {
  res.json(listKeys());
});

// DELETE /admin/keys/:key — Revogar uma key
router.delete("/keys/:key", adminOnly, (req, res) => {
  revokeKey(req.params.key);
  res.json({ message: "Key revogada.", key: req.params.key });
});

// GET /admin/logs — Ver logs de uso
router.get("/logs", adminOnly, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(getLogs(limit));
});

export default router;
