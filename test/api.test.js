"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");
const { createApp } = require("../server/index");

let srv, base, ctx;
test.before(async () => {
  ctx = createApp({ memory: true, demo: true, dataDir: path.join(os.tmpdir(), "gaiah-test"), loginMax: 1000, bookMax: 1000, regMax: 1000 });
  await new Promise((r) => { srv = ctx.app.listen(0, r); });
  base = "http://127.0.0.1:" + srv.address().port;
});
test.after(() => { srv.close(); ctx.close(); });

async function call(method, url, { body, cookie, noCsrf } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (!noCsrf) headers["X-Requested-With"] = "gaiah";
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, cookie: (res.headers.get("set-cookie") || "").split(";")[0] };
}
const loginProvider = async (phone = "0551234567") => (await call("POST", "/api/auth/login", { body: { role: "provider", login: phone, password: "Gaiah@2026" } }));
const loginAdmin = async () => (await call("POST", "/api/auth/login", { body: { role: "admin", login: "admin@gaiah.local", password: "Gaiah@Admin2026" } }));
const future = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

test("الصحة والواجهة العامة بلا بيانات خاصة", async () => {
  assert.equal((await call("GET", "/api/health")).json.ok, true);
  const { json } = await call("GET", "/api/public-db");
  assert.ok(json.venues.length >= 12);
  assert.equal(json.providers.length, 0);
  assert.equal(json.users.length, 0);
  assert.ok(json.venues.every((v) => v.status === "approved"));
  assert.ok(json.bookings.every((b) => Object.keys(b).sort().join() === "date,status,vid"), "الحجوزات العامة للتوافر فقط");
  assert.ok(!JSON.stringify(json).includes("customer"));
});

test("حماية CSRF: الطلب المعدِّل بلا ترويسة مرفوض", async () => {
  assert.equal((await call("POST", "/api/auth/logout", { noCsrf: true })).status, 403);
});

test("الدخول: خطأ كلمة المرور، ثم نجاح المزود", async () => {
  assert.equal((await call("POST", "/api/auth/login", { body: { role: "provider", login: "0551234567", password: "wrong" } })).status, 401);
  const ok = await loginProvider();
  assert.equal(ok.status, 200);
  assert.ok(ok.cookie.startsWith("gs="));
  assert.equal((await call("GET", "/api/provider/db")).status, 401, "بلا كوكي يرفض");
});

test("المزود يرى قاعاته فقط", async () => {
  const { cookie } = await loginProvider();
  const { json } = await call("GET", "/api/provider/db", { cookie });
  assert.ok(json.venues.length >= 3);
  assert.ok(json.venues.every((v) => v.pid === "P1"));
  assert.ok(json.bookings.every((b) => b.pid === "P1"));
  assert.equal(json.users.length, 0);
});

test("المزود: إضافة قاعة مسودة ثم إرسالها (تبقى قيد المراجعة ولا يعتمدها بنفسه)", async () => {
  const { cookie } = await loginProvider();
  let { json } = await call("GET", "/api/provider/db", { cookie });
  const id = json.me.nextVenueId;
  const nv = { id, n: "قاعة اختبار", c: "الرياض", t: "قاعة صغيرة", cap: 200, i: true, desc: "وصف طويل بما يكفي لقاعة الاختبار هذه.", features: ["مسبح"], address: "الرياض", phone: "0551234567", photos: [], pkgs: [], policy: [{ d: 30, p: 100 }], depositPct: 20, status: "pending" };
  let r = await call("PUT", "/api/provider/db", { cookie, body: { venues: [...json.venues, nv] } });
  assert.equal(r.status, 200);
  const saved = r.json.db.venues.find((v) => v.n === "قاعة اختبار");
  assert.equal(saved.status, "pending");
  // محاولة اعتماد ذاتي
  saved.status = "approved";
  r = await call("PUT", "/api/provider/db", { cookie, body: { venues: r.json.db.venues } });
  assert.equal(r.json.db.venues.find((v) => v.n === "قاعة اختبار").status, "pending", "لا يعتمد قاعته بنفسه");
});

