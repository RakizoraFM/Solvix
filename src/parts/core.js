<script id="nv-core">
/* Solvix (formerly Novaro) asset collection — single-file app. Data lives on this device (IndexedDB). */
'use strict';
const NV={version:'NV32',date:'2026-10-13'};
const FLOORS=['الأرضي','الأول','الثاني','الثالث','الرابع','الملعب','المقصف'];
const ROOM_NUMBERS=Array.from({length:20},(_,i)=>String(i+1));
const TABLES=['schools','employees','categories','types','conditions','rooms','collections','log','settings'];
const PAGE=25;

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const now=()=>new Date().toISOString();
const norm=s=>String(s||'').toLowerCase().replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();
const fmtD=iso=>{if(!iso)return '';const d=new Date(iso);return isNaN(d)?'':d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{year:'numeric',month:'2-digit',day:'2-digit'})};
const fmtDT=iso=>{if(!iso)return '';const d=new Date(iso);return isNaN(d)?'':d.toLocaleString('ar-SA-u-ca-gregory-nu-latn',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})};
const dayKey=iso=>{const d=new Date(iso);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const num=v=>{const n=Number(v);return isFinite(n)?n:0};
const money=v=>v==null||v===''?'':Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
function toast(t,ms=2600){const d=document.createElement('div');d.className='nv-toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),ms)}
function lsGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}

/* ---------- IndexedDB ---------- */
const IDB={db:null,name:'novaro_v2',
  open(){return new Promise((res,rej)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('photos'))d.createObjectStore('photos')};r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>rej(r.error)})},
  tx(store,mode,fn){return new Promise((res,rej)=>{const t=this.db.transaction(store,mode);const s=t.objectStore(store);let out;const r=fn(s);if(r&&'onsuccess' in r)r.onsuccess=()=>{out=r.result};t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})},
  get(store,k){return this.tx(store,'readonly',s=>s.get(k))},
  put(store,k,v){return this.tx(store,'readwrite',s=>s.put(v,k))},
  del(store,k){return this.tx(store,'readwrite',s=>s.delete(k))},
  keys(store){return this.tx(store,'readonly',s=>s.getAllKeys())},
  clear(store){return this.tx(store,'readwrite',s=>s.clear())}
};

/* ---------- state ---------- */
const S={};
let saveTimer={};
function save(table){clearTimeout(saveTimer[table]);saveTimer[table]=setTimeout(()=>IDB.put('kv',table,S[table]).catch(e=>toast('تعذر الحفظ: '+e.message,5000)),60);if(window.Cloud&&Cloud.on)Cloud.touch(table)}
function saveNow(table){clearTimeout(saveTimer[table]);return IDB.put('kv',table,S[table])}
async function saveAll(){for(const t of TABLES)await saveNow(t)}
const byId=(table,id)=>S[table].find(x=>x.id===id);
const idx={};
function reindex(){for(const t of ['schools','employees','categories','types','conditions','rooms']){idx[t]=new Map(S[t].map(x=>[x.id,x]))}}
const get=(t,id)=>id&&idx[t]?idx[t].get(id):undefined;

