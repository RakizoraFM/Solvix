<script id="nv-field">
/* Technician pages — markup copied from resources/views/layouts/app.blade.php and resources/views/collection/*.blade.php */
const I18N=JSON.parse(document.getElementById('nv-i18n').textContent);
const lang=()=>{const v=lsGet('nv_lang','ar');return v==='en'?'en':'ar'};
const t=k=>{const d=I18N[lang()]||{};return d[k]!=null?d[k]:k};
const tx=(ar,en)=>lang()==='ar'?ar:en;
const app=()=>$('#app');
let flash=null;
const setFlash=(m,k='ok')=>{flash={t:m,k}};
const takeFlash=()=>{const f=flash;flash=null;return f};
const go=h=>{if(location.hash===h)route();else location.hash=h};
const curEmp=()=>get('employees',sess().emp);
const curColl=()=>{const id=sess().coll;return id?S.collections.find(c=>c.id===id):null};
const logoURL=()=>S.settings.logo||NV_LOGO;
const appName=()=>S.settings.app_name||'Solvix';
const roomName=c=>{const r=get('rooms',c&&c.room_name_id);return r?(lang()==='ar'?r.ar:r.en):null};
const ymd=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
const hiA=iso=>{if(!iso)return '';const d=new Date(iso);let h=d.getHours();const a=h<12?'AM':'PM';h=h%12||12;return String(h).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+' '+a};
function needEmp(){if(!curEmp()){clearSess();go('#login');return false}return true}
const statusBox=m=>m?`<div class="mb-6 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">${esc(m)}</div>`:'';
const INPUT='w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all';
const BTN_BACK='flex-1 text-center border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3 rounded-xl transition-all';
const BTN_MAIN='flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200';

