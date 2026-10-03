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
const _resCache=new Map();let _resOff=false,_locTimers={};
function isGoogleMapsHost(u){try{return /^(maps\.app\.goo\.gl|goo\.gl|g\.co|share\.google|maps\.google\.[a-z.]{2,7}|(www\.)?google\.[a-z.]{2,7})$/i.test(new URL(u).hostname)}catch(e){return false}}
async function resolveMapLink(url){
  const u=normalizeMapUrl(url);if(!u||!isGoogleMapsHost(u))return null;
  const p=parseLatLng(u);if(p)return p;
  if(_resOff)return null;if(_resCache.has(u))return _resCache.get(u);
  try{
    const call=sb.functions.invoke('resolve-map-link',{body:{url:u}});
    const {data,error}=await Promise.race([call,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),10000))]);
    if(error){if((error.context&&error.context.status===404)||/not found/i.test(error.message||''))_resOff=true;return null}   // 404 = ยังไม่ได้ติดตั้งฟังก์ชัน → ไม่ถามซ้ำในรอบนี้
    const r=data&&data.ok&&_validLat(+data.lat)&&_validLng(+data.lng)?{lat:+data.lat,lng:+data.lng}:null;
    _resCache.set(u,r);return r}catch(e){return null}}
async function locEnsureCoords(o){if(o&&o.location_url&&o.location_lat==null){const r=await resolveMapLink(o.location_url);if(r){o.location_lat=r.lat;o.location_lng=r.lng}}return o}
function scheduleLocResolve(p){
  clearTimeout(_locTimers[p]);const raw=($(p+'l')?.value||'').trim(),url=raw?normalizeMapUrl(raw):null;
  if(!url||parseLatLng(url)||($(p+'c')?.value||'').trim()||!isGoogleMapsHost(url)||_resOff)return;
  _locTimers[p]=setTimeout(()=>locResolveNow(p,url),700)}
async function locResolveNow(p,url){
  const el=$(p+'lp');if(el){el.innerHTML='<span class="locnote">กำลังหาพิกัดจากลิงก์...</span>';if(typeof translateDOM==='function'&&LANG==='en')translateDOM(el)}
  const r=await resolveMapLink(url);
  const now=normalizeMapUrl(($(p+'l')?.value||'').trim());if(now!==url)return;                     // ผู้ใช้เปลี่ยนลิงก์ไประหว่างรอ
  const c=$(p+'c');if(r&&c&&!c.value.trim())c.value=r.lat+', '+r.lng;
  locPrev(p,true)}
function locPrevHtml(url,coords){
  const u=String(url||'').trim(),c=String(coords||'').trim();if(!u&&!c)return '';
  if(u&&!normalizeMapUrl(u))return '<span class="locbad">ลิงก์ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://</span>';
  if(c&&!parseLatLng(c))return '<span class="locbad">พิกัดไม่ถูกต้อง ตัวอย่าง 13.9126, 100.6070</span>';
  const ll=(c&&parseLatLng(c))||(u&&parseLatLng(normalizeMapUrl(u)));
  if(ll)return `<span class="locok">${lineIcon('pincheck',16)} พบพิกัด ${ll.lat}, ${ll.lng} · ปักหมุดบนแผนที่ได้</span>`;
  return '<span class="locnote">ลิงก์นี้ไม่มีพิกัด · เปิดนำทางได้ แต่ปักหมุดบนแผนที่ในแอปไม่ได้ ใส่พิกัดในช่องด้านล่างถ้าต้องการ'+(_resOff?' · ยังไม่ได้ติดตั้งตัวอ่านลิงก์สั้นบนเซิร์ฟเวอร์':'')+'</span>'}
function _coordText(s){return s&&s.location_lat!=null&&s.location_lng!=null?s.location_lat+', '+s.location_lng:''}
// ฟอร์ม Schedule จัดเป็น 3 ส่วนตามลำดับ: ชื่อสถานที่+พิกัด → หมวดหมู่ → ลิงก์ตำแหน่ง (prefix 's' = ฟอร์มเพิ่ม, 'es' = ฟอร์มแก้ไข)
function locNameCoordHtml(p,s){
  s=s||{};
  return `<div class="grid2 keep2 locrow"><div class="field"><label>ชื่อสถานที่</label><input id="${p}n" value="${esc(s.location_name||'')}" placeholder="เช่น ท่าอากาศยานดอนเมือง" maxlength="160"></div><div class="field"><label>พิกัด (ถ้ามี)</label><input id="${p}c" value="${esc(_coordText(s))}" placeholder="13.9126, 100.6070" inputmode="decimal" autocomplete="off" oninput="locPrev('${p}')"></div></div>`}
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
function locPrev(p,noResolve){const el=$(p+'lp');if(el)el.innerHTML=locPrevHtml($(p+'l')?.value,$(p+'c')?.value);if(!noResolve)scheduleLocResolve(p)}
function pasteLoc(p){
  const i=$(p+'l');if(!i)return;
  if(!navigator.clipboard?.readText)return toast('วางไม่ได้ ลองกดค้างที่ช่องแล้ววางเอง');
  navigator.clipboard.readText().then(t=>{i.value=String(t||'').trim();locPrev(p)},()=>toast('วางไม่ได้ ลองกดค้างที่ช่องแล้ววางเอง'))}