/* the built-in lists from the Laravel seeders (into S, or into another object) */
function seedLists(T){
  T=T||S;const seed=JSON.parse(document.getElementById('nv-seed').textContent);
  const t0=now();
  T.schools=seed.schools.map((r,i)=>({id:'s'+(i+1),moe:r[0],ident:r[1],site:r[2],name:r[3],district:r[4],city:r[5],description:r[6],status:'active',completed_at:null,completed_by:null,created_at:t0}));
  T.categories=[];T.types=[];
  /* NV14 — the approved 4-level catalog (level 1 → 2 → 3 → asset with its code and criticality) when the seed has it */
  if(seed.catalog&&seed.catalog.length){catalogInto(T,seed.catalog);}else{
  const catKey=new Map();
  seed.types.forEach(r=>{const k=r[0]+'|'+r[1];let c=catKey.get(k);if(!c){c={id:'c'+(T.categories.length+1),ar:r[0],en:r[1]};catKey.set(k,c);T.categories.push(c)}
    if(!T.types.some(x=>x.cat===c.id&&x.en===r[2]))T.types.push({id:'t'+(T.types.length+1),cat:c.id,en:r[2],ar:r[3]})})}
  T.conditions=['مناسب','جيد','ضعيف'].map((n,i)=>({id:'k'+(i+1),ar:n,en:''}));
  T.rooms=seed.rooms.map((r,i)=>({id:'r'+(i+1),en:r[0],ar:r[1]}));
  T.employees=seed.emps.map((r,i)=>({id:'e'+(i+1),number:r[0],name:r[1],created_at:t0}));
  return T;
}
/* rows: [level1, level2, level3, asset, code(12 digits), critical 1/0]; ids come from the code, so applying the catalog again only updates it */
function catalogInto(T,rows){const cat1=new Map(T.categories.map(c=>[norm(c.ar),c]));let n=0;const out={cats:0,add:0,upd:0};
  for(const r of rows){const [a,b,c,d,code,crit]=r.map(x=>String(x==null?'':x).trim());if(!a||!d||!/^\d{6,}$/.test(code))continue;
    let k=cat1.get(norm(a));if(!k){const id='g'+code.slice(3,5);k=T.categories.find(x=>x.id===id&&norm(x.ar)!==norm(a))?{id:'g'+code.slice(3,5)+'_'+(++n),ar:a,en:''}:{id,ar:a,en:''};if(!T.categories.some(x=>x.id===k.id))T.categories.push(k);else k=T.categories.find(x=>x.id===k.id);cat1.set(norm(a),k);out.cats++}
    const id='a'+code;const v={id,cat:k.id,l2:b,l3:c,ar:d,en:'',code,critical:crit==='1'||crit==='حرج'||crit==='true'};const ex=T.types.find(x=>x.id===id||x.code===code);
    if(ex){Object.assign(ex,v,{id:ex.id,en:ex.en||''});out.upd++}else{T.types.push(v);out.add++}}
  return out}
const isCatalog=()=>S.types.some(t=>t.code);
const typeLevels=t=>t?[(get('categories',t.cat)||{}).ar||'',t.l2||'',t.l3||'',t.ar||''].filter(Boolean).join(' › '):'';
function seedData(){
  const t0=now();seedLists(S);
  S.collections=[];S.log=[];
  S.settings={app_name:'Solvix',admin_email:'',logo:null,admin_login:null,pin_hash:null,seq:0,seeded_at:t0};
}
async function loadState(cloud){
  if(cloud)IDB.name='novaro_cloud';
  await IDB.open();
  for(const t of TABLES)S[t]=await IDB.get('kv',t);
  if(cloud){if(!S.settings)S.settings={app_name:'Solvix',admin_email:'',logo:null}}
  else if(!S.settings||!S.schools){seedData();await saveAll()}
  for(const t of TABLES)if(S[t]==null)S[t]=t==='settings'?{}:[];
  reindex();
}

