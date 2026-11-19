// توليد البيانات الأولية (قاعات، حجوزات، تقييمات…) عند أول تشغيل أو عند إعادة الضبط.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// نقرأ data.js (المشترك مع الواجهة) لنفس قوائم القاعات والمدن والمميزات
function loadData() {
  const src = fs.readFileSync(path.join(__dirname, "..", "public", "data.js"), "utf8");
  return vm.runInNewContext(src + "\n;({HALLS,FEATS,CITIES,TYPES,SEC_TYPES})", {});
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); };
function R(seed) { let x = seed * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }

const FIRST = ["عبدالله","محمد","فهد","سلطان","ماجد","تركي","خالد","يوسف","سعد","نايف","بندر","ناصر","فيصل","عمر","أحمد","راكان","وليد","سالم","علي","إبراهيم"];
const LAST = ["الشمري","القحطاني","العتيبي","الحربي","الدوسري","المطيري","الزهراني","البقمي","الغامدي","القرني","السبيعي","الشهري","العنزي","المالكي","الراشد"];
const PKG_N = ["القاعة فقط", "الباقة الذهبية", "الباقة الملكية"];
const REV = [["نورة ع",5,"تنظيم راقٍ وفريق متعاون جدًا، والقاعة أجمل من الصور."],["سعد م",4,"موقع ممتاز وخدمة سريعة، والتقسيط ساعدنا كثيرًا."],["ريم ح",5,"الإضاءة والصوت كانا مثاليين، أنصح بها."],["هند ق",5,"استقبال محترم وتجهيز في الوقت المحدد."],["فهد ع",4,"قاعة واسعة ومواقف كافية، والتنسيق ممتاز."]];

