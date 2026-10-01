// =====================================================================
// ui.js — V17: วันที่ไทย, หมวด/ไอคอน, รูปโปรไฟล์/รูปปก, Splash, หน้า Log-in, เมนูลัด ＋, header
// =====================================================================
// ---------- วันที่แบบไทย (พ.ศ.) ----------
function fmtDate(ds,opt){if(!ds)return '-';const d=new Date(String(ds).length<=10?ds+'T00:00:00':ds);if(isNaN(d))return String(ds);return d.toLocaleDateString(LANG==='en'?'en-GB':'th-TH',opt||{day:'numeric',month:'short',year:'numeric'})}
function fmtRange(t){if(!t?.start_date)return LANG==='en'?'Dates not set':'ยังไม่กำหนดวันเดินทาง';const s=new Date(t.start_date+'T00:00:00'),e=new Date(tripEnd(t)+'T00:00:00');if(s.getFullYear()===e.getFullYear()&&s.getMonth()===e.getMonth())return `${s.getDate()}${s.getTime()!==e.getTime()?' – '+e.getDate():''} ${e.toLocaleDateString(LANG==='en'?'en-GB':'th-TH',{month:'short',year:'numeric'})}`;return `${fmtDate(t.start_date,{day:'numeric',month:'short'})} – ${fmtDate(tripEnd(t))}`}
// ---------- หมวดหมู่: ไอคอน + สี ----------
// ---------- ไอคอนหมวดหมู่ (SVG เส้น สไตล์ทันสมัย) ----------
const CAT_SVG={
  hotel:'<path d="M3 18v-7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3"/><path d="M3 14h17a1 1 0 0 1 1 1v3"/><path d="M3 18v3M21 18v3"/><circle cx="7" cy="10.2" r="1.3" fill="currentColor" stroke="none"/>',
  food:'<path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11M8 3v3.5M4 3v3.5M6 3v3.5"/><path d="M16 3c-1.7 0-3 1.8-3 4s1.3 4 3 4v10"/>',
  transport:'FILL:M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  activity:'<path d="M4 8a2 2 0 1 1 0-3.9V4h16v.1a2 2 0 0 1 0 3.9v.1a2 2 0 0 1 0 3.8v.1a2 2 0 0 1 0 3.9v.1H4v-.1a2 2 0 0 1 0-3.9"/><path d="M14 4v16" stroke-dasharray="2.4 2.4"/>',
  shopping:'<path d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  car:'<path d="M4 16V11l2.2-4.4A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.1L20 11v5"/><path d="M4 16h16M6 16v2M18 16v2"/><circle cx="7.5" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="16" r="1.5" fill="currentColor" stroke="none"/>',
  other:'<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M4 12h16M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>'
};
const CAT_META={hotel:{color:'#3b82f6'},food:{color:'#f97316'},transport:{color:'#10b981'},activity:{color:'#ec4899'},shopping:{color:'#8b5cf6'},car:{color:'#14b8a6'},other:{color:'#94a3b8'}};
function hashColor(s){let h=0;for(const c of String(s||'x'))h=(h*31+c.charCodeAt(0))>>>0;return `hsl(${h%360} 62% 52%)`}
function catMeta(k){return CAT_META[k]||{color:hashColor(k)}}
function catSvgPath(k){return CAT_SVG[k]||'<circle cx="12" cy="9" r="2.6"/><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"/>'}
function catIcon(k,size=40){const m=catMeta(k);const raw=catSvgPath(k);const fill=raw.startsWith('FILL:');const d=fill?raw.slice(5):raw;const svg=fill?`<svg viewBox="0 0 24 24" fill="currentColor">${d.startsWith('<')?d:`<path d="${d}"/>`}</svg>`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;return `<span class="caticon" style="--c:${m.color};width:${size}px;height:${size}px">${svg}</span>`}
function catBadge(k){const m=catMeta(k);return `<span class="catbadge" style="--c:${m.color}">${esc(catName(k))}</span>`}
// ---------- รูปโปรไฟล์ / รูป Group / รูปปก Trip ----------
const mediaUrls=new Map();
function initialOf(name){const s=String(name||'?').trim();return (s.match(/[\p{L}\p{N}]/u)||['?'])[0].toUpperCase()}
function avatarHtml(p,size=36){const name=displayName(p||{});return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.42)}px;--c:${hashColor(p?.id||name)}"${p?.avatar_url?` data-av="${esc(p.avatar_url)}"`:''}><b>${esc(initialOf(name))}</b></span>`}
function photoHtml(path,fallbackIcon,size=40,cls=''){return `<span class="photo ${cls}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.5)}px"${path?` data-av="${esc(path)}"`:''}><b>${fallbackIcon}</b></span>`}
async function hydrateMedia(root){root=root||document;const els=[...root.querySelectorAll('[data-av]')];if(!els.length||!sb)return;const need=[...new Set(els.map(e=>e.dataset.av).filter(p=>p&&!mediaUrls.has(p)))];if(need.length){try{const {data}=await sb.storage.from('avatars').createSignedUrls(need,3600);(data||[]).forEach(x=>mediaUrls.set(x.path,x.signedUrl||''))}catch(_){need.forEach(p=>mediaUrls.set(p,''))}}els.forEach(e=>{const u=mediaUrls.get(e.dataset.av);if(u){e.style.backgroundImage=`url("${u}")`;e.classList.add('has')}})}
function coverStyle(path){const u=path&&mediaUrls.get(path);return u?`background-image:linear-gradient(180deg,rgba(15,23,42,.05),rgba(15,23,42,.55)),url('${u}')`:''}
async function cropImage(file,w,h,quality=.85){const bmp=await createImageBitmap(file);const r=Math.max(w/bmp.width,h/bmp.height);const sw=w/r,sh=h/r,sx=(bmp.width-sw)/2,sy=(bmp.height-sh)/2;const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bmp,sx,sy,sw,sh,0,0,w,h);bmp.close?.();const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',quality));return new File([blob],'photo.jpg',{type:'image/jpeg'})}
function pickImage(){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>res(i.files[0]||null);i.click()})}
// อัปโหลดรูป แล้วคืน path ใหม่ (ลบรูปเก่าให้)
async function uploadMedia(folder,file,w,h,oldPath,cropped){const f=cropped?file:await cropImage(file,w,h);const path=`${folder}/${uniqId()}.jpg`;const {error}=await sb.storage.from('avatars').upload(path,f,{contentType:'image/jpeg',upsert:false});if(error)throw error;if(oldPath&&oldPath!==path)sb.storage.from('avatars').remove([oldPath]).catch(()=>{});return path}
async function changeMyAvatar(){try{const picked=await pickImage();if(!picked)return;const file=await openCropper(picked,{w:400,h:400,guide:'round',title:'เลือกตำแหน่งรูปโปรไฟล์'});if(!file)return;toast('กำลังอัปโหลดรูป...');const path=await uploadMedia(`users/${currentUser.id}`,file,400,400,me?.avatar_url,true);const {error}=await sb.from('profiles').update({avatar_url:path,updated_at:new Date().toISOString()}).eq('id',currentUser.id);if(error)throw error;me.avatar_url=path;await render();renderProfilePage();toast('เปลี่ยนรูปโปรไฟล์แล้ว')}catch(e){err(e)}}
async function removeMyAvatar(){if(!me?.avatar_url||!confirm('ลบรูปโปรไฟล์?'))return;try{const old=me.avatar_url;const {error}=await sb.from('profiles').update({avatar_url:null}).eq('id',currentUser.id);if(error)throw error;sb.storage.from('avatars').remove([old]).catch(()=>{});me.avatar_url=null;await render();renderProfilePage()}catch(e){err(e)}}
async function changeTripPhoto(tid){try{const t=tripById(tid);if(!t||!canAdmin(tid))return;const picked=await pickImage();if(!picked)return;const file=await openCropper(picked,{w:1200,h:640,guide:'none',title:'เลือกตำแหน่งรูปปก Trip'});if(!file)return;toast('กำลังอัปโหลดรูปปก...');const path=await uploadMedia(`trips/${tid}`,file,1200,640,t.photo_path,true);const {error}=await sb.from('trips').update({photo_path:path,updated_at:new Date().toISOString()}).eq('id',tid);if(error)throw error;await render();toast('เปลี่ยนรูปปก Trip แล้ว');if($('modal').innerHTML)closeModal()}catch(e){err(e)}}
async function changeGroupPhoto(gid){try{const g=cache.groups.find(x=>x.id===gid);if(!g)return;const picked=await pickImage();if(!picked)return;const file=await openCropper(picked,{w:1200,h:640,guide:'circle',title:'เลือกตำแหน่งรูป Group'});if(!file)return;toast('กำลังอัปโหลดรูป...');const path=await uploadMedia(`groups/${gid}`,file,1200,640,g.photo_path,true);const {error}=await sb.from('groups').update({photo_path:path}).eq('id',gid);if(error)throw error;await render();toast('เปลี่ยนรูป Group แล้ว');openGroupEdit(gid)}catch(e){err(e)}}
function openGroupEdit(gid){const g=cache.groups.find(x=>x.id===gid);if(!g)return;modal(`<div class="section"><h3>✏️ แก้ไข Group</h3><div class="spacer"></div><button class="btn secondary" onclick="closeModal()">ปิด</button></div><div style="text-align:center">${photoHtml(g.photo_path,'👥',96,'round')}<div><button class="btn sm secondary" style="margin-top:8px" onclick="changeGroupPhoto('${gid}')">📷 เปลี่ยนรูป Group</button></div></div><div class="field"><label>ชื่อ Group</label><input id="grpName" maxlength="80" value="${esc(g.name)}"></div><button class="btn" id="grpSaveBtn" onclick="saveGroupName('${gid}')">บันทึก</button>`)}
async function saveGroupName(gid){const btn=$('grpSaveBtn');try{const name=$('grpName').value.trim();if(!name)throw new Error('กรุณาใส่ชื่อ Group');btn.disabled=true;const {error}=await sb.from('groups').update({name}).eq('id',gid);if(error)throw error;closeModal();await render();toast('แก้ไขชื่อ Group แล้ว')}catch(e){err(e)}finally{if(btn)btn.disabled=false}}
// ---------- Splash / หน้า Log-in ----------
const splashStart=Date.now();
function hideSplash(){const s=$('splash');if(!s||s.classList.contains('gone'))return;const wait=Math.max(0,1100-(Date.now()-splashStart));setTimeout(()=>{s.classList.add('fade');setTimeout(()=>s.classList.add('gone'),450)},wait)}
function showWelcome(){['authLogin','authRegister'].forEach(id=>$(id)?.classList.add('hide'));$('authWelcome')?.classList.remove('hide')}
// ---------- Header ----------
function renderHeaderAvatar(){const el=$('hdrAvatar');if(el&&me){el.innerHTML=avatarHtml({...me,id:currentUser.id},34);hydrateMedia(el)}}
// ---------- เมนูลัด ＋ (ปรับแต่งได้) ----------
const QUICK_ACTIONS={expense:['expense','เพิ่มค่าใช้จ่าย',()=>openExpenseForm()],schedule:['schedule','เพิ่ม Schedule',()=>openScheduleForm()],doc:['documents','เพิ่มเอกสาร',()=>openDocForm()],chat:['chat','แชตใน Trip',()=>curTripId?openChatFor('trip',curTripId):go('chat')],invite:['invite','เชิญเข้า Trip',()=>curTripId?openInviteModal('trip',curTripId):alert('กรุณาเลือก Trip ก่อน')],settle:['settle','บันทึกการชำระ',()=>openSummary('overview',true)],budget:['budget','ตั้งงบประมาณ',()=>openBudgetForm()],summary:['summary','ดูสรุปค่าใช้จ่าย',()=>openSummary('overview')],join:['join','ใส่ Code เข้าร่วม',()=>openJoinCode()],newtrip:['trips','สร้าง Trip ใหม่',()=>openTripForm()],friend:['friends','เพิ่มเพื่อน',()=>go('friends')],switch:['swap','เปลี่ยน Trip',()=>go('trips')],members:['groups','สมาชิก Trip',()=>curTripId&&openTripDetail(curTripId,'members')],report:['reports','รายงาน / Export',()=>go('reports')]};
const QUICK_DEFAULT=['expense','schedule','doc','chat','invite','settle'];
function quickKeys(){try{const k=JSON.parse(localStorage.getItem('te_quick_'+currentUser.id)||'null');if(Array.isArray(k)&&k.length)return k.filter(x=>QUICK_ACTIONS[x])}catch(_){}return QUICK_DEFAULT}
function openQuickMenu(){const keys=quickKeys();modal(`<div class="sheethead"><h3>เมนูลัด</h3><div class="spacer"></div><button class="btn sm ghost" onclick="openQuickCustomize()">${lineIcon('settings',15)} ปรับแต่ง</button><button class="btn secondary sm" onclick="closeModal()">ปิด</button></div><div class="quickgrid">${keys.map(k=>{const [i,n]=QUICK_ACTIONS[k];return `<button class="quicktile" onclick="runQuick('${k}')"><span class="qicon">${lineIcon(i)}</span><span class="qname">${n}</span></button>`}).join('')}</div>`,'sheet')}
function runQuick(k){closeModal();try{QUICK_ACTIONS[k][2]()}catch(e){err(e)}}
function openQuickCustomize(){const keys=new Set(quickKeys());modal(`<div class="sheethead"><h3>ปรับแต่งเมนูลัด</h3><div class="spacer"></div><button class="btn secondary sm" onclick="openQuickMenu()">กลับ</button></div><div class="muted mini">เลือกได้สูงสุด 9 รายการ ตามลำดับที่ติ๊ก</div><div class="checklist" style="margin-top:8px">${Object.entries(QUICK_ACTIONS).map(([k,[i,n]])=>`<label class="qkrow"><input type="checkbox" name="qk" value="${k}" ${keys.has(k)?'checked':''}><span class="qkic">${lineIcon(i)}</span><span>${n}</span></label>`).join('')}</div><br><div class="row"><button class="btn" onclick="saveQuick()">บันทึก</button><button class="btn secondary" onclick="try{localStorage.removeItem('te_quick_'+currentUser.id)}catch(_){}openQuickMenu()">คืนค่าเริ่มต้น</button></div>`,'sheet')}
function saveQuick(){const k=[...document.querySelectorAll('input[name="qk"]:checked')].map(x=>x.value);if(!k.length)return alert('เลือกอย่างน้อย 1 รายการ');if(k.length>9)return alert('เลือกได้สูงสุด 9 รายการ');try{localStorage.setItem('te_quick_'+currentUser.id,JSON.stringify(k))}catch(_){}toast('บันทึกเมนูลัดแล้ว');openQuickMenu()}
function openJoinCode(){modal(`<div class="sheethead"><h3>เข้าร่วมด้วย Code</h3><div class="spacer"></div><button class="btn secondary sm" onclick="closeModal()">ปิด</button></div><div class="muted mini">ใส่ Code ของ Group หรือ Trip ที่ได้รับจากเพื่อน</div><div class="field"><input id="qjCode" placeholder="เช่น AB12CD34" autocapitalize="characters" style="font-size:20px;letter-spacing:3px;text-align:center" onkeydown="if(event.key==='Enter')$('qjBtn').click()"></div><button class="btn" id="qjBtn" style="width:100%" onclick="joinByCode($('qjCode').value).catch(err)">เข้าร่วม</button>`,'sheet')}
// ---------- Donut chart ----------
function donutSvg(parts,total,size=150,label='รวมทั้งหมด'){const r=58,C=2*Math.PI*r;let off=0;const segs=parts.filter(p=>p.v>0).map(p=>{const len=total>0?p.v/total*C:0;const s=`<circle r="${r}" cx="75" cy="75" fill="none" stroke="${p.color}" stroke-width="20" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 75 75)"/>`;off+=len;return s}).join('');return `<svg class="donut" viewBox="0 0 150 150" width="${size}" height="${size}"><circle r="${r}" cx="75" cy="75" fill="none" stroke="#eef2f7" stroke-width="20"/>${segs}<text x="75" y="72" text-anchor="middle" class="dv">${esc(moneyShort(total))}</text><text x="75" y="92" text-anchor="middle" class="dl">${esc(label)}</text></svg>`}
function moneyShort(v){v=Number(v||0);return '฿'+(v>=1e6?(v/1e6).toFixed(1)+'M':Math.round(v).toLocaleString('th-TH'))}

