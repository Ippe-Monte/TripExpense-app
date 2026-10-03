// promo_engine.js — ตัดสินว่าจะเด้งข้อเสนอไหนตอนเปิดแอป (ฟังก์ชันล้วน)
// กติกา: เด้ง "ครั้งเดียวเมื่อเข้าเงื่อนไข" (show_policy='once' คือค่าเริ่มต้น) · ผู้ใช้ทำได้แค่ ดู/ปิด ไม่มีตัวเลือกปิดถาวร
function _ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function _addDays(ds,n){const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return _ymd(d)}
function _addYears(ds,y){const [Y,M,D]=ds.split('-').map(Number);const d=new Date(Y+y,M-1,D);if(d.getMonth()!==M-1)d.setDate(0);return _ymd(d)}   // 29 ก.พ. → 28 ก.พ. ในปีไม่อธิกสุรทิน
function _daysBetween(a,b){return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000)}
function _inWindow(c,now){const t=now.getTime();return (!c.starts_at||new Date(c.starts_at).getTime()<=t)&&(!c.ends_at||new Date(c.ends_at).getTime()>=t)}
function _triggers(c,trips,today){
  const p=c.params||{},out=[];
  if(c.kind==='anniversary'){
    const win=Number.isFinite(+p.window_days)?+p.window_days:3,past=trips.filter(t=>t.start_date&&(t.end_date||t.start_date)<today).sort((a,b)=>b.start_date.localeCompare(a.start_date));
    for(const t of past)for(let y=1;y<=30;y++){const ann=_addYears(t.start_date,y);if(ann>today)break;if(today<=_addDays(ann,win))out.push({key:'anniv:'+t.id+':'+y,tripId:t.id,years:y})}
  }else if(c.kind==='inactive'){
    const days=Number.isFinite(+p.days)&&+p.days>0?+p.days:30;
    if(!trips.some(t=>(t.end_date||t.start_date||'')>=today)){          // ถ้ามีทริปที่กำลังเดินทาง/กำลังจะมาถึง ไม่เด้ง (กำลังวางแผนอยู่แล้ว)
      const ends=trips.map(t=>t.end_date||t.start_date).filter(Boolean).sort();const last=ends[ends.length-1];
      if(last&&_daysBetween(last,today)>=days)out.push({key:'inactive:'+last,lastEnd:last})}
  }else if(c.kind==='season'){ if(c.starts_at||c.ends_at)out.push({key:'season:'+c.id}) }
  else if(c.kind==='general'){ out.push({key:'general:'+c.id}) }
  return out}
function _allowedByPolicy(c,key,events,now,today){
  const shown=(events||[]).filter(e=>e.campaign_id===c.id&&e.action==='shown');
  if(c.show_policy==='daily')return !shown.some(e=>_ymd(new Date(e.created_at))===today);
  if(c.show_policy==='weekly')return !shown.some(e=>now.getTime()-new Date(e.created_at).getTime()<7*86400000);
  return !shown.some(e=>e.trigger_key===key)}                              // 'once' (ค่าเริ่มต้น)
// คืน {campaign, trigger_key} ตัวเดียว (ลำดับตาม priority) หรือ null
function evaluatePromos(o){
  const now=o.now||new Date(),today=o.today||_ymd(now),trips=o.trips||[],cands=[];
  for(const c of (o.campaigns||[])){
    if(c.enabled===false||!_inWindow(c,now))continue;
    for(const t of _triggers(c,trips,today))if(_allowedByPolicy(c,t.key,o.events,now,today)){cands.push({campaign:c,trigger_key:t.key,info:t});break}
  }
  cands.sort((a,b)=>(b.campaign.priority||0)-(a.campaign.priority||0)||String(a.campaign.created_at||'').localeCompare(String(b.campaign.created_at||'')));
  return cands[0]||null}
if(typeof module!=='undefined')module.exports={evaluatePromos,_addYears,_addDays};
