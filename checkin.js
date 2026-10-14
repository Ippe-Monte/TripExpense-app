// checkin.js — เช็กอินสถานที่ + แผนที่การเที่ยวของฉัน (เหรียญพิชิต/หมุด) · ข้อมูลเห็นเฉพาะเจ้าของ แม้แต่ developer ก็ไม่เห็น
let _checkins=null,_ckGeo=null;
async function loadCheckins(force){if(_checkins&&!force)return _checkins;const {data,error}=await sb.from('checkins').select('*').order('checked_in_at',{ascending:false}).limit(2000);if(error)throw error;_checkins=data||[];return _checkins}
function provinceOptionsHtml(sel){
  return '<option value="">— เลือกจังหวัด —</option>'+THAI_REGIONS.map(r=>`<optgroup label="${esc(r.name)}">${r.provinces.map(p=>`<option value="${esc(p)}"${p===sel?' selected':''}>${esc(p)}</option>`).join('')}</optgroup>`).join('')+'<optgroup label="ต่างประเทศ"><option value="__abroad__">นอกประเทศไทย</option></optgroup>'}
function guessProvince(text){const t=String(text||'');const hit=ALL_PROVINCES.find(p=>t.includes(p.name));return hit?hit.name:''}
function openCheckin(scheduleId){
  _ckGeo=null;const s=scheduleId?cache.schedules.find(x=>x.id===scheduleId):null,t=s?tripById(s.trip_id):curTrip();
  const name=s?stopName(s):'',prov=guessProvince([name,s?.location_name,t?.destination].join(' '));
  modal(`<div class="sheethead"><h3>${lineIcon('pincheck',20)} เช็กอินที่นี่</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="closeModal()">ปิด</button></div>
    <div class="field"><label>ชื่อสถานที่</label><input id="ckName" value="${esc(name)}" maxlength="160" placeholder="เช่น วัดพระธาตุดอยสุเทพ"></div>
    <div class="field"><label>จังหวัด</label><select id="ckProv" onchange="ckProvChange()">${provinceOptionsHtml(prov)}</select></div>
    <div class="field hide" id="ckCountryBox"><label>รหัสประเทศ (2-3 ตัวอักษร เช่น JP)</label><input id="ckCountry" maxlength="3" placeholder="JP" autocapitalize="characters"></div>
    <div class="field"><label>บันทึกสั้นๆ (ถ้ามี)</label><textarea id="ckNote" maxlength="500" rows="2" placeholder="เช่น มาถึงก่อนเวลา กาแฟอร่อย"></textarea></div>
    <div class="row" style="gap:8px"><button type="button" class="btn secondary sm" onclick="ckLocate('${s?.id||''}')">${lineIcon('pin',16)} ใช้ตำแหน่งปัจจุบัน</button><span id="ckGeoMsg" class="mini muted"></span></div>
    <div class="mini muted" style="margin:8px 0">เช็กอินนี้เห็นได้เฉพาะคุณ · ใช้ตำแหน่งเฉพาะตอนที่คุณกดปุ่มด้านบน</div>
    <button type="button" class="btn" id="ckSave" onclick="saveCheckin('${s?.id||''}')">เช็กอินที่นี่</button>`,'sheet')}
function ckProvChange(){$('ckCountryBox')?.classList.toggle('hide',$('ckProv').value!=='__abroad__')}
function ckLocate(sid){
  const msg=$('ckGeoMsg');if(!navigator.geolocation){msg.textContent='อุปกรณ์นี้ไม่รองรับตำแหน่ง';return}
  msg.textContent='กำลังหาตำแหน่ง...';
  navigator.geolocation.getCurrentPosition(pos=>{
    _ckGeo={lat:Math.round(pos.coords.latitude*1e6)/1e6,lng:Math.round(pos.coords.longitude*1e6)/1e6};
    const s=sid?cache.schedules.find(x=>x.id===sid):null;let txt='ได้ตำแหน่งแล้ว';
    if(s&&s.location_lat!=null){const d=Math.round(distanceMeters(_ckGeo,{lat:s.location_lat,lng:s.location_lng}));txt+=d<1000?` · ห่างจากจุดนี้ประมาณ ${d} ม.`:` · ห่างจากจุดนี้ประมาณ ${(d/1000).toFixed(1)} กม.`}
    msg.textContent=txt},()=>{_ckGeo=null;msg.textContent='ใช้ตำแหน่งไม่ได้ (ไม่อนุญาตหรือสัญญาณไม่พอ) ยังเช็กอินได้โดยไม่ใช้ตำแหน่ง'},{enableHighAccuracy:true,timeout:10000,maximumAge:60000})}