test("المزود لا يستطيع تعديل قاعة مزود آخر", async () => {
  const { cookie } = await loginProvider();
  const before = ctx.getDb().venues.find((v) => v.id === 1).n;
  await call("PUT", "/api/provider/db", { cookie, body: { venues: [{ id: 1, n: "اختراق", c: "جدة", t: "قصر أفراح", cap: 10, status: "approved" }] } });
  assert.equal(ctx.getDb().venues.find((v) => v.id === 1).n, before);
});

test("الحجوزات: انتقال مسموح وآخر مرفوض", async () => {
  const { cookie } = await loginProvider();
  const { json } = await call("GET", "/api/provider/db", { cookie });
  const nb = json.bookings.find((b) => b.status === "new");
  if (nb) {
    nb.status = "wait";
    const r = await call("PUT", "/api/provider/db", { cookie, body: { bookings: [nb] } });
    assert.ok(r.status === 200 || r.status === 400); // 400 فقط عند تعارض تاريخ حقيقي
  }
  const done = json.bookings.find((b) => b.status === "done");
  const bad = await call("PUT", "/api/provider/db", { cookie, body: { bookings: [{ ...done, status: "new" }] } });
  assert.equal(bad.status, 400);
});

test("الإدارة تعتمد قاعة فتظهر في الواجهة العامة", async () => {
  const a = await loginAdmin();
  const { json } = await call("GET", "/api/admin/db", { cookie: a.cookie });
  const pending = json.venues.find((v) => v.status === "pending");
  assert.ok(pending);
  pending.status = "approved";
  assert.equal((await call("PUT", "/api/admin/db", { cookie: a.cookie, body: { db: json } })).status, 200);
  const pub = await call("GET", "/api/public-db");
  assert.ok(pub.json.venues.some((v) => v.id === pending.id));
  // المزود لا يصل لمسار الإدارة
  const p = await loginProvider();
  assert.equal((await call("GET", "/api/admin/db", { cookie: p.cookie })).status, 401);
});

test("الحجز العام: ينجح، ويرفض تاريخًا محظورًا", async () => {
  const body = { vid: 11, date: future(200), guests: 100, pkg: "القاعة فقط", name: "سارة العتيبي", phone: "0509998877" };
  const ok = await call("POST", "/api/bookings", { body });
  assert.equal(ok.status, 200);
  assert.match(ok.json.id, /^B-/);
  const pub = await call("GET", "/api/public-db");
  const blocked = pub.json.blocked["11"][0];
  assert.equal((await call("POST", "/api/bookings", { body: { ...body, date: blocked } })).status, 409);
});

test("الحجز العام: التحقق من المدخلات", async () => {
  const base_ = { vid: 11, date: future(210), guests: 100, name: "سارة العتيبي", phone: "0509998877" };
  assert.equal((await call("POST", "/api/bookings", { body: { ...base_, phone: "123" } })).status, 400);
  assert.equal((await call("POST", "/api/bookings", { body: { ...base_, guests: 99999 } })).status, 400);
  assert.equal((await call("POST", "/api/bookings", { body: { ...base_, date: "2020-01-01" } })).status, 400);
  assert.equal((await call("POST", "/api/bookings", { body: { ...base_, vid: 9999 } })).status, 404);
});

test("السحوبات: مشاركة عامة مرة واحدة لكل رقم، ولا تُسرَّب الأرقام", async () => {
  const pub = (await call("GET", "/api/public-db")).json;
  const g = pub.giveaways.find((x) => x.status === "open");
  assert.ok(g);
  assert.equal(g.entries, undefined);
  const closed = pub.giveaways.find((x) => x.status === "closed");
  assert.match(closed.winner, /^05\*{5}\d{3}$/);
  const ph = "0507771122", url = `/api/giveaways/${g.id}/enter`;
  assert.equal((await call("POST", url, { body: { phone: "123" } })).status, 400);
  assert.equal((await call("POST", url, { body: { phone: ph }, noCsrf: true })).status, 403);
  assert.equal((await call("POST", url, { body: { phone: ph } })).status, 200);
  assert.equal((await call("POST", url, { body: { phone: ph } })).status, 409);
  assert.equal((await call("POST", `/api/giveaways/${closed.id}/enter`, { body: { phone: ph } })).status, 409);
  assert.equal((await call("POST", "/api/giveaways/NOPE/enter", { body: { phone: ph } })).status, 404);
  const a = await loginAdmin();
  const adm = (await call("GET", "/api/admin/db", { cookie: a.cookie })).json;
  assert.ok(adm.giveaways.find((x) => x.id === g.id).entries.includes(ph));
  // حفظ الإدارة بنسخة قديمة لا يمحو مشاركة وصلت بعد تحميلها
  const stale = JSON.parse(JSON.stringify(adm));
  stale.giveaways.find((x) => x.id === g.id).entries = stale.giveaways.find((x) => x.id === g.id).entries.filter((p) => p !== ph);
  assert.equal((await call("PUT", "/api/admin/db", { cookie: a.cookie, body: { db: stale } })).status, 200);
  assert.ok((await call("GET", "/api/admin/db", { cookie: a.cookie })).json.giveaways.find((x) => x.id === g.id).entries.includes(ph));
});

