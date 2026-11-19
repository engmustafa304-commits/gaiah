// الرئيسية
const citySel=$("#city"),typeSel=$("#type"),cities=$("#cities");
CITIES.forEach(c=>citySel.insertAdjacentHTML("beforeend",`<option>${c}</option>`));
TYPES.forEach(t=>typeSel.insertAdjacentHTML("beforeend",`<option>${t}</option>`));
let cityFilter="";
function renderCities(){
  cities.innerHTML=["كل المدن",...CITIES].map((c,i)=>`<button class="chip ${(!cityFilter&&i==0)||cityFilter==c?"on":""}" data-c="${i?c:""}">${c}</button>`).join("");
  $$(".chip",cities).forEach(b=>b.onclick=()=>{cityFilter=b.dataset.c;renderCities();renderHalls()});
}
function renderHalls(){
  const list=HALLS.filter(h=>!cityFilter||h.c==cityFilter).slice(0,8);
  $("#hallGrid").innerHTML=list.length?list.map(hallCard).join(""):`<div class="empty">لا توجد قاعات في هذه المدينة حاليًا.</div>`;
}
$("#searchForm").onsubmit=e=>{e.preventDefault();
  const p=new URLSearchParams();
  if($("#q").value.trim())p.set("q",$("#q").value.trim());
  if(citySel.value)p.set("city",citySel.value);
  if(typeSel.value)p.set("type",typeSel.value);
  location.href=withLang("halls.html?"+p);
};
const SVC_HOME=[["التصوير","مصورون ومصورات",21],["الضيافة والبوفيه","كاترينغ فاخر",23],["تنسيق الورد والكوش","تصاميم مخصصة",25],["التوزيعات والهدايا","هدايا الضيوف",27]];
$("#svcGrid").innerHTML=SVC_HOME.map(([n,d,s])=>`<a href="services.html?cat=${encodeURIComponent(n)}">${art(s,300,345)}<span><b>${n}</b><small>${d}</small></span></a>`).join("");
$("#mq").innerHTML=[0,1].map(()=>CITIES.map(c=>`<span>${c}</span><i>✦</i>`).join("")).join("");
$("#pkgs").innerHTML=PKGS.slice(0,3).map(pkgCard).join("");
renderCities();renderHalls();
