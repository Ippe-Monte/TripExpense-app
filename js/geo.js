// geo.js — ลิงก์ตำแหน่ง/พิกัด (ฟังก์ชันล้วน ไม่แตะ DOM) ใช้กับ Schedule, แผนที่ และเช็กอิน
function _validLat(v){return typeof v==='number'&&isFinite(v)&&v>=-90&&v<=90}
function _validLng(v){return typeof v==='number'&&isFinite(v)&&v>=-180&&v<=180}
// แกะ {lat,lng} จากลิงก์ Google Maps แบบเต็ม หรือข้อความ "13.9126, 100.6070"; ลิงก์สั้น (maps.app.goo.gl) ไม่มีพิกัด → null
function parseLatLng(text){
  if(text==null)return null;let s=String(text).trim();if(!s)return null;
  try{s=decodeURIComponent(s)}catch(e){}
  const N='(-?\\d{1,3}(?:\\.\\d+)?)';
  const pats=[new RegExp('!3d'+N+'!4d'+N),                                     // หมุดของสถานที่จริง (แม่นกว่า @ ที่เป็นจุดกึ่งกลางหน้าจอ)
              new RegExp('[?&](?:q|query|ll|destination|daddr)='+N+'[,\\s]\\s*'+N),               // (center= ไม่รับ: เป็นกึ่งกลางหน้าจอ)
              new RegExp('@'+N+',\\s*'+N),
              new RegExp('/place/'+N+',\\s*'+N+'(?:[/?#@]|$)'),                         // /maps/place/18.8048,98.9217
              new RegExp('^geo:'+N+','+N,'i'),
              new RegExp('^'+N+'\\s*[,\\s]\\s*'+N+'$')];
  for(const re of pats){const m=s.match(re);if(m){const lat=parseFloat(m[1]),lng=parseFloat(m[2]);if(_validLat(lat)&&_validLng(lng))return {lat,lng}}}
  return null}
// รับเฉพาะ http/https (กัน javascript:, data:) เติม https:// ให้ถ้าพิมพ์มาแค่โดเมนแผนที่
function normalizeMapUrl(u){
  if(u==null)return null;let s=String(u).trim();if(!s||/\s/.test(s)||s.length>2000)return null;
  if(/^(javascript|data|vbscript|file):/i.test(s))return null;
  if(!/^https?:\/\//i.test(s)){if(/^(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.|waze\.com|maps\.apple\.com|map\.longdo\.com)/i.test(s))s='https://'+s;else return null}
  try{const x=new URL(s);return (x.protocol==='https:'||x.protocol==='http:')?x.href:null}catch(e){return null}}
// ลิงก์ที่จะเปิด: ลิงก์ที่บันทึกไว้ → พิกัด → ชื่อสถานที่
function mapsOpenUrl(o){
  o=o||{};const u=normalizeMapUrl(o.location_url);if(u)return u;
  if(_validLat(o.location_lat)&&_validLng(o.location_lng))return 'https://www.google.com/maps/search/?api=1&query='+o.location_lat+','+o.location_lng;
  const name=(o.location_name||'').trim();if(name)return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(name);
  return ''}
function distanceMeters(a,b){const R=6371000,t=x=>x*Math.PI/180,dLat=t(b.lat-a.lat),dLng=t(b.lng-a.lng),h=Math.sin(dLat/2)**2+Math.cos(t(a.lat))*Math.cos(t(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
if(typeof module!=='undefined')module.exports={parseLatLng,normalizeMapUrl,mapsOpenUrl,distanceMeters};
