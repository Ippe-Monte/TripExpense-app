// maps.js — ลิงก์ตำแหน่งในแต่ละรายการ Schedule + แท็บแผนที่ (Leaflet โหลดเมื่อเปิดแท็บเท่านั้น)
// ลิงก์ Google Maps แบบสั้น (maps.app.goo.gl) แกะพิกัดในเบราว์เซอร์ไม่ได้ → เปิดนำทางได้ แต่ปักหมุดในแอปต้องมีพิกัด (จากลิงก์เต็ม หรือพิมพ์เอง)
let _leafP=null,schedMapDay=null,_schedMap=null,_pin=null;
function loadLeaflet(){
  if(window.L)return Promise.resolve(window.L);if(_leafP)return _leafP;
  _leafP=new Promise((res,rej)=>{const c=document.createElement('link');c.rel='stylesheet';c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';document.head.appendChild(c);
    const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';s.onload=()=>res(window.L);s.onerror=()=>{_leafP=null;rej(new Error('LEAFLET'))};document.head.appendChild(s)});
  return _leafP}
function makeLeafMap(elId,L){const m=L.map(elId,{zoomControl:true,attributionControl:true});L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(m);return m}
function fitPins(m,L,pts){if(pts.length===1)m.setView(pts[0],15);else m.fitBounds(L.latLngBounds(pts),{padding:[28,28],maxZoom:16});setTimeout(()=>m.invalidateSize(),50)}

// ---------- ช่องกรอกลิงก์ตำแหน่ง (ใช้ทั้งฟอร์มเพิ่มและแก้ไข: prefix 's' หรือ 'es') ----------
// ---------- ลิงก์ Google Maps ที่ไม่มีพิกัดในตัว (ลิงก์สั้น maps.app.goo.gl จากปุ่ม "แชร์"): เบราว์เซอร์อ่านไม่ได้ จึงให้ Edge Function "resolve-map-link" ตามลิงก์ให้ ----------
const _resCache=new Map();let _resOff=false,_resLast=null,_locTimers={},_pcTimers={};
function isGoogleMapsHost(u){try{return /^(maps\.app\.goo\.gl|goo\.gl|g\.co|share\.google|maps\.google\.[a-z.]{2,7}|(www\.)?google\.[a-z.]{2,7})$/i.test(new URL(u).hostname)}catch(e){return false}}
async function resolveMapLink(url){
  const u=normalizeMapUrl(url);if(!u||!isGoogleMapsHost(u))return null;
  const p=parseLatLng(u);if(p)return p;
  if(_resOff)return null;if(_resCache.has(u))return _resCache.get(u);
  try{
    const call=sb.functions.invoke('resolve-map-link',{body:{url:u}});
    const {data,error}=await Promise.race([call,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),10000))]);
    if(error){                                                  // เรียกฟังก์ชันไม่สำเร็จ (401/403/404/5xx หรือเรียกไม่ถึง): บันทึกเหตุผลจริงไว้ให้แสดง ไม่ปล่อยเงียบ
      const st=error.context&&error.context.status||null;let body='';
      try{if(error.context&&typeof error.context.text==='function')body=String(await error.context.text()).slice(0,300)}catch(e){}
      _resLast={url:u,ok:false,error:'invoke_error',status:st,name:error.name||'',message:String(error.message||'').slice(0,200),body};
      if(st===404||/not found/i.test(error.message||''))_resOff=true;   // 404 = ยังไม่ได้ติดตั้งฟังก์ชัน → ไม่ถามซ้ำในรอบนี้
      return null}
    const r=data&&data.ok&&_validLat(+data.lat)&&_validLng(+data.lng)?{lat:+data.lat,lng:+data.lng}:null;
    _resLast={url:u,ok:!!r,error:data&&data.error||null,source:data&&data.source||null,trace:data&&data.trace||null};
    _resCache.set(u,r);return r}catch(e){_resLast={url:u,ok:false,error:String(e&&e.message||e)};return null}}
async function locEnsureCoords(o){if(o&&o.location_url&&o.location_lat==null){const r=await resolveMapLink(o.location_url);if(r){o.location_lat=r.lat;o.location_lng=r.lng}}return o}
function scheduleLocResolve(p){
  clearTimeout(_locTimers[p]);const raw=($(p+'l')?.value||'').trim(),url=raw?normalizeMapUrl(raw):null,c=$(p+'c');
  if(!c||c.dataset.touched==='1')return;                                                       // ผู้ใช้พิมพ์พิกัดเองแล้ว → ไม่ยุ่ง
  const dropAuto=()=>{if(c.dataset.auto==='1'){c.value='';delete c.dataset.auto;locPrev(p,true)}};   // พิกัดที่ระบบเติมจากลิงก์เก่า ไม่ใช่ของลิงก์ใหม่
  if(!url){dropAuto();return}
  const pl=parseLatLng(url);
  if(pl){const t=pl.lat+', '+pl.lng;if(c.value.trim()!==t){c.value=t;locPrev(p,true)}c.dataset.auto='1';return}   // ลิงก์เต็ม: พิกัดในลิงก์ชนะพิกัดเก่า
  dropAuto();
  if(!isGoogleMapsHost(url)||_resOff)return;
  _locTimers[p]=setTimeout(()=>locResolveNow(p,url),700)}
