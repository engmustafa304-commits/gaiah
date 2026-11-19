// لوحة الإدارة: المراجعة والاعتماد، القاعات، المزودون، الحجوزات، العرسان، التقييمات، السحوبات، الإعدادات
(function(){
  "use strict";
  var esc=UI.esc,money=UI.money,dateAr=UI.dateAr,badge=UI.badge,BK=UI.BK_ST,VN=UI.VN_ST,PV=UI.PV_ST,toast=UI.toast;
  var today=UI.todayISO();
  var WHO="الإدارة";
  var vById=function(id){return DB.venues.find(function(v){return v.id===id})};
  var pById=function(id){return DB.providers.find(function(p){return p.id===id})};
  var vname=function(id){var v=vById(id);return v?v.n:"—"};
  var pname=function(id){var p=pById(id);return p?p.name:"—"};
  var save=function(){if(!DBsave())toast("تعذّر الحفظ: مساحة التخزين ممتلئة")};
  var TITLES={ov:"نظرة عامة",ap:"طلبات المراجعة",vn:"القاعات",pv:"المزودون",bk:"الحجوزات",us:"العرسان",rv:"التقييمات",gv:"السحوبات",lg:"سجل النشاط",st:"الإعدادات"};
  var go,bf="all",rf="all";
  var mask=function(ph){ph=String(ph||"");return ph.slice(0,2)+"*****"+ph.slice(-3)};
  var tm=function(t){return dateAr(t)+" · "+(t.indexOf("T")>-1?t.slice(11,16):"")};

  function vStats(v){
    var bs=DB.bookings.filter(function(b){return b.vid===v.id&&b.status!=="no"&&b.status!=="cancel"});
    var rs=DB.reviews.filter(function(r){return r.vid===v.id&&r.status==="shown"});
    return {bk:bs.length,avg:rs.length?rs.reduce(function(a,r){return a+r.stars},0)/rs.length:0,rv:rs.length};
  }
  function pct(v){
    var n=0;[(v.n||"").length>=3,+v.cap>0,(v.desc||"").length>=40,(v.photos||[]).length>=3,(v.features||[]).length>=3,(v.address||"").length>2,(v.phone||"").length>=9,(v.pkgs||[]).length>=1,(v.policy||[]).length>=1].forEach(function(x){if(x)n++});
    return Math.round(n/9*100);
  }
  function thumb(v){return (v.photos&&v.photos.length)?'<img src="'+v.photos[v.cover||0]+'" alt="" style="width:54px;height:40px;object-fit:cover;border-radius:8px;display:block">':'<div style="width:54px;height:40px;border-radius:8px;overflow:hidden">'+art(v.s||v.id,108,80)+'</div>'}

  function refresh(){
    var pv=DB.venues.filter(function(v){return v.status==="pending"}).length,pp=DB.providers.filter(function(p){return p.status==="pending"}).length;
    [["nAp",pv+pp],["bellN",pv+pp],["nPv",pp]].forEach(function(a){var e=document.getElementById(a[0]);e.textContent=a[1];e.style.display=a[1]?"":"none"});
    renderOverview();renderApprovals();renderVenues();renderProviders();renderBookings();renderUsers();renderReviews();renderGiveaways();renderLog();renderSettings();
  }

  // ===== نظرة عامة =====
  function renderOverview(){
    var bs=DB.bookings,mo=today.slice(0,7),thisMo=bs.filter(function(b){return b.date.slice(0,7)===mo&&b.status!=="no"&&b.status!=="cancel"}).length;
    var ap=DB.venues.filter(function(v){return v.status==="approved"}).length,pe=DB.venues.filter(function(v){return v.status==="pending"}).length;
    var pvOk=DB.providers.filter(function(p){return p.status==="verified"}).length,pvPe=DB.providers.filter(function(p){return p.status==="pending"}).length;
    var cm=(DB.settings.commission||5)/100,comm=bs.filter(function(b){return (b.status==="ok"||b.status==="done")&&b.date.slice(0,7)===mo}).reduce(function(a,b){return a+b.amount*cm},0);
    document.getElementById("kOv").innerHTML=
      '<div class="kpi"><span>إجمالي الحجوزات</span><b>'+bs.length+'</b><small class="up">'+thisMo+' هذا الشهر</small></div>'+
      '<div class="kpi"><span>القاعات المنشورة</span><b>'+ap+'</b><small class="'+(pe?"dn":"mut")+'">'+pe+' قيد المراجعة</small></div>'+
      '<div class="kpi"><span>المزودون</span><b>'+DB.providers.length+'</b><small class="'+(pvPe?"dn":"mut")+'">'+pvOk+' موثق · '+pvPe+' بانتظار التوثيق</small></div>'+
      '<div class="kpi"><span>عمولة المنصة هذا الشهر</span><b>'+fmt(Math.round(comm))+'</b><small class="mut">ر.س بنسبة '+(DB.settings.commission||5)+'%</small></div>';
    var labels=[],vals=[],d=new Date();
    for(var i=3;i>=-2;i--){var m=new Date(d.getFullYear(),d.getMonth()-i,1),key=m.getFullYear()+"-"+UI.pad2(m.getMonth()+1);
      labels.push(UI.MON[m.getMonth()]);vals.push(bs.filter(function(b){return b.date.slice(0,7)===key&&b.status!=="no"&&b.status!=="cancel"}).length)}
    UI.lineChart(document.getElementById("chOv"),labels,vals,{id:"ad"});
    var cnt=function(s){return bs.filter(function(b){return b.status===s}).length};
    UI.donut(document.getElementById("dnOv"),[{label:BK.new[0],value:cnt("new"),color:"#d9b99b"},{label:BK.wait[0],value:cnt("wait"),color:"#5c6b78"},{label:BK.ok[0],value:cnt("ok"),color:"#3f7d58"},{label:BK.done[0],value:cnt("done"),color:"#8a7fb8"},{label:"مرفوض / ملغي",value:cnt("no")+cnt("cancel"),color:"#b4483a"}]);
    var cities={};DB.venues.filter(function(v){return v.status==="approved"}).forEach(function(v){cities[v.c]=(cities[v.c]||0)+1});
    var arr=Object.keys(cities).map(function(c){return [c,cities[c]]}).sort(function(a,b){return b[1]-a[1]});
    document.getElementById("byCity").innerHTML=arr.length?UI.barsHtml(arr):'<div class="empty-s">لا توجد قاعات منشورة</div>';
    var tod=[];
    if(pe)tod.push(["قاعات بانتظار الاعتماد",pe,"ap"]);if(pvPe)tod.push(["مزودون بانتظار التوثيق",pvPe,"ap"]);
    var hid=DB.reviews.filter(function(r){return r.status==="hidden"}).length;if(hid)tod.push(["تقييمات مخفية للمراجعة",hid,"rv"]);
    var og=DB.giveaways.filter(function(g){return g.status==="open"&&g.end<=today}).length;if(og)tod.push(["سحوبات انتهت مشاركتها وتنتظر السحب",og,"gv"]);
    document.getElementById("todo").innerHTML=tod.length?tod.map(function(t){return '<div><span>'+t[0]+'</span><b>'+t[1]+'</b><a class="mini" href="#" data-go="'+t[2]+'">عرض</a></div>'}).join(""):'<div class="empty-s">لا توجد مهام معلّقة 🎉</div>';
    var top=DB.venues.filter(function(v){return v.status==="approved"}).map(function(v){return {v:v,s:vStats(v)}}).sort(function(a,b){return b.s.bk-a.s.bk}).slice(0,5);
    document.getElementById("tTop").innerHTML='<tr><th>القاعة</th><th>المزود</th><th>الحجوزات</th><th>التقييم</th></tr>'+top.map(function(x){return '<tr class="rowc" data-vd="'+x.v.id+'"><td><div class="who">'+thumb(x.v)+'<b>'+esc(x.v.n)+'</b></div></td><td>'+esc(pname(x.v.pid))+'</td><td>'+x.s.bk+'</td><td>'+(x.s.rv?"★ "+x.s.avg.toFixed(1):"—")+'</td></tr>'}).join("");
    document.getElementById("actOv").innerHTML=actList(DB.activity.slice(0,6));
  }
  function actList(a){return a.length?a.map(function(x){return '<li><span class="dot"></span><div><b>'+esc(x.who)+'</b> '+esc(x.txt)+'<small>'+tm(x.t)+'</small></div></li>'}).join(""):'<li><div class="empty-s">لا يوجد نشاط</div></li>'}

  // ===== المراجعة =====
  function renderApprovals(){
    var vs=DB.venues.filter(function(v){return v.status==="pending"}),ps=DB.providers.filter(function(p){return p.status==="pending"});
    document.getElementById("tApV").innerHTML='<tr><th>القاعة</th><th>المزود</th><th>المدينة · النوع</th><th>السعة</th><th>الصور</th><th>اكتمال البيانات</th><th>تاريخ الإرسال</th><th></th></tr>'+
      (vs.length?vs.map(function(v){return '<tr><td><div class="who">'+thumb(v)+'<b>'+esc(v.n)+'</b></div></td><td>'+esc(pname(v.pid))+'</td><td>'+esc(v.c)+' · '+v.t+'</td><td>'+v.cap+'</td><td>'+(v.photos||[]).length+'</td><td>'+pct(v)+'%</td><td>'+dateAr(v.created)+'</td>'+
        '<td><button class="mini ok" data-vd="'+v.id+'">مراجعة</button><button class="mini gold" data-vap="'+v.id+'">اعتماد</button></td></tr>'}).join(""):'<tr><td colspan="8"><div class="empty-s">لا توجد قاعات بانتظار الاعتماد ✓</div></td></tr>');
    document.getElementById("tApP").innerHTML='<tr><th>المنشأة</th><th>المسؤول</th><th>المدينة</th><th>السجل التجاري</th><th>تاريخ الطلب</th><th></th></tr>'+
      (ps.length?ps.map(function(p){return '<tr><td><b>'+esc(p.name)+'</b></td><td>'+esc(p.owner)+'</td><td>'+esc(p.city)+'</td><td dir="ltr">'+esc(p.cr)+'</td><td>'+dateAr(p.joined)+'</td><td><button class="mini gold" data-pok="'+p.id+'">توثيق</button><button class="mini dng" data-pno="'+p.id+'">رفض</button></td></tr>'}).join(""):'<tr><td colspan="6"><div class="empty-s">لا توجد طلبات توثيق ✓</div></td></tr>');
  }
  function setVenue(id,st,note){
    var v=vById(id);if(!v)return;v.status=st;if(note!=null)v.adminNote=note;
    DBlog(WHO,(st==="approved"?"اعتمدت":st==="rejected"?"رفضت":st==="hidden"?"أوقفت":"حدّثت")+" «"+v.n+"»");save();refresh();
    toast(st==="approved"?"تم اعتماد القاعة ونشرها في الموقع":st==="rejected"?"تم رفض القاعة":st==="hidden"?"تم إيقاف القاعة":"تم التحديث");
  }
  function venueDrawer(id){
    var v=vById(id);if(!v)return;
    var p=pById(v.pid),s=vStats(v);
    var gal=(v.photos&&v.photos.length)?'<div class="photos" style="margin:10px 0 14px">'+v.photos.slice(0,6).map(function(x){return '<div class="ph-i"><img src="'+x+'" alt=""></div>'}).join("")+'</div>':'<div class="empty-s" style="background:var(--cream);border-radius:12px;margin:10px 0 14px">لا توجد صور مرفوعة</div>';
    var acts="";
    if(v.status==="pending"||v.status==="rejected")acts+='<button class="mini gold" data-dact="approved">اعتماد ونشر</button>';
    if(v.status==="pending")acts+='<button class="mini dng" data-dact="rejected">رفض</button>';
    if(v.status==="approved")acts+='<button class="mini dng" data-dact="hidden">إيقاف</button><button class="mini" data-dact="feat">'+(v.featured?"إلغاء التمييز":"تمييز ★")+'</button><a class="mini" href="hall.html?id='+v.id+'" target="_blank" rel="noopener">عرض في الموقع</a>';
    if(v.status==="hidden")acts+='<button class="mini gold" data-dact="approved">إعادة التفعيل</button>';
    var d=UI.drawer('<h3>'+esc(v.n)+'</h3><div>'+badge(VN,v.status)+(v.featured?' <span class="st-b s-new">★ مميزة</span>':"")+'</div>'+gal+
      '<div class="kv"><div><span>المزود</span><b>'+esc(p?p.name:"—")+'</b></div><div><span>المدينة</span><b>'+esc(v.c)+'</b></div><div><span>النوع</span><b>'+v.t+'</b></div><div><span>السعة</span><b>'+v.cap+'</b></div>'+
      '<div><span>التقسيط</span><b>'+(v.i?"متاح":"غير متاح")+'</b></div><div><span>نسبة العربون</span><b>'+(v.depositPct||20)+'%</b></div><div><span>الجوال</span><b dir="ltr">'+esc(v.phone||"—")+'</b></div><div><span>العنوان</span><b>'+esc(v.address||"—")+'</b></div>'+
      '<div><span>الحجوزات</span><b>'+s.bk+'</b></div><div><span>التقييم</span><b>'+(s.rv?"★ "+s.avg.toFixed(1)+" ("+s.rv+")":"—")+'</b></div><div><span>اكتمال البيانات</span><b>'+pct(v)+'%</b></div></div>'+
      (v.desc?'<p class="muted" style="font-size:.92rem;margin-bottom:10px">'+esc(v.desc)+'</p>':"")+
      '<div class="pills" style="margin-bottom:12px">'+(v.features||[]).map(function(f){return '<span>'+esc(f)+'</span>'}).join("")+'</div>'+
      ((v.pkgs||[]).length?'<h4 style="margin:8px 0">الباقات</h4>'+(v.pkgs||[]).map(function(k){return '<div class="kv" style="margin:0"><div><span>'+esc(k.n||"باقة")+'</span><b>'+k.g+' ضيف · '+(k.svc||[]).length+' خدمات</b></div></div>'}).join(""):"")+
      '<div class="fg1" style="margin-top:12px"><label>ملاحظة للمزود (تظهر عند الرفض)</label><textarea id="vNote" rows="3">'+esc(v.adminNote||"")+'</textarea></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+acts+'<button class="mini dng" data-dact="delete">حذف</button></div>');
    d.querySelectorAll("[data-dact]").forEach(function(b){b.onclick=function(){
      var a=b.dataset.dact,note=d.querySelector("#vNote").value;
      if(a==="rejected"&&!note.trim()){toast("اكتب سبب الرفض في خانة الملاحظة");return}
      if(a==="feat"){var n=DB.venues.filter(function(x){return x.featured}).length;if(!v.featured&&n>=(DB.settings.featuredMax||6)){toast("بلغت الحد الأقصى للقاعات المميزة");return}v.featured=!v.featured;DBlog(WHO,(v.featured?"ميّزت":"ألغت تمييز")+" «"+v.n+"»");save();UI.closeDrawer();refresh();toast("تم التحديث");return}
      if(a==="delete"){UI.closeDrawer();UI.confirm("سيُحذف «"+esc(v.n)+"» نهائيًا.",function(){DB.venues=DB.venues.filter(function(x){return x.id!==v.id});DBlog(WHO,"حذفت «"+v.n+"»");save();refresh();toast("تم الحذف")},{title:"حذف القاعة",yes:"حذف",danger:true});return}
      UI.closeDrawer();setVenue(v.id,a,a==="approved"?"":note);
    }});
  }

  // ===== القاعات =====
  function fill(sel,items,all){sel.innerHTML='<option value="">'+all+'</option>'+items.map(function(i){return '<option value="'+i[0]+'">'+esc(i[1])+'</option>'}).join("")}
  function venuesFiltered(){
    var q=document.getElementById("vQ").value.trim().toLowerCase(),s=document.getElementById("vS").value,c=document.getElementById("vC").value,p=document.getElementById("vP").value;
    return DB.venues.filter(function(v){return (!s||v.status===s)&&(!c||v.c===c)&&(!p||v.pid===p)&&(!q||v.n.toLowerCase().indexOf(q)>-1||pname(v.pid).toLowerCase().indexOf(q)>-1)});
  }
  function renderVenues(){
    var vs=document.getElementById("vS"),vc=document.getElementById("vC"),vp=document.getElementById("vP"),a=vs.value,b=vc.value,c=vp.value;
    fill(vs,Object.keys(VN).map(function(k){return [k,VN[k][0]]}),"كل الحالات");fill(vc,CITIES.map(function(x){return [x,x]}),"كل المدن");fill(vp,DB.providers.map(function(p){return [p.id,p.name]}),"كل المزودين");
    vs.value=a||"";vc.value=b||"";vp.value=c||"";
    var list=venuesFiltered();
    document.getElementById("tVn").innerHTML='<tr><th>القاعة</th><th>المزود</th><th>المدينة</th><th>النوع</th><th>السعة</th><th>الحجوزات</th><th>الحالة</th><th></th></tr>'+
      (list.length?list.map(function(v){return '<tr class="rowc" data-vd="'+v.id+'"><td><div class="who">'+thumb(v)+'<b>'+(v.featured?"★ ":"")+esc(v.n)+'</b></div></td><td>'+esc(pname(v.pid))+'</td><td>'+esc(v.c)+'</td><td>'+v.t+'</td><td>'+v.cap+'</td><td>'+vStats(v).bk+'</td><td>'+badge(VN,v.status)+'</td><td><button class="mini" data-vd="'+v.id+'">إدارة</button></td></tr>'}).join(""):'<tr><td colspan="8"><div class="empty-s">لا توجد قاعات مطابقة</div></td></tr>');
  }

  // ===== المزودون =====
  function renderProviders(){
    var ps=document.getElementById("pS"),a=ps.value;fill(ps,Object.keys(PV).map(function(k){return [k,PV[k][0]]}),"كل الحالات");ps.value=a||"";
    var q=document.getElementById("pQ").value.trim().toLowerCase(),s=ps.value;
    var list=DB.providers.filter(function(p){return (!s||p.status===s)&&(!q||p.name.toLowerCase().indexOf(q)>-1||p.owner.toLowerCase().indexOf(q)>-1)});
    document.getElementById("tPv").innerHTML='<tr><th>المنشأة</th><th>المسؤول</th><th>المدينة</th><th>القاعات</th><th>الحجوزات</th><th>انضم في</th><th>الحالة</th><th></th></tr>'+
      (list.length?list.map(function(p){var vc=DB.venues.filter(function(v){return v.pid===p.id}).length,bc=DB.bookings.filter(function(b){return b.pid===p.id}).length;
        var acts='<button class="mini" data-pd="'+p.id+'">التفاصيل</button>';
        if(p.status==="pending")acts+='<button class="mini gold" data-pok="'+p.id+'">توثيق</button>';
        if(p.status==="verified")acts+='<button class="mini" data-ppw="'+p.id+'">كلمة المرور</button><button class="mini dng" data-psu="'+p.id+'">إيقاف</button>';
        if(p.status==="suspended")acts+='<button class="mini gold" data-pre="'+p.id+'">تفعيل</button>';
        return '<tr><td><div class="who"><span class="av">'+UI.initials(p.name)+'</span><b>'+esc(p.name)+'</b></div></td><td>'+esc(p.owner)+'</td><td>'+esc(p.city)+'</td><td>'+vc+'</td><td>'+bc+'</td><td>'+dateAr(p.joined)+'</td><td>'+badge(PV,p.status)+'</td><td>'+acts+'</td></tr>'}).join(""):'<tr><td colspan="8"><div class="empty-s">لا توجد نتائج</div></td></tr>');
  }
  function setProv(id,st,msg){var p=pById(id);p.status=st;DBlog(WHO,msg+" «"+p.name+"»");save();refresh();toast(msg)}
  function provDrawer(id){
    var p=pById(id),vs=DB.venues.filter(function(v){return v.pid===id});
    UI.drawer('<h3>'+esc(p.name)+'</h3><div>'+badge(PV,p.status)+'</div><div class="kv"><div><span>المسؤول</span><b>'+esc(p.owner)+'</b></div><div><span>الجوال</span><b dir="ltr">'+esc(p.phone)+'</b></div><div><span>البريد</span><b dir="ltr">'+esc(p.email)+'</b></div>'+
      '<div><span>المدينة</span><b>'+esc(p.city)+'</b></div><div><span>السجل التجاري</span><b dir="ltr">'+esc(p.cr)+'</b></div><div><span>تاريخ الانضمام</span><b>'+dateAr(p.joined)+'</b></div></div>'+
      '<h4 style="margin:10px 0">قاعات المزود ('+vs.length+')</h4>'+(vs.length?vs.map(function(v){return '<div class="kv" style="margin:0"><div><span>'+esc(v.n)+'</span>'+badge(VN,v.status)+'</div></div>'}).join(""):'<div class="empty-s">لا توجد قاعات</div>'));
  }

  // ===== الحجوزات =====
  function bkFiltered(){
    var q=document.getElementById("bQ").value.trim().toLowerCase(),v=+document.getElementById("bV").value||0,fr=document.getElementById("bFrom").value,to=document.getElementById("bTo").value;
    return DB.bookings.filter(function(b){return (bf==="all"||b.status===bf)&&(!v||b.vid===v)&&(!q||b.customer.toLowerCase().indexOf(q)>-1||b.id.toLowerCase().indexOf(q)>-1)&&(!fr||b.date>=fr)&&(!to||b.date<=to)}).sort(function(a,b){return a.date<b.date?1:-1});
  }
  function renderBookings(){
    var sel=document.getElementById("bV"),cur=sel.value;
    sel.innerHTML='<option value="0">كل القاعات</option>'+DB.venues.filter(function(v){return v.status==="approved"}).map(function(v){return '<option value="'+v.id+'">'+esc(v.n)+'</option>'}).join("");sel.value=cur||"0";
    var sts=["all","new","wait","ok","done","no","cancel"];
    document.getElementById("bF").innerHTML=sts.map(function(s){var n=s==="all"?DB.bookings.length:DB.bookings.filter(function(b){return b.status===s}).length;return '<button class="chip '+(bf===s?"on":"")+'" data-bf="'+s+'">'+(s==="all"?"الكل":BK[s][0])+' ('+n+')</button>'}).join("");
    var list=bkFiltered();
    document.getElementById("tBk").innerHTML='<tr><th>رقم الحجز</th><th>العميل</th><th>القاعة</th><th>المزود</th><th>التاريخ</th><th>الضيوف</th><th>القيمة</th><th>الحالة</th></tr>'+
      (list.length?list.slice(0,80).map(function(b){return '<tr class="rowc" data-bd="'+b.id+'"><td>'+b.id+'</td><td><div class="who"><span class="av">'+UI.initials(b.customer)+'</span><b>'+esc(b.customer)+'</b></div></td><td>'+esc(vname(b.vid))+'</td><td>'+esc(pname(b.pid))+'</td><td>'+dateAr(b.date)+'</td><td>'+b.guests+'</td><td>'+money(b.amount)+'</td><td>'+badge(BK,b.status)+'</td></tr>'}).join(""):'<tr><td colspan="8"><div class="empty-s">لا توجد حجوزات مطابقة</div></td></tr>');
  }
  function bkDrawer(id){
    var b=DB.bookings.find(function(x){return x.id===id});if(!b)return;
    var d=UI.drawer('<h3>'+b.id+'</h3><div>'+badge(BK,b.status)+'</div><div class="kv"><div><span>العميل</span><b>'+esc(b.customer)+'</b></div><div><span>الجوال</span><b dir="ltr">'+esc(b.phone)+'</b></div><div><span>القاعة</span><b>'+esc(vname(b.vid))+'</b></div><div><span>المزود</span><b>'+esc(pname(b.pid))+'</b></div>'+
      '<div><span>تاريخ المناسبة</span><b>'+dateAr(b.date)+'</b></div><div><span>الضيوف</span><b>'+b.guests+'</b></div><div><span>الباقة</span><b>'+b.pkg+'</b></div><div><span>القيمة</span><b>'+money(b.amount)+'</b></div>'+
      '<div><span>عمولة المنصة</span><b>'+money(b.amount*(DB.settings.commission||5)/100)+'</b></div></div>'+
      '<div class="fg1"><label>تغيير الحالة (تدخل إداري)</label><select id="bkSt">'+Object.keys(BK).map(function(k){return '<option value="'+k+'"'+(k===b.status?" selected":"")+'>'+BK[k][0]+'</option>'}).join("")+'</select></div>'+
      '<button class="mini gold" id="bkSave">حفظ</button>');
    d.querySelector("#bkSave").onclick=function(){var n=d.querySelector("#bkSt").value;if(n!==b.status){b.status=n;DBlog(WHO,"غيّرت حالة الحجز "+b.id+" إلى «"+BK[n][0]+"»");save();refresh()}UI.closeDrawer();toast("تم التحديث")};
  }

  // ===== العرسان =====
  function renderUsers(){
    var sel=document.getElementById("uC"),cur=sel.value;fill(sel,CITIES.map(function(x){return [x,x]}),"كل المدن");sel.value=cur||"";
    var q=document.getElementById("uQ").value.trim().toLowerCase(),c=sel.value;
    var list=DB.users.filter(function(u){return (!c||u.city===c)&&(!q||u.name.toLowerCase().indexOf(q)>-1||u.phone.indexOf(q)>-1)});
    document.getElementById("tUs").innerHTML='<tr><th>الاسم</th><th>الجوال</th><th>المدينة</th><th>تاريخ التسجيل</th><th>الحالة</th><th></th></tr>'+
      list.map(function(u){return '<tr><td><div class="who"><span class="av">'+UI.initials(u.name)+'</span><b>'+esc(u.name)+'</b></div></td><td dir="ltr">'+esc(u.phone)+'</td><td>'+esc(u.city)+'</td><td>'+dateAr(u.joined)+'</td><td>'+(u.status==="blocked"?'<span class="st-b s-no">محظور</span>':'<span class="st-b s-ok">نشط</span>')+'</td><td><button class="mini '+(u.status==="blocked"?"gold":"dng")+'" data-ub="'+u.id+'">'+(u.status==="blocked"?"إلغاء الحظر":"حظر")+'</button></td></tr>'}).join("");
  }

  // ===== التقييمات =====
  function renderReviews(){
    var sts=["all","shown","hidden"],lab={all:"الكل",shown:"ظاهرة",hidden:"مخفية"};
    document.getElementById("rF").innerHTML=sts.map(function(s){var n=s==="all"?DB.reviews.length:DB.reviews.filter(function(r){return r.status===s}).length;return '<button class="chip '+(rf===s?"on":"")+'" data-rf="'+s+'">'+lab[s]+' ('+n+')</button>'}).join("");
    var list=DB.reviews.filter(function(r){return rf==="all"||r.status===rf}).sort(function(a,b){return a.date<b.date?1:-1});
    document.getElementById("rvl").innerHTML=list.length?list.map(function(r){return '<div class="rv-i"><div class="tp"><b>'+esc(r.name)+'</b><span class="rate">'+"★".repeat(r.stars)+"☆".repeat(5-r.stars)+'</span><span class="mut" style="font-size:.8rem">'+esc(vname(r.vid))+' · '+dateAr(r.date)+'</span>'+(r.status==="hidden"?'<span class="st-b s-hide">مخفي</span>':"")+'</div><p>'+esc(r.text)+'</p>'+
      (r.reply?'<div class="rp"><b>رد المزود:</b> '+esc(r.reply)+'</div>':"")+
      '<div style="margin-top:8px"><button class="mini" data-rt="'+r.id+'">'+(r.status==="hidden"?"إظهار":"إخفاء")+'</button><button class="mini dng" data-rd="'+r.id+'">حذف</button></div></div>'}).join(""):'<div class="empty-s">لا توجد تقييمات</div>';
  }

  // ===== السحوبات =====
  function renderGiveaways(){
    document.getElementById("gvGrid").innerHTML=DB.giveaways.map(function(g){
      var open=g.status==="open";
      return '<article class="vc"><div class="bd"><div style="display:flex;justify-content:space-between;align-items:center">'+(open?'<span class="st-b s-ok">مفتوح</span>':'<span class="st-b s-draft">منتهٍ</span>')+'<span class="mut" style="font-size:.8rem">'+dateAr(g.start)+' → '+dateAr(g.end)+'</span></div>'+
        '<h4>'+esc(g.title)+'</h4><p class="muted sm" style="margin:0">'+esc(g.prize)+'</p>'+
        '<div class="stats" style="grid-template-columns:1fr 1fr"><div><b>'+g.entries.length+'</b>مشاركة</div><div><b>'+(g.winner?mask(g.winner):"—")+'</b>الفائز</div></div>'+
        '<div class="acts">'+(open?'<button class="mini gold" data-gd="'+g.id+'">اسحب الفائز</button><button class="mini" data-gc="'+g.id+'">إغلاق</button>':"")+'<button class="mini dng" data-gx="'+g.id+'">حذف</button></div></div></article>';
    }).join("")||'<div class="empty-s">لا توجد سحوبات</div>';
  }
  function newGiveaway(){
    UI.dialog({title:"سحب جديد",body:'<div class="fgrid"><div class="fg1 full"><label>عنوان السحب</label><input id="gT"></div><div class="fg1 full"><label>الجائزة</label><input id="gP"></div>'+
      '<div class="fg1"><label>بداية المشاركة</label><input type="date" id="gS" value="'+today+'"></div><div class="fg1"><label>آخر موعد</label><input type="date" id="gE"></div><div class="fg1"><label>موعد اختيار الفائز</label><input type="date" id="gW"></div></div><p class="hint" id="gErr" style="color:#a03c2e"></p>',
      foot:[{label:"إلغاء"},{label:"إنشاء السحب",cls:"ok",fn:function(d){var t=d.querySelector("#gT").value.trim(),p=d.querySelector("#gP").value.trim(),s=d.querySelector("#gS").value,e=d.querySelector("#gE").value,w=d.querySelector("#gW").value;
        if(!t||!p||!s||!e||!w){d.querySelector("#gErr").textContent="أكمل كل الحقول";return false}if(e<s||w<e){d.querySelector("#gErr").textContent="تأكد من ترتيب التواريخ";return false}
        DB.giveaways.unshift({id:"G"+Date.now(),title:t,prize:p,start:s,end:e,winnerDate:w,status:"open",entries:[],winner:""});DBlog(WHO,"أنشأت سحبًا جديدًا «"+t+"»");save();refresh();toast("تم إنشاء السحب");return true}}]});
  }

  // ===== السجل والإعدادات =====
  function renderLog(){document.getElementById("actAll").innerHTML=actList(DB.activity)}
  function renderSettings(){
    var s=DB.settings;document.getElementById("sCom").value=s.commission;document.getElementById("sFeat").value=s.featuredMax;document.getElementById("sAnn").value=s.announce;
    document.getElementById("sAuto").classList.toggle("on",!!s.autoApprove);document.getElementById("sMnt").classList.toggle("on",!!s.maintenance);
    document.getElementById("cityL").innerHTML=CITIES.map(function(c){var extra=(s.extraCities||[]).indexOf(c)>-1;return '<span>'+esc(c)+(extra?' <button data-cd="'+esc(c)+'" style="font-size:.7rem">✕</button>':"")+'</span>'}).join("");
  }

  // ===== الأحداث =====
  function bind(){
    document.addEventListener("click",function(e){
      var t=e.target,q=function(s){return t.closest(s)},x;
      if((x=q("[data-vap]"))){setVenue(+x.dataset.vap,"approved","");return}
      if((x=q("[data-vd]"))){venueDrawer(+x.dataset.vd);return}
      if((x=q("[data-pok]"))){setProv(x.dataset.pok,"verified","وثّقت حساب");return}
      if((x=q("[data-pno]"))){UI.confirm("سيُرفض طلب انضمام «"+esc(pname(x.dataset.pno))+"».",function(){setProv(x.dataset.pno,"suspended","رفضت طلب")},{title:"رفض الطلب",yes:"رفض",danger:true});return}
      if((x=q("[data-psu]"))){UI.confirm("ستُوقف كل قاعات «"+esc(pname(x.dataset.psu))+"» عن العمل.",function(){setProv(x.dataset.psu,"suspended","أوقفت حساب")},{title:"إيقاف المزود",yes:"إيقاف",danger:true});return}
      if((x=q("[data-pre]"))){setProv(x.dataset.pre,"verified","فعّلت حساب");return}
      if((x=q("[data-ppw]"))){var pid=x.dataset.ppw;UI.dialog({title:"إعادة تعيين كلمة المرور",body:'<p class="hint">للمزود: '+esc(pname(pid))+'</p><div class="fg1"><label>كلمة المرور الجديدة (8 أحرف على الأقل)</label><input id="npw" type="text" dir="ltr"></div>',foot:[{label:"إلغاء"},{label:"حفظ",cls:"ok",fn:function(d){var pw=d.querySelector("#npw").value;if(pw.length<8){toast("كلمة المرور 8 أحرف على الأقل");return false}fetch("/api/admin/set-password",{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"gaiah"},body:JSON.stringify({providerId:pid,password:pw})}).then(function(r){return r.json()}).then(function(j){toast(j.ok?"تم تحديث كلمة المرور":j.error)});return true}}]});return}
      if((x=q("[data-pd]"))){provDrawer(x.dataset.pd);return}
      if((x=q("[data-bd]"))){bkDrawer(x.dataset.bd);return}
      if((x=q("[data-bf]"))){bf=x.dataset.bf;renderBookings();return}
      if((x=q("[data-rf]"))){rf=x.dataset.rf;renderReviews();return}
      if((x=q("[data-ub]"))){var u=DB.users.find(function(z){return z.id===x.dataset.ub});u.status=u.status==="blocked"?"active":"blocked";DBlog(WHO,(u.status==="blocked"?"حظرت":"ألغت حظر")+" المستخدم "+u.name);save();renderUsers();toast("تم التحديث");return}
      if((x=q("[data-rt]"))){var r=DB.reviews.find(function(z){return z.id===+x.dataset.rt});r.status=r.status==="hidden"?"shown":"hidden";DBlog(WHO,(r.status==="hidden"?"أخفت":"أظهرت")+" تقييمًا");save();refresh();return}
      if((x=q("[data-rd]"))){UI.confirm("سيُحذف التقييم نهائيًا.",function(){DB.reviews=DB.reviews.filter(function(z){return z.id!==+x.dataset.rd});save();refresh();toast("تم حذف التقييم")},{title:"حذف تقييم",yes:"حذف",danger:true});return}
      if((x=q("[data-gd]"))){var g=DB.giveaways.find(function(z){return z.id===x.dataset.gd});if(!g.entries.length){toast("لا توجد مشاركات لإجراء السحب");return}
        UI.confirm("سيتم اختيار فائز عشوائي من "+g.entries.length+" مشاركة وإغلاق السحب.",function(){g.winner=g.entries[Math.floor(Math.random()*g.entries.length)];g.status="closed";DBlog(WHO,"سحبت فائز «"+g.title+"»");save();refresh();toast("الفائز: "+mask(g.winner))},{title:"سحب الفائز",yes:"اسحب"});return}
      if((x=q("[data-gc]"))){var g2=DB.giveaways.find(function(z){return z.id===x.dataset.gc});g2.status="closed";save();refresh();toast("تم إغلاق السحب");return}
      if((x=q("[data-gx]"))){UI.confirm("سيُحذف السحب نهائيًا.",function(){DB.giveaways=DB.giveaways.filter(function(z){return z.id!==x.dataset.gx});save();refresh();toast("تم حذف السحب")},{title:"حذف سحب",yes:"حذف",danger:true});return}
      if((x=q("[data-cd]"))){var c=x.dataset.cd;DB.settings.extraCities=(DB.settings.extraCities||[]).filter(function(z){return z!==c});var i=CITIES.indexOf(c);if(i>-1)CITIES.splice(i,1);save();renderSettings();toast("تم حذف المدينة");return}
    });
    ["vQ","vS","vC","vP"].forEach(function(i){document.getElementById(i).addEventListener("input",renderVenues)});
    ["pQ","pS"].forEach(function(i){document.getElementById(i).addEventListener("input",renderProviders)});
    ["bQ","bV","bFrom","bTo"].forEach(function(i){document.getElementById(i).addEventListener("input",renderBookings)});
    ["uQ","uC"].forEach(function(i){document.getElementById(i).addEventListener("input",renderUsers)});
    document.getElementById("bell").onclick=function(){go("ap")};
    document.getElementById("gvNew").onclick=newGiveaway;
    document.getElementById("vCsv").onclick=function(){var rows=[["القاعة","المزود","المدينة","النوع","السعة","الحالة"]];venuesFiltered().forEach(function(v){rows.push([v.n,pname(v.pid),v.c,v.t,v.cap,VN[v.status][0]])});UI.csv("venues.csv",rows);toast("تم تصدير القاعات")};
    document.getElementById("bCsv").onclick=function(){var rows=[["رقم الحجز","العميل","القاعة","المزود","التاريخ","الضيوف","القيمة","الحالة"]];bkFiltered().forEach(function(b){rows.push([b.id,b.customer,vname(b.vid),pname(b.pid),b.date,b.guests,b.amount,BK[b.status][0]])});UI.csv("bookings.csv",rows);toast("تم تصدير الحجوزات")};
    document.getElementById("sAuto").onclick=function(){this.classList.toggle("on")};document.getElementById("sMnt").onclick=function(){this.classList.toggle("on")};
    document.getElementById("sf").onsubmit=function(e){e.preventDefault();var s=DB.settings;s.commission=+document.getElementById("sCom").value||0;s.featuredMax=+document.getElementById("sFeat").value||0;s.announce=document.getElementById("sAnn").value.trim()||s.announce;
      s.autoApprove=document.getElementById("sAuto").classList.contains("on");s.maintenance=document.getElementById("sMnt").classList.contains("on");DBlog(WHO,"حدّثت إعدادات المنصة");save();refresh();toast("تم حفظ الإعدادات")};
    document.getElementById("cityA").onclick=function(){var v=document.getElementById("cityN").value.trim();if(!v){return}if(CITIES.indexOf(v)>-1){toast("المدينة موجودة");return}
      DB.settings.extraCities=(DB.settings.extraCities||[]).concat([v]);CITIES.push(v);document.getElementById("cityN").value="";save();refresh();toast("تمت إضافة المدينة")};
    document.getElementById("expAll").onclick=function(){var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(DB,null,1)],{type:"application/json"}));a.download="gaiah-demo-data.json";document.body.appendChild(a);a.click();a.remove();toast("تم تصدير البيانات")};
    document.getElementById("rstDb").onclick=function(){UI.confirm("ستعود كل البيانات التجريبية إلى وضعها الأصلي.",DBreset,{title:"إعادة ضبط",yes:"إعادة ضبط",danger:true})};
  }

  go=UI.nav(TITLES);
  bind();refresh();
})();
