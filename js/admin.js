// admin.js — หน้า Developer (เฉพาะบัญชีใน app_admins): ภาพรวมระบบ (สถิติรวม ไม่มีข้อมูลส่วนตัว) · ช่องโฆษณา/แบนเนอร์ · แคมเปญข้อเสนอ · พันธมิตร
// เปลี่ยนค่าได้เองโดยไม่ต้องอัปโหลดแอปใหม่ — ค่าทั้งหมดเก็บในฐานข้อมูลและแอปอ่านตอนเปิด · กุญแจ API ของพันธมิตรไม่อยู่ในหน้านี้
let isContentAdmin=false,adminView='hub',_adm={slots:[],banners:[],camps:[],cstats:{},partners:[],adst:{},pst:{},mon:{}},_ef={},_bnFile=null;
const SLOT_SIZE_PX={'320x50':[640,100],'320x100':[640,200],'300x250':[600,500]};
const KIND_LABEL={anniversary:'ครบรอบปี',inactive:'ไม่ได้เที่ยวนาน',season:'ช่วงฤดูกาล',general:'ดีลทั่วไป'};
const POLICY_LABEL={once:'ครั้งเดียวเมื่อเข้าเงื่อนไข',daily:'วันละครั้ง',weekly:'สัปดาห์ละครั้ง'};
const PARTNER_CAT={stay:'ที่พัก',ticket:'ตั๋วเดินทาง',car:'รถ/รับส่ง',insurance:'ประกัน',tour:'ทัวร์',esim:'eSIM',deal:'ดีล',other:'อื่นๆ'};
const _isHttp=u=>/^https?:\/\/[^\s]+$/i.test(String(u||'').trim());
function _swHtml(id,on,fn){return `<label class="swlabel"><input type="checkbox" id="${id}" ${on?'checked':''} onchange="${fn}" style="width:24px;height:24px;accent-color:#1677ff"><span>เปิด</span></label>`}
function _chips(k,opts,sel){return `<div class="pchips">${Object.entries(opts).map(([v,l])=>`<button type="button" class="pchip${v===sel?' on':''}" data-k="${k}" data-v="${v}" onclick="efSet(this)">${l}</button>`).join('')}</div>`}
function efSet(b){_ef[b.dataset.k]=b.dataset.v;b.parentElement.querySelectorAll('.pchip').forEach(x=>x.classList.toggle('on',x===b));if(b.dataset.k==='cKind')campKindChange();if(b.dataset.k==='sSrc')slotSrcChange()}
function adminBack(){return `<button type="button" class="btn secondary sm" onclick="adminGo('hub')">‹ ผู้ดูแล</button>`}
function _adReset(){adsReset();document.querySelectorAll('.adslot').forEach(e=>{delete e.dataset.banner;delete e.dataset.adsense})}
async function loadAdmin(){
  const since=ymd(new Date(Date.now()-30*86400000)),q=await Promise.all([sb.from('ad_slots').select('*').order('sort'),sb.from('house_banners').select('*').order('created_at',{ascending:false}),sb.from('promo_campaigns').select('*').order('created_at',{ascending:false}),sb.rpc('promo_stats'),sb.from('partners').select('*').order('sort').order('name'),sb.from('ad_stats').select('banner_id,impressions,clicks').gte('day',since),sb.from('partner_stats').select('partner_id,clicks').gte('day',since)]);
  for(const r of q)if(r.error)throw r.error;
  _adm.slots=q[0].data||[];_adm.banners=q[1].data||[];_adm.camps=q[2].data||[];_adm.cstats=Object.fromEntries((q[3].data||[]).map(x=>[x.campaign_id,x]));_adm.partners=q[4].data||[];
  _adm.adst={};(q[5].data||[]).forEach(x=>{const a=_adm.adst[x.banner_id]=_adm.adst[x.banner_id]||{i:0,c:0};a.i+=x.impressions;a.c+=x.clicks});
  _adm.pst={};(q[6].data||[]).forEach(x=>{_adm.pst[x.partner_id]=(_adm.pst[x.partner_id]||0)+x.clicks})}
