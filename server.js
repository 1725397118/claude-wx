const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

const API_KEY = "sk-769d73fe0e3d426a8fe4aac57e8f12af";
const PORT = 5000;
const SYS = "你是Claude，一个热心的AI助手。用中文回复，简洁友好。";

const sessions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) if (now - v.ts > 3600000) sessions.delete(k);
}, 600000);

async function chat(messages) {
  const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: "deepseek-chat", max_tokens: 2000, messages: [{ role: "system", content: SYS }, ...messages] }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`${r.status}`);
  return d.choices[0].message.content;
}

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "templates", "index.html")));

app.post("/chat", async (req, res) => {
  const { u = "default", m = "" } = req.body;
  if (!m.trim()) return res.json({ reply: "请发消息" });
  if (!sessions.has(u)) sessions.set(u, { msgs: [], ts: Date.now() });
  const s = sessions.get(u); s.ts = Date.now();
  s.msgs.push({ role: "user", content: m });
  if (s.msgs.length > 20) s.msgs = s.msgs.slice(-20);
  try {
    const reply = await chat(s.msgs);
    s.msgs.push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (e) { res.json({ reply: `出错: ${e.message}` }); }
});

app.listen(PORT, () => console.log("ready"));
