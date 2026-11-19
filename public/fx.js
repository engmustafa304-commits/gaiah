// حركة وسكرول ولمسات فاخرة — بدون اعتماد إلا على Lenis الاختياري للسكرول السلس
(function(){
  const D=document,H=D.documentElement;
  // 1) تعبئة مشاهد القاعات التجريبية (دائمًا)
  D.querySelectorAll("[data-art]").forEach(e=>{e.innerHTML=art(+e.dataset.art,+e.dataset.w||600,+e.dataset.h||400)});
  if(D.body.classList.contains("dash"))return;

  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine=matchMedia("(hover:hover) and (pointer:fine)").matches;
  const home=D.body.dataset.page==="home";
  const go=()=>D.body.classList.add("go");

  // الأرقام المتحركة
  function fmtN(v,dec){return v.toLocaleString("en-US",{minimumFractionDigits:dec,maximumFractionDigits:dec})}
  function count(el){if(/[?&]still/.test(location.search)){el.textContent=fmtN(+el.dataset.count,+el.dataset.dec||0)+(el.dataset.suf||"");return}const to=+el.dataset.count,dec=+el.dataset.dec||0,suf=el.dataset.suf||"",t0=performance.now(),dur=1900;
    (function f(t){const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmtN(to*e,dec)+suf;if(k<1)requestAnimationFrame(f)})(t0)}
  const counters=()=>[...D.querySelectorAll("[data-count]")];

  if(reduce){counters().forEach(el=>el.textContent=fmtN(+el.dataset.count,+el.dataset.dec||0)+(el.dataset.suf||""));go();return}
  H.classList.add("fx");
  const still=/[?&]still/.test(location.search);if(still)H.classList.add("still");

  // 2) شاشة الافتتاح (الرئيسية، مرة لكل جلسة)
  let shown=false;
  try{shown=!!sessionStorage.getItem("gp");if(home&&!shown)sessionStorage.setItem("gp","1")}catch(e){}
  if(home&&!shown&&!still){
    const p=D.createElement("div");p.id="pre";p.innerHTML='<div><img src="assets/logo-light.png" alt=""><span></span></div>';D.body.appendChild(p);
    H.classList.add("lock");
    setTimeout(()=>{p.classList.add("out");go()},1350);
    setTimeout(()=>{p.remove();H.classList.remove("lock")},2300);
  }else go();
  setTimeout(go,3600);

  D.addEventListener("DOMContentLoaded",()=>{
    // 3) شريط التقدم
    const prog=D.createElement("div");prog.id="prog";D.body.appendChild(prog);
    const nav=D.querySelector(".nav");

    // خلفية متحركة لرأس الصفحات الداخلية
    D.querySelectorAll(".page-head").forEach(ph=>{const b=D.createElement("div");b.className="hero-bg";b.dataset.px="-0.1";ph.prepend(b)});
    const px=[...D.querySelectorAll("[data-px]")];

    // 4) تقسيم عناوين الهيرو إلى كلمات
    D.querySelectorAll("[data-split]").forEach(h=>{let i=0;
      (function wrap(n){[...n.childNodes].forEach(c=>{
        if(c.nodeType===3){const fr=D.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;
            if(/^\s+$/.test(t)){fr.appendChild(D.createTextNode(" "));return}
            const w=D.createElement("span");w.className="w";const s=D.createElement("span");s.className="wi";s.style.transitionDelay=(250+i++*110)+"ms";s.textContent=t;w.appendChild(s);fr.appendChild(w)});
          c.replaceWith(fr)}
        else if(c.nodeType===1&&c.tagName!=="BR")wrap(c)})})(h)});

    // 5) الظهور التدريجي مع تتابع
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;io.unobserve(el);el.classList.add("in");
      setTimeout(()=>{el.classList.remove("rv");el.style.removeProperty("--i")},1500)}),{threshold:.12,rootMargin:"0px 0px -5% 0px"});
    function watch(el,i){if(el.dataset.rv)return;el.dataset.rv="1";el.classList.add("rv");el.style.setProperty("--i",Math.min(i,8));io.observe(el)}
    D.querySelectorAll(".rv").forEach(el=>{el.dataset.rv="1";io.observe(el)});
    const groups=".grid,.svc,.st,.pkgs,.kpis,.trust .wrap,.facts,.hpk,.feats,.revs,.hl";
    D.querySelectorAll(groups).forEach(c=>{
      if(c.classList.contains("rv")){c.classList.remove("rv");io.unobserve(c)}
      const run=()=>[...c.children].forEach((k,i)=>watch(k,i));run();
      new MutationObserver(run).observe(c,{childList:true})});

    // 6) الأرقام
    const cio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){cio.unobserve(e.target);count(e.target)}}),{threshold:.6});
    counters().forEach(el=>cio.observe(el));

    // 7) السكرول والباراليكس
    let tick=false;
    function onScroll(){if(tick)return;tick=true;requestAnimationFrame(()=>{tick=false;
      const y=scrollY,max=H.scrollHeight-innerHeight;
      prog.style.setProperty("--p",max>0?Math.min(1,y/max):0);
      nav&&nav.classList.toggle("scrolled",y>40);
      px.forEach(el=>{const s=+el.dataset.px;let off;
        if(el.classList.contains("hero-bg")){const r=el.getBoundingClientRect();if(r.bottom<-100)return;off=-r.top*s}
        else{const r=el.parentElement.getBoundingClientRect();if(r.bottom<-200||r.top>innerHeight+200)return;off=(r.top+r.height/2-innerHeight/2)*s}
        el.style.setProperty("--py",off.toFixed(1)+"px")})})}
    addEventListener("scroll",onScroll,{passive:true});onScroll();

    if(window.Lenis){
      const L=new Lenis({duration:1.15,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t))});
      L.on("scroll",onScroll);(function raf(t){L.raf(t);requestAnimationFrame(raf)})(0);
      D.addEventListener("click",e=>{const a=e.target.closest('a[href*="#"]');if(!a)return;const u=new URL(a.href,location.href);
        if(u.pathname!==location.pathname||!u.hash||u.hash==="#")return;const t=D.querySelector(u.hash);if(t){e.preventDefault();L.scrollTo(t,{offset:-70,duration:1.4})}});
    }

    // 8) ميلان البطاقات + أزرار مغناطيسية (للماوس فقط)
    if(fine){
      let last=null;const reset=c=>{c&&["--rx","--ry"].forEach(v=>c.style.removeProperty(v))};
      D.addEventListener("pointermove",e=>{
        const c=e.target.closest&&e.target.closest(".card");
        if(c!==last){reset(last);last=c}
        if(c){const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
          c.style.setProperty("--ry",((x-.5)*7).toFixed(2)+"deg");c.style.setProperty("--rx",((.5-y)*5).toFixed(2)+"deg");
          c.style.setProperty("--mx",(x*100).toFixed(1)+"%");c.style.setProperty("--my",(y*100).toFixed(1)+"%")}
        const b=e.target.closest&&e.target.closest(".btn-gold,.btn-ink");
        D.querySelectorAll(".btn.mag").forEach(m=>{if(m!==b){m.classList.remove("mag");m.style.removeProperty("--bx");m.style.removeProperty("--by")}});
        if(b){const r=b.getBoundingClientRect();b.classList.add("mag");
          b.style.setProperty("--bx",((e.clientX-r.left-r.width/2)*.14).toFixed(1)+"px");b.style.setProperty("--by",((e.clientY-r.top-r.height/2)*.22).toFixed(1)+"px")}
      },{passive:true});

      // المؤشر الذهبي
      const c=D.createElement("div");c.id="cur";D.body.appendChild(c);let x=0,y=0,tx=0,ty=0;
      addEventListener("pointermove",e=>{tx=e.clientX;ty=e.clientY;c.classList.add("on")},{passive:true});
      D.addEventListener("pointerleave",()=>c.classList.remove("on"));
      (function f(){x+=(tx-x)*.2;y+=(ty-y)*.2;c.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;requestAnimationFrame(f)})();
      D.addEventListener("pointerover",e=>c.classList.toggle("big",!!(e.target.closest&&e.target.closest("a,button,.card,.chip,summary,select,input"))));
    }

    // 9) غبار ذهبي في الهيرو
    const cv=D.querySelector("canvas.dust");
    if(cv){const ctx=cv.getContext("2d"),dpr=Math.min(2,devicePixelRatio||1);let W,Hh,run=true;
      const rs=()=>{const r=cv.getBoundingClientRect();W=cv.width=r.width*dpr;Hh=cv.height=r.height*dpr};rs();addEventListener("resize",rs);
      const N=innerWidth<700?22:46,ps=Array.from({length:N},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.8+.6,v:Math.random()*.00035+.00012,a:Math.random()*6.28,s:Math.random()*.02+.006}));
      (function draw(){
        if(run){ctx.clearRect(0,0,W,Hh);
          ps.forEach(p=>{p.y-=p.v;p.a+=p.s;p.x+=Math.sin(p.a)*.0004;if(p.y<-.02){p.y=1.02;p.x=Math.random()}
            const al=.3+.35*Math.sin(p.a*1.7);ctx.beginPath();ctx.arc(p.x*W,p.y*Hh,p.r*dpr,0,6.283);
            ctx.shadowColor="rgba(217,185,155,.9)";ctx.shadowBlur=9*dpr;ctx.fillStyle=`rgba(184,147,90,${Math.max(.08,al)})`;ctx.fill()})}
        requestAnimationFrame(draw)})();
      new IntersectionObserver(es=>{run=es[0].isIntersecting}).observe(cv);
    }

    // 10) انتقال سلس بين الصفحات
    D.addEventListener("click",e=>{const a=e.target.closest("a[href]");
      if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||a.target==="_blank"||a.hasAttribute("download"))return;
      const u=new URL(a.href,location.href);if(u.protocol!==location.protocol||u.host!==location.host)return;
      if(u.pathname===location.pathname)return;
      e.preventDefault();D.body.classList.add("leaving");setTimeout(()=>{location.href=a.href},280)});
    addEventListener("pageshow",e=>{if(e.persisted)D.body.classList.remove("leaving")});
  });
})();
