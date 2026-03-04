import express from "express";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import bodyParser from "body-parser";

dotenv.config();

import { startEmailWatcher } from "./services/emailReader.js";
import { requestLogger } from "./middleware/logger.js";
import boltRoute from "./routes/bolt.js";
import memoryRoute from "./routes/memory.js";
import whatsappRoute from "./routes/whatsapp.js";
import adminRoute from "./routes/admin.js";
import multiagentRoute from "./routes/multiagent.js";
import emailRoute from "./routes/email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));
app.use(requestLogger);
app.use(express.static(path.join(__dirname, "public")));

app.use("/bolt", boltRoute);
app.use("/memory", memoryRoute);
app.use("/whatsapp", whatsappRoute);
app.use("/admin", adminRoute);
app.use("/multiagent", multiagentRoute);
app.use("/email", emailRoute);

app.get("/health", (req, res) => {
  res.json({ status: "ok", model: process.env.MODEL || "claude-sonnet-4-6", time: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n⚡ Claude Bolt ON: http://localhost:${PORT}`);
  console.log(`   MODEL: ${process.env.MODEL || "claude-sonnet-4-6"}`);
  console.log(`   Rotas: /bolt  /memory  /whatsapp  /multiagent  /admin  /email`);
  console.log(`   Chat:  http://localhost:${PORT}\n`);
  startEmailWatcher(2);
});
