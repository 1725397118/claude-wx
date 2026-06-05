import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const API_KEY = "sk-769d73fe0e3d426a8fe4aac57e8f12af";
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

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Claude</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#111;color:#eee;display:flex;flex-direction:column;height:100dvh}
.h{padding:12px;text-align:center;font-size:16px;font-weight:600;background:#1a1a1a;border-bottom:1px solid #333;flex-shrink:0}
.c{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
.m{max-width:85%;padding:10px 14px;border-radius:16px;line-height:1.5;word-break:break-word;font-size:15px}
.m.u{background:#2563eb;align-self:flex-end;border-bottom-right-radius:4px}
.m.a{background:#27272a;align-self:flex-start;border-bottom-left-radius:4px}
.ty{align-self:flex-start;background:#27272a;border-radius:16px 16px 16px 4px;padding:14px 18px;display:none}
.ty span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#888;margin:0 2px;animation:b 1.3s infinite}
.ty span:nth-child(2){animation-delay:0.15s}
.ty span:nth-child(3){animation-delay:0.3s}
@keyframes b{0%,60%,100%{opacity:0.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-8px)}}
.bt{padding:10px;background:#1a1a1a;border-top:1px solid #333;flex-shrink:0}
.r{display:flex;gap:8px}
.r input{flex:1;padding:12px;border-radius:24px;border:1px solid #444;background:#222;color:#eee;font-size:15px;outline:none}
.r input:focus{border-color:#2563eb}
.r button{width:48px;height:48px;border-radius:50%;border:none;background:#2563eb;color:#fff;font-size:20px;cursor:pointer;flex-shrink:0}
</style>
</head>
<body>
<div class="h">Claude</div>
<div class="c" id="c"><div class="m a">你好！我是 Claude，有什么可以帮你？</div></div>
<div class="ty" id="t"><span></span><span></span><span></span></div>
<div class="bt">
<div class="r">
<input id="i" type="text" placeholder="输入消息..." autocomplete="off">
<button id="s">&#10148;</button>
</div>
</div>
<script>
const c=document.getElementById('c'),i=document.getElementById('i'),s=document.getElementById('s'),t=document.getElementById('t'),uid='u'+Math.random().toString(36).slice(2,10);
function a(r,tx){const d=document.createElement('div');d.className='m '+r;d.textContent=tx;c.appendChild(d);c.scrollTop=c.scrollHeight}
async function send(){const m=i.value.trim();if(!m)return;i.value='';a('user',m);t.style.display='block';c.scrollTop=c.scrollHeight;
try{const r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({u:uid,m:m})});const d=await r.json();t.style.display='none';a('assistant',d.reply)}catch(e){t.style.display='none';a('assistant','网络出错')}}
s.addEventListener('click',send);i.addEventListener('keydown',e=>{if(e.key==='Enter')send()});
</script>
</body>
</html>`;

serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/") {
    return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  if (req.method === "POST" && url.pathname === "/chat") {
    try {
      const { u = "default", m = "" } = await req.json();
      if (!m?.trim()) return Response.json({ reply: "请发消息" });
      if (!sessions.has(u)) sessions.set(u, { msgs: [], ts: Date.now() });
      const s = sessions.get(u); s.ts = Date.now();
      s.msgs.push({ role: "user", content: m });
      if (s.msgs.length > 20) s.msgs = s.msgs.slice(-20);
      const reply = await chat(s.msgs);
      s.msgs.push({ role: "assistant", content: reply });
      return Response.json({ reply });
    } catch (e) {
      return Response.json({ reply: `出错: ${e.message}` });
    }
  }
  return new Response("Not Found", { status: 404 });
});
