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
    ${curEmp()?`<a href="javascript:void 0" id="scanQR" class="nv-scanbtn" title="${tx('مسح ملصق أصل','Scan an asset label')}">📷 ${tx('مسح','Scan')}</a>`:''}<a href="javascript:void 0" id="langSw" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-bold">${ar?'English':'العربية'}</a></header>
  ${Cloud.on&&Cloud.role==='tech'&&curEmp()?'<div id="nvPend" class="nv-pend" hidden></div>':''}${Cloud.on&&Cloud.role==='tech'&&Cloud.sub&&Cloud.sub.ok===false?`<div class="nv-pend err" data-sub="over">🔒 ${tx('انتهى الاشتراك — التطبيق للقراءة فقط. لا يمكن جرد أو تعديل أصول حتى التجديد.','The subscription has ended — read only. No new or edited assets until it is renewed.')}</div>`:''}<main class="flex-grow flex items-center justify-center p-4">${inner}</main>
  <div id="lb" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" x-cloak style="display:none">
    <button type="button" id="lbX" class="absolute top-4 right-4 text-white hover:text-gray-300 z-10"><svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
    <div class="relative max-w-full max-h-full overflow-auto flex items-center justify-center"><img id="lbImg" class="max-w-full max-h-[90vh] object-contain cursor-zoom-in rounded-lg shadow-2xl" alt=""></div></div>
  <footer class="py-6 text-center text-gray-400 text-sm">&copy; ${new Date().getFullYear()} ${esc(appName())} • RakizoraFM — ${tx('إدارة المرافق والأصول الذكية','Smart Facility &amp; Asset Management')} <a href="#admin" class="text-gray-300 hover:text-gray-500">Admin</a> <span data-nv-sync class="text-gray-400"></span></footer>`;
  if(window.Cloud)Cloud.badge();
  $('#langSw').onclick=()=>{lsSet('nv_lang',ar?'en':'ar');route()};if($('#scanQR'))$('#scanQR').onclick=()=>scanQR();
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
  if(!needEmp())return;const e=curEmp();const ret=S.collections.filter(x=>x.employee_id===e.id&&x.review_status==='returned');
  fieldLayout(`<section id="screen-data" class="w-full max-w-2xl"><div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
  <div class="flex justify-between items-center mb-8"><h2 class="text-2xl font-bold text-gray-800">${t('Employee Data')}</h2><span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">${t('Active')}</span></div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
   <div class="space-y-1"><label class="text-sm text-gray-500">${t('Full Name')}</label><p class="text-lg font-bold text-gray-900 border-b pb-2">${esc(e.name)}</p></div>
   <div class="space-y-1"><label class="text-sm text-gray-500">${t('Employee ID')}</label><p class="text-lg font-bold text-gray-900 border-b pb-2">${esc(e.number)}</p></div></div>
  ${(f=>f?`<div class="nv-ret mb-8" id="empMsg"><b>${esc(f.t)}</b></div>`:'')(takeFlash())}${ret.length?`<div class="nv-ret mb-8" id="retBox"><b>↩️ ${tx('أصول أعادتها الإدارة للتعديل','Assets returned by the management')} (${ret.length})</b>${ret.map(x=>`<a href="javascript:void 0" data-ret="${esc(x.id)}"><span>${esc((get('types',x.type_id)||{}).ar||'')} — ${esc((get('schools',x.school_id)||{}).name||'')} · ${esc(x.floor||'')} ${esc(roomName(x)||'')}</span><small>${esc(x.review_note||'')}</small></a>`).join('')}</div>`:''}
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
  $$('[data-ret]').forEach(b=>b.onclick=()=>{const c=S.collections.find(x=>x.id===b.dataset.ret);if(!c)return;setSess({school:c.school_id,coll:c.id});setFlash(t('You are now editing an existing collection.'));go('#location')});
}

