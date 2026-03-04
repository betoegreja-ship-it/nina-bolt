// middleware/logger.js — Loga todas as requisições no SQLite
import { saveLog } from "../memory/db.js";

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    saveLog({
      userId: req.headers["x-user-id"] || null,
      apiKey: req.apiKey || null,
      route: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
}
