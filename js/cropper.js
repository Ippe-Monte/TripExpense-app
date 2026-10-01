// =====================================================================
// cropper.js — เลือกตำแหน่งรูปก่อนอัปโหลด: ลากเลื่อน + ซูม ภายใต้กรอบที่จะถูกตัดจริง
// ส่วนนอกกรอบแสดงจางๆ ให้เห็นภาพรวม · รองรับเมาส์ ทัช (pinch) และแถบเลื่อนซูม
// =====================================================================

// ---------- ตรรกะคำนวณ (แยกเป็นฟังก์ชันล้วน ทดสอบได้) ----------
// vp = พื้นที่แสดงผล, fr = กรอบที่จะตัด (พิกัดสัมพัทธ์กับ vp)
function cropFrame(vpW,vpH,aspect,fill=0.86){
  let fw=vpW*fill,fh=fw/aspect;
  if(fh>vpH*fill){fh=vpH*fill;fw=fh*aspect}
  return {x:(vpW-fw)/2,y:(vpH-fh)/2,w:fw,h:fh}
}
// สเกลต่ำสุดที่ทำให้รูปคลุมกรอบพอดี (ไม่มีขอบว่าง)
function cropMinScale(iw,ih,fr){return Math.max(fr.w/iw,fr.h/ih)}
// บีบตำแหน่งให้กรอบอยู่ในรูปเสมอ
function cropClamp(st,iw,ih,fr){
  const w=iw*st.s,h=ih*st.s;
  st.x=Math.min(fr.x,Math.max(fr.x+fr.w-w,st.x));
  st.y=Math.min(fr.y,Math.max(fr.y+fr.h-h,st.y));
  return st
}
// ซูมโดยคงจุด (cx,cy) ไว้ที่เดิม
function cropZoomAt(st,newS,cx,cy,iw,ih,fr,minS,maxS){
  newS=Math.min(maxS,Math.max(minS,newS));
  const k=newS/st.s;st.x=cx-(cx-st.x)*k;st.y=cy-(cy-st.y)*k;st.s=newS;
  return cropClamp(st,iw,ih,fr)
}
// พื้นที่ของรูปต้นฉบับที่อยู่ในกรอบ
function cropSourceRect(st,fr){return {sx:(fr.x-st.x)/st.s,sy:(fr.y-st.y)/st.s,sw:fr.w/st.s,sh:fr.h/st.s}}