/* ---------- photos ---------- */
const urlCache=new Map();
async function photoURL(key){if(!key)return '';if(urlCache.has(key))return urlCache.get(key);let b=await IDB.get('photos',key).catch(()=>null);if(!b&&window.Cloud&&Cloud.on)b=await Cloud.fetchPhoto(key);if(!b)return '';const u=URL.createObjectURL(b);urlCache.set(key,u);return u}
function resizeImage(file,max=1600,q=.82){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{let w=img.naturalWidth,h=img.naturalHeight;const r=Math.min(1,max/Math.max(w,h));w=Math.round(w*r);h=Math.round(h*r);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(new Error('image')),'image/jpeg',q)};img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('الملف ليس صورة صالحة'))};img.src=u})}
async function storePhoto(file,stamp){if(!file)return null;if(file.size>15*1024*1024)throw new Error('حجم الصورة أكبر من 15 م.ب');let b=await resizeImage(file);if(stamp)b=await stampPhoto(b,stamp);const k='p_'+uid();await IDB.put('photos',k,b);return k}
/* NV25 — burn the evidence into the photo: a dark band at the bottom with the given lines (time, school, room, GPS) */
async function stampPhoto(blob,lines){const u=URL.createObjectURL(blob);try{const im=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=u});
  const w=im.naturalWidth,h=im.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(im,0,0);
  const fs=Math.max(13,Math.round(w/48)),lh=Math.round(fs*1.4),pad=Math.round(fs*.6),bh=lines.length*lh+pad*2;x.fillStyle='rgba(15,23,42,.66)';x.fillRect(0,h-bh,w,bh);
  x.fillStyle='#fff';x.font=`700 ${fs}px Cairo, Tahoma, sans-serif`;x.direction='rtl';x.textAlign='right';x.textBaseline='top';lines.forEach((l,i)=>x.fillText(l,w-pad,h-bh+pad+i*lh,w-pad*2));
  return await new Promise(r=>c.toBlob(b=>r(b||blob),'image/jpeg',.85))}catch(e){return blob}finally{URL.revokeObjectURL(u)}}
const PHOTO_KEYS=['school_image','asset_image','asset_image2','label_photo'];const photoKeys=c=>PHOTO_KEYS.map(k=>c[k]).concat(Array.isArray(c.extra_images)?c.extra_images:[]).filter(Boolean);
async function deletePhoto(key){if(!key)return;if(S.collections.some(c=>c.school_image===key||c.asset_image===key||c.asset_image2===key||c.label_photo===key||(c.extra_images||[]).includes(key)))return;await IDB.del('photos',key).catch(()=>{});const u=urlCache.get(key);if(u){URL.revokeObjectURL(u);urlCache.delete(key)}}
async function hydratePhotos(root=document){for(const el of $$('img[data-photo]',root)){const u=await photoURL(el.dataset.photo);if(u){el.src=u;if(!el.onclick)el.onclick=()=>(window.openPhoto||lightbox)(u)}}}
function lightbox(u){window.open(u,'_blank')}


/* ---------- dialogs ---------- */
function dialog_unused(html,onMount){return new Promise(res=>{const bg=document.createElement('div');bg.className='dlg-bg';bg.innerHTML='<div class="dlg">'+html+'</div>';document.body.appendChild(bg);const close=v=>{bg.remove();res(v)};bg.addEventListener('click',e=>{if(e.target===bg)close(null)});$$('[data-close]',bg).forEach(b=>b.onclick=()=>close(b.dataset.close==='1'?true:null));onMount&&onMount(bg,close)})}