test("التواصل: رسالة عامة تصل للإدارة فقط وتُعالج وتُحذف", async () => {
  const m = { name: "سارة العتيبي", phone: "0509998877", topic: "أخرى", message: "أرغب بالاستفسار" };
  assert.equal((await call("POST", "/api/contact", { body: { ...m, phone: "123" } })).status, 400);
  assert.equal((await call("POST", "/api/contact", { body: { ...m, message: "" } })).status, 400);
  assert.equal((await call("POST", "/api/contact", { body: m, noCsrf: true })).status, 403);
  assert.equal((await call("POST", "/api/contact", { body: m })).status, 200);
  assert.equal((await call("GET", "/api/admin/inquiries")).status, 401);
  const p = await loginProvider();
  assert.equal((await call("GET", "/api/admin/inquiries", { cookie: p.cookie })).status, 401);
  const a = await loginAdmin();
  const list = await call("GET", "/api/admin/inquiries", { cookie: a.cookie });
  const it = list.json.items.find((x) => x.message === m.message);
  assert.ok(it && it.done === 0);
  await call("POST", `/api/admin/inquiries/${it.id}/done`, { cookie: a.cookie, body: { done: true } });
  assert.equal((await call("GET", "/api/admin/inquiries", { cookie: a.cookie })).json.items.find((x) => x.id === it.id).done, 1);
  await call("DELETE", `/api/admin/inquiries/${it.id}`, { cookie: a.cookie });
  assert.ok(!(await call("GET", "/api/admin/inquiries", { cookie: a.cookie })).json.items.some((x) => x.id === it.id));
});

test("تسجيل مزود جديد: قيد المراجعة ثم يدخل بعد التوثيق", async () => {
  const reg = await call("POST", "/api/auth/register-provider", { body: { name: "قاعة الريف", owner: "خالد المنصور", phone: "0561234567", password: "Pass12345" } });
  assert.equal(reg.status, 200);
  assert.equal((await call("POST", "/api/auth/register-provider", { body: { name: "قاعة الريف", owner: "خالد المنصور", phone: "0561234567", password: "Pass12345" } })).status, 409);
  const early = await call("POST", "/api/auth/login", { body: { role: "provider", login: "0561234567", password: "Pass12345" } });
  assert.equal(early.status, 403);
  const a = await loginAdmin();
  const { json } = await call("GET", "/api/admin/db", { cookie: a.cookie });
  json.providers.find((p) => p.phone === "0561234567").status = "verified";
  await call("PUT", "/api/admin/db", { cookie: a.cookie, body: { db: json } });
  const ok = await call("POST", "/api/auth/login", { body: { role: "provider", login: "0561234567", password: "Pass12345" } });
  assert.equal(ok.status, 200);
  const mine = await call("GET", "/api/provider/db", { cookie: ok.cookie });
  assert.equal(mine.json.venues.length, 0);
});

test("حد محاولات الدخول يعمل (429 بعد تجاوز الحد)", async () => {
  const c2 = createApp({ memory: true, demo: true, loginMax: 3 });
  const s2 = await new Promise((r) => { const s = c2.app.listen(0, () => r(s)); });
  const b2 = "http://127.0.0.1:" + s2.address().port;
  const post = () => fetch(b2 + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "gaiah" }, body: JSON.stringify({ role: "admin", login: "x", password: "y" }) }).then((r) => r.status);
  const codes = []; for (let i = 0; i < 5; i++) codes.push(await post());
  s2.close(); c2.close();
  assert.deepEqual(codes, [401, 401, 401, 429, 429]);
});