// art() و PALS في art.js
const fmt=n=>Number(n).toLocaleString("en-US");
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

const NAV=[["index.html","الرئيسية","home"],["halls.html","القاعات","halls"],["services.html","الخدمات","services"],["packages.html","بكجات القاعات","pkg"],["giveaways.html","السحوبات","gv"],["support.html","الدعم","support"]];
function siteChrome(){
  if(!$("#site-header"))return;
  const page=document.body.dataset.page;
  const ann=(typeof DB!=="undefined"&&DB.settings&&DB.settings.announce)||"عروض حصرية على حجوزات هذا الموسم — لفترة محدودة";
  $("#site-header").innerHTML=`<div class="top">✦ ${ann}</div>
  <header class="nav"><div class="wrap"><a class="brand" href="index.html"><img src="assets/logo-dark.png" alt="جيّة Gaiah"></a>
  <nav class="menu" id="menu">${NAV.map(([h,t,k])=>`<a class="${k===page?"on":""}" href="${h}">${t}</a>`).join("")}</nav>
  <div class="nav-actions"><button class="lang" data-langbtn data-notr>English</button><a class="btn btn-line" href="login.html?t=provider">انضم كمزود خدمة</a><a class="btn btn-ink" href="login.html">تسجيل الدخول</a><button class="burger" id="burger" aria-label="القائمة">☰</button></div></div></header>`;
  $("#site-footer").innerHTML=`<footer><div class="wrap"><div class="fg"><div><img src="assets/logo-light.png" alt="جيّة Gaiah"><p>منصة حجز القاعات وخدمات المناسبات الفاخرة في المملكة.</p></div>
  <div><h4>المنصة</h4><a href="halls.html">القاعات</a><a href="services.html">الخدمات</a><a href="packages.html">بكجات القاعات</a><a href="giveaways.html">السحوبات</a><a href="venue-management-system.html">نظام إدارة القاعات</a></div>
  <div><h4>الدعم</h4><a href="support.html#faq">الأسئلة الشائعة</a><a href="support.html#contact">تواصل معنا</a><a href="terms.html">الشروط والأحكام</a><a href="privacy.html">الخصوصية</a><a href="account-deletion.html">حذف الحساب</a></div>
  <div><h4>تواصل</h4><a href="#">info@example.com</a><a href="#">واتساب</a><a href="#">إنستغرام</a><a href="#">إكس</a></div></div>
  <div class="copy"><span>© 2026 جيّة Gaiah. جميع الحقوق محفوظة.</span><span>المحتوى والصور الظاهرة تجريبية</span></div></div></footer>
  <a class="wa" href="#" aria-label="واتساب"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.6.3.1.1.1.7-.1 1.3z"/></svg></a>`;
  $("#burger").onclick=()=>$("#menu").classList.toggle("open");
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.1});
  $$(".rv:not(.in)").forEach(el=>io.observe(el));
}
function hallCard(h){
  return `<article class="card"><a class="ph" href="hall.html?id=${h.id}">${(h.photos&&h.photos.length)?`<img src="${h.photos[h.cover||0]}" alt="">`:art(h.s)}<span class="badge">${h.t}</span><span class="v360">360°</span></a>
  <div class="cb"><div class="meta"><span>${h.c}</span><span class="rate">★ ${h.r} <small style="color:#888;font-weight:400">(${h.rv})</small></span></div>
  <h3><a href="hall.html?id=${h.id}">${h.n}</a></h3>${h.i?'<span class="tag">ادفع بالتقسيط</span>':""}
  <div class="meta"><span>👥 حتى ${h.cap} شخص</span></div>
  <div class="cf"><span>عقد إلكتروني فوري</span><a class="btn btn-ink" style="padding:7px 18px;font-size:.88rem" href="hall.html?id=${h.id}">احجز الآن</a></div></div></article>`;
}
function svcCard(s){
  return `<article class="card"><div class="ph" style="aspect-ratio:16/10">${art(s.s)}<span class="badge">${s.cat}</span></div>
  <div class="cb"><div class="meta"><span>${s.c}</span><span class="rate">★ ${s.r} <small style="color:#888;font-weight:400">(${s.rv})</small></span></div>
  <h3>${s.n}</h3><p style="color:#666;font-size:.92rem">${s.d}</p>
  <div class="cf"><span>مزود موثق ✓</span><a class="btn btn-ink" style="padding:7px 18px;font-size:.88rem" href="#">عرض الخدمات</a></div></div></article>`;
}
function vCard(s){
  return `<article class="card vcard"><a class="ph" href="vendor.html?id=${s.id}" style="aspect-ratio:16/10">${art(s.s)}<span class="badge">${s.cat}</span></a>
  <div class="cb"><div class="meta"><span>${s.c}</span><span class="rate">★ ${s.r} <small style="color:#888;font-weight:400">(${s.rv})</small></span></div>
  <h3><a href="vendor.html?id=${s.id}">${s.n}</a></h3><p class="muted sm">${s.d}</p>
  <div class="pk-chips">${s.pk.slice(0,2).map(p=>`<span>${p.n}</span>`).join("")}${s.pk.length>2?`<span>+${s.pk.length-2}</span>`:""}</div>
  <p class="sm muted">📍 تغطي: ${s.areas.join("، ")}</p>
  <div class="cf"><span class="tag">ادفع بالتقسيط</span><a class="btn btn-ink" style="padding:7px 18px;font-size:.88rem" href="vendor.html?id=${s.id}">عرض الخدمات</a></div></div></article>`;
}
const MONTHS_AR=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const dAr=iso=>{const [y,m,d]=iso.split("-");return `${+d} ${MONTHS_AR[+m-1]} ${y}`};
function pkgCard(p){
  const h=HALLS.find(x=>x.id===p.h),more=p.svc.length-4;
  return `<article class="card pkgc"><a class="ph" href="hall.html?id=${h.id}#book" style="aspect-ratio:16/9">${art(h.s+3,480,270)}<span class="badge">${p.chairs?"مع كراسي":"بدون كراسي"}</span>${p.pop?'<span class="pop2">الأكثر طلبًا</span>':""}</a>
  <div class="cb"><h3>${p.n}</h3><p class="muted sm">${h.n} · ${h.c}</p>
  <div class="pk-chips"><span>👥 حتى ${p.g} ضيف</span><span>${p.sec}</span></div>
  <ul class="pk-l">${p.svc.slice(0,4).map(s=>`<li><span class="tick">✦</span>${s}</li>`).join("")}${more>0?`<li class="more">+${more} خدمات إضافية</li>`:""}</ul>
  <div class="pk-d">📅 متاح من ${dAr(p.from)} إلى ${dAr(p.to)}</div>
  <div class="cf">${p.i||p.inst?'<span class="tag">ادفع بالتقسيط</span>':"<span></span>"}<a class="btn btn-ink" style="padding:7px 18px;font-size:.88rem" href="hall.html?id=${h.id}#book">عرض البكج</a></div></div></article>`;
}
document.addEventListener("DOMContentLoaded",siteChrome);
// مطابقة البحث (تُستبدل في النسخة الإنجليزية)
function ARmatch(s,q){return !q||s.includes(q)}
// زر تبديل اللغة
document.addEventListener("DOMContentLoaded",()=>{
  $$("[data-langbtn]").forEach(b=>{
    b.textContent=window.LANG==="en"?"العربية":"English";
    b.onclick=()=>{const n=window.LANG==="en"?"ar":"en";try{localStorage.setItem("gl",n)}catch(e){}const u=new URL(location.href);u.searchParams.set("lang",n);location.href=u.toString()};
  });
});