function adminGo(v){adminView=v;renderAdmin()}
async function renderAdmin(){
  const box=$('adminBox');if(!box)return;
  if(!isContentAdmin){toast('เฉพาะผู้ดูแลระบบ');go('dashboard');return}
  try{await loadAdmin();if(adminView==='monitor')await loadMonitor()}catch(e){return err(e)}
  box.innerHTML=({hub:adminHubHtml,monitor:adminMonitorHtml,slots:adminSlotsHtml,campaigns:adminCampsHtml,partners:adminPartnersHtml}[adminView]||adminHubHtml)()}
function adminHubHtml(){
  const on=_adm.slots.filter(s=>s.enabled&&s.source!=='off').length,live=_adm.camps.filter(c=>c.enabled).length,pon=_adm.partners.filter(p=>p.enabled).length;
  const tile=(ic,t,cap,v)=>`<button type="button" class="card admtile" onclick="adminGo('${v}')"><span class="admic">${lineIcon(ic,22)}</span><b>${t}</b><span class="mini muted">${cap}</span></button>`;
  return `<div class="card"><h3>ตั้งค่าเองได้ ไม่ต้องแก้โค้ด</h3><div class="muted" style="margin-top:4px">เปลี่ยนแบนเนอร์ ลิงก์ และแคมเปญได้ทันที ไม่ต้องอัปโหลดแอปใหม่ ผู้ใช้เห็นผลเมื่อเปิดแอปครั้งถัดไป</div></div>
   <div class="admgrid">${tile('summary','ภาพรวมระบบ','ผู้ใช้ การกดโฆษณา ข้อเสนอ และพันธมิตร (ไม่มีข้อมูลส่วนตัว)','monitor')}${tile('image','ช่องโฆษณา','เปิด/ปิด เลือกแหล่ง เพิ่มแบนเนอร์ได้ไม่จำกัด','slots')}${tile('bell','แคมเปญข้อเสนอ','ป๊อปอัปข้อเสนอ ดู หรือ ปิด','campaigns')}${tile('link','พันธมิตรและลิงก์','เพิ่มพันธมิตรได้ไม่จำกัด','partners')}</div>
   <div class="card"><h3>สถานะตอนนี้</h3><div class="muted" style="line-height:1.9">ช่องโฆษณาที่เปิดอยู่ ${on}/${_adm.slots.length} · แคมเปญที่เปิด ${live} · พันธมิตรที่เปิด ${pon}</div></div>`}
