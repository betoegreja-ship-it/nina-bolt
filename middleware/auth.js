// middleware/auth.js — Valida API Key no header
import { isValidKey } from "../memory/db.js";

export function requireApiKey(req, res, next) {
  // Aceita via header "x-api-key" ou "Authorization: Bearer <key>"
  const key =
    req.headers["x-api-key"] ||
    (req.headers["authorization"] || "").replace("Bearer ", "").trim();

  if (!key) {
    return res.status(401).json({ error: "API key ausente. Use o header x-api-key." });
  }

  if (!isValidKey(key)) {
    return res.status(403).json({ error: "API key inválida ou revogada." });
  }

  req.apiKey = key;
  next();
}