function buildSeed() {
  const { HALLS, FEATS, CITIES } = loadData();
  const owners = { 11:"P1",3:"P1",2:"P1",1:"P2",4:"P2",7:"P2",8:"P3",9:"P3",12:"P3",6:"P4",10:"P5",5:"P5" };
  const db = {
    v: 3,
    providers: [
      { id:"P1", name:"مجموعة اللوتس للضيافة", owner:"عبدالعزيز الراشد", phone:"0551234567", email:"info@lotus-group.example", city:"الرياض", status:"verified", joined:"2025-09-12", cr:"1010456789" },
      { id:"P2", name:"شركة الشرق للأفراح", owner:"محمد القرني", phone:"0552345678", email:"hello@east-weddings.example", city:"جدة", status:"verified", joined:"2025-10-03", cr:"4030123456" },
      { id:"P3", name:"قاعات الورد", owner:"نورة العتيبي", phone:"0553456789", email:"contact@rose-halls.example", city:"الرياض", status:"verified", joined:"2025-11-20", cr:"1010987654" },
      { id:"P4", name:"منتجعات الواحة", owner:"فيصل الغامدي", phone:"0554567890", email:"info@oasis-resorts.example", city:"أبها", status:"verified", joined:"2026-01-15", cr:"5855123450" },
      { id:"P5", name:"فنادق السلام", owner:"سلمان الدوسري", phone:"0555678901", email:"events@salam-hotels.example", city:"الخبر", status:"verified", joined:"2026-02-08", cr:"2051234567" },
      { id:"P6", name:"ضيافة الغيم", owner:"ريم السبيعي", phone:"0556789012", email:"hi@ghaim.example", city:"الدمام", status:"pending", joined:addDays(-3), cr:"2050987123" },
    ],
    venues: [], bookings: [], reviews: [], giveaways: [], users: [], activity: [], blocked: {}, withdrawals: [],
    settings: { commission: 5, announce: "عروض حصرية على حجوزات هذا الموسم — لفترة محدودة", featuredMax: 6, maintenance: false, autoApprove: false, extraCities: [] },
  };
  HALLS.forEach((h) => {
    db.venues.push({ id:h.id, pid:owners[h.id] || "P1", n:h.n, nameEn:"", c:h.c, t:h.t, cap:h.cap, i:!!h.i, r:h.r, rv:h.rv, s:h.s,
      desc:"", features:(FEATS[h.t] || []).slice(), address:h.c + " · حي تجريبي", mapUrl:"", phone:"", photos:[], cover:0, pkgs:[],
      policy:[{d:30,p:100},{d:15,p:50},{d:0,p:0}], depositPct:20, status:"approved", featured:h.id === 11 || h.id === 1 || h.id === 3, created:"2026-0" + (1 + h.id % 9) + "-1" + (h.id % 9) });
  });
  const pol = () => [{d:30,p:100},{d:15,p:50},{d:0,p:0}];
  db.venues.push({ id:101, pid:"P1", n:"قاعة الدانة الملكية", nameEn:"", c:"الرياض", t:"قصر أفراح", cap:650, i:true, r:0, rv:0, s:13, desc:"قاعة جديدة بتصميم عصري ومدخل ملكي ومسرح واسع.", features:FEATS["قصر أفراح"].slice(), address:"الرياض · حي النرجس", mapUrl:"", phone:"0551234567", photos:[], cover:0, pkgs:[], policy:pol(), depositPct:20, status:"pending", featured:false, created:addDays(-2) });
  db.venues.push({ id:102, pid:"P2", n:"قاعة لمار", nameEn:"", c:"جدة", t:"قاعة صغيرة", cap:200, i:false, r:0, rv:0, s:14, desc:"قاعة نسائية أنيقة مناسبة للمناسبات الصغيرة.", features:FEATS["قاعة صغيرة"].slice(), address:"جدة · حي الشاطئ", mapUrl:"", phone:"0552345678", photos:[], cover:0, pkgs:[], policy:pol(), depositPct:20, status:"pending", featured:false, created:addDays(-1) });
  db.venues.push({ id:103, pid:"P1", n:"جناح الياسمين", nameEn:"", c:"الرياض", t:"قاعة صغيرة", cap:120, i:true, r:0, rv:0, s:15, desc:"", features:[], address:"", mapUrl:"", phone:"", photos:[], cover:0, pkgs:[], policy:pol(), depositPct:20, status:"draft", featured:false, created:addDays(0) });

  const rr = R(7), live = db.venues.filter((v) => v.status === "approved");
  for (let i = 0; i < 46; i++) {
    const v = live[(i * 7) % live.length], off = -28 + ((i * 11) % 150);
    let st;
    if (off < 0) st = i % 8 === 0 ? "no" : "done";
    else if (off < 12) st = i % 7 === 0 ? "cancel" : "ok";
    else st = (i % 4 === 0 || i % 4 === 3) ? "new" : (i % 4 === 1 ? "wait" : "ok");
    const g = Math.max(50, Math.round(v.cap * (.35 + rr() * .55) / 10) * 10);
    db.bookings.push({ id:"B-" + (1001 + i), vid:v.id, pid:v.pid, customer:FIRST[(i * 3) % FIRST.length] + " " + LAST[(i * 7) % LAST.length],
      phone:"05" + (10000000 + Math.floor(rr() * 89999999)), date:addDays(off), guests:g, pkg:PKG_N[i % 3],
      amount:Math.round((g * (40 + rr() * 30) + (i % 3) * 5000) / 100) * 100, status:st, created:addDays(off - 20 - (i % 15)), note:"" });
  }
  let rid = 1;
  live.forEach((v, k) => {
    for (let j = 0; j < 2 + (k % 2); j++) {
      const t = REV[(k + j) % REV.length];
      db.reviews.push({ id:rid++, vid:v.id, name:t[0], stars:t[1], text:t[2], status:(k === 4 && j === 0) ? "hidden" : "shown", date:addDays(-5 - k * 3 - j * 7), reply:"" });
    }
  });
  for (let u = 0; u < 24; u++) {
    db.users.push({ id:"U" + (100 + u), name:FIRST[(u * 7) % FIRST.length] + " " + LAST[(u * 3) % LAST.length], phone:"05" + (20000000 + Math.floor(rr() * 79999999)), city:CITIES[u % CITIES.length], joined:addDays(-90 + u * 3), status:"active" });
  }
  const ents = (c, seed) => { const r = R(seed), a = []; for (let k = 0; k < c; k++) a.push("05" + (10000000 + Math.floor(r() * 89999999))); return a; };
  db.giveaways = [
    { id:"G3", title:"اربح تصوير حفلك مجانًا", prize:"تغطية تصوير فوتوغرافي كاملة للحفل (حتى 5 ساعات)", start:addDays(-12), end:addDays(18), winnerDate:addDays(19), status:"open", entries:ents(37, 21), winner:"" },
    { id:"G2", title:"تنسيق كوشة وورد لحفلك", prize:"تنسيق كوشة وورد كامل", start:"2026-09-01", end:"2026-09-30", winnerDate:"2026-10-01", status:"closed", entries:ents(64, 22), winner:"0512345678" },
    { id:"G1", title:"بوفيه ضيافة لـ 100 ضيف", prize:"بوفيه ضيافة لـ 100 ضيف", start:"2026-08-01", end:"2026-08-31", winnerDate:"2026-09-01", status:"closed", entries:ents(51, 23), winner:"0598765432" },
  ];
  db.activity = [
    { t:addDays(0) + "T09:12", who:"قاعات الورد", txt:"عدّل بيانات «قاعة بوح»" },
    { t:addDays(-1) + "T16:40", who:"مجموعة اللوتس للضيافة", txt:"أرسل «قاعة الدانة الملكية» للمراجعة" },
    { t:addDays(-1) + "T11:05", who:"شركة الشرق للأفراح", txt:"أرسل «قاعة لمار» للمراجعة" },
    { t:addDays(-2) + "T14:30", who:"ضيافة الغيم", txt:"طلب الانضمام كمزود خدمة" },
    { t:addDays(-3) + "T10:00", who:"الإدارة", txt:"وثّقت حساب «منتجعات الواحة»" },
  ];
  db.blocked = { 11:[addDays(7), addDays(8)], 3:[addDays(14)], 1:[addDays(21)] };
  return db;
}

module.exports = { buildSeed, loadData };
