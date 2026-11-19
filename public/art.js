// مشاهد قاعات تجريبية بألوان الهوية (SVG) — تُستبدل بصور حقيقية لاحقًا
const PALS = [
  ["#17171a","#5c6b78","#d9b99b"],["#0e0e0e","#8f6e3c","#f6f3ea"],["#1d2024","#8a9a8b","#ece7da"],
  ["#1b1b1f","#b8935a","#f6f3ea"],["#2c3138","#5c6b78","#f6f3ea"],["#14110d","#b8935a","#d9b99b"]
];
function rnd(seed){let x=seed*9301+49297;return()=>{x=(x*9301+49297)%233280;return x/233280}}
const _f=n=>+n.toFixed(1);

function art(seed,w=400,h=300){
  const R=rnd(seed),p=PALS[seed%PALS.length],id="a"+seed+"_"+Math.floor(R()*1e6),cx=w/2;
  const defs=`<defs>
   <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset=".7" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[0]}"/></linearGradient>
   <radialGradient id="${id}g" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="${p[2]}" stop-opacity=".55"/><stop offset="1" stop-color="${p[2]}" stop-opacity="0"/></radialGradient>
   <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[2]}" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
   <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[2]}" stop-opacity=".5"/><stop offset="1" stop-color="${p[2]}" stop-opacity="0"/></linearGradient></defs>`;
  let b=`<rect width="${w}" height="${h}" fill="url(#${id}b)"/><rect width="${w}" height="${h}" fill="url(#${id}g)"/>`;
  const sc=seed%4;
  if(sc===0){ // قاعة احتفالات بثريا وطاولات
    const cy=h*.3,rx=w*.11;
    b+=`<line x1="${cx}" y1="0" x2="${cx}" y2="${_f(cy-8)}" stroke="${p[2]}" stroke-opacity=".6"/>`;
    for(let k=0;k<3;k++)b+=`<ellipse cx="${cx}" cy="${_f(cy+k*10)}" rx="${_f(rx*(1-k*.22))}" ry="${_f(h*.03*(1-k*.2))}" fill="none" stroke="${p[2]}" stroke-width="1.4" stroke-opacity=".85"/>`;
    for(let k=-9;k<=9;k++){const x=cx+k*rx/9.5,l=h*(.05+R()*.06);b+=`<line x1="${_f(x)}" y1="${_f(cy)}" x2="${_f(x)}" y2="${_f(cy+l)}" stroke="${p[2]}" stroke-opacity=".6"/><circle cx="${_f(x)}" cy="${_f(cy+l)}" r="${(1.2+R()*1.3).toFixed(1)}" fill="#fff" opacity=".9"/>`}
    b+=`<circle cx="${cx}" cy="${cy}" r="${w*.3}" fill="url(#${id}g)"/>`;
    [-.34,-.17,0,.17,.34].forEach((o,i)=>{const x=cx+o*w,y=h*(i%2?.8:.72),rr=w*.05;
      b+=`<ellipse cx="${_f(x)}" cy="${_f(y+h*.07)}" rx="${_f(rr*1.2)}" ry="${_f(h*.012)}" fill="#000" opacity=".35"/><rect x="${_f(x-1.5)}" y="${_f(y)}" width="3" height="${_f(h*.07)}" fill="${p[2]}" opacity=".5"/><ellipse cx="${_f(x)}" cy="${_f(y)}" rx="${_f(rr)}" ry="${_f(h*.022)}" fill="${p[2]}" opacity=".9"/><circle cx="${_f(x)}" cy="${_f(y-h*.02)}" r="1.8" fill="#fff"/>`});
    b+=`<path d="M0 0 Q${w*.12} ${h*.45} 0 ${h}Z" fill="#000" opacity=".28"/><path d="M${w} 0 Q${w*.88} ${h*.45} ${w} ${h}Z" fill="#000" opacity=".28"/>`;
  } else if(sc===1){ // قوس وورد (لوتس)
    b+=`<path d="M${w*.2} ${h}V${h*.42}Q${w*.2} ${h*.14} ${cx} ${h*.14}Q${w*.8} ${h*.14} ${w*.8} ${h*.42}V${h}" fill="none" stroke="${p[2]}" stroke-opacity=".6" stroke-width="2"/><path d="M${w*.28} ${h}V${h*.46}Q${w*.28} ${h*.24} ${cx} ${h*.24}Q${w*.72} ${h*.24} ${w*.72} ${h*.46}V${h}" fill="#000" fill-opacity=".28" stroke="${p[2]}" stroke-opacity=".35"/>`;
    for(let i=0;i<22;i++){const t=i/21,a=Math.PI*(1-t),x=cx+Math.cos(a)*w*.3,y=h*.46-Math.sin(a)*h*.26;b+=`<circle cx="${_f(x)}" cy="${_f(y)}" r="${(3+R()*4).toFixed(1)}" fill="${p[2]}" opacity="${(.5+R()*.4).toFixed(2)}"/>`}
    const base=h*.88;b+=[-62,-34,0,34,62].map(a=>`<ellipse cx="${cx}" cy="${_f(base-26)}" rx="13" ry="34" transform="rotate(${a} ${cx} ${_f(base)})" fill="${p[2]}" opacity=".88"/>`).join("");
  } else if(sc===2){ // حديقة ليلية وإضاءة معلّقة
    b+=`<circle cx="${w*(.25+R()*.5)}" cy="${h*.2}" r="${w*.05}" fill="${p[2]}" opacity=".9"/>`;
    for(let i=0;i<30;i++)b+=`<circle cx="${_f(R()*w)}" cy="${_f(R()*h*.5)}" r="${(R()*1.2+.3).toFixed(1)}" fill="#fff" opacity="${(R()*.7+.2).toFixed(2)}"/>`;
    [[.08,1],[.92,-1]].forEach(([o,s])=>{const x=w*o,t=h*.55;b+=`<path d="M${_f(x)} ${h} Q${_f(x+s*10)} ${_f(h*.7)} ${_f(x-s*6)} ${_f(t)}" stroke="#000" stroke-opacity=".6" stroke-width="5" fill="none"/>`;
      for(let k=0;k<7;k++){const a=-Math.PI*(.15+k*.14)*s,ex=x-s*6+Math.cos(a)*w*.16*s*s,ey=t+Math.sin(a)*h*.2;b+=`<path d="M${_f(x-s*6)} ${_f(t)} Q${_f(x-s*6+(ex-x)*.5)} ${_f(t-h*.08)} ${_f(ex)} ${_f(ey+h*.08)}" stroke="#000" stroke-opacity=".6" stroke-width="3" fill="none"/>`}});
    for(let r=0;r<2;r++){const y0=h*(.28+r*.1);let d=`M0 ${y0}`;for(let k=1;k<=8;k++)d+=` Q${_f(w*(k-.5)/8)} ${_f(y0+h*.07)} ${_f(w*k/8)} ${_f(y0)}`;b+=`<path d="${d}" fill="none" stroke="${p[2]}" stroke-opacity=".45"/>`;
      for(let k=0;k<16;k++){const x=w*(k+.5)/16,yy=y0+h*.035;b+=`<circle cx="${_f(x)}" cy="${_f(yy)}" r="2.2" fill="#fff" opacity=".95"/><circle cx="${_f(x)}" cy="${_f(yy)}" r="7" fill="${p[2]}" opacity=".25"/>`}}
    b+=`<rect y="${h*.72}" width="${w}" height="${h*.28}" fill="url(#${id}f)"/><ellipse cx="${cx}" cy="${h*.84}" rx="${w*.3}" ry="${h*.05}" fill="${p[2]}" opacity=".18"/>`;
  } else { // مسرح بستائر وكشافات
    b+=`<polygon points="${cx-8},0 ${cx+8},0 ${w*.78},${h*.82} ${w*.22},${h*.82}" fill="url(#${id}s)" opacity=".5"/><polygon points="${w*.3},0 ${w*.34},0 ${w*.62},${h*.82} ${w*.45},${h*.82}" fill="url(#${id}s)" opacity=".28"/>`;
    b+=`<rect x="${w*.2}" y="${h*.18}" width="${w*.6}" height="${h*.62}" fill="#000" opacity=".3"/><rect x="${w*.2}" y="${h*.18}" width="${w*.6}" height="${h*.62}" fill="none" stroke="${p[2]}" stroke-opacity=".7" stroke-width="2"/>`;
    for(let k=0;k<6;k++){const x=w*.2+k*(w*.6)/5;b+=`<line x1="${_f(x)}" y1="${h*.18}" x2="${_f(x)}" y2="${h*.8}" stroke="${p[2]}" stroke-opacity=".12"/>`}
    [[0,1],[w,-1]].forEach(([x0,s])=>{let d=`M${x0} 0`;for(let k=0;k<=6;k++)d+=` L${_f(x0+s*(w*.22)*(1-k*.04))} ${_f(h*(.1+k*.14))}`;d+=` L${x0} ${h}Z`;b+=`<path d="${d}" fill="${p[0]}" opacity=".85"/><path d="${d}" fill="none" stroke="${p[2]}" stroke-opacity=".3"/>`;
      for(let k=1;k<5;k++)b+=`<line x1="${_f(x0+s*w*.04*k)}" y1="0" x2="${_f(x0+s*w*.035*k)}" y2="${h}" stroke="${p[2]}" stroke-opacity=".16"/>`});
    b+=`<polygon points="${w*.34},${h*.8} ${w*.66},${h*.8} ${w*.78},${h} ${w*.22},${h}" fill="${p[2]}" opacity=".35"/><rect y="${h*.8}" width="${w}" height="${h*.2}" fill="url(#${id}f)"/>`;
    for(let k=0;k<7;k++)b+=`<circle cx="${_f(w*(.26+k*.08))}" cy="${_f(h*.9)}" r="2" fill="#fff" opacity=".8"/>`;
  }
  b+=`<rect width="${w}" height="${h}" fill="#000" opacity=".12"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${defs}${b}</svg>`;
}
