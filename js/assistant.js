// assistant.js — AI Travel Assistant V1 (หน้าแชต + พรีวิวตาราง + ยืนยันก่อนบันทึก)
// เรียก Supabase Edge Function "ai-travel-assistant" ผ่าน sb.functions.invoke (ใช้ session/ไคลเอนต์เดิม ไม่มี API key ในฝั่งเบราว์เซอร์)
// ผู้ช่วยเสนอได้อย่างเดียว: การบันทึกลง Schedule ทำหลังผู้ใช้กดยืนยัน และเซิร์ฟเวอร์ตรวจสิทธิ์/ความซ้ำอีกชั้น
(function(){
const MAXLEN=1000;
const CAT_TH={hotel:'ที่พัก',cafe:'คาเฟ่',restaurant:'ร้านอาหาร',attraction:'สถานที่ท่องเที่ยว',shopping:'ช้อปปิ้ง/ตลาด',nature:'ธรรมชาติ/จุดชมวิว',activity:'กิจกรรม',other:'อื่นๆ'};
const CAT_EN={hotel:'Stay',cafe:'Cafe',restaurant:'Restaurant',attraction:'Attraction',shopping:'Shopping / market',nature:'Nature / viewpoint',activity:'Activity',other:'Other'};
const S={cfg:null,cfgState:'loading',msgs:[],busy:false,tripId:'',origin:'',itin:null,lastUser:'',consent:false,nid:1,retryUntil:0,placesSource:'none',mounted:false};
const A=(th,en)=>(typeof LANG!=='undefined'&&LANG==='en')?en:th;
const $a=id=>document.getElementById(id);
const catName=c=>(A(CAT_TH,CAT_EN))[c]||(A(CAT_TH,CAT_EN)).other;
const uid=()=>(typeof currentUser!=='undefined'&&currentUser)?currentUser.id:'anon';
const HKEY=()=>'ftg_ai_hist_'+uid(), CKEY=()=>'ftg_ai_consent_v1_'+uid();
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function isMapLink(u){try{const x=new URL(u);return x.protocol==='https:'&&(/^(www\.)?google\.[a-z.]{2,7}$/i.test(x.hostname)&&x.pathname.startsWith('/maps')||/^maps\.google\.[a-z.]{2,7}$/i.test(x.hostname)||x.hostname==='maps.app.goo.gl')}catch(e){return false}}
function searchUrl(name,dest){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((name+' '+(dest||'')).trim())}
function addDays(ds,n){const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fmtDate(ds){try{return new Date(ds+'T00:00:00').toLocaleDateString(LANG==='en'?'en-GB':'th-TH',{day:'numeric',month:'short',year:'numeric'})}catch(e){return ds}}
const tmin=s=>Number(s.slice(0,2))*60+Number(s.slice(3,5));

// ---------- เรียก Edge Function ----------
async function invoke(body){
  let r;
  try{
    const call=sb.functions.invoke('ai-travel-assistant',{body});
    r=await Promise.race([call,new Promise((_,rej)=>setTimeout(()=>rej(new Error('client_timeout')),55000))]);
  }catch(e){return {ok:false,code:'client_timeout',message:A('ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง','Taking too long. Please try again.'),retryable:true}}
  if(!r.error&&r.data&&r.data.ok)return r.data;
  if(r.data&&r.data.ok===false)return {...r.data,code:r.data.code||r.data.error};
  const err=r.error||{};let j=null;const st=err.context&&err.context.status;
  try{if(err.context&&typeof err.context.json==='function')j=await err.context.json()}catch(e){}
  if(j&&(j.error||j.code))return {...j,ok:false,code:j.code||j.error,status:st};
  if(st===404)return {ok:false,code:'not_deployed',status:404,message:A('ผู้ช่วย AI ยังไม่ได้ติดตั้งบนเซิร์ฟเวอร์','The AI assistant is not installed on the server yet')};
  if(st===401)return {ok:false,code:'unauthorized',status:401,message:A('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่','Session expired. Please sign in again.')};
  return {ok:false,code:'network',status:st||0,message:A('เชื่อมต่อผู้ช่วย AI ไม่ได้ กรุณาลองใหม่ภายหลัง','Could not reach the AI assistant. Please try again later.'),retryable:true};
}

// ---------- ประวัติแชต (เก็บในเครื่องนี้ ล้างได้ด้วยปุ่ม "ล้างแชต"): ข้อความ + การ์ดสถานที่ที่แนะนำ + ตารางร่าง ----------
const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
const num=v=>typeof v==='number'&&isFinite(v)?v:null;
const DRE=/^\d{4}-\d\d-\d\d$/;
function cleanCard(c){
  if(!c||typeof c!=='object'||!str(c.name,200).trim())return null;
  return {name:str(c.name,200),category:CAT_TH[c.category]?c.category:'other',verified:c.verified===true,address:str(c.address,300)||null,lat:num(c.lat),lng:num(c.lng),
    url:typeof c.url==='string'&&isMapLink(c.url)?c.url.slice(0,1000):null,rating:num(c.rating),ratings_count:num(c.ratings_count),price_level:str(c.price_level,20)||null,
    hours:Array.isArray(c.hours)?c.hours.slice(0,8).map(x=>str(x,120)).filter(Boolean):[],why:str(c.why,600)}}
function cleanItin(it){
  if(!it||typeof it!=='object'||!Array.isArray(it.days))return null;
  const used=new Set();let mx=0;
  const days=it.days.slice(0,14).map(d=>({day:Math.max(1,Math.min(60,Math.round(Number(d&&d.day))||1)),items:(Array.isArray(d&&d.items)?d.items:[]).slice(0,30).map(x=>{
    if(!x||!str(x.name,160).trim())return null;let id=Math.round(Number(x.id));if(!(id>0)||used.has(id))id=++mx+1000000;used.add(id);mx=Math.max(mx,id);
    return {id,selected:x.selected!==false,name:str(x.name,160),place_name:str(x.place_name,160)||null,category:CAT_TH[x.category]?x.category:'other',verified:x.verified===true,address:str(x.address,300)||null,
      lat:num(x.lat),lng:num(x.lng),url:typeof x.url==='string'&&isMapLink(x.url)?x.url.slice(0,1000):null,start_time:/^\d\d:\d\d$/.test(x.start_time||'')?x.start_time:null,
      duration_min:num(x.duration_min),est_cost_thb:num(x.est_cost_thb),note:str(x.note,500),hop:num(x.hop),
      ...(x.date===null?{date:null}:DRE.test(x.date||'')?{date:x.date}:{}),added:DRE.test(x.added||'')?x.added:null}}).filter(Boolean)})).filter(d=>d.items.length);
  if(!days.length)return null;S.nid=Math.max(S.nid,mx+1);
  return {title:str(it.title,200)||A('ตารางที่เสนอ','Proposed plan'),destination:str(it.destination,120)||null,end_by:/^\d\d:\d\d$/.test(it.end_by||'')?it.end_by:null,saved:false,days}}
function loadHist(){
  S.msgs=[];S.itin=null;
  try{
    const raw=JSON.parse(lsGet(HKEY())||'null');const o=Array.isArray(raw)?{msgs:raw}:(raw&&typeof raw==='object'?raw:{});
    S.msgs=(Array.isArray(o.msgs)?o.msgs:[]).filter(m=>m&&(m.role==='user'||m.role==='assistant')&&typeof m.text==='string').slice(-20).map(m=>{
      const r={role:m.role,text:m.text.slice(0,4000)};if(m.role!=='assistant')return r;
      if(Array.isArray(m.questions))r.questions=m.questions.slice(0,5).map(q=>str(q,200)).filter(Boolean);
      if(Array.isArray(m.cards))r.cards=m.cards.slice(0,12).map(cleanCard).filter(Boolean);
      if(m.itin&&typeof m.itin==='object')r.itin={title:str(m.itin.title,200)};return r});
    S.itin=cleanItin(o.itin);
    if(S.itin){const lb=[...S.msgs].reverse().find(m=>m.role==='assistant');if(lb&&!lb.itin)lb.itin={title:S.itin.title}}
    if(typeof o.dest==='string')S.dest=o.dest.slice(0,120);
    if(!S.tripId&&typeof o.tripId==='string'&&typeof tripById==='function'){const t=tripById(o.tripId);if(t&&t.status!=='closed')S.tripId=t.id}
  }catch(e){S.msgs=[];S.itin=null}
}
function saveHist(){
  const msgs=S.msgs.filter(m=>!m.error).slice(-20);
  if(!msgs.length&&!S.itin){lsDel(HKEY());return}
  const pack=(keepCards)=>JSON.stringify({v:2,tripId:S.tripId||'',dest:S.dest||'',itin:S.itin,
    msgs:msgs.map((m,i)=>{const o={role:m.role,text:m.text};if(m.role==='assistant'){if(m.questions&&m.questions.length)o.questions=m.questions;if(m.cards&&m.cards.length&&(keepCards||i>=msgs.length-4))o.cards=m.cards;if(m.itin)o.itin=m.itin}return o})});
  let j=pack(true);if(j.length>400000)j=pack(false);
  if(!lsSet(HKEY(),j))lsSet(HKEY(),pack(false));
}
function historyForServer(exceptLastUser){const a=S.msgs.filter(m=>!m.error&&m.text);if(exceptLastUser&&a.length&&a[a.length-1].role==='user')a.pop();return a.slice(-8).map(m=>({role:m.role,text:m.text.slice(0,1500)}))}

// ---------- วาดหน้า ----------
const SUGGEST=[
  ['วางแผนเที่ยวเชียงใหม่ 3 วัน','Plan 3 days in Chiang Mai'],['หาคาเฟ่และร้านอาหารใกล้ที่พัก','Find cafes and restaurants near my stay'],
  ['แนะนำโรงแรมตามงบประมาณ','Suggest hotels for my budget'],['จัดทริปตามเวลาที่มี','Plan a trip around the time I have'],
  ['ช่วยวางแผนทริปกลุ่มกับเพื่อน','Help plan a group trip with friends'],['ปรับตารางเดินทางของทริปเดิม','Adjust the schedule of my existing trip']];

function tripOptions(){const ts=(cache&&cache.trips)||[];return `<option value="">${esc(A('ร่างอย่างเดียว (ไม่ผูกกับทริป)','Draft only (no trip)'))}</option>`+ts.filter(t=>t.status!=='closed').map(t=>`<option value="${esc(t.id)}"${t.id===S.tripId?' selected':''}>${esc(t.name||t.trip_no||'Trip')}${t.start_date?' · '+esc(fmtDate(t.start_date)):''}</option>`).join('')}
function statusBanner(){
  if(S.cfgState==='loading')return `<div class="ai-banner">${esc(A('กำลังตรวจสอบสถานะผู้ช่วย AI…','Checking assistant status…'))}</div>`;
  if(S.cfgState==='not_deployed')return `<div class="ai-banner warn"><b>${esc(A('ผู้ช่วย AI ยังไม่ได้เปิดใช้งาน','AI assistant is not enabled yet'))}</b><br>${esc(A('ผู้ดูแลระบบต้องติดตั้ง Edge Function "ai-travel-assistant" และตั้งค่า API key ก่อน (ดูคู่มือ docs/AI_TRAVEL_ASSISTANT_V1.md)','An admin must deploy the "ai-travel-assistant" Edge Function and set the API key first (see docs/AI_TRAVEL_ASSISTANT_V1.md)'))}</div>`;
  if(S.cfgState==='error')return `<div class="ai-banner warn">${esc(S.cfgMsg||'')} <button class="btn sm secondary" data-ai="recheck">${esc(A('ตรวจใหม่','Check again'))}</button></div>`;
  if(S.cfgState==='no_key')return `<div class="ai-banner warn"><b>${esc(A('ยังไม่ได้ตั้งค่า API key ของ AI','The AI API key is not set'))}</b><br>${esc(A('ติดตั้งฟังก์ชันแล้ว แต่ผู้ดูแลยังไม่ได้ใส่ API key ของผู้ให้บริการ AI','The function is deployed but the provider API key has not been added yet'))}</div>`;
  const c=S.cfg||{};let h='';
  if(!c.places_configured)h=`<div class="ai-banner info">${esc(A('ยังไม่ได้เชื่อมการค้นหาสถานที่จริง (Google Places): คำแนะนำสถานที่จะเป็นข้อเสนอจาก AI ที่ ยังไม่ยืนยันกับแผนที่ ทุกรายการ','Real place search (Google Places) is not connected: all places are AI suggestions that are not verified on the map'))}</div>`;
  return h;
}
function render(){
  const box=$a('aiBox');if(!box)return;
  const ready=S.cfgState==='ready';
  const keepScroll=box.querySelector('.ai-log');const wasBottom=!keepScroll||(keepScroll.scrollHeight-keepScroll.scrollTop-keepScroll.clientHeight<80);
  const ta=$a('aiInput');const draft=ta?ta.value:'';const originVal=$a('aiOrigin')?$a('aiOrigin').value:S.origin;
  const tripSel=S.tripId?tripById(S.tripId):null;
  box.innerHTML=`
  <div class="card ai-head">
    <div class="ai-title"><b>✨ AI Travel Assistant</b><span class="ai-beta">${esc(A('เบต้า','Beta'))}</span><div class="spacer"></div><button class="btn sm ghost" data-ai="clear">${esc(A('ล้างแชต','Clear chat'))}</button></div>
    ${statusBanner()}
    <div class="ai-ctrl">
      <div class="field"><label>${esc(A('ทริป','Trip'))}</label><select id="aiTrip" data-ai-change="trip">${tripOptions()}</select></div>
      <div class="field"><label>${esc(A('จุดเริ่มต้น / ที่พัก (ถ้ามี)','Starting point / stay (optional)'))}</label><input id="aiOrigin" maxlength="120" value="${esc(originVal)}" placeholder="${esc(A('เช่น โรงแรมนิมมาน เชียงใหม่','e.g. Nimman hotel, Chiang Mai'))}" data-ai-change="origin"></div>
    </div>
    <div class="mini muted ai-note" data-no-tr="1">${esc(tripSel?A('ข้อความของคุณและตารางเดิมของทริปที่เลือกจะถูกส่งให้ผู้ให้บริการ AI เพื่อสร้างคำตอบ','Your message and the selected trip\'s existing schedule are sent to the AI provider to produce answers'):A('ข้อความของคุณจะถูกส่งให้ผู้ให้บริการ AI เพื่อสร้างคำตอบ ไม่ส่งข้อมูลทริปถ้าไม่ได้เลือกทริป','Your message is sent to the AI provider to produce answers. No trip data is sent unless you select a trip.'))}</div>
  </div>
  <div class="card ai-chat">
    <div class="ai-log" id="aiLog" role="log" aria-live="polite" data-no-tr="1">${logHtml()}</div>
    ${(!S.msgs.some(m=>m.role==='user')&&ready)?`<div class="ai-sug">${SUGGEST.map((s,i)=>`<button class="ai-chip" data-ai="sug" data-i="${i}">${esc(A(s[0],s[1]))}</button>`).join('')}</div>`:''}
    <div class="ai-compose">
      <textarea id="aiInput" rows="2" maxlength="${MAXLEN}" ${(!ready||S.busy)?'disabled':''} placeholder="${esc(ready?A('พิมพ์สิ่งที่อยากให้ช่วย เช่น "จัดทริปเชียงใหม่ 3 วัน 2 คืน งบคนละ 5,000 บาท"','Type what you need, e.g. "Plan 3 days in Chiang Mai, 5,000 THB per person"'):A('ผู้ช่วย AI ยังใช้งานไม่ได้','The assistant is not available yet'))}">${esc(draft)}</textarea>
      <button class="btn" id="aiSend" data-ai="send" ${(!ready||S.busy)?'disabled':''}>${esc(S.busy?A('กำลังคิด…','Thinking…'):A('ส่ง','Send'))}</button>
    </div>
  </div>`;
  const log=$a('aiLog');if(log&&wasBottom)log.scrollTop=log.scrollHeight;
  saveHist();
  if(ta&&!S.busy&&ready&&document.body.dataset.page==='assistant'&&draft){const n=$a('aiInput');if(n){n.focus({preventScroll:true});n.setSelectionRange(draft.length,draft.length)}}
}
function logHtml(){
  let h=`<div class="ai-msg bot"><div class="ai-bub">${esc(A('สวัสดีครับ ยินดีต้อนรับสู่ FriendTrip Go AI Travel Assistant ผมช่วยคุณค้นหาสถานที่ วางแผนเที่ยว จัดเส้นทาง และเตรียมตารางเดินทางได้ครับ วันนี้อยากไปเที่ยวที่ไหน?','Hi! Welcome to the FriendTrip Go AI Travel Assistant. I can help you find places, plan trips, arrange routes and prepare a schedule. Where would you like to go today?'))}</div></div>`;
  const lastBot=(()=>{for(let i=S.msgs.length-1;i>=0;i--)if(S.msgs[i].role==='assistant'&&!S.msgs[i].error)return i;return -1})();
  S.msgs.forEach((m,i)=>{
    if(m.role==='user'){h+=`<div class="ai-msg me"><div class="ai-bub">${esc(m.text)}</div></div>`;return}
    if(m.error){h+=`<div class="ai-msg bot"><div class="ai-bub err"><b>${esc(A('เกิดข้อผิดพลาด','Something went wrong'))}</b><br>${esc(m.text)}${m.retryable!==false?`<div class="ai-retry"><button class="btn sm secondary" data-ai="retry" ${(Date.now()<S.retryUntil||S.busy)?'disabled':''}>${esc(A('ลองใหม่','Retry'))}</button><span class="mini muted" id="aiRetryHint">${retryHint()}</span></div>`:''}</div></div>`;return}
    h+=`<div class="ai-msg bot"><div class="ai-bub">${esc(m.text)}</div>`;
    if(m.questions&&m.questions.length)h+=`<div class="ai-q">${m.questions.map(q=>`<button class="ai-chip" data-ai="fillq" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
    if(m.cards&&m.cards.length){h+=`<div class="ai-cards">${m.cards.map((c,ci)=>cardHtml(c,i,ci)).join('')}</div>`;if(m.cards.some(c=>c.verified))h+=`<div class="mini muted ai-attr">${esc(A('ข้อมูลสถานที่ที่ยืนยันแล้วมาจาก Google Maps · คำอธิบาย "ทำไมถึงเหมาะ" เป็นข้อความจาก AI','Verified place data comes from Google Maps · the "why it fits" text is written by AI'))}</div>`}
    if(m.itin){h+=i===lastBot&&S.itin?itinHtml():`<div class="ai-oldit mini muted">${esc(A('ตารางที่เสนอก่อนหน้า: ','Earlier proposed plan: '))}${esc(m.itin.title)}</div>`}
    h+='</div>';
  });
  if(S.busy)h+=`<div class="ai-msg bot"><div class="ai-bub typing"><i></i><i></i><i></i><span class="sr">${esc(A('กำลังคิด','thinking'))}</span></div></div>`;
  return h;
}
function retryHint(){const s=Math.ceil((S.retryUntil-Date.now())/1000);return s>0?A(`ลองใหม่ได้ในอีก ~${s} วินาที`,`You can retry in ~${s}s`):''}
function cardHtml(c,mi,ci){
  const link=c.verified&&c.url&&isMapLink(c.url)?`<a class="locbtn" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(A('เปิดใน Google Maps','Open in Google Maps'))}</a>`:`<a class="locbtn" href="${esc(searchUrl(c.name,S.dest))}" target="_blank" rel="noopener noreferrer">${esc(A('ค้นหาใน Google Maps','Search in Google Maps'))}</a>`;
  const rating=c.rating!=null?`<span>★ ${esc(String(c.rating))}${c.ratings_count!=null?` (${esc(String(c.ratings_count))} ${esc(A('รีวิว','reviews'))})`:''}</span>`:'';
  const price=c.price_level?`<span>${esc(A('ระดับราคา','Price level'))} ${esc(c.price_level)}</span>`:'';
  const hours=c.hours&&c.hours.length?`<details class="ai-hours"><summary>${esc(A('เวลาเปิด-ปิด (จาก Google)','Opening hours (from Google)'))}</summary>${c.hours.map(x=>`<div>${esc(x)}</div>`).join('')}</details>`:'';
  return `<div class="aicard">
    <div class="aic-top"><b>${esc(c.name)}</b><span class="aic-cat">${esc(catName(c.category))}</span></div>
    ${c.verified?`<div class="aic-ok">✓ ${esc(A('พบใน Google Maps','Found on Google Maps'))}</div>`:`<div class="aic-un">${esc(A('คำแนะนำจาก AI · ยังไม่ยืนยันกับแผนที่','AI suggestion · not verified on the map'))}</div>`}
    ${c.address?`<div class="mini muted">${esc(c.address)}</div>`:''}
    ${(rating||price)?`<div class="mini aic-meta">${rating}${price}</div>`:''}
    ${hours}
    ${c.why?`<p class="aic-why"><span>${esc(A('AI อธิบาย','AI says'))}:</span> ${esc(c.why)}</p>`:''}
    <div class="aic-acts">${link}<button class="locbtn" data-ai="draftadd" data-mi="${mi}" data-ci="${ci}">＋ ${esc(A('ใส่ในร่างตาราง','Add to draft plan'))}</button></div></div>`;
}

// ---------- ตาราง (ร่าง) ----------
function mkItem(c,extra){return {id:S.nid++,selected:true,name:c.name,place_name:c.verified?c.name:null,category:c.category||'other',verified:!!c.verified,address:c.address||null,lat:c.verified?c.lat:null,lng:c.verified?c.lng:null,url:c.verified&&c.url&&isMapLink(c.url)?c.url:null,start_time:null,duration_min:null,est_cost_thb:null,note:'',hop:null,...(extra||{})}}
function itinFromServer(it){
  return {title:it.title||A('ตารางที่เสนอ','Proposed plan'),destination:it.destination||null,end_by:it.end_by||null,saved:false,
    days:it.days.map(d=>({day:d.day,items:d.items.map(s=>mkItem(s,{start_time:s.start_time,duration_min:s.duration_min,est_cost_thb:s.est_cost_thb,note:s.note||'',hop:s.hop_km_from_prev}))}))};
}
function tripInfo(){const t=S.tripId?tripById(S.tripId):null;return t}
function dayDate(day){const t=tripInfo();return t&&t.start_date?addDays(t.start_date,day-1):null}
function effDate(d,s){return s.date!==undefined?s.date:dayDate(d.day)}          // s.date: วันที่ที่ผู้ใช้เลือกเอง (null = ยังไม่ได้เลือก) ไม่งั้นใช้ตามลำดับวันของแผน
function inTrip(ds){const t=tripInfo();if(!ds||!DRE.test(ds))return false;if(!t||!t.start_date)return true;return ds>=t.start_date&&ds<=tripEnd(t)}
function localConflicts(){
  const t=tripInfo();if(!t||!S.itin)return [];const out=[];
  const ex=(cache.schedules||[]).filter(s=>s.trip_id===t.id&&s.schedule_time);
  for(const d of S.itin.days){
    for(const it of d.items){if(!it.selected||!it.start_time)continue;const ds=effDate(d,it);if(!ds)continue;
      for(const e of ex){if(e.schedule_date!==ds)continue;if(Math.abs(tmin(e.schedule_time.slice(0,5))-tmin(it.start_time))<30)out.push(A(`${fmtDate(ds)} ${it.start_time}: "${it.name}" ใกล้กับรายการเดิม "${e.activity}" (${e.schedule_time.slice(0,5)})`,`${fmtDate(ds)} ${it.start_time}: "${it.name}" is close to existing "${e.activity}" (${e.schedule_time.slice(0,5)})`))}}}
  return out;
}
function itinHtml(){
  const it=S.itin;if(!it)return '';const t=tripInfo();
  const warns=[...(S.warnings||[]),...localConflicts()];
  const sel=it.days.reduce((n,d)=>n+d.items.filter(x=>x.selected).length,0);
  const canSave=!!t&&canWrite(t.id)&&sel>0&&!S.busy;
  let h=`<div class="ai-itin"><div class="ai-it-head"><b>🗓️ ${esc(it.title)}</b>${it.end_by?`<span class="mini muted"> · ${esc(A('กลับก่อน','back by'))} ${esc(it.end_by)}</span>`:''}</div>
  <div class="mini muted">${t&&t.start_date?esc(A('ทริป: ','Trip: ')+(t.name||'')+' · '+fmtDate(t.start_date)+' – '+fmtDate(tripEnd(t))):esc(A('ยังไม่ได้เลือกทริป: เลือกทริปด้านบนเพื่อกำหนดวันที่และบันทึกลง Schedule','No trip selected: pick a trip above to map dates and save to the Schedule'))}</div>`;
  for(const d of it.days){
    const ds=dayDate(d.day),ok=!ds||inTrip(ds);
    h+=`<div class="ai-day"><div class="ai-dayh">${esc(A('วันที่ ','Day '))}${d.day}${ds?` · ${esc(fmtDate(ds))}`:''}${ok?'':` <span class="aic-un">${esc(A('เกินช่วงทริป — เลือกวันที่เองได้ตอนกดเพิ่ม','outside the trip dates — pick a date when you add'))}</span>`}</div>`;
    d.items.forEach((s,k)=>{
      h+=`<div class="ai-row${s.selected?'':' off'}" data-id="${s.id}">
        <label class="ai-sel"><input type="checkbox" data-ai-change="isel" data-id="${s.id}" ${s.selected?'checked':''} aria-label="${esc(A('เลือก','select'))}"></label>
        <input type="time" class="ai-time" data-ai-change="itime" data-id="${s.id}" value="${esc(s.start_time||'')}" aria-label="${esc(A('เวลา','time'))}">
        <div class="ai-rmain"><input class="ai-name" maxlength="160" data-ai-change="iname" data-id="${s.id}" value="${esc(s.name)}" aria-label="${esc(A('ชื่อกิจกรรม','activity'))}">
          <div class="mini muted">${esc(catName(s.category))} · ${s.verified?`<span class="aic-ok">✓ ${esc(A('พบใน Google Maps','on Google Maps'))}</span>`:`<span class="aic-un">${esc(A('ยังไม่ยืนยัน','unverified'))}</span>`}
          ${s.duration_min?` · ~${s.duration_min} ${esc(A('นาที (ประมาณ)','min (estimate)'))}`:''}${s.est_cost_thb!=null?` · ~฿${s.est_cost_thb} ${esc(A('(ประมาณ)','(estimate)'))}`:''}
          ${s.hop!=null?` · ${esc(A('ห่างจุดก่อนหน้า ~'+s.hop+' กม. (เส้นตรง ประมาณ)','~'+s.hop+' km from previous (straight line, estimate)'))}`:''}</div>
          ${s.added?`<div class="mini aic-ok">✓ ${esc(A('เพิ่มลง Schedule แล้ว ('+fmtDate(s.added)+') · ติ๊กเพื่อเพิ่มอีกครั้งในวันอื่นได้','Added to the Schedule ('+fmtDate(s.added)+') · tick it to add again on another date'))}</div>`:''}
          ${s.note?`<div class="mini">${esc(s.note)}</div>`:''}</div>
        <div class="ai-rbtn">${s.url?`<a class="locbtn" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="map">📍</a>`:`<a class="locbtn" href="${esc(searchUrl(s.name,it.destination))}" target="_blank" rel="noopener noreferrer" aria-label="search">🔎</a>`}
          <button class="locbtn" data-ai="up" data-id="${s.id}" ${k===0?'disabled':''} aria-label="up">↑</button><button class="locbtn" data-ai="down" data-id="${s.id}" ${k===d.items.length-1?'disabled':''} aria-label="down">↓</button><button class="locbtn" data-ai="rm" data-id="${s.id}" aria-label="remove">✕</button></div></div>`;
    });
    h+='</div>';
  }
  if(warns.length)h+=`<div class="ai-warns"><b>⚠️ ${esc(A('ข้อควรระวัง','Please note'))}</b><ul>${warns.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`;
  h+=`<div class="ai-itacts"><button class="btn secondary sm" data-ai="regen" ${S.busy?'disabled':''}>↻ ${esc(A('สร้างใหม่','Regenerate'))}</button>
    <button class="btn sm" data-ai="review" ${canSave?'':'disabled'}>${esc(A('เพิ่มลง Schedule…','Add to Schedule…'))}</button></div>
  ${!t?`<div class="mini muted">${esc(A('เลือกทริปด้านบนก่อนจึงจะบันทึกได้','Select a trip above to enable saving'))}</div>`:(!canWrite(t.id)?`<div class="mini muted">${esc(A('คุณไม่มีสิทธิ์แก้ไขตารางของทริปนี้','You cannot edit this trip\'s schedule'))}</div>`:'')}
  <div class="mini muted">${esc(A('ผู้ช่วย AI จะไม่บันทึกอะไรจนกว่าคุณจะยืนยัน และไม่สร้างค่าใช้จ่ายให้อัตโนมัติ ตัวเลขค่าใช้จ่ายเป็นการประมาณเท่านั้น','Nothing is saved until you confirm, and no expenses are created. Cost figures are estimates only.'))}</div></div>`;
  return h;
}
function findItem(id){if(!S.itin)return null;for(const d of S.itin.days){const k=d.items.findIndex(x=>x.id===id);if(k>=0)return {d,k,it:d.items[k]}}return null}
function addDraft(c){
  const it=mkItem(c);
  if(!S.itin)S.itin={title:A('ร่างตารางของฉัน','My draft plan'),destination:null,end_by:null,saved:false,days:[{day:1,items:[]}]};
  S.itin.days[0].items.push(it);
  // ให้การ์ดนี้แสดงตารางในข้อความล่าสุดของผู้ช่วย
  const last=[...S.msgs].reverse().find(m=>m.role==='assistant'&&!m.error);if(last&&!last.itin)last.itin={title:S.itin.title};
  toast(A('เพิ่มในร่างตารางแล้ว','Added to the draft plan'));render();
}

// ---------- ส่งข้อความ ----------
async function send(text,opts){
  opts=opts||{};text=(text||'').trim();
  if(S.busy)return;if(S.cfgState!=='ready')return;
  if(!text){toast(A('กรุณาพิมพ์ข้อความ','Please type a message'));return}
  if(text.length>MAXLEN){toast(A('ข้อความยาวเกิน '+MAXLEN+' ตัวอักษร','Message is longer than '+MAXLEN+' characters'));return}
  if(!S.consent){askConsent(()=>send(text,opts));return}
  // retry: เอาข้อความ error ออก ไม่ซ้ำข้อความผู้ใช้
  if(opts.retry){while(S.msgs.length&&S.msgs[S.msgs.length-1].error)S.msgs.pop()}
  else S.msgs.push({role:'user',text});
  S.lastUser=text;S.busy=true;if($a('aiInput'))$a('aiInput').value='';render();
  const body={action:'chat',message:text,history:historyForServer(true),trip_id:S.tripId||null,lang:(LANG==='en'?'en':'th')};
  const o=($a('aiOrigin')?.value||S.origin||'').trim();if(o)body.origin={name:o.slice(0,120)};
  let r=await invoke(body);
  // Gemini (แพ็กเกจฟรี) ตอบ 503 "หนาแน่น" เป็นพักๆ → ลองซ้ำอัตโนมัติสูงสุด 2 ครั้งห่าง 3 และ 6 วินาที (ผู้ให้บริการและโมเดลเดิม ไม่สลับไปตัวอื่น)
  for(let n=0;n<2&&!r.ok&&r.code==='ai_unavailable';n++){await new Promise(z=>setTimeout(z,3000*(n+1)));r=await invoke(body)}
  S.busy=false;
  if(!r.ok){
    if(r.retry_after_s)S.retryUntil=Date.now()+r.retry_after_s*1000;
    S.msgs.push({role:'assistant',error:true,text:(r.code==='ai_unavailable'?A('ผู้ให้บริการ AI (Gemini) กำลังหนาแน่นหรือขัดข้องชั่วคราว ลองซ้ำอัตโนมัติแล้วแต่ยังไม่สำเร็จ กรุณากด "ลองใหม่" อีกครั้งในอีกสักครู่','The AI provider (Gemini) is busy or temporarily down. Automatic retries did not succeed; please tap Retry in a moment.'):null)||r.message||A('ขออภัย เกิดข้อผิดพลาด','Sorry, something went wrong'),retryable:r.retryable!==false&&r.code!=='ai_not_configured'});
    if(r.code==='ai_not_configured'||r.code==='not_deployed'){S.cfgState=r.code==='not_deployed'?'not_deployed':'no_key'}
    render();tickRetry();return}
  S.placesSource=r.places_source||'none';S.warnings=r.warnings||[];S.dest=r.itinerary&&r.itinerary.destination||S.dest||'';
  const cards=(r.recommendations||[]);
  const m={role:'assistant',text:r.reply||'',questions:r.questions||[],cards};
  if(r.itinerary&&r.itinerary.days&&r.itinerary.days.length){S.itin=itinFromServer(r.itinerary);m.itin={title:S.itin.title}}
  S.msgs.push(m);saveHist();render();
}
function tickRetry(){const el=$a('aiRetryHint');if(!el)return;if(Date.now()>=S.retryUntil){render();return}el.textContent=retryHint();setTimeout(tickRetry,1000)}
function askConsent(then){
  const prov=(S.cfg&&S.cfg.ai_provider)||'AI';
  modal(`<div class="sheethead"><h3 data-no-tr="1">${esc(A('ก่อนใช้ผู้ช่วย AI','Before you use the AI assistant'))}</h3></div>
  <div data-no-tr="1" class="ai-consent"><p>${esc(A('ข้อความที่คุณพิมพ์ (และตารางเดิมของทริปที่คุณเลือก) จะถูกส่งไปยังผู้ให้บริการ AI ('+prov+') เพื่อสร้างคำตอบ','What you type (and the existing schedule of a trip you select) is sent to the AI provider ('+prov+') to produce answers.'))}</p>
  <p>${esc(A('หากระบบใช้แพ็กเกจฟรีของผู้ให้บริการ เงื่อนไขของผู้ให้บริการอาจอนุญาตให้นำข้อมูลที่ส่งไปปรับปรุงผลิตภัณฑ์ และอาจมีผู้ตรวจสอบเป็นมนุษย์ กรุณาอย่าพิมพ์ข้อมูลส่วนตัวหรือความลับ (เช่น เลขบัตร รหัสผ่าน ที่อยู่บ้าน)','If the system uses the provider\'s free plan, the provider\'s terms may allow submitted content to be used to improve its products and reviewed by humans. Please do not type personal or confidential details (ID numbers, passwords, home address).'))}</p>
  <p>${esc(A('AI อาจผิดพลาดได้ ตรวจสอบข้อมูลสำคัญ (เวลาเปิด-ปิด ราคา การเดินทาง) ก่อนออกเดินทางทุกครั้ง','AI can be wrong. Always check important details (opening hours, prices, transport) before you travel.'))}</p></div>
  <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn secondary" data-no-tr="1" id="aiConsNo">${esc(A('ยกเลิก','Cancel'))}</button><button class="btn" data-no-tr="1" id="aiConsYes">${esc(A('เข้าใจและยอมรับ','I understand'))}</button></div>`,'center');
  $a('aiConsNo').onclick=()=>closeModal();
  $a('aiConsYes').onclick=()=>{S.consent=true;lsSet(CKEY(),'1');closeModal();then&&then()};
}

// ---------- ยืนยันก่อนบันทึก ----------
function selectedPayload(){
  const t=tripInfo();const items=[];
  for(const d of S.itin.days){
    for(const s of d.items){if(!s.selected)continue;const ds=effDate(d,s)||null;const name=(s.name||'').trim();if(!name)continue;
      const bits=[];if(s.note)bits.push(s.note);if(s.duration_min)bits.push(A(`ใช้เวลาประมาณ ${s.duration_min} นาที (ประมาณการ)`,`about ${s.duration_min} min (estimate)`));if(s.est_cost_thb!=null)bits.push(A(`ค่าใช้จ่ายประมาณ ฿${s.est_cost_thb} ต่อคน (ประมาณการ ยังไม่ได้บันทึกเป็นค่าใช้จ่าย)`,`about THB ${s.est_cost_thb} per person (estimate, not recorded as an expense)`));if(!s.verified)bits.push(A('ยังไม่ยืนยันสถานที่กับแผนที่','place not verified on the map'));
      items.push({_id:s.id,hasPin:s.lat!=null&&s.lng!=null,date:ds,time:s.start_time||null,activity:name,category:s.category,note:bits.join(' · ').slice(0,500),location_name:s.place_name,url:s.url,lat:s.lat,lng:s.lng,_label:`${s.start_time||'--:--'} ${name}`})}}
  return {trip:t,items};
}
const pinWait=new Set();
function extractUrl(t){const m=String(t||'').match(/https?:\/\/[^\s<>"']+/i);return m?m[0].replace(/[),.;]+$/,''):null}
function pinStepsHtml(){
  return `<div class="ai-steps"><b>${esc(A('วิธีปักหมุดสถานที่ (ทำได้ทุกรายการ ไม่บังคับ)','How to pin a place (optional, per item)'))}</b><ol>
    <li>${esc(A('กดปุ่ม "เปิดใน Google Maps" ของรายการนั้น','Tap "Open in Google Maps" on that item'))}</li>
    <li>${esc(A('ในแผนที่ เลือกสถานที่ที่ถูกต้องจากผลการค้นหา','In the map, pick the correct place from the results'))}</li>
    <li>${esc(A('กดปุ่ม "แชร์" (Share)','Tap "Share"'))}</li>
    <li>${esc(A('กด "คัดลอกลิงก์" (Copy link)','Tap "Copy link"'))}</li>
    <li>${esc(A('กลับมาที่หน้านี้ แล้ววางลิงก์ในช่อง "วางลิงก์ Google Maps" ของรายการนั้น','Come back here and paste it into that item\'s "Paste Google Maps link" box'))}</li></ol>
    <div class="mini muted">${esc(A('ระบบจะอ่านพิกัดจากลิงก์ให้อัตโนมัติ ถ้าไม่วางลิงก์ รายการจะถูกบันทึกโดยยังไม่มีหมุดบนแผนที่','The coordinates are read from the link for you. Without a link the item is saved with no map pin.'))}</div>
    <div class="mini ai-fallback"><b>${esc(A('ถ้าอ่านพิกัดจากลิงก์ไม่ได้:','If the link cannot be read:'))}</b> ${esc(A('ในแผนที่ กดค้างที่ตำแหน่งนั้น (หรือคลิกขวาบนคอม) จะมีตัวเลขพิกัด เช่น 13.7563, 100.5018 — กดที่ตัวเลขเพื่อคัดลอก แล้ววางลงในช่องเดียวกันได้เลย','On the map, long-press the spot (or right-click on desktop) to see its coordinates, e.g. 13.7563, 100.5018 — tap the numbers to copy and paste them into the same box.'))}</div></div>`;
}
function pinRowHtml(i,dest,trip){
  const has=i.hasPin;const mn=trip&&trip.start_date?` min="${esc(trip.start_date)}" max="${esc(tripEnd(trip))}"`:'';
  return `<li class="ai-pinrow" data-id="${i._id}"><div class="ai-pintitle">${esc(i._label)}</div>
    <label class="ai-datef"><span>📅 ${esc(A('วันที่','Date'))}</span><input type="date" class="ai-date" data-ai-date="${i._id}" value="${esc(i.date||'')}"${mn} required aria-label="${esc(A('เลือกวันที่','Choose date'))}"></label>
    <div class="mini aic-un" data-date-status></div>
    ${has?`<div class="aic-ok" data-pin-status>✓ ${esc(A('มีพิกัดแล้ว','Has coordinates'))}</div>`
    :`<div class="ai-pinact"><a class="locbtn" href="${esc(searchUrl(i.activity,dest))}" target="_blank" rel="noopener noreferrer">📍 ${esc(A('เปิดใน Google Maps','Open in Google Maps'))}</a></div>
      <input class="ai-pin" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" data-ai-pin="${i._id}" placeholder="${esc(A('วางลิงก์ Google Maps หรือพิกัด (เช่น 13.7563, 100.5018)','Paste a Google Maps link or coordinates (e.g. 13.7563, 100.5018)'))}" aria-label="${esc(A('วางลิงก์ Google Maps หรือพิกัด','Paste Google Maps link or coordinates'))}">
      <div class="mini muted" data-pin-status></div>`}</li>`;
}
function failReason(){
  try{const r=(typeof _resLast!=='undefined')?_resLast:null;if(!r||r.ok)return '';
    const w=typeof _whyText==='function'?_whyText():'';const code=r.error&&r.error!=='invoke_error'?r.error:(r.status?('http '+r.status):'');
    return (w||A('เซิร์ฟเวอร์อ่านลิงก์นี้ไม่ได้','The server could not read this link'))+(code&&!w.includes(code)?` [${code}]`:'')}catch(e){return ''}
}
async function pinItem(id,raw,row){
  const st=row&&row.querySelector('[data-pin-status]');const say=(t,cls)=>{if(st){st.textContent=t;st.className='mini '+(cls||'muted')}};
  const f=findItem(id);if(!f)return;
  const text=String(raw||'').trim();
  if(!text){f.it.url=null;f.it.lat=null;f.it.lng=null;f.it.place_name=null;say('');return}
  // 1) พิมพ์/วางเป็นพิกัดตรงๆ ("13.7563, 100.5018") หรือเป็นลิงก์ Google Maps แบบเต็มที่มีพิกัดอยู่ในลิงก์ → ไม่ต้องเรียกเซิร์ฟเวอร์
  const direct=typeof parseLatLng==='function'?parseLatLng(extractUrl(text)||text):null;
  if(direct&&(!/^https?:/i.test(text)||isMapLink(normalizeMapUrl(extractUrl(text)||'')||''))){
    const u0=extractUrl(text),nu=u0&&normalizeMapUrl(u0);
    f.it.url=nu&&isMapLink(nu)?nu:'https://www.google.com/maps/search/?api=1&query='+direct.lat+','+direct.lng;
    f.it.place_name=f.it.name;f.it.lat=direct.lat;f.it.lng=direct.lng;
    say('✓ '+A('ปักหมุดแล้ว','Pinned')+` (${direct.lat.toFixed(5)}, ${direct.lng.toFixed(5)})`,'aic-ok');saveHist();return}
  const u0=extractUrl(text);const u=u0&&typeof normalizeMapUrl==='function'?normalizeMapUrl(u0):null;
  if(!u||!isMapLink(u)){say(A('ไม่รู้จักข้อความนี้: วางลิงก์ Google Maps (แชร์ → คัดลอกลิงก์) หรือพิกัดแบบ 13.7563, 100.5018','Not recognised: paste a Google Maps link (Share → Copy link) or coordinates like 13.7563, 100.5018'),'aic-un');return}
  say(A('กำลังอ่านพิกัดจากลิงก์…','Reading coordinates from the link…'));
  let r=null;try{r=await resolveMapLink(u)}catch(e){r=null}
  const g=findItem(id);if(!g)return;
  g.it.url=u;g.it.place_name=g.it.name;
  if(r&&typeof r.lat==='number'&&typeof r.lng==='number'){g.it.lat=r.lat;g.it.lng=r.lng;say('✓ '+A('ปักหมุดแล้ว','Pinned')+` (${r.lat.toFixed(5)}, ${r.lng.toFixed(5)})`,'aic-ok')}
  else{g.it.lat=null;g.it.lng=null;
    say(A('บันทึกลิงก์ไว้ได้ แต่อ่านพิกัดไม่ได้','The link is kept but coordinates could not be read')+(failReason()?' — '+failReason():'')+'. '+A('วิธีแก้: กดค้างที่ตำแหน่งในแผนที่ คัดลอกตัวเลขพิกัด (เช่น 13.7563, 100.5018) แล้ววางแทนลิงก์ในช่องนี้','Fix: long-press the spot on the map, copy the coordinates (e.g. 13.7563, 100.5018) and paste them here instead of the link'),'aic-un')}
  saveHist();
}
function review(){
  if(!S.itin)return;const t0=tripInfo();
  if(!t0||!canWrite(t0.id)){toast(A('เลือกทริปที่คุณแก้ไขได้ก่อน','Select a trip you can edit first'));return}
  // ตั้งวันที่เริ่มต้นของแต่ละรายการ: ตามลำดับวันของแผน ถ้าอยู่ในช่วงทริป ไม่งั้นว่างไว้ให้ผู้ใช้เลือกเอง
  for(const d of S.itin.days)for(const s of d.items){if(!s.selected)continue;const e=effDate(d,s);s.date=e&&inTrip(e)?e:null}
  const {trip,items}=selectedPayload();
  if(!items.length){toast(A('ยังไม่ได้เลือกรายการ','No items selected'));return}
  const needPin=items.some(i=>!i.hasPin);const dest=S.itin.destination||'';
  const trange=trip.start_date?`${fmtDate(trip.start_date)} – ${fmtDate(tripEnd(trip))}`:'';
  modal(`<div class="sheethead"><h3 data-no-tr="1">${esc(A('ยืนยันเพิ่มลง Schedule','Confirm adding to Schedule'))}</h3><div class="spacer"></div><button class="btn secondary sm" data-no-tr="1" onclick="closeModal()">${esc(A('ปิด','Close'))}</button></div>
  <div data-no-tr="1" class="ai-revbody"><p>${esc(A(`จะเพิ่ม ${items.length} รายการลงทริป "${trip.name||''}"`,`Add ${items.length} item(s) to trip "${trip.name||''}"`))}</p>
  <div class="mini muted">${esc(A('เลือกวันที่ของแต่ละรายการได้','Choose a date for each item'))}${trange?esc(' ('+trange+')'):''}</div>
  <ul class="ai-sumlist ai-pinlist" id="aiPins">${items.map(i=>pinRowHtml(i,dest,trip)).join('')}</ul>
  ${needPin?pinStepsHtml():''}
  <div id="aiConf"></div>
  <div class="mini muted">${esc(A('รายการที่ซ้ำกับของเดิม (วัน เวลา ชื่อเหมือนกัน) จะถูกข้าม ระบบไม่สร้างค่าใช้จ่ายให้ และรายการแนะนำจะยังอยู่ในแชตนี้','Items identical to existing ones (same date, time and name) are skipped. No expenses are created, and the suggestions stay in this chat.'))}</div></div>
  <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn secondary" data-no-tr="1" onclick="closeModal()">${esc(A('ยกเลิก','Cancel'))}</button><button class="btn" id="aiConfirm" data-no-tr="1">${esc(A('ยืนยัน เพิ่มลง Schedule','Confirm & add'))}</button></div>`,'center');
  const updConf=()=>{const c=$a('aiConf');if(!c)return;const w=localConflicts();c.innerHTML=w.length?`<div class="ai-warns"><b>⚠️ ${esc(A('เวลาใกล้กับรายการเดิม','Close to existing items'))}</b><ul>${w.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''};
  updConf();
  const box=$a('aiPins');const timers={};
  const run=el=>{const id=Number(el.dataset.aiPin),row=el.closest('.ai-pinrow');clearTimeout(timers[id]);
    const pr=pinItem(id,el.value,row);pinWait.add(pr);pr.finally(()=>pinWait.delete(pr))};
  if(box){
    box.addEventListener('input',e=>{const el=e.target.closest('[data-ai-pin]');if(!el)return;const id=Number(el.dataset.aiPin);clearTimeout(timers[id]);timers[id]=setTimeout(()=>run(el),500)});
    box.addEventListener('change',e=>{
      const dt=e.target.closest('[data-ai-date]');
      if(dt){const f=findItem(Number(dt.dataset.aiDate));if(f){f.it.date=dt.value||null;const m=dt.closest('.ai-pinrow').querySelector('[data-date-status]');if(m)m.textContent=dt.value&&!inTrip(dt.value)?A('วันที่นี้อยู่นอกช่วงทริป','This date is outside the trip dates'):'';saveHist();updConf()}return}
      const el=e.target.closest('[data-ai-pin]');if(el)run(el)});
    box.addEventListener('paste',e=>{const el=e.target.closest('[data-ai-pin]');if(el)setTimeout(()=>run(el),0)});
  }
  $a('aiConfirm').onclick=async()=>{
    const b=$a('aiConfirm');if(b){b.disabled=true;b.textContent=A('กำลังตรวจลิงก์…','Checking links…')}
    try{await Promise.all([...pinWait])}catch(e){}
    const p=selectedPayload();
    if(b){b.disabled=false;b.textContent=A('ยืนยัน เพิ่มลง Schedule','Confirm & add')}
    // ทุกรายการต้องมีวันที่ที่อยู่ในช่วงทริป
    const bad=p.items.filter(i=>!inTrip(i.date));
    document.querySelectorAll('#aiPins .ai-pinrow').forEach(r=>{const id=Number(r.dataset.id);const isBad=bad.some(i=>i._id===id);r.classList.toggle('bad',isBad);const m=r.querySelector('[data-date-status]');if(m&&isBad)m.textContent=A('กรุณาเลือกวันที่ในช่วงทริป','Please choose a date within the trip dates')});
    if(bad.length){toast(A('กรุณาเลือกวันที่ให้ครบทุกรายการ (ในช่วงวันที่ของทริป)','Please choose a date for every item (within the trip dates)'));const f=document.querySelector('#aiPins .ai-pinrow.bad .ai-date');if(f)f.focus();return}
    apply(trip,p.items)};
}
let applying=false;
async function apply(trip,items){
  if(applying)return;applying=true;const b=$a('aiConfirm');if(b){b.disabled=true;b.textContent=A('กำลังบันทึก…','Saving…')}
  const ids=items.map(i=>({id:i._id,date:i.date}));
  const r=await invoke({action:'apply',trip_id:trip.id,confirmed:true,items:items.map(({_label,_id,hasPin,...x})=>x)});
  applying=false;
  if(!r.ok){if(b){b.disabled=false;b.textContent=A('ยืนยัน เพิ่มลง Schedule','Confirm & add')}toast(r.message||A('บันทึกไม่สำเร็จ','Could not save'));return}
  closeModal();
  const skip=(r.skipped||[]).length;
  // ไม่ลบรายการแนะนำ: ทำเครื่องหมาย "เพิ่มแล้ว" และเอาติ๊กออก เพื่อให้กลับมาเพิ่มอีกครั้ง (เช่น คนละวัน) ได้
  for(const x of ids){const f=findItem(x.id);if(f){f.it.added=x.date;f.it.selected=false}}
  saveHist();
  S.warnings=[];
  toast(A(`เพิ่มลง Schedule แล้ว ${r.inserted} รายการ${skip?` (ข้ามที่ซ้ำ ${skip})`:''}`,`Added ${r.inserted} item(s)${skip?` (${skip} duplicates skipped)`:''}`));
  try{await window.render()}catch(e){console.error(e)}   // โหลด Schedule/แผนที่ใหม่จากฐานข้อมูล (ฟังก์ชัน render ของแอป)
  go('schedule');
}

// ---------- events ----------
function onClick(e){
  const el=e.target.closest('[data-ai]');if(!el)return;const a=el.dataset.ai;
  if(a==='send')send($a('aiInput').value);
  else if(a==='sug'){const s=SUGGEST[Number(el.dataset.i)];if(s)send(A(s[0],s[1]))}
  else if(a==='fillq'){const t=$a('aiInput');if(t){t.value=el.dataset.q;t.focus()}}
  else if(a==='retry'){if(Date.now()<S.retryUntil)return;send(S.lastUser,{retry:true})}
  else if(a==='regen'){if(S.lastUser)send(S.lastUser+A(' (ช่วยเสนอแผนใหม่ที่ต่างจากเดิม)',' (please propose a different plan)'),{})}
  else if(a==='clear'){S.msgs=[];S.itin=null;S.warnings=[];S.dest='';lsDel(HKEY());render()}
  else if(a==='recheck'){init(true)}
  else if(a==='draftadd'){const m=S.msgs[Number(el.dataset.mi)],c=m&&m.cards&&m.cards[Number(el.dataset.ci)];if(c)addDraft(c)}
  else if(a==='review')review();
  else{const f=findItem(Number(el.dataset.id));if(!f)return;
    if(a==='rm'){f.d.items.splice(f.k,1);if(!f.d.items.length)S.itin.days=S.itin.days.filter(d=>d!==f.d);if(!S.itin.days.length)S.itin=null;render()}
    else if(a==='up'&&f.k>0){[f.d.items[f.k-1],f.d.items[f.k]]=[f.d.items[f.k],f.d.items[f.k-1]];render()}
    else if(a==='down'&&f.k<f.d.items.length-1){[f.d.items[f.k+1],f.d.items[f.k]]=[f.d.items[f.k],f.d.items[f.k+1]];render()}}
}
function onChange(e){
  const el=e.target.closest('[data-ai-change]');if(!el)return;const a=el.dataset.aiChange;
  if(a==='trip'){S.tripId=el.value;S.warnings=[];if(S.itin)for(const d of S.itin.days)for(const x of d.items)delete x.date;render()}
  else if(a==='origin'){S.origin=el.value.trim().slice(0,120)}
  else{const f=findItem(Number(el.dataset.id));if(!f)return;
    if(a==='isel'){f.it.selected=el.checked;render()}
    else if(a==='itime'){f.it.start_time=/^\d\d:\d\d$/.test(el.value)?el.value:null;render()}
    else if(a==='iname'){f.it.name=el.value.slice(0,160);saveHist()}}
}
function onKey(e){if(e.target&&e.target.id==='aiInput'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send(e.target.value)}}

async function init(force){
  const box=$a('aiBox');if(!box)return;
  if(!S.mounted){S.mounted=true;box.addEventListener('click',onClick);box.addEventListener('change',onChange);box.addEventListener('keydown',onKey)}
  if(!S.tripId&&typeof curTripId!=='undefined'&&curTripId&&tripById(curTripId)&&tripById(curTripId).status!=='closed')S.tripId=curTripId;
  loadHist();S.consent=lsGet(CKEY())==='1'||S.consent;
  if(S.cfgState==='ready'&&!force){render();return}
  S.cfgState='loading';render();
  const r=await invoke({action:'status'});
  if(r.ok){S.cfg=r;S.cfgState=r.ai_configured?'ready':'no_key'}
  else if(r.code==='not_deployed'||r.status===404)S.cfgState='not_deployed';
  else{S.cfgState='error';S.cfgMsg=r.message||''}
  render();
}
window.renderAssistant=function(){try{init(false)}catch(e){console.error(e)}};
window.AIAssistant={state:S,send,invoke};
// คำแปล EN ของข้อความคงที่ที่เพิ่มใหม่ในหน้าอื่น
try{if(typeof TH_EN==='object')Object.assign(TH_EN,{'ใหม่และเร็วๆ นี้ใน FriendTrip Go':'New and coming soon to FriendTrip Go','เบต้า':'Beta'})}catch(e){}
})();