async function locResolveNow(p,url){
  const el=$(p+'lp');if(el){el.innerHTML='<span class="locnote">กำลังหาพิกัดจากลิงก์...</span>';if(typeof translateDOM==='function'&&LANG==='en')translateDOM(el)}
  const r=await resolveMapLink(url);
  const now=normalizeMapUrl(($(p+'l')?.value||'').trim());if(now!==url)return;                     // ผู้ใช้เปลี่ยนลิงก์ไประหว่างรอ
  const c=$(p+'c');if(r&&c&&c.dataset.touched!=='1'){c.value=r.lat+', '+r.lng;c.dataset.auto='1'}   // ลิงก์ใหม่ชนะพิกัดเก่า (ยกเว้นที่ผู้ใช้พิมพ์เอง)
  locPrev(p,true)}
// เหตุผลที่อ่านลิงก์ไม่ได้ (จากผลเรียกฟังก์ชันล่าสุด) — แสดงให้ผู้ใช้เห็นแทนการปล่อยเงียบ
function _whyText(){
  const r=_resLast;if(!r||r.ok)return '';const st=r.status,e=r.error;
  if(e==='invoke_error'){
    if(st===401)return 'ฟังก์ชันปฏิเสธการเรียก ('+st+') — มักเกี่ยวกับการยืนยันตัวตน (Verify JWT)';
    if(st===403)return 'ฟังก์ชันไม่อนุญาตการเรียก ('+st+')';
    if(st===404)return '';                                  // มีข้อความ "ยังไม่ได้ติดตั้ง…" แยกอยู่แล้ว
    if(st>=500)return 'ฟังก์ชันบนเซิร์ฟเวอร์ผิดพลาด ('+st+')';
    if(!st)return 'เรียกฟังก์ชันไม่ถึง (เครือข่าย, CORS หรือชื่อฟังก์ชันผิด)';
    return 'ฟังก์ชันตอบผิดปกติ ('+st+')'}
  if(e==='timeout')return 'ฟังก์ชันตอบช้าเกิน 10 วินาที';
  return {no_coordinates:'Google ไม่ส่งพิกัดมาในลิงก์นี้ (no_coordinates)',blocked_redirect:'ลิงก์พาไปนอกโดเมน Google จึงไม่ตามต่อ',fetch_failed:'เซิร์ฟเวอร์เปิดลิงก์ไม่สำเร็จ',bad_url:'ลิงก์นี้ไม่ใช่ลิงก์ Google Maps ที่รองรับ',too_many_redirects:'ลิงก์เปลี่ยนทางมากเกินไป'}[e]||'เรียกฟังก์ชันไม่สำเร็จ'}
function copyResolveInfo(){
  const t=JSON.stringify({version:typeof APP_VERSION!=='undefined'?APP_VERSION:'',..._resLast},null,1),done=()=>toast('คัดลอกแล้ว ส่งให้ผู้พัฒนาได้');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,()=>prompt('คัดลอกข้อความนี้',t));else prompt('คัดลอกข้อความนี้',t)}
// ---------- Plus code ในช่องพิกัด: เต็ม (ถอดรหัสทันที) หรือแบบสั้น + ชื่อเมือง (ค้นหาชื่อเมืองเพื่อรู้ว่าอยู่แถบไหน แล้วกู้คืนตำแหน่ง) ----------
const _r6=x=>Math.round(x*1e6)/1e6;
async function resolveShortPlus(pc){
  const t=curTrip();let ref=null;
  if(pc.locality){ref=await geocodeName(pc.locality);if(!ref)return {ok:false,reason:'locality'}}     // พิมพ์ชื่อเมืองมาแล้วหาไม่เจอ → ไม่เดาจากที่อื่น
  if(!ref&&t&&t.destination)ref=await geocodeName(t.destination);
  if(!ref){const k=cache.schedules.find(s=>t&&s.trip_id===t.id&&s.location_lat!=null&&s.location_lng!=null);if(k)ref={lat:k.location_lat,lng:k.location_lng}}
  if(!ref)return {ok:false,reason:'noref'};
  const r=pcRecover(pc.code,ref.lat,ref.lng);return {ok:true,lat:_r6(r.lat),lng:_r6(r.lng)}}
const _PC_ERR={locality:'หาชื่อเมืองนี้ไม่เจอ ลองพิมพ์ให้ชัดขึ้น เช่น WCFG+MP กรุงเทพ',noref:'Plus code แบบสั้นต้องมีชื่อเมืองต่อท้าย เช่น WCFG+MP กรุงเทพ'};
function scheduleCoordResolve(p){
  clearTimeout(_pcTimers[p]);const c=$(p+'c'),pc=c?pcParse(c.value):null;if(!pc||!pc.short||!pc.locality)return;
  _pcTimers[p]=setTimeout(()=>coordResolveNow(p,c.value),900)}
async function coordResolveNow(p,text){
  const pc=pcParse(text);if(!pc||!pc.short)return;const r=await resolveShortPlus(pc),c=$(p+'c');if(!c||c.value!==text)return;
  if(r.ok){c.value=r.lat+', '+r.lng;c.dataset.touched='1';delete c.dataset.auto;locPrev(p,true)}
  else{const el=$(p+'lp');if(el){el.innerHTML='<span class="locbad">'+_PC_ERR[r.reason]+'</span>';if(typeof translateDOM==='function'&&LANG==='en')translateDOM(el)}}}
