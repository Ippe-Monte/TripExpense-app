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
function locPrevHtml(url,coords){
  const u=String(url||'').trim(),c=String(coords||'').trim();if(!u&&!c)return '';
  if(u&&!normalizeMapUrl(u))return '<span class="locbad">ลิงก์ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://</span>';
  if(c&&!parseLatLng(c))return '<span class="locbad">พิกัดไม่ถูกต้อง ตัวอย่าง 13.9126, 100.6070</span>';
  const ll=(c&&parseLatLng(c))||(u&&parseLatLng(normalizeMapUrl(u)));
  if(ll)return `<span class="locok">${lineIcon('pincheck',16)} พบพิกัด ${ll.lat}, ${ll.lng} · ปักหมุดบนแผนที่ได้</span>`;
  return '<span class="locnote">ลิงก์นี้ไม่มีพิกัด · เปิดนำทางได้ แต่ปักหมุดบนแผนที่ในแอปไม่ได้ ใส่พิกัดในช่องด้านล่างถ้าต้องการ</span>'}
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
function locPrev(p){const el=$(p+'lp');if(el)el.innerHTML=locPrevHtml($(p+'l')?.value,$(p+'c')?.value)}
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
  if(map)renderScheduleMap()}
function setSchedMapDay(d){schedMapDay=d;_pin=null;renderScheduleMap()}
// ---------- ปักหมุดเองบนแผนที่ (แตะบนแผนที่เพื่อวางหมุดให้จุดที่ยังไม่มีพิกัด หรือย้ายหมุดที่มีอยู่) ----------
function renderPinBar(){
  const b=$('pinBarBox');if(!b)return;if(!_pin){b.innerHTML='';return}
  const c=_pin.ll?`${_pin.ll.lat}, ${_pin.ll.lng}`:'ยังไม่ได้แตะบนแผนที่';
  b.innerHTML=`<div class="pinbar"><div><b>ปักหมุด: ${esc(_pin.name)}</b><div class="mini">แตะบนแผนที่เพื่อวางหมุด · ${esc(c)}</div></div><div class="pinacts"><button type="button" class="btn sm" id="pinOk" ${_pin.ll?'':'disabled'} onclick="confirmPin()">ใช้ตำแหน่งนี้</button><button type="button" class="btn secondary sm" onclick="cancelPin()">ยกเลิก</button></div></div>`;
  if(typeof translateDOM==='function'&&LANG==='en')translateDOM(b)}
function startPin(id){
  const s=cache.schedules.find(x=>x.id===id);if(!s||!canEditRow(s))return;
  _pin={id,name:stopName(s),ll:null,marker:null};renderPinBar();_schedMap?.getContainer().classList.add('pinning');
  $('pinBarBox')?.scrollIntoView({block:'start',behavior:'smooth'})}
function placePinMarker(L){
  if(!_pin||!_pin.ll||!_schedMap)return;
  if(_pin.marker){_pin.marker.setLatLng([_pin.ll.lat,_pin.ll.lng]);return}
  _pin.marker=L.marker([_pin.ll.lat,_pin.ll.lng],{icon:L.divIcon({className:'',html:'<div class="stoppin pintmp">＋</div>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(_schedMap)}
function pinMapClick(e){
  if(!_pin||!window.L)return;
  _pin.ll={lat:Math.round(e.latlng.lat*1e6)/1e6,lng:Math.round(e.latlng.lng*1e6)/1e6};placePinMarker(window.L);renderPinBar()}
function cancelPin(){_pin=null;renderScheduleMap()}
async function confirmPin(){
  if(!_pin||!_pin.ll)return;const {id,ll}=_pin;
  try{const {error}=await sb.from('schedules').update({location_lat:ll.lat,location_lng:ll.lng,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
    _pin=null;toast('ปักหมุดแล้ว');await render()}catch(e){err(e)}}
async function renderScheduleMap(){
  const box=$('schedMapBox');if(!box)return;const t=curTrip();
  if(!t){box.innerHTML='<div class="card empty">เลือก Trip ก่อน</div>';return}
  const days=tripDates(t);if(!days.length){box.innerHTML='<div class="card empty">Trip นี้ยังไม่ได้ระบุวันเดินทาง</div>';return}
  if(!schedMapDay||!days.includes(schedMapDay))schedMapDay=days.includes(today())?today():days[0];
  const stops=cache.schedules.filter(s=>s.trip_id===t.id&&s.schedule_date===schedMapDay).sort((a,b)=>String(a.schedule_time||'99').localeCompare(String(b.schedule_time||'99')));
  const chips=days.map((d,i)=>`<button type="button" class="daychip${d===schedMapDay?' active':''}" onclick="setSchedMapDay('${d}')">${i+1}<small>${esc(fmtDate(d,{day:'numeric',month:'short'}))}</small></button>`).join('');
  const pts=stops.map((s,i)=>({s,i:i+1,ll:s.location_lat!=null&&s.location_lng!=null?[s.location_lat,s.location_lng]:null}));
  const list=pts.length?pts.map(({s,i,ll})=>`<div class="card stop"><div class="row" style="flex-wrap:nowrap;gap:12px;align-items:center"><span class="stopnum">${i}</span><div style="flex:1;min-width:0"><b>${esc(stopName(s))}</b><div class="mini muted">${s.schedule_time?esc(String(s.schedule_time).slice(0,5))+' · ':''}${ll?'มีพิกัด':'ไม่มีพิกัด'}</div></div></div>${stopButtonsHtml(s,true)}</div>`).join(''):'<div class="card empty">ยังไม่มีรายการในวันนี้</div>';
  box.innerHTML=`<div class="daychips" role="tablist" aria-label="เลือกวัน">${chips}</div>${canWrite()?`<button type="button" class="btn addplace" onclick="openAdd('${schedMapDay}','schedule')">＋ เพิ่มสถานที่ของวันนี้</button>`:''}<div id="pinBarBox"></div><div id="leafWrap"><div id="leafMap" class="leafmap"></div></div><div id="leafNote" class="mini muted" style="margin:6px 2px"></div>${list}`;
  renderPinBar();
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
    if(_pin){_schedMap.getContainer().classList.add('pinning');placePinMarker(L)}
  }catch(e){$('leafWrap').classList.add('hide');$('leafNote').textContent='โหลดแผนที่ไม่ได้ (อาจออฟไลน์) แต่ยังกด "เปิดใน Maps" ได้'}}
