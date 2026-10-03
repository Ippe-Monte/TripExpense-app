// =====================================================================
// TripExpense V14 — core.js
// Supabase client, state, สิทธิ์, Trip ปัจจุบัน, การโหลดข้อมูล, auth, helpers
// =====================================================================
const SUPABASE_URL=window.TRIP_EXPENSE_CONFIG?.SUPABASE_URL||'';
const SUPABASE_PUBLISHABLE_KEY=window.TRIP_EXPENSE_CONFIG?.SUPABASE_PUBLISHABLE_KEY||'';
const APP_URL=location.origin+location.pathname;
const $=id=>document.getElementById(id);
let sb=null,currentUser=null,me=null,myContacts=null,isDev=false,curTripId=null,devViewId=null;
let calCursor=null,calInit=false,authBusy=false;
const cache={groups:[],trips:[],roles:{},tripMembers:[],members:[],schedules:[],expenses:[],budgets:[],budgetError:null,receipts:[],receiptError:null,documents:[],docFiles:[],docError:null,payments:[],paymentError:null,refunds:[],refundError:null};
// =====================================================================
// i18n — ระบบสองภาษา (TH/EN) สำหรับข้อความของระบบ
// ข้อความที่ผู้ใช้พิมพ์เอง (ชื่อ Group/Trip, หมายเหตุ, รายละเอียดค่าใช้จ่าย ฯลฯ) จะไม่ถูกแปล
// เก็บภาษาที่เลือกไว้ในเครื่องนี้ (localStorage) ต่อผู้ใช้ 1 คน
// =====================================================================
const APP_VERSION='2.0.6';
let LANG=(function(){try{return localStorage.getItem('te_lang')||'th'}catch(_){return 'th'}})();
const I18N={
 th:{ t_portfolio:'แผนที่การเที่ยวของฉัน',s_portfolio:'เหรียญพิชิตและหมุดที่เคยไป',t_offers:'ข้อเสนอจากระบบ',s_offers:'ข้อเสนอท่องเที่ยวที่เคยแสดง',t_explore:'สำรวจ',s_explore:'ที่พัก ตั๋ว การเดินทาง ดีล และอื่นๆ',t_admin:'Developer',s_admin:'สถิติรวมและตั้งค่าโฆษณา แคมเปญ พันธมิตร',nav_explore:'สำรวจ', nav_home:'หน้าหลัก',nav_summary:'สรุป',nav_chat:'แชต',nav_schedule:'Schedule',nav_trips:'จัดการทริป',nav_documents:'เอกสาร',nav_budget:'งบประมาณ',nav_reports:'รายงาน',nav_groups:'กลุ่ม',nav_friends:'เพื่อน',nav_profile:'โปรไฟล์',nav_developer:'Developer',
   t_dashboard:'หน้าหลัก',s_dashboard:'ภาพรวมของ Trip ปัจจุบัน',t_summary:'สรุปค่าใช้จ่าย',s_summary:'ภาพรวม · รายวัน · หมวดหมู่ · รายการ',t_groups:'กลุ่มของฉัน',s_groups:'Groups',t_trips:'จัดการทริป',s_trips:'Trip ของฉันและ Trip ใน Group',t_schedule:'Schedule',s_schedule:'ตารางเดินทาง',t_documents:'เอกสาร',s_documents:'เอกสารการเดินทาง',t_budget:'งบประมาณ',s_budget:'Budget',t_reports:'รายงานสรุป',s_reports:'Reports & Export',t_settings:'ข้อมูลส่วนตัว',s_settings:'ข้อมูลติดต่อและความปลอดภัย',t_developer:'Developer Console',s_developer:'ภาพรวมทั้งระบบ (ดูได้อย่างเดียว)',t_chat:'แชต',s_chat:'คุยกับสมาชิก Trip และ Group',t_friends:'เพื่อน',s_friends:'Friend Code และรายชื่อเพื่อน',t_profile:'โปรไฟล์',s_profile:'บัญชีของฉัน',t_history:'ประวัติการเดินทาง',s_history:'ทริปที่จบแล้วทั้งหมดของคุณ',
   auth_lead:'บันทึกค่าใช้จ่ายทริปของคุณ ให้ทุกการเดินทาง..คุ้มค่ากว่าเดิม',auth_start:'เริ่มใช้งาน',auth_login:'เข้าสู่ระบบ',auth_back:'‹ กลับ',auth_email:'อีเมล',auth_pass:'รหัสผ่าน',auth_pass8:'รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)',auth_forgot:'ลืมรหัสผ่าน?',auth_signup:'สมัครสมาชิก',auth_name:'ชื่อ',auth_create:'สร้างบัญชี',auth_havelogin:'มีบัญชีแล้ว?',auth_signin_h:'เข้าสู่ระบบ',auth_signup_h:'สร้างบัญชีใหม่',
   feat_track1:'บันทึกรายจ่าย',feat_track2:'ง่ายๆ',feat_sum1:'สรุปค่าใช้จ่าย',feat_sum2:'อัตโนมัติ',feat_share1:'แชร์ทริป',feat_share2:'กับเพื่อนได้',feat_go1:'เดินทาง',feat_go2:'ได้สบายใจ',
   lang_label:'ภาษา',lang_th:'ไทย',lang_en:'English',
   pol_open:'เปิด',pol_password:'รหัสผ่าน',pol_invite:'เชิญเท่านั้น',
   role_owner:'Owner',role_admin:'Admin',role_member:'Member',
   st_planning:'วางแผน',st_traveling:'กำลังเดินทาง',st_ended:'เดินทางเสร็จแล้ว',st_closed:'ปิดแล้ว',
   cat_hotel:'ที่พัก',cat_food:'อาหาร',cat_transport:'เดินทาง',cat_activity:'กิจกรรม',cat_shopping:'ช้อปปิ้ง',cat_car:'รถเช่า',cat_other:'อื่นๆ',
 },
 en:{ t_portfolio:'My travel map',s_portfolio:'Medals and pins from your trips',t_offers:'Offers',s_offers:'Travel offers shown to you',t_explore:'Explore',s_explore:'Stays, tickets, transport, deals and more',t_admin:'Developer',s_admin:'Overview and settings for ads, campaigns and partners',nav_explore:'Explore', nav_home:'Home',nav_summary:'Summary',nav_chat:'Chat',nav_schedule:'Schedule',nav_trips:'My Trips',nav_documents:'Documents',nav_budget:'Budget',nav_reports:'Reports',nav_groups:'Groups',nav_friends:'Friends',nav_profile:'Profile',nav_developer:'Developer',
   t_dashboard:'Home',s_dashboard:"Overview of your current trip",t_summary:'Summary',s_summary:'Overview · Daily · Category · List',t_groups:'My Groups',s_groups:'Groups',t_trips:'My Trips',s_trips:'Your trips and trips in your groups',t_schedule:'Schedule',s_schedule:'Travel itinerary',t_documents:'Documents',s_documents:'Travel documents',t_budget:'Budget',s_budget:'Budget',t_reports:'Reports',s_reports:'Reports & Export',t_settings:'Profile Settings',s_settings:'Contact info & security',t_developer:'Developer Console',s_developer:'System overview (read-only)',t_chat:'Chat',s_chat:'Talk with trip and group members',t_friends:'Friends',s_friends:'Friend code and friend list',t_profile:'Profile',s_profile:'My account',t_history:'Travel History',s_history:'All your completed trips',
   auth_lead:'Track your trip expenses so every journey is worth more.',auth_start:'Get Started',auth_login:'Log In',auth_back:'‹ Back',auth_email:'Email',auth_pass:'Password',auth_pass8:'Password (at least 8 characters)',auth_forgot:'Forgot password?',auth_signup:'Sign up',auth_name:'Name',auth_create:'Create account',auth_havelogin:'Already have an account?',auth_signin_h:'Log In',auth_signup_h:'Create a new account',
   feat_track1:'Track expenses',feat_track2:'easily',feat_sum1:'Expense',feat_sum2:'summary',feat_share1:'Share trips',feat_share2:'with friends',feat_go1:'Travel',feat_go2:'worry-free',
   lang_label:'Language',lang_th:'ไทย',lang_en:'English',
   pol_open:'Open',pol_password:'Password',pol_invite:'Invite only',
   role_owner:'Owner',role_admin:'Admin',role_member:'Member',
   st_planning:'Planning',st_traveling:'Traveling',st_ended:'Trip ended',st_closed:'Closed',
   cat_hotel:'Stay',cat_food:'Food',cat_transport:'Transport',cat_activity:'Activity',cat_shopping:'Shopping',cat_car:'Car rental',cat_other:'Other',
 }
};
function tr(k){return (I18N[LANG]&&I18N[LANG][k])??(I18N.th[k])??k}
function applyLangStatic(root){(root||document).querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=tr(el.dataset.i18n)});(root||document).querySelectorAll('[data-i18n-ph]').forEach(el=>{el.placeholder=tr(el.dataset.i18nPh)});document.documentElement.lang=LANG==='en'?'en':'th';document.querySelectorAll('.appver').forEach(el=>el.textContent=APP_VERSION);document.querySelectorAll('.langChip').forEach(el=>el.textContent=LANG.toUpperCase())}
function setLang(l){if(l===LANG)return;try{localStorage.setItem('te_lang',l)}catch(_){}location.reload()}
function toggleLang(){setLang(LANG==='th'?'en':'th')}
const titles={dashboard:['t_dashboard','s_dashboard'],summary:['t_summary','s_summary'],groups:['t_groups','s_groups'],trips:['t_trips','s_trips'],schedule:['t_schedule','s_schedule'],documents:['t_documents','s_documents'],budget:['t_budget','s_budget'],reports:['t_reports','s_reports'],settings:['t_settings','s_settings'],developer:['t_developer','s_developer'],chat:['t_chat','s_chat'],friends:['t_friends','s_friends'],profile:['t_profile','s_profile'],history:['t_history','s_history'],portfolio:['t_portfolio','s_portfolio'],offers:['t_offers','s_offers'],explore:['t_explore','s_explore'],admin:['t_admin','s_admin']};
// ---------- utils ----------
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function money(v){return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:2}).format(Number(v||0))}
function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function today(){return ymd(new Date())}
function thaiDate(ds){return new Date(ds+'T00:00:00').toLocaleDateString(LANG==='en'?'en-GB':'th-TH',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
function toast(msg){$('toast').textContent=msg;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2600)}
function tripById(id){return id?cache.trips.find(t=>t.id===id)||null:null}
function tripEnd(t){return t?.end_date||t?.start_date||''}
function inTrip(t,ds){return !!t?.start_date&&!!ds&&ds>=t.start_date&&ds<=tripEnd(t)}
function tripDates(t){if(!t?.start_date)return [];const out=[],end=tripEnd(t),d=new Date(t.start_date+'T00:00:00');for(let i=0;i<400;i++){const s=ymd(d);if(s>end)break;out.push(s);d.setDate(d.getDate()+1)}return out}
function tripRangeText(t){return t?.start_date?`${fmtRange(t)} (${tripDates(t).length} วัน)`:'Trip นี้ยังไม่ได้กำหนดวันเดินทาง'}
function checkTripDates(s,e){if(s&&e&&e<s)throw new Error('วันกลับต้องไม่ก่อนวันเริ่ม')}
function rpcId(d){if(!d)return null;if(typeof d==='string')return d;if(Array.isArray(d))return rpcId(d[0]);return d.id||d.trip_id||null}
async function selectIn(table,cols,col,ids,size=150){const out=[];for(let i=0;i<ids.length;i+=size){const {data,error}=await sb.from(table).select(cols).in(col,ids.slice(i,i+size));if(error)throw error;out.push(...(data||[]))}return out}
function modal(html,cls){$('modal').innerHTML=html;$('modal').className='modal'+(cls?' '+cls:'');$('mb').classList.add('show');if(typeof hydrateMedia==='function')hydrateMedia($('modal'))};function closeModal(){$('mb').classList.remove('show');$('modal').innerHTML='';$('modal').className='modal'}
function showRegister(){['authLogin','authWelcome'].forEach(id=>$(id)?.classList.add('hide'));$('authRegister').classList.remove('hide')}
function showLogin(){['authRegister','authWelcome'].forEach(id=>$(id)?.classList.add('hide'));$('authLogin').classList.remove('hide')}
function csvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"'}
function downloadBlob(text,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
// ---------- บทบาทและสิทธิ์ (UI) — ฐานข้อมูลบังคับสิทธิ์จริงด้วย RLS ----------
function curTrip(){return tripById(curTripId)}
function myRole(tid=curTripId){return cache.roles[tid]||null}
function isTripAdmin(tid=curTripId){return ['owner','admin'].includes(myRole(tid))}
function isClosed(t=curTrip()){return t?.status==='closed'}
function canWrite(tid=curTripId){return !!myRole(tid)&&!isClosed(tripById(tid))}
function canAdmin(tid=curTripId){return isTripAdmin(tid)&&canWrite(tid)}
function canEditRow(row){return canWrite()&&(row?.created_by===currentUser?.id||isTripAdmin())}
function roleName(r){const ic={owner:'👑 ',admin:'🛡️ ',member:''}[r]||'';const key={owner:'role_owner',admin:'role_admin',member:'role_member'}[r];return key?ic+tr(key):(r||'-')}
function tripStatus(t){if(!t)return {key:'none',label:'-'};if(t.status==='closed')return {key:'closed',label:'🔒 '+tr('st_closed')};const td=today();if(t.start_date&&td<t.start_date)return {key:'planning',label:'🟡 '+tr('st_planning')};if(t.start_date&&td<=tripEnd(t))return {key:'traveling',label:'🟢 '+tr('st_traveling')};if(t.start_date&&td>tripEnd(t))return {key:'ended',label:'⚪ '+tr('st_ended')};return {key:'planning',label:'🟡 '+tr('st_planning')}}
function displayName(p){return p?(String(p.nickname||'').trim()||String(p.full_name||'').trim()||String(p.id||'').slice(0,8)):'-'}
function memberName(uid){return displayName(cache.members.find(m=>m.id===uid)||{id:uid})}
function payerName(id){return memberName(id)}
function applyAccessClasses(){document.body.classList.toggle('ro',!canWrite());document.body.classList.toggle('notadm',!canAdmin());document.body.classList.toggle('isdev',isDev);const b=$('tripBanner');if(!b)return;const t=curTrip();let html='';if(devViewId&&t)html=`<div class="banner dev">👁 โหมด Developer: กำลังดู <b>${esc(t.trip_no)} · ${esc(t.name)}</b> แบบอ่านอย่างเดียว <button class="btn sm secondary" onclick="exitDevView()">ออกจากโหมดดู</button></div>`;else if(t&&isClosed(t))html=`<div class="banner closed">🔒 Trip นี้ปิดแล้ว — ดูได้อย่างเดียว${isTripAdmin()?` <button class="btn sm secondary" onclick="reopenTrip('${t.id}')">เปิด Trip อีกครั้ง</button>`:''}</div>`;b.innerHTML=html}
function saveCurTrip(){try{if(curTripId&&!devViewId)localStorage.setItem('te_cur_trip_'+currentUser.id,curTripId)}catch(_){}}
function pickDefaultTrip(){let saved=null;try{saved=localStorage.getItem('te_cur_trip_'+currentUser.id)}catch(_){}if(saved&&cache.roles[saved])return saved;const mine=cache.trips.filter(t=>cache.roles[t.id]);const open=mine.filter(t=>t.status!=='closed');const td=today();return (open.find(t=>inTrip(t,td))||open.filter(t=>t.start_date&&t.start_date>=td).sort((a,b)=>a.start_date.localeCompare(b.start_date))[0]||open[0]||mine[0])?.id||null}
async function switchTrip(id){if(!id)return;devViewId=null;curTripId=id;calInit=false;saveCurTrip();await render()}
// ---------- Error messages ----------
const ERR_TEXT={NOT_AUTHENTICATED:'กรุณาเข้าสู่ระบบใหม่',TRIP_NOT_FOUND:'ไม่พบ Trip',NOT_GROUP_MEMBER:'คุณไม่ได้เป็นสมาชิก Group นี้',INVALID_BUDGET:'กรุณาระบุงบประมาณมากกว่า 0',INVALID_ALERT_PERCENT:'เปอร์เซ็นต์แจ้งเตือนต้องอยู่ระหว่าง 1-100',GROUP_NOT_FOUND:'ไม่พบ Group Code',NOT_TRIP_ADMIN:'เฉพาะ Owner หรือ Admin ของ Trip ที่ยังไม่ปิดเท่านั้น',NOT_TRIP_OWNER:'เฉพาะ Owner ของ Trip เท่านั้น',NOT_GROUP_OWNER:'เฉพาะ Owner ของ Group เท่านั้น',NOT_GROUP_ADMIN:'เฉพาะ Owner หรือ Admin ของ Group เท่านั้น',CANNOT_REMOVE_OWNER:'ไม่สามารถนำ Owner ออกได้',OWNER_CANNOT_LEAVE:'Owner ออกจากกลุ่มไม่ได้',MEMBER_NOT_FOUND:'ไม่พบสมาชิก',MEMBER_HAS_EXPENSES:'สมาชิกคนนี้มีค่าใช้จ่ายหรือส่วนที่ต้องหารอยู่ใน Trip จึงนำออกไม่ได้ (ต้องแก้ไขรายการค่าใช้จ่ายก่อน)',INVALID_ROLE:'บทบาทไม่ถูกต้อง',NOT_DEVELOPER:'เฉพาะ Developer เท่านั้น',INVALID_STATUS:'สถานะไม่ถูกต้อง',REFUND_EXCEEDS_AMOUNT:'ยอดคืนเงินรวมเกินยอดค่าใช้จ่าย',AMOUNT_BELOW_REFUNDS:'จำนวนเงินต้องไม่น้อยกว่ายอดที่คืนไปแล้ว',NOT_TARGET_ADMIN:'เฉพาะ Owner/Admin เท่านั้น (Trip ต้องยังไม่ปิด)',INVALID_POLICY:'การตั้งค่าไม่ถูกต้อง',PASSWORD_REQUIRED:'กรุณาตั้งรหัสผ่านสำหรับการเข้าร่วม',PASSWORD_TOO_SHORT:'รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร',NOT_MEMBER:'เฉพาะสมาชิกเท่านั้น',TRIP_CLOSED:'Trip นี้ปิดแล้ว เข้าร่วมหรือเชิญเพิ่มไม่ได้',INVALID_EMAIL:'รูปแบบอีเมลไม่ถูกต้อง',CANNOT_INVITE_SELF:'เชิญตัวเองไม่ได้',INVITATION_NOT_PENDING:'คำเชิญนี้ถูกดำเนินการไปแล้ว',REQUEST_NOT_PENDING:'คำขอนี้ถูกดำเนินการไปแล้ว',INVITE_ONLY:'กลุ่มนี้ตั้งเป็น "เชิญเท่านั้น"',PASSWORD_REQUIRED_JOIN:'ต้องใช้รหัสผ่าน',TOO_MANY:'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาที',NOT_FRIEND:'เชิญได้เฉพาะเพื่อน หรือคนที่อยู่ Group/Trip เดียวกัน',MESSAGE_NOT_FOUND:'ไม่พบข้อความ',INVALID_USER:'ผู้ใช้ไม่ถูกต้อง'};
function friendlyError(e){const m=e?.message||String(e),c=e?.code||'';if(ERR_TEXT[m])return ERR_TEXT[m];if(c==='PGRST202'||/could not find the function/i.test(m))return 'ไม่พบฟังก์ชันในฐานข้อมูล กรุณารันไฟล์ sql/v14_security.sql ใน Supabase SQL Editor ก่อน\n('+m+')';if(c==='42P01'||c==='PGRST205'||/does not exist|could not find the table/i.test(m))return 'ไม่พบตาราง/คอลัมน์ในฐานข้อมูล กรุณารันไฟล์ sql/v14_security.sql ใน Supabase SQL Editor ก่อน\n('+m+')';if(c==='42501'||/row-level security|permission denied/i.test(m))return isClosed()?'Trip นี้ปิดแล้ว จึงแก้ไขข้อมูลไม่ได้':'คุณไม่มีสิทธิ์ทำรายการนี้ (อาจเป็นรายการที่คนอื่นสร้าง หรือต้องเป็น Admin)';if(/trips_date_range_chk/.test(m))return 'วันกลับต้องไม่ก่อนวันเริ่ม';if(c==='23502'||/violates not-null constraint/i.test(m))return 'ข้อมูลในฐานข้อมูลขาดค่าที่จำเป็น\n('+m+')';if(/Database error saving new user/i.test(m))return 'สมัครสมาชิกไม่สำเร็จ อีเมลนี้อาจถูกใช้สมัครไปแล้ว ลองเข้าสู่ระบบ หรือตรวจสอบอีเมลยืนยันในกล่องจดหมาย';if(/User already registered/i.test(m))return 'อีเมลนี้สมัครไว้แล้ว กรุณาเข้าสู่ระบบ';if(/Invalid login credentials/i.test(m))return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';if(/Email not confirmed/i.test(m))return 'ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย';if(/Password should be at least/i.test(m))return 'รหัสผ่านสั้นเกินไป';if(/rate limit|too many/i.test(m))return 'ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';return m}
function err(e){console.error(e);alert(friendlyError(e))}
function ready(){return SUPABASE_URL.startsWith('http')&&!SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_')}
// หน้าย่อยที่เข้าจากเมนูโปรไฟล์: มีปุ่มย้อนกลับ + ไม่แสดงตัวเลือก Trip ที่มุมซ้ายบน (บนมือถือ)
const SUBPAGES=['trips','groups','documents','friends','reports','history','settings','developer','portfolio','offers','admin'];
const NOTRIP_PAGES=['profile',...SUBPAGES];
// ปุ่มหลักของแต่ละหน้า: อยู่ในแถบหัวข้อที่ติดอยู่กับที่ (cls 'w' = ซ่อนเมื่อแก้ไขไม่ได้)
const PAGE_ACTIONS={portfolio:[{l:'＋ เช็กอิน',f:"openCheckin()"}],
  trips:[{l:'＋ สร้าง Trip',f:"openTripForm()"}],
  groups:[{l:'＋ สร้าง Group',f:"createGroup()"}],
  documents:[{l:'＋ เพิ่มเอกสาร',f:"openDocForm()",w:1}],
  reports:[{l:'PDF / Print',f:"printReport()",sec:1},{l:'Excel',f:"exportReportXLSX()"}]
};
// Schedule: ปุ่มที่แถบชื่อหน้าเปลี่ยนตามแท็บ — ตารางเดินทาง = เพิ่มรายการ · แผนที่ = เพิ่มสถานที่ของวันที่เลือก (เฉพาะเมื่อแก้ Trip ได้)
PAGE_ACTIONS.schedule=()=>{const map=$('schedMapView')&&!$('schedMapView').classList.contains('hide');return map?(canWrite()?[{l:'＋ เพิ่มสถานที่',f:"openAdd(schedMapDay,'schedule')",w:1}]:[]):[{l:'＋ เพิ่ม',f:"openAdd(null,'schedule')",w:1}]};
const _navStack=[];let _curPage=null,_goingBack=false;
function goBack(){let prev=_navStack.pop();while(prev&&prev===_curPage)prev=_navStack.pop();_goingBack=true;go(prev||'profile');_goingBack=false}
function renderPageActions(p){const el=$('pageActions');if(!el)return;el.innerHTML=((typeof PAGE_ACTIONS[p]==='function'?PAGE_ACTIONS[p]():PAGE_ACTIONS[p])||[]).map(a=>`<button type="button" class="btn sm${a.sec?' secondary':''}${a.w?' w':''}" onclick="${a.f}">${a.l}</button>`).join('')}
function go(p){if(p==='expenses')p='summary';if(p==='more')p='profile';if(p==='developer'&&!isDev)p='dashboard';
  if(_curPage&&_curPage!==p&&!_goingBack){_navStack.push(_curPage);if(_navStack.length>12)_navStack.shift()}_curPage=p;
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(p).classList.add('active');document.querySelectorAll('[data-p]').forEach(x=>x.classList.toggle('active',x.dataset.p===p));
  $('pt').textContent=tr(titles[p][0]);$('ps').textContent=tr(titles[p][1]);if($('pt2')){$('pt2').textContent=tr(titles[p][0]);$('ps2').textContent=tr(titles[p][1])}
  document.body.classList.toggle('subpage',SUBPAGES.includes(p));document.body.classList.toggle('notrip',NOTRIP_PAGES.includes(p));renderPageActions(p);
  if(p==='developer')renderDeveloper();if(p==='settings')renderProfile();if(p==='chat')renderChatPage();if(p==='summary')renderSummary();if(p==='profile')renderProfilePage();if(p==='history')renderHistory();document.body.dataset.page=p;if(p==='friends')renderFriends();if(p==='portfolio')renderPortfolio();if(p==='offers')renderOffers();if(p==='explore')renderExplore();if(p==='admin')renderAdmin();if(typeof hydrateAdSlots==='function')hydrateAdSlots();window.scrollTo(0,0)}
// ---------- โหลดข้อมูล: รายการ Trip ทั้งหมดของฉัน + ข้อมูลละเอียดเฉพาะ Trip ปัจจุบัน ----------
async function loadAll(){
  const {data:gm,error:ge}=await sb.from('group_members').select('group_id,role,groups(id,name,code,owner_id,join_policy,photo_path)').eq('user_id',currentUser.id);if(ge)throw ge;
  cache.groups=(gm||[]).filter(x=>x.groups).map(x=>({...x.groups,role:x.role}));
  const {data:tm,error:te}=await sb.from('trip_members').select('trip_id,role').eq('user_id',currentUser.id);if(te)throw te;
  cache.roles=Object.fromEntries((tm||[]).map(x=>[x.trip_id,x.role]));
  const myIds=Object.keys(cache.roles),gids=cache.groups.map(g=>g.id);
  const [a,b]=await Promise.all([myIds.length?selectIn('trips','*','id',myIds):[],gids.length?selectIn('trips','*','group_id',gids):[]]);
  const map=new Map();[...a,...b].forEach(t=>map.set(t.id,t));
  if(devViewId&&isDev&&!map.has(devViewId)){const {data:dt,error:de}=await sb.from('trips').select('*').eq('id',devViewId).maybeSingle();if(de)throw de;if(dt)map.set(dt.id,dt);else devViewId=null}
  cache.trips=[...map.values()].sort((x,y)=>String(y.created_at||'').localeCompare(String(x.created_at||'')));
  if(devViewId)curTripId=devViewId;else if(!curTripId||!cache.roles[curTripId])curTripId=pickDefaultTrip();
  await loadTripData(curTripId)}
async function loadTripData(tid){
  Object.assign(cache,{tripMembers:[],members:[],schedules:[],expenses:[],budgets:[],budgetError:null,receipts:[],receiptError:null,documents:[],docFiles:[],docError:null,payments:[],paymentError:null,refunds:[],refundError:null});
  if(!tid)return;
  const [mR,sR,eR,bR]=await Promise.all([sb.from('trip_members').select('user_id,role,joined_at').eq('trip_id',tid),sb.from('schedules').select('*').eq('trip_id',tid).order('schedule_date',{ascending:true}),sb.from('expenses').select('*').eq('trip_id',tid).order('expense_date',{ascending:false}).order('created_at',{ascending:false}),sb.from('trip_budgets').select('*').eq('trip_id',tid)]);
  if(mR.error)throw mR.error;if(sR.error)throw sR.error;if(eR.error)throw eR.error;
  cache.tripMembers=mR.data||[];cache.schedules=sR.data||[];cache.expenses=eR.data||[];
  if(bR.error){console.warn('trip_budgets',bR.error);cache.budgetError=bR.error}else cache.budgets=bR.data||[];
  const uids=[...new Set([...cache.tripMembers.map(m=>m.user_id),...cache.expenses.map(e=>e.payer_id)])];
  if(uids.length){const {data:ps,error:pe}=await sb.from('profiles').select('*').in('id',uids);if(pe)throw pe;cache.members=ps||[]}
  const eids=cache.expenses.map(e=>e.id);
  const tasks=[
    (async()=>{try{cache.receipts=eids.length?await selectIn('expense_receipts','*','expense_id',eids):[]}catch(x){console.warn('expense_receipts',x);cache.receiptError=x}})(),
    (async()=>{try{const {data,error}=await sb.from('trip_documents').select('*').eq('trip_id',tid);if(error)throw error;cache.documents=(data||[]).sort((a,b)=>String(a.doc_date||'9999').localeCompare(String(b.doc_date||'9999'))||String(b.created_at||'').localeCompare(String(a.created_at||'')));const dids=cache.documents.map(d=>d.id);cache.docFiles=dids.length?await selectIn('trip_document_files','*','document_id',dids):[];cache.docFiles.sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')))}catch(x){console.warn('trip_documents',x);cache.docError=x;cache.documents=[];cache.docFiles=[]}})(),
    (async()=>{try{const {data,error}=await sb.from('settlement_payments').select('*').eq('trip_id',tid).order('paid_at',{ascending:false});if(error)throw error;cache.payments=data||[]}catch(x){console.warn('settlement_payments',x);cache.paymentError=x}})()];
  tasks.push((async()=>{try{cache.refunds=eids.length?await selectIn('expense_refunds','*','expense_id',eids):[]}catch(x){console.warn('expense_refunds',x);cache.refundError=x;cache.refunds=[]}})());
  await Promise.all(tasks);annotateRefunds()}
async function render(){try{await loadAll();renderTripSwitcher();applyAccessClasses();renderDashboard();renderGroups();renderTrips();renderScheduleSelectors();if(!calInit){calInit=true;calCursor=initialCalendarDate()}renderCalendar(calCursor||today());renderScheduleList();renderSummary();renderDocFilters();renderDocuments();renderBudgetSelectors();renderReportSelectors();renderHeaderAvatar();applyLangStatic();if(isDev&&$('developer').classList.contains('active'))renderDeveloper();if($('profile')?.classList.contains('active'))renderProfilePage();hydrateMedia(document);if($('schedMapView')&&!$('schedMapView').classList.contains('hide'))renderScheduleMap();if(_curPage==='schedule')renderPageActions('schedule');loadInbox();loadChatUnread();subscribeChat();loadFriendsLite()}catch(e){err(e)}}
// ---------- Auth ----------
async function register(){if(authBusy)return;authBusy=true;const btn=$('regBtn');if(btn){btn.disabled=true;btn.textContent='กำลังสร้างบัญชี...'}try{const email=$('regEmail').value.trim(),pass=$('regPass').value,name=$('regName').value.trim();if(!email||!pass||!name)return alert('กรุณากรอกข้อมูลให้ครบ');if(pass.length<8)return alert('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');const {data,error}=await sb.auth.signUp({email,password:pass,options:{data:{full_name:name},emailRedirectTo:APP_URL}});if(error)throw error;if(data.session){toast('สมัครสมาชิกสำเร็จ');await boot()}else{alert('สมัครสมาชิกสำเร็จ กรุณาตรวจสอบ Email เพื่อยืนยันบัญชี แล้วเข้าสู่ระบบ');showLogin()}}catch(e){err(e)}finally{authBusy=false;if(btn){btn.disabled=false;btn.textContent='สร้างบัญชี'}}}
async function login(){if(authBusy)return;authBusy=true;const btn=$('loginBtn');if(btn){btn.disabled=true;btn.textContent='กำลังเข้าสู่ระบบ...'}try{const {error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPass').value});if(error)throw error;await boot()}catch(e){err(e)}finally{authBusy=false;if(btn){btn.disabled=false;btn.textContent='เข้าสู่ระบบ'}}}
async function logout(){unsubscribeChat();await sb.auth.signOut();currentUser=null;me=null;isDev=false;devViewId=null;curTripId=null;$('app').classList.add('hide');$('auth').classList.remove('hide');showWelcome()}
function openForgotPassword(){modal(`<div class="section"><h3>ลืมรหัสผ่าน</h3><div class="spacer"></div><button class="btn secondary" onclick="closeModal()">ปิด</button></div><p class="muted">ใส่อีเมลที่ใช้สมัคร ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้</p><div class="field"><label>Email</label><input id="fpEmail" type="email" autocomplete="email" value="${esc($('loginEmail')?.value||'')}"></div><button class="btn" id="fpBtn" onclick="sendResetEmail()">ส่งลิงก์ตั้งรหัสผ่านใหม่</button>`)}
async function sendResetEmail(){const btn=$('fpBtn');try{const email=$('fpEmail').value.trim();if(!email)throw new Error('กรุณาใส่อีเมล');btn.disabled=true;const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});if(error)throw error;closeModal();alert('ถ้าอีเมลนี้มีบัญชีอยู่ ระบบได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์ Spam)')}catch(e){if(btn)btn.disabled=false;err(e)}}
function showRecoveryModal(){modal(`<div class="section"><h3>ตั้งรหัสผ่านใหม่</h3></div><div class="field"><label>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label><input id="rpNew" type="password" autocomplete="new-password"></div><div class="field"><label>ยืนยันรหัสผ่านใหม่</label><input id="rpNew2" type="password" autocomplete="new-password"></div><button class="btn" id="rpBtn" onclick="setRecoveredPassword()">บันทึกรหัสผ่านใหม่</button>`)}
async function setRecoveredPassword(){const btn=$('rpBtn');try{const p=$('rpNew').value,p2=$('rpNew2').value;if(p.length<8)throw new Error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');if(p!==p2)throw new Error('รหัสผ่านทั้งสองช่องไม่ตรงกัน');btn.disabled=true;const {error}=await sb.auth.updateUser({password:p});if(error)throw error;closeModal();history.replaceState(null,'',APP_URL);toast('ตั้งรหัสผ่านใหม่แล้ว');await boot()}catch(e){if(btn)btn.disabled=false;err(e)}}
async function boot(){try{const {data:{user}}=await sb.auth.getUser();if(!user)return;currentUser=user;$('auth').classList.add('hide');$('app').classList.remove('hide');const [{data:dv},_p]=await Promise.all([sb.rpc('te_is_developer'),loadMyProfile()]);isDev=dv===true;isContentAdmin=isDev;applyFeatureNav();document.body.classList.toggle('isdev',isDev);await render();go('dashboard');hideSplash();initAutoTranslate();setTimeout(()=>{try{initPromos()}catch(e){}},1200);await processPendingJoin()}catch(e){hideSplash();err(e)}}
function openMoreMenu(){modal(`<div class="section"><h3>เมนูเพิ่มเติม</h3><div class="spacer"></div><button class="btn secondary" onclick="closeModal()">ปิด</button></div><div class="morelist"><button onclick="closeModal();openTripForm()">＋ สร้าง Trip</button><button onclick="closeModal();openInbox()">🔔 การแจ้งเตือน</button><button onclick="closeModal();go('groups')">👥 Groups / ใส่ Code</button><button onclick="closeModal();go('budget')">💰 Budget</button><button onclick="closeModal();go('friends')">🤝 Friends</button><button onclick="closeModal();go('reports')">📊 Reports</button><button onclick="closeModal();go('settings')">👤 Profile</button>${isDev?`<button onclick="closeModal();go('developer')">🛠️ Developer Console</button>`:''}${isStandalone()?'':`<button onclick="closeModal();installApp()">📲 ติดตั้งเป็นแอป</button>`}<button class="dangerText" onclick="closeModal();logout()">ออกจากระบบ</button></div>`)}
function init(){initPWA();applyLangStatic();capturePendingJoin();renderAuthInviteBanner();if(!ready()){hideSplash();alert('กรุณาใส่ SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY ใน assets/js/config.js ก่อนใช้งาน');return}sb=supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});let recovering=false;sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){currentUser=null;$('app').classList.add('hide');$('auth').classList.remove('hide')}if(event==='PASSWORD_RECOVERY'){recovering=true;$('auth').classList.add('hide');$('app').classList.remove('hide');setTimeout(showRecoveryModal,50)}});sb.auth.getSession().then(({data})=>{if(data.session&&!recovering)boot();else{hideSplash();initAutoTranslate();if(pendingJoin())showWelcome()}})}
// ---------- file upload helpers ----------
const MAX_UPLOAD=10*1024*1024;
const RECEIPT_SETUP_MSG='ยังไม่ได้ติดตั้งระบบใบเสร็จหลายใบ กรุณารันไฟล์ v13_features.sql ใน Supabase SQL Editor';
const DOC_SETUP_MSG='ยังไม่ได้ติดตั้งระบบเอกสาร กรุณารันไฟล์ v13_features.sql ใน Supabase SQL Editor';
function validateFileType(f){const ok=/^image\//.test(f.type)||f.type==='application/pdf'||/\.(pdf|jpe?g|png|webp|gif|heic|heif)$/i.test(f.name);if(!ok)throw new Error(`ไฟล์ "${f.name}" ไม่รองรับ (รองรับรูปภาพและ PDF)`);if(f.size>40*1024*1024)throw new Error(`ไฟล์ "${f.name}" ใหญ่เกินไป`)}
async function compressImage(file,maxSide=1600,quality=.82){const bmp=await createImageBitmap(file);const scale=Math.min(1,maxSide/Math.max(bmp.width,bmp.height));if(scale===1&&file.size<700*1024){bmp.close?.();return file}const c=document.createElement('canvas');c.width=Math.round(bmp.width*scale);c.height=Math.round(bmp.height*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bmp,0,0,c.width,c.height);bmp.close?.();const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',quality));if(!blob||blob.size>=file.size)return file;return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'})}
async function prepareUpload(file){validateFileType(file);let out=file;if(/^image\/(jpeg|png|webp)$/.test(file.type)){try{out=await compressImage(file)}catch(x){console.warn('compress',x)}}if(out.size>MAX_UPLOAD)throw new Error(`ไฟล์ "${file.name}" ใหญ่เกิน 10 MB`);return out}
function safeName(n){return String(n||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-80)}
function uniqId(){return Date.now()+'-'+Math.random().toString(36).slice(2,8)}
function isImage(f){return /^image\/(jpeg|png|webp|gif)$/.test(f.mime_type||'')||/\.(jpe?g|png|webp|gif)$/i.test(f.file_name||f.file_path||'')}
function thumbHtml(f,u){return `<a class="thumb" href="${esc(u||'#')}" target="_blank" rel="noopener">${isImage(f)&&u?`<img src="${esc(u)}" alt="" loading="lazy">`:'<span class="fileicon">📄</span>'}<small>${esc(f.file_name||'ไฟล์')}</small></a>`}
async function renderThumbs(bucket,files,target){const box=$(target);if(!box)return;if(!files.length){box.innerHTML='<div class="muted">ไม่มีไฟล์</div>';return}try{const {data,error}=await sb.storage.from(bucket).createSignedUrls(files.map(f=>f.file_path),600);if(error)throw error;const urls=new Map((data||[]).map(x=>[x.path,x.signedUrl]));box.innerHTML=files.map(f=>thumbHtml(f,urls.get(f.file_path))).join('')}catch(x){box.innerHTML='<div class="dangerText">'+esc(friendlyError(x))+'</div>'}}