async function locPrepare(p){                                 // ก่อนบันทึก: ถ้าในช่องพิกัดยังเป็น Plus code แบบสั้น ให้แปลงให้เสร็จก่อน
  const c=$(p+'c'),pc=c?pcParse(c.value):null;if(!pc||!pc.short)return;
  const r=await resolveShortPlus(pc);if(!r.ok)throw new Error(_PC_ERR[r.reason]);c.value=r.lat+', '+r.lng;c.dataset.touched='1'}
function _locOkHtml(ll){
  const pc=pcEncode(ll.lat,ll.lng,10),href='https://www.google.com/maps/search/?api=1&query='+ll.lat+'%2C'+ll.lng;
  return `<span class="locok">${lineIcon('pincheck',16)} พบพิกัด ${ll.lat}, ${ll.lng} · ปักหมุดบนแผนที่ได้ · Plus code ${pc} · <a href="${href}" target="_blank" rel="noopener noreferrer">ตรวจใน Google Maps</a></span>`}
function locPrevHtml(url,coords){
  const u=String(url||'').trim(),c=String(coords||'').trim();if(!u&&!c)return '';
  if(u&&!normalizeMapUrl(u))return '<span class="locbad">ลิงก์ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://</span>';
  const pc=c?pcParse(c):null;
  if(pc){
    if(pc.short)return pc.locality?'<span class="locnote">กำลังค้นหาตำแหน่งจาก Plus code...</span>':'<span class="locnote">Plus code แบบสั้น: ต้องมีชื่อเมืองต่อท้าย เช่น WCFG+MP กรุงเทพ</span>';
    const d=pcDecode(pc.code);return _locOkHtml({lat:_r6(d.lat),lng:_r6(d.lng)})}
  if(c&&!parseLatLng(c))return '<span class="locbad">พิกัดไม่ถูกต้อง ตัวอย่าง 13.9126, 100.6070 หรือ Plus code เช่น WCFG+MP กรุงเทพ</span>';
  const ll=(c&&parseLatLng(c))||(u&&parseLatLng(normalizeMapUrl(u)));
  if(ll)return _locOkHtml(ll);
  const nu=normalizeMapUrl(u),failed=_resLast&&!_resLast.ok&&nu&&_resLast.url===nu,why=failed?_whyText():'',diag=failed?' <button type="button" class="locbtn" onclick="copyResolveInfo()">คัดลอกรายละเอียดการตรวจลิงก์</button>':'';
  return '<span class="locnote">ลิงก์นี้ไม่มีพิกัด · เปิดนำทางได้ แต่ปักหมุดบนแผนที่ในแอปไม่ได้ ใส่พิกัดหรือ Plus code ในช่องด้านบนถ้าต้องการ'+(_resOff?' · ยังไม่ได้ติดตั้งตัวอ่านลิงก์สั้นบนเซิร์ฟเวอร์':'')+(why?' · ผลตรวจ: '+esc(why):'')+'</span>'+diag}
function _coordText(s){return s&&s.location_lat!=null&&s.location_lng!=null?s.location_lat+', '+s.location_lng:''}
// ฟอร์ม Schedule จัดเป็น 3 ส่วนตามลำดับ: ชื่อสถานที่+พิกัด → หมวดหมู่ → ลิงก์ตำแหน่ง (prefix 's' = ฟอร์มเพิ่ม, 'es' = ฟอร์มแก้ไข)
function locNameCoordHtml(p,s){
  s=s||{};
  return `<div class="grid2 keep2 locrow"><div class="field"><label>ชื่อสถานที่</label><input id="${p}n" value="${esc(s.location_name||'')}" placeholder="เช่น ท่าอากาศยานดอนเมือง" maxlength="160"></div><div class="field"><label>พิกัด หรือ Plus code (ถ้ามี)</label><input id="${p}c" value="${esc(_coordText(s))}" placeholder="พิมพ์พิกัด หรือวาง Plus code" inputmode="text" autocomplete="off" oninput="this.dataset.touched='1';locPrev('${p}')"></div></div>`}
function locLinkHtml(p,s){
  s=s||{};
  return `<div class="field locfield"><label>ลิงก์ตำแหน่ง (Google Maps)</label><div class="row" style="flex-wrap:nowrap;gap:8px"><input id="${p}l" value="${esc(s.location_url||'')}" placeholder="https://maps.app.goo.gl/…" inputmode="url" autocomplete="off" oninput="locPrev('${p}')"><button type="button" class="btn sm secondary" onclick="pasteLoc('${p}')">วาง</button></div><div id="${p}lp" class="locprev">${locPrevHtml(s.location_url,_coordText(s))}</div></div>`}
function locFieldsHtml(p,s){return locLinkHtml(p,s)+locNameCoordHtml(p,s)}      // ลำดับเก่า (ลิงก์ก่อน) เหลือไว้ให้โค้ดอื่นที่ยังเรียกอยู่
// หมวดหมู่สถานที่: ปุ่มเลือกด่วน + ช่องพิมพ์เองใต้ปุ่ม (ค่าเดียว เก็บใน schedules.place_category ไม่เกิน 40 ตัวอักษร)
const PLACE_CATS=['โรงแรม/ที่พัก','ร้านอาหาร','คาเฟ่','ห้างสรรพสินค้า','วัด'];
function catFieldHtml(p,s){
  const v=(s&&s.place_category)||'';
  return `<div class="field catfield"><label>หมวดหมู่สถานที่</label><div class="pchips">${PLACE_CATS.map(c=>`<button type="button" class="pchip${c===v?' on':''}" data-cat="${esc(c)}" aria-pressed="${c===v}" onclick="pickPlaceCat('${p}',this)">${c}</button>`).join('')}</div><input id="${p}cat" value="${esc(v)}" maxlength="40" placeholder="หรือพิมพ์หมวดหมู่เอง เช่น ตลาด, พิพิธภัณฑ์" oninput="syncPlaceCat('${p}')" autocomplete="off" style="margin-top:8px"></div>`}
