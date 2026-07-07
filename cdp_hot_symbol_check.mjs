import { writeFileSync } from "node:fs";
const CDP_HOST = "http://localhost:9222";
const APP_URL = "http://localhost:5173";
async function newTab(url) { const res = await fetch(`${CDP_HOST}/json/new?${encodeURIComponent(url)}`, { method: "PUT" }); return res.json(); }
function connect(wsUrl) { return new Promise((resolve, reject) => { const ws = new WebSocket(wsUrl); ws.addEventListener("open", () => resolve(ws)); ws.addEventListener("error", reject); }); }
function send(ws, id, method, params = {}) {
  return new Promise((resolve) => {
    const handler = (event) => { const msg = JSON.parse(event.data); if (msg.id === id) { ws.removeEventListener("message", handler); resolve(msg); } };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
let msgId = 1;
const nextId = () => msgId++;
async function evaluate(ws, expression, awaitPromise = false) {
  const res = await send(ws, nextId(), "Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
  if (res.result?.exceptionDetails) return `__ERR__ ${JSON.stringify(res.result.exceptionDetails.exception?.description ?? res.result.exceptionDetails)}`;
  return res.result?.result?.value;
}
function setNativeValueSnippet(selector, value) {
  return `(function(){const el=document.querySelector(${JSON.stringify(selector)});if(!el)return 'MISSING';const proto=Object.getPrototypeOf(el);const desc=Object.getOwnPropertyDescriptor(proto,'value');desc.set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));return 'ok';})()`;
}
async function shot(ws, name) { const res = await send(ws, nextId(), "Page.captureScreenshot"); if (res.result?.data) writeFileSync(`/tmp/pivot-${name}.png`, Buffer.from(res.result.data, "base64")); }

const consoleErrors = [];
async function main() {
  const tab = await newTab("about:blank");
  const ws = await connect(tab.webSocketDebuggerUrl);
  await send(ws, nextId(), "Page.enable");
  await send(ws, nextId(), "Runtime.enable");
  await send(ws, nextId(), "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") consoleErrors.push(msg.params.args.map(a => a.value ?? a.description ?? "").join(" "));
    if (msg.method === "Runtime.exceptionThrown") consoleErrors.push(JSON.stringify(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails));
  });

  await send(ws, nextId(), "Page.navigate", { url: `${APP_URL}/` });
  await new Promise((r) => setTimeout(r, 1200));
  await evaluate(ws, setNativeValueSnippet("input[type=email]", "trader@pios.com"));
  await evaluate(ws, setNativeValueSnippet("input[type=password]", "trader@123"));
  await evaluate(ws, "document.querySelector('button[type=submit]').click()");
  await new Promise((r) => setTimeout(r, 2000));

  // Retry loop: NVDA cache rotates, poll for up to ~20s waiting for a populated decision card
  let populated = false;
  for (let i = 0; i < 8; i++) {
    const text = await evaluate(ws, "document.body.innerText");
    if (text.includes("ALLOW") || text.includes("BLOCK") || text.includes("WAIT") || text.includes("REDUCE")) { populated = true; break; }
    await new Promise((r) => setTimeout(r, 2500));
  }
  console.log("Execution screen populated with a real decision:", populated);
  await shot(ws, "20-execution-nvda");

  await evaluate(ws, `document.querySelector('a[href="/intelligence"]')?.click()`);
  await new Promise((r) => setTimeout(r, 2000));
  let intelPopulated = false;
  for (let i = 0; i < 6; i++) {
    const text = await evaluate(ws, "document.body.innerText");
    if (text.includes("Confidence") || text.includes("Size impact")) { intelPopulated = true; break; }
    await new Promise((r) => setTimeout(r, 2500));
  }
  console.log("Intelligence screen populated:", intelPopulated);
  await shot(ws, "21-intelligence-nvda");

  console.log("Console errors:", consoleErrors.length ? consoleErrors.join("\n---\n") : "(none)");
  ws.close();
  await fetch(`${CDP_HOST}/json/close/${tab.id}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
