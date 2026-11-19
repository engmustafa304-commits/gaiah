// منطق البيانات: الواجهة العامة، رؤية المزود المحدودة بصلاحياته، والتحقق من تعديلاته.
"use strict";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v, max) => String(v == null ? "" : v).slice(0, max);
const int = (v, min, max, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d; };
const isDate = (s) => typeof s === "string" && DATE.test(s);
const today = () => new Date().toISOString().slice(0, 10);

// ===== الواجهة العامة: القاعات المعتمدة فقط، بلا بيانات خاصة =====
function publicDb(db) {
  const ids = new Set(db.venues.filter((v) => v.status === "approved").map((v) => v.id));
  return {
    v: db.v,
    providers: [], users: [], giveaways: [], activity: [], withdrawals: [],
    venues: db.venues.filter((v) => ids.has(v.id)).map((v) => ({
      id: v.id, pid: v.pid, n: v.n, nameEn: v.nameEn, c: v.c, t: v.t, cap: v.cap, i: v.i, r: v.r, rv: v.rv, s: v.s,
      desc: v.desc, features: v.features, address: v.address, mapUrl: v.mapUrl, phone: v.phone, photos: v.photos, cover: v.cover,
      pkgs: v.pkgs, policy: v.policy, depositPct: v.depositPct, featured: v.featured, status: "approved",
    })),
    reviews: db.reviews.filter((r) => r.status === "shown" && ids.has(r.vid)).map((r) => ({ id: r.id, vid: r.vid, name: r.name, stars: r.stars, text: r.text, status: "shown", date: r.date, reply: r.reply })),
    // للتوافر فقط: التاريخ والحالة بلا أي بيانات عميل
    bookings: db.bookings.filter((b) => (b.status === "ok" || b.status === "wait") && ids.has(b.vid)).map((b) => ({ vid: b.vid, date: b.date, status: b.status })),
    blocked: Object.fromEntries(Object.entries(db.blocked || {}).filter(([k]) => ids.has(+k))),
    settings: { announce: db.settings.announce, extraCities: db.settings.extraCities || [], maintenance: !!db.settings.maintenance, commission: db.settings.commission },
  };
}

// ===== رؤية المزود: بياناته فقط =====
function providerView(db, pid) {
  const mine = db.venues.filter((v) => v.pid === pid), ids = new Set(mine.map((v) => v.id));
  let maxId = 100; db.venues.forEach((v) => { if (v.id > maxId) maxId = v.id; });
  return {
    v: db.v, me: { pid, nextVenueId: maxId + 1 },
    providers: db.providers.filter((p) => p.id === pid),
    venues: mine,
    bookings: db.bookings.filter((b) => b.pid === pid),
    reviews: db.reviews.filter((r) => ids.has(r.vid)),
    blocked: Object.fromEntries(Object.entries(db.blocked || {}).filter(([k]) => ids.has(+k))),
    withdrawals: (db.withdrawals || []).filter((w) => w.pid === pid),
    settings: { commission: db.settings.commission, autoApprove: !!db.settings.autoApprove, announce: db.settings.announce, extraCities: db.settings.extraCities || [] },
    activity: [], users: [], giveaways: [],
  };
}

function nextStatus(old, req, auto) {
  if (old && req === old) return old;
  if (!old) return req === "pending" ? (auto ? "approved" : "pending") : "draft";
  switch (old) {
    case "approved": return req === "hidden" ? "hidden" : "approved";
    case "hidden": return req === "approved" ? "approved" : "hidden";
    case "pending": return req === "draft" ? "draft" : "pending";
    default: return req === "pending" ? (auto ? "approved" : "pending") : "draft"; // draft / rejected
  }
}