/* ---------- domain ---------- */
const empName=id=>(get('employees',id)||{}).name||'—';
const roomLabel=c=>{const r=get('rooms',c.room_name_id);return r?r.ar:''};
const isClosedRoom=id=>{const r=get('rooms',id);return !!r&&r.en==='Closed room'};
const submitted=c=>!!c.submitted_at;
function schoolStats(){const m=new Map();for(const c of S.collections){let s=m.get(c.school_id);if(!s){s={any:0,sub:0,qty:0,last:null,emp:null};m.set(c.school_id,s)}s.any++;if(c.submitted_at){s.sub++;s.qty+=num(c.quantity);if(!s.last||c.submitted_at>s.last){s.last=c.submitted_at}}if(!s.emp||(c.updated_at||'')>(s.empAt||'')){s.emp=c.employee_id;s.empAt=c.updated_at||''}}return m}
function schoolState(s,st){if(s.completed_at)return 'completed';if(st&&st.any)return 'in_progress';return 'not_started'}
function logChange(rec,by,changes){if(window.Cloud&&Cloud.on)return;/* the server trigger logs in cloud mode */if(!changes||!Object.keys(changes).length)return;S.log.unshift({id:uid(),at:now(),by,coll:rec.id,school:rec.school_id,emp:rec.employee_id,changes});if(S.log.length>3000)S.log.length=3000;save('log')}
const FIELD_LBL={category_id:'الفئة',type_id:'نوع الأصل',condition_id:'الحالة الفنية',quantity:'الكمية',price:'السعر',status:'التشغيل',manufacturer:'الشركة المصنعة',brand:'الماركة',model:'الموديل',capacity:'السعة',serial:'الرقم التسلسلي',agency:'الوكيل',warranty:'الضمان',install_date:'تاريخ التركيب',asad_country:'دولة الموقع (ASAD)',lat:'خط العرض',lng:'خط الطول',parent_child:'رئيسي / فرعي',tag:'رقم ASAD',notes:'ملاحظات',floor:'الدور',room_number:'رقم الغرفة',room_name_id:'اسم الغرفة',asset_image:'صورة الأصل',asset_image2:'صورة لوحة البيانات',extra_images:'الصور الإضافية',school_image:'صورة المدرسة',employee_id:'الموظف',school_id:'المدرسة'};
function fieldText(k,v){if(v==null||v==='')return '—';switch(k){case 'category_id':return (get('categories',v)||{}).ar||v;case 'type_id':return (get('types',v)||{}).ar||v;case 'condition_id':return (get('conditions',v)||{}).ar||v;case 'room_name_id':return (get('rooms',v)||{}).ar||v;case 'employee_id':return empName(v);case 'school_id':return (get('schools',v)||{}).name||v;case 'asset_image':case 'asset_image2':case 'school_image':return 'صورة';case 'extra_images':return (v||[]).length+' صورة';default:return String(v)}}
function diff(oldR,newR,keys){const ch={};for(const k of keys){const a=oldR[k]==null?'':String(oldR[k]),b=newR[k]==null?'':String(newR[k]);if(a!==b)ch[k]={old:oldR[k]??null,new:newR[k]??null}}return ch}
const TRACK=['category_id','type_id','condition_id','quantity','price','status','manufacturer','brand','model','capacity','serial','agency','warranty','install_date','asad_country','lat','lng','asset_image','asset_image2','extra_images','parent_child','tag','notes','floor','room_number','room_name_id'];
function blankAsset(){return {category_id:null,type_id:null,condition_id:null,quantity:1,price:null,status:null,manufacturer:'',brand:'',model:'',capacity:'',serial:'',agency:'',warranty:'',install_date:'',asad_country:'',lat:null,lng:null,asset_image:null,asset_image2:null,extra_images:[],parent_child:null,tag:'',notes:'',submitted_at:null}}
function nextNo(){S.settings.seq=Math.max(num(S.settings.seq),...S.collections.map(c=>num(c.no)))+1;save('settings');return S.settings.seq}
function newCollection(emp,school,schoolImage,loc){const t=now();return Object.assign({id:uid(),no:nextNo(),employee_id:emp,school_id:school,school_image:schoolImage,floor:null,room_number:null,room_name_id:null,created_at:t,updated_at:t},blankAsset(),loc||{})}