/* school.blade.php */
function schoolBlock(sc,empId){if(sc.status==='inactive'||sc.completed_at||S.collections.some(c=>c.school_id===sc.id&&c.employee_id!==empId)||(Cloud.on&&Cloud.busy.has(sc.id)))return t('This school is inactive, already completed, or being worked on by another employee.');return ''}
function vSchool(err){
  if(!needEmp())return;if(Cloud.on&&(!can('collect')||(Cloud.sub&&Cloud.sub.ok===false))){setFlash(Cloud.sub&&Cloud.sub.ok===false?tx('انتهى الاشتراك — لا يمكن بدء جرد جديد حتى التجديد.','The subscription has ended — no new collection until it is renewed.'):tx('ليست لديك صلاحية جرد أصول جديدة. راجع مدير المشروع.','You are not allowed to collect new assets. Ask the project manager.'));return go('#employee-data')}const e=curEmp();let selected=null,timer;
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
    if(isClosedRoom(c.room_name_id)){Object.assign(c,{category_id:null,type_id:null,condition_id:null,quantity:0,price:null,status:null,asset_image:null,asset_image2:null});if(!c.submitted_at)c.submitted_at=now();
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
  <h2 class="text-2xl font-bold text-center mb-6">${t('Asset Details')}</h2><p class="text-gray-500 text-center mb-8">${t('Please enter the asset details')}</p>${statusBox(f0&&f0.t)}${tplCard(c)}${c.review_status==='returned'?`<div class="nv-ret mb-6"><b>↩️ ${tx('أعادت الإدارة هذا الأصل للتعديل','The management returned this asset')}</b><small>${esc(c.review_note||'')}</small><small>${tx('صحّح المطلوب وأعد الحفظ؛ يعود للمراجعة.','Fix it and save again; it goes back to review.')}</small></div>`:''}
  <form id="f" class="space-y-6">
   <div>${L('a_category_id',t('Asset Category'),t('فئة الأصل'),1)}<select id="a_category_id" required class="${INPUT}"><option value="">${t('Select...')} / ${t('قائمة')}</option>${cats.map(x=>`<option value="${esc(x.id)}" ${c.category_id===x.id?'selected':''}>${esc(x.ar)}${x.en?` (${esc(x.en)})`:''}</option>`).join('')}</select></div>
   <div data-lv>${L('a_l2',tx('المستوى الثاني','Level 2'),'',1)}<select id="a_l2" class="${INPUT}" disabled></select></div>
   <div data-lv>${L('a_l3',tx('المستوى الثالث','Level 3'),'',1)}<select id="a_l3" class="${INPUT}" disabled></select></div>
   <div>${L('a_type_id',t('Asset Type'),t('نوع الأصل'),1)}<select id="a_type_id" required class="${INPUT}" ${c.category_id?'':'disabled'}><option value="">${t('Select...')} / ${t('قائمة')}</option>${types.map(x=>`<option value="${esc(x.id)}" ${c.type_id===x.id?'selected':''}>${esc(x.ar)}${x.en?` (${esc(x.en)})`:''}</option>`).join('')}</select><div id="a_tinfo" class="mt-2 text-xs"></div></div>
   <div><label class="block text-sm font-medium text-gray-700 mb-1">${tx('صور الأصل من موقعه','Asset photos on site')} <span class="text-red-500">*</span></label>
    <p class="text-xs text-gray-500 mb-3">${tx('صورتان إلزاميتان للأصل من الكاميرا أو المعرض، ويمكن إضافة صور أخرى بعلامة +. يُطبع على كل صورة الوقت والمدرسة والغرفة والموقع.','Two required photos from the camera or the gallery; add more with +. Time, school, room and location are printed on each photo.')}</p>
    <div class="nv-shots">${SHOTS.map((x,n)=>shotTile(n,c[x.k])).join('')}</div>
    <div class="${can('extra')?'':'hidden'}"><div class="text-sm font-medium text-gray-700 mt-4 mb-2">${tx('صور إضافية (اختيارية)','Extra photos (optional)')} <span class="text-xs text-gray-400" id="nvXn"></span></div><div class="nv-shots nv-extra" id="nvExtra"></div></div>
    <button type="button" id="ocr" class="nv-ocr">🔍 ${tx('قراءة لوحة البيانات تلقائياً (الرقم التسلسلي، الموديل، السعة، الماركة)','Read the nameplate (serial, model, capacity, brand)')}</button><p id="ocrMsg" class="nv-ocr-msg"></p>
    <p id="e_img" class="text-red-500 text-xs mt-1"></p></div>
   <div class="pt-4 border-t border-gray-100"><div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>${L('a_quantity',t('Quantity'),t('العدد'),1)}<input type="number" id="a_quantity" required min="1" value="${esc(c.quantity??1)}" class="${INPUT}"></div>
    <div>${L('a_price',tx('السعر التقريبي (اختياري)','Approximate price (optional)'))}<input type="number" step="0.01" min="0" id="a_price" value="${v('price')}" class="${INPUT}"></div>
    <div>${L('a_condition_id',t('Asset Condition'),'',1)}<select id="a_condition_id" required class="${INPUT}"><option value="">${t('Select...')}</option>${S.conditions.map(x=>`<option value="${esc(x.id)}" ${c.condition_id===x.id?'selected':''}>${esc(x.ar)}</option>`).join('')}</select></div>
    ${txt('manufacturer','Manufacturer')}${txt('brand','Brand')}${txt('model','Model')}${txt('capacity','Capacity')}${txt('serial','Serial Number')}${txt('agency','Agency (If Available)')}${txt('warranty','Warranty (If Available)')}
    <div>${L('a_install_date',tx('تاريخ التركيب (إن وجد)','Installation date (if available)'))}<input type="date" id="a_install_date" value="${v('install_date')}" class="${INPUT}"></div>
    <div class="md:col-span-2">${L('a_parent_child',t('Original Parent or Child'),'',1)}<select id="a_parent_child" required class="${INPUT}"><option value="">${t('Select...')}</option>${[['Parent',tx('أب (أصل رئيسي) — Parent','Parent')],['Child',tx('ابن (أصل فرعي) — Child','Child')]].map(([k,l])=>`<option value="${k}" ${c.parent_child===k?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-2">${t('Asset Location on Map')} / ${t('موقع الأصل على الخريطة')}</label><div id="location-map" class="mb-2"></div>
     <div class="flex justify-between items-center px-1"><p class="text-xs text-gray-500">${t('Latitude:')} <span id="lat-display">${c.lat??'--'}</span>, ${t('Longitude:')} <span id="lng-display">${c.lng??'--'}</span></p>
      <button type="button" id="geo" class="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>${t('Detect My Location')}</button></div></div>
    <div class="md:col-span-2"><span class="block text-sm font-medium text-gray-700 mb-1">Tag Number</span><div id="a_tagno" class="nv-tagno">${c.no?`<b>${esc(assetLabel(c))}</b><small>${tx('رقم الأصل الثابت في النظام — ابحث به لعرض بيانات الأصل','The asset’s fixed number in the system — search by it to open the asset')}</small>`:`<small>${tx('يُعطى تلقائياً من النظام بعد حفظ الأصل ورفعه','Given automatically by the system after the asset is saved and uploaded')}</small>`}</div></div>
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
  /* NV25 / NV27 — two required photos + extra photos, from the camera or the gallery */
  const pend=[null,null],pendX=[],exKeep=(c.extra_images||[]).slice(),exDrop=[],ref=schoolRef(c.school_id,c),G=geoCfg();
  const locate=(P,done)=>{if(navigator.geolocation)navigator.geolocation.getCurrentPosition(q=>{P.pos=[q.coords.latitude,q.coords.longitude];done&&done()},()=>{P.geoErr=1;done&&done()},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})};
  const geoShow=n=>{const P=pend[n],el=$(`[data-shot="${n}"] [data-geo]`);if(!el)return;el.className='nv-geo';if(!P){el.textContent='';return}
    if(!P.pos){el.textContent=P.geoErr?tx('📍 تعذر تحديد الموقع — فعّل GPS','📍 Location unavailable — turn on GPS'):tx('📍 جارٍ تحديد الموقع…','📍 Locating…');return}
    if(!ref){el.textContent=tx('📍 تم تسجيل الموقع','📍 Location recorded');return}const d=geoDist(P.pos,ref.p);P.dist=d;el.textContent=(d>G.m?'⚠️ ':'📍 ')+fmtDist(d)+' '+tx('من المدرسة','from the school');if(d>G.m)el.className='nv-geo far'};$$('[data-shot] input').forEach(inp=>inp.onchange=()=>{const n=+inp.dataset.n,f=inp.files[0],tile=inp.closest('.nv-shot');$('#e_img').textContent='';if(!f)return;
    if(!/^image\//.test(f.type||'image/')){inp.value='';tile.classList.add('bad');tile.querySelector('small').textContent=tx('الملف ليس صورة','Not an image');return}
    pend[n]={f,at:f.lastModified};const P=pend[n];geoShow(n);locate(P,()=>pend[n]===P&&geoShow(n));tile.classList.remove('bad');tile.classList.add('ok');tile.querySelector('.nv-shot-pv').innerHTML=`<img src="${URL.createObjectURL(f)}" alt="">`;tile.querySelector('small').textContent=tx('✓ تمت الإضافة — يمكنك تغييرها','✓ Added — you can change it');inp.value=''});
  /* extra photos: kept ones, new ones, and the + tile */
  const XMAX=10;const drawX=()=>{const box=$('#nvExtra');const n=exKeep.length+pendX.length;$('#nvXn').textContent=n?`(${n} / ${XMAX})`:'';
    box.innerHTML=exKeep.map((k,i)=>`<div class="nv-shot ok"><div class="nv-shot-pv">${img(k,'','')}</div><button type="button" class="nv-x" data-xk="${i}" aria-label="${tx('حذف','Remove')}">✕</button></div>`).join('')
     +pendX.map((P,i)=>`<div class="nv-shot ok"><div class="nv-shot-pv"><img src="${P.u}" alt=""></div><button type="button" class="nv-x" data-xp="${i}" aria-label="${tx('حذف','Remove')}">✕</button></div>`).join('')
     +(n<XMAX?`<div class="nv-shot nv-plus"><div class="nv-shot-pv">＋</div><b>${tx('إضافة صورة','Add a photo')}</b><div class="nv-src"><label>📷 ${tx('كاميرا','Camera')}<input type="file" id="aimgX" accept="image/*" capture="environment"></label>${can('gallery')?`<label>🖼️ ${tx('المعرض','Gallery')}<input type="file" id="aimgXG" accept="image/*" multiple></label>`:''}</div></div>`:'');
    hydratePhotos(box);
    $$('[data-xk]',box).forEach(b=>b.onclick=()=>{exDrop.push(...exKeep.splice(+b.dataset.xk,1));drawX()});$$('[data-xp]',box).forEach(b=>b.onclick=()=>{pendX.splice(+b.dataset.xp,1);drawX()});
    $$('#aimgX,#aimgXG').forEach(inp=>inp.onchange=()=>{for(const f of [...inp.files].filter(f=>/^image\//.test(f.type||'image/')).slice(0,XMAX-exKeep.length-pendX.length)){const P={f,at:f.lastModified,u:URL.createObjectURL(f)};pendX.push(P);locate(P)}drawX()})};
  drawX();
  $('#ocr').onclick=async()=>{const b=$('#ocr'),m=$('#ocrMsg');let src=pend[1]&&pend[1].f;
    if(!src&&c.asset_image2)src=await IDB.get('photos',c.asset_image2).catch(()=>null)||(Cloud.on?await Cloud.fetchPhoto(c.asset_image2):null);
    if(!src){m.textContent=tx('التقط صورة لوحة البيانات (الصورة 2) أولاً.','Take the nameplate photo (photo 2) first.');return}
    b.disabled=true;m.textContent=tx('جارٍ تحميل القارئ… (أول مرة تحتاج إنترنت)','Loading the reader… (needs internet the first time)');
    try{const o=parsePlate(await ocrPlate(src,p=>{m.textContent=tx('جارٍ قراءة اللوحة… ','Reading the plate… ')+p+'%'}));if(o.brand&&!o.manufacturer)o.manufacturer=o.brand;
      const NM={serial:tx('الرقم التسلسلي','Serial'),model:tx('الموديل','Model'),capacity:tx('السعة','Capacity'),brand:tx('الماركة','Brand'),manufacturer:tx('الشركة المصنعة','Manufacturer')};const done=[];
      for(const k of Object.keys(NM)){const el=$('#a_'+k);if(o[k]&&el&&!el.value.trim()){el.value=o[k];el.classList.add('nv-filled');done.push(NM[k]+': '+o[k])}}
      m.textContent=done.length?tx('تمت التعبئة — ','Filled — ')+done.join(' · ')+tx(' — راجعها قبل الحفظ.',' — check before saving.'):Object.keys(o).length?tx('الحقول معبأة مسبقاً. ما قُرئ: ','Fields already filled. Read: ')+Object.values(o).join(' · '):tx('لم تُقرأ بيانات واضحة. صوّر اللوحة أقرب وبإضاءة جيدة، ثم أعد المحاولة.','Nothing clear was read. Take the plate closer and well lit, then retry.')}
    catch(e){console.warn('ocr',e);m.textContent=tx('تعذر تشغيل القارئ — تحقق من الاتصال وأعد المحاولة.','The reader could not start — check the connection and retry.')}finally{b.disabled=false}};
  // map (Leaflet, same behaviour as the original: draggable marker, click to move, auto-detect when empty)
  let lat=c.lat,lng=c.lng,map,marker;const has=lat!=null&&lng!=null;
  const setLL=(a,b,move)=>{lat=+(+a).toFixed(8);lng=+(+b).toFixed(8);$('#lat-display').innerText=lat.toFixed(8);$('#lng-display').innerText=lng.toFixed(8);if(marker){marker.setLatLng([lat,lng]);if(move)map.setView([lat,lng],16)}};
  const detect=()=>{if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>setLL(p.coords.latitude,p.coords.longitude,true),er=>console.warn('Geolocation error: '+er.message))};
  $('#geo').onclick=detect;
  needLeaflet().then(()=>{if(!document.body.contains($('#location-map')))return;const p=has?[+lat,+lng]:[24.7136,46.6753];map=window.L.map('location-map').setView(p,has?16:13);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    marker=window.L.marker(p,{draggable:true}).addTo(map);marker.on('dragend',ev=>{const q=ev.target.getLatLng();setLL(q.lat,q.lng)});map.on('click',ev=>{marker.setLatLng(ev.latlng);setLL(ev.latlng.lat,ev.latlng.lng)});if(!has)detect()})
   .catch(()=>{leafP=null;if($('#location-map'))$('#location-map').outerHTML=`<p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">${tx('تعذر تحميل الخريطة (لا يوجد اتصال). استخدم «تحديد موقعي».','Map could not load (offline). Use "Detect My Location".')}</p>`;if(!has)detect()});
  $('#f').onsubmit=async ev=>{ev.preventDefault();const form=$('#f');if(!form.reportValidity())return;$('#sb').disabled=true;
    try{const g=k=>$('#a_'+k).value.trim();const vals={category_id:g('category_id'),type_id:g('type_id'),condition_id:g('condition_id'),quantity:Math.round(num(g('quantity'))),price:g('price')===''?null:num(g('price')),
        manufacturer:g('manufacturer'),brand:g('brand'),model:g('model'),capacity:g('capacity'),serial:g('serial'),agency:g('agency'),warranty:g('warranty'),install_date:g('install_date'),
        lat:lat??null,lng:lng??null,parent_child:g('parent_child')||null,notes:g('notes')};
      const miss=SHOTS.map((x,n)=>!pend[n]&&!c[x.k]?x.t():null).filter(Boolean);if(miss.length){$('#e_img').textContent=tx('التقط الصور المطلوبة: ','Take the required photos: ')+miss.join('، ');$('#sb').disabled=false;$('.nv-shots').scrollIntoView({block:'center'});return}
      if(!await dupOk(c,vals)){$('#sb').disabled=false;return}
      const ds=pend.filter(Boolean).concat(pendX).map(P=>P.pos&&ref?geoDist(P.pos,ref.p):ref&&lat!=null?geoDist([+lat,+lng],ref.p):null).filter(d=>d!=null);const far=ds.length?Math.max(...ds):null;
      if(far!=null&&far>G.m){if(G.block){$('#e_img').textContent=tx(`أنت على بعد ${fmtDist(far)} من موقع المدرسة (المسموح ${fmtDist(G.m)}). صوّر الأصل من داخل المدرسة.`,`You are ${fmtDist(far)} from the school (allowed ${fmtDist(G.m)}). Take the photos inside the school.`);$('#sb').disabled=false;return}
        if(!confirm(tx(`تنبيه: الصور ملتقطة على بعد ${fmtDist(far)} من موقع المدرسة (المسموح ${fmtDist(G.m)}).\nهل الأصل فعلاً في هذه المدرسة؟ ستُسجَّل المسافة للمراجعة.`,`Warning: the photos were taken ${fmtDist(far)} from the school (allowed ${fmtDist(G.m)}).\nIs the asset really in this school? The distance is recorded for review.`))){$('#sb').disabled=false;return}}
      if(pend.some(Boolean)||pendX.length)vals.geo_dist=far!=null?Math.round(far):null;vals.review_status=null;
      const sc=get('schools',c.school_id)||{},rm=get('rooms',c.room_name_id)||{};const oldImg=[];
      for(let n=0;n<SHOTS.length;n++){const P=pend[n];if(!P)continue;const k=SHOTS[n].k;
        const lines=[`${ymdhms(new Date(P.at).toISOString())} · ${SHOTS[n].t()}`,[sc.name,sc.moe].filter(Boolean).join(' · '),[c.floor,rm.ar,c.room_number].filter(Boolean).join(' · ')+((P.pos||lat!=null)?`  ·  ${(+(P.pos?P.pos[0]:lat)).toFixed(5)}, ${(+(P.pos?P.pos[1]:lng)).toFixed(5)}`:'')];
        if(c[k])oldImg.push(c[k]);vals[k]=await storePhoto(P.f,lines)}
      {const xs=exKeep.slice();for(let i=0;i<pendX.length;i++){const P=pendX[i];xs.push(await storePhoto(P.f,[`${ymdhms(new Date(P.at).toISOString())} · ${tx('صورة إضافية','Extra photo')} ${exKeep.length+i+1}`,[sc.name,sc.moe].filter(Boolean).join(' · '),[c.floor,rm.ar,c.room_number].filter(Boolean).join(' · ')+((P.pos||lat!=null)?`  ·  ${(+(P.pos?P.pos[0]:lat)).toFixed(5)}, ${(+(P.pos?P.pos[1]:lng)).toFixed(5)}`:'')]))}
       vals.extra_images=xs;oldImg.push(...exDrop)}
      const old=Object.assign({},c);const was=!!c.submitted_at;Object.assign(c,vals,{updated_at:now()});if(!c.submitted_at)c.submitted_at=now();
      if(was)logChange(c,'emp:'+e.id,diff(old,c,TRACK));save('collections');oldImg.forEach(deletePhoto);
      setFlash(t('Asset details saved successfully.'));go('#success')}catch(er){$('#ferr').textContent=er.message;$('#sb').disabled=false}};
}

/* NV25 — the two on-site photos of an asset */
const SHOTS=[{k:'asset_image',t:()=>tx('الأصل كاملاً في مكانه','Whole asset in place')},{k:'asset_image2',t:()=>tx('لوحة البيانات / الرقم التسلسلي','Nameplate / serial number')}];
const CAM='<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.9l.82-1.2A2 2 0 0110.07 4h3.86a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3.2"/></svg>';
function shotTile(n,cur){const id='aimg'+(n?'2':'');return `<div class="nv-shot ${cur?'ok':''}" data-shot="${n}"><div class="nv-shot-pv">${cur?img(cur,'',''):CAM}</div><b>${n+1}. ${SHOTS[n].t()} <span class="text-red-500">*</span></b><i data-geo class="nv-geo"></i><small>${cur?tx('✓ موجودة — يمكنك تغييرها','✓ Saved — you can change it'):tx('من الكاميرا أو المعرض','From the camera or the gallery')}</small>
  <div class="nv-src"><label>📷 ${tx('كاميرا','Camera')}<input type="file" id="${id}" data-n="${n}" accept="image/*" capture="environment"></label>${can('gallery')?`<label>🖼️ ${tx('المعرض','Gallery')}<input type="file" id="${id}G" data-n="${n}" accept="image/*"></label>`:''}</div></div>`}

/* success.blade.php */
function vSuccess(){
  if(!needEmp())return;const s=sess();const sc=s.school&&get('schools',s.school);if(!sc){go('#employee-data');return}const e=curEmp();const f0=takeFlash();
  const list=S.collections.filter(x=>x.school_id===sc.id&&x.submitted_at).sort((a,b)=>a.submitted_at<b.submitted_at?1:-1);
  const th=k=>`<th class="px-4 py-3 font-bold text-gray-600 text-left">${t(k)}</th>`;
  fieldLayout(`<section id="screen-success" class="w-full max-w-2xl"><div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
  <div class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg></div>
  ${statusBox(f0&&f0.t)}<h2 class="text-2xl font-bold text-gray-800 mb-2">${t('Asset Saved!')}</h2><p class="text-gray-500 mb-8">${t('The asset has been successfully recorded in the system.')}</p>
  ${savedLabelCard(curColl())}${printBar(list.filter(a=>a.employee_id===e.id),curColl())}
  ${list.length?`<div class="mb-8 text-left"><div class="overflow-x-auto rounded-xl border border-gray-200"><table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-200">${th('Image')}${th('Floor')}${th('Room')}${th('Category')}${th('Type')}${th('Brand')}<th class="px-4 py-3 font-bold text-gray-600 text-left">Tag Number</th><th class="px-4 py-3 font-bold text-gray-600 text-center">${t('Action')}</th></tr></thead><tbody>
   ${list.map(a=>`<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="px-4 py-3">${img(a.asset_image,'h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100','<div class="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400"><i class="bi bi-image text-xs"></i></div>')}</td>
    <td class="px-4 py-3">${esc(a.floor||'')}</td><td class="px-4 py-3">${esc(roomName(a)??'N/A')} (${esc(a.room_number||'')})</td><td class="px-4 py-3">${esc((get('categories',a.category_id)||{}).ar||'--')}</td><td class="px-4 py-3">${esc((get('types',a.type_id)||{}).ar||'--')}</td><td class="px-4 py-3">${esc(a.brand||'--')}</td><td class="px-4 py-3 font-mono text-xs">${lblReady(a)?esc(assetLabel(a)):'⏳'}${printedSet().has(a.id)?' <span class="nv-badge g">✓</span>':''}</td>
    <td class="px-4 py-3 text-center whitespace-nowrap">${a.employee_id===e.id?`<a href="javascript:void 0" data-ed="${esc(a.id)}" class="text-blue-600 hover:text-blue-800 font-bold">${t('Edit')}</a>`:''}${lblReady(a)?` <a href="javascript:void 0" data-pl="${esc(a.id)}" class="nv-plbtn" title="${tx('طباعة الملصق','Print the label')}">🖨️</a>`:''}</td></tr>`).join('')}</tbody></table></div></div>`:''}
  ${sc.completed_at?'':`<div class="space-y-4">
   ${tplQ().length?`<a href="javascript:void 0" id="tplNext" class="block w-full nv-tplnext">📋 ${tx('التالي من قالب الغرفة','Next from the room template')}: <b>${esc((get('types',tplQ()[0].t)||{}).ar||'')}</b> <small>(${tplQ().length} ${tx('متبقٍ','left')})</small></a><a href="javascript:void 0" id="tplStop" class="block text-sm text-gray-500 underline">${tx('إيقاف القالب','Stop the template')}</a>`:''}
   <a href="javascript:void 0" id="same" class="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-200">${t('Add Another Asset in Same Room')}</a>
   ${curColl()&&curColl().type_id?`<a href="javascript:void 0" id="like" class="block w-full nv-like">⧉ ${tx('إضافة أصل مثل السابق','Add an asset like the previous one')} <small>(${esc((get('types',curColl().type_id)||{}).ar||'')}${curColl().brand?' · '+esc(curColl().brand):''})</small></a>`:''}
   <a href="javascript:void 0" id="other" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200">${t('Add Another Asset (New Room)')}</a>
   ${can('finish')?'':'<!--'}<a href="javascript:void 0" id="fin" class="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all">${t('Complete and Finish Job')}</a>${can('finish')?'':'-->'}</div>`}
  </div></section>`);
  $$('[data-ed]').forEach(a=>a.onclick=()=>{setSess({coll:a.dataset.ed});go('#location')});bindPrint(list);
  if(sc.completed_at)return;
  const add=(same,extra)=>{const base=curColl()||list.find(x=>x.employee_id===e.id)||{};let d=S.collections.find(x=>x.employee_id===e.id&&x.school_id===sc.id&&!x.submitted_at);
    const loc=same&&base.floor?{floor:base.floor,room_number:base.room_number,room_name_id:base.room_name_id}:{floor:null,room_number:null,room_name_id:null};
    if(d)Object.assign(d,blankAsset(),loc,extra||{},{updated_at:now()});else{d=newCollection(e.id,sc.id,base.school_image||(list.find(x=>x.employee_id===e.id&&x.school_image)||{}).school_image||null,loc);Object.assign(d,extra||{});S.collections.push(d)}
    save('collections');setSess({coll:d.id});if(loc.floor){setFlash(extra&&extra._msg||t('New asset created in the same room.'));delete d._msg;go('#asset')}else go('#location')};
  $('#same').onclick=()=>{setSess({tq:[]});add(true)};$('#other').onclick=()=>{setSess({tq:[]});add(false)};
  /* NV30 — «like the previous»: same type, brand, model … ; photos and serial number stay empty */
  if($('#like'))$('#like').onclick=()=>{const b=curColl();const x={};for(const k of LIKE_KEYS)x[k]=b[k];x._msg=tx('نُسخت بيانات الأصل السابق — أضف الصور والرقم التسلسلي وراجع الحالة.','The previous asset was copied — add the photos and the serial number, and check the condition.');add(true,x)};
  if($('#tplNext'))$('#tplNext').onclick=()=>{const q=tplQ();const it=q.shift();setSess({tq:q});const ty=get('types',it.t)||{};add(true,{category_id:ty.cat||null,type_id:it.t,quantity:it.q||1,_msg:tx(`من قالب الغرفة: ${ty.ar||''} — أضف الصور والحالة.`,`From the room template: ${ty.ar||''} — add the photos and the condition.`)})};
  if($('#tplStop'))$('#tplStop').onclick=()=>{setSess({tq:[]});route()};
  $('#fin').onclick=()=>{if(!confirm(tx('إنهاء جرد هذه المدرسة؟ لن يمكن إضافة أصول لها بعد ذلك.','Finish this school? No more assets can be added after that.')))return;
    S.collections=S.collections.filter(x=>!(x.school_id===sc.id&&x.employee_id===e.id&&!x.submitted_at));
    Object.assign(sc,{completed_at:now(),completed_by:e.id,status:'inactive'});save('schools');save('collections');setSess({school:null,coll:null,tq:[]});if(Cloud.on)queueSchoolMail(sc.id,e.id);go('#job-completed')};
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
  ${printBar(list,null)}
  ${list.length?`<div class="overflow-hidden border border-gray-100 rounded-2xl"><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-50 text-gray-600 uppercase text-xs"><tr><th class="px-6 py-4">${t('Image')}</th><th class="px-6 py-4">${t('School & Location')}</th><th class="px-6 py-4">${t('Asset Details')}</th><th class="px-6 py-4">${t('Submitted')}</th><th class="px-6 py-4 text-right">${t('Action')}</th></tr></thead><tbody class="divide-y divide-gray-100">
   ${list.map(a=>`<tr class="hover:bg-blue-50/30 transition-colors"><td class="px-6 py-4">${img(a.asset_image,'h-12 w-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100','<div class="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><i class="bi bi-image"></i></div>')}</td>
    <td class="px-6 py-4"><div class="font-bold text-gray-900">${esc((get('schools',a.school_id)||{}).name||'')}</div><div class="text-xs text-gray-500 flex items-center gap-1 mt-1"><i class="bi bi-geo-alt"></i>${esc(a.floor||'')} • ${esc(roomName(a)??'N/A')}</div></td>
    <td class="px-6 py-4"><div class="text-gray-900 font-medium">${esc((get('types',a.type_id)||{}).ar||'')}${a.review_status==='returned'?` <span class="nv-badge r">${tx('مُرجع','Returned')}</span>`:a.review_status==='ok'?` <span class="nv-badge g">${tx('معتمد','Approved')}</span>`:''}</div><div class="text-xs text-gray-500">${esc((get('categories',a.category_id)||{}).ar||'')}</div></td>
    <td class="px-6 py-4"><div class="text-gray-700 text-xs">${ymd(a.submitted_at)}</div><div class="text-gray-400 text-xs">${hiA(a.submitted_at)}</div></td>
    <td class="px-6 py-4 text-right whitespace-nowrap">${lblReady(a)?`<a href="javascript:void 0" data-pl="${esc(a.id)}" class="nv-plbtn" title="${tx('طباعة الملصق','Print the label')}">🖨️</a> `:''}${!can('edit_sent')||(Cloud.sub&&Cloud.sub.ok===false)?'':`<a href="javascript:void 0" data-ed="${esc(a.id)}" class="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg font-bold transition-all text-xs"><i class="bi bi-pencil-square"></i>${t('Edit')}</a>`}</td></tr>`).join('')}
   </tbody></table></div></div>`:`<div class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><div class="text-gray-400 mb-3"><i class="bi bi-inbox text-5xl"></i></div><p class="text-gray-600 font-medium">${t('No history found.')}</p><p class="text-gray-400 text-sm">${t('Start a new collection to see it here.')}</p></div>`}
  <div class="mt-8 pt-6 border-t border-gray-100 flex justify-center"><a href="#school" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl transition-all shadow-lg shadow-blue-200">${t('Start New Collection')}</a></div>
  </div></section>`);
  $$('[data-ed]').forEach(b=>b.onclick=()=>{const c=S.collections.find(x=>x.id===b.dataset.ed);if(!c)return;setSess({school:c.school_id,coll:c.id});setFlash(t('You are now editing an existing collection.'));go('#location')});bindPrint(list);
}

/* NV26 — upload status for the field supervisor: records and photos still on this phone */
let pendBusy=false;
async function nvPendUI(){const el=document.getElementById('nvPend');if(!el||!Cloud.on||Cloud.role!=='tech')return;const recs=Cloud.pendingCount();let ph=0;
  try{ph=(await IDB.keys('photos')).filter(k=>!Cloud.uploaded.has(k)).length}catch(e){}
  const busy=Cloud.syncing||pendBusy,err=Cloud.err&&(recs||ph),net=err&&(navigator.onLine===false||/fetch|network|Load failed|timeout|ERR_/i.test(Cloud.err.message||''));el.hidden=false;el.dataset.recs=recs;el.dataset.ph=ph;el.className='nv-pend '+(busy?'run':recs||ph?(err?'err':'wait'):'ok');
  el.innerHTML=busy?`⏫ ${tx('جارٍ رفع البيانات والصور…','Uploading data and photos…')}`:recs||ph?`<span>${err?'⚠️':'⏳'} ${tx('بانتظار الرفع','Waiting to upload')}: <b>${recs}</b> ${tx('سجل','records')} · <b>${ph}</b> ${tx('صورة','photos')}${err?' — '+(net?tx('لا يوجد اتصال بالإنترنت. البيانات محفوظة على الجوال وتُرسل عند عودة الاتصال؛ لا تمسح بيانات المتصفح.','No internet. The data is kept on the phone and sent when the connection returns; do not clear the browser data.'):tx('تعذر الرفع: ','Upload failed: ')+esc(String(/limit reached/i.test(Cloud.err.message||'')?'تم بلوغ حد الباقة لعدد الأصول':Cloud.err.message||'').slice(0,160))+tx(' — أبلغ مدير المشروع.',' — tell the project manager.')):''}</span><button type="button" id="nvPendGo">${tx('إرسال الآن','Send now')}</button>`:`✓ ${tx('كل بياناتك وصورك مرفوعة','All your data and photos are uploaded')}`;
  const b=document.getElementById('nvPendGo');if(b)b.onclick=async()=>{pendBusy=true;nvPendUI();try{await Cloud.sync()}finally{pendBusy=false;nvPendUI()}}}
/* NV26 — the asset page opened from the QR link (#a/<label number>) for a field supervisor */
function vAssetCard(c){const s=get('schools',c.school_id)||{},ty=get('types',c.type_id)||{},co=get('conditions',c.condition_id)||{};
  const row=(l,v)=>v!=null&&v!==''?`<div class="nv-kv"><span>${l}</span><b>${esc(v)}</b></div>`:'';
  fieldLayout(`<section class="w-full max-w-2xl"><div class="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
   <div class="text-center mb-4"><div class="text-xs text-gray-500">Tag Number</div><div class="text-2xl font-bold">${esc(assetLabel(c))}</div><div class="text-lg font-bold text-blue-700 mt-1">${esc(ty.ar||'')}</div>${ty.critical?`<span class="nv-badge r">${tx('أصل حرج','Critical')}</span>`:''}</div>
   <div class="nv-shots mb-4">${SHOTS.map(x=>`<div class="nv-shot ok"><div class="nv-shot-pv">${img(c[x.k],'',CAM)}</div><b>${x.t()}</b></div>`).join('')}${(c.extra_images||[]).map(k=>`<div class="nv-shot ok"><div class="nv-shot-pv">${img(k,'','')}</div></div>`).join('')}</div>
   ${row(tx('المدرسة','School'),[s.name,s.moe].filter(Boolean).join(' · '))}${row(tx('الموقع','Location'),[c.floor,roomName(c),c.room_number].filter(Boolean).join(' · '))}${row(tx('الكود','Code'),ty.code)}${row(tx('الحالة الفنية','Condition'),co.ar)}
   ${row(tx('الكمية','Quantity'),c.quantity)}${row(tx('الماركة','Brand'),c.brand)}${row(tx('الموديل','Model'),c.model)}${row(tx('الرقم التسلسلي','Serial'),c.serial)}${row(tx('السعة','Capacity'),c.capacity)}${row(tx('تاريخ الجرد','Collected'),c.submitted_at?ymd(c.submitted_at):'')}
   ${c.employee_id===sess().emp&&can('edit_sent')&&!(Cloud.sub&&Cloud.sub.ok===false)?`<a href="javascript:void 0" id="cardEdit" class="block mt-6 text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl">✎ ${tx('تحديث بيانات الأصل','Update this asset')}</a>`:''}
   <a href="javascript:void 0" id="cardScan" class="block mt-3 text-center bg-white border border-blue-200 text-blue-700 font-bold py-3 rounded-xl">📷 ${tx('مسح ملصق آخر','Scan another label')}</a>
   <a href="#employee-data" class="block mt-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl">${tx('رجوع','Back')}</a></div></section>`);
  if($('#cardEdit'))$('#cardEdit').onclick=()=>{setSess({school:c.school_id,coll:c.id,tq:[]});setFlash(t('You are now editing an existing collection.'));go('#location')};$('#cardScan').onclick=()=>scanQR()}
function openAssetLink(lb,field){const c=S.collections.find(x=>x.no&&assetLabel(x)===lb);
  if(isAuthed()&&!(field&&curEmp())){if(c)return go('#admin/collections/'+encodeURIComponent(c.id));setAFlash(`لم يُعثر على الأصل رقم ${lb}.`,'warning');return go('#admin/collections')}
  if(curEmp()){if(c)return vAssetCard(c);setFlash(tx(`الأصل رقم ${lb} غير موجود في سجلاتك.`,`Asset ${lb} is not in your records.`));return go('#employee-data')}
  try{sessionStorage.setItem('nv_after','#a/'+lb)}catch(e){}go(Cloud.on?'#login':'#admin/login')}
function afterLinkGo(){let h=null;try{h=sessionStorage.getItem('nv_after');sessionStorage.removeItem('nv_after')}catch(e){}if(h){go(h);return true}return false}

/* NV30 — duplicates, room templates, «like the previous», label scanning */
const LIKE_KEYS=['category_id','type_id','condition_id','quantity','price','manufacturer','brand','model','capacity','agency','warranty','install_date','parent_child'];
const normSN=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const tplQ=()=>{const q=sess().tq;return Array.isArray(q)?q.filter(x=>get('types',x.t)):[]};
/* the room's template: set by the management in «قوالب الغرف», else the types most often recorded in rooms with that name */
function roomTpl(roomId){const set=(S.settings.room_tpl||{})[roomId];if(Array.isArray(set)&&set.length)return {src:'set',items:set.filter(x=>get('types',x.t))};
  const m=new Map();for(const c of S.collections)if(c.room_name_id===roomId&&c.submitted_at&&c.type_id){const x=m.get(c.type_id)||{t:c.type_id,n:0,q:[]};x.n++;x.q.push(num(c.quantity)||1);m.set(c.type_id,x)}
  const items=[...m.values()].filter(x=>x.n>=2).sort((a,b)=>b.n-a.n).slice(0,10).map(x=>({t:x.t,q:x.q.sort((a,b)=>a-b)[x.q.length>>1]}));return items.length?{src:'history',items}:null}
function tplCard(c){if(c.submitted_at||c.type_id||!c.room_name_id){const q=tplQ();return q.length&&!c.submitted_at?`<div class="nv-tplnote">📋 ${tx('من قالب الغرفة','From the room template')} — ${tx('متبقٍ بعد هذا','left after this')}: ${q.length}</div>`:''}
  const T=roomTpl(c.room_name_id);if(!T)return '';const r=get('rooms',c.room_name_id)||{};
  setTimeout(()=>{const box=$('#tplBox');if(!box)return;const sync=()=>{const n=$$('[data-tplon]',box).filter(x=>x.checked).length;$('#tplGo').disabled=!n;$('#tplGo').textContent=tx(`ابدأ بالأصول الموجودة (${n})`,`Start with the present assets (${n})`)};
    $$('[data-tplon]',box).forEach(x=>x.onchange=sync);sync();
    $('#tplGo').onclick=()=>{const q=$$('[data-tplon]',box).filter(x=>x.checked).map(x=>({t:x.dataset.tplon,q:Math.max(1,Math.round(+$(`[data-tplq="${x.dataset.tplon}"]`,box).value||1))}));if(!q.length)return;
      const first=q.shift(),ty=get('types',first.t)||{};Object.assign(c,{category_id:ty.cat||null,type_id:first.t,quantity:first.q,updated_at:now()});save('collections');setSess({tq:q});
      setFlash(tx(`من قالب الغرفة: ${ty.ar||''} — أضف الصور والحالة ثم احفظ، ويظهر التالي.`,`From the room template: ${ty.ar||''} — add the photos and the condition, save, and the next one follows.`));route()};
    $('#tplHide').onclick=()=>box.remove()},0);
  return `<div id="tplBox" class="nv-tpl mb-6"><div class="flex justify-between items-center gap-2"><b>📋 ${tx('قالب الغرفة','Room template')}: ${esc(r.ar||'')}</b><button type="button" id="tplHide" class="text-xs text-gray-500 underline">${tx('إخفاء','Hide')}</button></div>
   <p class="text-xs text-gray-500 mt-1 mb-2">${T.src==='set'?tx('الأصول المعتادة في هذه الغرفة. علّم الموجود وعدّل الكمية، ثم تُفتح الأصول واحداً بعد الآخر جاهزة — تضيف الصور والحالة فقط.','The usual assets of this room. Tick what is present, set the quantity; they then open one by one, ready — you add only the photos and the condition.'):tx('مقترحة من الأصول التي سُجّلت في غرف بنفس الاسم.','Suggested from assets recorded in rooms with the same name.')}</p>
   ${T.items.map(x=>{const ty=get('types',x.t)||{};return `<label class="nv-tplrow"><input type="checkbox" data-tplon="${esc(x.t)}" checked><span>${esc(ty.ar||'')}${ty.critical?' <em>⚠️</em>':''}</span><input type="number" min="1" value="${esc(x.q||1)}" data-tplq="${esc(x.t)}" aria-label="${tx('الكمية','Quantity')}"></label>`}).join('')}
   <button type="button" id="tplGo" class="nv-tplgo"></button></div>`}
/* before saving: the same serial number elsewhere, or the same asset in the same room a few minutes ago */
async function dupOk(c,vals){const sn=normSN(vals.serial);
  if(sn.length>=4&&(normSN(c.serial)!==sn||!c.submitted_at)){let hits=S.collections.filter(x=>x!==c&&x.type_id&&normSN(x.serial)===sn).map(x=>({label:assetLabel(x),school:(get('schools',x.school_id)||{}).name||''}));
    if(Cloud.on&&navigator.onLine!==false){try{const cl=await Cloud.sb();const {data}=await cl.rpc('nv_serial_dupes',{p_serial:vals.serial,p_id:c.id});if(Array.isArray(data))for(const d of data)if(!hits.some(h=>h.label===d.label))hits.push(d)}catch(e){}}
    if(hits.length&&!confirm(tx(`الرقم التسلسلي «${vals.serial}» مسجّل لأصل آخر:\n${hits.slice(0,3).map(h=>`• Tag ${h.label||'—'} — ${h.school||''}`).join('\n')}\n\nقد يكون الأصل مجروداً من قبل. حفظ رغم ذلك؟`,`Serial «${vals.serial}» is already on another asset:\n${hits.slice(0,3).map(h=>`• Tag ${h.label||'—'} — ${h.school||''}`).join('\n')}\n\nIt may have been collected already. Save anyway?`)))return false}
  if(!c.submitted_at){const rec=S.collections.filter(x=>x!==c&&x.submitted_at&&x.school_id===c.school_id&&x.type_id===vals.type_id&&String(x.floor)===String(c.floor)&&String(x.room_number)===String(c.room_number)&&x.room_name_id===c.room_name_id&&Date.now()-new Date(x.submitted_at).getTime()<15*6e4);
    if(rec.length){const m=Math.max(1,Math.round((Date.now()-new Date(rec[0].submitted_at).getTime())/6e4));if(!confirm(tx(`سجّلت «${(get('types',vals.type_id)||{}).ar||''}» في نفس الغرفة قبل ${m} دقيقة (الكمية ${num(rec[0].quantity)}).\nإذا كان نفس الأصل فعدّل كميته بدلاً من تكراره.\n\nهل هو أصل آخر فعلاً؟`,`You saved the same asset in this room ${m} min ago. If it is the same asset, change its quantity instead.\n\nIs this really another asset?`)))return false}}
  return true}
/* label scanning: BarcodeDetector when the browser has it, else jsQR 1.4.0 (jsdelivr) */
const labelFromQR=t=>{t=String(t||'');const m=/#a\/(\d{11})\b/.exec(t)||/Tag Number:\s*(\d{11})/.exec(t)||/(?:^|\D)(101\d{8})(?:\D|$)/.exec(t);return m?m[1]:null};
let jsqrP=null;const needJsQR=()=>jsqrP||(jsqrP=window.jsQR?Promise.resolve():loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js').catch(e=>{jsqrP=null;throw e}));
function onScanText(t){const lb=labelFromQR(t);if(!lb){toast(tx('هذا الرمز ليس ملصق أصل من Solvix.','This code is not a Solvix asset label.'),4000);return}openAssetLink(lb,true)}
async function scanQR(){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){const v=prompt(tx('الكاميرا غير متاحة. اكتب رقم الأصل (Tag Number):','No camera. Type the Tag Number:'));if(v)onScanText(v.replace(/\D/g,''));return}
  const ov=document.createElement('div');ov.id='nvScan';ov.innerHTML=`<div class="nv-scan-box"><video playsinline muted></video><div class="nv-scan-frame"></div></div><p>${tx('وجّه الكاميرا إلى رمز QR على ملصق الأصل','Point the camera at the QR code on the asset label')}</p><div class="nv-scan-act"><button type="button" data-k>${tx('كتابة الرقم','Type the number')}</button><button type="button" data-x>${tx('إغلاق','Close')}</button></div>`;document.body.appendChild(ov);
  let stream=null,stop=false;const close=()=>{stop=true;if(stream)stream.getTracks().forEach(x=>x.stop());ov.remove()};ov.querySelector('[data-x]').onclick=close;
  ov.querySelector('[data-k]').onclick=()=>{const v=prompt('Tag Number:');if(v){close();onScanText(v.replace(/\D/g,''))}};
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false})}catch(e){close();toast(tx('لم يُسمح باستخدام الكاميرا.','Camera access was refused.'),4000);return}
  const vid=ov.querySelector('video');vid.srcObject=stream;await vid.play().catch(()=>{});
  let det=null;try{if('BarcodeDetector' in window&&(await BarcodeDetector.getSupportedFormats()).includes('qr_code'))det=new BarcodeDetector({formats:['qr_code']})}catch(e){}
  if(!det){try{await needJsQR()}catch(e){close();toast(tx('تعذر تحميل قارئ الرموز — تحقق من الاتصال.','The code reader could not load.'),4000);return}}
  const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
  const tick=async()=>{if(stop)return;try{if(vid.readyState>=2){let txt=null;if(det){const r=await det.detect(vid);if(r&&r[0])txt=r[0].rawValue}else{const w=vid.videoWidth,h=vid.videoHeight,k=Math.min(1,640/Math.max(w,h));cv.width=w*k;cv.height=h*k;cx.drawImage(vid,0,0,cv.width,cv.height);const r=jsQR(cx.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height,{inversionAttempts:'dontInvert'});if(r)txt=r.data}
    if(txt){close();if(navigator.vibrate)navigator.vibrate(80);onScanText(txt);return}}}catch(e){}setTimeout(tick,180)};tick()}

/* NV31 — the supervisor prints the asset label right after saving it: the saved asset's data + a real-size label preview on the success page,
   print buttons per asset / room / not yet printed, and a «printed» mark kept on this phone (localStorage nv_printed).
   With the cloud the Tag Number comes from the database on upload, so a label is printable only once the asset is uploaded (lblReady). */
const lblReady=c=>!!(c&&c.no&&c.submitted_at&&c.type_id&&(!Cloud.on||(Cloud.snap&&Cloud.snap.collections&&Cloud.snap.collections[c.id]!==undefined)));
const printedSet=()=>new Set(lsGet('nv_printed',[]));
function markPrinted(ids){const s=printedSet();ids.forEach(i=>s.add(i));lsSet('nv_printed',[...s].slice(-5000))}
async function fieldPrint(list,title){const L=list.filter(lblReady);if(!L.length)return toast(tx('لا توجد ملصقات جاهزة للطباعة بعد (تنتظر رفع الأصول).','No labels ready yet (waiting for the upload).'),4000);
  await printLabels(L,title);markPrinted(L.map(c=>c.id));setTimeout(()=>{if(/^#(success|history)/.test(location.hash))route()},600)}
function savedLabelCard(c){if(!c||!c.submitted_at||!c.type_id)return '';const ty=get('types',c.type_id)||{},co=get('conditions',c.condition_id)||{},ready=lblReady(c),done=printedSet().has(c.id);
  const row=(l,v)=>v!=null&&v!==''?`<div class="nv-kv"><span>${l}</span><b>${esc(v)}</b></div>`:'';
  setTimeout(()=>{const box=$('#lblPrev');if(!box)return;needQR().then(()=>{const Z=labelSize();let st=$('#lblCss');if(!st){st=document.createElement('style');st.id='lblCss';document.head.appendChild(st)}st.textContent=labelCSS(Z);if($('#lblPrev'))$('#lblPrev').innerHTML=labelHTML(c,Z)}).catch(()=>{box.innerHTML=`<p class="text-xs text-amber-700">${tx('تعذر تحميل مولّد الرمز — تحقق من الاتصال.','The QR generator could not load.')}</p>`})},0);
  return `<div id="lblCard" class="nv-lblcard mb-6" ${ready?'':'data-wait="1"'}><div class="nv-lbl-head">🏷️ ${tx('ملصق الأصل المحفوظ','Label of the saved asset')}${done?` <span class="nv-badge g">✓ ${tx('طُبع','Printed')}</span>`:''}</div>
   <div class="nv-lbl-grid"><div class="nv-lbl-data">${row('Tag Number',ready?assetLabel(c):tx('يُعطى بعد الرفع','after upload'))}${row(tx('الأصل','Asset'),ty.ar)}${row(tx('الكود','Code'),ty.code)}${row(tx('الموقع','Location'),[c.floor,roomName(c),c.room_number].filter(Boolean).join(' · '))}${row(tx('الحالة','Condition'),co.ar)}${row(tx('الكمية','Qty'),c.quantity)}${row(tx('الرقم التسلسلي','Serial'),c.serial)}</div>
    <div class="nv-lbl-prev">${ready?'<div id="lblPrev"></div>':`<p class="nv-lbl-wait">⏫ ${tx('جارٍ رفع الأصل ليأخذ رقمه في النظام… يظهر الملصق تلقائياً بعد الرفع.','Uploading the asset to get its system number… the label appears after the upload.')}</p>`}</div></div>
   <button type="button" id="lblPrint" class="nv-lblbtn" ${ready?'':'disabled'}>🖨️ ${done?tx('طباعة الملصق مرة أخرى','Print the label again'):tx('طباعة الملصق','Print the label')}</button></div>`}
function printBar(list,cur){const ready=list.filter(lblReady),pr=printedSet(),todo=ready.filter(a=>!pr.has(a.id));const room=cur?ready.filter(a=>a.floor===cur.floor&&String(a.room_number)===String(cur.room_number)&&a.room_name_id===cur.room_name_id):[];
  if(!ready.length)return '';return `<div class="nv-pbar mb-6">${room.length>1?`<button type="button" data-pall="room">🖨️ ${tx('ملصقات هذه الغرفة','This room’s labels')} (${room.length})</button>`:''}${todo.length?`<button type="button" data-pall="todo">🖨️ ${tx('كل ما لم يُطبع','All not printed')} (${todo.length})</button>`:`<span class="nv-badge g">✓ ${tx('كل الملصقات الجاهزة طُبعت','All ready labels are printed')}</span>`}</div>`}
function bindPrint(list){const e=curEmp();const mine=list.filter(a=>a.employee_id===(e&&e.id));const cur=curColl();
  $$('[data-pl]').forEach(b=>b.onclick=()=>{const c=S.collections.find(x=>x.id===b.dataset.pl);if(c)fieldPrint([c],assetLabel(c))});
  if($('#lblPrint'))$('#lblPrint').onclick=()=>fieldPrint([cur],assetLabel(cur));
  $$('[data-pall]').forEach(b=>b.onclick=()=>{const pr=printedSet();const L=b.dataset.pall==='room'?mine.filter(a=>cur&&a.floor===cur.floor&&String(a.room_number)===String(cur.room_number)&&a.room_name_id===cur.room_name_id):mine.filter(a=>!pr.has(a.id));fieldPrint(L,'')})}
/* the label appears by itself once the upload gives the asset its number */
window.nvLabelRefresh=()=>{const w=$('#lblCard[data-wait]');if(w&&lblReady(curColl())&&/^#success/.test(location.hash))route()};
</script>
