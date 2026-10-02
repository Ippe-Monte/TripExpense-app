// =====================================================================
// member.js — โปรไฟล์สมาชิก + ปุ่มเพิ่มเพื่อน (ใช้ร่วมกันทุกจุดที่แสดงรายชื่อสมาชิก)
//  - แตะที่รูป/ชื่อสมาชิก → แผ่นโปรไฟล์ซ้อนทับ (รูป, ชื่อ, เบอร์/LINE/Facebook เท่าที่เจ้าตัวเปิดให้ดู)
//  - ปุ่มเพิ่มเพื่อนรู้สถานะจริง และอัปเดตทุกจุดบนหน้าจอพร้อมกัน
// สิทธิ์การมองเห็นข้อมูลติดต่อ ฐานข้อมูลคัดกรองให้แล้ว (get_member_contacts) หน้านี้แสดงเฉพาะที่ได้รับกลับมา
// =====================================================================

// สถานะความเป็นเพื่อนระหว่างเรากับ uid
function friendState(uid){
  if(!currentUser||uid===currentUser.id)return 'self';
  if(friendIds&&friendIds.has(uid))return 'friend';
  const fd=friendsData||{};
  if((fd.incoming||[]).some(x=>x.id===uid))return 'incoming';
  if((fd.outgoing||[]).some(x=>x.id===uid))return 'outgoing';
  if((fd.blocked||[]).some(x=>x.id===uid))return 'blocked';
  return 'none';
}
// ปุ่ม/ป้ายตามสถานะ — ห่อด้วย span[data-fa] เพื่อให้ refreshFriendActions() แทนที่ได้ทุกจุดพร้อมกัน
function friendActionHtml(uid){
  const st=friendState(uid);let h='';
  if(devViewId||st==='self'||st==='blocked')h='';
  else if(st==='friend')h='<span class="badge okbadge">✔ เป็นเพื่อนกัน</span>';
  else if(st==='outgoing')h='<span class="badge">รอตอบรับ</span>';
  else if(st==='incoming')h=`<button type="button" class="btn sm" onclick="event.stopPropagation();acceptFriendFrom('${uid}')">ยอมรับเป็นเพื่อน</button>`;
  else h=`<button type="button" class="btn sm secondary" onclick="event.stopPropagation();addFriendById('${uid}')">＋ เพิ่มเพื่อน</button>`;
  return `<span class="fa" data-fa="${uid}">${h}</span>`;
}
function refreshFriendActions(){
  document.querySelectorAll('[data-fa]').forEach(el=>{el.innerHTML=(friendActionHtml(el.dataset.fa).replace(/^<span[^>]*>|<\/span>$/g,''))});
  // ถ้ากำลังเปิดโปรไฟล์ของคนที่สถานะเพิ่งเปลี่ยน โหลดข้อมูลติดต่อใหม่ (เป็นเพื่อนแล้วอาจเห็นเพิ่ม)
  const sh=document.getElementById('memSheet');if(sh&&sh.dataset.uid)loadMemberContacts(sh.dataset.uid);
}
async function acceptFriendFrom(uid){
  try{const {error}=await sb.rpc('respond_friend_request',{p_other:uid,p_accept:true});if(error)throw error;
    toast('เป็นเพื่อนกันแล้ว 🎉');await loadFriendsLite();loadInbox();refreshFriendActions();
    if($('friends')?.classList.contains('active'))renderFriends()}catch(e){err(e)}
}

