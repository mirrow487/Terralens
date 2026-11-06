// Sahte .wld kodlayıcı: verilen formata göre dünya yazar + beklenen dizilerin özetini çıkarır.
const fs = require('fs');
const W = +process.argv[2] || 800, H = +process.argv[3] || 300, out = process.argv[4] || 'test.wld';
const version = 279, NIMP = 700;
const important = new Uint8Array(NIMP); [3,4,5,21,28,31,26,12].forEach(t=>important[t]=1);
let seed = 12345; const rnd = () => (seed = (seed*1103515245+12345) & 0x7fffffff) / 0x7fffffff;
const N=W*H, tile=new Uint16Array(N).fill(0xFFFF), wall=new Uint16Array(N), liq=new Uint8Array(N);
const paint=new Uint8Array(N), wpaint=new Uint8Array(N);
const surf = Math.floor(H*0.3);
for (let x=0;x<W;x++){
  const s = surf + Math.round(8*Math.sin(x/37));
  for (let y=s;y<H;y++){
    const i=y*W+x; let t = y===s?2:(y<s+20?0:1);
    if (x>=520&&x<680) t = y===s?60:59;          // jungle
    if (x>=430&&x<480 && y<s+120) t = y===s?23:25; // corruption, jungle'a 40 blok
    if (x>=100&&x<170 && y<s+80) t = y===s?109:117; // hallow
    if (x>=250&&x<300 && y<s+60) t = y===s?199:203; // crimson (ikisi birden testi değil, küçük)
    if (x>=540&&x<560 && y>s+50 && y<s+70) t=661;   // jungle içine sızma
    if (rnd()<0.01) t=[7,8,9,600,661][Math.floor(rnd()*5)];
    tile[i]=t; if (y>s+3) wall[i]= rnd()<0.002? 300 : 2;
    if (rnd()<0.003) paint[i]=5; if (rnd()<0.003) wpaint[i]=3;
  }
  tile[(s-1)*W+x] = rnd()<0.1 ? 3 : 0xFFFF;
  if (x>=W*0.9) tile[(s-1)*W+x]=0xFFFF;          // important (çerçeveli) bitki
  if (x%50===0) { for(let y=s+30;y<s+36;y++){ liq[y*W+x] = 1+(x/50)%4; tile[y*W+x]=0xFFFF; } }
}
// Yeraltında jungle çimi kenarlı küçük çamur yamaları (gerçek dünyalarda olur, Jungle sayılmamalı)
for (let [cx,cy,r] of [[270,0.55,22],[285,0.7,18],[150,0.6,20],[360,0.5,40],[720,0.65,20]]) {
  r=Math.max(4,Math.round(r*H/2400)); const X=Math.round(cx*W/800), Y=Math.round(cy*H);
  for(let y=Y-r;y<=Y+r;y++)for(let x=X-r;x<=X+r;x++){const d=Math.hypot(x-X,y-Y); if(d<=r){const i=y*W+x; tile[i]= d>r-3?60:59;}}
  for(let y=Y-r+6;y<=Y+r-6;y++)for(let x=X-8;x<=X+8;x++)tile[y*W+x]=0xFFFF; // içinde mağara
}
const SPX=Math.round(W*0.5), SPY=surf-1, WS=surf+10, RL=surf+60;
// --- yaz ---
const bytes=[]; const u8=v=>bytes.push(v&255), u16=v=>{u8(v);u8(v>>8)}, i32=v=>{u16(v);u16(v>>>16)};
const str=s=>{const b=Buffer.from(s,'utf8');let n=b.length;while(n>=0x80){u8(n|0x80);n>>>=7}u8(n);for(const c of b)u8(c)};
i32(version); for(const c of 'relogic')u8(c.charCodeAt(0)); u8(2); i32(7); i32(0);i32(0);
u16(11); const ptrAt=bytes.length; for(let i=0;i<11;i++)i32(0);
u16(NIMP); {let b=0,m=1;for(let i=0;i<NIMP;i++){if(important[i])b|=m;m<<=1;if(m===256){u8(b);b=0;m=1}} if(m!==1)u8(b);}
const sec=[]; sec[0]=bytes.length;
str('Deneme Dünyası ğüşİ'); str('5.2.ABCD.seed'); for(let i=0;i<24;i++)u8(i); i32(99); i32(0);i32(W*16);i32(0);i32(H*16); i32(H); i32(W);
// header'ın geri kalanı: okuyucu alan alan okumaz, sadece spawn örüntüsünü arar
i32(1); u8(1);u8(0);u8(0); for(let i=0;i<8;i++)u8(i*7); u8(2); i32(W/3|0);i32(W/2|0);i32(W*2/3|0); for(let i=0;i<7;i++)i32(i);
i32(SPX); i32(SPY); const db=Buffer.alloc(16); db.writeDoubleLE(WS,0); db.writeDoubleLE(RL,8); for(const c of db)u8(c);
for(let i=0;i<40;i++)u8(0xAB);
sec[1]=bytes.length;
const key=i=>[tile[i],wall[i],liq[i],paint[i],wpaint[i]].join(',');
for(let x=0;x<W;x++){ let y=0; while(y<H){ const i=y*W+x; let r=0; while(y+r+1<H && key((y+r+1)*W+x)===key(i) && !(tile[i]!==0xFFFF&&important[tile[i]]&&false)) r++;
  const t=tile[i], w=wall[i], l=liq[i]; let h1=0,h2=0,h3=0;
  if(t!==0xFFFF){h1|=2; if(t>255)h1|=0x20;}
  if(w){h1|=4; if(w>255)h3|=0x40; if(wpaint[i])h3|=0x10;}
  if(paint[i])h3|=8;
  if(l){ h1|= (l===4?1:l)<<3; if(l===4)h3|=0x80; }
  if(r>0) h1|= r>255?0x80:0x40;
  const h4 = (x+y)%97===0; if(h4) h3|=1;
  if(h3) h2|=1; if(h2) h1|=1;
  u8(h1); if(h1&1){u8(h2); if(h2&1){u8(h3); if(h3&1)u8(0)}}
  if(t!==0xFFFF){ if(t>255)u16(t); else u8(t); if(important[t]){u16(18);u16(36)} if(paint[i])u8(paint[i]); }
  if(w){ u8(w&255); if(wpaint[i])u8(wpaint[i]); }
  if(l) u8(255);
  if(w>255) u8(w>>8);
  if(r>255)u16(r); else if(r>0)u8(r);
  y+=r+1; } }
sec[2]=bytes.length; for(let i=0;i<20;i++)u8(0);
for(let i=3;i<11;i++)sec[i]=bytes.length;
const buf=Buffer.from(bytes); sec.forEach((v,k)=>buf.writeInt32LE(v,ptrAt+4*k)); fs.writeFileSync(out,buf);
const fnv=a=>{let h=2166136261;for(let i=0;i<a.length;i++){h^=a[i];h=Math.imul(h,16777619)}return h>>>0};
fs.writeFileSync(out+'.json',JSON.stringify({spawn:[SPX,SPY,WS,RL],W,H,tile:fnv(tile),wall:fnv(wall),liq:fnv(liq),size:buf.length}));
console.log('yazıldı',out,buf.length,'bayt');
