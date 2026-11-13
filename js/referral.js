// =====================================================================
// referral.js — ระบบแนะนำเพื่อน ระยะ 1 (V2.3.0): รหัสแนะนำ · สายแนะนำ 3 ชั้น · นับจำนวนคน · ขอเป็นบัญชีบริษัททัวร์
// ยังไม่มีการคำนวณหรือจ่ายเงิน และไม่แสดงอัตราให้ผู้ใช้เห็น · ผู้แนะนำเห็นเฉพาะจำนวนคน ไม่เห็นชื่อหรือข้อมูลของใคร
// ต้องรัน sql/v23_referral.sql ก่อน (ถ้ายังไม่รัน หน้านี้แจ้งว่ายังไม่พร้อมใช้งาน ส่วนอื่นของแอปทำงานปกติ)
// =====================================================================
const REF_TERMS_VER='1.0';
const REF_CODE_RE=/^[A-Za-z0-9]{4,12}$/;
let _ref=null,_refErr=null;
function refLink(code){return APP_URL+'?ref='+encodeURIComponent(code)}
function _refKey(){return 'ft_ref_pending'}
function refPending(){try{const x=JSON.parse(localStorage.getItem(_refKey())||'null');if(x&&x.code&&Date.now()-x.at<14*86400000)return x.code;localStorage.removeItem(_refKey())}catch(_){}return null}
function refSetPending(code){try{localStorage.setItem(_refKey(),JSON.stringify({code:String(code).toUpperCase(),at:Date.now()}))}catch(_){}}
// เปิดแอปจากลิงก์ ?ref=CODE : เก็บรหัสไว้ใช้ตอนสมัคร แล้วเอาออกจาก URL (เรียกก่อน capturePendingJoin)
function captureRefParam(){try{const p=new URLSearchParams(location.search),r=p.get('ref');if(r===null)return;p.delete('ref');if(REF_CODE_RE.test(r))refSetPending(r);const rest=p.toString();history.replaceState(null,'',APP_URL+(rest?'?'+rest:'')+location.hash)}catch(_){}}
function refPrefill(){const el=$('regRef'),c=refPending();if(el&&c&&!el.value)el.value=c}
// หลังล็อกอิน: ผูกรหัสที่ค้างไว้ (จากลิงก์หรือช่องตอนสมัคร) ครั้งเดียวต่อบัญชี
async function refClaimPending(){
  if(!currentUser)return;const done='ft_ref_done_'+currentUser.id;
  try{if(localStorage.getItem(done))return}catch(_){}
  const code=refPending(),meta=currentUser.user_metadata?.ref_code;if(!code&&!meta)return;
  const {data,error}=await sb.rpc('referral_claim',{p_code:code||null});
  if(error){console.warn('referral_claim',error);return}
  try{localStorage.setItem(done,'1');localStorage.removeItem(_refKey())}catch(_){}
  if(data==='ok')toast('ผูกรหัสแนะนำเรียบร้อย');else if(data==='invalid')toast('ไม่พบรหัสแนะนำนี้');else if(data==='self')toast('ใช้รหัสของตัวเองไม่ได้')}

