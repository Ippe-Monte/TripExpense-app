// promo.js — ข้อเสนอจากระบบ (ป๊อปอัป): เด้งครั้งเดียวเมื่อเข้าเงื่อนไข · ผู้ใช้เลือกได้แค่ "ดู" หรือ "ปิด" ไม่มีตัวเลือกปิดถาวร
// ทุกข้อความมีป้าย "ข้อเสนอ" · ป๊อปอัปไม่ใช้โฆษณา Google (ใช้เฉพาะข้อเสนอของเรา/พันธมิตร)
let _promo=null;
const PROMO_ICON={anniversary:'schedule',inactive:'history',season:'lightbulb',general:'tag'};
async function initPromos(){
  if(_promo||sessionStorage.getItem('te_promo_session'))return;              // ครั้งเดียวต่อการเปิดแอป
  try{
    const [c,e]=await Promise.all([sb.from('promo_campaigns').select('*'),sb.from('promo_events').select('campaign_id,trigger_key,action,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(500)]);
    const pick=evaluatePromos({campaigns:c.data||[],trips:cache.trips||[],events:e.data||[]});
    if(pick)showPromoPopup(pick)
  }catch(x){console.warn('promo',x)}}
function recordPromo(c,key,action,snapshot){return sb.from('promo_events').insert({campaign_id:c.id,trigger_key:key,action,snapshot:snapshot||null}).then(()=>{},x=>console.warn('promo event',x))}
function showPromoPopup(pick){
  const c=pick.campaign;_promo={c,key:pick.trigger_key};sessionStorage.setItem('te_promo_session','1');
  recordPromo(c,_promo.key,'shown',{title:c.title,body:c.body,link_url:c.link_url,cta_label:c.cta_label,kind:c.kind});
  const el=document.createElement('div');el.id='promoPop';el.className='promopop';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','ข้อเสนอ');
  el.innerHTML=`<div class="promocard"><div class="promotop"><span class="offertag">ข้อเสนอ</span><button type="button" class="promox" aria-label="ปิด" onclick="promoClose()">${lineIcon('x',20)}</button></div><div class="promoicon">${lineIcon(PROMO_ICON[c.kind]||'tag',32)}</div><h3>${esc(c.title)}</h3>${c.body?`<p>${esc(c.body)}</p>`:''}${c.link_url?`<button type="button" class="btn" onclick="promoView()">${esc(c.cta_label||'ดู')}</button>`:''}<button type="button" class="btn secondary" onclick="promoClose()">ปิด</button></div>`;
  el.addEventListener('click',e=>{if(e.target===el)promoClose()});
  document.addEventListener('keydown',_promoKey);document.body.appendChild(el);
  if(typeof translateDOM==='function')translateDOM(el);el.querySelector('.btn')?.focus()}
function _promoKey(e){if(e.key==='Escape')promoClose()}
function _promoEnd(){document.removeEventListener('keydown',_promoKey);$('promoPop')?.remove()}
function promoClose(){if(!_promo)return _promoEnd();recordPromo(_promo.c,_promo.key,'close');_promoEnd()}
function promoView(){if(!_promo)return _promoEnd();const u=_promo.c.link_url;recordPromo(_promo.c,_promo.key,'view');_promoEnd();if(u)window.open(u,'_blank','noopener,noreferrer')}
async function renderOffers(){
  const box=$('offersBox');if(!box)return;box.innerHTML='<div class="card muted">กำลังโหลด...</div>';
  try{
    const {data,error}=await sb.from('promo_events').select('campaign_id,trigger_key,action,snapshot,created_at').eq('user_id',currentUser.id).in('action',['shown','view']).order('created_at',{ascending:false}).limit(300);if(error)throw error;
    const shown=(data||[]).filter(x=>x.action==='shown'&&x.snapshot),viewed=new Set((data||[]).filter(x=>x.action==='view').map(x=>x.campaign_id+'|'+x.trigger_key));
    box.innerHTML=`<div class="card infonote">${lineIcon('info',18)}<span>ข้อเสนอเหล่านี้เป็นข้อมูลส่งเสริมการท่องเที่ยวจากระบบ ไม่ใช่การตั้งเวลาเตือนของคุณเอง เก็บรายการที่เคยเด้งไว้ที่นี่ให้กลับมาดู</span></div>`+
      (shown.length?shown.map(x=>{const s=x.snapshot||{};return `<div class="card offeritem"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:nowrap"><b>${esc(s.title||'')}</b><span class="offertag">ข้อเสนอ</span></div>${s.body?`<div class="muted" style="margin-top:4px">${esc(s.body)}</div>`:''}<div class="row" style="justify-content:space-between;margin-top:8px;flex-wrap:nowrap"><span class="mini muted">${esc(new Date(x.created_at).toLocaleDateString(LANG==='en'?'en-GB':'th-TH',{day:'numeric',month:'short',year:'numeric'}))}${viewed.has(x.campaign_id+'|'+x.trigger_key)?' · ดูแล้ว':''}</span>${s.link_url?`<button type="button" class="btn sm" onclick="offerOpen('${esc(s.link_url).replace(/'/g,'&#39;')}','${x.campaign_id}','${esc(x.trigger_key).replace(/'/g,'&#39;')}')">${esc(s.cta_label||'ดู')}</button>`:''}</div></div>`}).join(''):'<div class="card empty">ยังไม่มีข้อเสนอที่เคยแสดง</div>');
  }catch(e){box.innerHTML='';err(e)}}
function offerOpen(url,cid,key){recordPromo({id:cid},key,'view');window.open(url,'_blank','noopener,noreferrer')}