async function saveCheckin(sid){
  const btn=$('ckSave');
  try{
    const name=$('ckName').value.trim();if(!name)throw new Error('กรุณาใส่ชื่อสถานที่');
    const pv=$('ckProv').value;if(!pv)throw new Error('กรุณาเลือกจังหวัด (หรือ "นอกประเทศไทย")');
    const abroad=pv==='__abroad__';let country='TH';
    if(abroad){country=($('ckCountry').value||'').trim().toUpperCase();if(!/^[A-Z]{2,3}$/.test(country))throw new Error('กรุณาใส่รหัสประเทศ 2-3 ตัวอักษร เช่น JP')}
    const s=sid?cache.schedules.find(x=>x.id===sid):null,info=abroad?null:provinceInfo(pv);
    const lat=_ckGeo?_ckGeo.lat:(s&&s.location_lat!=null?s.location_lat:null),lng=_ckGeo?_ckGeo.lng:(s&&s.location_lng!=null?s.location_lng:null);
    if(btn)btn.disabled=true;
    const {error}=await sb.from('checkins').insert({trip_id:s?.trip_id||curTripId||null,schedule_id:s?.id||null,place_name:name,province:abroad?null:pv,region:info?info.region:null,country,lat,lng,note:$('ckNote').value.trim()||null});
    if(error)throw error;
    _checkins=null;closeModal();toast('เช็กอินแล้ว');if($('portfolio')?.classList.contains('active'))renderPortfolio()
  }catch(e){if(btn)btn.disabled=false;err(e)}}
async function deleteCheckin(id){if(!confirm('ลบการเช็กอินนี้?'))return;try{const {error}=await sb.from('checkins').delete().eq('id',id);if(error)throw error;_checkins=null;renderPortfolio()}catch(e){err(e)}}
async function renderPortfolio(){
  const box=$('portfolioBox');if(!box)return;box.innerHTML='<div class="card muted">กำลังโหลด...</div>';
  try{
    const list=await loadCheckins(true),st=portfolioStats(list);
    if(!list.length){box.innerHTML=`<div class="card empty">${lineIcon('pincheck',40)}<br><b>ยังไม่มีการเช็กอิน</b><br><span class="mini">กดปุ่ม "เช็กอิน" ในรายการของ Schedule เมื่อไปถึงสถานที่ เหรียญและหมุดจะเริ่มสะสมที่นี่</span><br><br><button type="button" class="btn" onclick="openCheckin()">＋ เช็กอินสถานที่แรก</button></div>`;return}
    const stat=(v,l)=>`<div class="card pfstat"><b>${v}</b><span>${l}</span></div>`;
    const visited=new Set(list.filter(c=>c.province).map(c=>c.province));
    const years=Object.keys(st.byYear).sort().reverse();
    box.innerHTML=`<div class="pfgrid">${stat(st.provinceCount+'/'+st.provinceTotal,'จังหวัดที่เคยไป')}${stat(st.countryCount,'ประเทศ')}${stat(st.placeCount,'สถานที่เช็กอิน')}${stat(st.tripCount,'ทริป')}</div>
      <div id="pfMapCard" class="card hide"><div id="pfMap" class="leafmap"></div><div class="mini muted" style="margin-top:6px">หมุดแสดงเฉพาะเช็กอินที่มีพิกัด</div></div>
      <div class="card"><h3 style="display:flex;align-items:center;gap:8px">${lineIcon('trophy',20)} เหรียญพิชิตภาค <span class="badge">${st.medals}/${st.regions.length}</span></h3>${st.regions.map(r=>`<div class="medalrow"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${esc(r.name)}${r.medal?' <span class="medal">เหรียญ</span>':''}</b><span class="muted">${r.done}/${r.total}</span></div><div class="pbar"><i style="width:${Math.round(r.done*100/r.total)}%"></i></div></div>`).join('')}<div class="mini muted" style="margin-top:8px">เช็กอินครบทุกจังหวัดของภาคเพื่อรับเหรียญ</div></div>
      ${visited.size?`<div class="card"><h3>จังหวัดที่เคยไป</h3><div class="pchips">${[...visited].map(p=>`<span class="pchip on">${esc(p)}</span>`).join('')}</div></div>`:''}
      <div class="card"><h3>ไทม์ไลน์</h3>${years.map(y=>`<div class="tlyear">${esc(LANG==='en'?y:String(thaiYear(Number(y))))}</div>${st.byYear[y].map(c=>`<div class="tlrow"><span class="tlic">${lineIcon('pincheck',20)}</span><div style="flex:1;min-width:0"><b>${esc(c.place_name)}</b><div class="mini muted">${esc(c.province||c.country)} · ${esc(fmtDate((c.checked_in_at||'').slice(0,10),{day:'numeric',month:'short'}))}${c.note?' · '+esc(c.note):''}</div></div><button type="button" class="iconbtn sm del" aria-label="ลบ" onclick="deleteCheckin('${c.id}')">${lineIcon('trash',16)}</button></div>`).join('')}`).join('')}</div>`;
    const pins=list.filter(c=>c.lat!=null&&c.lng!=null);
    if(pins.length){try{const L=await loadLeaflet();$('pfMapCard')?.classList.remove('hide');const m=makeLeafMap('pfMap',L);pins.forEach(c=>L.circleMarker([c.lat,c.lng],{radius:7,color:'#fff',weight:2,fillColor:'#1677ff',fillOpacity:.95}).bindPopup(esc(c.place_name)).addTo(m));fitPins(m,L,pins.map(c=>[c.lat,c.lng]))}catch(e){}}
  }catch(e){box.innerHTML='';err(e)}}
