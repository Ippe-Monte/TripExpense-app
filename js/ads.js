// ads.js — ช่องโฆษณา: อ่านค่าจากฐานข้อมูล (ผู้ดูแลแก้เองได้ ไม่ต้องอัปโหลดแอปใหม่) แล้วแสดงแบนเนอร์ของเรา หรือ AdSense
// ช่องที่ปิด/ไม่มีแบนเนอร์ จะไม่แสดงอะไรเลย (ไม่มีกรอบว่าง) · ทุกป้ายมีคำว่า "โฆษณา"
const _ads={slots:{},banners:[],p:null},_adSeen=new Set();
function adsReset(){_ads.p=null;_ads.slots={};_ads.banners=[]}
function loadAds(){
  if(_ads.p)return _ads.p;
  _ads.p=(async()=>{try{
    const [s,b]=await Promise.all([sb.from('ad_slots').select('*').order('sort'),sb.from('house_banners').select('*')]);
    _ads.slots=Object.fromEntries((s.data||[]).map(x=>[x.key,x]));_ads.banners=b.data||[]
  }catch(e){console.warn('ads',e)}})();
  return _ads.p}
function bannerActive(b,now){now=now||Date.now();return b.enabled!==false&&(!b.starts_at||new Date(b.starts_at).getTime()<=now)&&(!b.ends_at||new Date(b.ends_at).getTime()>=now)}
function pickWeighted(list,rnd){
  const total=list.reduce((a,b)=>a+Math.max(1,b.weight||1),0);let r=(rnd||Math.random)()*total;
  for(const b of list){r-=Math.max(1,b.weight||1);if(r<0)return b}return list[list.length-1]}
function houseBannerHtml(b,size){
  const [w,h]=String(size||'320x50').split('x'),img=`<img src="${esc(b.image_url)}" alt="${esc(b.alt||b.title||'โฆษณา')}" loading="lazy" style="aspect-ratio:${w}/${h}">`,tag='<span class="adtag">โฆษณา</span>';
  return b.link_url?`<a class="adbanner" href="${esc(b.link_url)}" target="_blank" rel="sponsored noopener noreferrer" data-banner="${esc(b.id)}">${img}${tag}</a>`:`<div class="adbanner">${img}${tag}</div>`}
function _loadScriptOnce(src,attrs){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`))return res();const s=document.createElement('script');s.src=src;s.async=true;Object.entries(attrs||{}).forEach(([k,v])=>s.setAttribute(k,v));s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function _renderAdsense(el,slot){
  try{
    await _loadScriptOnce('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(slot.adsense_client),{crossorigin:'anonymous'});
    const [w,h]=slot.size.split('x');
    el.innerHTML=`<div class="adbanner adsense"><ins class="adsbygoogle" style="display:inline-block;width:${w}px;height:${h}px" data-ad-client="${esc(slot.adsense_client)}" data-ad-slot="${esc(slot.adsense_slot)}"></ins><span class="adtag">โฆษณา</span></div>`;
    (window.adsbygoogle=window.adsbygoogle||[]).push({})
  }catch(e){el.innerHTML='';el.classList.add('hide')}}
function renderAdSlot(el){
  const key=el.dataset.slot,s=_ads.slots[key];
  if(!el.closest('.page')?.classList.contains('active'))return;                 // ไม่นับการแสดงผลของหน้าที่ผู้ใช้ยังไม่ได้เปิด
  const off=()=>{el.innerHTML='';el.classList.add('hide')};
  if(!s||!s.enabled||s.source==='off')return off();
  el.dataset.size=s.size;el.classList.remove('hide');
  if(s.source==='house'){
    const list=_ads.banners.filter(b=>b.slot_key===key&&bannerActive(b));if(!list.length)return off();
    if(el.dataset.banner&&list.some(b=>b.id===el.dataset.banner))return;       // เรนเดอร์แล้ว ไม่สุ่มใหม่ทุกครั้งที่สลับหน้า
    const b=pickWeighted(list);el.dataset.banner=b.id;el.innerHTML=houseBannerHtml(b,s.size);
    if(!_adSeen.has(key+b.id)){_adSeen.add(key+b.id);sb.rpc('ad_track',{p_banner:b.id,p_type:'impression'}).then(()=>{},()=>{})}
    const a=el.querySelector('a.adbanner');if(a)a.addEventListener('click',()=>{sb.rpc('ad_track',{p_banner:b.id,p_type:'click'}).then(()=>{},()=>{})});
  }else if(s.source==='adsense'&&s.adsense_client&&s.adsense_slot){
    if(!el.dataset.adsense){el.dataset.adsense='1';_renderAdsense(el,s)}
  }else off()}
async function hydrateAdSlots(root){
  if(typeof sb==='undefined'||!currentUser)return;await loadAds();
  (root||document).querySelectorAll('.adslot').forEach(renderAdSlot)}
