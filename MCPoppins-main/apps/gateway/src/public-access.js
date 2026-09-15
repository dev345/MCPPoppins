import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

// One process hosts the public hackathon app. Sessions and limits reset on restart.
export function publicAccess(adminSecret) {
  const signingKey = randomBytes(32);
  const sign = value => createHmac("sha256", signingKey).update(value).digest("hex");
  const clients = new Map();
  let minute = 0, total = 0;
  return (req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    if (/^\/(audit|conversation|approvals|webhooks)(\/|$)/i.test(req.path) || (req.method === "POST" && /^\/tools\//i.test(req.path))) {
      if (!adminSecret || req.headers.authorization !== `Bearer ${adminSecret}`) {
        return res.status(401).json({ error: "Administrator access required." });
      }
    }
    if (req.method !== "POST" || !/^\/chat\/?$/i.test(req.path)) return next();
    res.set("Cache-Control", "no-store");
    const now = Math.floor(Date.now() / 60000);
    if (minute !== now) { minute = now; total = 0; clients.clear(); }
    // Global ceiling also bounds new sessions; per-address ceiling limits one visitor.
    const address = req.socket.remoteAddress;
    const count = clients.get(address) || 0;
    if (total >= 60 || count >= 20) {
      res.set("Retry-After", "60");
      return res.status(429).json({ error: "The public chat is busy. Please try again in a minute." });
    }
    total++; clients.set(address, count + 1);
    let token = req.headers.cookie?.match(/(?:^|;\s*)mcp_session=([a-f0-9.]+)/)?.[1] || "";
    const [id, signature] = token.split(".");
    const valid = id?.length === 48 && signature?.length === 64 && timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)));
    if (!valid) {
      const fresh = randomBytes(24).toString("hex");
      token = `${fresh}.${sign(fresh)}`;
      res.cookie("mcp_session", token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 1800000 });
    }
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ error: "JSON object required." });
    req.body.userId = `public-${token.split(".")[0]}`;
    req.body.channel = "web";
    next();
  };
}