/* ---------- Excel (SheetJS, lazy) ---------- */
let xlsxP=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('تعذر تحميل المكتبة — تحقق من الاتصال'));document.head.appendChild(s)})}
function loadCss(href){if($(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
const needXLSX=()=>xlsxP||(xlsxP=window.XLSX?Promise.resolve():loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'));
let zipP=null;const needZip=()=>zipP||(zipP=window.JSZip?Promise.resolve():loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'));
let leafP=null;const needLeaflet=()=>leafP||(leafP=window.L?Promise.resolve():(loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'),loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js')));
async function writeXlsx(sheets,name){try{await needXLSX()}catch(e){xlsxP=null;return toast(e.message,4000)}const wb=XLSX.utils.book_new();for(const [n,rows] of sheets){const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=rows[0].map(()=>({wch:18}));XLSX.utils.book_append_sheet(wb,ws,n.slice(0,31))}XLSX.writeFile(wb,name)}
async function readXlsx(file){await needXLSX();const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];return XLSX.utils.sheet_to_json(ws,{defval:'',raw:false})}
function pickFile(accept){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept=accept;i.onchange=()=>res(i.files[0]||null);i.click()})}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const stamp=()=>new Date().toISOString().slice(0,16).replace(/[-:T]/g,'');

/* NV12 — asset label number 101XXXXXXXX from the record number (unique: server identity in the cloud, device sequence offline) */
const assetLabel=c=>c&&c.no?'101'+String(c.no).padStart(8,'0'):'';
/* NV19 — column order approved by the owner (his sample file); «Status» (Works / Does not work) is no longer collected */
const EXPORT_COLS=[['ID',(c)=>c.no||''],['Employee',(c,e)=>e.name||''],['Employee #',(c,e)=>e.number||''],['School Name',(c,e,s)=>s.name||''],['MOE Number',(c,e,s)=>s.moe||''],['School Identifier',(c,e,s)=>s.ident||''],
  ['City',(c,e,s)=>s.city||''],['District',(c,e,s)=>s.district||''],['Site',(c,e,s)=>s.site||''],['Floor',c=>c.floor||''],['Room Number',c=>c.room_number||''],['Room Name',c=>(get('rooms',c.room_name_id)||{}).ar||''],
  ['Category',c=>(get('categories',c.category_id)||{}).ar||''],['Asset Type',(c,e,s,t)=>t.ar||''],['Level 2',(c,e,s,t)=>t.l2||''],['Level 3',(c,e,s,t)=>t.l3||''],['Asset Code',(c,e,s,t)=>t.code||''],['Critical',(c,e,s,t)=>c.type_id?(t.critical?'حرج':'غير حرج'):''],
  ['Condition',c=>(get('conditions',c.condition_id)||{}).ar||''],['Quantity',c=>num(c.quantity)],['Price',c=>c.price??''],['Manufacturer',c=>c.manufacturer||''],['Brand',c=>c.brand||''],['Model',c=>c.model||''],['Capacity',c=>c.capacity||''],
  ['Serial Number',c=>c.serial||''],['Agency',c=>c.agency||''],['Warranty',c=>c.warranty||''],['Installation Date',c=>c.install_date||''],['Tag Number',c=>assetLabel(c)],['Parent/Child',c=>c.parent_child||''],
  ['Notes',c=>c.notes||''],['School Image URL',c=>c.school_image?c.school_image+'.jpg':''],['Location Diagram URL',()=>''],['Asset Image URL',c=>c.asset_image?c.asset_image+'.jpg':''],['Asset Image 2 URL',c=>c.asset_image2?c.asset_image2+'.jpg':''],['Submitted At',c=>ymdhms(c.submitted_at)],['Created At',c=>ymdhms(c.created_at)],['Label Number',c=>assetLabel(c)],['Label Confirmed At',c=>c.label_at?ymdhms(c.label_at)+(c.label_check==='unread'?' (QR unread)':''):'']];
const EXPORT_HEAD=EXPORT_COLS.map(x=>x[0]);
const ymdhms=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())};
function exportRow(c){const e=get('employees',c.employee_id)||{},s=get('schools',c.school_id)||{},t=get('types',c.type_id)||{};return EXPORT_COLS.map(x=>x[1](c,e,s,t))}
async function exportCollections(list,name){list=list.slice().sort((a,b)=>(b.created_at||'')<(a.created_at||'')?-1:1);await writeXlsx([['Worksheet',[EXPORT_HEAD,...list.map(exportRow)]]],name||('collections-'+stamp()+'.xlsx'))}
async function exportPhotosZip(list){try{await needZip()}catch(e){zipP=null;return toast(e.message,4000)}const zip=new JSZip();const seen=new Set();let n=0;for(const c of list){for(const k of photoKeys(c)){if(!k||seen.has(k))continue;seen.add(k);const b=await IDB.get('photos',k).catch(()=>null);if(b){zip.file(k+'.jpg',b);n++}}}if(!n)return toast('لا توجد صور');toast('جارٍ تجهيز '+n+' صورة…');download(await zip.generateAsync({type:'blob'}),'solvix-photos-'+stamp()+'.zip')}

