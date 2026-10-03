// maps.js — ลิงก์ตำแหน่งในแต่ละรายการ Schedule + แท็บแผนที่ (Leaflet โหลดเมื่อเปิดแท็บเท่านั้น)
// ลิงก์ Google Maps แบบสั้น (maps.app.goo.gl) แกะพิกัดในเบราว์เซอร์ไม่ได้ → เปิดนำทางได้ แต่ปักหมุดในแอปต้องมีพิกัด (จากลิงก์เต็ม หรือพิมพ์เอง)
let _leafP=null,schedMapDay=null,_schedMap=null;
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
function locFieldsHtml(p,s){
  s=s||{};const coords=s.location_lat!=null&&s.location_lng!=null?s.location_lat+', '+s.location_lng:'';
  return `<div class="field locfield"><label>ลิงก์ตำแหน่ง (Google Maps) <span class="newtag">ใหม่</span></label><div class="row" style="flex-wrap:nowrap;gap:8px"><input id="${p}l" value="${esc(s.location_url||'')}" placeholder="https://maps.app.goo.gl/…" inputmode="url" autocomplete="off" oninput="locPrev('${p}')"><button type="button" class="btn sm secondary" onclick="pasteLoc('${p}')">วาง</button></div><div id="${p}lp" class="locprev">${locPrevHtml(s.location_url,coords)}</div>
    <div class="grid2 keep2" style="margin-top:8px"><div><label>ชื่อสถานที่</label><input id="${p}n" value="${esc(s.location_name||'')}" placeholder="เช่น ท่าอากาศยานดอนเมือง" maxlength="160"></div><div><label>พิกัด (ถ้ามี)</label><input id="${p}c" value="${esc(coords)}" placeholder="13.9126, 100.6070" inputmode="decimal" autocomplete="off" oninput="locPrev('${p}')"></div></div></div>`}
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
  const u=mapsOpenUrl(s),ed=withEdit&&canEditRow(s)?`<button type="button" class="locbtn" onclick="editSchedule('${s.id}')">${lineIcon('pencil',16)}แก้ไข</button>`:'';
  return `<div class="schline stopbtns">${u?`<a class="locbtn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${lineIcon('pin',16)}เปิดใน Maps</a>`:''}<button type="button" class="locbtn" onclick="openCheckin('${s.id}')">${lineIcon('pincheck',16)}เช็กอิน</button>${ed}</div>`}

// ---------- แท็บแผนที่ใน Schedule ----------
function setSchedTab(t){
  const map=t==='map';$('schedListView')?.classList.toggle('hide',map);$('schedMapView')?.classList.toggle('hide',!map);
  $('tabListBtn')?.classList.toggle('active',!map);$('tabMapBtn')?.classList.toggle('active',map);
  if(map)renderScheduleMap()}
function setSchedMapDay(d){schedMapDay=d;renderScheduleMap()}
async function renderScheduleMap(){
  const box=$('schedMapBox');if(!box)return;const t=curTrip();
  if(!t){box.innerHTML='<div class="card empty">เลือก Trip ก่อน</div>';return}
  const days=tripDates(t);if(!days.length){box.innerHTML='<div class="card empty">Trip นี้ยังไม่ได้ระบุวันเดินทาง</div>';return}
  if(!schedMapDay||!days.includes(schedMapDay))schedMapDay=days.includes(today())?today():days[0];
  const stops=cache.schedules.filter(s=>s.trip_id===t.id&&s.schedule_date===schedMapDay).sort((a,b)=>String(a.schedule_time||'99').localeCompare(String(b.schedule_time||'99')));
  const chips=days.map((d,i)=>`<button type="button" class="daychip${d===schedMapDay?' active':''}" onclick="setSchedMapDay('${d}')">${i+1}<small>${esc(fmtDate(d,{day:'numeric',month:'short'}))}</small></button>`).join('');
  const pts=stops.map((s,i)=>({s,i:i+1,ll:s.location_lat!=null&&s.location_lng!=null?[s.location_lat,s.location_lng]:null}));
  const list=pts.length?pts.map(({s,i,ll})=>`<div class="card stop"><div class="row" style="flex-wrap:nowrap;gap:12px;align-items:center"><span class="stopnum">${i}</span><div style="flex:1;min-width:0"><b>${esc(stopName(s))}</b><div class="mini muted">${s.schedule_time?esc(String(s.schedule_time).slice(0,5))+' · ':''}${ll?'มีพิกัด':'ไม่มีพิกัด'}</div></div></div>${stopButtonsHtml(s,true)}</div>`).join(''):'<div class="card empty">ยังไม่มีรายการในวันนี้</div>';
  box.innerHTML=`<div class="daychips" role="tablist" aria-label="เลือกวัน">${chips}</div>${canWrite()?`<button type="button" class="btn addplace" onclick="openAdd('${schedMapDay}','schedule')">＋ เพิ่มสถานที่ของวันนี้</button>`:''}<div id="leafWrap"><div id="leafMap" class="leafmap"></div></div><div id="leafNote" class="mini muted" style="margin:6px 2px"></div>${list}`;
  const withLL=pts.filter(p=>p.ll);
  if(!withLL.length){$('leafWrap').classList.add('hide');$('leafNote').textContent=pts.length?'ยังไม่มีพิกัดของวันนี้ · วางลิงก์ Google Maps แบบเต็ม หรือใส่พิกัดในฟอร์มของรายการ เพื่อปักหมุดบนแผนที่':'';return}
  try{
    const L=await loadLeaflet();if(!$('leafMap'))return;if(_schedMap){try{_schedMap.remove()}catch(e){}}
    _schedMap=makeLeafMap('leafMap',L);
    withLL.forEach(p=>L.marker(p.ll,{icon:L.divIcon({className:'',html:`<div class="stoppin">${p.i}</div>`,iconSize:[32,32],iconAnchor:[16,16]}),title:stopName(p.s)}).addTo(_schedMap));
    fitPins(_schedMap,L,withLL.map(p=>p.ll))
  }catch(e){$('leafWrap').classList.add('hide');$('leafNote').textContent='โหลดแผนที่ไม่ได้ (อาจออฟไลน์) แต่ยังกด "เปิดใน Maps" ได้'}}
