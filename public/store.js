// طبقة البيانات في الواجهة: تقرأ من الخادم (API) وتحفظ إليه.
//  - الصفحات العامة: /api/public-db (قاعات معتمدة فقط، بلا بيانات خاصة)
//  - لوحة المزود:    /api/provider/db (بياناته فقط) — الحفظ عبر PUT مؤجَّل
//  - لوحة الإدارة:   /api/admin/db (كل البيانات)
(function(){
  "use strict";
  var page=(document.body&&document.body.dataset.page)||"";
  var role=page==="provider"?"provider":page==="admin"?"admin":"public";
  var url=role==="public"?"/api/public-db":"/api/"+role+"/db";
  var HDR={"X-Requested-With":"gaiah"};

  function empty(){return {v:3,providers:[],venues:[],bookings:[],reviews:[],giveaways:[],users:[],activity:[],blocked:{},withdrawals:[],settings:{commission:5,announce:"",featuredMax:6,extraCities:[]}}}
  function offlineBanner(){
    document.addEventListener("DOMContentLoaded",function(){
      var d=document.createElement("div");
      d.style.cssText="position:fixed;inset-inline:0;top:0;z-index:9999;background:#a03c2e;color:#fff;padding:10px 16px;text-align:center;font:14px sans-serif";
      d.textContent="تعذّر الاتصال بالخادم. شغّل المشروع بالأمر npm run dev ثم افتح http://localhost:3000";
      document.body.appendChild(d);
    });
  }

  // تحميل أولي متزامن (مرة واحدة عند فتح الصفحة) حتى يبقى باقي الكود بسيطًا
  var x=new XMLHttpRequest(),res=null;
  try{x.open("GET",url,false);x.setRequestHeader("X-Requested-With","gaiah");x.send(null)}catch(e){x={status:0}}
  if(x.status===200){try{res=JSON.parse(x.responseText)}catch(e){}}
  if(x.status===401||x.status===403){
    if(role!=="public")location.replace("login.html?t="+role+"&lang="+(window.LANG||"ar"));
  }else if(!res){offlineBanner()}
  window.DB=res||empty();
  window.DBserver=!!res;

  // ===== حفظ مؤجَّل للوحات =====
  var timer=null,inflight=false,dirty=false,lastSent={};
  function remember(){if(role==="provider")(window.DB.venues||[]).forEach(function(v){lastSent[v.id]=JSON.stringify(v)})}
  remember();
  function emit(msg){document.dispatchEvent(new CustomEvent("db-error",{detail:msg}))}
  function body(){
    if(role==="admin")return {db:window.DB};
    var D=window.DB,changed=(D.venues||[]).filter(function(v){return lastSent[v.id]!==JSON.stringify(v)});
    return {venues:changed,venueIds:(D.venues||[]).map(function(v){return v.id}),bookings:D.bookings,reviews:D.reviews,blocked:D.blocked,withdrawals:D.withdrawals,providers:D.providers,activity:(D.activity||[]).slice(0,10)};
  }
  function replace(n){var D=window.DB;Object.keys(D).forEach(function(k){delete D[k]});Object.keys(n).forEach(function(k){D[k]=n[k]})}
  function flush(){
    if(inflight){timer=setTimeout(flush,300);return}
    if(!dirty)return;
    dirty=false;inflight=true;
    var sentVersion=++version;
    fetch(url,{method:"PUT",headers:Object.assign({"Content-Type":"application/json"},HDR),body:JSON.stringify(body())})
      .then(function(r){return r.json().then(function(j){return {r:r,j:j}})})
      .then(function(o){
        inflight=false;
        if(o.r.status===401){location.replace("login.html?t="+role+"&lang="+(window.LANG||"ar"));return}
        if(!o.j.ok){emit(o.j.error||"تعذّر الحفظ");
          // نعيد مزامنة الواجهة مع الخادم حتى لا تبقى تعديلات مرفوضة ظاهرة
          if(role==="provider"){fetch(url,{headers:HDR}).then(function(r){return r.json()}).then(function(n){replace(n);remember();if(window.__refresh)window.__refresh()}).catch(function(){})}
          return}
        if(role==="provider"&&!dirty&&sentVersion===version){replace(o.j.db);remember();if(window.__refresh)window.__refresh()}
        else if(role==="provider"){/* تعديلات جديدة أثناء الإرسال: ننتظر الدورة التالية */}
      })
      .catch(function(){inflight=false;emit("تعذّر الاتصال بالخادم")});
  }
  var version=0;
  window.DBsave=function(){
    if(role==="public")return true;
    dirty=true;version++;clearTimeout(timer);timer=setTimeout(flush,350);return true;
  };
  window.DBreset=function(){
    fetch("/api/admin/reset",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},HDR),body:"{}"})
      .then(function(r){return r.json()}).then(function(j){if(j.ok)location.href="login.html?t=admin";else emit(j.error)});
  };
  window.DBlog=function(who,txt){
    var D=window.DB;D.activity=D.activity||[];
    D.activity.unshift({t:new Date().toISOString().slice(0,16),who:who,txt:txt});D.activity=D.activity.slice(0,80);window.DBsave();
  };
  window.DBnextId=function(){
    var D=window.DB,m=100;(D.venues||[]).forEach(function(v){if(v.id>m)m=v.id});
    if(D.me&&D.me.nextVenueId>m)m=D.me.nextVenueId-1;
    var n=m+1;if(D.me)D.me.nextVenueId=n+1;return n;
  };
  window.DBlogout=function(){
    fetch("/api/auth/logout",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},HDR),body:"{}"})
      .finally(function(){location.href="login.html?t="+(role==="public"?"provider":role)+"&lang="+(window.LANG||"ar")});
  };

  // مدن أضافتها الإدارة
  if(typeof CITIES!=="undefined")((window.DB.settings||{}).extraCities||[]).forEach(function(c){if(CITIES.indexOf(c)<0)CITIES.push(c)});

  // ===== دمج القاعات المعتمدة في الموقع العام =====
  if(role==="public"&&typeof HALLS!=="undefined"){
    var H=HALLS,ids={};
    window.DB.venues.forEach(function(v){
      ids[v.id]=1;
      var h=H.find(function(x){return x.id===v.id});
      if(!h){h={id:v.id,r:v.r||0,rv:v.rv||0,s:v.s||v.id};H.push(h)}
      h.n=v.n;h.c=v.c;h.t=v.t;h.cap=v.cap;h.i=!!v.i;h.desc=v.desc||"";h.features=(v.features&&v.features.length)?v.features:null;
      h.photos=v.photos||[];h.cover=v.cover||0;h.address=v.address||"";h.mapUrl=v.mapUrl||"";h.featured=!!v.featured;h.policy=v.policy;h.phone=v.phone||"";h.depositPct=v.depositPct;
      if(v.r)h.r=v.r;if(v.rv)h.rv=v.rv;
      if(typeof PKGS!=="undefined"&&v.pkgs&&v.pkgs.length){
        v.pkgs.forEach(function(p,i){PKGS.push({id:"u"+v.id+"_"+i,h:v.id,n:p.n||"باقة",g:+p.g||0,sec:p.sec,chairs:!!p.chairs,from:p.from,to:p.to,pop:false,inst:!!v.i,svc:p.svc||[]})});
      }
    });
    for(var k=H.length-1;k>=0;k--){if(!ids[H[k].id])H.splice(k,1)}
    if(typeof PKGS!=="undefined"){for(var q=PKGS.length-1;q>=0;q--){if(!H.find(function(x){return x.id===PKGS[q].h}))PKGS.splice(q,1)}}
  }
})();