function fieldLayout(inner){
  const ar=lang()==='ar';
  document.documentElement.lang=lang();document.documentElement.dir=ar?'rtl':'ltr';
  document.body.className='nv-field bg-gray-50 text-gray-900 min-h-screen flex flex-col'+(ar?'':' nv-en')+(/^#?(login)?$/.test(location.hash.replace(/\?.*/,''))||!curEmp()?' nv-auth':'');
  document.title=appName();
  app().className='contents';
  app().innerHTML=`<header class="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
    <a href="#login" class="flex items-center gap-3 text-decoration-none"><img src="${esc(S.settings.logo||NV_ICON)}" alt="${esc(appName())}" class="h-12 w-auto"><h1 class="text-xl font-bold text-gray-800">${esc(appName())}</h1></a>
    <a href="javascript:void 0" id="langSw" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-bold">${ar?'English':'العربية'}</a></header>
  <main class="flex-grow flex items-center justify-center p-4">${inner}</main>
  <div id="lb" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" x-cloak style="display:none">
    <button type="button" id="lbX" class="absolute top-4 right-4 text-white hover:text-gray-300 z-10"><svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
    <div class="relative max-w-full max-h-full overflow-auto flex items-center justify-center"><img id="lbImg" class="max-w-full max-h-[90vh] object-contain cursor-zoom-in rounded-lg shadow-2xl" alt=""></div></div>
  <footer class="py-6 text-center text-gray-400 text-sm">&copy; ${new Date().getFullYear()} ${esc(appName())} • RakizoraFM — ${tx('إدارة المرافق والأصول الذكية','Smart Facility &amp; Asset Management')} <a href="#admin" class="text-gray-300 hover:text-gray-500">Admin</a> <span data-nv-sync class="text-gray-400"></span></footer>`;
  if(window.Cloud)Cloud.badge();
  $('#langSw').onclick=()=>{lsSet('nv_lang',ar?'en':'ar');route()};
  const lb=$('#lb'),li=$('#lbImg');
  window.openPhoto=u=>{li.src=u;lb.style.display='flex'};
  $('#lbX').onclick=()=>{lb.style.display='none'};
  lb.addEventListener('click',e=>{if(e.target===lb||e.target===lb.firstElementChild.nextElementSibling)lb.style.display='none'});
  li.onclick=e=>{e.stopPropagation();['cursor-zoom-out','max-h-[90vh]','max-h-none','max-w-full','max-w-none'].forEach(c=>li.classList.toggle(c))};
  hydratePhotos(app());
}
const img=(k,cls,empty)=>k?`<img data-photo="${esc(k)}" class="${cls}" alt="">`:empty;

/* cloud: send what is left, then sign out (warn when something could not be sent) */
async function cloudLogoutOk(){if(!Cloud.on)return true;await Cloud.sync();const n=Cloud.pendingCount();
  if(n&&!confirm(tx(`لم تُرسل ${n} من التعديلات بعد (لا يوجد اتصال). ستبقى على هذا الجهاز وتُرسل عند دخولك مرة أخرى. خروج على أي حال؟`,`${n} changes are not sent yet (no connection). They stay on this device and are sent when you sign in again. Sign out anyway?`)))return false;
  await Cloud.signOut();return true}
/* sign-in (NV7 layout, same fields as login.blade.php) */
function vLogin(err,val){if(Cloud.on){if(!err&&Cloud.role==='tech'&&Cloud.emp){setSess({emp:Cloud.emp.id,school:null,coll:null});return go('#employee-data')}if(!err&&isAuthed())return go('#admin');return vCloudLogin(err)}
  const remembered=lsGet('nv_remember_tech','');
  authPage({kind:'tech',title:t('Login'),sub:tx('مرحباً بك، يرجى تسجيل الدخول للمتابعة','Welcome — please sign in to continue'),err,
    fields:[{id:'employee-id',label:t('Employee ID'),icon:'bi-person-badge',ph:tx('أدخل رقمك الوظيفي','Enter your employee ID'),value:val||(remembered&&remembered!=='1'?remembered:''),mode:'numeric',auto:'username',dir:'ltr',bad:1},
      ...(Cloud.on?[{id:'employee-pw',label:tx('كلمة المرور','Password'),type:'password',icon:'bi-lock',ph:tx('أدخل كلمة المرور','Enter your password'),auto:'current-password',dir:'ltr',bad:1}]:[])],
    submit:t('Submit'),rememberValue:()=>$('#employee-id').value.trim(),
    onSubmit:async()=>{const n=$('#employee-id').value.trim();
      if(Cloud.on){try{const me=await Cloud.signIn('nv'+n.toLowerCase().replace(/[^a-z0-9]/g,'')+'@novaro.local',$('#employee-pw').value);
          if(!me||me.role!=='tech'||!me.emp){await Cloud.signOut();return vLogin(t('Employee not found. Please try again.'),n)}
          await Cloud.pull();setSess({emp:me.emp.id,school:null,coll:null});return go('#employee-data')}
        catch(er){return vLogin(/Invalid login/i.test(er.message)?tx('الرقم الوظيفي أو كلمة المرور غير صحيحة','Wrong employee ID or password'):/fetch|network|lib/i.test(er.message)?tx('تعذر الاتصال بالخادم — تحقق من الإنترنت','Cannot reach the server — check the internet connection'):er.message,n)}}
      const emp=S.employees.find(x=>String(x.number)===n);if(!emp)return vLogin(t('Employee not found. Please try again.'),n);setSess({emp:emp.id,school:null,coll:null});go('#employee-data')}});
}

/* employee-data.blade.php (+ a "send my data" card for working on several devices) */
function vEmployee(){
  if(!needEmp())return;const e=curEmp();
  fieldLayout(`<section id="screen-data" class="w-full max-w-2xl"><div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
  <div class="flex justify-between items-center mb-8"><h2 class="text-2xl font-bold text-gray-800">${t('Employee Data')}</h2><span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">${t('Active')}</span></div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
   <div class="space-y-1"><label class="text-sm text-gray-500">${t('Full Name')}</label><p class="text-lg font-bold text-gray-900 border-b pb-2">${esc(e.name)}</p></div>
   <div class="space-y-1"><label class="text-sm text-gray-500">${t('Employee ID')}</label><p class="text-lg font-bold text-gray-900 border-b pb-2">${esc(e.number)}</p></div></div>
  <div class="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
   <div class="flex items-center gap-4"><div class="bg-blue-600 p-3 rounded-xl text-white"><i class="bi bi-clock-history text-xl"></i></div>
    <div><h4 class="font-bold text-gray-800">${t('Collection History')}</h4><p class="text-sm text-gray-500">${t('View and edit your previous submissions')}</p></div></div>
   <a href="#history" class="w-full sm:w-auto text-center bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm">${t('View History')}</a></div>
  ${Cloud.on?'':`<div class="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
   <div class="flex items-center gap-4"><div class="bg-blue-600 p-3 rounded-xl text-white"><i class="bi bi-send text-xl"></i></div>
    <div><h4 class="font-bold text-gray-800">${tx('إرسال بياناتي','Send my data')}</h4><p class="text-sm text-gray-500">${tx('ملف بكل ما سجلته على هذا الجهاز مع الصور، يرسل للمشرف ليدمجه','A file with everything you recorded on this device, for the admin to merge')}</p></div></div>
   <a href="javascript:void 0" id="send" class="w-full sm:w-auto text-center bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm">${tx('تنزيل الملف','Download file')}</a></div>`}
  <div class="flex flex-col sm:flex-row gap-4"><a href="javascript:void 0" id="back" class="${BTN_BACK}">${t('Back')}</a><a href="#school" class="flex-[2] text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200">${t('Confirm Data')}</a></div>
  </div></section>`);
  $('#back').onclick=async()=>{if(!await cloudLogoutOk())return;clearSess();go('#login')};
  if($('#send'))$('#send').onclick=()=>exportPackage({kind:'employee',by:e.id});
}

/* school.blade.php */
function schoolBlock(sc,empId){if(sc.status==='inactive'||sc.completed_at||S.collections.some(c=>c.school_id===sc.id&&c.employee_id!==empId)||(Cloud.on&&Cloud.busy.has(sc.id)))return t('This school is inactive, already completed, or being worked on by another employee.');return ''}
function vSchool(err){
  if(!needEmp())return;const e=curEmp();let selected=null,timer;
  fieldLayout(`<section id="screen-school" class="w-full max-w-2xl"><div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
  <h2 class="text-2xl font-bold text-center mb-6">${t('Select School')}</h2>
  <p class="text-gray-500 text-center mb-8">${t('Please search by school name, MOE number or identifier and select a school from the list')}</p>
  <div class="relative mb-8"><label class="block text-sm font-medium text-gray-700 mb-2">${t('Search School')}</label>
   <div class="grid grid-cols-2 gap-3 mb-3"><select id="fcity" class="${INPUT}"><option value="">${tx('كل المحافظات','All cities')}</option>${[...new Set(S.schools.filter(s=>s.status==='active').map(s=>s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')).map(c=>`<option>${esc(c)}</option>`).join('')}</select>
    <select id="fdist" class="${INPUT}"><option value="">${tx('كل الأحياء / المكاتب','All districts')}</option></select></div>
   <label class="flex items-center gap-2 mb-3 text-sm text-gray-600"><input type="checkbox" id="favail" checked class="w-4 h-4"> ${tx('المدارس المتاحة فقط (غير المحجوزة)','Available schools only (not claimed)')}</label>
   <input type="text" id="q" autocomplete="off" class="${INPUT}" placeholder="${esc(t('Search by Name, MOE or ID (2+ characters)...'))}">
   <ul id="res" class="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto" style="display:none"></ul>
   <p id="hint" class="mt-2 text-xs text-blue-500 italic" style="display:none">${t('Type at least 2 characters to search')}</p></div>
  <form id="f">
   <div id="sel" class="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl" style="display:none"></div>
   <div id="up" class="mb-8" style="display:none"><label class="block text-sm font-medium text-gray-700 mb-2">${t('School Image Source')}</label>
    <div class="flex gap-6 mb-4">
     <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="upload_method" value="camera" checked class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"><span class="text-sm text-gray-700 font-medium">${t('Take Photo')}</span></label>
     <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="upload_method" value="gallery" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"><span class="text-sm text-gray-700 font-medium">${t('Upload from Gallery')}</span></label></div>
    <div class="relative"><input type="file" name="school_image" id="school-image" accept="image/*" capture="environment" class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"></div>
    <p class="mt-2 text-xs text-gray-500">${t('Please provide one JPG or PNG image for this school')}</p><div id="cur"></div><p id="eimg" class="mt-2 text-sm text-red-600"></p></div>
   <p id="eid" class="mb-4 text-sm text-red-600">${esc(err||'')}</p>
   <div class="flex flex-col sm:flex-row gap-4"><a href="#employee-data" class="${BTN_BACK}">${t('Back')}</a><button type="submit" id="next" disabled class="${BTN_MAIN}">${t('Next')}</button></div></form>
  </div></section>`);
  const q=$('#q'),res=$('#res'),hint=$('#hint');
  /* NV12 — directory filters: city, district, available only */
  const fc=$('#fcity'),fd=$('#fdist'),fa=$('#favail');
  fc.onchange=()=>{fd.innerHTML=`<option value="">${tx('كل الأحياء / المكاتب','All districts')}</option>`+[...new Set(S.schools.filter(s=>s.status==='active'&&(!fc.value||s.city===fc.value)).map(s=>s.district).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')).map(d=>`<option>${esc(d)}</option>`).join('');search()};
  fd.onchange=()=>search();fa.onchange=()=>search();
  const search=()=>{const v=q.value.trim();const flt=fc.value||fd.value;hint.style.display=v.length>0&&v.length<2&&!flt?'':'none';if(v.length<2&&!flt){res.style.display='none';return}
    const n=v.length>=2?norm(v):'';const other=fa.checked?new Set(S.collections.filter(c=>c.employee_id!==e.id).map(c=>c.school_id)):null;const list=S.schools.filter(s=>s.status==='active'&&(!fc.value||s.city===fc.value)&&(!fd.value||s.district===fd.value)&&(!other||!(s.completed_at||other.has(s.id)||(Cloud.on&&Cloud.busy.has(s.id))))&&(!n||norm(s.moe).includes(n)||norm(s.ident).includes(n)||norm(s.name).includes(n))).slice(0,60);
    res.innerHTML=list.map((s,i)=>`<li data-i="${i}" class="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"><div class="font-bold text-gray-800">${esc(s.name)}</div><div class="text-xs text-gray-500">${t('MOE')}: ${esc(s.moe)} | ${t('ID')}: ${esc(s.ident)}</div><div class="text-xs text-gray-400">${esc(s.city)} - ${esc(s.district)}</div></li>`).join('');
    res.style.display=list.length?'':'none';res.onclick=ev=>{const li=ev.target.closest('[data-i]');if(li)select(list[+li.dataset.i])}};
  q.addEventListener('input',()=>{clearTimeout(timer);hint.style.display=q.value.length>0&&q.value.length<2?'':'none';timer=setTimeout(search,300)});
  const select=s=>{selected=s;q.value=s.moe;res.style.display='none';$('#eid').textContent=schoolBlock(s,e.id);
    $('#sel').style.display='';$('#sel').innerHTML=`<p class="text-xs text-blue-400 uppercase font-bold mb-3">${t('Selected School Details')}</p><div class="space-y-3"><div><p class="text-lg font-bold text-blue-800">${esc(s.name)}</p><p class="text-sm text-blue-600">${t('MOE')}: ${esc(s.moe)} | ${t('Identifier')}: ${esc(s.ident)}</p></div>
     <div class="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100"><div><p class="text-xs text-blue-400 font-medium">${t('City')}</p><p class="text-sm font-bold text-blue-700">${esc(s.city)}</p></div><div><p class="text-xs text-blue-400 font-medium">${t('District / Sector')}</p><p class="text-sm font-bold text-blue-700">${esc(s.district)}</p></div></div></div>`;
    const prev=(S.collections.find(c=>c.school_id===s.id&&c.employee_id===e.id&&c.school_image)||{}).school_image;selected._img=prev;
    $('#up').style.display='';$('#school-image').required=!prev;
    $('#cur').innerHTML=prev?`<div class="mt-3 flex items-center gap-3 bg-green-50 p-2 rounded-xl border border-green-100">${img(prev,'h-12 w-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity','')}<p class="text-xs text-green-600 font-medium">${tx('صورة المدرسة محفوظة — اختر صورة جديدة فقط إن أردت استبدالها','School image saved — pick a new one only to replace it')}</p></div>`:'';hydratePhotos($('#cur'));
    $('#next').disabled=false};
  $$('[name=upload_method]').forEach(r=>r.onchange=()=>{const i=$('#school-image');if(r.value==='camera')i.setAttribute('capture','environment');else i.removeAttribute('capture')});
  const s0=sess().school&&get('schools',sess().school);if(s0&&!s0.completed_at&&s0.status==='active')select(s0);
  $('#f').onsubmit=async ev=>{ev.preventDefault();if(!selected)return;$('#eimg').textContent='';
    const blk=schoolBlock(selected,e.id);if(blk){$('#eid').textContent=blk;return}
    const f=$('#school-image').files[0];if(!f&&!selected._img){$('#school-image').reportValidity();return}
    $('#next').disabled=true;let im=selected._img;
    try{if(f)im=await storePhoto(f)}catch(er){$('#eimg').textContent=er.message;$('#next').disabled=false;return}
    if(f&&selected._img){for(const c of S.collections)if(c.school_id===selected.id&&c.employee_id===e.id&&c.school_image===selected._img){c.school_image=im;c.updated_at=now()}await deletePhoto(selected._img)}
    let c=curColl();if(!c||c.submitted_at||c.employee_id!==e.id)c=S.collections.find(x=>x.employee_id===e.id&&x.school_id===selected.id&&!x.submitted_at);
    if(c&&c.school_id!==selected.id)Object.assign(c,blankAsset(),{school_id:selected.id,floor:null,room_number:null,room_name_id:null});
    if(!c){c=newCollection(e.id,selected.id,im);S.collections.push(c)}
    c.school_image=im;c.updated_at=now();save('collections');setSess({school:selected.id,coll:c.id});go('#location')};
}

/* location.blade.php */
function vLocation(){
  if(!needEmp())return;const c=curColl();if(!c){go('#school');return}const f0=takeFlash();
  const rooms=S.rooms.slice().sort((a,b)=>a.ar.localeCompare(b.ar,'ar'));
  fieldLayout(`<section id="screen-location" class="w-full max-w-2xl"><div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
  <h2 class="text-2xl font-bold text-center mb-6">${t('Location Details')}</h2><p class="text-gray-500 text-center mb-8">${t('Please select the room or area details')}</p>${statusBox(f0&&f0.t)}
  <form id="f" class="space-y-6">
   <div><label for="floor-select" class="block text-sm font-medium text-gray-700 mb-1">${t('Floor')} <span class="text-red-500">*</span></label>
    <select name="floor" id="floor-select" required class="${INPUT}"><option value="">${t('Select...')}</option>${FLOORS.map(x=>`<option value="${esc(x)}" ${c.floor===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
   <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div><label for="room-number" class="block text-sm font-medium text-gray-700 mb-1">${t('Room Number')} <span class="text-red-500">*</span></label>
     <select name="room_number" id="room-number" required class="${INPUT}"><option value="">${t('Select...')}</option>${ROOM_NUMBERS.map(x=>`<option value="${x}" ${String(c.room_number)===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div><label for="room-name" class="block text-sm font-medium text-gray-700 mb-1">${t('Room Name')} <span class="text-red-500">*</span></label>
     <select name="room_name_id" id="room-name" required class="${INPUT}"><option value="">${t('Select...')}</option>${rooms.map(r=>`<option value="${esc(r.id)}" data-name-en="${esc(r.en)}" ${c.room_name_id===r.id?'selected':''}>${esc(lang()==='ar'?r.ar:r.en)}</option>`).join('')}</select></div></div>
   <div><label for="notes" class="block text-sm font-medium text-gray-700 mb-1">${t('Additional Notes')}</label><textarea name="notes" id="notes" rows="3" class="${INPUT}" placeholder="${esc(t('Any additional notes here...'))}">${esc(c.notes||'')}</textarea></div>
   <div class="flex flex-col sm:flex-row gap-4 pt-4"><a href="#school" class="${BTN_BACK}">${t('Back')}</a><button type="submit" id="submit-btn" class="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200">${t('Save')}</button></div>
  </form></div></section>`);
  const rs=$('#room-name'),sb=$('#submit-btn');
  const upd=()=>{const o=rs.options[rs.selectedIndex];const closed=o&&o.getAttribute('data-name-en')==='Closed room';sb.innerText=closed?t('Save and Finish Room'):t('Save');
    ['bg-blue-600','hover:bg-blue-700','shadow-blue-200'].forEach(k=>sb.classList.toggle(k,!closed));['bg-green-600','hover:bg-green-700','shadow-green-200'].forEach(k=>sb.classList.toggle(k,closed))};
  rs.onchange=upd;upd();
  $('#f').onsubmit=ev=>{ev.preventDefault();const old=Object.assign({},c);const was=!!c.submitted_at;
    c.floor=$('#floor-select').value;c.room_number=$('#room-number').value;c.room_name_id=rs.value;c.notes=$('#notes').value.trim();c.updated_at=now();
    if(isClosedRoom(c.room_name_id)){Object.assign(c,{category_id:null,type_id:null,condition_id:null,quantity:0,price:null,status:null,asset_image:null});if(!c.submitted_at)c.submitted_at=now();
      if(was)logChange(c,'emp:'+c.employee_id,diff(old,c,TRACK));save('collections');setFlash(t('Room marked as closed and finished.'));go('#success');return}
    if(was)logChange(c,'emp:'+c.employee_id,diff(old,c,['floor','room_number','room_name_id','notes']));save('collections');setFlash(t('Location details saved successfully.'));go('#asset')};
}

/* asset-details.blade.php */
function vAsset(){
  if(!needEmp())return;const c=curColl();if(!c){go('#school');return}if(!c.floor||!c.room_name_id){go('#location');return}
  const e=curEmp();const f0=takeFlash();
  const FT=isCatalog()?S.types.filter(x=>x.code):S.types;const cats=S.categories.filter(k=>FT.some(x=>x.cat===k.id)).sort((a,b)=>a.ar.localeCompare(b.ar,'ar'));const types=FT.filter(x=>x.cat===c.category_id).sort((a,b)=>a.ar.localeCompare(b.ar,'ar'));const ct=get('types',c.type_id);
  const v=k=>esc(c[k]??'');const L=(id,a,b,req)=>`<label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">${a}${b?' / '+b:''}${req?' <span class="text-red-500">*</span>':''}</label>`;
  const txt=(k,lbl)=>`<div>${L('a_'+k,t(lbl))}<input type="text" id="a_${k}" value="${v(k)}" class="${INPUT}"></div>`;
  const done=S.collections.filter(x=>x.school_id===c.school_id&&x.employee_id===e.id&&x.submitted_at).sort((a,b)=>a.submitted_at<b.submitted_at?1:-1);
  fieldLayout(`<div class="flex flex-col gap-8 w-full max-w-4xl mx-auto px-4 pb-12"><section id="screen-asset-details" class="w-full"><div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
  <h2 class="text-2xl font-bold text-center mb-6">${t('Asset Details')}</h2><p class="text-gray-500 text-center mb-8">${t('Please enter the asset details')}</p>${statusBox(f0&&f0.t)}
  <form id="f" class="space-y-6">
   <div>${L('a_category_id',t('Asset Category'),t('فئة الأصل'),1)}<select id="a_category_id" required class="${INPUT}"><option value="">${t('Select...')} / ${t('قائمة')}</option>${cats.map(x=>`<option value="${esc(x.id)}" ${c.category_id===x.id?'selected':''}>${esc(x.ar)}${x.en?` (${esc(x.en)})`:''}</option>`).join('')}</select></div>
   <div data-lv>${L('a_l2',tx('المستوى الثاني','Level 2'),'',1)}<select id="a_l2" class="${INPUT}" disabled></select></div>
   <div data-lv>${L('a_l3',tx('المستوى الثالث','Level 3'),'',1)}<select id="a_l3" class="${INPUT}" disabled></select></div>
   <div>${L('a_type_id',t('Asset Type'),t('نوع الأصل'),1)}<select id="a_type_id" required class="${INPUT}" ${c.category_id?'':'disabled'}><option value="">${t('Select...')} / ${t('قائمة')}</option>${types.map(x=>`<option value="${esc(x.id)}" ${c.type_id===x.id?'selected':''}>${esc(x.ar)}${x.en?` (${esc(x.en)})`:''}</option>`).join('')}</select><div id="a_tinfo" class="mt-2 text-xs"></div></div>
   <div><label class="block text-sm font-medium text-gray-700 mb-1">${t('Asset Image Source')} <span class="text-red-500">*</span></label>
    <div class="flex gap-6 mb-3"><label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="upload_method_asset" value="camera" checked class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"><span class="text-sm text-gray-700 font-medium">${t('Take Photo')}</span></label>
     <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="upload_method_asset" value="gallery" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"><span class="text-sm text-gray-700 font-medium">${t('Upload from Gallery')}</span></label></div>
    <div class="relative"><input type="file" id="aimg" accept="image/*" capture="environment" class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" ${c.asset_image?'':'required'}></div>
    ${c.asset_image?`<div class="mt-3 flex items-center gap-3 bg-green-50 p-2 rounded-xl border border-green-100">${img(c.asset_image,'h-12 w-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity','')}<p class="text-xs text-green-600 font-medium">${t('Current image:')} ${esc(c.asset_image)}.jpg</p></div>`:''}
    <p id="e_img" class="text-red-500 text-xs mt-1"></p></div>
   <div class="pt-4 border-t border-gray-100"><div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>${L('a_quantity',t('Quantity'),t('العدد'),1)}<input type="number" id="a_quantity" required min="1" value="${esc(c.quantity??1)}" class="${INPUT}"></div>
    <div>${L('a_price',t('Current Price'),'',1)}<input type="number" step="0.01" min="0" id="a_price" required value="${v('price')}" class="${INPUT}"></div>
    <div>${L('a_condition_id',t('Asset Condition'),'',1)}<select id="a_condition_id" required class="${INPUT}"><option value="">${t('Select...')}</option>${S.conditions.map(x=>`<option value="${esc(x.id)}" ${c.condition_id===x.id?'selected':''}>${esc(x.ar)}</option>`).join('')}</select></div>
    ${txt('manufacturer','Manufacturer')}${txt('brand','Brand')}${txt('model','Model')}${txt('capacity','Capacity')}${txt('serial','Serial Number')}${txt('agency','Agency (If Available)')}${txt('warranty','Warranty (If Available)')}
    <div>${L('a_install_date',t('Installation Date'))}<input type="date" id="a_install_date" value="${v('install_date')}" class="${INPUT}"></div>
    ${txt('asad_country','ASAD Location Country')}
    <div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-2">${t('Asset Location on Map')} / ${t('موقع الأصل على الخريطة')}</label><div id="location-map" class="mb-2"></div>
     <div class="flex justify-between items-center px-1"><p class="text-xs text-gray-500">${t('Latitude:')} <span id="lat-display">${c.lat??'--'}</span>, ${t('Longitude:')} <span id="lng-display">${c.lng??'--'}</span></p>
      <button type="button" id="geo" class="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>${t('Detect My Location')}</button></div></div>
    <div><label class="block text-sm font-medium text-gray-700 mb-2">${t('Original Parent or Child')} <span class="text-red-500">*</span></label><div class="flex gap-6">
     ${['Parent','Child'].map(k=>`<label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="parent_child" value="${k}" ${c.parent_child===k?'checked':''} required class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"><span class="text-sm text-gray-700">${t(k)}</span></label>`).join('')}</div></div>
    <div class="md:col-span-2">${L('a_tag',t('ASAD Tag Number'))}<input type="text" id="a_tag" value="${v('tag')}" class="${INPUT}"></div>
    <div class="md:col-span-2">${L('a_notes',t('Additional Notes'))}<textarea id="a_notes" rows="2" class="${INPUT}" placeholder="${esc(t('Any additional notes here...'))}">${v('notes')}</textarea></div>
   </div></div>
   <p id="ferr" class="text-red-500 text-sm font-bold"></p>
   <div class="flex flex-col sm:flex-row gap-4 pt-4"><a href="#location" class="${BTN_BACK}">${t('Back')}</a><button type="submit" id="sb" class="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200">${t('Save & Continue')}</button></div>
  </form></div></section>
  ${done.length?`<section id="screen-school-assets" class="w-full"><div class="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100"><h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><i class="bi bi-list-check text-blue-600"></i>${t('Assets Already Collected for this School')}</h3>
   <div class="overflow-x-auto border rounded-xl"><table class="w-full text-left text-sm"><thead class="bg-gray-50 text-gray-600 uppercase text-xs"><tr><th class="px-4 py-3">${t('Image')}</th><th class="px-4 py-3">${t('Location')}</th><th class="px-4 py-3">${t('Asset')}</th><th class="px-4 py-3">${t('Qty')}</th><th class="px-4 py-3 text-right">${t('Submitted')}</th></tr></thead><tbody class="divide-y divide-gray-100">
   ${done.map(a=>`<tr class="hover:bg-gray-50 transition-colors"><td class="px-4 py-3">${img(a.asset_image,'h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100','<div class="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400"><i class="bi bi-image text-xs"></i></div>')}</td>
    <td class="px-4 py-3"><div class="font-bold text-gray-900">${esc(a.floor||'')}</div><div class="text-xs text-gray-500">${esc(roomName(a)??'N/A')} (${esc(a.room_number||'')})</div></td>
    <td class="px-4 py-3"><div class="text-gray-900 font-medium">${esc((get('types',a.type_id)||{}).ar||'')}</div><div class="text-xs text-gray-500">${esc((get('categories',a.category_id)||{}).ar||'')}</div><div class="text-xs text-blue-600 font-bold mt-1">${esc((get('conditions',a.condition_id)||{}).ar||'')}</div></td>
    <td class="px-4 py-3"><span class="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">${num(a.quantity)}</span></td><td class="px-4 py-3 text-right text-xs text-gray-500">${ymd(a.submitted_at)} ${hiA(a.submitted_at)}</td></tr>`).join('')}
   </tbody></table></div></div></section>`:''}</div>`);
  const cat=$('#a_category_id'),typ=$('#a_type_id');
  /* NV14 — level 1 → level 2 → level 3 → asset (4-level catalog); a category without levels lists its assets directly */
  const l2=$('#a_l2'),l3=$('#a_l3');const PH=`<option value="">${t('Select...')} / ${t('قائمة')}</option>`;const uniq=a=>[...new Set(a)].filter(Boolean).sort((x,y)=>x.localeCompare(y,'ar'));
  const opts=a=>PH+a.map(x=>`<option>${esc(x)}</option>`).join('');
  const info=()=>{const x=get('types',typ.value);$('#a_tinfo').innerHTML=x&&x.code?`<span class="inline-block bg-gray-100 text-gray-700 rounded-lg px-2 py-1 font-mono" dir="ltr">${esc(x.code)}</span> ${x.critical?'<span class="inline-block bg-red-100 text-red-700 font-bold rounded-lg px-2 py-1">⚠️ أصل حرج</span>':'<span class="inline-block bg-green-50 text-green-700 rounded-lg px-2 py-1">غير حرج</span>'}`:''};
  const fillT=list=>{typ.innerHTML=PH+list.sort((a,b)=>a.ar.localeCompare(b.ar,'ar')).map(x=>`<option value="${esc(x.id)}">${esc(x.ar)}${x.en?` (${esc(x.en)})`:''}</option>`).join('');typ.disabled=!list.length;info()};
  const inCat=()=>FT.filter(x=>x.cat===cat.value);const lv=()=>inCat().some(x=>x.l2);
  const showLv=()=>{$$('[data-lv]').forEach(d=>d.style.display=cat.value&&lv()?'':'none')};
  cat.onchange=()=>{showLv();if(lv()){l2.innerHTML=opts(uniq(inCat().map(x=>x.l2)));l2.disabled=false;l3.innerHTML=PH;l3.disabled=true;fillT([]);typ.disabled=true}else fillT(inCat())};
  l2.onchange=()=>{l3.innerHTML=opts(uniq(inCat().filter(x=>x.l2===l2.value).map(x=>x.l3)));l3.disabled=!l2.value;fillT([]);typ.disabled=true};
  l3.onchange=()=>fillT(inCat().filter(x=>x.l2===l2.value&&x.l3===l3.value));
  typ.addEventListener('change',info);
  /* an existing record opens with its levels selected */
  showLv();if(ct&&ct.l2&&lv()){l2.innerHTML=opts(uniq(inCat().map(x=>x.l2)));l2.value=ct.l2;l2.disabled=false;l3.innerHTML=opts(uniq(inCat().filter(x=>x.l2===ct.l2).map(x=>x.l3)));l3.value=ct.l3;l3.disabled=false;fillT(inCat().filter(x=>x.l2===ct.l2&&x.l3===ct.l3));typ.value=ct.id;info()}
  else if(c.category_id&&lv()){cat.onchange()}
  $$('[name=upload_method_asset]').forEach(r=>r.onchange=()=>{const i=$('#aimg');if(r.value==='camera')i.setAttribute('capture','environment');else i.removeAttribute('capture')});
  // map (Leaflet, same behaviour as the original: draggable marker, click to move, auto-detect when empty)
  let lat=c.lat,lng=c.lng,map,marker;const has=lat!=null&&lng!=null;
  const setLL=(a,b,move)=>{lat=+(+a).toFixed(8);lng=+(+b).toFixed(8);$('#lat-display').innerText=lat.toFixed(8);$('#lng-display').innerText=lng.toFixed(8);if(marker){marker.setLatLng([lat,lng]);if(move)map.setView([lat,lng],16)}};
  const detect=()=>{if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>setLL(p.coords.latitude,p.coords.longitude,true),er=>console.warn('Geolocation error: '+er.message))};
  $('#geo').onclick=detect;
  needLeaflet().then(()=>{if(!document.body.contains($('#location-map')))return;const p=has?[+lat,+lng]:[24.7136,46.6753];map=L.map('location-map').setView(p,has?16:13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    marker=L.marker(p,{draggable:true}).addTo(map);marker.on('dragend',ev=>{const q=ev.target.getLatLng();setLL(q.lat,q.lng)});map.on('click',ev=>{marker.setLatLng(ev.latlng);setLL(ev.latlng.lat,ev.latlng.lng)});if(!has)detect()})
   .catch(()=>{leafP=null;$('#location-map').outerHTML=`<p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">${tx('تعذر تحميل الخريطة (لا يوجد اتصال). استخدم «تحديد موقعي».','Map could not load (offline). Use "Detect My Location".')}</p>`;if(!has)detect()});
  $('#f').onsubmit=async ev=>{ev.preventDefault();const form=$('#f');if(!form.reportValidity())return;$('#sb').disabled=true;
    try{const g=k=>$('#a_'+k).value.trim();const vals={category_id:g('category_id'),type_id:g('type_id'),condition_id:g('condition_id'),quantity:Math.round(num(g('quantity'))),price:num(g('price')),
        manufacturer:g('manufacturer'),brand:g('brand'),model:g('model'),capacity:g('capacity'),serial:g('serial'),agency:g('agency'),warranty:g('warranty'),install_date:g('install_date'),asad_country:g('asad_country'),
        lat:lat??null,lng:lng??null,parent_child:($('[name=parent_child]:checked')||{}).value,tag:g('tag'),notes:g('notes')};
      const fl=$('#aimg').files[0];let oldImg=null;if(fl){oldImg=c.asset_image;vals.asset_image=await storePhoto(fl)}
      const old=Object.assign({},c);const was=!!c.submitted_at;Object.assign(c,vals,{updated_at:now()});if(!c.submitted_at)c.submitted_at=now();
      if(was)logChange(c,'emp:'+e.id,diff(old,c,TRACK));save('collections');if(oldImg)deletePhoto(oldImg);
      setFlash(t('Asset details saved successfully.'));go('#success')}catch(er){$('#ferr').textContent=er.message;$('#sb').disabled=false}};
}

/* success.blade.php */
function vSuccess(){
  if(!needEmp())return;const s=sess();const sc=s.school&&get('schools',s.school);if(!sc){go('#employee-data');return}const e=curEmp();const f0=takeFlash();
  const list=S.collections.filter(x=>x.school_id===sc.id&&x.submitted_at).sort((a,b)=>a.submitted_at<b.submitted_at?1:-1);
  const th=k=>`<th class="px-4 py-3 font-bold text-gray-600 text-left">${t(k)}</th>`;
  fieldLayout(`<section id="screen-success" class="w-full max-w-2xl"><div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
  <div class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg></div>
  ${statusBox(f0&&f0.t)}<h2 class="text-2xl font-bold text-gray-800 mb-2">${t('Asset Saved!')}</h2><p class="text-gray-500 mb-8">${t('The asset has been successfully recorded in the system.')}</p>
  ${list.length?`<div class="mb-8 text-left"><div class="overflow-x-auto rounded-xl border border-gray-200"><table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-200">${th('Image')}${th('Floor')}${th('Room')}${th('Category')}${th('Type')}${th('Brand')}${th('Tag')}<th class="px-4 py-3 font-bold text-gray-600 text-center">${t('Action')}</th></tr></thead><tbody>
   ${list.map(a=>`<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="px-4 py-3">${img(a.asset_image,'h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100','<div class="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400"><i class="bi bi-image text-xs"></i></div>')}</td>
    <td class="px-4 py-3">${esc(a.floor||'')}</td><td class="px-4 py-3">${esc(roomName(a)??'N/A')} (${esc(a.room_number||'')})</td><td class="px-4 py-3">${esc((get('categories',a.category_id)||{}).ar||'--')}</td><td class="px-4 py-3">${esc((get('types',a.type_id)||{}).ar||'--')}</td><td class="px-4 py-3">${esc(a.brand||'--')}</td><td class="px-4 py-3">${esc(a.tag||'--')}</td>
    <td class="px-4 py-3 text-center">${a.employee_id===e.id?`<a href="javascript:void 0" data-ed="${esc(a.id)}" class="text-blue-600 hover:text-blue-800 font-bold">${t('Edit')}</a>`:''}</td></tr>`).join('')}</tbody></table></div></div>`:''}
  ${sc.completed_at?'':`<div class="space-y-4">
   <a href="javascript:void 0" id="same" class="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-200">${t('Add Another Asset in Same Room')}</a>
   <a href="javascript:void 0" id="other" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200">${t('Add Another Asset (New Room)')}</a>
   <a href="javascript:void 0" id="fin" class="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all">${t('Complete and Finish Job')}</a></div>`}
  </div></section>`);
  $$('[data-ed]').forEach(a=>a.onclick=()=>{setSess({coll:a.dataset.ed});go('#location')});
  if(sc.completed_at)return;
  const add=same=>{const base=curColl()||list.find(x=>x.employee_id===e.id)||{};let d=S.collections.find(x=>x.employee_id===e.id&&x.school_id===sc.id&&!x.submitted_at);
    const loc=same&&base.floor?{floor:base.floor,room_number:base.room_number,room_name_id:base.room_name_id}:{floor:null,room_number:null,room_name_id:null};
    if(d)Object.assign(d,blankAsset(),loc,{updated_at:now()});else{d=newCollection(e.id,sc.id,base.school_image||(list.find(x=>x.employee_id===e.id&&x.school_image)||{}).school_image||null,loc);S.collections.push(d)}
    save('collections');setSess({coll:d.id});if(loc.floor){setFlash(t('New asset created in the same room.'));go('#asset')}else go('#location')};
  $('#same').onclick=()=>add(true);$('#other').onclick=()=>add(false);
  $('#fin').onclick=()=>{if(!confirm(tx('إنهاء جرد هذه المدرسة؟ لن يمكن إضافة أصول لها بعد ذلك.','Finish this school? No more assets can be added after that.')))return;
    S.collections=S.collections.filter(x=>!(x.school_id===sc.id&&x.employee_id===e.id&&!x.submitted_at));
    Object.assign(sc,{completed_at:now(),completed_by:e.id,status:'inactive'});save('schools');save('collections');setSess({school:null,coll:null});if(Cloud.on)queueSchoolMail(sc.id,e.id);go('#job-completed')};
}

/* job-completed.blade.php */
function vJobDone(){
  fieldLayout(`<section id="screen-job-completed" class="w-full max-w-2xl"><div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
  <div class="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
  <h2 class="text-2xl font-bold text-gray-800 mb-2">${t('Job Completed!')}</h2><p class="text-gray-500 mb-8">${t('Thank you! The collection job for this school has been officially closed.')}</p>
  <a href="javascript:void 0" id="out" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200">${t('Finish and Log Out')}</a></div></section>`);
  $('#out').onclick=async()=>{if(!await cloudLogoutOk())return;clearSess();go('#login')};
}

/* history.blade.php */
function vHistory(){
  if(!needEmp())return;const e=curEmp();
  const list=S.collections.filter(x=>x.employee_id===e.id&&x.submitted_at).sort((a,b)=>a.submitted_at<b.submitted_at?1:-1);
  fieldLayout(`<section id="screen-history" class="w-full max-w-4xl px-4"><div class="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100">
  <div class="flex flex-col md:flex-row justify-between items-md-center mb-8 gap-4"><div><h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2"><i class="bi bi-clock-history text-blue-600"></i>${t('Collection History')}</h2><p class="text-gray-500 text-sm mt-1">${t('Review and edit your past submissions')}</p></div>
   <a href="#employee-data" class="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"><i class="bi bi-arrow-left"></i>${t('Back to Profile')}</a></div>
  ${list.length?`<div class="overflow-hidden border border-gray-100 rounded-2xl"><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-50 text-gray-600 uppercase text-xs"><tr><th class="px-6 py-4">${t('Image')}</th><th class="px-6 py-4">${t('School & Location')}</th><th class="px-6 py-4">${t('Asset Details')}</th><th class="px-6 py-4">${t('Submitted')}</th><th class="px-6 py-4 text-right">${t('Action')}</th></tr></thead><tbody class="divide-y divide-gray-100">
   ${list.map(a=>`<tr class="hover:bg-blue-50/30 transition-colors"><td class="px-6 py-4">${img(a.asset_image,'h-12 w-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100','<div class="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><i class="bi bi-image"></i></div>')}</td>
    <td class="px-6 py-4"><div class="font-bold text-gray-900">${esc((get('schools',a.school_id)||{}).name||'')}</div><div class="text-xs text-gray-500 flex items-center gap-1 mt-1"><i class="bi bi-geo-alt"></i>${esc(a.floor||'')} • ${esc(roomName(a)??'N/A')}</div></td>
    <td class="px-6 py-4"><div class="text-gray-900 font-medium">${esc((get('types',a.type_id)||{}).ar||'')}</div><div class="text-xs text-gray-500">${esc((get('categories',a.category_id)||{}).ar||'')}</div></td>
    <td class="px-6 py-4"><div class="text-gray-700 text-xs">${ymd(a.submitted_at)}</div><div class="text-gray-400 text-xs">${hiA(a.submitted_at)}</div></td>
    <td class="px-6 py-4 text-right"><a href="javascript:void 0" data-ed="${esc(a.id)}" class="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg font-bold transition-all text-xs"><i class="bi bi-pencil-square"></i>${t('Edit')}</a></td></tr>`).join('')}
   </tbody></table></div></div>`:`<div class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><div class="text-gray-400 mb-3"><i class="bi bi-inbox text-5xl"></i></div><p class="text-gray-600 font-medium">${t('No history found.')}</p><p class="text-gray-400 text-sm">${t('Start a new collection to see it here.')}</p></div>`}
  <div class="mt-8 pt-6 border-t border-gray-100 flex justify-center"><a href="#school" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl transition-all shadow-lg shadow-blue-200">${t('Start New Collection')}</a></div>
  </div></section>`);
  $$('[data-ed]').forEach(b=>b.onclick=()=>{const c=S.collections.find(x=>x.id===b.dataset.ed);if(!c)return;setSess({school:c.school_id,coll:c.id});setFlash(t('You are now editing an existing collection.'));go('#location')});
}
</script>
