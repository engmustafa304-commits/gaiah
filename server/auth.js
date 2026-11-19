// المصادقة: كلمات مرور بـ scrypt، جلسات موقّعة (HMAC) في كوكي HttpOnly، وتحديد معدل المحاولات.
"use strict";
const crypto = require("crypto");

const COOKIE = "gs";
const MAX_AGE = 7 * 24 * 3600; // 7 أيام

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(pw), salt, 64);
  return "scrypt$" + salt.toString("hex") + "$" + key.toString("hex");
}
function verifyPassword(pw, stored) {
  try {
    const [alg, saltHex, keyHex] = String(stored).split("$");
    if (alg !== "scrypt") return false;
    const key = crypto.scryptSync(String(pw), Buffer.from(saltHex, "hex"), 64);
    return crypto.timingSafeEqual(key, Buffer.from(keyHex, "hex"));
  } catch { return false; }
}

const b64 = (s) => Buffer.from(s).toString("base64url");
function sign(payload, secret) {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return body + "." + mac;
}
function verify(token, secret) {
  if (!token || token.indexOf(".") < 0) return null;
  const [body, mac] = token.split(".");
  const good = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}
function parseCookies(h) {
  const out = {};
  String(h || "").split(";").forEach((p) => { const i = p.indexOf("="); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function setSession(res, secret, data, secure) {
  const token = sign({ ...data, exp: Math.floor(Date.now() / 1000) + MAX_AGE }, secret);
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? "; Secure" : ""}`);
}
function clearSession(res) { res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`); }
function readSession(req, secret) { return verify(parseCookies(req.headers.cookie)[COOKIE], secret); }

// تحديد معدل بسيط في الذاكرة: يسمح بـ max محاولة لكل windowMs لكل مفتاح
function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now(), arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now); hits.set(key, arr);
    if (hits.size > 5000) hits.clear();
    return arr.length <= max;
  };
}

module.exports = { hashPassword, verifyPassword, setSession, clearSession, readSession, limiter };
