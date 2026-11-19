// تحديد اللغة والاتجاه قبل أي عرض (يُحمَّل في <head>)
(function(){
  var l=null;
  try{l=new URLSearchParams(location.search).get("lang")}catch(e){}
  try{if(l==="en"||l==="ar")localStorage.setItem("gl",l);else l=localStorage.getItem("gl")}catch(e){}
  l=(l==="en")?"en":"ar";
  window.LANG=l;
  var h=document.documentElement;
  h.lang=l;h.dir=l==="en"?"ltr":"rtl";
  h.classList.add("l-"+l);
})();
