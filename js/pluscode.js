// pluscode.js — Plus code (Open Location Code): เข้ารหัส/ถอดรหัส/กู้คืนรหัสแบบสั้น ในตัวแอปเอง ไม่ต้องใช้เซิร์ฟเวอร์ (ฟังก์ชันล้วน ทดสอบด้วย node)
// รูปแบบที่ Google Maps แสดง: เต็ม "8FVC9G8F+6W" · สั้น "QG83+VC" (ตัด 4 ตัวแรก ต้องมีชื่อเมืองต่อท้าย เช่น "QG83+VC กรุงเทพ" เพื่อรู้ว่าอยู่แถบไหน)
const PC_ALPHA='23456789CFGHJMPQRVWX',PC_PAIRS=[20,1,.05,.0025,.000125],PC_GRID=.000125;
const PC_TOKEN=/(?:^|[\s,;(])([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{0,7})(?=$|[\s,;)])/i;
function pcClipLat(x){return Math.min(90,Math.max(-90,x))}
function pcNormLng(x){while(x<-180)x+=360;while(x>=180)x-=360;return x}
function pcPrecision(len){return len<=10?Math.pow(20,Math.floor(len/-2+2)):Math.pow(20,-3)/Math.pow(5,len-10)}
function pcValid(code){
  if(typeof code!=='string'||!code)return false;
  const c=code.toUpperCase(),sep=c.indexOf('+');
  if(sep<0||sep!==c.lastIndexOf('+')||sep>8||sep%2===1)return false;
  if(c.length===1)return false;
  const pad=c.indexOf('0');
  if(pad>=0){if(sep<8)return false;if(c.slice(pad).replace(/0/g,'').replace('+','')!=='')return false;if(c.slice(pad,sep).length%2===1)return false;if(c.length>sep+1)return false}
  if(pad<0){const after=c.length-sep-1;if(after===1||(after===0&&sep<8))return false}   // หลัง + ต้องมี 2 ตัวขึ้นไป (รหัสเต็ม 8 หลักไม่มีตัวหลัง + ได้)
  for(const ch of c.replace('+','').replace(/0/g,''))if(PC_ALPHA.indexOf(ch)<0)return false;
  if(sep===8){const f=PC_ALPHA.indexOf(c[0]);if(f>8)return false;if(c.length>1&&PC_ALPHA.indexOf(c[1])>17)return false}
  return true}
function pcIsShort(code){return pcValid(code)&&code.toUpperCase().indexOf('+')<8}
function pcIsFull(code){return pcValid(code)&&code.toUpperCase().indexOf('+')===8}
function pcEncode(lat,lng,len){
  len=len||10;if(len<2||(len<10&&len%2===1))len=10;len=Math.min(len,15);
  lat=pcClipLat(lat);lng=pcNormLng(lng);if(lat===90)lat-=pcPrecision(len);
  let latV=Math.floor(Math.round((lat+90)*25000000*1e6)/1e6),lngV=Math.floor(Math.round((lng+180)*8192000*1e6)/1e6),code='';
  if(len>10){for(let i=0;i<5;i++){const ld=latV%5,gd=lngV%4;code=PC_ALPHA[ld*4+gd]+code;latV=Math.floor(latV/5);lngV=Math.floor(lngV/4)}}
  else{latV=Math.floor(latV/3125);lngV=Math.floor(lngV/1024)}
  for(let i=0;i<5;i++){code=PC_ALPHA[lngV%20]+code;code=PC_ALPHA[latV%20]+code;latV=Math.floor(latV/20);lngV=Math.floor(lngV/20)}
  code=code.slice(0,8)+'+'+code.slice(8);
  return len<8?code.slice(0,len)+'0'.repeat(8-len)+'+':code.slice(0,len+1)}
// รหัสเต็ม → ช่องสี่เหลี่ยม + จุดกึ่งกลาง
function pcDecode(code){
  if(!pcIsFull(code))throw new Error('Plus code เต็มต้องมี 8 ตัวอักษรก่อนเครื่องหมาย +');
  const c=code.replace('+','').replace(/0+$/,'').toUpperCase(),pairs=c.slice(0,Math.min(c.length,10));
  const seq=off=>{let i=0,v=0;while(i*2+off<pairs.length){v+=PC_ALPHA.indexOf(pairs[i*2+off])*PC_PAIRS[i];i++}return [v,v+PC_PAIRS[i-1]]};
  const la=seq(0),lo=seq(1);let latLo=la[0]-90,lngLo=lo[0]-180,latHi=la[1]-90,lngHi=lo[1]-180;
  if(c.length>10){let lLo=0,gLo=0,lp=PC_GRID,gp=PC_GRID;for(const ch of c.slice(10)){const ix=PC_ALPHA.indexOf(ch),row=Math.floor(ix/4),col=ix%4;lp/=5;gp/=4;lLo+=row*lp;gLo+=col*gp}
    latHi=latLo+lLo+lp;lngHi=lngLo+gLo+gp;latLo+=lLo;lngLo+=gLo}
  return {latLo,lngLo,latHi,lngHi,lat:(latLo+latHi)/2,lng:(lngLo+lngHi)/2,len:c.length}}
// รหัสสั้น + จุดอ้างอิงใกล้ๆ (เมือง) → พิกัดที่ใกล้จุดอ้างอิงที่สุด
function pcRecover(short,refLat,refLng){
  if(!pcIsShort(short))throw new Error('ไม่ใช่ Plus code แบบสั้น');
  refLat=pcClipLat(refLat);refLng=pcNormLng(refLng);short=short.toUpperCase();
  const pad=8-short.indexOf('+'),res=Math.pow(20,2-pad/2),half=res/2;
  const a=pcDecode(pcEncode(refLat,refLng).slice(0,pad)+short);let cLat=a.lat,cLng=a.lng;
  if(refLat+half<cLat&&cLat-res>=-90)cLat-=res;else if(refLat-half>cLat&&cLat+res<=90)cLat+=res;
  if(refLng+half<cLng)cLng-=res;else if(refLng-half>cLng)cLng+=res;
  return {lat:pcClipLat(cLat),lng:pcNormLng(cLng)}}
// หา Plus code ในข้อความที่ผู้ใช้วาง เช่น "QG83+VC กรุงเทพ" / "8FVC9G8F+6W" / "7P3R+X2, Chiang Mai"
function pcParse(text){
  const s=String(text||'').trim(),m=s.match(PC_TOKEN);if(!m||!pcValid(m[1]))return null;
  const code=m[1].toUpperCase(),locality=s.replace(m[1],' ').replace(/[,;()]+/g,' ').replace(/\s+/g,' ').trim();
  return {code,short:pcIsShort(code),locality}}
if(typeof module!=='undefined')module.exports={pcEncode,pcDecode,pcRecover,pcParse,pcValid,pcIsShort,pcIsFull};
