// مترجم الصفحة: يحوّل النصوص العربية إلى الإنجليزية (القاموس في i18n-en.js)،
// ويحافظ على اللغة في الروابط الداخلية. يعمل أيضًا على كل ما يُضاف للصفحة لاحقًا.
(function(){
  "use strict";
  var L=window.LANG||"ar", EN=L==="en";
  var AR=/[؀-ۿ]/;
  var D=window.EN_DICT||{};

  // ===== روابط تحمل اللغة (للغتين) =====
  window.withLang=function(u){
    if(/^(https?:|mailto:|tel:|#|javascript:)/i.test(u))return u;
    var m=u.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    var q=new URLSearchParams(m[2]||"");q.set("lang",L);
    return m[1]+"?"+q.toString()+(m[3]||"");
  };
  function fixLinks(root){
    if(!root||!root.querySelectorAll)return;
    var list=root.matches&&root.matches("a[href]")?[root]:[];
    list=list.concat([].slice.call(root.querySelectorAll("a[href]")));
    list.forEach(function(a){
      var h=a.getAttribute("href");
      if(!h||a.dataset.lk)return;
      if(/\.html(\?|#|$)/.test(h)){a.setAttribute("href",window.withLang(h));a.dataset.lk="1"}
    });
  }

  // ===== المطابقة في البحث (عربي أو إنجليزي) =====
  window.ARmatch=function(s,q){
    q=(q||"").trim();if(!q)return true;
    if(s.indexOf(q)>-1)return true;
    return EN&&tr(s).toLowerCase().indexOf(q.toLowerCase())>-1;
  };

  var MS={"يناير":"Jan","فبراير":"Feb","مارس":"Mar","أبريل":"Apr","مايو":"May","يونيو":"Jun","يوليو":"Jul","أغسطس":"Aug","سبتمبر":"Sep","أكتوبر":"Oct","نوفمبر":"Nov","ديسمبر":"Dec"};
  var MF={"يناير":"January","فبراير":"February","مارس":"March","أبريل":"April","مايو":"May","يونيو":"June","يوليو":"July","أغسطس":"August","سبتمبر":"September","أكتوبر":"October","نوفمبر":"November","ديسمبر":"December"};
  var MR="(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)";
  function pl(n,a,b){return n+" "+(+n===1?a:b)}
  function punct(s){return s.replace(/؟/g,"?").replace(/،/g,",").replace(/؛/g,";")}

  var RULES=[
    [new RegExp("^(\\d{1,2}) "+MR+" (\\d{4})$"),function(m){return MS[m[2]]+" "+(+m[1])+", "+m[3]}],
    [new RegExp("^"+MR+" (\\d{4})$"),function(m){return MF[m[1]]+" "+m[2]}],
    [new RegExp("^(\\d{1,2}) "+MR+"$"),function(m){return MS[m[2]]+" "+(+m[1])}],
    [/^حتى (\d+) (?:ضيف|شخص)$/,function(m){return "Up to "+m[1]+" guests"}],
    [/^(\d+) ضيف$/,function(m){return m[1]+" guests"}],
    [/^(\d+) قاعة متاحة$/,function(m){return pl(m[1],"venue","venues")+" available"}],
    [/^(\d+) بكج$/,function(m){return pl(m[1],"package","packages")}],
    [/^(\d+) (?:مزود خدمة|مزودين|مزود)$/,function(m){return pl(m[1],"provider","providers")}],
    [/^(\d+) تقييم$/,function(m){return pl(m[1],"review","reviews")}],
    [/^بناءً على (\d+) تقييم$/,function(m){return "Based on "+pl(m[1],"review","reviews")}],
    [/^من (\d+) تقييم$/,function(m){return "From "+pl(m[1],"review","reviews")}],
    [/^(\d+) خدمات إضافية$/,function(m){return m[1]+" more services"}],
    [/^متاح من (.+) إلى (.+)$/,function(m){return "Available from "+tr(m[1])+" to "+tr(m[2])}],
    [/^تغطي: (.+)$/,function(m){return "Covers: "+tr(m[1])}],
    [/^([\d.]+) فأعلى$/,function(m){return m[1]+" and above"}],
    [/^([\d,]+) ر\.س$/,function(m){return "SAR "+m[1]}],
    [/^(\d+)% عن الشهر الماضي$/,function(m){return m[1]+"% vs last month"}],
    [/^(\d+) هذا الأسبوع$/,function(m){return m[1]+" this week"}],
    [/^(\d+) دفعات خلال (\d+) يومًا$/,function(m){return m[1]+" payments within "+m[2]+" days"}],
    [/^دفعة (\d+)\/(\d+)$/,function(m){return "Installment "+m[1]+"/"+m[2]}],
    [/^تم حظر (.+)$/,function(m){return "Blocked "+m[1]}],
    [/^أُعيد فتح (.+)$/,function(m){return "Reopened "+m[1]}],
    [/^محاكاة: تم إرسال طلب سحب ([\d,]+) ر\.س$/,function(m){return "Demo: withdrawal request for SAR "+m[1]+" sent"}],
    [/^الفائز: (.+)$/,function(m){return "Winner: "+tr(m[1])}],
    [/^بوفيه ضيافة لـ (\d+) ضيف$/,function(m){return "Hospitality buffet for "+m[1]+" guests"}],
    [/^عدد الضيوف يتجاوز سعة القاعة \((\d+)\)$/,function(m){return "Guest count exceeds the venue capacity ("+m[1]+")"}],
    [/^(.+?) في (.+?) قاعة بطابع فاخر تناسب حفلات الزفاف والمناسبات الكبرى، بتصميم داخلي أنيق وإضاءة مدروسة وخدمة متكاملة تضمن ليلة لا تُنسى\. \(نص تجريبي\)$/,
      function(m){return tr(m[1])+" in "+tr(m[2])+" is a luxurious venue suited to weddings and grand occasions, with an elegant interior, thoughtful lighting and complete service for an unforgettable night. (Sample text)"}],
    [/^(.+) · (\d{4}-\d{2}-\d{2}) · (\d+) ضيف — (.+)\. سيتواصل معك فريق القاعة لتأكيد الحجز\. \(محاكاة\)$/,
      function(m){return tr(m[1])+" · "+m[2]+" · "+m[3]+" guests — "+tr(m[4])+". The venue team will contact you to confirm the booking. (Demo)"}],
    [/^(.+) · (.+) · (\d{4}-\d{2}-\d{2}) · (.+)\. سيتواصل معك مزود الخدمة لتأكيد الحجز\. \(محاكاة\)$/,
      function(m){return tr(m[1])+" · "+tr(m[2])+" · "+m[3]+" · "+tr(m[4])+". The provider will contact you to confirm the booking. (Demo)"}]
  ];

  if(window.EN_RULES)RULES=RULES.concat(window.EN_RULES);
  function trCore(c){
    if(Object.prototype.hasOwnProperty.call(D,c))return D[c];
    for(var i=0;i<RULES.length;i++){var m=c.match(RULES[i][0]);if(m)return RULES[i][1](m)}
    return null;
  }
  window.__missing=window.__missing||{};
  function tr(s){
    if(!s||!AR.test(s))return s;
    var lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],core=s.trim();
    var r=trCore(core);if(r!==null)return lead+r+trail;
    // محاولة بعد إزالة علامات الترقيم الختامية فقط (. ؟ ! … :)
    var sm=core.match(/^([\s\S]*?)([\s.!?؟…:]+)$/);
    if(sm&&sm[1]){r=trCore(sm[1]);if(r!==null)return lead+r+punct(sm[2])+trail}
    // ثم بعد إزالة كل الرموز من الطرفين (إيموجي، أسهم، أقواس…)
    var mm=core.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
    if(mm&&mm[2]&&mm[2]!==core){
      r=trCore(mm[2]);
      if(r===null){var sm2=mm[2].match(/^([\s\S]*?)([\s.!?؟…:]+)$/);if(sm2&&sm2[1]){var r2=trCore(sm2[1]);if(r2!==null)r=r2+punct(sm2[2])}}
      if(r!==null)return lead+punct(mm[1])+r+punct(mm[3])+trail;
    }
    var seps=[" · "," — "," → "," | ","، "," - "];
    for(var k=0;k<seps.length;k++){
      if(core.indexOf(seps[k])>-1){
        return lead+core.split(seps[k]).map(tr).join(seps[k]==="، "?", ":seps[k])+trail;
      }
    }
    var miss=false;
    var out=core.replace(/[؀-ۿ][؀-ۿ\sً-ْـ]*[؀-ۿ]|[؀-ۿ]/g,function(run){
      var key=run.trim();
      if(Object.prototype.hasOwnProperty.call(D,key))return D[key];
      // كلمة بكلمة (للأسماء المركبة مثل «محمد القحطاني»)
      var ws=key.split(/\s+/),all=ws.length>1&&ws.every(function(w){return Object.prototype.hasOwnProperty.call(D,w)});
      if(all)return ws.map(function(w){return D[w]}).join(" ");
      miss=true;return run;
    });
    if(miss)window.__missing[core]=1;
    return lead+punct(out)+trail;
  }
  window.tr=tr;

  var done=new WeakMap();
  var ATTRS=["placeholder","title","aria-label","alt"];
  function textNode(n){
    var v=n.nodeValue;
    if(done.get(n)===v||!AR.test(v))return;
    var p=n.parentElement;
    if(p&&(/^(SCRIPT|STYLE)$/.test(p.tagName)||p.closest("[data-notr]")))return;
    var t=tr(v);done.set(n,t);if(t!==v)n.nodeValue=t;
  }
  function attrs(el){
    if(!el.getAttribute)return;
    ATTRS.forEach(function(a){var v=el.getAttribute(a);if(v&&AR.test(v))el.setAttribute(a,tr(v))});
    if(el.tagName==="META"&&el.getAttribute("name")==="description"){var c=el.getAttribute("content");if(c&&AR.test(c))el.setAttribute("content",tr(c))}
  }
  function walk(root){
    if(!root)return;
    if(root.nodeType===3){textNode(root);return}
    if(root.nodeType!==1)return;
    var opts=root.tagName==="OPTION"?[root]:[];
    opts=opts.concat([].slice.call(root.querySelectorAll("option:not([value])")));
    opts.forEach(function(o){o.setAttribute("value",o.textContent)});
    attrs(root);
    [].slice.call(root.querySelectorAll("[placeholder],[title],[aria-label],[alt],meta[name=description]")).forEach(attrs);
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;
    while((n=w.nextNode()))textNode(n);
  }
  function fixTitle(){if(AR.test(document.title))document.title=tr(document.title)}

  function start(){
    fixLinks(document);
    if(!EN)return observe(false);
    walk(document.documentElement);fixTitle();
    observe(true);
  }
  function observe(tx){
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type==="childList"){
          m.addedNodes.forEach(function(n){if(tx)walk(n);fixLinks(n)});
          if(tx&&m.target.nodeName==="TITLE")fixTitle();
        }else if(tx&&m.type==="characterData"){textNode(m.target);if(m.target.parentNode&&m.target.parentNode.nodeName==="TITLE")fixTitle()}
        else if(tx&&m.type==="attributes"){attrs(m.target)}
      });
    }).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  }
  if(EN){
    var oa=window.alert;window.alert=function(m){oa.call(window,tr(String(m)))};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