/* ---------- backup / merge ---------- */
const blobToData=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
const dataToBlob=async d=>(await fetch(d)).blob();
async function buildPackage(opts){const o=opts||{};const pkg={app:'novaro',v:1,at:now(),kind:o.kind||'full',by:o.by||null,data:{}};
  if(o.kind==='employee'){const mine=S.collections.filter(c=>c.employee_id===o.by);const sch=new Set(mine.map(c=>c.school_id));pkg.data.collections=mine;pkg.data.schools=S.schools.filter(s=>sch.has(s.id));pkg.data.employees=S.employees.filter(e=>e.id===o.by);pkg.data.log=S.log.filter(l=>l.emp===o.by)}
  else{for(const t of TABLES)pkg.data[t]=t==='settings'?Object.assign({},S.settings,{admin_login:undefined}):S[t]}
  if(o.photos!==false){pkg.photos={};const keys=new Set();for(const c of pkg.data.collections)photoKeys(c).forEach(k=>keys.add(k));for(const k of keys){const b=await IDB.get('photos',k).catch(()=>null);if(b)pkg.photos[k]=await blobToData(b)}}
  return pkg}
async function exportPackage(opts){toast('جارٍ تجهيز الملف…');const pkg=await buildPackage(opts);const name=(opts&&opts.kind==='employee'?'solvix-'+((get('employees',opts.by)||{}).number||'emp')+'-':'solvix-backup-')+stamp()+'.json';download(new Blob([JSON.stringify(pkg)],{type:'application/json'}),name)}
async function readPackage(file){const pkg=JSON.parse(await file.text());if(!pkg||pkg.app!=='novaro'||!pkg.data)throw new Error('الملف ليس نسخة من نوفارو');return pkg}
/* Merge a package from another device: records by id (newer updated_at wins), school completion kept, lookups/employees matched by natural key. */
async function mergePackage(pkg){const d=pkg.data;const rep={coll:0,upd:0,sch:0,emp:0,photos:0};const remap={employees:{},schools:{},categories:{},types:{},conditions:{},rooms:{}};
  const matchBy=(t,keyFn,make)=>{for(const x of (d[t]||[])){const k=keyFn(x);let m=S[t].find(y=>keyFn(y)===k);if(!m&&make){m=make(x);S[t].push(m);if(t==='employees')rep.emp++}if(m)remap[t][x.id]=m.id}};
  matchBy('employees',e=>String(e.number),x=>Object.assign({},x,{id:byId('employees',x.id)?'e'+uid():x.id}));
  matchBy('categories',c=>c.ar+'|'+c.en,x=>Object.assign({},x,{id:byId('categories',x.id)?'c'+uid():x.id}));
  for(const x of (d.types||[])){const cat=remap.categories[x.cat]||x.cat;let m=S.types.find(y=>y.cat===cat&&y.en===x.en);if(!m){m=Object.assign({},x,{cat,id:byId('types',x.id)?'t'+uid():x.id});S.types.push(m)}remap.types[x.id]=m.id}
  matchBy('conditions',c=>c.ar,x=>Object.assign({},x,{id:byId('conditions',x.id)?'k'+uid():x.id}));
  matchBy('rooms',r=>r.en+'|'+r.ar,x=>Object.assign({},x,{id:byId('rooms',x.id)?'r'+uid():x.id}));
  for(const x of (d.schools||[])){let m=S.schools.find(y=>y.ident===x.ident);if(!m){m=Object.assign({},x,{id:byId('schools',x.id)?'s'+uid():x.id});S.schools.push(m)}remap.schools[x.id]=m.id;
    if(x.completed_at&&(!m.completed_at||x.completed_at<m.completed_at)){m.completed_at=x.completed_at;m.completed_by=remap.employees[x.completed_by]||x.completed_by;m.status='inactive';rep.sch++}}
  const R=(t,v)=>v==null?v:(remap[t][v]||v);
  for(const x of (d.collections||[])){const c=Object.assign({},x,{employee_id:R('employees',x.employee_id),school_id:R('schools',x.school_id),category_id:R('categories',x.category_id),type_id:R('types',x.type_id),condition_id:R('conditions',x.condition_id),room_name_id:R('rooms',x.room_name_id)});
    const i=S.collections.findIndex(y=>y.id===c.id);if(i<0){if(!c.no||S.collections.some(y=>y.no===c.no))c.no=nextNo();S.collections.push(c);rep.coll++}else if((c.updated_at||'')>(S.collections[i].updated_at||'')){S.collections[i]=c;rep.upd++}}
  for(const l of (d.log||[]))if(!S.log.some(y=>y.id===l.id))S.log.push(l);S.log.sort((a,b)=>a.at<b.at?1:-1);
  for(const [k,v] of Object.entries(pkg.photos||{})){if(!(await IDB.get('photos',k).catch(()=>null))){await IDB.put('photos',k,await dataToBlob(v));rep.photos++}}
  reindex();await saveAll();return rep}
