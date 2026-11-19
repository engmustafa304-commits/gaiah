// أدوات واجهة مشتركة بين لوحة المزود ولوحة الإدارة
var UI=(function(){
  "use strict";
  var MON=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  var BK_ST={new:["جديد","s-new"],wait:["بانتظار العربون","s-wait"],ok:["مؤكد","s-ok"],done:["مكتمل","s-done"],no:["مرفوض","s-no"],cancel:["ملغي","s-cancel"]};
  var VN_ST={approved:["منشورة","s-ok"],pending:["قيد المراجعة","s-pend"],draft:["مسودة","s-draft"],rejected:["مرفوضة","s-no"],hidden:["مخفية","s-hide"]};
  var PV_ST={verified:["موثق","s-ok"],pending:["بانتظار التوثيق","s-pend"],suspended:["موقوف","s-no"]};
  var rtl=function(){return document.documentElement.dir==="rtl"};
  var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
  var money=function(n){return fmt(Math.round(n))+" ر.س"};
  var pad2=function(n){return String(n).padStart(2,"0")};
  var todayISO=function(){var d=new Date();return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate())};
  var dateAr=function(iso){if(!iso)return "—";var p=iso.slice(0,10).split("-");return (+p[2])+" "+MON[+p[1]-1]+" "+p[0]};
  var badge=function(map,k){var m=map[k]||[k,"s-draft"];return '<span class="st-b '+m[1]+'">'+m[0]+'</span>'};
  var initials=function(n){var s=String(n||"?").trim();if(window.LANG==="en"&&window.tr)s=window.tr(s);return esc(s.charAt(0).toUpperCase())};

  // ===== إشعار صغير =====
  var tt;
  function toast(msg){
    var t=document.getElementById("toast");
    if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t)}
    t.textContent=msg;t.classList.add("show");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("show")},2600);
  }

  // ===== نافذة حوار =====
  function dialog(o){
    var d=document.createElement("div");d.className="dlg show";
    d.innerHTML='<div class="bk"></div><div class="mbx"><h3>'+(o.title||"")+'</h3><div class="bd">'+(o.body||"")+'</div><div class="ft"></div></div>';
    document.body.appendChild(d);
    var ft=d.querySelector(".ft");
    function close(){d.remove();if(o.onClose)o.onClose()}
    (o.foot||[{label:"إغلاق",cls:"mini"}]).forEach(function(b){
      var el=document.createElement("button");el.type="button";el.className="mini "+(b.cls||"");el.textContent=b.label;
      el.onclick=function(){if(!b.fn){close();return}var r=b.fn(d);if(r!==false)close()};ft.appendChild(el);
    });
    d.querySelector(".bk").onclick=close;
    return {el:d,close:close};
  }
  function confirmBox(msg,yes,o){
    o=o||{};
    return dialog({title:o.title||"تأكيد",body:'<p>'+msg+'</p>',foot:[{label:"إلغاء"},{label:o.yes||"تأكيد",cls:o.danger?"dng":"ok",fn:function(){yes();return true}}]});
  }

  // ===== درج جانبي =====
  var ovEl,drEl;
  function drawer(html){
    if(!ovEl){ovEl=document.createElement("div");ovEl.className="ov";document.body.appendChild(ovEl);
      drEl=document.createElement("aside");drEl.className="drawer";document.body.appendChild(drEl);ovEl.onclick=closeDrawer}
    drEl.innerHTML='<button class="x" aria-label="إغلاق">✕</button>'+html;
    drEl.querySelector(".x").onclick=closeDrawer;
    requestAnimationFrame(function(){ovEl.classList.add("show");drEl.classList.add("show")});
    return drEl;
  }
  function closeDrawer(){if(!ovEl)return;ovEl.classList.remove("show");drEl.classList.remove("show")}

  // ===== رسوم بيانية =====
  function lineChart(el,labels,vals,o){
    o=o||{};var W=600,H=230,pad=34,n=vals.length,st=n>1?(W-2*pad)/(n-1):0,mx=Math.max.apply(null,vals.concat([1]))*1.15,r=rtl();
    var xs=function(i){return r?W-pad-i*st:pad+i*st},ys=function(v){return H-32-(v/mx)*(H-70)};
    var pts=vals.map(function(v,i){return [xs(i),ys(v)]});
    var sorted=pts.slice().sort(function(a,b){return a[0]-b[0]});
    var L=sorted.map(function(p,i){return (i?"L":"M")+p[0].toFixed(0)+" "+p[1].toFixed(0)}).join(" ");
    var grid=[0,1,2,3].map(function(i){var y=30+i*((H-62)/3);return '<line x1="'+pad+'" x2="'+(W-pad)+'" y1="'+y.toFixed(0)+'" y2="'+y.toFixed(0)+'" stroke="#e8e4d8"/>'}).join("");
    var dots=pts.map(function(p,i){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4.5" fill="#fff" stroke="#8f6e3c" stroke-width="2.5"/><text x="'+p[0]+'" y="'+(H-8)+'" text-anchor="middle" font-size="11.5" fill="#777">'+(labels[i]||"")+'</text><text x="'+p[0]+'" y="'+(p[1]-11)+'" text-anchor="middle" font-size="11" fill="#333">'+(o.fmt?o.fmt(vals[i]):vals[i])+'</text>'}).join("");
    el.innerHTML='<svg class="chart" viewBox="0 0 '+W+' '+H+'"><defs><linearGradient id="cg'+(o.id||"")+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8935a" stop-opacity=".35"/><stop offset="1" stop-color="#b8935a" stop-opacity="0"/></linearGradient></defs>'+grid+
      (n>1?'<path d="'+L+' L'+sorted[sorted.length-1][0]+' '+(H-32)+' L'+sorted[0][0]+' '+(H-32)+'Z" fill="url(#cg'+(o.id||"")+')"/>':"")+
      '<path d="'+L+'" fill="none" stroke="#8f6e3c" stroke-width="3" stroke-linejoin="round"/>'+dots+'</svg>';
  }
  function barsHtml(items,max){
    max=max||Math.max.apply(null,items.map(function(x){return x[1]}).concat([1]));
    return '<div class="bars">'+items.map(function(x){return '<div><span>'+x[0]+'</span><span class="b"><i style="width:'+Math.round(x[1]/max*100)+'%"></i></span><b>'+(x[2]!=null?x[2]:x[1])+'</b></div>'}).join("")+'</div>';
  }
  function donut(el,parts){
    var tot=parts.reduce(function(a,p){return a+p.value},0)||1,C=2*Math.PI*54,off=0;
    var segs=parts.map(function(p){var len=p.value/tot*C,s='<circle r="54" cx="75" cy="75" fill="none" stroke="'+p.color+'" stroke-width="22" stroke-dasharray="'+len.toFixed(1)+' '+(C-len).toFixed(1)+'" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 75 75)"/>';off+=len;return s}).join("");
    el.innerHTML='<div class="donut-w"><svg viewBox="0 0 150 150"><circle r="54" cx="75" cy="75" fill="none" stroke="#eee" stroke-width="22"/>'+segs+'<text x="75" y="80" text-anchor="middle" font-size="22" font-weight="700" fill="#0e0e0e">'+tot+'</text></svg><div class="lgd">'+
      parts.map(function(p){return '<div><i style="background:'+p.color+'"></i><span>'+p.label+'</span><b>'+p.value+'</b></div>'}).join("")+'</div></div>';
  }

  // ===== صور وملفات =====
  function compress(file,maxW,q){
    maxW=maxW||900;q=q||.72;
    return new Promise(function(res,rej){
      var fr=new FileReader();
      fr.onload=function(){var im=new Image();
        im.onload=function(){var k=Math.min(1,maxW/im.width),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
          c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",q))};
        im.onerror=rej;im.src=fr.result};
      fr.onerror=rej;fr.readAsDataURL(file);
    });
  }
  function csv(name,rows){
    var txt="﻿"+rows.map(function(r){return r.map(function(c){c=String(c==null?"":c).replace(/"/g,'""');return '"'+c+'"'}).join(",")}).join("\n");
    var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/csv;charset=utf-8"}));a.download=name;document.body.appendChild(a);a.click();a.remove();
  }
  // مبدّل التبويبات الجانبي
  function nav(titles,onGo){
    function go(t){
      $$(".side .nv[data-t]").forEach(function(b){b.classList.toggle("on",b.dataset.t===t)});
      $$(".tab").forEach(function(s){s.classList.toggle("on",s.id==="t-"+t)});
      var h=document.getElementById("ttl");if(h)h.textContent=titles[t]||"";
      var sd=document.getElementById("side");if(sd)sd.classList.remove("open");
      window.scrollTo(0,0);if(onGo)onGo(t);try{history.replaceState(null,"","#"+t)}catch(e){}
    }
    $$(".side .nv[data-t]").forEach(function(b){b.onclick=function(){go(b.dataset.t)}});
    document.addEventListener("click",function(e){var a=e.target.closest("[data-go]");if(a){e.preventDefault();go(a.dataset.go)}});
    var mb=document.getElementById("mb");if(mb)mb.onclick=function(){document.getElementById("side").classList.toggle("open")};
    var h=(location.hash||"").slice(1);if(titles[h])go(h);
    return go;
  }
  return {MON:MON,BK_ST:BK_ST,VN_ST:VN_ST,PV_ST:PV_ST,rtl:rtl,esc:esc,money:money,pad2:pad2,todayISO:todayISO,dateAr:dateAr,badge:badge,initials:initials,
    toast:toast,dialog:dialog,confirm:confirmBox,drawer:drawer,closeDrawer:closeDrawer,lineChart:lineChart,barsHtml:barsHtml,donut:donut,compress:compress,csv:csv,nav:nav};
})();

document.addEventListener("db-error",function(e){UI.toast(e.detail||"تعذّر الحفظ")});
document.addEventListener("click",function(e){if(e.target.closest("[data-logout]")){e.preventDefault();window.DBlogout()}});