// ---------- ภาพรวมระบบ: สถิติรวมเท่านั้น ไม่มีชื่อ อีเมล ชื่อกลุ่ม/ทริป หรือยอดเงินของใคร (PDPA) ----------
async function loadMonitor(){const {data,error}=await sb.rpc('dev_overview');if(error)throw error;_adm.mon=data||{}}
const _fmtN=v=>Number(v||0).toLocaleString(LANG==='en'?'en-GB':'th-TH');
function adminMonitorHtml(){
  const m=_adm.mon||{},s=m.stats||{},ad=m.ads||{},of=m.offers||{},days=m.daily||[],mx=Math.max(1,...days.map(d=>(d.ad_clicks||0)+(d.partner_clicks||0)+(d.new_users||0)));
  const stat=(v,l)=>`<div class="card monstat"><b>${typeof v==='string'?esc(v):_fmtN(v)}</b><span>${l}</span></div>`;
  const ctr=ad.impressions_30d?((ad.clicks_30d||0)*100/ad.impressions_30d).toFixed(1)+'%':'—';
  const rows=(list,cols)=>list.length?list.map(x=>`<div class="monrow"><span class="monname">${esc(x.title||x.name||'')}</span><span class="mini muted">${cols(x)}</span></div>`).join(''):'<div class="muted mini">ยังไม่มีข้อมูล</div>';
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px">${adminBack()}</div>
   <div class="card infonote">${lineIcon('lock',18)}<span>สถิติรวมเท่านั้น ไม่มีข้อมูลส่วนตัวของผู้ใช้ (ตามข้อกำหนด PDPA) · "ล็อกอิน" นับจากการล็อกอิน ไม่ใช่ทุกครั้งที่เปิดแอป จึงอาจต่ำกว่าจำนวนผู้ใช้จริง</span></div>
   <div class="monstats">${stat(s.users,'ผู้ใช้ทั้งหมด')}${stat(s.new_users_7d,'สมัครใหม่ 7 วัน')}${stat(s.login_users_7d,'ล็อกอิน 7 วัน')}${stat(s.login_users_30d,'ล็อกอิน 30 วัน')}${stat(s.groups,'Group')}${stat(_fmtN(s.active_trips)+' / '+_fmtN(s.trips),'Trip (ใช้งาน/ทั้งหมด)')}${stat(s.schedules,'รายการ Schedule')}${stat(s.expenses,'รายการค่าใช้จ่าย')}${stat(s.checkins,'การเช็กอิน')}</div>
   <div class="card"><h3>โฆษณาและข้อเสนอ (30 วัน)</h3><div class="monads"><div><b>${_fmtN(ad.impressions_30d)}</b><span>โฆษณาแสดง</span></div><div><b>${_fmtN(ad.clicks_30d)}</b><span>กดโฆษณา</span></div><div><b>${ctr}</b><span>อัตราการกด</span></div></div><div class="monads"><div><b>${_fmtN(of.shown_30d)}</b><span>ข้อเสนอเด้ง</span></div><div><b>${_fmtN(of.views_30d)}</b><span>กด "ดู"</span></div><div><b>${_fmtN(of.closes_30d)}</b><span>กด "ปิด"</span></div></div></div>
   <div class="card"><h3>14 วันล่าสุด</h3>${days.map(d=>{const t=(d.ad_clicks||0)+(d.partner_clicks||0)+(d.new_users||0);return `<div class="dayrow"><span class="dayname">${esc(fmtDate(d.day,{day:'numeric',month:'short'}))}</span><span class="monbarwrap"><i class="monbar" style="width:${Math.round(t*100/mx)}%"></i></span><span class="mini muted dayn">ใหม่ ${_fmtN(d.new_users)} · โฆษณา ${_fmtN(d.ad_clicks)} · พันธมิตร ${_fmtN(d.partner_clicks)}</span></div>`}).join('')||'<div class="muted mini">ยังไม่มีข้อมูล</div>'}</div>
   <div class="card"><h3>แบนเนอร์ของเรา (30 วัน)</h3>${rows(m.banners||[],x=>`ช่อง ${esc(x.slot_key)} · โชว์ ${_fmtN(x.impressions)} · กด ${_fmtN(x.clicks)}`)}</div>
   <div class="card"><h3>Gateway: การคลิกออกไปพันธมิตร (30 วัน)</h3>${rows(m.partners||[],x=>`${esc(PARTNER_CAT[x.category]||x.category)} · กด ${_fmtN(x.clicks)} ครั้ง`)}</div>`}
// ---------- ช่องโฆษณา ----------
function adminSlotsHtml(){
  const SRC={off:'ปิด',house:'แบนเนอร์ของเรา',adsense:'AdSense'};
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px">${adminBack()}</div>`+_adm.slots.map(s=>{const n=_adm.banners.filter(b=>b.slot_key===s.key).length;
    return `<div class="card"><div class="row" style="flex-wrap:nowrap;gap:10px;align-items:center"><div style="flex:1;min-width:0"><b>${esc(s.label)}</b><div class="mini muted">ขนาด ${esc(s.size)} · แหล่ง: ${SRC[s.source]} · แบนเนอร์ ${n} รายการ</div></div>${_swHtml('slotOn_'+s.key,s.enabled,`toggleSlot('${s.key}',this.checked)`)}</div><div style="margin-top:6px"><button type="button" class="btn sm secondary" onclick="openSlotEdit('${s.key}')">แก้ไขช่องนี้</button></div></div>`}).join('')+
    `<div class="mini muted" style="margin:6px 2px">ตำแหน่งช่องโฆษณาในแอปเตรียมไว้ล่วงหน้า เปิด/ปิด และใส่แบนเนอร์ได้ไม่จำกัดจำนวน แต่การเพิ่ม "ตำแหน่ง" ใหม่ในหน้าจอ ต้องให้นักพัฒนาทำครั้งเดียว</div>`}
