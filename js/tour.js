// FriendTrip Go — ทัวร์แนะนำการใช้งาน (Tooltip) สำหรับผู้ใช้ใหม่หลัง login ครั้งแรก
// ไม่แตะฐานข้อมูล/Auth: จำสถานะ "ดูแล้ว" ต่อผู้ใช้ใน localStorage (ftg_tour_<userId>) ของเครื่องนั้น
(function(){
const DAYS_NEW=14;                       // นับเป็นผู้ใช้ใหม่ถ้าบัญชีถูกสร้างภายใน 14 วัน
const KEY=id=>'ftg_tour_'+id;
const L={
 th:{next:'ถัดไป',back:'ย้อนกลับ',skip:'ข้าม',done:'เริ่มใช้งาน',of:'จาก',close:'ปิดทัวร์',
  steps:[
   {t:'ยินดีต้อนรับสู่ FriendTrip Go 👋',b:'ทัวร์สั้นๆ ไม่ถึงนาที แนะนำปุ่มหลักที่ใช้บ่อย ข้ามได้ทุกเมื่อ และเปิดดูซ้ำได้ที่ โปรไฟล์ → ช่วยเหลือ'},
   {t:'เริ่มจาก Trip',b:'ทุกอย่างอยู่ใน Trip: สร้างทริปแรก ตั้งชื่อและวันที่ แล้วชวนเพื่อนด้วย Code / QR / LINE สลับทริปได้ที่นี่'},
   {t:'สรุป & หารเงิน',b:'ดูว่าใครจ่ายอะไร ใครต้องโอนให้ใคร พร้อมบันทึกการชำระ (จ่ายทีละส่วนก็ได้)'},
   {t:'สำรวจ',b:'ค้นหาสถานที่บนแผนที่ ปักหมุด และบันทึกที่น่าสนใจไว้ในทริป'},
   {t:'แชต',b:'คุยกับเพื่อนร่วมทริปในที่เดียว ไม่ต้องสลับแอป'},
   {t:'กำหนดการ',b:'ปฏิทินและแผนเดินทางรายวัน แตะวันที่เพื่อดูรายการและเพิ่มค่าใช้จ่าย'},
   {t:'การแจ้งเตือน',b:'คำเชิญเข้า Trip และความเคลื่อนไหวของเพื่อนจะมาแสดงที่นี่'},
   {t:'โปรไฟล์ & ช่วยเหลือ',b:'ตั้งค่าบัญชี ภาษา และดูวิธีใช้งานได้ที่นี่ พร้อมแล้วไปวางแผนทริปแรกกันเลย! ✈️'}]},
 en:{next:'Next',back:'Back',skip:'Skip',done:'Get started',of:'of',close:'Close tour',
  steps:[
   {t:'Welcome to FriendTrip Go 👋',b:'A quick tour of the main buttons — under a minute. Skip any time; replay it from Profile → Help.'},
   {t:'Start with a Trip',b:'Everything lives in a Trip: create your first one, set the name and dates, then invite friends by Code / QR / LINE. Switch trips here.'},
   {t:'Summary & settle up',b:'See who paid what and who owes whom, and record payments (part-payments are fine).'},
   {t:'Explore',b:'Search places on the map, drop pins and keep the interesting ones in your trip.'},
   {t:'Chat',b:'Talk with your trip mates in one place — no app switching.'},
   {t:'Schedule',b:'Calendar and day-by-day plan. Tap a date to see its items and add expenses.'},
   {t:'Notifications',b:'Trip invitations and friends\' activity show up here.'},
   {t:'Profile & Help',b:'Account settings, language and how-to guides live here. Ready to plan your first trip! ✈️'}]}};
const TARGETS=[null,['#tripSwitch','#homeBox'],['[data-p="summary"]'],['[data-p="explore"]'],['[data-p="chat"]'],['[data-p="schedule"]'],['.bell'],['#hdrAvatar']];
let S=null; // {i,steps,el:{...}}

function vis(el){if(!el)return false;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)return false;const cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none'&&!el.closest('.hide')}
function findTarget(sels){if(!sels)return null;for(const s of sels){for(const el of document.querySelectorAll(s)){if(vis(el))return el}}return null}
function lang(){return (typeof LANG!=='undefined'&&LANG==='en')?'en':'th'}

function build(){
 const d=document.createElement('div');d.id='tourRoot';d.setAttribute('data-no-tr','1');d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','tourT');
 d.innerHTML='<div class="tour-block"></div><div class="tour-spot" hidden></div><div class="tour-card" tabindex="-1"><button type="button" class="tour-x" aria-label="">✕</button><div class="tour-step"></div><h3 id="tourT"></h3><p id="tourB"></p><div class="tour-dots"></div><div class="tour-btns"><button type="button" class="btn ghost sm tour-skip"></button><span class="spacer"></span><button type="button" class="btn secondary sm tour-back"></button><button type="button" class="btn sm tour-next"></button></div></div>';
 document.body.appendChild(d);
 const q=s=>d.querySelector(s);
 S.el={root:d,spot:q('.tour-spot'),card:q('.tour-card'),step:q('.tour-step'),t:q('#tourT'),b:q('#tourB'),dots:q('.tour-dots'),skip:q('.tour-skip'),back:q('.tour-back'),next:q('.tour-next'),x:q('.tour-x')};
 S.el.skip.onclick=S.el.x.onclick=()=>end(true);
 S.el.back.onclick=()=>show(S.i-1,-1);
 S.el.next.onclick=()=>{S.i>=S.steps.length-1?end(true):show(S.i+1,1)};
}

function show(i,dir){
 const T=L[lang()];
 // ข้ามขั้นที่หา element ไม่เจอ (เช่นมุมมองมือถือ/เดสก์ท็อปไม่เหมือนกัน)
 while(i>0&&i<S.steps.length&&TARGETS[S.steps[i].k]&&!findTarget(TARGETS[S.steps[i].k]))i+=dir||1;
 if(i<0)i=0;if(i>=S.steps.length){end(true);return}
 S.i=i;const st=S.steps[i],e=S.el;
 e.step.textContent=(i+1)+' '+T.of+' '+S.steps.length;
 e.t.textContent=T.steps[st.k].t;e.b.textContent=T.steps[st.k].b;
 e.skip.textContent=T.skip;e.back.textContent=T.back;e.x.setAttribute('aria-label',T.close);
 e.next.textContent=i===S.steps.length-1?T.done:T.next;
 e.back.style.visibility=i===0?'hidden':'visible';e.skip.style.visibility=i===S.steps.length-1?'hidden':'visible';
 e.dots.innerHTML=S.steps.map((_,j)=>'<i'+(j===i?' class="on"':'')+'></i>').join('');
 const el=findTarget(TARGETS[st.k]);S.target=el;
 if(el){try{const fixed=getComputedStyle(el).position==='fixed'||el.closest('.mobileNav,.top,.side');if(!fixed)el.scrollIntoView({block:'center',behavior:'auto'})}catch(x){}}
 place();e.next.focus({preventScroll:true});
}

function place(){
 if(!S)return;const e=S.el,card=e.card,el=S.target;
 const vw=document.documentElement.clientWidth,vh=window.innerHeight,m=12;
 card.style.maxWidth=Math.min(360,vw-2*m)+'px';
 if(!el){e.spot.hidden=true;e.root.classList.add('center');card.style.left=card.style.top='';return}
 e.root.classList.remove('center');
 const r=el.getBoundingClientRect(),pad=6;
 e.spot.hidden=false;
 e.spot.style.cssText='left:'+(r.left-pad)+'px;top:'+(r.top-pad)+'px;width:'+(r.width+2*pad)+'px;height:'+(r.height+2*pad)+'px';
 const cw=card.offsetWidth,ch=card.offsetHeight;
 const below=vh-r.bottom,above=r.top;
 let top=below>=ch+m+pad?r.bottom+pad+m:(above>=ch+m+pad?r.top-pad-m-ch:Math.max(m,Math.min(vh-ch-m,(vh-ch)/2)));
 let left=Math.max(m,Math.min(vw-cw-m,r.left+r.width/2-cw/2));
 card.style.left=left+'px';card.style.top=top+'px';
 const ax=Math.max(18,Math.min(cw-18,r.left+r.width/2-left));
 card.style.setProperty('--ax',ax+'px');
 card.dataset.arrow=top>r.top?'up':(top+ch<r.top+1?'down':'none');
}

function onKey(ev){
 if(!S)return;
 if(ev.key==='Escape'){ev.preventDefault();end(true)}
 else if(ev.key==='ArrowRight'||ev.key==='Enter'&&document.activeElement===document.body){ev.preventDefault();S.el.next.click()}
 else if(ev.key==='ArrowLeft'&&S.i>0){ev.preventDefault();S.el.back.click()}
 else if(ev.key==='Tab'){const f=[...S.el.root.querySelectorAll('button')].filter(b=>b.style.visibility!=='hidden');if(!f.length)return;const a=f.indexOf(document.activeElement);ev.preventDefault();f[(a+(ev.shiftKey?-1:1)+f.length)%f.length].focus()}
}
function onResize(){place()}

function cu(){return typeof currentUser!=='undefined'?currentUser:null}
function mark(){try{const u=cu();if(u)localStorage.setItem(KEY(u.id),'1')}catch(e){}}
function end(done){
 if(!S)return;if(done)mark();
 window.removeEventListener('keydown',onKey,true);window.removeEventListener('resize',onResize);window.removeEventListener('scroll',onResize,true);
 S.el.root.remove();S=null;
 try{if(typeof go==='function')window.scrollTo(0,0)}catch(e){}
}

function start(){
 if(S)return;
 const idx=L.th.steps.map((_,k)=>k);
 S={i:0,steps:idx.map(k=>({k})),target:null};
 build();
 window.addEventListener('keydown',onKey,true);window.addEventListener('resize',onResize);window.addEventListener('scroll',onResize,true);
 if(typeof go==='function'&&document.body.dataset.page!=='dashboard')try{go('dashboard')}catch(e){}
 show(0,1);
}

function isNewUser(u){const t=u&&u.created_at?Date.parse(u.created_at):NaN;return !isNaN(t)&&Date.now()-t<=DAYS_NEW*864e5}
function seen(u){try{return localStorage.getItem(KEY(u.id))==='1'}catch(e){return true}}   // เก็บไม่ได้ → ไม่แสดง (กันวนซ้ำ)
function blocked(){const mb=document.getElementById('mb');return (mb&&mb.classList.contains('show'))||document.getElementById('app')?.classList.contains('hide')}

// เรียกหลัง login/boot: แสดงเฉพาะผู้ใช้ใหม่ที่ยังไม่เคยดู และรอจนไม่มี modal ค้าง
window.tourMaybeStart=function(tries){
 try{
  const u=cu();if(!u||S||seen(u)||!isNewUser(u))return;
  tries=tries||0;
  if(blocked()){if(tries<12)setTimeout(()=>window.tourMaybeStart(tries+1),1500);return}
  setTimeout(()=>{if(!S&&!blocked())start();else if(!S&&tries<12)window.tourMaybeStart(tries+1)},700);
 }catch(e){}
};
window.startTour=function(){try{const mb=document.getElementById('mb');if(mb&&mb.classList.contains('show')&&typeof closeModal==='function')closeModal();setTimeout(start,150)}catch(e){}};
})();
