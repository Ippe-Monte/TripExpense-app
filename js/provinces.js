// provinces.js — 77 จังหวัด แบ่ง 6 ภาค (ราชบัณฑิต) + สถิติ "เหรียญพิชิต" ของแผนที่การเที่ยวส่วนตัว (ฟังก์ชันล้วน)
const THAI_REGIONS=[
 {key:'north',name:'ภาคเหนือ',provinces:['เชียงราย','เชียงใหม่','น่าน','พะเยา','แพร่','แม่ฮ่องสอน','ลำปาง','ลำพูน','อุตรดิตถ์']},
 {key:'northeast',name:'ภาคตะวันออกเฉียงเหนือ',provinces:['กาฬสินธุ์','ขอนแก่น','ชัยภูมิ','นครพนม','นครราชสีมา','บึงกาฬ','บุรีรัมย์','มหาสารคาม','มุกดาหาร','ยโสธร','ร้อยเอ็ด','เลย','สกลนคร','สุรินทร์','ศรีสะเกษ','หนองคาย','หนองบัวลำภู','อุดรธานี','อุบลราชธานี','อำนาจเจริญ']},
 {key:'central',name:'ภาคกลาง',provinces:['กรุงเทพมหานคร','กำแพงเพชร','ชัยนาท','นครนายก','นครปฐม','นครสวรรค์','นนทบุรี','ปทุมธานี','พระนครศรีอยุธยา','พิจิตร','พิษณุโลก','เพชรบูรณ์','ลพบุรี','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สระบุรี','อ่างทอง','อุทัยธานี']},
 {key:'east',name:'ภาคตะวันออก',provinces:['จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ตราด','ปราจีนบุรี','ระยอง','สระแก้ว']},
 {key:'west',name:'ภาคตะวันตก',provinces:['กาญจนบุรี','ตาก','ประจวบคีรีขันธ์','เพชรบุรี','ราชบุรี']},
 {key:'south',name:'ภาคใต้',provinces:['กระบี่','ชุมพร','ตรัง','นครศรีธรรมราช','นราธิวาส','ปัตตานี','พังงา','พัทลุง','ภูเก็ต','ยะลา','ระนอง','สงขลา','สตูล','สุราษฎร์ธานี']}];
const ALL_PROVINCES=THAI_REGIONS.flatMap(r=>r.provinces.map(p=>({name:p,region:r.name,regionKey:r.key})));
const _PMAP=Object.fromEntries(ALL_PROVINCES.map(p=>[p.name,p]));
function provinceInfo(name){return _PMAP[String(name||'').trim()]||null}
// สถิติแฟ้มสะสมการเที่ยว จากรายการเช็กอินของผู้ใช้
function portfolioStats(checkins){
  const list=checkins||[],seenProv=new Set(),countries=new Set(),places=new Set(),trips=new Set(),byYear={};
  for(const c of list){
    const country=(c.country||'TH').toUpperCase();countries.add(country);
    if(country==='TH'&&provinceInfo(c.province))seenProv.add(c.province.trim());
    places.add((c.place_name||'').trim().toLowerCase()+'|'+(c.province||c.country||''));
    if(c.trip_id)trips.add(c.trip_id);
    const y=(c.checked_in_at||c.created_at||'').slice(0,4);if(y)(byYear[y]=byYear[y]||[]).push(c);
  }
  const regions=THAI_REGIONS.map(r=>{const done=r.provinces.filter(p=>seenProv.has(p)).length;return {key:r.key,name:r.name,done,total:r.provinces.length,medal:done===r.provinces.length}});
  return {provinceCount:seenProv.size,provinceTotal:ALL_PROVINCES.length,countryCount:countries.size,countries:[...countries].sort(),placeCount:places.size,tripCount:trips.size,regions,medals:regions.filter(r=>r.medal).length,byYear}}
if(typeof module!=='undefined')module.exports={THAI_REGIONS,ALL_PROVINCES,provinceInfo,portfolioStats};