// อ่านค่าจากฟอร์ม → คอลัมน์ใน schedules (โยน Error ภาษาไทยถ้าข้อมูลไม่ถูกต้อง)
function readLoc(p){
  const raw=($(p+'l')?.value||'').trim(),url=raw?normalizeMapUrl(raw):null;if(raw&&!url)throw new Error('ลิงก์ตำแหน่งไม่ถูกต้อง ต้องขึ้นต้นด้วย https://');
  const cr=($(p+'c')?.value||'').trim();let ll=cr?parseLatLng(cr):null;if(cr&&!ll)throw new Error('พิกัดไม่ถูกต้อง ตัวอย่าง 13.9126, 100.6070');
  if(!ll&&url)ll=parseLatLng(url);
  return {location_url:url,location_name:($(p+'n')?.value||'').trim()||null,location_lat:ll?ll.lat:null,location_lng:ll?ll.lng:null}}
function stopName(s){return s.location_name||s.to_place||s.activity||s.hotel_name||'-'}
function stopButtonsHtml(s,withEdit){
  const u=mapsOpenUrl(s),can=withEdit&&canEditRow(s),ed=can?`<button type="button" class="locbtn" onclick="editSchedule('${s.id}')">${lineIcon('pencil',16)}แก้ไข</button><button type="button" class="locbtn" onclick="startPin('${s.id}')">${lineIcon('map',16)}${s.location_lat!=null?'ย้ายหมุด':'ปักหมุด'}</button>`:'';
  return `<div class="schline stopbtns">${u?`<a class="locbtn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${lineIcon('pin',16)}เปิดใน Maps</a>`:''}<button type="button" class="locbtn" onclick="openCheckin('${s.id}')">${lineIcon('pincheck',16)}เช็กอิน</button>${ed}</div>`}

// ---------- แท็บแผนที่ใน Schedule ----------
function setSchedTab(t){
  const map=t==='map';if(!map)_pin=null;$('schedListView')?.classList.toggle('hide',map);$('schedMapView')?.classList.toggle('hide',!map);
  $('tabListBtn')?.classList.toggle('active',!map);$('tabMapBtn')?.classList.toggle('active',map);
  if(!map){if($('schedChips'))$('schedChips').innerHTML='';$('schedule')?.classList.remove('pinmode')}
  renderPageActions('schedule');syncSchedSticky();
  if(map)renderScheduleMap()}
function syncSchedSticky(){const st=document.documentElement.style,s=$('schedSticky');if(s)st.setProperty('--ssh',s.offsetHeight+'px');const nav=document.querySelector('.mobileNav');st.setProperty('--navh',(nav&&getComputedStyle(nav).position==='fixed'?nav.offsetHeight:0)+'px')}
function setSchedMapDay(d){schedMapDay=d;_pin=null;renderScheduleMap()}
// ---------- ปักหมุดเองบนแผนที่ ----------
// เริ่มปักหมุดแล้วแผนที่ซูมเข้า (ระดับ 17 เหมือนเปิดลิงก์ใน Google Maps) พร้อมหมุดตั้งต้น:
//   1) มีพิกัดอยู่แล้ว (บันทึกไว้ หรืออ่านได้จากลิงก์เต็ม)      → หมุดที่ตำแหน่งนั้น
//   2) มีลิงก์แต่เป็นลิงก์สั้น (ถอดพิกัดในเบราว์เซอร์ไม่ได้)       → ค้นหาจากชื่อสถานที่ (OpenStreetMap) ถ้าไม่พบ → ตำแหน่งปัจจุบันของผู้ใช้
//   3) ไม่มีลิงก์                                              → ตำแหน่งปัจจุบันของผู้ใช้
// แล้วแตะบนแผนที่เพื่อย้าย และกด "ใช้ตำแหน่งนี้" เพื่อบันทึก
function _pinMsg(){
  if(!_pin)return '';if(_pin.busy)return _pin.busy;if(_pin.err)return _pin.err;
  return {saved:'ตำแหน่งที่บันทึกไว้ · แตะบนแผนที่เพื่อย้ายหมุด',link:'ตำแหน่งจากลิงก์ Google Maps · แตะบนแผนที่เพื่อย้ายหมุด',name:'ลิงก์สั้นอ่านพิกัดไม่ได้ จึงค้นหาจากชื่อสถานที่ (อาจคลาดเคลื่อน) · แตะบนแผนที่เพื่อแก้ตำแหน่ง',here:'ตำแหน่งปัจจุบันของคุณ · แตะบนแผนที่เพื่อย้ายหมุด',herefb:'ไม่พบสถานที่จากลิงก์ จึงแสดงตำแหน่งปัจจุบันของคุณ · แตะบนแผนที่เพื่อย้ายหมุด'}[_pin.src]||'แตะบนแผนที่เพื่อวางหมุด'}
function renderPinBar(){
  const b=$('pinBarBox');if(!b)return;if(!_pin){b.innerHTML='';return}
  b.innerHTML=`<div class="pinbar"><div><b><span>ปักหมุด:</span> ${esc(_pin.name)}</b><div class="mini">${esc(_pinMsg())}${_pin.ll?' · '+esc(_pin.ll.lat+', '+_pin.ll.lng):''}</div></div><div class="pinacts"><button type="button" class="btn sm" id="pinOk" ${_pin.ll?'':'disabled'} onclick="confirmPin()">ใช้ตำแหน่งนี้</button><button type="button" class="btn secondary sm" onclick="cancelPin()">ยกเลิก</button></div></div>`;
  if(typeof translateDOM==='function'&&LANG==='en')translateDOM(b)}
function placePinMarker(L){
  if(!_pin||!_pin.ll||!_schedMap)return;
  if(_pin.marker){_pin.marker.setLatLng([_pin.ll.lat,_pin.ll.lng]);return}
  _pin.marker=L.marker([_pin.ll.lat,_pin.ll.lng],{icon:L.divIcon({className:'',html:'<div class="stoppin pintmp">＋</div>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(_schedMap)}
function setPinPos(lat,lng,src,zoom){
  if(!_pin||!_schedMap||!window.L)return;
  _pin.ll={lat:Math.round(lat*1e6)/1e6,lng:Math.round(lng*1e6)/1e6};_pin.src=src;_pin.busy='';_pin.err='';
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
async function startPin(id){
  const s=cache.schedules.find(x=>x.id===id);if(!s||!canEditRow(s))return;
  _pin={id,name:stopName(s),ll:null,marker:null,src:'',busy:'',err:''};
  $('schedule')?.classList.add('pinmode');syncSchedSticky();renderPinBar();
  if(_schedMap){_schedMap.getContainer().classList.add('pinning');_schedMap.invalidateSize()}
  $('leafWrap')?.scrollIntoView({block:'start',behavior:'smooth'});
  if(!_schedMap||!window.L)return;
  let k=s.location_lat!=null&&s.location_lng!=null?{lat:s.location_lat,lng:s.location_lng,src:'saved'}:null;
  if(!k&&s.location_url){const p=parseLatLng(s.location_url);if(p)k={lat:p.lat,lng:p.lng,src:'link'}}
  if(k)return setPinPos(k.lat,k.lng,k.src,17);
  if(s.location_url){
    _pin.busy='กำลังหาพิกัดจากลิงก์...';renderPinBar();
    const r=await resolveMapLink(s.location_url);if(!_pin||_pin.id!==id)return;
    if(r)return setPinPos(r.lat,r.lng,'link',17);
    _pin.busy='กำลังค้นหาสถานที่จากลิงก์...';renderPinBar();
    const t=curTrip(),q=[s.location_name||s.to_place||s.activity,t?.destination].filter(Boolean).join(' '),hit=q?await geocodeName(q):null;
    if(!_pin||_pin.id!==id)return;
    return hit?setPinPos(hit.lat,hit.lng,'name',17):_pinUseHere('herefb')}
  return _pinUseHere('here')}
function pinMapClick(e){
  if(!_pin||!window.L)return;
  _pin.ll={lat:Math.round(e.latlng.lat*1e6)/1e6,lng:Math.round(e.latlng.lng*1e6)/1e6};_pin.src='tap';_pin.busy='';_pin.err='';placePinMarker(window.L);renderPinBar()}
function cancelPin(){_pin=null;renderScheduleMap()}
async function confirmPin(){
  if(!_pin||!_pin.ll)return;const {id,ll}=_pin;
  try{const {error}=await sb.from('schedules').update({location_lat:ll.lat,location_lng:ll.lng,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
    _pin=null;toast('ปักหมุดแล้ว');await render()}catch(e){err(e)}}
async function renderScheduleMap(){
  const box=$('schedMapBox'),ch=$('schedChips');if(!box)return;const t=curTrip();
  if(ch)ch.innerHTML='';
  if(!t){box.innerHTML='<div class="card empty">เลือก Trip ก่อน</div>';syncSchedSticky();return}
  const days=tripDates(t);if(!days.length){box.innerHTML='<div class="card empty">Trip นี้ยังไม่ได้ระบุวันเดินทาง</div>';syncSchedSticky();return}
  if(!schedMapDay||!days.includes(schedMapDay))schedMapDay=days.includes(today())?today():days[0];
  const stops=cache.schedules.filter(s=>s.trip_id===t.id&&s.schedule_date===schedMapDay).sort((a,b)=>String(a.schedule_time||'99').localeCompare(String(b.schedule_time||'99')));
  const chips=days.map((d,i)=>`<button type="button" class="daychip${d===schedMapDay?' active':''}" onclick="setSchedMapDay('${d}')">${i+1}<small>${esc(fmtDate(d,{day:'numeric',month:'short'}))}</small></button>`).join('');
  const pts=stops.map((s,i)=>({s,i:i+1,ll:s.location_lat!=null&&s.location_lng!=null?[s.location_lat,s.location_lng]:null}));
  const list=pts.length?pts.map(({s,i,ll})=>`<div class="card stop"><div class="row" style="flex-wrap:nowrap;gap:12px;align-items:center"><span class="stopnum">${i}</span><div style="flex:1;min-width:0"><b>${esc(stopName(s))}</b><div class="mini muted">${s.schedule_time?esc(String(s.schedule_time).slice(0,5))+' · ':''}${ll?'มีพิกัด':'ไม่มีพิกัด'}</div></div></div>${stopButtonsHtml(s,true)}</div>`).join(''):'<div class="card empty">ยังไม่มีรายการในวันนี้</div>';
  if(ch)ch.innerHTML=`<div class="daychips" role="tablist" aria-label="เลือกวัน">${chips}</div>`;
  box.innerHTML=`<div id="leafWrap"><div id="leafMap" class="leafmap"></div></div><div id="pinBarBox"></div><div id="leafNote" class="mini muted" style="margin:6px 2px"></div>${list}`;
  $('schedule')?.classList.toggle('pinmode',!!_pin);syncSchedSticky();renderPinBar();
  const withLL=pts.filter(p=>p.ll);
  if(!pts.length){$('leafWrap').classList.add('hide');return}
  try{
    const L=await loadLeaflet();if(!$('leafMap'))return;if(_schedMap){try{_schedMap.remove()}catch(e){}}
    _schedMap=makeLeafMap('leafMap',L);
    withLL.forEach(p=>L.marker(p.ll,{icon:L.divIcon({className:'',html:`<div class="stoppin">${p.i}</div>`,iconSize:[32,32],iconAnchor:[16,16]}),title:stopName(p.s)}).addTo(_schedMap));
    if(withLL.length)fitPins(_schedMap,L,withLL.map(p=>p.ll));
    else{const any=cache.schedules.filter(s=>s.trip_id===t.id&&s.location_lat!=null&&s.location_lng!=null);
      if(any.length)fitPins(_schedMap,L,any.map(s=>[s.location_lat,s.location_lng]));else{_schedMap.setView([13.5,100.9],6);setTimeout(()=>_schedMap.invalidateSize(),50)}}
    _schedMap.on('click',pinMapClick);
    if(!withLL.length)$('leafNote').textContent=canWrite()?'ยังไม่มีพิกัดของวันนี้ · กด "ปักหมุด" ที่จุดใดจุดหนึ่ง แล้วแตะบนแผนที่เพื่อวางหมุด หรือวางลิงก์เต็ม/ใส่พิกัดในฟอร์ม':'ยังไม่มีพิกัดของวันนี้';
    if(_pin){_schedMap.getContainer().classList.add('pinning');_pin.marker=null;placePinMarker(L)}
  }catch(e){$('leafWrap').classList.add('hide');$('leafNote').textContent='โหลดแผนที่ไม่ได้ (อาจออฟไลน์) แต่ยังกด "เปิดใน Maps" ได้'}}