async function restorePackage(pkg){if(pkg.kind!=='full')throw new Error('هذا ملف فني وليس نسخة كاملة — استخدم «دمج ملفات مشرفي الميدان».');const adm=S.settings.admin_login;for(const t of TABLES)S[t]=pkg.data[t]||(t==='settings'?{}:[]);S.settings.admin_login=adm;await IDB.clear('photos');urlCache.clear();for(const [k,v] of Object.entries(pkg.photos||{}))await IDB.put('photos',k,await dataToBlob(v));reindex();await saveAll()}

/* ---------- admin PIN ---------- */
async function hashPin(p){const data=new TextEncoder().encode('novaro:'+p);if(window.crypto&&crypto.subtle){const h=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')}let h=5381;for(const b of data)h=((h<<5)+h+b)>>>0;return 'd'+h.toString(16)}
const isAdmin=()=>{try{return sessionStorage.getItem('nv_admin')==='1'}catch(e){return false}};
const setAdmin=v=>{try{v?sessionStorage.setItem('nv_admin','1'):sessionStorage.removeItem('nv_admin')}catch(e){}};

/* ---------- session (technician) ---------- */
const sess=()=>lsGet('nv_session',{});
const setSess=o=>lsSet('nv_session',Object.assign(sess(),o));
const clearSess=()=>{try{localStorage.removeItem('nv_session')}catch(e){}};
/* NV26 — location check, asset link in the QR, nameplate reading */
const geoCfg=()=>Object.assign({m:300,block:false},S.settings.geo||{});
/* metres between two [lat,lng] points (haversine) */
function geoDist(a,b){if(!a||!b||a[0]==null||b[0]==null)return null;const R=6371e3,r=x=>x*Math.PI/180;const dl=r(b[0]-a[0]),dn=r(b[1]-a[1]);
  const h=Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
/* the school's reference point: its own coordinates, else the median of the assets already recorded there (null when none) */
function schoolRef(sid,skip){const s=get('schools',sid)||{};if(s.lat!=null&&s.lng!=null&&s.lat!==''&&s.lng!=='')return {p:[+s.lat,+s.lng],src:'school'};
  const L=S.collections.filter(c=>c.school_id===sid&&c!==skip&&c.submitted_at&&c.lat!=null&&c.lng!=null);if(L.length<1)return null;
  const med=a=>{a=a.slice().sort((x,y)=>x-y);const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2};return {p:[med(L.map(c=>+c.lat)),med(L.map(c=>+c.lng))],src:'assets',n:L.length}}
const fmtDist=m=>m==null?'':m>=1000?(m/1000).toFixed(1).replace(/\.0$/,'')+' '+tx('كم','km'):Math.round(m)+' '+tx('م','m');
/* a link that opens the asset (with its photos) after sign-in */
const assetURL=c=>c&&c.no?location.origin+location.pathname+'#a/'+assetLabel(c):'';
/* nameplate OCR: Tesseract.js 5.1.1 + English data, all from jsdelivr, loaded only when asked */
const TESS={lib:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',langPath:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int'};
async function ocrPlate(blob,progress){if(!window.Tesseract)await loadScript(TESS.lib);
  const w=await Tesseract.createWorker('eng',1,{workerPath:TESS.workerPath,corePath:TESS.corePath,langPath:TESS.langPath,logger:m=>{if(progress&&m.status==='recognizing text')progress(Math.round(m.progress*100))}});
  try{const {data}=await w.recognize(blob);return data.text||''}finally{w.terminate().catch(()=>{})}}
const PLATE_BRANDS=['Carrier','LG','Samsung','Gree','Daikin','York','Trane','Mitsubishi','Midea','Haier','Toshiba','Hitachi','Panasonic','Sharp','Zamil','Alessa','Hisense','TCL','Super General','Westpoint','Whirlpool','Electrolux','Ariston','Rheem','Lennox','Honeywell','Johnson Controls','Siemens','Schneider','ABB','Legrand','Grundfos','Wilo','KSB','Otis','Kone','Schindler','Bosch','Philips','Osram','Sony','HP','Dell','Lenovo','Acer','Asus','Apple','Canon','Epson','Brother','Ricoh','Kyocera','Xerox','Cisco','Hikvision','Dahua'];
function parsePlate(txt){const T=String(txt||'').replace(/\r/g,'').replace(/[|]/g,'I');const lines=T.split('\n').map(x=>x.trim()).filter(Boolean);const o={};
  const grab=re=>{for(const l of lines){const m=l.match(re);if(m&&m[1]){const v=m[1].trim().replace(/[.,;:]+$/,'');if(v.length>=3)return v}}return ''};
  o.serial=grab(/(?:\bS\s*[\/I1l\\]\s*N\b|\bSER(?:IAL)?\.?\s*(?:N[O0O]\.?|NUMBER|#)?|\bSN\b)\s*[:.#=\-]?\s*([A-Z0-9][A-Z0-9\-\/]{3,})/i);
  o.model=grab(/(?:\bMODEL\b|\bMOD\.|\bM\s*\/\s*N\b|\bTYPE\b)\s*(?:N[O0]\.?|NUMBER|#)?\s*[:.#=\-]?\s*([A-Z0-9][A-Z0-9\-\/\.]{2,})/i);
  const cap=T.match(/(\d[\d,.]*\s*(?:BTU(?:\s*\/\s*H)?|TONS?\b|\bTR\b|KW\b|KVA\b|HP\b|LITERS?\b|LTR\b|KG\b))/i);if(cap)o.capacity=cap[1].replace(/\s+/g,' ').trim();
  for(const b of PLATE_BRANDS)if(new RegExp('\\b'+b.replace(/ /g,'\\s*')+'\\b','i').test(T)){o.brand=b;break}
  for(const k of Object.keys(o))if(!o[k])delete o[k];return o}
/* NV28 — permissions of the signed-in person (nv_me().perms); offline = everything; a database without NV28 = by role */
const FIELD_PERMS=['collect','edit_sent','finish','gallery','extra'];
function can(p){if(!window.Cloud||!Cloud.on)return true;if(Cloud.sys)return true;if(Array.isArray(Cloud.perms))return Cloud.perms.includes(p);
  return Cloud.role==='admin'?!FIELD_PERMS.includes(p):Cloud.role==='tech'?FIELD_PERMS.includes(p):Cloud.role==='reader'?['view','export'].includes(p):false}
/* subscription status for the banners: null when no end date */
function subInfo(){const s=window.Cloud&&Cloud.on&&Cloud.sub;if(!s||!s.ends_at)return null;const end=new Date(s.ends_at).getTime(),g=(+s.grace_days||0)*864e5,now=Date.now();
  return {end,days:Math.ceil((end-now)/864e5),graceEnd:end+g,ok:s.ok!==false,state:s.ok===false?'over':now>=end?'grace':(end-now)<=14*864e5?'soon':'ok'}}
</script>