async function toggleSlot(k,on){try{const {error}=await sb.from('ad_slots').update({enabled:on}).eq('key',k);if(error)throw error;_adReset();toast(on?'เปิดช่องแล้ว':'ปิดช่องแล้ว');renderAdmin()}catch(e){err(e);renderAdmin()}}
function openSlotEdit(k){
  const s=_adm.slots.find(x=>x.key===k);_ef={sSrc:s.source};
  const banners=_adm.banners.filter(b=>b.slot_key===k);
  modal(`<div class="sheethead"><h3>แก้ไข: ${esc(s.label)}</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="closeModal()">ปิด</button></div>
   <div class="field"><label>แหล่งโฆษณา</label>${_chips('sSrc',{off:'ปิด',house:'แบนเนอร์ของเรา',adsense:'AdSense'},s.source)}</div>
   <div id="slotAdsense" class="${s.source==='adsense'?'':'hide'}"><div class="field"><label>รหัสผู้เผยแพร่ (ca-pub-…)</label><input id="sAsClient" value="${esc(s.adsense_client||'')}" placeholder="ca-pub-1234567890123456" autocomplete="off"></div><div class="field"><label>รหัสช่องโฆษณา (ตัวเลข)</label><input id="sAsSlot" value="${esc(s.adsense_slot||'')}" placeholder="1234567890" inputmode="numeric" autocomplete="off"></div><div class="mini muted">ใช้ได้เมื่อบัญชี AdSense ของคุณอนุมัติเว็บไซต์แล้ว</div></div>
   <div id="slotHouse"><div id="slotHouseHint" class="infonote mini ${s.source==='house'?'hide':''}" style="margin-bottom:8px;padding:8px 10px;border-radius:12px">แบนเนอร์จะแสดงในแอปเมื่อเลือกแหล่ง "แบนเนอร์ของเรา" แล้วกดบันทึก</div><div class="field"><label>แบนเนอร์ในช่องนี้ (หมุนเวียนกัน เพิ่มได้ไม่จำกัด)</label>${banners.length?banners.map(b=>{const st=_adm.adst[b.id]||{i:0,c:0};return `<div class="bnrow"><img src="${esc(b.image_url)}" alt="" class="bnthumb"><div style="flex:1;min-width:0"><b>${esc(b.title||'แบนเนอร์')}</b><div class="mini muted">น้ำหนัก ${b.weight} · โชว์ ${st.i} · คลิก ${st.c} (30 วัน)${b.enabled?'':' · ปิดอยู่'}</div></div><button type="button" class="iconbtn sm" aria-label="แก้ไข" onclick="openBannerEdit('${k}','${b.id}')">${lineIcon('pencil',16)}</button><button type="button" class="iconbtn sm del" aria-label="ลบ" onclick="deleteBanner('${b.id}','${k}')">${lineIcon('trash',16)}</button></div>`}).join(''):'<div class="muted mini">ยังไม่มีแบนเนอร์</div>'}</div><button type="button" class="btn secondary" onclick="openBannerEdit('${k}',null)">${lineIcon('plus',18)} เพิ่มแบนเนอร์ใหม่</button></div>
   <div style="margin-top:12px"><button type="button" class="btn" onclick="saveSlot('${k}')">บันทึก</button></div>`,'sheet')}
function slotSrcChange(){const v=_ef.sSrc;$('slotAdsense')?.classList.toggle('hide',v!=='adsense');$('slotHouseHint')?.classList.toggle('hide',v==='house')}
async function saveSlot(k){
  try{const src=_ef.sSrc||'off',patch={source:src};
    if(src==='adsense'){const c=$('sAsClient').value.trim(),sl=$('sAsSlot').value.trim();if(!/^ca-pub-[0-9]{6,32}$/.test(c))throw new Error('รหัสผู้เผยแพร่ต้องขึ้นต้น ca-pub- ตามด้วยตัวเลข');if(!/^[0-9]{4,20}$/.test(sl))throw new Error('รหัสช่องโฆษณาต้องเป็นตัวเลข 4-20 หลัก');patch.adsense_client=c;patch.adsense_slot=sl}
    const {error}=await sb.from('ad_slots').update(patch).eq('key',k);if(error)throw error;_adReset();closeModal();toast('บันทึกแล้ว');renderAdmin()}catch(e){err(e)}}