async function loadReferral(){_refErr=null;const {data,error}=await sb.rpc('my_referral');if(error){_ref=null;_refErr=error;return}_ref=data}
async function renderReferral(){const box=$('referralBox');if(!box)return;box.innerHTML='<div class="card muted">กำลังโหลด...</div>';await loadReferral();box.innerHTML=referralHtml();if(typeof hydrateMedia==='function')hydrateMedia(box)}
function referralHtml(){
  if(_refErr)return `<div class="card"><h3>${lineIcon('invite',20)} ชวนเพื่อน</h3><div class="muted" style="margin-top:6px">ฟีเจอร์นี้ยังไม่พร้อมใช้งานในตอนนี้ กรุณาลองใหม่ภายหลัง</div></div>`;
  const r=_ref||{};
  if(!r.terms_accepted)return `<div class="card"><h3>${lineIcon('invite',20)} ชวนเพื่อนมาใช้ FriendTrip Go</h3>
    <div class="muted" style="margin:6px 0 10px;line-height:1.7">ได้รหัสแนะนำของคุณเอง ชวนเพื่อนได้ไม่จำกัดจำนวน และดูได้ว่ามีกี่คนในสายของคุณ ใช้ฟรี ไม่มีค่าสมัคร</div>
    <div class="infonote card" style="margin:0 0 10px">${lineIcon('info',18)}<span>ตอนนี้ระบบบันทึกเฉพาะสายการแนะนำและนับจำนวนคนเท่านั้น ยังไม่มีการจ่ายค่าแนะนำ และไม่รับประกันว่าจะมีรายได้</span></div>
    <button type="button" class="btn secondary" style="width:100%;margin-bottom:8px" onclick="openRefTerms()">อ่านข้อกำหนด</button>
    <button type="button" class="btn big" style="width:100%" onclick="acceptRefTerms()">ยอมรับข้อกำหนดและรับรหัสแนะนำ</button></div>`;
  const typeName=r.account_type==='tour'?'บริษัททัวร์':'บุคคลทั่วไป';
  const tourBox=r.tour_status==='approved'?`<div class="okbox" style="margin-top:8px">บัญชีบริษัททัวร์ได้รับการอนุมัติแล้ว${r.tour_company?` · ${esc(r.tour_company)}`:''}</div>`
    :r.tour_status==='pending'?`<div class="okbox" style="margin-top:8px">ส่งคำขอเป็นบัญชีบริษัททัวร์${r.tour_company?` (${esc(r.tour_company)})`:''}แล้ว · รอผู้ดูแลตรวจสอบ</div>`
    :`${r.tour_status==='rejected'?'<div class="muted mini" style="margin-top:8px">คำขอครั้งก่อนไม่ได้รับการอนุมัติ ส่งคำขอใหม่ได้</div>':''}<button type="button" class="btn secondary sm" style="margin-top:8px" onclick="openTourRequest()">ขอเป็นบัญชีบริษัททัวร์</button>`;
  const claim=r.referred?`<div class="muted mini" style="margin-top:4px">คุณสมัครผ่านรหัสแนะนำของสมาชิกท่านหนึ่ง</div>`
    :r.can_claim?`<div class="field" style="margin-top:10px"><label>มีรหัสแนะนำจากเพื่อน? <span class="muted">(กรอกได้ภายใน 7 วันหลังสมัคร)</span></label><div class="row" style="flex-wrap:nowrap;gap:8px"><input id="refClaimIn" maxlength="12" autocapitalize="characters" autocomplete="off" placeholder="เช่น AB12CD34" style="flex:1;min-width:0"><button type="button" class="btn secondary" onclick="claimRefCode()">ใช้รหัส</button></div></div>`:'';
  const cnt=(n,l)=>`<div class="card monstat"><b>${_refN(n)}</b><span>${l}</span></div>`;
  return `<div class="card"><h3>${lineIcon('invite',20)} รหัสแนะนำของฉัน</h3>
    <div style="text-align:center;margin:12px 0"><div style="font-size:30px;font-weight:800;letter-spacing:4px;user-select:all" id="refCodeBig">${esc(r.code)}</div><div class="mini muted" style="margin-top:4px">ให้เพื่อนกรอกรหัสนี้ตอนสมัคร หรือส่งลิงก์ให้</div></div>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><button type="button" class="btn" style="flex:1" onclick="shareRefLink()">ส่งลิงก์ชวนเพื่อน</button><button type="button" class="btn secondary" style="flex:1" onclick="copyText('${esc(r.code)}','คัดลอกรหัสแล้ว')">คัดลอกรหัส</button></div>${claim}</div>
   <div class="card"><h3>คนในสายของฉัน</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">${cnt(r.l1,'ชั้น 1 · โดยตรง')}${cnt(r.l2,'ชั้น 2')}${cnt(r.l3,'ชั้น 3')}</div>
    <div class="mini muted" style="margin-top:8px;line-height:1.6">นับเป็นจำนวนคนเท่านั้น ไม่แสดงชื่อหรือข้อมูลของใคร · ชวนได้ไม่จำกัดจำนวน · ยังไม่มีการจ่ายค่าแนะนำ</div></div>
   <div class="card"><h3>ประเภทบัญชี</h3><div style="margin-top:4px"><b>${typeName}</b></div>${tourBox}</div>
   <div style="text-align:center;margin:6px 0 14px"><button type="button" class="btn ghost sm" onclick="openRefTerms()">ข้อกำหนดการแนะนำเพื่อน</button></div>`}
