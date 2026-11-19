// خادم جيّة: يقدّم الواجهة (public/) وواجهة API فوق قاعدة SQLite.
"use strict";
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const { DatabaseSync } = require("node:sqlite");
const auth = require("./auth");
const scope = require("./scope");
const { buildSeed, loadData } = require("./seed");

const PROD = process.env.NODE_ENV === "production";
const DEV_PW = "Gaiah@2026";

function emptyDb() {
  return {
    v: 3, providers: [], venues: [], bookings: [], reviews: [], giveaways: [], users: [], activity: [], blocked: {}, withdrawals: [],
    settings: { commission: 5, announce: "أهلًا بك في جيّة", featuredMax: 6, maintenance: false, autoApprove: false, extraCities: [] },
  };
}

function createApp(opts = {}) {
  const dataDir = opts.dataDir || process.env.DATA_DIR || path.join(__dirname, "..", "data");
  if (!opts.memory) fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(opts.memory ? ":memory:" : path.join(dataDir, "gaiah.db"));
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT);
    CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, login TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, ref TEXT, created TEXT);`);

  // سر الجلسات: من البيئة، وإلا يُولَّد ويُحفظ في مجلد البيانات
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    const f = path.join(dataDir, "session.key");
    if (opts.memory) secret = crypto.randomBytes(32).toString("hex");
    else { if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString("hex"), { mode: 0o600 }); secret = fs.readFileSync(f, "utf8").trim(); }
  }
  const ctx = loadData();
  const demo = opts.demo !== undefined ? opts.demo : (process.env.SEED_DEMO ? process.env.SEED_DEMO === "true" : !PROD);

  const q = {
    get: db.prepare("SELECT value FROM kv WHERE key='db'"),
    set: db.prepare("INSERT INTO kv(key,value,updated) VALUES('db',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated=excluded.updated"),
    acc: db.prepare("SELECT * FROM accounts WHERE login=? AND role=?"),
    addAcc: db.prepare("INSERT INTO accounts(role,login,hash,ref,created) VALUES(?,?,?,?,?)"),
    countAcc: db.prepare("SELECT COUNT(*) AS n FROM accounts"),
    delAcc: db.prepare("DELETE FROM accounts"),
    setHash: db.prepare("UPDATE accounts SET hash=? WHERE id=?"),
  };
  const getDb = () => JSON.parse(q.get.get().value);
  const saveDb = (o) => q.set.run(JSON.stringify(o), new Date().toISOString());
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "");

  function seedAll() {
    q.delAcc.run();
    saveDb(demo ? buildSeed() : emptyDb());
    const adminEmail = process.env.ADMIN_EMAIL || (PROD ? "" : "admin@gaiah.local");
    const adminPw = process.env.ADMIN_PASSWORD || (PROD ? "" : "Gaiah@Admin2026");
    if (!adminEmail || !adminPw) throw new Error("حدّد ADMIN_EMAIL و ADMIN_PASSWORD في بيئة الإنتاج");
    q.addAcc.run("admin", norm(adminEmail), auth.hashPassword(adminPw), "admin", new Date().toISOString());
    if (demo) getDb().providers.forEach((p) => q.addAcc.run("provider", norm(p.phone), auth.hashPassword(process.env.DEMO_PASSWORD || DEV_PW), p.id, new Date().toISOString()));
  }
  if (!q.get.get() || q.countAcc.get().n === 0) seedAll();

  const app = express();
  app.disable("x-powered-by");
  if (PROD || process.env.TRUST_PROXY) app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })); // CSP لاحقًا بعد نقل السكربتات المضمّنة
  const loginLimit = auth.limiter(opts.loginMax || 10, 15 * 60 * 1000), bookLimit = auth.limiter(opts.bookMax || 20, 3600 * 1000), regLimit = auth.limiter(opts.regMax || 5, 3600 * 1000);
  const ip = (req) => req.ip || req.socket.remoteAddress || "x";
  const small = express.json({ limit: "100kb" }), big = express.json({ limit: "40mb" });

  // حماية CSRF: الطلبات المعدِّلة تتطلب ترويسة مخصّصة (لا يمكن إرسالها من موقع آخر دون CORS)
  app.use("/api", (req, res, next) => {
    if (req.method !== "GET" && req.headers["x-requested-with"] !== "gaiah") return res.status(403).json({ ok: false, error: "طلب غير مصرّح" });
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  const session = (req) => auth.readSession(req, secret);
  const need = (role) => (req, res, next) => {
    const s = session(req);
    if (!s || s.role !== role) return res.status(401).json({ ok: false, error: "سجّل الدخول للمتابعة" });
    req.sess = s; next();
  };

  // ===== عام =====
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.get("/api/public-db", (req, res) => res.json(scope.publicDb(getDb())));

  app.post("/api/bookings", small, (req, res) => {
    if (!bookLimit(ip(req))) return res.status(429).json({ ok: false, error: "محاولات كثيرة، حاول لاحقًا" });
    const b = req.body || {}, d = getDb();
    const v = d.venues.find((x) => x.id === +b.vid && x.status === "approved");
    const name = scope.str(b.name, 60).trim(), phone = scope.str(b.phone, 10);
    if (!v) return res.status(404).json({ ok: false, error: "القاعة غير موجودة" });
    if (name.length < 3 || !/^05\d{8}$/.test(phone)) return res.status(400).json({ ok: false, error: "أدخل الاسم ورقم جوال سعودي صحيح يبدأ بـ 05" });
    if (!scope.isDate(b.date) || b.date < scope.today()) return res.status(400).json({ ok: false, error: "تاريخ غير صالح" });
    const guests = scope.int(b.guests, 1, 100000, 0);
    if (guests < 1 || guests > v.cap) return res.status(400).json({ ok: false, error: "عدد الضيوف يتجاوز سعة القاعة (" + v.cap + ")" });
    const nb = { id: "", vid: v.id, pid: v.pid, customer: name, phone, date: b.date, guests, pkg: scope.str(b.pkg, 60) || "القاعة فقط", amount: Math.round(guests * 60 / 100) * 100,
      status: "new", created: scope.today(), note: "طلب من الموقع" + (b.installments ? " — يرغب بالتقسيط" : "") };
    if (scope.hasClash(d, nb)) return res.status(409).json({ ok: false, error: "هذا التاريخ غير متاح، اختر تاريخًا آخر من التقويم" });
    do { nb.id = "B-" + (1001 + Math.floor(Math.random() * 90000)); } while (d.bookings.some((x) => x.id === nb.id));
    d.bookings.push(nb);
    d.activity.unshift({ t: new Date().toISOString().slice(0, 16), who: "زائر الموقع", txt: "أرسل طلب حجز لـ «" + v.n + "»" });
    d.activity = d.activity.slice(0, 80);
    saveDb(d);
    res.json({ ok: true, id: nb.id });
  });

  // ===== المصادقة =====
  app.post("/api/auth/login", small, (req, res) => {
    if (!loginLimit(ip(req))) return res.status(429).json({ ok: false, error: "محاولات كثيرة، حاول بعد قليل" });
    const { role, login, password } = req.body || {};
    if (!["provider", "admin"].includes(role)) return res.status(400).json({ ok: false, error: "نوع الحساب غير صالح" });
    const acc = q.acc.get(norm(login), role);
    if (!acc || !auth.verifyPassword(password, acc.hash)) return res.status(401).json({ ok: false, error: "بيانات الدخول غير صحيحة" });
    if (role === "provider") {
      const p = getDb().providers.find((x) => x.id === acc.ref);
      if (!p) return res.status(401).json({ ok: false, error: "الحساب غير موجود" });
      if (p.status === "pending") return res.status(403).json({ ok: false, error: "حسابك قيد المراجعة، سنوثّقه قريبًا" });
      if (p.status === "suspended") return res.status(403).json({ ok: false, error: "الحساب موقوف، تواصل مع الدعم" });
    }
    auth.setSession(res, secret, { role, ref: acc.ref }, PROD);
    res.json({ ok: true, role });
  });
  app.post("/api/auth/logout", small, (req, res) => { auth.clearSession(res); res.json({ ok: true }); });
  app.get("/api/auth/me", (req, res) => { const s = session(req); s ? res.json({ ok: true, role: s.role, ref: s.ref }) : res.status(401).json({ ok: false }); });

  app.post("/api/auth/register-provider", small, (req, res) => {
    if (!regLimit(ip(req))) return res.status(429).json({ ok: false, error: "محاولات كثيرة، حاول لاحقًا" });
    const b = req.body || {}, name = scope.str(b.name, 80).trim(), owner = scope.str(b.owner, 80).trim(), phone = scope.str(b.phone, 10), pw = String(b.password || "");
    if (name.length < 2 || owner.length < 3 || !/^05\d{8}$/.test(phone)) return res.status(400).json({ ok: false, error: "أكمل الاسم واسم المنشأة وأدخل رقم جوال صحيحًا يبدأ بـ 05" });
    if (pw.length < 8) return res.status(400).json({ ok: false, error: "كلمة المرور 8 أحرف على الأقل" });
    if (q.acc.get(norm(phone), "provider")) return res.status(409).json({ ok: false, error: "هذا الرقم مسجّل مسبقًا" });
    const d = getDb();
    let n = d.providers.length + 1; while (d.providers.some((p) => p.id === "P" + n)) n++;
    const id = "P" + n;
    d.providers.push({ id, name, owner, phone, email: scope.str(b.email, 120), city: (ctx.CITIES || [])[0] || "الرياض", status: "pending", joined: scope.today(), cr: "" });
    d.activity.unshift({ t: new Date().toISOString().slice(0, 16), who: name, txt: "طلب الانضمام كمزود خدمة" });
    saveDb(d);
    q.addAcc.run("provider", norm(phone), auth.hashPassword(pw), id, new Date().toISOString());
    res.json({ ok: true });
  });

  // ===== المزود =====
  app.get("/api/provider/db", need("provider"), (req, res) => {
    const d = getDb(), p = d.providers.find((x) => x.id === req.sess.ref);
    if (!p || p.status !== "verified") { auth.clearSession(res); return res.status(401).json({ ok: false, error: "الحساب غير مفعّل" }); }
    res.json(scope.providerView(d, p.id));
  });
  app.put("/api/provider/db", need("provider"), big, (req, res) => {
    const d = getDb(), p = d.providers.find((x) => x.id === req.sess.ref);
    if (!p || p.status !== "verified") return res.status(403).json({ ok: false, error: "الحساب غير مفعّل" });
    const r = scope.applyProviderPatch(d, p.id, req.body || {}, ctx);
    if (typeof r === "string") return res.status(400).json({ ok: false, error: r });
    saveDb(d);
    res.json({ ok: true, idMap: r.idMap, db: scope.providerView(d, p.id) });
  });

  // ===== الإدارة =====
  app.get("/api/admin/db", need("admin"), (req, res) => res.json(getDb()));
  app.put("/api/admin/db", need("admin"), big, (req, res) => {
    const d = req.body && req.body.db;
    if (!scope.validAdminDb(d)) return res.status(400).json({ ok: false, error: "بيانات غير صالحة" });
    delete d.me; saveDb(d);
    res.json({ ok: true });
  });
  app.post("/api/admin/reset", need("admin"), small, (req, res) => {
    if (PROD && process.env.ALLOW_RESET !== "true") return res.status(403).json({ ok: false, error: "إعادة الضبط معطّلة في الإنتاج" });
    seedAll(); auth.clearSession(res); res.json({ ok: true });
  });
  app.post("/api/admin/set-password", need("admin"), small, (req, res) => {
    const { providerId, password } = req.body || {};
    const d = getDb(); const p = d.providers.find((x) => x.id === providerId);
    if (!p || String(password || "").length < 8) return res.status(400).json({ ok: false, error: "بيانات غير صالحة" });
    const acc = q.acc.get(norm(p.phone), "provider");
    acc ? q.setHash.run(auth.hashPassword(password), acc.id) : q.addAcc.run("provider", norm(p.phone), auth.hashPassword(password), p.id, new Date().toISOString());
    res.json({ ok: true });
  });

  app.use("/api", (req, res) => res.status(404).json({ ok: false, error: "غير موجود" }));
  app.use("/vendor/lenis.min.js", (req, res) => res.sendFile(path.join(__dirname, "..", "node_modules", "lenis", "dist", "lenis.min.js")));
  app.use(express.static(path.join(__dirname, "..", "public"), { extensions: ["html"], maxAge: PROD ? "1h" : 0 }));
  app.use((err, req, res, next) => { // eslint-disable-line
    if (err && err.type === "entity.too.large") return res.status(413).json({ ok: false, error: "الحجم كبير جدًا (قلّل عدد الصور)" });
    if (err && err.type === "entity.parse.failed") return res.status(400).json({ ok: false, error: "طلب غير صالح" });
    console.error(err); res.status(500).json({ ok: false, error: "خطأ في الخادم" });
  });

  return { app, db, close: () => db.close(), getDb, seedAll };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const { app } = createApp();
  app.listen(port, () => {
    console.log("\n  جيّة تعمل على  http://localhost:" + port);
    if (!PROD) {
      console.log("  حسابات التطوير:");
      console.log("    الإدارة : admin@gaiah.local  /  Gaiah@Admin2026   → /login.html?t=admin");
      console.log("    مزود    : 0551234567        /  " + DEV_PW + "          → /login.html?t=provider");
    }
    console.log("");
  });
}

module.exports = { createApp };
