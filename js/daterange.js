// daterange.js — เลือก "วันเริ่ม + วันกลับ" ในปฏิทินเดียว: แตะวันแรก แล้วแตะวันกลับ แถบสีเขียวแสดงวันเดินทางทั้งหมด
// ส่วนบน = ตรรกะล้วน (ทดสอบด้วย node) · ส่วนล่าง = หน้าจอ (แผ่นเลือกวัน)
function _rgPad(n){return String(n).padStart(2,'0')}
// แตะวันที่: ยังไม่มีวันแรก/เลือกครบแล้ว → เริ่มใหม่ · มีแต่วันแรก → วันที่สอง (แตะก่อนวันแรก = สลับให้ ช่วงจึงถูกเสมอ · แตะวันเดิม = เดินทางวันเดียว)
function rgSelect(st,ds){
  st=st||{start:null,end:null};
  if(!st.start||st.end)return {start:ds,end:null};
  if(ds<st.start)return {start:ds,end:st.start};
  return {start:st.start,end:ds}}
// ชนิดของช่อง: start | end | both (วันเดียว) | mid | ''
function rgKind(ds,st){
  if(!st||!st.start)return '';
  if(!st.end)return ds===st.start?'start':'';
  if(st.start===st.end)return ds===st.end?'both':'';
  if(ds===st.start)return 'start';if(ds===st.end)return 'end';
  return ds>st.start&&ds<st.end?'mid':''}
function rgDays(st){if(!st||!st.start)return 0;const e=st.end||st.start;return Math.round((new Date(e+'T00:00:00')-new Date(st.start+'T00:00:00'))/86400000)+1}
// ช่องของเดือน เริ่มวันอาทิตย์: null = ช่องว่าง, ไม่งั้น 'YYYY-MM-DD' (เดือนเริ่มที่ 0)
function rgMonthCells(y,m){
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),cells=Array(first).fill(null);
  for(let d=1;d<=days;d++)cells.push(y+'-'+_rgPad(m+1)+'-'+_rgPad(d));
  while(cells.length%7)cells.push(null);return cells}
if(typeof module!=='undefined')module.exports={rgSelect,rgKind,rgDays,rgMonthCells};

// ---------------- หน้าจอ ----------------
let _rg=null;
function rgFmt(ds,withYear){return fmtDate(ds,withYear?{day:'numeric',month:'short',year:'numeric'}:{day:'numeric',month:'short'})}
function rgLabel(s,e){
  if(!s)return 'เลือกวันเริ่ม – วันกลับ';
  if(!e||e===s)return rgFmt(s,true)+' · 1 วัน';
  return rgFmt(s)+' – '+rgFmt(e,true)+' · '+rgDays({start:s,end:e})+' วัน'}
// ช่องแทน <input type=date> สองช่อง: คง id เดิม (sId, eId) เป็น hidden เพื่อให้โค้ดบันทึกเดิมอ่านค่าได้เหมือนเดิม
function rangeFieldHtml(sId,eId,s,e){
  return `<div class="field"><label>วันเดินทาง</label><button type="button" class="rangebtn" id="${sId}_btn" onclick="openRangePicker('${sId}','${eId}')"><span id="${sId}_lbl">${esc(rgLabel(s,e))}</span>${lineIcon('schedule',20)}</button><input type="hidden" id="${sId}" value="${esc(s||'')}"><input type="hidden" id="${eId}" value="${esc(e||'')}"></div>`}
function openRangePicker(sId,eId){
  if($('rgPick'))return;
  const s=$(sId)?.value||null,e=$(eId)?.value||null,base=s?new Date(s+'T00:00:00'):new Date();
  _rg={sId,eId,st:{start:s,end:s&&e?e:null},y:base.getFullYear(),m:base.getMonth()};
  const heads=(LANG==='en'?['Su','Mo','Tu','We','Th','Fr','Sa']:['อา','จ','อ','พ','พฤ','ศ','ส']).map(h=>`<span>${h}</span>`).join('');
  const el=document.createElement('div');el.id='rgPick';el.className='rgback';
  el.innerHTML=`<div class="rgsheet" role="dialog" aria-modal="true" aria-label="เลือกวันเดินทาง"><div class="sheethead"><h3>เลือกวันเดินทาง</h3><div class="spacer"></div><button type="button" class="btn secondary sm" onclick="rgClose()">ปิด</button></div><div class="rgsum" id="rgSum"></div><div class="rgnav"><button type="button" class="iconbtn" onclick="rgMonth(-1)" aria-label="เดือนก่อน">‹</button><b id="rgTitle"></b><button type="button" class="iconbtn" onclick="rgMonth(1)" aria-label="เดือนถัดไป">›</button></div><div class="rgheads">${heads}</div><div class="rggrid" id="rgGrid"></div><div class="rgacts"><button type="button" class="btn secondary" onclick="rgClear()">ล้างวัน</button><button type="button" class="btn" id="rgOk" onclick="rgOk()">ตกลง</button></div></div>`;
  el.addEventListener('click',ev=>{if(ev.target===el)rgClose()});
  document.addEventListener('keydown',_rgKey);document.body.appendChild(el);rgRender();
  if(typeof translateDOM==='function')translateDOM(el)}
function _rgKey(ev){if(ev.key==='Escape')rgClose()}
function rgClose(){document.removeEventListener('keydown',_rgKey);$('rgPick')?.remove();_rg=null}
function rgMonth(d){const x=new Date(_rg.y,_rg.m+d,1);_rg.y=x.getFullYear();_rg.m=x.getMonth();rgRender()}
function rgTap(ds){_rg.st=rgSelect(_rg.st,ds);rgRender()}
function rgClear(){_rg.st={start:null,end:null};rgRender()}
function rgRender(){
  if(!_rg)return;const st=_rg.st,hasEnd=st.end&&st.end!==st.start,td=today();
  $('rgTitle').textContent=new Date(_rg.y,_rg.m,1).toLocaleDateString(LANG==='en'?'en-GB':'th-TH',{month:'long',year:'numeric'});
  $('rgGrid').innerHTML=rgMonthCells(_rg.y,_rg.m).map(ds=>{
    if(!ds)return '<span class="rgday rgempty"></span>';
    const k=rgKind(ds,st),cls=['rgday',k?'rg-'+k:'',k==='start'&&hasEnd?'rg-hasend':'',ds===td?'rg-today':''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-d="${ds}" aria-pressed="${!!k}" aria-label="${esc(rgFmt(ds,true))}" onclick="rgTap('${ds}')"><span class="rgnum">${+ds.slice(8)}</span></button>`}).join('');
  $('rgSum').textContent=!st.start?'แตะวันแรกที่เดินทาง':(!st.end?'วันแรก '+rgFmt(st.start)+' · แตะวันกลับ (หรือกด "ตกลง" ถ้าเดินทางวันเดียว)':rgLabel(st.start,st.end));
  if(typeof translateDOM==='function'&&LANG==='en')translateDOM($('rgSum'))}
function rgOk(){
  const {sId,eId,st}=_rg,s=st.start||'',e=st.start?(st.end||st.start):'';
  $(sId).value=s;$(eId).value=e;const l=$(sId+'_lbl');if(l){l.textContent=rgLabel(s||null,e||null);if(typeof translateDOM==='function'&&LANG==='en')translateDOM(l)}
  rgClose()}