const _refN=v=>Number(v||0).toLocaleString(LANG==='en'?'en-GB':'th-TH');
async function acceptRefTerms(){try{const {error}=await sb.rpc('referral_accept_terms',{p_version:REF_TERMS_VER});if(error)throw error;toast('ยอมรับข้อกำหนดแล้ว');renderReferral()}catch(e){err(e)}}
function openRefTerms(){const L=['ใช้ฟรี ไม่มีค่าสมัคร ไม่ต้องซื้อสินค้าหรือบริการใดเพื่อเข้าร่วม','ในเวอร์ชันนี้ระบบบันทึกเฉพาะสายการแนะนำและนับจำนวนคนเท่านั้น ยังไม่มีการจ่ายค่าแนะนำ และไม่รับประกันว่าจะมีรายได้','ถ้าเปิดจ่ายในอนาคต จะจ่ายจากรายได้จริงที่ FriendTrip Go ได้รับ ตามอัตรา เงื่อนไขและระยะเวลาที่ประกาศในแอปก่อนเริ่มใช้ และคุณเลือกไม่เข้าร่วมได้','สายแนะนำมี 3 ชั้น บันทึกตอนสมัครและแก้ภายหลังไม่ได้ ห้ามแนะนำตัวเองหรือใช้หลายบัญชี','ห้ามโฆษณาเกินจริง การันตีรายได้ หรือชวนด้วยวิธีสแปม','บัญชีบริษัททัวร์ต้องได้รับการอนุมัติจากผู้ดูแลก่อน','ผู้แนะนำเห็นเพียงจำนวนคนในสายของตัวเอง ไม่เห็นชื่อ อีเมล หรือข้อมูลการใช้งานของผู้ถูกแนะนำ','FriendTrip Go ปรับเปลี่ยนหรือยุติโปรแกรมได้ โดยแจ้งในแอป'];
  modal(`<div class="sheethead"><h3>ข้อกำหนดการแนะนำเพื่อน</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="closeModal()">ปิด</button></div><ol style="padding-left:20px;line-height:1.75;margin:0">${L.map(x=>`<li>${x}</li>`).join('')}</ol><div class="mini muted" style="margin-top:10px">เวอร์ชันข้อกำหนด ${REF_TERMS_VER}</div>`,'sheet')}
async function shareRefLink(){const code=_ref?.code;if(!code)return;const url=refLink(code),text=`ชวนมาใช้ FriendTrip Go แอปวางแผนและหารค่าใช้จ่ายทริปกับเพื่อน ใช้ฟรี\nรหัสแนะนำ: ${code}\n${url}`;if(navigator.share){try{await navigator.share({title:'FriendTrip Go',text});return}catch(e){if(e&&e.name==='AbortError')return}}copyText(text,'คัดลอกข้อความชวนเพื่อนแล้ว')}
async function claimRefCode(){const v=($('refClaimIn')?.value||'').trim().toUpperCase();if(!REF_CODE_RE.test(v))return alert('รูปแบบรหัสไม่ถูกต้อง');try{const {data,error}=await sb.rpc('referral_claim',{p_code:v});if(error)throw error;const M={ok:'ผูกรหัสแนะนำเรียบร้อย',invalid:'ไม่พบรหัสแนะนำนี้',self:'ใช้รหัสของตัวเองไม่ได้',already:'คุณผูกรหัสแนะนำไปแล้ว',too_late:'เกิน 7 วันหลังสมัคร จึงผูกรหัสไม่ได้'};toast(M[data]||'ทำรายการแล้ว');renderReferral()}catch(e){err(e)}}
function openTourRequest(){modal(`<div class="sheethead"><h3>ขอเป็นบัญชีบริษัททัวร์</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="closeModal()">ปิด</button></div>
  <div class="muted mini" style="margin-bottom:8px;line-height:1.6">ผู้ดูแลจะตรวจสอบก่อนอนุมัติ ข้อมูลด้านล่างผู้ดูแลเห็นเฉพาะเพื่อตรวจสอบคำขอนี้</div>
  <div class="field"><label>ชื่อบริษัททัวร์</label><input id="trCompany" maxlength="120" autocomplete="organization"></div>
  <div class="field"><label>ช่องทางติดต่อ <span class="muted">(โทร / LINE / อีเมลของบริษัท)</span></label><input id="trContact" maxlength="120"></div>
  <div class="field"><label>หมายเหตุ <span class="muted">(เช่น เลขที่ใบอนุญาตนำเที่ยว เว็บไซต์)</span></label><textarea id="trNote" maxlength="500" rows="3"></textarea></div>
  <button type="button" class="btn big" id="trBtn" style="width:100%" onclick="sendTourRequest()">ส่งคำขอ</button>`,'sheet')}