// =====================================================================
// ตัวแปลระดับ DOM — ใช้เฉพาะโหมด EN
// แปลข้อความของระบบที่ฝังอยู่ใน template literal/modal ได้ทั้งหมด
// ข้อความที่ผู้ใช้พิมพ์เองจะไม่ถูกแตะ เพราะไม่ตรงกับพจนานุกรม
// =====================================================================
let _trKeys=null,_translating=false;
function trKeys(){if(!_trKeys)_trKeys=Object.keys(TH_EN).sort((a,b)=>b.length-a.length);return _trKeys}
function trText(s){let out=s;for(const k of trKeys()){if(out.includes(k))out=out.split(k).join(TH_EN[k])}return out}
const SKIP_TAGS={SCRIPT:1,STYLE:1,TEXTAREA:1,SVG:1};
function translateDOM(root){
  if(LANG!=='en'||_translating)return;
  root=root||document.body;if(!root||!root.querySelectorAll)return;
  _translating=true;
  try{
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
      if(!n.nodeValue||!/[\u0E00-\u0E7F]/.test(n.nodeValue))return NodeFilter.FILTER_REJECT;
      if(n.parentElement&&SKIP_TAGS[n.parentElement.tagName])return NodeFilter.FILTER_REJECT;
      if(n.parentElement&&n.parentElement.closest('[data-no-tr]'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT}});
    const hits=[];let n;while(n=w.nextNode())hits.push(n);
    hits.forEach(n=>{const v=trText(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v});
    root.querySelectorAll('[placeholder],[title]').forEach(el=>{
      ['placeholder','title'].forEach(a=>{const v=el.getAttribute(a);
        if(v&&/[\u0E00-\u0E7F]/.test(v)){const t2=trText(v);if(t2!==v)el.setAttribute(a,t2)}})});
    root.querySelectorAll('option').forEach(o=>{if(o.closest('[data-no-tr]'))return;if(/[\u0E00-\u0E7F]/.test(o.textContent)){const t2=trText(o.textContent);if(t2!==o.textContent)o.textContent=t2}});
  }finally{_translating=false}
}
// เฝ้าดูการเปลี่ยนแปลงหน้าจอ แล้วแปลอัตโนมัติ (รวมถึง modal ที่เพิ่งเปิด)
let _trTimer=null;
function initAutoTranslate(){
  if(!window.MutationObserver)return;
  const obs=new MutationObserver(()=>{if(LANG!=='en'||_translating)return;clearTimeout(_trTimer);_trTimer=setTimeout(()=>translateDOM(document.body),30)});
  obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  if(LANG==='en')translateDOM(document.body);
}