// ---------- หน้าต่างเลือกตำแหน่ง ----------
// opts: {w,h (ขนาดผลลัพธ์), guide:'round'|'circle'|'none', title}
// คืนค่า File (JPEG) หรือ null ถ้ายกเลิก
function openCropper(file,opts){
  opts=opts||{};const OW=opts.w||400,OH=opts.h||400,aspect=OW/OH;
  return new Promise(resolve=>{
    const url=URL.createObjectURL(file);const img=new Image();
    let done=false;const finish=v=>{if(done)return;done=true;URL.revokeObjectURL(url);root.remove();document.removeEventListener('keydown',onKey);resolve(v)};
    const root=document.createElement('div');root.className='cropper';
    const guideCls=opts.guide==='round'?'round':'';
    root.innerHTML=`<div class="cropper-box"><div class="cropper-head"><b>${esc(opts.title||'เลือกตำแหน่งรูป')}</b><button type="button" class="btn secondary sm" data-a="cancel">ยกเลิก</button></div><div class="cropper-vp" id="cropVp"><img class="cropper-img" alt="" draggable="false"><div class="cropper-frame ${guideCls}">${opts.guide==='circle'?'<div class="cropper-circle"></div>':''}<i class="g1"></i><i class="g2"></i></div></div><div class="cropper-hint">ลากเพื่อเลื่อนรูป · ใช้สองนิ้วหรือแถบเลื่อนเพื่อซูม${opts.guide==='circle'?'<br>วงกลมคือส่วนที่จะแสดงเป็นไอคอนกลม (เช่น ในแชต)':''}</div><div class="cropper-zoom"><span>−</span><input type="range" min="0" max="100" value="0" step="1" aria-label="ซูม"><span>＋</span></div><div class="cropper-actions"><button type="button" class="btn secondary" data-a="reset">รีเซ็ต</button><button type="button" class="btn" data-a="ok" disabled>ใช้รูปนี้</button></div></div>`;
    document.body.appendChild(root);
    if(LANG==='en'&&typeof translateDOM==='function')translateDOM(root);
    const vp=root.querySelector('#cropVp'),im=root.querySelector('.cropper-img'),slider=root.querySelector('input[type=range]'),okBtn=root.querySelector('[data-a=ok]');
    let fr,st={s:1,x:0,y:0},minS=1,maxS=1,iw=0,ih=0;
    const MAXZ=4;
    const apply=()=>{im.style.transform=`translate(${st.x}px,${st.y}px) scale(${st.s})`;slider.value=Math.round((st.s/minS-1)/(MAXZ-1)*100)};
    const layout=(reset)=>{
      const r=vp.getBoundingClientRect();const vw=r.width||320,vh=r.height||300;
      fr=cropFrame(vw,vh,aspect);const f=root.querySelector('.cropper-frame');
      f.style.cssText=`left:${fr.x}px;top:${fr.y}px;width:${fr.w}px;height:${fr.h}px`;
      const c=root.querySelector('.cropper-circle');if(c){const d=Math.min(fr.w,fr.h);c.style.cssText=`width:${d}px;height:${d}px`}
      minS=cropMinScale(iw,ih,fr);maxS=minS*MAXZ;
      if(reset||!st.s){st.s=minS;st.x=fr.x+(fr.w-iw*st.s)/2;st.y=fr.y+(fr.h-ih*st.s)/2}
      else{st.s=Math.min(maxS,Math.max(minS,st.s))}
      cropClamp(st,iw,ih,fr);apply()};
    img.onload=()=>{iw=img.naturalWidth;ih=img.naturalHeight;im.src=url;im.style.width=iw+'px';im.style.height=ih+'px';okBtn.disabled=false;layout(true)};
    img.onerror=()=>{alert('เปิดรูปนี้ไม่ได้ (รองรับ JPG, PNG, WebP) กรุณาเลือกรูปอื่น');finish(null)};
    img.src=url;
    // ---- pointer: ลาก + pinch ----
    const pts=new Map();let pinch=null;
    vp.addEventListener('pointerdown',e=>{vp.setPointerCapture?.(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:st.s}}e.preventDefault()});
    vp.addEventListener('pointermove',e=>{
      if(!pts.has(e.pointerId))return;const prev=pts.get(e.pointerId);const cur={x:e.clientX,y:e.clientY};
      if(pts.size===1){st.x+=cur.x-prev.x;st.y+=cur.y-prev.y;cropClamp(st,iw,ih,fr)}
      else if(pts.size===2&&pinch){pts.set(e.pointerId,cur);const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=vp.getBoundingClientRect();cropZoomAt(st,pinch.s*(d/pinch.d),(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,iw,ih,fr,minS,maxS)}
      pts.set(e.pointerId,cur);apply()});
    const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null};
    vp.addEventListener('pointerup',up);vp.addEventListener('pointercancel',up);vp.addEventListener('lostpointercapture',up);
    vp.addEventListener('wheel',e=>{e.preventDefault();const r=vp.getBoundingClientRect();cropZoomAt(st,st.s*(e.deltaY<0?1.08:1/1.08),e.clientX-r.left,e.clientY-r.top,iw,ih,fr,minS,maxS);apply()},{passive:false});
    slider.addEventListener('input',()=>{const ns=minS*(1+(Number(slider.value)/100)*(MAXZ-1));cropZoomAt(st,ns,fr.x+fr.w/2,fr.y+fr.h/2,iw,ih,fr,minS,maxS);apply()});
    window.addEventListener('resize',()=>{if(!done&&iw)layout(false)},{once:false});
    const onKey=e=>{if(e.key==='Escape')finish(null)};document.addEventListener('keydown',onKey);
    root.addEventListener('click',async e=>{
      const a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;
      if(a==='cancel')return finish(null);
      if(a==='reset'){layout(true);return}
      if(a==='ok'){okBtn.disabled=true;okBtn.textContent='กำลังประมวลผล...';
        try{const sr=cropSourceRect(st,fr);const c=document.createElement('canvas');c.width=OW;c.height=OH;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,OW,OH);ctx.imageSmoothingQuality='high';ctx.drawImage(img,sr.sx,sr.sy,sr.sw,sr.sh,0,0,OW,OH);
          const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',.88));if(!blob)throw new Error('สร้างรูปไม่สำเร็จ');finish(new File([blob],'photo.jpg',{type:'image/jpeg'}))}
        catch(x){alert(friendlyError(x));okBtn.disabled=false;okBtn.textContent='ใช้รูปนี้'}}
    });
  });
}
