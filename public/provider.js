// لوحة المزود: إدارة قاعات متعددة، الصور والمعلومات، الحجوزات، التقويم، المدفوعات، التقييمات
(function(){
  "use strict";
  var esc=UI.esc,money=UI.money,dateAr=UI.dateAr,badge=UI.badge,BK=UI.BK_ST,VN=UI.VN_ST,toast=UI.toast;
  var PID=(DB.me&&DB.me.pid)||"P1";
  var P=function(){return DB.providers.find(function(p){return p.id===PID})};
  var myV=function(){return DB.venues.filter(function(v){return v.pid===PID})};
  var myB=function(){return DB.bookings.filter(function(b){return b.pid===PID})};
  var vById=function(id){return DB.venues.find(function(v){return v.id===id})};
  var vname=function(id){var v=vById(id);return v?v.n:"—"};
  var today=UI.todayISO();
  var addIso=function(n){var d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+"-"+UI.pad2(d.getMonth()+1)+"-"+UI.pad2(d.getDate())};
  var save=function(){if(!DBsave())toast("تعذّر الحفظ: مساحة التخزين ممتلئة، قلّل عدد الصور أو حجمها")};
  var TITLES={ov:"نظرة عامة",vn:"قاعاتي",ed:"محرر القاعة",bk:"الحجوزات",cal:"التقويم",pay:"المدفوعات",rv:"التقييمات",st:"الإعدادات"};
  var go;
  var vf="all",bf="all",calY=new Date().getFullYear(),calM=new Date().getMonth(),E=null,edTab="basic";

  function venueStats(v){
    var bs=DB.bookings.filter(function(b){return b.vid===v.id});
    var up=bs.filter(function(b){return b.date>=today&&(b.status==="ok"||b.status==="wait")}).length;
    var rs=DB.reviews.filter(function(r){return r.vid===v.id&&r.status==="shown"});
    var avg=rs.length?rs.reduce(function(a,r){return a+r.stars},0)/rs.length:0;
    return {total:bs.length,up:up,avg:avg,rv:rs.length};
  }
  function occupancy(v){
    var set={},end=addIso(90);
    DB.bookings.forEach(function(b){if(b.vid===v.id&&(b.status==="ok"||b.status==="wait")&&b.date>=today&&b.date<=end)set[b.date]=1});
    return Math.round(Object.keys(set).length/90*100);
  }
  function complete(v){
    var items=[["اسم القاعة",(v.n||"").trim().length>=3],["السعة",+v.cap>0],["وصف القاعة (40 حرفًا على الأقل)",(v.desc||"").trim().length>=40],
      ["3 صور على الأقل",(v.photos||[]).length>=3],["3 مميزات على الأقل",(v.features||[]).length>=3],["العنوان",(v.address||"").trim().length>2],
      ["رقم التواصل",(v.phone||"").trim().length>=9],["باقة واحدة على الأقل",(v.pkgs||[]).length>=1],["سياسة الإلغاء",(v.policy||[]).length>=1]];
    var ok=items.filter(function(x){return x[1]}).length;
    return {pct:Math.round(ok/items.length*100),missing:items.filter(function(x){return !x[1]}).map(function(x){return x[0]})};
  }
  function cover(v,cls){
    return (v.photos&&v.photos.length)?'<img src="'+v.photos[v.cover||0]+'" alt="">':art(v.s||v.id,480,270);
  }
  function conflict(b){
    var bl=(DB.blocked[b.vid]||[]).indexOf(b.date)>-1;
    return bl||DB.bookings.some(function(x){return x.id!==b.id&&x.vid===b.vid&&x.date===b.date&&(x.status==="wait"||x.status==="ok")});
  }

  // ===== تحديث كل الأقسام =====
  function refresh(){
    var nb=myB().filter(function(b){return b.status==="new"}).length;
    [["nBk",nb],["bellN",nb]].forEach(function(a){var e=document.getElementById(a[0]);e.textContent=a[1];e.style.display=a[1]?"":"none"});
    document.getElementById("nVn").textContent=myV().length;document.getElementById("nVn").style.display="";
    document.getElementById("meName").textContent=P().name;document.getElementById("meAv").textContent=UI.initials(P().name);
    renderOverview();renderVenues();renderBookings();renderCal();renderPay();renderReviews();renderSettings();
  }

  // ===== نظرة عامة =====
  function renderOverview(){
    var vs=myV(),bs=myB(),nNew=bs.filter(function(b){return b.status==="new"}).length;
    var up=bs.filter(function(b){return b.status==="ok"&&b.date>=today}).length;
    var mo=today.slice(0,7),rev=bs.filter(function(b){return (b.status==="ok"||b.status==="done")&&b.date.slice(0,7)===mo}).reduce(function(a,b){return a+b.amount},0);
    var ap=vs.filter(function(v){return v.status==="approved"}).length,pe=vs.filter(function(v){return v.status==="pending"}).length,dr=vs.filter(function(v){return v.status==="draft"}).length;
    document.getElementById("kOv").innerHTML=
      '<div class="kpi"><span>قاعاتي</span><b>'+vs.length+'</b><small class="mut">'+ap+' منشورة · '+pe+' قيد المراجعة · '+dr+' مسودة</small></div>'+
      '<div class="kpi"><span>طلبات بانتظار الرد</span><b>'+nNew+'</b><small class="'+(nNew?"dn":"up")+'">'+(nNew?"تحتاج إجراء":"لا توجد طلبات معلّقة")+'</small></div>'+
      '<div class="kpi"><span>حجوزات مؤكدة قادمة</span><b>'+up+'</b><small class="up">في كل قاعاتك</small></div>'+
      '<div class="kpi"><span>إيرادات هذا الشهر</span><b>'+fmt(rev)+'</b><small class="mut">ر.س — حجوزات مؤكدة ومكتملة</small></div>';
    // مخطط 6 أشهر (الحالي + 5 سابقة)
    var labels=[],vals=[],d=new Date();
    for(var i=3;i>=-2;i--){var m=new Date(d.getFullYear(),d.getMonth()-i,1),key=m.getFullYear()+"-"+UI.pad2(m.getMonth()+1);
      labels.push(UI.MON[m.getMonth()]);vals.push(bs.filter(function(b){return b.date.slice(0,7)===key&&b.status!=="no"&&b.status!=="cancel"}).length)}
    UI.lineChart(document.getElementById("chOv"),labels,vals,{id:"ov"});
    document.getElementById("byVenue").innerHTML=vs.length?UI.barsHtml(vs.map(function(v){var n=bs.filter(function(b){return b.vid===v.id}).length;return [esc(v.n),n]})):'<div class="empty-s">لا توجد قاعات بعد</div>';
    document.getElementById("tRecent").innerHTML=bkTable(bs.slice().sort(function(a,b){return b.created<a.created?-1:1}).slice(0,6),true,true);
    var tod=[],unrep=DB.reviews.filter(function(r){var v=vById(r.vid);return v&&v.pid===PID&&r.status==="shown"&&!r.reply}).length;
    var inc=vs.filter(function(v){return v.status!=="draft"&&complete(v).pct<80}).length,rej=vs.filter(function(v){return v.status==="rejected"}).length;
    if(nNew)tod.push(['طلبات حجز جديدة تنتظر ردك',nNew,"bk"]);
    if(rej)tod.push(['قاعات مرفوضة تحتاج تعديلًا',rej,"vn"]);
    if(dr)tod.push(['قاعات في المسودة لم تُرسل للمراجعة',dr,"vn"]);
    if(inc)tod.push(['قاعات بيانتها غير مكتملة',inc,"vn"]);
    if(unrep)tod.push(['تقييمات بلا رد',unrep,"rv"]);
    document.getElementById("todo").innerHTML=tod.length?tod.map(function(t){return '<div><span>'+t[0]+'</span><b>'+t[1]+'</b><a class="mini" href="#" data-go="'+t[2]+'">عرض</a></div>'}).join(""):'<div class="empty-s">لا توجد مهام معلّقة 🎉</div>';
    document.getElementById("tPerf").innerHTML='<tr><th>القاعة</th><th>الحالة</th><th>الحجوزات</th><th>الإشغال (90 يومًا)</th><th>التقييم</th><th></th></tr>'+
      vs.map(function(v){var s=venueStats(v);return '<tr><td><b>'+esc(v.n)+'</b></td><td>'+badge(VN,v.status)+'</td><td>'+s.total+'</td><td>'+occupancy(v)+'%</td><td>'+(s.rv?"★ "+s.avg.toFixed(1):"—")+'</td><td><button class="mini" data-edit="'+v.id+'">تعديل</button></td></tr>'}).join("");
  }

  // ===== قاعاتي =====
  function renderVenues(){
    var vs=myV(),sts=["all","approved","pending","draft","rejected","hidden"];
    document.getElementById("vFilter").innerHTML=sts.map(function(s){var n=s==="all"?vs.length:vs.filter(function(v){return v.status===s}).length;
      return '<button class="chip '+(vf===s?"on":"")+'" data-vf="'+s+'">'+(s==="all"?"الكل":VN[s][0])+' ('+n+')</button>'}).join("");
    var list=vs.filter(function(v){return vf==="all"||v.status===vf});
    document.getElementById("vGrid").innerHTML=list.map(function(v){
      var s=venueStats(v),pc=complete(v).pct;
      var acts='<button class="mini ok" data-edit="'+v.id+'">تعديل</button>';
      if(v.status==="approved")acts+='<a class="mini" href="hall.html?id='+v.id+'" target="_blank" rel="noopener">عرض في الموقع</a><button class="mini" data-hide="'+v.id+'">إخفاء</button>';
      if(v.status==="hidden")acts+='<button class="mini gold" data-show="'+v.id+'">إظهار</button>';
      acts+='<button class="mini" data-dup="'+v.id+'">نسخ</button><button class="mini dng" data-del="'+v.id+'">حذف</button>';
      return '<article class="vc"><div class="cv">'+cover(v)+badge(VN,v.status)+'<span class="ph-n">📷 '+((v.photos||[]).length)+'</span></div>'+
        '<div class="bd"><h4>'+esc(v.n||"قاعة بلا اسم")+'</h4><div class="meta"><span>'+esc(v.c)+' · '+v.t+'</span><span>👥 '+v.cap+'</span></div>'+
        '<div class="meter-w"><div class="meter" style="flex:1"><i style="width:'+pc+'%"></i></div><span>'+pc+'%</span></div>'+
        (v.status==="rejected"&&v.adminNote?'<div class="hint" style="color:#a03c2e;margin:0">ملاحظة الإدارة: '+esc(v.adminNote)+'</div>':"")+
        '<div class="stats"><div><b>'+s.total+'</b>حجوزات</div><div><b>'+s.up+'</b>قادمة</div><div><b>'+(s.rv?s.avg.toFixed(1):"—")+'</b>التقييم</div></div>'+
        '<div class="acts">'+acts+'</div></div></article>';
    }).join("")+'<button class="vadd" id="vAdd2"><div><i>+</i>إضافة قاعة جديدة</div></button>';
  }

  // ===== محرر القاعة =====
  var FEAT_ALL=["تكييف مركزي","مواقف سيارات","مدخل VIP","جناح العروس","مسرح وإضاءة متحركة","نظام صوت متكامل","شاشات LED","مطبخ تحضيري","غرفة ضيافة","إنارة ليلية","حديقة خارجية","مسبح","مصلى","خدمة نقل","مدخل لذوي الاحتياجات الخاصة","واي فاي"];
  function newVenue(){
    return {id:DBnextId(),pid:PID,n:"",nameEn:"",c:P().city||"الرياض",t:"قاعة صغيرة",cap:200,i:true,r:0,rv:0,s:20+Math.floor(Math.random()*30),desc:"",features:[],address:"",mapUrl:"",phone:P().phone||"",
      photos:[],cover:0,pkgs:[],policy:[{d:30,p:100},{d:15,p:50},{d:0,p:0}],depositPct:20,status:"draft",featured:false,created:today,_new:true};
  }
  function openEditor(id){
    var v=id?vById(id):null;
    E=v?JSON.parse(JSON.stringify(v)):newVenue();edTab="basic";
    go("ed");renderEditor();
  }
  var ED_TABS=[["basic","المعلومات الأساسية"],["photos","الصور"],["features","المميزات"],["packages","الباقات"],["location","الموقع والتواصل"],["policy","الدفع والإلغاء"],["preview","المراجعة"]];
  function updMeter(){
    var c=complete(E);document.getElementById("edMeter").style.width=c.pct+"%";document.getElementById("edPct").textContent=c.pct+"%";
    document.getElementById("edStatus").innerHTML=badge(VN,E.status);
    var ap=E.status==="approved";
    document.getElementById("edSubmit").textContent=ap?"حفظ التعديلات":"إرسال للمراجعة";
    document.getElementById("edDraft").style.display=ap?"none":"";
  }
  function renderEditor(){
    document.getElementById("edTabs").innerHTML=ED_TABS.map(function(t){return '<button data-et="'+t[0]+'" class="'+(edTab===t[0]?"on":"")+'">'+t[1]+'</button>'}).join("");
    var b=document.getElementById("edBody"),h="";
    if(edTab==="basic"){
      h='<div class="fgrid"><div class="fg1"><label>اسم القاعة (عربي) *</label><input data-f="n" value="'+esc(E.n)+'" maxlength="60"></div>'+
        '<div class="fg1"><label>الاسم بالإنجليزية (اختياري)</label><input data-f="nameEn" value="'+esc(E.nameEn||"")+'" dir="ltr" style="text-align:start" maxlength="60"></div>'+
        '<div class="fg1"><label>المدينة *</label><select data-f="c">'+CITIES.map(function(c){return '<option'+(E.c===c?" selected":"")+'>'+c+'</option>'}).join("")+'</select></div>'+
        '<div class="fg1"><label>نوع القاعة *</label><select data-f="t">'+TYPES.map(function(c){return '<option'+(E.t===c?" selected":"")+'>'+c+'</option>'}).join("")+'</select></div>'+
        '<div class="fg1"><label>السعة (عدد الضيوف) *</label><input type="number" min="20" max="5000" data-f="cap" value="'+E.cap+'"></div>'+
        '<div class="fg1"><label>التقسيط</label><label class="check" style="margin:10px 0"><input type="checkbox" data-f="i"'+(E.i?" checked":"")+'> السماح بالدفع بالتقسيط في هذه القاعة</label></div>'+
        '<div class="fg1 full"><label>وصف القاعة *</label><textarea data-f="desc" rows="5" maxlength="900">'+esc(E.desc)+'</textarea></div></div>'+
        '<p class="hint" id="descCnt">'+(E.desc||"").length+' / 900 حرفًا — اكتب 40 حرفًا على الأقل</p>';
    }else if(edTab==="photos"){
      var kb=Math.round((E.photos||[]).reduce(function(a,p){return a+p.length*.75},0)/1024);
      h='<div class="up-zone" id="upZ"><i>📷</i><b>اسحب الصور هنا أو اضغط للاختيار</b><div class="hint" style="margin:6px 0 0">حتى 12 صورة · تُضغط تلقائيًا · '+(E.photos||[]).length+' صورة ('+kb+' KB)</div></div>'+
        '<input type="file" id="upF" accept="image/*" multiple style="display:none">'+
        '<div class="photos">'+(E.photos||[]).map(function(p,i){return '<div class="ph-i '+(i===(E.cover||0)?"cover":"")+'"><img src="'+p+'" alt="">'+(i===(E.cover||0)?'<span class="cb2">الغلاف</span>':"")+
          '<div class="tb"><span><button data-pm="'+i+'" data-d="-1">◀</button> <button data-pm="'+i+'" data-d="1">▶</button></span><span>'+(i===(E.cover||0)?"":'<button data-pc="'+i+'">غلاف</button> ')+'<button data-pd="'+i+'">حذف</button></span></div></div>'}).join("")+'</div>'+
        ((E.photos||[]).length?"":'<p class="hint" style="margin-top:12px">لم تُضف صور بعد. أضف 3 صور على الأقل لإرسال القاعة للمراجعة.</p>');
    }else if(edTab==="features"){
      var all=FEAT_ALL.slice();(E.features||[]).forEach(function(f){if(all.indexOf(f)<0)all.push(f)});
      h='<div class="feat-grid">'+all.map(function(f){return '<label><input type="checkbox" data-ft="'+esc(f)+'"'+(E.features.indexOf(f)>-1?" checked":"")+'> '+esc(f)+'</label>'}).join("")+'</div>'+
        '<div class="fbar"><input class="grow" id="ftNew" placeholder="أضف ميزة أخرى"><button class="btn btn-line" id="ftAdd" style="padding:8px 18px">إضافة</button></div>';
    }else if(edTab==="packages"){
      h=(E.pkgs||[]).map(function(p,i){return '<div class="pk-ed" data-pk="'+i+'"><div class="hd"><b>باقة '+(i+1)+'</b><button class="mini dng" data-pkdel="'+i+'">حذف الباقة</button></div>'+
        '<div class="fgrid"><div class="fg1"><label>اسم الباقة</label><input data-pf="n" value="'+esc(p.n)+'"></div><div class="fg1"><label>عدد الضيوف</label><input type="number" min="10" data-pf="g" value="'+p.g+'"></div>'+
        '<div class="fg1"><label>الكراسي</label><select data-pf="chairs"><option value="1"'+(p.chairs?" selected":"")+'>مع كراسي</option><option value="0"'+(!p.chairs?" selected":"")+'>بدون كراسي</option></select></div>'+
        '<div class="fg1"><label>القسم</label><select data-pf="sec">'+SEC_TYPES.map(function(s){return '<option'+(p.sec===s?" selected":"")+'>'+s+'</option>'}).join("")+'</select></div>'+
        '<div class="fg1"><label>متاحة من</label><input type="date" data-pf="from" value="'+(p.from||"")+'"></div><div class="fg1"><label>متاحة حتى</label><input type="date" data-pf="to" value="'+(p.to||"")+'"></div>'+
        '<div class="fg1 full"><label>الخدمات المشمولة (اكتب الخدمة واضغط Enter)</label><div class="tagin" data-tg="'+i+'">'+(p.svc||[]).map(function(s,k){return '<span>'+esc(s)+'<button type="button" data-tgd="'+i+'" data-k="'+k+'">✕</button></span>'}).join("")+'<input placeholder="أضف خدمة…"></div></div></div></div>'}).join("")+
        '<button class="btn btn-line" id="pkAdd" style="padding:9px 22px">+ إضافة باقة</button>'+((E.pkgs||[]).length?"":'<p class="hint" style="margin-top:10px">الباقات تظهر في صفحة «بكجات القاعات»، وتعرض الخدمات المشمولة وتواريخ الإتاحة.</p>');
    }else if(edTab==="location"){
      h='<div class="fgrid"><div class="fg1 full"><label>العنوان *</label><input data-f="address" value="'+esc(E.address)+'" placeholder="المدينة · الحي · الشارع"></div>'+
        '<div class="fg1 full"><label>رابط الموقع على الخرائط</label><input data-f="mapUrl" value="'+esc(E.mapUrl||"")+'" dir="ltr" style="text-align:start" placeholder="https://maps.google.com/…"></div>'+
        '<div class="fg1"><label>رقم التواصل / واتساب *</label><input data-f="phone" value="'+esc(E.phone||"")+'" dir="ltr" style="text-align:start" placeholder="05xxxxxxxx"></div></div>';
    }else if(edTab==="policy"){
      h='<div class="fgrid"><div class="fg1"><label>نسبة العربون من قيمة الحجز (%)</label><input type="number" min="0" max="100" data-f="depositPct" value="'+E.depositPct+'"></div></div>'+
        '<h4 style="margin:6px 0 10px">سياسة الإلغاء والاسترداد</h4><p class="hint">حدّد نسبة استرداد العربون بحسب المدة المتبقية قبل المناسبة.</p>'+
        (E.policy||[]).map(function(t,i){return '<div class="pol-r" data-pol="'+i+'"><div class="fg1"><label>قبل المناسبة بـ (أيام) أو أكثر</label><input type="number" min="0" data-pl="d" value="'+t.d+'"></div><div class="fg1"><label>نسبة الاسترداد (%)</label><input type="number" min="0" max="100" data-pl="p" value="'+t.p+'"></div><button class="mini dng" data-poldel="'+i+'" style="margin-bottom:16px">حذف</button></div>'}).join("")+
        '<button class="btn btn-line" id="polAdd" style="padding:8px 20px">+ إضافة مرحلة</button>';
    }else{
      var c=complete(E);
      h='<div class="row2" style="margin:0"><div class="vc"><div class="cv">'+cover(E)+badge(VN,E.status)+'</div><div class="bd"><h4>'+esc(E.n||"اسم القاعة")+'</h4><div class="meta"><span>'+esc(E.c)+' · '+E.t+'</span><span>👥 '+E.cap+'</span></div>'+
        '<div class="pills">'+(E.features||[]).slice(0,6).map(function(f){return '<span>'+esc(f)+'</span>'}).join("")+'</div><p class="hint" style="margin:6px 0 0">'+esc((E.desc||"").slice(0,140))+'</p></div></div>'+
        '<div class="box" style="box-shadow:none"><h3>قائمة التحقق</h3>'+(c.missing.length?'<div class="todo">'+c.missing.map(function(m){return '<div><span>ينقص: '+m+'</span></div>'}).join("")+'</div>':'<div class="todo"><div><span>كل البيانات مكتملة ✓</span></div></div>')+
        '<p class="hint" style="margin-top:12px">عند الإرسال تراجع الإدارة القاعة وتنشرها في الموقع. يُشترط 3 صور على الأقل ووصف 40 حرفًا وعنوان.</p></div></div>';
    }
    b.innerHTML=h;updMeter();
  }
  function persistEditor(status){
    var v=vById(E.id),isNew=!v;
    var out=JSON.parse(JSON.stringify(E));delete out._new;
    if(status)out.status=status;
    if(isNew)DB.venues.push(out);else Object.assign(v,out);
    save();
  }
  function edSave(kind){
    var errs=[];
    if((E.n||"").trim().length<3)errs.push("اسم القاعة");
    if(!(+E.cap>=20))errs.push("السعة (20 على الأقل)");
    if(kind==="submit"&&E.status!=="approved"){var c=complete(E).missing;errs=errs.concat(c.filter(function(m){return ["3 صور على الأقل","العنوان","رقم التواصل","وصف القاعة (40 حرفًا على الأقل)"].indexOf(m)>-1}))}
    errs=errs.filter(function(x,i){return errs.indexOf(x)===i});
    var msg=document.getElementById("edMsg");
    if(errs.length){msg.textContent="أكمل: "+errs.join("، ");msg.style.color="#a03c2e";edTab=errs.some(function(e){return e.indexOf("صور")>-1})?"photos":"basic";renderEditor();toast("يوجد بيانات ناقصة");return}
    msg.textContent="";
    var wasNew=!vById(E.id);
    if(kind==="draft"){persistEditor(E.status==="approved"?"approved":"draft");DBlog(P().name,"حفظ «"+E.n+"» كمسودة");toast("تم حفظ المسودة")}
    else if(E.status==="approved"){persistEditor("approved");DBlog(P().name,"عدّل بيانات «"+E.n+"»");toast("تم حفظ التعديلات")}
    else{var st=DB.settings.autoApprove?"approved":"pending";persistEditor(st);DBlog(P().name,"أرسل «"+E.n+"» للمراجعة");toast(st==="approved"?"تم نشر القاعة":"أُرسلت القاعة للمراجعة")}
    E=null;go("vn");refresh();
  }

  // ===== الحجوزات =====
  function bkRowActs(b){
    var h="";
    if(b.status==="new")h='<button class="mini ok" data-bk="'+b.id+'" data-st="wait">قبول</button><button class="mini dng" data-bk="'+b.id+'" data-st="no">رفض</button>';
    else if(b.status==="wait")h='<button class="mini gold" data-bk="'+b.id+'" data-st="ok">تأكيد العربون</button>';
    else if(b.status==="ok"&&b.date<=today)h='<button class="mini" data-bk="'+b.id+'" data-st="done">إتمام</button>';
    return h;
  }
  function bkTable(list,acts,compact){
    return '<tr><th>رقم الحجز</th><th>العميل</th><th>القاعة</th><th>التاريخ</th>'+(compact?'':'<th>الضيوف</th><th>المبلغ</th>')+'<th>الحالة</th>'+(acts?'<th></th>':'')+'</tr>'+
      (list.length?list.map(function(b){return '<tr class="rowc" data-bkrow="'+b.id+'"><td>'+b.id+'</td><td><div class="who"><span class="av">'+UI.initials(b.customer)+'</span><b>'+esc(b.customer)+'</b></div></td><td>'+esc(vname(b.vid))+'</td><td>'+dateAr(b.date)+'</td>'+(compact?'':'<td>'+b.guests+'</td><td>'+money(b.amount)+'</td>')+'<td>'+badge(BK,b.status)+'</td>'+(acts?'<td>'+bkRowActs(b)+'</td>':'')+'</tr>'}).join(""):'<tr><td colspan="8"><div class="empty-s">لا توجد حجوزات مطابقة</div></td></tr>');
  }
  function bkFiltered(){
    var q=document.getElementById("bkQ").value.trim().toLowerCase(),v=+document.getElementById("bkV").value||0,fr=document.getElementById("bkFrom").value,to=document.getElementById("bkTo").value;
    return myB().filter(function(b){return (bf==="all"||b.status===bf)&&(!v||b.vid===v)&&(!q||b.customer.toLowerCase().indexOf(q)>-1||b.id.toLowerCase().indexOf(q)>-1||(b.phone||"").indexOf(q)>-1)&&(!fr||b.date>=fr)&&(!to||b.date<=to)})
      .sort(function(a,b){return a.date<b.date?1:-1});
  }
  function renderBookings(){
    var sel=document.getElementById("bkV"),cur=sel.value;
    sel.innerHTML='<option value="0">كل القاعات</option>'+myV().map(function(v){return '<option value="'+v.id+'">'+esc(v.n)+'</option>'}).join("");sel.value=cur||"0";
    var bs=myB(),sts=["all","new","wait","ok","done","no","cancel"];
    document.getElementById("bkF").innerHTML=sts.map(function(s){var n=s==="all"?bs.length:bs.filter(function(b){return b.status===s}).length;return '<button class="chip '+(bf===s?"on":"")+'" data-bf="'+s+'">'+(s==="all"?"الكل":BK[s][0])+' ('+n+')</button>'}).join("");
    document.getElementById("tBk").innerHTML=bkTable(bkFiltered(),true);
  }
  function setBk(id,st){
    var b=DB.bookings.find(function(x){return x.id===id});if(!b)return;
    if((st==="wait"||st==="ok")&&conflict(b)&&b.status==="new"){toast("يوجد حجز آخر أو حظر لنفس القاعة في هذا التاريخ");return}
    b.status=st;DBlog(P().name,"حدّث حالة الحجز "+id+" إلى «"+BK[st][0]+"»");save();refresh();
    toast(st==="wait"?"تم قبول الطلب، بانتظار عربون العميل":st==="ok"?"تم تأكيد العربون والحجز":st==="no"?"تم رفض الطلب":"تم تحديث الحجز");
  }
  function bkDrawer(id){
    var b=DB.bookings.find(function(x){return x.id===id});if(!b)return;
    var v=vById(b.vid),dep=Math.round(b.amount*((v&&v.depositPct)||20)/100);
    var acts=bkRowActs(b).replace(/class="mini /g,'class="mini ');
    if(b.status!=="no"&&b.status!=="cancel"&&b.status!=="done")acts+='<button class="mini dng" data-bk="'+b.id+'" data-st="cancel">إلغاء الحجز</button>';
    var d=UI.drawer('<h3>'+b.id+'</h3><div>'+badge(BK,b.status)+'</div>'+
      '<div class="kv"><div><span>العميل</span><b>'+esc(b.customer)+'</b></div><div><span>الجوال</span><b dir="ltr">'+esc(b.phone||"—")+'</b></div><div><span>القاعة</span><b>'+esc(vname(b.vid))+'</b></div>'+
      '<div><span>تاريخ المناسبة</span><b>'+dateAr(b.date)+'</b></div><div><span>عدد الضيوف</span><b>'+b.guests+'</b></div><div><span>الباقة</span><b>'+b.pkg+'</b></div>'+
      '<div><span>قيمة الحجز</span><b>'+money(b.amount)+'</b></div><div><span>العربون</span><b>'+money(dep)+'</b></div><div><span>تاريخ الطلب</span><b>'+dateAr(b.created)+'</b></div></div>'+
      '<div class="fg1"><label>ملاحظة داخلية</label><textarea id="bkNote" rows="3">'+esc(b.note||"")+'</textarea></div>'+
      '<div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini gold" id="bkNoteSave">حفظ الملاحظة</button>'+acts+(b.phone?'<a class="mini" href="tel:'+esc(b.phone)+'">اتصال</a>':'')+'</div>');
    d.querySelector("#bkNoteSave").onclick=function(){b.note=d.querySelector("#bkNote").value;save();toast("تم حفظ الملاحظة")};
  }
  function manualBooking(){
    var vs=myV().filter(function(v){return v.status==="approved"});
    if(!vs.length){toast("أضف قاعة منشورة أولًا");return}
    UI.dialog({title:"حجز يدوي",body:'<div class="fgrid"><div class="fg1"><label>اسم العميل</label><input id="mbC"></div><div class="fg1"><label>الجوال</label><input id="mbP" dir="ltr" style="text-align:start" placeholder="05xxxxxxxx"></div>'+
      '<div class="fg1"><label>القاعة</label><select id="mbV">'+vs.map(function(v){return '<option value="'+v.id+'">'+esc(v.n)+'</option>'}).join("")+'</select></div><div class="fg1"><label>التاريخ</label><input type="date" id="mbD" min="'+today+'"></div>'+
      '<div class="fg1"><label>عدد الضيوف</label><input type="number" id="mbG" value="150" min="10"></div><div class="fg1"><label>الباقة</label><select id="mbK"><option>القاعة فقط</option><option>الباقة الذهبية</option><option>الباقة الملكية</option></select></div>'+
      '<div class="fg1 full"><label>قيمة الحجز (ر.س)</label><input type="number" id="mbA" value="20000" min="0"></div></div><p class="hint" id="mbE" style="color:#a03c2e"></p>',
      foot:[{label:"إلغاء"},{label:"حفظ الحجز",cls:"ok",fn:function(d){
        var c=d.querySelector("#mbC").value.trim(),dt=d.querySelector("#mbD").value,vid=+d.querySelector("#mbV").value,g=+d.querySelector("#mbG").value;
        if(!c||!dt||!(g>0)){d.querySelector("#mbE").textContent="أكمل الاسم والتاريخ وعدد الضيوف";return false}
        var tmp={id:"tmp",vid:vid,date:dt};if(conflict(tmp)){d.querySelector("#mbE").textContent="التاريخ غير متاح لهذه القاعة";return false}
        var nid="B-"+(1001+DB.bookings.length+Math.floor(Math.random()*50));
        DB.bookings.push({id:nid,vid:vid,pid:PID,customer:c,phone:d.querySelector("#mbP").value.trim(),date:dt,guests:g,pkg:d.querySelector("#mbK").value,amount:+d.querySelector("#mbA").value||0,status:"ok",created:today,note:"حجز يدوي"});
        DBlog(P().name,"أضاف حجزًا يدويًا "+nid);save();refresh();toast("تمت إضافة الحجز");return true}}]});
  }

  // ===== التقويم =====
  function renderCal(){
    var sel=document.getElementById("calV"),cur=sel.value,vs=myV().filter(function(v){return v.status==="approved"||v.status==="hidden"});
    sel.innerHTML=vs.map(function(v){return '<option value="'+v.id+'">'+esc(v.n)+'</option>'}).join("");if(cur&&vs.some(function(v){return String(v.id)===cur}))sel.value=cur;
    var vid=+sel.value;document.getElementById("cTitle").textContent=UI.MON[calM]+" "+calY;
    if(!vid){document.getElementById("calG").innerHTML='<div class="empty-s" style="grid-column:1/-1">لا توجد قاعات منشورة لعرض تقويمها</div>';return}
    var first=new Date(calY,calM,1).getDay(),dim=new Date(calY,calM+1,0).getDate(),bl=DB.blocked[vid]||[];
    var h=["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"].map(function(d){return '<div class="wd">'+d+'</div>'}).join("")+new Array(first+1).join('<div class="d off"></div>');
    for(var d=1;d<=dim;d++){
      var k=calY+"-"+UI.pad2(calM+1)+"-"+UI.pad2(d),b=DB.bookings.find(function(x){return x.vid===vid&&x.date===k&&(x.status==="ok"||x.status==="wait"||x.status==="new"||x.status==="done")}),c="d free",x="";
      if(b){c=(b.status==="ok"||b.status==="done")?"d bk":"d hd";x='<small>'+esc(b.customer.split(" ")[0])+'</small>'}else if(bl.indexOf(k)>-1){c="d bl";x="<small>محظور</small>"}
      h+='<div class="'+c+(k===today?" today":"")+'" data-k="'+k+'"'+(b?' data-b="'+b.id+'"':"")+'><b>'+d+'</b>'+x+'</div>';
    }
    document.getElementById("calG").innerHTML=h;
  }

  // ===== المدفوعات =====
  function payData(){
    DB.withdrawals=DB.withdrawals||[];
    var rows=[],cm=DB.settings.commission||5;
    myB().forEach(function(b){
      if(b.status!=="ok"&&b.status!=="done")return;
      var v=vById(b.vid),dep=Math.round(b.amount*((v&&v.depositPct)||20)/100);
      rows.push({d:b.created,t:"عربون — "+b.id+" "+b.customer,a:dep});
      rows.push({d:b.created,t:"عمولة المنصة ("+cm+"%)",a:-Math.round(dep*cm/100)});
    });
    DB.withdrawals.filter(function(w){return w.pid===PID}).forEach(function(w){rows.push({d:w.date,t:"طلب سحب",a:-w.amount})});
    rows.sort(function(a,b){return a.d<b.d?1:-1});
    var bal=rows.reduce(function(a,r){return a+r.a},0),wdn=DB.withdrawals.filter(function(w){return w.pid===PID}).reduce(function(a,w){return a+w.amount},0);
    var upc=myB().filter(function(b){return b.status==="ok"&&b.date>=today}).reduce(function(a,b){var v=vById(b.vid);return a+b.amount-Math.round(b.amount*((v&&v.depositPct)||20)/100)},0);
    return {rows:rows,bal:bal,wdn:wdn,upc:upc};
  }
  function renderPay(){
    var p=payData();
    document.getElementById("kPay").innerHTML='<div class="kpi"><span>الرصيد المتاح للسحب</span><b>'+fmt(Math.max(0,p.bal))+'</b><small class="mut">ر.س</small></div>'+
      '<div class="kpi"><span>دفعات متبقية على الحجوزات القادمة</span><b>'+fmt(p.upc)+'</b><small class="mut">ر.س</small></div><div class="kpi"><span>إجمالي المسحوب</span><b>'+fmt(p.wdn)+'</b><small class="mut">ر.س</small></div>';
    document.getElementById("tPay").innerHTML='<tr><th>التاريخ</th><th>البيان</th><th>المبلغ (ر.س)</th></tr>'+(p.rows.length?p.rows.slice(0,40).map(function(r){return '<tr><td>'+dateAr(r.d)+'</td><td>'+esc(r.t)+'</td><td class="'+(r.a>=0?"up":"dn")+'"><b>'+(r.a>=0?"+":"−")+fmt(Math.abs(r.a))+'</b></td></tr>'}).join(""):'<tr><td colspan="3"><div class="empty-s">لا توجد معاملات بعد</div></td></tr>');
  }

  // ===== التقييمات =====
  function renderReviews(){
    var sel=document.getElementById("rvV"),cur=sel.value;
    sel.innerHTML='<option value="0">كل القاعات</option>'+myV().map(function(v){return '<option value="'+v.id+'">'+esc(v.n)+'</option>'}).join("");sel.value=cur||"0";
    var ids=myV().map(function(v){return v.id}),vid=+sel.value||0;
    var list=DB.reviews.filter(function(r){return ids.indexOf(r.vid)>-1&&r.status==="shown"&&(!vid||r.vid===vid)}).sort(function(a,b){return a.date<b.date?1:-1});
    document.getElementById("rvl").innerHTML=list.length?list.map(function(r){
      return '<div class="rv-i" data-rid="'+r.id+'"><div class="tp"><b>'+esc(r.name)+'</b><span class="rate">'+"★".repeat(r.stars)+"☆".repeat(5-r.stars)+'</span><span class="mut" style="font-size:.8rem">'+esc(vname(r.vid))+' · '+dateAr(r.date)+'</span></div><p>'+esc(r.text)+'</p>'+
        (r.reply?'<div class="rp"><b>ردّك:</b> '+esc(r.reply)+'</div>':'<div style="margin-top:8px"><button class="mini" data-rep="'+r.id+'">الرد على التقييم</button></div>')+'</div>'}).join(""):'<div class="empty-s">لا توجد تقييمات</div>';
    var cnt=[5,4,3,2,1].map(function(s){return [s+" ★",list.filter(function(r){return r.stars===s}).length]});
    document.getElementById("rvb").innerHTML=UI.barsHtml(cnt,Math.max(1,list.length));
  }

  // ===== الإعدادات =====
  function renderSettings(){
    var p=P(),c=document.getElementById("pCity");
    c.innerHTML=CITIES.map(function(x){return '<option'+(p.city===x?" selected":"")+'>'+x+'</option>'}).join("");
    ["Name:name","Owner:owner","Phone:phone","Email:email","Cr:cr"].forEach(function(k){var a=k.split(":");document.getElementById("p"+a[0]).value=p[a[1]]||""});
    p.notif=p.notif||{bk:true,rem:true,rv:true,news:false};
    var rows=[["bk","طلبات الحجز الجديدة","إشعار عند وصول طلب جديد"],["rem","تذكير قبل المناسبة","تذكير قبل 3 أيام من كل حجز مؤكد"],["rv","التقييمات الجديدة","إشعار عند تقييم أحد قاعاتك"],["news","النشرة البريدية","أخبار المنصة وعروضها"]];
    document.getElementById("setl").innerHTML=rows.map(function(r){return '<div><span>'+r[1]+'<small>'+r[2]+'</small></span><button class="tg '+(p.notif[r[0]]?"on":"")+'" data-nt="'+r[0]+'" aria-label="تبديل"></button></div>'}).join("")+
      '<div><span>الحساب</span><button class="mini" data-logout>تسجيل الخروج</button></div>';
  }

  // ===== ربط الأحداث =====
  function bind(){
    document.addEventListener("click",function(e){
      var t=e.target,q=function(s){return t.closest(s)},x;
      if((x=q("[data-edit]"))){openEditor(+x.dataset.edit);return}
      if((x=q("[data-vf]"))){vf=x.dataset.vf;renderVenues();return}
      if((x=q("[data-bf]"))){bf=x.dataset.bf;renderBookings();return}
      if((x=q("[data-hide]"))){var v=vById(+x.dataset.hide);UI.confirm("سيُخفى «"+esc(v.n)+"» من الموقع العام حتى تُظهره مجددًا.",function(){v.status="hidden";DBlog(P().name,"أخفى «"+v.n+"»");save();refresh();toast("تم إخفاء القاعة")},{title:"إخفاء القاعة",yes:"إخفاء"});return}
      if((x=q("[data-show]"))){var v2=vById(+x.dataset.show);v2.status="approved";DBlog(P().name,"أظهر «"+v2.n+"»");save();refresh();toast("القاعة ظاهرة الآن في الموقع");return}
      if((x=q("[data-dup]"))){var s=vById(+x.dataset.dup),c=JSON.parse(JSON.stringify(s));c.id=DBnextId();c.n=s.n+" (نسخة)";c.status="draft";c.r=0;c.rv=0;c.featured=false;c.created=today;DB.venues.push(c);DBlog(P().name,"نسخ «"+s.n+"»");save();refresh();toast("تم إنشاء نسخة كمسودة");return}
      if((x=q("[data-del]"))){var d=vById(+x.dataset.del),act=DB.bookings.filter(function(b){return b.vid===d.id&&(b.status==="new"||b.status==="wait"||b.status==="ok")&&b.date>=today}).length;
        if(act){toast("لا يمكن حذف قاعة لها "+act+" حجوزات قادمة");return}
        UI.confirm("سيُحذف «"+esc(d.n||"قاعة بلا اسم")+"» نهائيًا مع بياناتها وصورها.",function(){DB.venues=DB.venues.filter(function(v){return v.id!==d.id});DBlog(P().name,"حذف «"+d.n+"»");save();refresh();toast("تم حذف القاعة")},{title:"حذف القاعة",yes:"حذف",danger:true});return}
      if(q("#vAdd2")){openEditor(null);return}
      if((x=q("[data-bk]"))){UI.closeDrawer();setBk(x.dataset.bk,x.dataset.st);return}
      if((x=q("[data-bkrow]"))){bkDrawer(x.dataset.bkrow);return}
      if((x=q("#calG .d[data-k]"))){
        var vid=+document.getElementById("calV").value,k=x.dataset.k;
        if(x.dataset.b){bkDrawer(x.dataset.b);return}
        DB.blocked[vid]=DB.blocked[vid]||[];var i=DB.blocked[vid].indexOf(k);
        if(i>-1){DB.blocked[vid].splice(i,1);toast("أُعيد فتح "+k)}else{if(k<today){toast("لا يمكن حظر تاريخ سابق");return}DB.blocked[vid].push(k);toast("تم حظر "+k)}
        save();renderCal();return}
      if((x=q("[data-rep]"))){var r=DB.reviews.find(function(r){return r.id===+x.dataset.rep});
        UI.dialog({title:"الرد على التقييم",body:'<p class="hint">'+esc(r.text)+'</p><div class="fg1"><label>ردّك</label><textarea id="repT" rows="4" maxlength="300"></textarea></div>',foot:[{label:"إلغاء"},{label:"نشر الرد",cls:"ok",fn:function(d){var v=d.querySelector("#repT").value.trim();if(!v)return false;r.reply=v;save();renderReviews();renderOverview();toast("تم نشر الرد");return true}}]});return}
      if((x=q("[data-nt]"))){var p=P();p.notif[x.dataset.nt]=!p.notif[x.dataset.nt];x.classList.toggle("on");save();return}
      if(q("#rstDb")){UI.confirm("ستعود كل البيانات التجريبية (قاعات، حجوزات، صور مرفوعة) إلى وضعها الأصلي.",DBreset,{title:"إعادة ضبط",yes:"إعادة ضبط",danger:true});return}
      // محرر
      if((x=q("[data-et]"))){edTab=x.dataset.et;renderEditor();return}
      if((x=q("[data-pd]"))){E.photos.splice(+x.dataset.pd,1);if(E.cover>=E.photos.length)E.cover=0;renderEditor();return}
      if((x=q("[data-pc]"))){E.cover=+x.dataset.pc;renderEditor();return}
      if((x=q("[data-pm]"))){var i2=+x.dataset.pm,j=i2+(+x.dataset.d);if(j<0||j>=E.photos.length)return;var tmp=E.photos[i2];E.photos[i2]=E.photos[j];E.photos[j]=tmp;if(E.cover===i2)E.cover=j;else if(E.cover===j)E.cover=i2;renderEditor();return}
      if(q("#upZ")){document.getElementById("upF").click();return}
      if(q("#ftAdd")){var inp=document.getElementById("ftNew"),val=inp.value.trim();if(val&&E.features.indexOf(val)<0){E.features.push(val)}renderEditor();return}
      if(q("#pkAdd")){E.pkgs.push({n:"",g:150,chairs:true,sec:SEC_TYPES[0],from:today,to:addIso(365),svc:[]});renderEditor();return}
      if((x=q("[data-pkdel]"))){E.pkgs.splice(+x.dataset.pkdel,1);renderEditor();return}
      if((x=q("[data-tgd]"))){E.pkgs[+x.dataset.tgd].svc.splice(+x.dataset.k,1);renderEditor();return}
      if(q("#polAdd")){if(E.policy.length<5)E.policy.push({d:7,p:25});renderEditor();return}
      if((x=q("[data-poldel]"))){E.policy.splice(+x.dataset.poldel,1);renderEditor();return}
    });
    document.addEventListener("input",function(e){
      var t=e.target;
      if(t.matches("[data-f]")&&E){var f=t.dataset.f;E[f]=t.type==="checkbox"?t.checked:(t.type==="number"?+t.value:t.value);updMeter();if(f==="desc"){var c=document.getElementById("descCnt");if(c)c.textContent=t.value.length+" / 900 حرفًا — اكتب 40 حرفًا على الأقل"}}
      else if(t.matches("[data-ft]")&&E){var ft=t.dataset.ft,i=E.features.indexOf(ft);if(t.checked&&i<0)E.features.push(ft);if(!t.checked&&i>-1)E.features.splice(i,1);updMeter()}
      else if(t.matches("[data-pf]")&&E){var pk=E.pkgs[+t.closest("[data-pk]").dataset.pk],k=t.dataset.pf;pk[k]=k==="g"?+t.value:(k==="chairs"?t.value==="1":t.value);updMeter()}
      else if(t.matches("[data-pl]")&&E){var po=E.policy[+t.closest("[data-pol]").dataset.pol];po[t.dataset.pl]=+t.value}
    });
    document.addEventListener("change",function(e){
      var t=e.target;
      if(t.id==="upF"&&E){addFiles(t.files);t.value=""}
      else if(t.matches("#bkV,#bkFrom,#bkTo")){renderBookings()}
      else if(t.id==="calV"){renderCal()}
      else if(t.id==="rvV"){renderReviews()}
      else if(t.id==="swP"){try{localStorage.setItem("gaiah_pid",t.value)}catch(er){}location.reload()}
    });
    document.getElementById("bkQ").addEventListener("input",renderBookings);
    document.addEventListener("keydown",function(e){
      if(e.key==="Enter"&&e.target.closest(".tagin")&&E){e.preventDefault();var v=e.target.value.trim();if(v){E.pkgs[+e.target.closest(".tagin").dataset.tg].svc.push(v);renderEditor()}}
      if(e.key==="Enter"&&e.target.id==="ftNew"){e.preventDefault();document.getElementById("ftAdd").click()}
    });
    // سحب وإفلات الصور
    document.addEventListener("dragover",function(e){var z=e.target.closest("#upZ");if(z){e.preventDefault();z.classList.add("drag")}});
    document.addEventListener("dragleave",function(e){var z=e.target.closest("#upZ");if(z)z.classList.remove("drag")});
    document.addEventListener("drop",function(e){var z=e.target.closest("#upZ");if(z&&E){e.preventDefault();z.classList.remove("drag");addFiles(e.dataTransfer.files)}});
    document.getElementById("addBtn").onclick=function(){openEditor(null)};
    document.getElementById("edBack").onclick=function(){if(E&&JSON.stringify(E)!==JSON.stringify(vById(E.id)||{})&&!E._saved){UI.confirm("لديك تغييرات غير محفوظة. هل تريد المغادرة؟",function(){E=null;go("vn")},{title:"تغييرات غير محفوظة",yes:"مغادرة",danger:true})}else{E=null;go("vn")}};
    document.getElementById("edSubmit").onclick=function(){edSave("submit")};
    document.getElementById("edDraft").onclick=function(){edSave("draft")};
    document.getElementById("bkAdd").onclick=manualBooking;
    document.getElementById("bell").onclick=function(){bf="new";go("bk");renderBookings()};
    document.getElementById("bkCsv").onclick=function(){var rows=[["رقم الحجز","العميل","الجوال","القاعة","التاريخ","الضيوف","الباقة","القيمة","الحالة"]];bkFiltered().forEach(function(b){rows.push([b.id,b.customer,b.phone,vname(b.vid),b.date,b.guests,b.pkg,b.amount,BK[b.status][0]])});UI.csv("bookings.csv",rows);toast("تم تصدير الحجوزات")};
    document.getElementById("cPrev").onclick=function(){calM--;if(calM<0){calM=11;calY--}renderCal()};
    document.getElementById("cNext").onclick=function(){calM++;if(calM>11){calM=0;calY++}renderCal()};
    document.getElementById("wd").onclick=function(){
      var p=payData(),max=Math.max(0,p.bal);if(max<=0){toast("لا يوجد رصيد متاح للسحب");return}
      UI.dialog({title:"طلب سحب",body:'<p class="hint">الرصيد المتاح: '+money(max)+'</p><div class="fg1"><label>المبلغ (ر.س)</label><input type="number" id="wdA" min="1" max="'+max+'" value="'+max+'"></div><p class="hint" id="wdE" style="color:#a03c2e"></p>',
        foot:[{label:"إلغاء"},{label:"إرسال الطلب",cls:"ok",fn:function(d){var a=+d.querySelector("#wdA").value;if(!(a>0)||a>max){d.querySelector("#wdE").textContent="أدخل مبلغًا صحيحًا لا يتجاوز الرصيد";return false}
          DB.withdrawals.push({id:"W"+Date.now(),pid:PID,date:today,amount:a,status:"pending"});DBlog(P().name,"طلب سحب "+fmt(a)+" ر.س");save();renderPay();toast("تم إرسال طلب السحب");return true}}]});
    };
    document.getElementById("pf").onsubmit=function(e){e.preventDefault();var p=P();p.name=document.getElementById("pName").value.trim()||p.name;p.owner=document.getElementById("pOwner").value;p.phone=document.getElementById("pPhone").value;p.email=document.getElementById("pEmail").value;p.city=document.getElementById("pCity").value;p.cr=document.getElementById("pCr").value;save();refresh();toast("تم حفظ بيانات المنشأة")};
  }
  function addFiles(files){
    var room=12-(E.photos||[]).length,arr=[].slice.call(files).filter(function(f){return /^image\//.test(f.type)}).slice(0,Math.max(0,room));
    if(!arr.length){toast(room<=0?"وصلت إلى الحد الأقصى (12 صورة)":"اختر ملفات صور فقط");return}
    toast("جارٍ رفع "+arr.length+" صورة…");
    Promise.all(arr.map(function(f){return UI.compress(f)})).then(function(res){E.photos=(E.photos||[]).concat(res);renderEditor();toast("تمت إضافة "+res.length+" صورة")}).catch(function(){toast("تعذّر قراءة بعض الصور")});
  }

  go=UI.nav(TITLES);
  window.__refresh=refresh;
  bind();refresh();
})();