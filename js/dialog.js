// FriendTrip Go — กล่องข้อความของแอปเอง แทน alert() ของเบราว์เซอร์
// (alert เดิมขึ้นหัวข้อว่า "<โดเมน> บอกว่า" ซึ่งเปลี่ยนข้อความไม่ได้ จึงแทนด้วยกล่องของเรา หัวข้อ "FriendTrip Go")
(function(){
const queue=[];let cur=null;
const en=()=>typeof LANG!=='undefined'&&LANG==='en';
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function close(cb){if(!cur)return;const c=cur;cur=null;c.root.remove();document.removeEventListener('keydown',c.key,true);try{if(c.prev&&c.prev.focus&&document.contains(c.prev))c.prev.focus({preventScroll:true})}catch(e){}
 if(typeof cb==='function'){try{cb()}catch(e){console.error(e)}}
 if(queue.length)setTimeout(()=>open(queue.shift()),0)}
function open(o){
 if(!document.body){setTimeout(()=>open(o),50);return}
 const root=el('div','ftgdlg-back');root.setAttribute('data-no-tr-title','1');
 const box=el('div','ftgdlg');box.setAttribute('role','alertdialog');box.setAttribute('aria-modal','true');
 const head=el('div','ftgdlg-head');const logo=el('img');logo.src='img/logo.svg';logo.alt='';logo.width=22;logo.height=22;
 const ttl=el('b',null,'FriendTrip Go');ttl.setAttribute('data-no-tr','1');ttl.id='ftgdlgT';head.append(logo,ttl);box.setAttribute('aria-labelledby','ftgdlgT');
 const msg=el('div','ftgdlg-msg',o.msg);
 const btns=el('div','ftgdlg-btns');
 const list=o.buttons&&o.buttons.length?o.buttons:[{label:en()?'OK':'ตกลง',primary:true}];
 let primary=null;
 list.forEach((b,i)=>{const x=el('button',b.primary===false?'btn secondary':'btn',b.label);x.type='button';x.setAttribute('data-no-tr','1');x.onclick=()=>close(b.cb);btns.appendChild(x);if(b.primary!==false&&!primary)primary=x});
 box.append(head,msg,btns);root.appendChild(box);document.body.appendChild(root);
 const key=ev=>{if(ev.key==='Escape'||ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();const b=list.find(x=>x.primary!==false)||list[0];if(ev.key==='Enter'||!o.noEsc)close(ev.key==='Enter'?b.cb:(list.find(x=>x.cancel)||{}).cb)}
  else if(ev.key==='Tab'){const f=[...btns.querySelectorAll('button')];const a=f.indexOf(document.activeElement);ev.preventDefault();f[(a+(ev.shiftKey?-1:1)+f.length)%f.length].focus()}};
 document.addEventListener('keydown',key,true);
 cur={root,key,prev:document.activeElement};
 (primary||btns.firstChild).focus({preventScroll:true});
}
window.appDialog=function(o){queue.push(o);if(!cur)open(queue.shift())};
window.appAlert=function(msg,cb){window.appDialog({msg:String(msg==null?'':msg),buttons:[{label:en()?'OK':'ตกลง',primary:true,cb}]})};
window.alert=function(msg){window.appAlert(msg)};   // alert() ทุกจุดในแอปใช้กล่องนี้ (ไม่บล็อกการทำงาน)

// ยังไม่มี Group → อธิบายแล้วพาไปหน้า Groups ทันที
window.needGroupDialog=function(){
 const E=en();
 window.appDialog({
  msg:E?'Please create or join a Group first.\n\nA Group is your travel circle. You need one before creating a Trip.':'กรุณาสร้างหรือเข้าร่วม Group ก่อน\n\nGroup คือกลุ่มเพื่อนร่วมทริปของคุณ ต้องมี Group ก่อนจึงจะสร้าง Trip ได้',
  buttons:[
   {label:E?'OK — create a Group':'ตกลง — ไปสร้าง Group',primary:true,cb:()=>{go('groups');setTimeout(()=>{if(typeof createGroup==='function')createGroup()},150)}},
   {label:E?'I have a Code':'มี Code เข้าร่วม',primary:false,cb:()=>{go('groups');setTimeout(()=>{const i=document.getElementById('joinCode');if(i)i.focus()},200)}},
   {label:E?'Cancel':'ยกเลิก',primary:false,cancel:true}]});
};
})();
