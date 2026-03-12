import { Router } from "express";
import { validateInput } from "../services/validate.js";
import { runMultiAgent } from "../services/multiagent.js";
import { allMsgs, saveMsg } from "../memory/db.js";
import { requireApiKey } from "../middleware/auth.js";

const router = Router();

router.post("/", requireApiKey, async (req, res) => {
  const userId = req.headers["x-user-id"] || "default";
  const { valid, reason, message } = validateInput(req.body);
  if (!valid) return res.status(400).json({ error: reason });

  try {
    const history = allMsgs(userId, 10);
    const result = await runMultiAgent(message, history);
    saveMsg(userId, "user", message);
    saveMsg(userId, "assistant", result.reply);
    if (req.query.debug === "true") {
      return res.json({ reply: result.reply, pipeline: result.pipeline });
    }
    res.json({ reply: result.reply, user_id: userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no pipeline multi-agente" });
  }
});

export default router;