async function sendTourRequest(){const btn=$('trBtn');try{const c=$('trCompany').value.trim(),k=$('trContact').value.trim(),n=$('trNote').value.trim();if(c.length<2)throw new Error('กรุณาใส่ชื่อบริษัททัวร์');if(k.length<3)throw new Error('กรุณาใส่ช่องทางติดต่อ');btn.disabled=true;const {error}=await sb.rpc('referral_request_tour',{p_company:c,p_contact:k,p_note:n||null});if(error)throw error;closeModal();toast('ส่งคำขอแล้ว รอผู้ดูแลตรวจสอบ');renderReferral()}catch(e){if(btn)btn.disabled=false;err(e)}}

// ---------- หน้า Developer: สถิติรวม + คำขอบัญชีบริษัททัวร์ (ไม่มีชื่อ/อีเมลของผู้ใช้) ----------
async function loadReferralAdmin(){const {data,error}=await sb.rpc('dev_referral_overview');_adm.refErr=!!error;_adm.ref=error?{}:(data||{})}
function adminReferralHtml(){
  if(_adm.refErr)return `<div class="row" style="margin-bottom:8px">${adminBack()}</div><div class="card"><h3>ระบบแนะนำเพื่อน</h3><div class="muted" style="margin-top:6px">ยังไม่พร้อมใช้งาน ให้รัน sql/v23_referral.sql ใน Supabase SQL Editor หนึ่งครั้ง</div></div>`;
  const m=_adm.ref||{},stat=(v,l)=>`<div class="card monstat"><b>${_refN(v)}</b><span>${l}</span></div>`;
  const ST={pending:'รอตรวจสอบ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ'};
  const reqs=(m.tour_requests||[]).map(x=>`<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:8px"><b style="min-width:0;overflow-wrap:anywhere">${esc(x.company||'-')}</b><span class="badge">${ST[x.status]||esc(x.status)}</span></div>
    <div class="mini muted" style="margin-top:4px;overflow-wrap:anywhere">ติดต่อ: ${esc(x.contact||'-')}${x.note?`<br>หมายเหตุ: ${esc(x.note)}`:''}<br>รหัส ${esc(x.code)} · ส่งเมื่อ ${x.requested_at?esc(fmtDate(String(x.requested_at).slice(0,10),{day:'numeric',month:'short',year:'numeric'})):'-'}</div>
    <div class="row" style="gap:8px;margin-top:8px">${x.status!=='approved'?`<button type="button" class="btn sm" onclick="reviewTour('${esc(x.code)}',true)">อนุมัติ</button>`:''}${x.status==='pending'?`<button type="button" class="btn secondary sm" onclick="reviewTour('${esc(x.code)}',false)">ไม่อนุมัติ</button>`:''}${x.status==='approved'?`<button type="button" class="btn secondary sm" onclick="reviewTour('${esc(x.code)}',false)">ยกเลิกสิทธิ์</button>`:''}</div></div>`).join('');
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px">${adminBack()}</div>
   <div class="card infonote">${lineIcon('lock',18)}<span>ระยะ 1: บันทึกสายและนับจำนวนเท่านั้น ไม่มีการคำนวณหรือจ่ายเงิน · ไม่แสดงชื่อหรืออีเมลของผู้ใช้ (PDPA)</span></div>
   <div class="monstats">${stat(m.members,'สมาชิกที่เปิดหน้าชวนเพื่อน')}${stat(m.accepted_terms,'ยอมรับข้อกำหนดแล้ว')}${stat(m.referred_users,'ผู้ใช้ที่มีผู้แนะนำ')}${stat(m.chain_l1,'สายชั้น 1')}${stat(m.chain_l2,'สายชั้น 2')}${stat(m.chain_l3,'สายชั้น 3')}${stat(m.tour_pending,'รออนุมัติบริษัททัวร์')}${stat(m.tour_approved,'บริษัททัวร์ที่อนุมัติ')}</div>
   <h3 style="margin:14px 2px 6px">คำขอเป็นบัญชีบริษัททัวร์</h3>${reqs||'<div class="card muted">ยังไม่มีคำขอ</div>'}`}
async function reviewTour(code,ok){try{const {error}=await sb.rpc('dev_referral_review_tour',{p_code:code,p_approve:ok});if(error)throw error;toast(ok?'อนุมัติแล้ว':'บันทึกแล้ว');renderAdmin()}catch(e){err(e)}}