// ชื่อรายการที่แสดง: ตัดคำนำหน้า "ค่าที่พัก - " ที่ระบบเคยสร้างอัตโนมัติออก (หมวด "ที่พัก" บอกอยู่แล้ว)
function expName(e){const d=String(e?.detail||'').replace(/^ค่าที่พัก\s*-\s*/,'').trim();return d||catName(e?.category)}

// =====================================================================
// คลังไอคอนลายเส้น (line icons) — ใช้แทนอีโมจิทั้งแอป สีตาม currentColor
// =====================================================================
const LINE_ICONS={
 home:'<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9"/>',
 summary:'<path d="M5 20V11M12 20V4M19 20v-7"/><path d="M3 20h18"/>',
 chat:'<path d="M4 5h16v10H8l-4 4V5Z"/>',
 schedule:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
 trips:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
 documents:'<path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v5h5"/><path d="M8.5 13h7M8.5 17h7"/>',
 budget:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14.5" r="1.1" fill="currentColor" stroke="none"/>',
 reports:'<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M6 17v4h12v-4"/>',
 groups:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="8.3" r="2.3"/><path d="M15.3 14.8c2.6.4 4.5 2.4 4.5 5.2"/>',
 friends:'<path d="M12 20s-7-4.4-9.3-8.8C1.1 8 2.6 5 5.7 5c1.8 0 3.1 1 4.3 2.6C11.2 6 12.5 5 14.3 5c3.1 0 4.6 3 3 6.2C19 15.6 12 20 12 20Z"/>',
 profile:'<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5"/>',
 developer:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1"/>',
 expense:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
 invite:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"/><path d="M18 8v6M15 11h6"/>',
 settle:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
 join:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
 swap:'<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
 camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',
 bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
 phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8M12 17.2v.1"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
 logout:'<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 plane:'<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>'
};
function lineIcon(name,size){const d=LINE_ICONS[name];if(!d)return '';const sz=size?` style="width:${size}px;height:${size}px"`:'';return `<svg class="lic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"${sz}>${d}</svg>`}
// แปลงอีโมจิเดิมเป็นชื่อไอคอนลายเส้น (ใช้กับโค้ดส่วนที่ยังส่งอีโมจิมา)
const EMOJI_ICON={'🧳':'trips','👥':'groups','💰':'budget','📄':'documents','🤝':'friends','📊':'reports','📔':'history','🔔':'bell','⚙️':'settings','🗑️':'trash','📲':'phone','🛠️':'developer','❓':'help','ℹ️':'info','👤':'profile','🏠':'home','💬':'chat','🗺️':'schedule','💸':'expense','📨':'invite','✔️':'settle','🔑':'key','🔄':'swap','🖨️':'reports','🖼️':'documents'};
function iconOf(x){return EMOJI_ICON[x]?lineIcon(EMOJI_ICON[x]):x}