function openBannerEdit(slotKey,id){
  const s=_adm.slots.find(x=>x.key===slotKey),b=id?_adm.banners.find(x=>x.id===id):{weight:1,enabled:true};_bnFile=null;
  const d=iso=>iso?ymd(new Date(iso)):'';
  modal(`<div class="sheethead"><h3>${id?'แก้ไขแบนเนอร์':'เพิ่มแบนเนอร์'} · ${esc(s.label)}</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="openSlotEdit('${slotKey}')">กลับ</button></div>
   <div class="field"><label>รูปแบนเนอร์ (${esc(s.size)})</label><div id="bnPrev" class="bnprev">${b.image_url?`<img src="${esc(b.image_url)}" alt="">`:'ยังไม่ได้เลือกรูป'}</div><input type="file" id="bnFile" accept="image/*" onchange="bnPick('${slotKey}',this)"></div>
   <div class="field"><label>ชื่อ (ไว้ดูเองในหลังบ้าน)</label><input id="bnTitle" value="${esc(b.title||'')}" maxlength="120"></div>
   <div class="field"><label>ลิงก์ปลายทาง (http/https)</label><input id="bnLink" value="${esc(b.link_url||'')}" placeholder="https://…" inputmode="url" autocomplete="off"></div>
   <div class="field"><label>ข้อความแทนรูป</label><input id="bnAlt" value="${esc(b.alt||'')}" maxlength="160"></div>
   <div class="grid2 keep2"><div class="field"><label>เริ่มแสดง</label><input id="bnFrom" type="date" value="${d(b.starts_at)}"></div><div class="field"><label>หยุดแสดง</label><input id="bnTo" type="date" value="${d(b.ends_at)}"></div></div>
   <div class="grid2 keep2"><div class="field"><label>น้ำหนัก (1-100)</label><input id="bnW" type="number" min="1" max="100" value="${b.weight||1}"></div><div class="field"><label>สถานะ</label>${_swHtml('bnOn',b.enabled!==false,'')}</div></div>
   <button type="button" class="btn" onclick="saveBanner('${slotKey}','${id||''}')">บันทึก</button>`,'sheet')}
async function bnPick(slotKey,input){
  const f=input.files&&input.files[0];if(!f)return;const s=_adm.slots.find(x=>x.key===slotKey),[w,h]=SLOT_SIZE_PX[s.size]||[640,100];
  const out=await openCropper(f,{w,h,guide:'none',title:'เลือกตำแหน่งรูปแบนเนอร์'});if(!out){input.value='';return}
  _bnFile=out;$('bnPrev').innerHTML=`<img src="${URL.createObjectURL(out)}" alt="">`}
async function saveBanner(slotKey,id){
  try{
    const link=$('bnLink').value.trim();if(link&&!_isHttp(link))throw new Error('ลิงก์ปลายทางต้องขึ้นต้นด้วย http:// หรือ https://');
    const w=Number($('bnW').value);if(!(w>=1&&w<=100))throw new Error('น้ำหนักต้องอยู่ระหว่าง 1-100');
    const from=$('bnFrom').value,to=$('bnTo').value;if(from&&to&&to<from)throw new Error('วันหยุดแสดงต้องไม่ก่อนวันเริ่มแสดง');
    const old=id?_adm.banners.find(x=>x.id===id):null;let url=old?.image_url||null;
    if(_bnFile){const path='banners/'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))+'.jpg';const up=await sb.storage.from('ads').upload(path,_bnFile,{contentType:'image/jpeg',upsert:false});if(up.error)throw up.error;url=sb.storage.from('ads').getPublicUrl(path).data.publicUrl}
    if(!url)throw new Error('กรุณาเลือกรูปแบนเนอร์');
    const row={slot_key:slotKey,title:$('bnTitle').value.trim()||null,image_url:url,link_url:link||null,alt:$('bnAlt').value.trim()||null,weight:w,starts_at:from?new Date(from+'T00:00:00').toISOString():null,ends_at:to?new Date(to+'T23:59:59').toISOString():null,enabled:$('bnOn').checked};
    const r=id?await sb.from('house_banners').update(row).eq('id',id):await sb.from('house_banners').insert(row);if(r.error)throw r.error;
    const sl=_adm.slots.find(x=>x.key===slotKey);let note='บันทึกแบนเนอร์แล้ว';
    if(_ef.sSrc==='house'&&sl.source!=='house'){const u=await sb.from('ad_slots').update({source:'house'}).eq('key',slotKey);if(u.error)throw u.error;note='บันทึกแบนเนอร์แล้ว และเปลี่ยนแหล่งของช่องนี้เป็น "แบนเนอร์ของเรา"'}
    _adReset();toast(note);await loadAdmin();openSlotEdit(slotKey)}catch(e){err(e)}}
