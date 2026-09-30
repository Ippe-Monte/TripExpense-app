// =====================================================================
// pwa.js — ติดตั้งเป็นแอปบนมือถือ/คอมพิวเตอร์ (PWA)
// =====================================================================
let deferredInstall=null;
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function initPWA(){if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(e=>console.warn('sw',e));window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;updateInstallUI()});window.addEventListener('appinstalled',()=>{deferredInstall=null;toast('ติดตั้งแอปแล้ว 🎉');updateInstallUI()});window.addEventListener('offline',()=>toast('⚠️ ออฟไลน์อยู่ — ข้อมูลจะไม่อัปเดตจนกว่าจะกลับมาออนไลน์'));window.addEventListener('online',()=>{toast('กลับมาออนไลน์แล้ว');if(currentUser)render()});updateInstallUI()}
function updateInstallUI(){const show=!isStandalone();document.querySelectorAll('.installBtn').forEach(b=>b.classList.toggle('hide',!show))}
async function installApp(){if(deferredInstall){deferredInstall.prompt();try{await deferredInstall.userChoice}catch(_){}deferredInstall=null;updateInstallUI();return}openInstallHelp()}
function openInstallHelp(){modal(`<div class="section"><h3>📲 ติดตั้ง TripExpense เป็นแอป</h3><div class="spacer"></div><button class="btn secondary" onclick="closeModal()">ปิด</button></div>${isStandalone()?'<div class="okbox">✔ คุณกำลังใช้งานแบบแอปอยู่แล้ว</div>':isIOS()?`<ol class="steps"><li>เปิดหน้านี้ด้วย <b>Safari</b></li><li>กดปุ่ม <b>แชร์</b> (สี่เหลี่ยมมีลูกศรชี้ขึ้น) ด้านล่างจอ</li><li>เลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b> แล้วกด <b>เพิ่ม</b></li></ol>`:`<ol class="steps"><li>เปิดหน้านี้ด้วย <b>Chrome</b></li><li>กดเมนู <b>⋮</b> มุมขวาบน</li><li>เลือก <b>"ติดตั้งแอป"</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก"</b></li></ol>`}<div class="mini muted">เมื่อติดตั้งแล้ว เปิดจากไอคอนบนหน้าจอได้เลย แสดงผลเต็มจอเหมือนแอปทั่วไป และอัปเดตเวอร์ชันใหม่ให้อัตโนมัติ</div>`)}

// ให้รูปแสดงทุกครั้งที่หน้า Trips / Groups ถูกวาดใหม่
(function(){const rt=renderTrips,rg=renderGroups;renderTrips=function(){rt();hydrateMedia($('tripGrid'))};renderGroups=function(){rg();hydrateMedia($('groupsList'))}})();