// =====================================================================
// ตัวเลือกแบบ bottom-sheet — แทน dropdown ของระบบที่ตัวใหญ่และคุมขนาดไม่ได้
// select เดิมยังอยู่ (ซ่อนไว้) ค่าและ event ทำงานเหมือนเดิมทุกอย่าง
// =====================================================================
function _selLabel(sel){const o=sel.options[sel.selectedIndex];return o?o.textContent.trim():''}
function _syncSelBtn(sel){const b=sel._btn;if(!b)return;const span=b.querySelector('span');const t=_selLabel(sel);if(span._raw!==t){span._raw=t;span.textContent=t||'—'}b.disabled=!!sel.disabled}
function enhanceSelect(sel){
  if(sel._enh||sel.multiple||sel.dataset.native==='1')return;sel._enh=true;
  const b=document.createElement('button');b.type='button';b.className=(sel.className||'')+' selbtn';b.innerHTML='<span></span>';
  if(sel.id)b.id=sel.id+'_btn';
  sel.parentNode.insertBefore(b,sel.nextSibling);sel.style.display='none';sel._btn=b;
  sel.addEventListener('change',()=>_syncSelBtn(sel));
  new MutationObserver(()=>_syncSelBtn(sel)).observe(sel,{childList:true,subtree:true,attributes:true,characterData:true});
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openSelectSheet(sel)});
  _syncSelBtn(sel);
}
function enhanceAllSelects(root){(root||document).querySelectorAll('select').forEach(enhanceSelect)}
function closeSelectSheet(){document.getElementById('selSheet')?.remove()}
function openSelectSheet(sel){
  closeSelectSheet();
  const field=sel.closest('.field');const title=(field?.querySelector('label')?.textContent||sel.title||'').trim();
  const rows=[];const walk=(node)=>{[...node.children].forEach(c=>{if(c.tagName==='OPTGROUP'){rows.push({g:c.label});walk(c)}else if(c.tagName==='OPTION')rows.push({o:c})})};walk(sel);
  const cur=sel.value;
  const wrap=document.createElement('div');wrap.id='selSheet';wrap.className='selsheet';
  if(sel.closest('[data-no-tr]'))wrap.setAttribute('data-no-tr','1');
  wrap.innerHTML=`<div class="selsheet-bg"></div><div class="selsheet-box"><div class="selsheet-head"><b>${esc(title||'')}</b><button type="button" class="btn secondary sm">ปิด</button></div><div class="selsheet-list">${rows.map((r,i)=>r.g!==undefined?`<div class="selgroup">${esc(r.g)}</div>`:`<button type="button" class="selopt ${r.o.value===cur?'on':''}" data-i="${i}" ${r.o.disabled?'disabled':''}><span>${esc(r.o.textContent.trim())}</span><i></i></button>`).join('')}</div></div>`;
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.querySelector('.selsheet-bg').onclick=close;wrap.querySelector('.selsheet-head .btn').onclick=close;
  wrap.querySelectorAll('.selopt').forEach(btn=>btn.onclick=()=>{const o=rows[Number(btn.dataset.i)].o;sel.selectedIndex=o.index;_syncSelBtn(sel);sel.dispatchEvent(new Event('change',{bubbles:true}));close()});
  wrap.querySelector('.selopt.on')?.scrollIntoView?.({block:'center'});
  if(LANG==='en'&&typeof translateDOM==='function')translateDOM(wrap);
}
setInterval(()=>{document.querySelectorAll('select').forEach(x=>{if(x._btn)_syncSelBtn(x)})},400);
(function(){let t=null;const run=()=>{clearTimeout(t);t=setTimeout(()=>{enhanceAllSelects(document);document.querySelectorAll('select').forEach(x=>{if(x._btn)_syncSelBtn(x)})},0)};
  const start=()=>{enhanceAllSelects(document);new MutationObserver(run).observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start()})();

// ตั้งค่า select จากโค้ดแล้วอัปเดตป้ายทันที
function setSel(sel,v){if(!sel)return;sel.value=v;_syncSelBtn(sel)}

// =====================================================================
// แปลงอีโมจิที่เป็น "ไอคอนของระบบ" ให้เป็นไอคอนลายเส้นอัตโนมัติทั้งแอป
// ข้ามข้อความแชต (.bubble) และช่องกรอก เพื่อไม่แตะสิ่งที่ผู้ใช้พิมพ์เอง
// =====================================================================
Object.assign(LINE_ICONS,{
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 clip:'<path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
 shield:'<path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3Z"/>',
 crown:'<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/>',
 pencil:'<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 pin:'<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 download:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 send:'<path d="M21 3L10 14M21 3l-7 18-4-8-8-4 19-6Z"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 ticket:'<path d="M4 8a2 2 0 1 1 0-3.9V4h16v.1a2 2 0 0 1 0 3.9v.1a2 2 0 0 1 0 3.8v.1a2 2 0 0 1 0 3.9v.1H4v-.1a2 2 0 0 1 0-3.9"/><path d="M14 4v16" stroke-dasharray="2.4 2.4"/>',
 block:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
 folder:'<path d="M3 6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z"/>',
 bed:'<path d="M3 18v-7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3"/><path d="M3 14h17a1 1 0 0 1 1 1v3"/><path d="M3 18v3M21 18v3"/>',
 call:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
 train:'<rect x="5" y="3" width="14" height="13" rx="4"/><path d="M5 11h14M9 16l-2 4M15 16l2 4"/>',
 car:'<path d="M4 16V11l2.2-4.4A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.1L20 11v5"/><path d="M4 16h16M6 16v2M18 16v2"/>',
 wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14.5" r="1.1" fill="currentColor" stroke="none"/>'
});
const EMOJI_MAP={'👥':'groups','🔒':'lock','✔️':'check','✔':'check','🤝':'friends','📨':'invite','🔑':'key','🔔':'bell','💬':'chat','📲':'phone','📄':'documents','📎':'clip','✉️':'mail','💰':'budget','📊':'summary','🛠️':'developer','💸':'expense','🖼️':'image','📷':'camera','👁':'eye','⚙️':'settings','⚙':'settings','🧳':'trips','➕':'plus','🛡️':'shield','👤':'profile','📔':'history','🔍':'search','🏨':'bed','🔗':'link','✏️':'pencil','❓':'help','🗺️':'schedule','✕':'x','🔄':'swap','🎟️':'ticket','📞':'call','📘':'globe','🗑️':'trash','🗑':'trash','🖨️':'reports','👑':'crown','🧾':'expense','🚆':'train','🚗':'car','✈️':'plane','🛂':'documents','📁':'folder','🚫':'block','🌐':'globe','🙋':'invite','📋':'copy','📥':'download','📤':'send','📅':'schedule','🗓️':'schedule','🏠':'home','✔️':'check','👛':'wallet','📍':'pin','ℹ️':'info'};
const _emKeys=Object.keys(EMOJI_MAP).sort((a,b)=>b.length-a.length);
const _emRe=new RegExp(_emKeys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
const _emTest=new RegExp(_emKeys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'));
let _lineifying=false;
function lineifyEmoji(root){
  if(_lineifying)return;root=root||document.body;if(!root)return;_lineifying=true;
  try{
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
      const v=n.nodeValue;if(!v||!_emTest.test(v))return NodeFilter.FILTER_REJECT;
      const p=n.parentElement;if(!p)return NodeFilter.FILTER_REJECT;
      if(/^(SCRIPT|STYLE|TEXTAREA|OPTION|SELECT|INPUT|TITLE)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;
      if(p.closest('.bubble,[data-keep-emoji]'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT}});
    const nodes=[];let n;while(n=w.nextNode())nodes.push(n);
    nodes.forEach(node=>{
      const txt=node.nodeValue;const frag=document.createDocumentFragment();let last=0,m;_emRe.lastIndex=0;
      while((m=_emRe.exec(txt))){
        if(m.index>last)frag.appendChild(document.createTextNode(txt.slice(last,m.index)));
        const sp=document.createElement('span');sp.className='lic-i';sp.innerHTML=lineIcon(EMOJI_MAP[m[0]]);frag.appendChild(sp);last=m.index+m[0].length}
      if(last<txt.length)frag.appendChild(document.createTextNode(txt.slice(last)));
      node.parentNode.replaceChild(frag,node)});
    // placeholder เป็นข้อความล้วน ใส่ไอคอนไม่ได้ จึงตัดอีโมจิออก
    root.querySelectorAll('[placeholder]').forEach(el=>{const v=el.getAttribute('placeholder');if(v&&_emTest.test(v))el.setAttribute('placeholder',v.replace(_emRe,'').trim())});
  }finally{_lineifying=false}
}
(function(){let t=null;const start=()=>{lineifyEmoji(document.body);new MutationObserver(()=>{if(_lineifying)return;clearTimeout(t);t=setTimeout(()=>lineifyEmoji(document.body),20)}).observe(document.body,{childList:true,subtree:true,characterData:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start()})();

// แผงปุ่มทำรายการ (ไอคอน + ชื่อ) ใช้ทั้งหน้ารายละเอียด Trip และ Group
// items: [{icon,label,act,danger}] — ข้ามรายการที่เป็น null/false
function actionPanel(items){const list=items.filter(Boolean);if(!list.length)return '';return `<div class="actgrid">${list.map(i=>`<button type="button" class="actbtn${i.danger?' danger':''}" onclick="${i.act}"><span class="actic">${lineIcon(i.icon)}</span><span>${i.label}</span></button>`).join('')}</div>`}

// ฟอร์ม "เพิ่ม" แบบรวม: แท็บ ค่าใช้จ่าย | การเดินทาง สลับกันได้ในหน้าต่างเดียว (คงวันที่ที่เลือกไว้)
let _addDate=null;
function addTabsHtml(active){return `<div class="sheethead"><h3>เพิ่ม</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="closeModal()">ปิด</button></div><div class="segtabs"><button type="button" class="${active==='expense'?'active':''}" onclick="switchAddTab('expense')">ค่าใช้จ่าย</button><button type="button" class="${active==='schedule'?'active':''}" onclick="switchAddTab('schedule')">การเดินทาง</button></div>`}
function openAdd(date,tab){_addDate=date||null;return tab==='expense'?openExpenseForm(date):openScheduleForm(curTripId,date)}
function switchAddTab(tab){const d=$('ed')?.value||$('sd')?.value||_addDate||null;closeModal();return openAdd(d,tab)}