async function deleteBanner(id,slotKey){if(!confirm('ลบแบนเนอร์นี้?'))return;try{const {error}=await sb.from('house_banners').delete().eq('id',id);if(error)throw error;_adReset();await loadAdmin();openSlotEdit(slotKey)}catch(e){err(e)}}
// ---------- แคมเปญข้อเสนอ ----------
function adminCampsHtml(){
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px">${adminBack()}<button type="button" class="btn sm" onclick="openCampEdit(null)">＋ สร้างแคมเปญ</button></div>`+(_adm.camps.length?_adm.camps.map(c=>{const st=_adm.cstats[c.id]||{shown:0,views:0,closes:0};
    return `<div class="card"><div class="row" style="flex-wrap:nowrap;gap:10px;align-items:flex-start"><div style="flex:1;min-width:0"><b>${esc(c.title)}</b><div class="mini muted">กฎ: ${KIND_LABEL[c.kind]} · ${POLICY_LABEL[c.show_policy]}</div><div class="mini muted">เด้ง ${st.shown} ครั้ง · กด "ดู" ${st.views} · กด "ปิด" ${st.closes}</div></div>${_swHtml('campOn_'+c.id,c.enabled,`toggleCamp('${c.id}',this.checked)`)}</div><div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn sm secondary" onclick="openCampEdit('${c.id}')">แก้ไข</button><button type="button" class="btn sm danger" onclick="deleteCamp('${c.id}')">ลบ</button></div></div>`}).join(''):'<div class="card empty">ยังไม่มีแคมเปญ</div>')+
    `<div class="mini muted" style="margin:6px 2px">ผู้ใช้เลือกได้เพียง "ดู" หรือ "ปิด" ที่ป๊อปอัป ไม่มีตัวเลือกปิดถาวร · ข้อความทุกข้อมีป้าย "ข้อเสนอ" · ใส่โฆษณา Google (AdSense/AdMob) ในป๊อปอัปไม่ได้</div>`}
async function toggleCamp(id,on){try{const {error}=await sb.from('promo_campaigns').update({enabled:on}).eq('id',id);if(error)throw error;renderAdmin()}catch(e){err(e);renderAdmin()}}
function openCampEdit(id){
  const c=id?_adm.camps.find(x=>x.id===id):{kind:'inactive',show_policy:'once',priority:0,enabled:true,params:{},cta_label:'ดู'};_ef={cKind:c.kind,cPol:c.show_policy};const d=iso=>iso?ymd(new Date(iso)):'',p=c.params||{};
  modal(`<div class="sheethead"><h3>${id?'แก้ไขแคมเปญ':'สร้างแคมเปญ'}</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="closeModal()">ปิด</button></div>
   <div class="field"><label>ชื่อ/หัวข้อที่ผู้ใช้เห็น</label><input id="cTitle" value="${esc(c.title||'')}" maxlength="120"></div>
   <div class="field"><label>ข้อความ</label><textarea id="cBody" rows="2" maxlength="400">${esc(c.body||'')}</textarea></div>
   <div class="field"><label>เมื่อไหร่ถึงจะเด้ง</label>${_chips('cKind',KIND_LABEL,c.kind)}</div>
   <div class="field" id="cParamBox"></div>
   <div class="field"><label>ข้อความบนปุ่ม "ดู"</label><input id="cCta" value="${esc(c.cta_label||'ดู')}" maxlength="30"></div>
   <div class="field"><label>ลิงก์เมื่อกด "ดู" (ลิงก์พันธมิตรหรือหน้าเว็บ)</label><input id="cLink" value="${esc(c.link_url||'')}" placeholder="https://…" inputmode="url" autocomplete="off"></div>
   <div class="field"><label>เด้งบ่อยแค่ไหน</label>${_chips('cPol',POLICY_LABEL,c.show_policy)}</div>
   <div class="grid2 keep2"><div class="field"><label>เริ่ม</label><input id="cFrom" type="date" value="${d(c.starts_at)}"></div><div class="field"><label>สิ้นสุด</label><input id="cTo" type="date" value="${d(c.ends_at)}"></div></div>
   <div class="grid2 keep2"><div class="field"><label>ลำดับความสำคัญ</label><input id="cPri" type="number" value="${c.priority||0}"></div><div class="field"><label>สถานะ</label>${_swHtml('cOn',c.enabled!==false,'')}</div></div>
   <div class="mini muted" style="margin:4px 0 10px">ป๊อปอัปเด้งหลังหน้าหลักโหลดเสร็จ มีปุ่มปิดให้กดได้ทันที และเด้งครั้งเดียวต่อการเปิดแอป</div>
   <button type="button" class="btn" onclick="saveCamp('${id||''}')">บันทึกแคมเปญ</button>`,'sheet');
  window._campParams=p;campKindChange()}