// ---------- แผ่นโปรไฟล์สมาชิก ----------
let _memToken=0;
function closeMemberProfile(){document.getElementById('memSheet')?.remove()}
async function openMemberProfile(uid,role){
  if(!uid)return;closeMemberProfile();const token=++_memToken;
  const wrap=document.createElement('div');wrap.id='memSheet';wrap.className='selsheet memsheet';wrap.dataset.uid=uid;
  wrap.innerHTML=`<div class="selsheet-bg"></div><div class="selsheet-box"><div class="selsheet-head"><b>โปรไฟล์สมาชิก</b><button type="button" class="btn secondary sm" data-a="x">ปิด</button></div><div class="memprof-body"><div class="empty">กำลังโหลด...</div></div></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('.selsheet-bg').onclick=closeMemberProfile;wrap.querySelector('[data-a=x]').onclick=closeMemberProfile;
  let p=null;
  try{const {data}=await sb.from('profiles').select('id,full_name,nickname,avatar_url').eq('id',uid).maybeSingle();p=data}catch(_){}
  p=p||cache.members.find(m=>m.id===uid)||(typeof chatProfiles!=='undefined'&&chatProfiles.get(uid))||{id:uid};
  if(token!==_memToken)return;
  const body=wrap.querySelector('.memprof-body');
  body.innerHTML=`<div class="mp-top"><div class="mp-avatar" title="แตะเพื่อดูรูปขยาย" onclick="this.classList.toggle('big')">${avatarHtml(p,96)}</div><h3 class="mp-name">${esc(displayName(p))}</h3>${p.nickname&&p.full_name?`<div class="muted">${esc(p.full_name)}</div>`:''}<div class="mp-badges">${role?`<span class="badge">${roleName(role)}</span>`:''}${uid===currentUser.id?'<span class="badge">คุณ</span>':''}${friendActionHtml(uid)}</div></div><div class="mp-card" id="memContacts"><div class="muted mini">กำลังโหลด...</div></div>`;
  hydrateMedia(body);
  await loadMemberContacts(uid,token);
}
async function loadMemberContacts(uid,token){
  const box=document.getElementById('memContacts');if(!box)return;
  let c=null;try{const {data}=await sb.rpc('get_member_contacts',{p_user_ids:[uid]});c=(data||[]).find(x=>x.user_id===uid)||null}catch(_){}
  if(token&&token!==_memToken)return;
  const box2=document.getElementById('memContacts');if(!box2)return;
  const rows=[];
  if(c&&c.phone)rows.push(`<div class="mp-row"><span class="mp-ic">${lineIcon('call')}</span><div class="mp-main"><small>เบอร์โทร</small><a href="tel:${esc(String(c.phone).replace(/[^0-9+]/g,''))}">${esc(c.phone)}</a></div></div>`);
  if(c&&c.line_id)rows.push(`<div class="mp-row"><span class="mp-ic">${lineIcon('chat')}</span><div class="mp-main"><small>LINE ID</small><a href="https://line.me/ti/p/~${encodeURIComponent(c.line_id)}" target="_blank" rel="noopener">${esc(c.line_id)}</a></div><button type="button" class="btn sm secondary" onclick="copyText(${esc(JSON.stringify(String(c.line_id)))},'คัดลอก LINE ID แล้ว')">คัดลอก</button></div>`);
  if(c&&c.facebook){const fb=String(c.facebook);const url=/^https?:\/\//i.test(fb)?fb:'https://www.facebook.com/'+encodeURIComponent(fb);const label=fb.replace(/^https?:\/\/(www\.)?/i,'').replace(/\/$/,'');
    rows.push(`<div class="mp-row"><span class="mp-ic">${lineIcon('globe')}</span><div class="mp-main"><small>Facebook</small><a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a></div></div>`)}
  const isFriend=friendState(uid)==='friend'||uid===currentUser.id;
  box2.innerHTML=`<h4>ข้อมูลติดต่อ</h4>${rows.join('')||`<div class="muted mini mp-none">ยังไม่ได้แชร์ข้อมูลติดต่อ${isFriend?'':' · ข้อมูลที่เปิดเฉพาะเพื่อนจะแสดงเมื่อเป็นเพื่อนกัน'}</div>`}`;
  if(typeof hydrateMedia==='function')hydrateMedia(box2);
}
