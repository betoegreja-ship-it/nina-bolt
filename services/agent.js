export async function runBolt({ client, model, system, messages }) {
  const res = await client.messages.create({
    model,
    max_tokens: 900,
    system,
    messages: messages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content
    }))
  });

  return res.content?.[0]?.text ?? "";
}