function campKindChange(){
  const k=_ef.cKind,p=window._campParams||{},box=$('cParamBox');if(!box)return;
  box.innerHTML=k==='inactive'?`<label>ไม่ได้เที่ยวเกินกี่วัน</label><input id="cDays" type="number" min="1" value="${p.days||30}">`:k==='anniversary'?`<label>เด้งภายในกี่วันหลังวันครบรอบ</label><input id="cWin" type="number" min="0" value="${Number.isFinite(+p.window_days)?p.window_days:3}">`:k==='season'?'<div class="muted mini">ฤดูกาล: ใส่วัน "เริ่ม" และ "สิ้นสุด" ด้านล่าง ข้อเสนอจะเด้งครั้งเดียวในช่วงนั้น</div>':'<div class="muted mini">ดีลทั่วไป: เด้งครั้งเดียวในช่วงวันที่ที่กำหนด (หรือตลอดไปถ้าไม่ใส่วัน)</div>'}
async function saveCamp(id){
  try{
    const title=$('cTitle').value.trim();if(!title)throw new Error('กรุณาใส่หัวข้อ');
    const link=$('cLink').value.trim();if(link&&!_isHttp(link))throw new Error('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
    const from=$('cFrom').value,to=$('cTo').value;if(from&&to&&to<from)throw new Error('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
    const kind=_ef.cKind;if(kind==='season'&&!from&&!to)throw new Error('ฤดูกาลต้องใส่วันเริ่มหรือวันสิ้นสุดอย่างน้อยหนึ่งวัน');
    const params=kind==='inactive'?{days:Math.max(1,Number($('cDays').value)||30)}:kind==='anniversary'?{window_days:Math.max(0,Number($('cWin').value)||0)}:{};
    const row={title,body:$('cBody').value.trim()||null,kind,params,cta_label:$('cCta').value.trim()||'ดู',link_url:link||null,show_policy:_ef.cPol||'once',priority:Number($('cPri').value)||0,starts_at:from?new Date(from+'T00:00:00').toISOString():null,ends_at:to?new Date(to+'T23:59:59').toISOString():null,enabled:$('cOn').checked};
    const r=id?await sb.from('promo_campaigns').update(row).eq('id',id):await sb.from('promo_campaigns').insert(row);if(r.error)throw r.error;
    closeModal();toast('บันทึกแคมเปญแล้ว');renderAdmin()}catch(e){err(e)}}
async function deleteCamp(id){if(!confirm('ลบแคมเปญนี้? (ประวัติที่ผู้ใช้เคยเห็นจะยังอยู่ในหน้าข้อเสนอของเขา)'))return;try{const {error}=await sb.from('promo_campaigns').delete().eq('id',id);if(error)throw error;renderAdmin()}catch(e){err(e)}}
// ---------- พันธมิตร ----------
function adminPartnersHtml(){
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px">${adminBack()}<button type="button" class="btn sm" onclick="openPartnerEdit(null)">＋ เพิ่มพันธมิตร</button></div>`+(_adm.partners.length?_adm.partners.map(p=>`<div class="card"><div class="row" style="flex-wrap:nowrap;gap:10px;align-items:flex-start"><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="mini muted">${PARTNER_CAT[p.category]} · คลิก ${(_adm.pst[p.id]||0)} ครั้ง (30 วัน)</div><div class="mini muted">รหัสติดตาม: ${esc(p.affiliate_id||'—')}</div></div>${_swHtml('ptOn_'+p.id,p.enabled,`togglePartner('${p.id}',this.checked)`)}</div><div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn sm secondary" onclick="openPartnerEdit('${p.id}')">แก้ไข</button><button type="button" class="btn sm danger" onclick="deletePartner('${p.id}')">ลบ</button></div></div>`).join(''):'<div class="card empty">ยังไม่มีพันธมิตร</div>')+
   `<div class="card infonote">${lineIcon('lock',18)}<span>กุญแจ API ของพันธมิตรเก็บไว้ในระบบหลังบ้านที่ปลอดภัย ไม่แสดงและไม่แก้ในหน้านี้ · นับเฉพาะการคลิกที่พาออกไปจอง ค่าคอมมิชชันจริงดูในระบบของแต่ละพันธมิตร</span></div>`}
async function togglePartner(id,on){try{const {error}=await sb.from('partners').update({enabled:on}).eq('id',id);if(error)throw error;renderAdmin()}catch(e){err(e);renderAdmin()}}
function openPartnerEdit(id){
  const p=id?_adm.partners.find(x=>x.id===id):{category:'stay',enabled:true,sort:0};_ef={pCat:p.category};
  modal(`<div class="sheethead"><h3>${id?'แก้ไขพันธมิตร':'เพิ่มพันธมิตรใหม่'}</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="closeModal()">ปิด</button></div>
   <div class="field"><label>ชื่อพันธมิตร</label><input id="pName" value="${esc(p.name||'')}" maxlength="80"></div>
   <div class="field"><label>ประเภท</label>${_chips('pCat',PARTNER_CAT,p.category)}</div>
   <div class="field"><label>รูปแบบลิงก์</label><input id="pLink" value="${esc(p.link_template||'')}" placeholder="https://…?aid=[รหัส]&dest={ปลายทาง}" inputmode="url" autocomplete="off"></div>
   <div class="field"><label>รหัสติดตามของคุณ (Affiliate ID)</label><input id="pAid" value="${esc(p.affiliate_id||'')}" maxlength="120" autocomplete="off"></div>
   <div class="grid2 keep2"><div class="field"><label>ลำดับ</label><input id="pSort" type="number" value="${p.sort||0}"></div><div class="field"><label>สถานะ</label>${_swHtml('pOn',p.enabled!==false,'')}</div></div>
   <div class="mini muted" style="margin-bottom:10px">ใช้ได้กับพันธมิตรที่ส่งต่อด้วยลิงก์ ส่วนพันธมิตรที่ต้องดึงราคาผ่าน API ต้องให้นักพัฒนาเชื่อมต่อให้ครั้งเดียว</div>
   <button type="button" class="btn" onclick="savePartner('${id||''}')">${id?'บันทึก':'เพิ่มพันธมิตร'}</button>`,'sheet')}
async function savePartner(id){
  try{const name=$('pName').value.trim();if(!name)throw new Error('กรุณาใส่ชื่อพันธมิตร');const link=$('pLink').value.trim();if(link&&!_isHttp(link))throw new Error('รูปแบบลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
    const row={name,category:_ef.pCat||'other',link_template:link||null,affiliate_id:$('pAid').value.trim()||null,sort:Number($('pSort').value)||0,enabled:$('pOn').checked};
    const r=id?await sb.from('partners').update(row).eq('id',id):await sb.from('partners').insert(row);if(r.error)throw r.error;closeModal();toast('บันทึกพันธมิตรแล้ว');renderAdmin()}catch(e){err(e)}}
async function deletePartner(id){if(!confirm('ลบพันธมิตรนี้?'))return;try{const {error}=await sb.from('partners').delete().eq('id',id);if(error)throw error;renderAdmin()}catch(e){err(e)}}