function syncPlaceCat(p){const v=($(p+'cat')?.value||'').trim();$(p+'cat')?.closest('.catfield')?.querySelectorAll('.pchip').forEach(b=>{const on=b.dataset.cat===v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
function pickPlaceCat(p,btn){const i=$(p+'cat');i.value=i.value.trim()===btn.dataset.cat?'':btn.dataset.cat;syncPlaceCat(p)}     // แตะซ้ำ = ยกเลิกการเลือก
function readCat(p){const v=($(p+'cat')?.value||'').trim();if(v.length>40)throw new Error('หมวดหมู่สถานที่ยาวเกิน 40 ตัวอักษร');return {place_category:v||null}}
function locPrev(p,noResolve){const el=$(p+'lp');if(el)el.innerHTML=locPrevHtml($(p+'l')?.value,$(p+'c')?.value);if(!noResolve){scheduleLocResolve(p);scheduleCoordResolve(p)}}
function pasteLoc(p){
  const i=$(p+'l');if(!i)return;
  if(!navigator.clipboard?.readText)return toast('วางไม่ได้ ลองกดค้างที่ช่องแล้ววางเอง');
  navigator.clipboard.readText().then(t=>{i.value=String(t||'').trim();locPrev(p)},()=>toast('วางไม่ได้ ลองกดค้างที่ช่องแล้ววางเอง'))}
// อ่านค่าจากฟอร์ม → คอลัมน์ใน schedules (โยน Error ภาษาไทยถ้าข้อมูลไม่ถูกต้อง)
function readLoc(p){
  const raw=($(p+'l')?.value||'').trim(),url=raw?normalizeMapUrl(raw):null;if(raw&&!url)throw new Error('ลิงก์ตำแหน่งไม่ถูกต้อง ต้องขึ้นต้นด้วย https://');
  const cr=($(p+'c')?.value||'').trim();let ll=null;
  if(cr){const pc=pcParse(cr);
    if(pc){if(pc.short)throw new Error(_PC_ERR.noref+' แล้วรอให้พิกัดขึ้นก่อนบันทึก');const d=pcDecode(pc.code);ll={lat:_r6(d.lat),lng:_r6(d.lng)}}
    else{ll=parseLatLng(cr);if(!ll)throw new Error('พิกัดไม่ถูกต้อง ตัวอย่าง 13.9126, 100.6070 หรือ Plus code เช่น WCFG+MP กรุงเทพ')}}
  if(!ll&&url)ll=parseLatLng(url);
  return {location_url:url,location_name:($(p+'n')?.value||'').trim()||null,location_lat:ll?ll.lat:null,location_lng:ll?ll.lng:null}}
function stopName(s){return s.location_name||s.to_place||s.activity||s.hotel_name||'-'}
function stopButtonsHtml(s,withEdit){
  const u=mapsOpenUrl(s),can=withEdit&&canEditRow(s),ed=can?`<button type="button" class="locbtn" onclick="editSchedule('${s.id}')">${lineIcon('pencil',16)}แก้ไข</button><button type="button" class="locbtn" onclick="startPin('${s.id}')">${lineIcon('map',16)}${s.location_lat!=null?'ย้ายหมุด':'ปักหมุด'}</button>`:'';
  return `<div class="schline stopbtns" onclick="event.stopPropagation()">${u?`<a class="locbtn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${lineIcon('pin',16)}เปิดใน Maps</a>`:''}<button type="button" class="locbtn" onclick="openCheckin('${s.id}')">${lineIcon('pincheck',16)}เช็กอิน</button>${ed}</div>`}

// ---------- แท็บแผนที่ใน Schedule ----------
function setSchedTab(t){
  const map=t==='map';if(!map)_pin=null;$('schedListView')?.classList.toggle('hide',map);$('schedMapView')?.classList.toggle('hide',!map);
  $('tabListBtn')?.classList.toggle('active',!map);$('tabMapBtn')?.classList.toggle('active',map);
  if(!map){if($('schedChips'))$('schedChips').innerHTML='';$('schedule')?.classList.remove('pinmode')}
  renderPageActions('schedule');syncSchedSticky();
  if(map)renderScheduleMap()}
function syncSchedSticky(){const st=document.documentElement.style,s=$('schedSticky');if(s)st.setProperty('--ssh',s.offsetHeight+'px');st.setProperty('--tophh',(document.querySelector('.top')?.offsetHeight||0)+'px');const nav=document.querySelector('.mobileNav');st.setProperty('--navh',(nav&&getComputedStyle(nav).position==='fixed'?nav.offsetHeight:0)+'px')}
function setSchedMapDay(d){schedMapDay=d;_pin=null;renderScheduleMap()}
// ---------- ปักหมุดเองบนแผนที่ ----------
// เริ่มปักหมุดแล้วแผนที่ซูมเข้า (ระดับ 17 เหมือนเปิดลิงก์ใน Google Maps) พร้อมหมุดตั้งต้น:
//   1) มีพิกัดอยู่แล้ว (บันทึกไว้ หรืออ่านได้จากลิงก์เต็ม)      → หมุดที่ตำแหน่งนั้น
//   2) มีลิงก์แต่เป็นลิงก์สั้น (ถอดพิกัดในเบราว์เซอร์ไม่ได้)       → ค้นหาจากชื่อสถานที่ (OpenStreetMap) ถ้าไม่พบ → ตำแหน่งปัจจุบันของผู้ใช้
//   3) ไม่มีลิงก์                                              → ตำแหน่งปัจจุบันของผู้ใช้
// แล้วแตะบนแผนที่เพื่อย้าย และกด "ใช้ตำแหน่งนี้" เพื่อบันทึก
function _pinMsg(){
  if(!_pin)return '';if(_pin.busy)return _pin.busy;if(_pin.err)return _pin.err;
  const km=_pin.diff?_km(_pin.diff):'';
  const base=({saved:'ตำแหน่งที่บันทึกไว้ · แตะบนแผนที่เพื่อย้ายหมุด',link:'ตำแหน่งจากลิงก์ Google Maps · แตะบนแผนที่เพื่อย้ายหมุด',linkdiff:'ตำแหน่งจากลิงก์ Google Maps (ต่างจากพิกัดเดิม '+km+' กม.) · แตะบนแผนที่เพื่อย้ายหมุด',name:'ลิงก์สั้นอ่านพิกัดไม่ได้ จึงค้นหาจากชื่อสถานที่ (อาจคลาดเคลื่อน) · แตะบนแผนที่เพื่อแก้ตำแหน่ง',here:'ตำแหน่งปัจจุบันของคุณ · แตะบนแผนที่เพื่อย้ายหมุด',plus:'ตำแหน่งจาก Plus code · แตะบนแผนที่เพื่อย้ายหมุด',nohit:'ไม่พบสถานที่จากลิงก์ · แผนที่อยู่ที่ตำแหน่งปัจจุบันของคุณ · แตะบนแผนที่ที่สถานที่จริงเพื่อวางหมุด'})[_pin.src]||'แตะบนแผนที่เพื่อวางหมุด';
  const w=(_pin.src==='name'||_pin.src==='nohit')?_whyText():'';return w?base+' · ผลตรวจ: '+w:base}
function renderPinBar(){
  const b=$('pinBarBox');if(!b)return;if(!_pin){b.innerHTML='';return}
  const warn=_pin.src==='nohit'||_pin.err,open=_pin.pcOpen||warn;                 // ช่อง Plus code พับเก็บในสถานะปกติ (ให้แผนที่ใหญ่) และกางเองเมื่อหาสถานที่ไม่เจอ
  b.innerHTML=`<div class="pinbar${warn?' warn':''}"><div><b><span>ปักหมุด:</span> ${esc(_pin.name)}</b><div class="mini">${esc(_pinMsg())}${_pin.ll?' · '+esc(_pin.ll.lat+', '+_pin.ll.lng):''}</div></div><div class="pinacts"><button type="button" class="btn sm" id="pinOk" ${_pin.ll?'':'disabled'} onclick="confirmPin()">ใช้ตำแหน่งนี้</button><button type="button" class="btn secondary sm" onclick="cancelPin()">ยกเลิก</button>${open?'':'<button type="button" class="btn secondary sm" id="pinPcToggle" onclick="pinOpenPc()">Plus code</button>'}</div>${open?`<div class="pinpc"><input id="pinPc" value="${esc(_pin.pcText||'')}" placeholder="วาง Plus code จาก Google Maps เช่น WCFG+MP กรุงเทพ" oninput="if(_pin)_pin.pcText=this.value" onkeydown="if(event.key==='Enter')pinGoPlus()" autocomplete="off" autocapitalize="characters"><button type="button" class="btn sm secondary" onclick="pinGoPlus()">ไปที่ตำแหน่งนี้</button></div>`:''}</div>`;
  if(typeof translateDOM==='function'&&LANG==='en')translateDOM(b)}
function pinOpenPc(){if(!_pin)return;_pin.pcOpen=true;renderPinBar();$('pinPc')?.focus()}
async function pinGoPlus(){
  if(!_pin)return;const id=_pin.id,pc=pcParse(_pin.pcText||'');
  if(!pc){_pin.busy='';_pin.err='ไม่พบ Plus code ในข้อความ ตัวอย่าง WCFG+MP กรุงเทพ';renderPinBar();return}
  if(!pc.short){const d=pcDecode(pc.code);return setPinPos(d.lat,d.lng,'plus',17)}
  _pin.err='';_pin.busy='กำลังค้นหาตำแหน่งจาก Plus code...';renderPinBar();
  const r=await resolveShortPlus(pc);if(!_pin||_pin.id!==id)return;
  if(r.ok)return setPinPos(r.lat,r.lng,'plus',17);
  _pin.busy='';_pin.err=_PC_ERR[r.reason];renderPinBar()}
function placePinMarker(L){
  if(!_pin||!_pin.ll||!_schedMap)return;
  if(_pin.marker){_pin.marker.setLatLng([_pin.ll.lat,_pin.ll.lng]);return}
  _pin.marker=L.marker([_pin.ll.lat,_pin.ll.lng],{icon:L.divIcon({className:'',html:'<div class="stoppin pintmp">＋</div>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(_schedMap)}
function setPinPos(lat,lng,src,zoom,diff){
  if(!_pin||!_schedMap||!window.L)return;
  _pin.ll={lat:Math.round(lat*1e6)/1e6,lng:Math.round(lng*1e6)/1e6};_pin.src=src;_pin.diff=diff||0;_pin.busy='';_pin.err='';
  placePinMarker(window.L);_schedMap.invalidateSize();_schedMap.setView([_pin.ll.lat,_pin.ll.lng],zoom||17,{animate:true});renderPinBar()}
function _getHere(){return new Promise(res=>{if(!navigator.geolocation)return res(null);navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}),()=>res(null),{enableHighAccuracy:true,timeout:10000,maximumAge:30000})})}
async function _pinUseHere(src){
  const id=_pin.id;_pin.busy='กำลังหาตำแหน่งปัจจุบัน...';renderPinBar();
  const h=await _getHere();if(!_pin||_pin.id!==id)return;
  if(h)setPinPos(h.lat,h.lng,src,17);
  else{_pin.busy='';_pin.err='ใช้ตำแหน่งปัจจุบันไม่ได้ (ไม่อนุญาตหรือสัญญาณไม่พอ) · แตะบนแผนที่เพื่อวางหมุดเอง';renderPinBar()}}
// ค้นหาชื่อสถานที่ด้วย OpenStreetMap Nominatim (ผู้ใช้กดเองครั้งละ 1 คำขอ ตามนโยบายการใช้งาน) — ส่งเฉพาะชื่อสถานที่ ไม่ส่งข้อมูลผู้ใช้
async function geocodeName(q){
  try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),8000);
    const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language='+(LANG==='en'?'en':'th')+'&q='+encodeURIComponent(q),{signal:ac.signal,headers:{'Accept':'application/json'}});clearTimeout(tm);
    if(!r.ok)return null;const j=await r.json(),h=Array.isArray(j)&&j[0];if(!h)return null;
    const lat=+h.lat,lng=+h.lon;return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null}catch(e){return null}}
// แผนที่เปิดที่ตำแหน่งปัจจุบันของผู้ใช้ แต่ "ไม่" วางหมุดให้ (กันเผลอบันทึกตำแหน่งตัวเองเป็นที่ตั้งของสถานที่) ต้องแตะบนแผนที่เอง
async function _pinCenterHere(){
  const id=_pin.id;_pin.busy='กำลังหาตำแหน่งปัจจุบัน...';renderPinBar();
  const h=await _getHere();if(!_pin||_pin.id!==id)return;_pin.busy='';
  if(h){_pin.src='nohit';_schedMap.invalidateSize();_schedMap.setView([h.lat,h.lng],17,{animate:true})}
  else _pin.err='ใช้ตำแหน่งปัจจุบันไม่ได้ (ไม่อนุญาตหรือสัญญาณไม่พอ) · แตะบนแผนที่เพื่อวางหมุดเอง';
  renderPinBar()}
async function startPin(id){
  const s=cache.schedules.find(x=>x.id===id);if(!s||!canEditRow(s))return;
  _pin={id,name:stopName(s),ll:null,marker:null,src:'',busy:'',err:'',diff:0,pcText:''};
  $('schedule')?.classList.add('pinmode');syncSchedSticky();renderPinBar();
  if(_schedMap){_schedMap.getContainer().classList.add('pinning');_schedMap.invalidateSize()}
  $('leafWrap')?.scrollIntoView({block:'start',behavior:'smooth'});
  if(!_schedMap||!window.L)return;
  const saved=s.location_lat!=null&&s.location_lng!=null?{lat:s.location_lat,lng:s.location_lng}:null;
  // ลิงก์ Google ชนะพิกัดที่บันทึกไว้ (พิกัดเก่าอาจผิด เช่น เคยเก็บตำแหน่งปัจจุบันของผู้ใช้) — เหมือนเปิดลิงก์ใน Google Maps
  let lp=null;
  if(s.location_url){
    lp=parseLatLng(s.location_url);
    if(!lp){_pin.busy='กำลังหาพิกัดจากลิงก์...';renderPinBar();lp=await resolveMapLink(s.location_url);if(!_pin||_pin.id!==id)return;_pin.busy=''}}
  if(lp){const d=saved?_dist(saved,lp):0;return setPinPos(lp.lat,lp.lng,saved&&d>300?'linkdiff':'link',17,d)}
  if(saved)return setPinPos(saved.lat,saved.lng,'saved',17);
  if(s.location_url){
    _pin.busy='กำลังค้นหาสถานที่จากลิงก์...';renderPinBar();
    const t=curTrip(),q=[s.location_name||s.to_place||s.activity,t?.destination].filter(Boolean).join(' '),hit=q?await geocodeName(q):null;
    if(!_pin||_pin.id!==id)return;
    return hit?setPinPos(hit.lat,hit.lng,'name',17):_pinCenterHere()}
  return _pinUseHere('here')}
function pinMapClick(e){
  if(!_pin||!window.L)return;
  _pin.ll={lat:Math.round(e.latlng.lat*1e6)/1e6,lng:Math.round(e.latlng.lng*1e6)/1e6};_pin.src='tap';_pin.busy='';_pin.err='';placePinMarker(window.L);renderPinBar()}
function cancelPin(){_pin=null;renderScheduleMap()}
async function confirmPin(){
  if(!_pin||!_pin.ll)return;const {id,ll}=_pin;
  try{const {error}=await sb.from('schedules').update({location_lat:ll.lat,location_lng:ll.lng,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
    _pin=null;toast('ปักหมุดแล้ว');await render()}catch(e){err(e)}}
// ---------- แตะรายการ → แผนที่ไปที่สถานที่ของรายการนั้น ----------
let _selStop=null,_markers={},_linkPin=null,_fitHtml='';
function _dist(a,b){const R=6371000,t=x=>x*Math.PI/180,dLa=t(b.lat-a.lat),dLo=t(b.lng-a.lng),h=Math.sin(dLa/2)**2+Math.cos(t(a.lat))*Math.cos(t(b.lat))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function _km(d){return (d/1000).toFixed(d<10000?1:0)}
function _dayStops(){const t=curTrip();return t?cache.schedules.filter(s=>s.trip_id===t.id&&s.schedule_date===schedMapDay).sort((a,b)=>String(a.schedule_time||'99').localeCompare(String(b.schedule_time||'99'))):[]}
function _hasLL(s){return s&&s.location_lat!=null&&s.location_lng!=null}
function setLeafNote(text,html){
  const n=$('leafNote'),a=$('leafAct');if(n)n.textContent=text||'';if(a)a.innerHTML=(html||'')+_fitHtml;
  if(LANG==='en'&&typeof translateDOM==='function'){if(n)translateDOM(n);if(a)translateDOM(a)}}
function _pinIcon(L,i,sel,cls){return L.divIcon({className:'',html:`<div class="stoppin${sel?' sel':''}${cls?' '+cls:''}">${i}</div>`,iconSize:[32,32],iconAnchor:[16,16]})}
function refreshMarkers(){const L=window.L;if(!L)return;for(const [id,o] of Object.entries(_markers)){o.m.setIcon(_pinIcon(L,o.i,id===_selStop));o.m.setZIndexOffset(id===_selStop?1000:0)}}   // หมุดที่เลือกอยู่บนสุดเสมอ แม้ซ้อนกับหมุดอื่น
function _clearLinkPin(){if(_linkPin){try{_linkPin.remove()}catch(e){}_linkPin=null}}
function viewLinkPos(lat,lng){const L=window.L;if(!L||!_schedMap)return;_clearLinkPin();_linkPin=L.marker([lat,lng],{icon:_pinIcon(L,'↗',false,'linkpin')}).addTo(_schedMap);_schedMap.setView([lat,lng],17,{animate:true})}
async function saveLinkPos(id,lat,lng){
  try{const {error}=await sb.from('schedules').update({location_lat:lat,location_lng:lng,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;toast('บันทึกตำแหน่งแล้ว');await render()}catch(e){err(e)}}
function fitDayPins(){const L=window.L,pts=_dayStops().filter(_hasLL).map(s=>[s.location_lat,s.location_lng]);if(L&&_schedMap&&pts.length){_clearLinkPin();fitPins(_schedMap,L,pts)}}
function selectStop(id){
  if(_pin)return;if(!cache.schedules.some(x=>x.id===id))return;
  _selStop=id;document.querySelectorAll('#schedMapBox .stop').forEach(c=>c.classList.toggle('sel',c.dataset.id===id));
  refreshMarkers();$('leafWrap')?.scrollIntoView({block:'start',behavior:'smooth'});focusSelected(true)}
// ย้ายแผนที่ไปที่รายการที่เลือก แล้วเทียบกับลิงก์ Google ของรายการนั้น (พิกัดที่เก็บไว้อาจผิด)
async function focusSelected(move){
  const s=cache.schedules.find(x=>x.id===_selStop);if(!s||!_schedMap||!window.L)return;
  _clearLinkPin();const has=_hasLL(s),can=canEditRow(s);
  if(has&&move)_schedMap.setView([s.location_lat,s.location_lng],17,{animate:true});
  if(!has&&!s.location_url){setLeafNote(can?'รายการนี้ยังไม่มีพิกัด · กด "ปักหมุด" เพื่อวางหมุด หรือวางลิงก์เต็ม/ใส่พิกัดในฟอร์ม':'รายการนี้ยังไม่มีพิกัด','');return}
  setLeafNote(_dayStops().some(_hasLL)?'แตะรายการเพื่อดูสถานที่บนแผนที่':'','');
  if(!s.location_url||!isGoogleMapsHost(s.location_url))return;
  const id=s.id,r=await resolveMapLink(s.location_url);if(!r||_selStop!==id||!_schedMap||_pin)return;
  if(!has){viewLinkPos(r.lat,r.lng);setLeafNote('ลิงก์ชี้ไปที่นี่ · ยังไม่ได้บันทึกพิกัด',can?`<button type="button" class="locbtn" onclick="saveLinkPos('${id}',${r.lat},${r.lng})">บันทึกตำแหน่งนี้</button>`:'');return}
  const d=_dist({lat:s.location_lat,lng:s.location_lng},r);if(d<300)return;
  setLeafNote('ลิงก์ Google ชี้ไปอีกที่ ห่างจากหมุดที่บันทึกไว้ '+_km(d)+' กม.',`<button type="button" class="locbtn" onclick="viewLinkPos(${r.lat},${r.lng})">ดูตำแหน่งจากลิงก์</button>`+(can?`<button type="button" class="locbtn" onclick="saveLinkPos('${id}',${r.lat},${r.lng})">ใช้ตำแหน่งจากลิงก์</button>`:''))}
async function renderScheduleMap(){
  const box=$('schedMapBox'),ch=$('schedChips');if(!box)return;const t=curTrip();
  if(ch)ch.innerHTML='';
  if(!t){box.innerHTML='<div class="card empty">เลือก Trip ก่อน</div>';syncSchedSticky();return}
  const days=tripDates(t);if(!days.length){box.innerHTML='<div class="card empty">Trip นี้ยังไม่ได้ระบุวันเดินทาง</div>';syncSchedSticky();return}
  if(!schedMapDay||!days.includes(schedMapDay))schedMapDay=days.includes(today())?today():days[0];
  const stops=_dayStops();
  const chips=days.map((d,i)=>`<button type="button" class="daychip${d===schedMapDay?' active':''}" onclick="setSchedMapDay('${d}')">${i+1}<small>${esc(fmtDate(d,{day:'numeric',month:'short'}))}</small></button>`).join('');
  const pts=stops.map((s,i)=>({s,i:i+1,ll:_hasLL(s)?[s.location_lat,s.location_lng]:null})),withLL=pts.filter(p=>p.ll);
  if(!pts.some(p=>p.s.id===_selStop))_selStop=(withLL[0]||pts[0]||{s:{}}).s.id||null;
  const list=pts.length?pts.map(({s,i,ll})=>`<div class="card stop${s.id===_selStop?' sel':''}" data-id="${s.id}" role="button" tabindex="0" onclick="selectStop('${s.id}')" onkeydown="if(event.key==='Enter'&&event.target===this)selectStop('${s.id}')"><div class="row" style="flex-wrap:nowrap;gap:12px;align-items:center"><span class="stopnum">${i}</span><div style="flex:1;min-width:0"><b>${esc(stopName(s))}</b><div class="mini muted">${s.schedule_time?esc(String(s.schedule_time).slice(0,5))+' · ':''}${ll?'มีพิกัด · '+pcEncode(s.location_lat,s.location_lng,10):'ไม่มีพิกัด'}</div></div></div>${stopButtonsHtml(s,true)}</div>`).join(''):'<div class="card empty">ยังไม่มีรายการในวันนี้</div>';
  if(ch)ch.innerHTML=`<div class="daychips" role="tablist" aria-label="เลือกวัน">${chips}</div>`;
  box.innerHTML=`<div id="leafWrap"><div id="leafMap" class="leafmap"></div></div><div id="pinBarBox"></div><div id="leafNote" class="mini muted" style="margin:6px 2px"></div><div id="leafAct" class="stopbtns" style="margin:0 0 8px"></div>${list}`;
  $('schedule')?.classList.toggle('pinmode',!!_pin);syncSchedSticky();renderPinBar();
  _fitHtml=withLL.length>1?'<button type="button" class="locbtn" onclick="fitDayPins()">ดูทุกจุดของวัน</button>':'';
  if(!pts.length){$('leafWrap').classList.add('hide');return}
  try{
    const L=await loadLeaflet();if(!$('leafMap'))return;if(_schedMap){try{_schedMap.remove()}catch(e){}}
    _schedMap=makeLeafMap('leafMap',L);_markers={};_linkPin=null;
    withLL.forEach(p=>{_markers[p.s.id]={i:p.i,m:L.marker(p.ll,{icon:_pinIcon(L,p.i,p.s.id===_selStop),title:stopName(p.s),zIndexOffset:p.s.id===_selStop?1000:0}).addTo(_schedMap)}});
    const sel=stops.find(s=>s.id===_selStop);
    if(_hasLL(sel))_schedMap.setView([sel.location_lat,sel.location_lng],17);
    else if(withLL.length)fitPins(_schedMap,L,withLL.map(p=>p.ll));
    else{const any=cache.schedules.filter(s=>s.trip_id===t.id&&_hasLL(s));
      if(any.length)fitPins(_schedMap,L,any.map(s=>[s.location_lat,s.location_lng]));else{_schedMap.setView([13.5,100.9],6);setTimeout(()=>_schedMap.invalidateSize(),50)}}
    setTimeout(()=>_schedMap&&_schedMap.invalidateSize(),50);
    _schedMap.on('click',pinMapClick);
    if(_pin){_schedMap.getContainer().classList.add('pinning');_pin.marker=null;placePinMarker(L)}
    else focusSelected(false)
  }catch(e){$('leafWrap').classList.add('hide');$('leafNote').textContent='โหลดแผนที่ไม่ได้ (อาจออฟไลน์) แต่ยังกด "เปิดใน Maps" ได้'}}
// ปุ่มเพิ่มบนจอกว้าง (แถบชื่อหน้าแสดงเฉพาะจอ ≤950px) — ใช้ข้อมูลชุดเดียวกับปุ่มบนแถบชื่อหน้า
function syncSchedDesk(){
  const b=$('schedDeskAdd');if(!b||typeof PAGE_ACTIONS.schedule!=='function')return;const a=PAGE_ACTIONS.schedule();
  b.style.display=a.length?'':'none';if(a[0]){b.textContent=a[0].l;if(LANG==='en'&&typeof translateDOM==='function')translateDOM(b)}}
function schedAddClick(){const map=$('schedMapView')&&!$('schedMapView').classList.contains('hide');openAdd(map?schedMapDay:null,'schedule')}
(function(){const orig=window.renderPageActions;if(typeof orig==='function')window.renderPageActions=function(p){const r=orig.apply(this,arguments);if(p==='schedule')syncSchedDesk();return r}})();

window.addEventListener('resize',()=>{if(typeof syncSchedSticky==='function')syncSchedSticky()});
