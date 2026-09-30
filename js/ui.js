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
async function uploadMedia(folder,file,w,h,oldPath){const f=await cropImage(file,w,h);const path=`${folder}/${uniqId()}.jpg`;const {error}=await sb.storage.from('avatars').upload(path,f,{contentType:'image/jpeg',upsert:false});if(error)throw error;if(oldPath&&oldPath!==path)sb.storage.from('avatars').remove([oldPath]).catch(()=>{});return path}
async function changeMyAvatar(){try{const file=await pickImage();if(!file)return;toast('กำลังอัปโหลดรูป...');const path=await uploadMedia(`users/${currentUser.id}`,file,400,400,me?.avatar_url);const {error}=await sb.from('profiles').update({avatar_url:path,updated_at:new Date().toISOString()}).eq('id',currentUser.id);if(error)throw error;me.avatar_url=path;await render();renderProfilePage();toast('เปลี่ยนรูปโปรไฟล์แล้ว')}catch(e){err(e)}}
async function removeMyAvatar(){if(!me?.avatar_url||!confirm('ลบรูปโปรไฟล์?'))return;try{const old=me.avatar_url;const {error}=await sb.from('profiles').update({avatar_url:null}).eq('id',currentUser.id);if(error)throw error;sb.storage.from('avatars').remove([old]).catch(()=>{});me.avatar_url=null;await render();renderProfilePage()}catch(e){err(e)}}
async function changeTripPhoto(tid){try{const t=tripById(tid);if(!t||!canAdmin(tid))return;const file=await pickImage();if(!file)return;toast('กำลังอัปโหลดรูปปก...');const path=await uploadMedia(`trips/${tid}`,file,1200,640,t.photo_path);const {error}=await sb.from('trips').update({photo_path:path,updated_at:new Date().toISOString()}).eq('id',tid);if(error)throw error;await render();toast('เปลี่ยนรูปปก Trip แล้ว');if($('modal').innerHTML)closeModal()}catch(e){err(e)}}
async function changeGroupPhoto(gid){try{const g=cache.groups.find(x=>x.id===gid);if(!g)return;const file=await pickImage();if(!file)return;toast('กำลังอัปโหลดรูป...');const path=await uploadMedia(`groups/${gid}`,file,400,400,g.photo_path);const {error}=await sb.from('groups').update({photo_path:path}).eq('id',gid);if(error)throw error;await render();toast('เปลี่ยนรูป Group แล้ว');openGroupEdit(gid)}catch(e){err(e)}}
function openGroupEdit(gid){const g=cache.groups.find(x=>x.id===gid);if(!g)return;modal(`<div class="section"><h3>✏️ แก้ไข Group</h3><div class="spacer"></div><button class="btn secondary" onclick="closeModal()">ปิด</button></div><div style="text-align:center">${photoHtml(g.photo_path,'👥',96,'round')}<div><button class="btn sm secondary" style="margin-top:8px" onclick="changeGroupPhoto('${gid}')">📷 เปลี่ยนรูป Group</button></div></div><div class="field"><label>ชื่อ Group</label><input id="grpName" maxlength="80" value="${esc(g.name)}"></div><button class="btn" id="grpSaveBtn" onclick="saveGroupName('${gid}')">บันทึก</button>`)}
async function saveGroupName(gid){const btn=$('grpSaveBtn');try{const name=$('grpName').value.trim();if(!name)throw new Error('กรุณาใส่ชื่อ Group');btn.disabled=true;const {error}=await sb.from('groups').update({name}).eq('id',gid);if(error)throw error;closeModal();await render();toast('แก้ไขชื่อ Group แล้ว')}catch(e){err(e)}finally{if(btn)btn.disabled=false}}
// ---------- Splash / หน้า Log-in ----------
const splashStart=Date.now();
function hideSplash(){const s=$('splash');if(!s||s.classList.contains('gone'))return;const wait=Math.max(0,1100-(Date.now()-splashStart));setTimeout(()=>{s.classList.add('fade');setTimeout(()=>s.classList.add('gone'),450)},wait)}
function showWelcome(){['authLogin','authRegister'].forEach(id=>$(id)?.classList.add('hide'));$('authWelcome')?.classList.remove('hide')}
// ---------- Header ----------
function renderHeaderAvatar(){const el=$('hdrAvatar');if(el&&me){el.innerHTML=avatarHtml({...me,id:currentUser.id},34);hydrateMedia(el)}}
// ---------- เมนูลัด ＋ (ปรับแต่งได้) ----------
const QUICK_ACTIONS={expense:['💸','เพิ่มค่าใช้จ่าย',()=>openExpenseForm()],schedule:['🗺️','เพิ่ม Schedule',()=>openScheduleForm()],doc:['📄','เพิ่มเอกสาร',()=>openDocForm()],chat:['💬','แชตใน Trip',()=>curTripId?openChatFor('trip',curTripId):go('chat')],invite:['📨','เชิญเข้า Trip',()=>curTripId?openInviteModal('trip',curTripId):alert('กรุณาเลือก Trip ก่อน')],settle:['✔️','บันทึกการชำระ',()=>openSummary('overview',true)],budget:['💰','ตั้งงบประมาณ',()=>openBudgetForm()],summary:['📊','ดูสรุปค่าใช้จ่าย',()=>openSummary('overview')],join:['🔑','ใส่ Code เข้าร่วม',()=>openJoinCode()],newtrip:['🧳','สร้าง Trip ใหม่',()=>openTripForm()],friend:['🤝','เพิ่มเพื่อน',()=>go('friends')],switch:['🔄','เปลี่ยน Trip',()=>go('trips')],members:['👥','สมาชิก Trip',()=>curTripId&&openTripDetail(curTripId,'members')],report:['🖨️','รายงาน / Export',()=>go('reports')]};
const QUICK_DEFAULT=['expense','schedule','doc','chat','invite','settle'];
function quickKeys(){try{const k=JSON.parse(localStorage.getItem('te_quick_'+currentUser.id)||'null');if(Array.isArray(k)&&k.length)return k.filter(x=>QUICK_ACTIONS[x])}catch(_){}return QUICK_DEFAULT}
function openQuickMenu(){const keys=quickKeys();modal(`<div class="sheethead"><h3>เมนูลัด</h3><div class="spacer"></div><button class="btn sm ghost" onclick="openQuickCustomize()">⚙️ ปรับแต่ง</button><button class="btn secondary sm" onclick="closeModal()">ปิด</button></div><div class="quickgrid">${keys.map(k=>{const [i,n]=QUICK_ACTIONS[k];return `<button class="quicktile" onclick="runQuick('${k}')"><span>${i}</span>${n}</button>`}).join('')}</div>`,'sheet')}
function runQuick(k){closeModal();try{QUICK_ACTIONS[k][2]()}catch(e){err(e)}}
function openQuickCustomize(){const keys=new Set(quickKeys());modal(`<div class="sheethead"><h3>⚙️ ปรับแต่งเมนูลัด</h3><div class="spacer"></div><button class="btn secondary sm" onclick="openQuickMenu()">กลับ</button></div><div class="muted mini">เลือกได้สูงสุด 9 รายการ ตามลำดับที่ติ๊ก</div><div class="checklist" style="margin-top:8px">${Object.entries(QUICK_ACTIONS).map(([k,[i,n]])=>`<label><input type="checkbox" name="qk" value="${k}" ${keys.has(k)?'checked':''}> ${i} ${n}</label>`).join('')}</div><br><div class="row"><button class="btn" onclick="saveQuick()">บันทึก</button><button class="btn secondary" onclick="try{localStorage.removeItem('te_quick_'+currentUser.id)}catch(_){}openQuickMenu()">คืนค่าเริ่มต้น</button></div>`,'sheet')}
function saveQuick(){const k=[...document.querySelectorAll('input[name="qk"]:checked')].map(x=>x.value);if(!k.length)return alert('เลือกอย่างน้อย 1 รายการ');if(k.length>9)return alert('เลือกได้สูงสุด 9 รายการ');try{localStorage.setItem('te_quick_'+currentUser.id,JSON.stringify(k))}catch(_){}toast('บันทึกเมนูลัดแล้ว');openQuickMenu()}
function openJoinCode(){modal(`<div class="sheethead"><h3>🔑 เข้าร่วมด้วย Code</h3><div class="spacer"></div><button class="btn secondary sm" onclick="closeModal()">ปิด</button></div><div class="muted mini">ใส่ Code ของ Group หรือ Trip ที่ได้รับจากเพื่อน</div><div class="field"><input id="qjCode" placeholder="เช่น AB12CD34" autocapitalize="characters" style="font-size:20px;letter-spacing:3px;text-align:center" onkeydown="if(event.key==='Enter')$('qjBtn').click()"></div><button class="btn" id="qjBtn" style="width:100%" onclick="joinByCode($('qjCode').value).catch(err)">เข้าร่วม</button>`,'sheet')}
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