function cleanVenue(v, ctx) {
  const url = (s) => (/^https?:\/\//i.test(String(s)) ? str(s, 300) : "");
  return {
    n: str(v.n, 80).trim(), nameEn: str(v.nameEn, 80).trim(), c: str(v.c, 40),
    t: ctx.TYPES.includes(v.t) ? v.t : ctx.TYPES[0],
    cap: int(v.cap, 1, 20000, 100), i: !!v.i, desc: str(v.desc, 1200),
    features: (Array.isArray(v.features) ? v.features : []).slice(0, 30).map((f) => str(f, 60)).filter(Boolean),
    address: str(v.address, 200), mapUrl: url(v.mapUrl), phone: str(v.phone, 20),
    photos: (Array.isArray(v.photos) ? v.photos : []).filter((p) => typeof p === "string" && p.length < 900000 && /^(data:image\/(jpeg|png|webp);base64,|\/uploads\/)/.test(p)).slice(0, 12),
    cover: int(v.cover, 0, 11, 0),
    pkgs: (Array.isArray(v.pkgs) ? v.pkgs : []).slice(0, 12).map((p) => ({
      n: str(p.n, 80), g: int(p.g, 1, 20000, 100), chairs: !!p.chairs, sec: ctx.SEC_TYPES.includes(p.sec) ? p.sec : ctx.SEC_TYPES[0],
      from: isDate(p.from) ? p.from : today(), to: isDate(p.to) ? p.to : today(),
      svc: (Array.isArray(p.svc) ? p.svc : []).slice(0, 20).map((x) => str(x, 80)).filter(Boolean),
    })),
    policy: (Array.isArray(v.policy) ? v.policy : []).slice(0, 6).map((t) => ({ d: int(t.d, 0, 365, 0), p: int(t.p, 0, 100, 0) })),
    depositPct: int(v.depositPct, 0, 100, 20), s: int(v.s, 1, 1000, 1),
  };
}

const BK_NEXT = { new: ["wait", "no", "cancel"], wait: ["ok", "no", "cancel"], ok: ["done", "cancel"], done: [], no: [], cancel: [] };
const hasClash = (db, b) =>
  (db.blocked[b.vid] || []).includes(b.date) ||
  db.bookings.some((x) => x.id !== b.id && x.vid === b.vid && x.date === b.date && (x.status === "wait" || x.status === "ok"));

// يطبّق تعديلات المزود على قاعدة البيانات الكاملة مع التحقق من الملكية والانتقالات المسموحة.
function applyProviderPatch(db, pid, body, ctx) {
  const prov = db.providers.find((p) => p.id === pid);
  if (!prov) return "المزود غير موجود";
  const auto = !!db.settings.autoApprove;
  const idMap = {};

  // 1) القاعات
  if (Array.isArray(body.venues)) {
    const incoming = body.venues.slice(0, 200);
    const mineNow = db.venues.filter((v) => v.pid === pid);
    const keep = new Set((Array.isArray(body.venueIds) ? body.venueIds : []).map(Number));
    let maxId = 100; db.venues.forEach((v) => { if (v.id > maxId) maxId = v.id; });
    for (const iv of incoming) {
      let id = int(iv.id, 1, 1e9, 0);
      const existing = db.venues.find((v) => v.id === id);
      if (existing && existing.pid !== pid) { id = ++maxId; idMap[iv.id] = id; } // معرّف يخص مزودًا آخر
      const old = existing && existing.pid === pid ? existing : null;
      const c = cleanVenue(iv, ctx);
      const status = nextStatus(old && old.status, str(iv.status, 12), auto);
      if (old) {
        Object.assign(old, c, { status });
        if (status === "pending" || status === "approved") old.adminNote = "";
        keep.add(old.id);
      } else {
        if (!id || db.venues.some((v) => v.id === id)) id = ++maxId;
        db.venues.push({ id, pid, ...c, status, featured: false, r: 0, rv: 0, adminNote: "", created: today() });
        keep.add(id);
        if (iv.id !== id) idMap[iv.id] = id;
      }
    }
    // حذف القاعات التي أزالها المزود (إلا ذات الحجوزات القادمة)
    for (const v of mineNow) {
      if (keep.has(v.id)) continue;
      const active = db.bookings.some((b) => b.vid === v.id && ["new", "wait", "ok"].includes(b.status) && b.date >= today());
      if (!active) db.venues = db.venues.filter((x) => x.id !== v.id);
    }
  }
  const myIds = new Set(db.venues.filter((v) => v.pid === pid).map((v) => v.id));

  // 2) الحجوزات: تغيير الحالة والملاحظة فقط، أو إضافة حجز يدوي
  if (Array.isArray(body.bookings)) {
    for (const ib of body.bookings.slice(0, 2000)) {
      const cur = db.bookings.find((b) => b.id === ib.id);
      if (cur) {
        if (cur.pid !== pid) continue;
        if (ib.status && ib.status !== cur.status) {
          if (!(BK_NEXT[cur.status] || []).includes(ib.status)) return "انتقال غير مسموح في حالة الحجز " + cur.id;
          if ((ib.status === "wait" || ib.status === "ok") && cur.status === "new" && hasClash(db, cur)) return "يوجد حجز آخر أو حظر لنفس التاريخ";
          cur.status = ib.status;
        }
        cur.note = str(ib.note, 500);
      } else if (ib.note === "حجز يدوي" && ib.status === "ok" && myIds.has(+ib.vid) && isDate(ib.date) && ib.date >= today()) {
        const nb = { id: "B-" + (1001 + db.bookings.length + Math.floor(Math.random() * 500)), vid: +ib.vid, pid, customer: str(ib.customer, 60), phone: str(ib.phone, 20),
          date: ib.date, guests: int(ib.guests, 1, 20000, 100), pkg: str(ib.pkg, 60), amount: int(ib.amount, 0, 1e8, 0), status: "ok", created: today(), note: "حجز يدوي" };
        if (!nb.customer) return "اسم العميل مطلوب";
        if (hasClash(db, nb)) return "التاريخ غير متاح لهذه القاعة";
        while (db.bookings.some((b) => b.id === nb.id)) nb.id += "x";
        db.bookings.push(nb);
      }
    }
  }

  // 3) رد المزود على التقييمات
  if (Array.isArray(body.reviews)) {
    for (const ir of body.reviews) {
      const r = db.reviews.find((x) => x.id === ir.id);
      if (r && myIds.has(r.vid)) r.reply = str(ir.reply, 300);
    }
  }
  // 4) حظر الأيام
  if (body.blocked && typeof body.blocked === "object") {
    for (const [k, arr] of Object.entries(body.blocked)) {
      if (!myIds.has(+k) || !Array.isArray(arr)) continue;
      db.blocked[k] = [...new Set(arr.filter(isDate))].slice(0, 400);
    }
  }
  // 5) طلبات السحب (إضافة فقط)
  if (Array.isArray(body.withdrawals)) {
    db.withdrawals = db.withdrawals || [];
    for (const w of body.withdrawals.slice(0, 200)) {
      if (db.withdrawals.some((x) => x.id === w.id)) continue;
      const amount = int(w.amount, 1, 1e9, 0);
      if (amount > 0) db.withdrawals.push({ id: "W" + Date.now() + Math.floor(Math.random() * 1000), pid, date: today(), amount, status: "pending" });
    }
  }
  // 6) بيانات المنشأة
  const ip = Array.isArray(body.providers) && body.providers.find((p) => p.id === pid);
  if (ip) {
    prov.name = str(ip.name, 80).trim() || prov.name; prov.owner = str(ip.owner, 80); prov.phone = str(ip.phone, 20);
    prov.email = str(ip.email, 120); prov.city = str(ip.city, 40); prov.cr = str(ip.cr, 30);
    if (ip.notif && typeof ip.notif === "object") prov.notif = Object.fromEntries(Object.entries(ip.notif).slice(0, 10).map(([k, v]) => [str(k, 12), !!v]));
  }
  // 7) سجل النشاط
  if (Array.isArray(body.activity)) {
    const fresh = body.activity.filter((a) => a && typeof a.txt === "string" && !db.activity.some((x) => x.t === a.t && x.txt === a.txt)).slice(0, 10);
    for (const a of fresh.reverse()) db.activity.unshift({ t: new Date().toISOString().slice(0, 16), who: prov.name, txt: str(a.txt, 200) });
    db.activity = db.activity.slice(0, 80);
  }
  return { idMap };
}

function validAdminDb(d) {
  if (!d || typeof d !== "object" || d.v !== 3) return false;
  for (const k of ["providers", "venues", "bookings", "reviews", "giveaways", "users", "activity"]) if (!Array.isArray(d[k])) return false;
  return d.settings && typeof d.settings === "object" && d.blocked && typeof d.blocked === "object";
}

module.exports = { publicDb, providerView, applyProviderPatch, validAdminDb, hasClash, isDate, str, int, today };
