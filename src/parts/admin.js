<script id="nv-admin">
/* Admin pages — markup copied from resources/views/admin/** (AdminLTE 4; NV9: Arabic, RTL). */
let adminLibsP=null;
const needAdminLibs=()=>adminLibsP||(adminLibsP=Promise.all([
  loadScript('https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js'),
  loadScript('https://cdn.jsdelivr.net/npm/apexcharts@3.37.1/dist/apexcharts.min.js')]).catch(e=>{adminLibsP=null;throw e}));
const dispId=id=>String(id||'').replace(/^[a-z]+/,'');
function nextId(table,prefix){let m=0;for(const x of S[table]){const n=Number(dispId(x.id));if(isFinite(n)&&n>m)m=n}return prefix+(m+1)}
const qp=()=>new URLSearchParams((location.hash.split('?')[1])||'');
const routePath=()=>location.hash.replace(/^#/,'').split('?')[0];
function withQuery(over){const p=qp();for(const [k,v] of Object.entries(over)){if(v==null||v==='')p.delete(k);else p.set(k,v)}const s=p.toString();return '#'+routePath()+(s?'?'+s:'')}
const fmtYmd=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
const nf=n=>Number(n||0).toLocaleString('en-US');
function sortA(key,label,defSort,defDir,cls){const p=qp();const cur=p.get('sort')||'',dir=p.get('direction')||'';
  const effSort=defSort?(cur||defSort):cur,effDir=defSort?(dir||defDir):dir;
  const nd=effSort===key&&effDir==='asc'?'desc':'asc';
  const icon=(defSort?effSort===key:cur===key)?` <i class="bi bi-sort-${effDir==='asc'?'up':'down'}"></i>`:'';
  return `<a href="${withQuery({sort:key,direction:nd,page:null})}" class="text-decoration-none text-muted">${label}${icon}</a>`}
function sorted(list,keyFns,defSort,defDir){const p=qp();const s=p.get('sort')||defSort,d=p.get('direction')||defDir;const fn=keyFns[s]||keyFns[defSort];return list.slice().sort((a,b)=>cmp(fn(a),fn(b))*(d==='desc'?-1:1))}
const cmp=(a,b)=>a==null&&b==null?0:a==null?1:b==null?-1:typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),'ar',{numeric:true});
/* Laravel paginator (20 per page) with the bootstrap-4 links view */
function paginate(list,per=20){const total=list.length,last=Math.max(1,Math.ceil(total/per));let page=Math.min(last,Math.max(1,parseInt(qp().get('page')||'1',10)||1));
  const items=list.slice((page-1)*per,page*per);
  const link=(n,label,rel)=>`<li class="page-item"><a class="page-link" href="${withQuery({page:n})}"${rel?` rel="${rel}"`:''}>${label}</a></li>`;
  const pages=[];if(last<13){for(let i=1;i<=last;i++)pages.push(i)}else if(page<=8){for(let i=1;i<=10;i++)pages.push(i);pages.push('...',last-1,last)}else if(page>last-8){pages.push(1,2,'...');for(let i=last-9;i<=last;i++)pages.push(i)}else{pages.push(1,2,'...');for(let i=page-3;i<=page+3;i++)pages.push(i);pages.push('...',last-1,last)}
  const links=`<nav><ul class="pagination">${page<=1?'<li class="page-item disabled" aria-disabled="true"><span class="page-link" aria-hidden="true">&rsaquo;</span></li>':link(page-1,'&rsaquo;','prev')}
   ${pages.map(n=>n==='...'?'<li class="page-item disabled" aria-disabled="true"><span class="page-link">...</span></li>':n===page?`<li class="page-item active" aria-current="page"><span class="page-link">${n}</span></li>`:link(n,n)).join('')}
   ${page>=last?'<li class="page-item disabled" aria-disabled="true"><span class="page-link" aria-hidden="true">&lsaquo;</span></li>':link(page+1,'&lsaquo;','next')}</ul></nav>`;
  const footer=last>1?`<div class="card-footer clearfix"><div class="row align-items-center"><div class="col-sm-6"><span class="text-muted">عرض ${(page-1)*per+1} إلى ${(page-1)*per+items.length} من ${total} نتيجة</span></div><div class="col-sm-6">${links}</div></div></div>`:'';
  return {items,footer}}
let aflash=null;const charts=[];function destroyCharts(){while(charts.length){try{charts.pop().destroy()}catch(e){}}}
const chart=(el,o)=>{if(!el||!el.isConnected)return;o.chart=Object.assign({animations:{enabled:false},redrawOnParentResize:false,redrawOnWindowResize:false},o.chart);el.innerHTML='';const c=new ApexCharts(el,o);charts.push(c);c.render()};const setAFlash=(m,k='success')=>{aflash={m,k}};
const isAuthed=()=>Cloud.on?(Cloud.role==='admin'||Cloud.role==='reader'):isAdmin();
/* NV10 roles: owner (مالك المشروع) / manager (مدير المشروع) / coordinator (منسق المشروع) sign in by e-mail; field supervisors (مشرف ميدان) are employees */
const ROLE_L={sysadmin:'Admin',owner:'مالك المشروع',manager:'مدير المشروع',coordinator:'منسق المشروع',reader:'قراءة فقط',field:'مشرف ميدان'};
const staffRole=()=>Cloud.on?(Cloud.staffRole||(Cloud.role==='admin'?'owner':Cloud.role==='reader'?'reader':null)):'owner';
const canUsers=()=>can('users');
const isOwnerRole=()=>['owner','sysadmin'].includes(staffRole());
const isSys=()=>!!(Cloud.on&&Cloud.sys);

/* ---------- layout (admin/layouts/app.blade.php) ---------- */
function applyTheme(){const th=lsGet('bsTheme','auto');const dark=th==='dark'||(th==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-bs-theme',dark?'dark':'light');return th}
function setMode(m){$$('[data-mode]').forEach(el=>{const on=el.dataset.mode===m;if(el.tagName==='STYLE'&&el.id==='nv-tw'){el.media=on?'all':'not all'}else el.media=on?'all':'not all'});if(m!=='admin')document.documentElement.removeAttribute('data-bs-theme')}
function navItem(href,icon,label,active){return `<li class="nav-item"><a href="${href}" class="nav-link ${active?'active':''}"><i class="nav-icon bi ${icon}"></i><p>${label}</p></a></li>`}
function navTree(icon,label,open,items){return `<li class="nav-item ${open?'menu-open':''}"><a href="javascript:void 0" class="nav-link" data-nv-tree><i class="nav-icon bi ${icon}"></i><p>${label}<i class="nav-arrow bi bi-chevron-down"></i></p></a><ul class="nav nav-treeview" style="display:${open?'block':'none'}">${items.join('')}</ul></li>`}
function adminShell(active,title,content){
  destroyCharts();
  setMode('admin');const th=applyTheme();document.documentElement.lang='ar';document.documentElement.dir='rtl';
  document.title=title+' - '+appName();
  const keep=document.body.classList.contains('sidebar-collapse');
  document.body.className='layout-fixed sidebar-expand-lg bg-body-tertiary app-loaded'+(keep?' sidebar-collapse':'');app().className='';
  const A=k=>active===k;const adm=Cloud.on?{email:(Cloud.user&&Cloud.user.email)||''}:(S.settings.admin_login||{});
  const fl=aflash;aflash=null;
  app().innerHTML=`<div class="app-wrapper">
  <nav class="app-header navbar navbar-expand bg-body"><div class="container-fluid">
   <ul class="navbar-nav"><li class="nav-item"><a class="nav-link" data-nv-sidebar href="javascript:void 0" role="button"><i class="bi bi-list"></i></a></li><li class="nav-item d-none d-md-block"><a href="#admin" class="nav-link">لوحة التحكم</a></li>${Cloud.on?'<li class="nav-item"><a href="#admin/data" class="nav-link" data-nv-sync></a></li>':''}</ul>
   <form class="d-none d-sm-flex align-items-center ms-2" data-nv-tagq role="search"><div class="input-group input-group-sm" style="width:230px"><span class="input-group-text"><i class="bi bi-upc-scan"></i></span><input class="form-control" name="tag" autocapitalize="characters" placeholder="بحث برقم الأصل (Tag Number)" aria-label="بحث برقم الأصل"></div></form>
   <ul class="navbar-nav ms-auto">
    ${notifBell()}
    <li class="nav-item"><a class="nav-link" href="javascript:void 0" data-nv-fullscreen><i class="bi bi-arrows-fullscreen"></i></a></li>
    <li class="nav-item dropdown"><a class="nav-link" href="javascript:void 0" id="bd-theme" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi ${th==='light'?'bi-sun-fill':th==='dark'?'bi-moon-fill':'bi-circle-half'}"></i></a>
     <ul class="dropdown-menu dropdown-menu-end" style="--bs-dropdown-min-width: 8rem;">${[['light','bi-sun-fill','فاتح'],['dark','bi-moon-fill','داكن'],['auto','bi-circle-half','تلقائي']].map(([v,i,l])=>`<li><button type="button" class="dropdown-item d-flex align-items-center ${th===v?'active':''}" data-bs-theme-value="${v}" aria-pressed="${th===v}"><i class="bi ${i} me-2"></i> ${l}<i class="bi bi-check-lg ms-auto ${th===v?'':'d-none'}"></i></button></li>`).join('')}</ul></li>
    <li class="nav-item dropdown user-menu"><a href="javascript:void 0" class="nav-link dropdown-toggle" data-bs-toggle="dropdown"><span class="user-image rounded-circle shadow d-inline-flex align-items-center justify-content-center bg-secondary text-white" style="width:2rem;height:2rem"><i class="bi bi-person-fill"></i></span><span class="d-none d-md-inline">${ROLE_L[staffRole()]||'المدير'}</span></a>
     <ul class="dropdown-menu dropdown-menu-lg dropdown-menu-end"><li class="user-header text-bg-primary"><span class="rounded-circle shadow d-inline-flex align-items-center justify-content-center bg-white text-primary" style="width:90px;height:90px;font-size:2.5rem"><i class="bi bi-person-fill"></i></span><p>${ROLE_L[staffRole()]||'المدير'}<small>${esc(adm.email||'')}</small></p></li>
      <li class="px-3 py-2 border-bottom d-flex align-items-center gap-2 small"><i class="bi bi-file-earmark-excel text-success"></i><span class="me-auto">عناوين ملفات Excel</span><div class="btn-group btn-group-sm" role="group" aria-label="لغة عناوين Excel">${[['en','English'],['ar','عربي']].map(([v,l])=>`<button type="button" class="btn ${xlLang()===v?'btn-primary':'btn-outline-secondary'}" data-xl-lang="${v}" aria-pressed="${xlLang()===v}">${l}</button>`).join('')}</div></li>
      <li class="user-footer">${Cloud.on?'<a href="#reset-password" class="btn btn-outline-primary"><i class="bi bi-key me-1"></i>تغيير كلمة المرور</a>':''}<a href="javascript:void 0" class="btn btn-outline-danger float-end" data-nv-logout><i class="bi bi-box-arrow-right me-1"></i>تسجيل الخروج</a></li></ul></li></ul></div></nav>
  <aside class="app-sidebar nv-rkz shadow-sm">
   <div class="sidebar-brand bg-white p-2" style="height: auto; min-height: 80px; display: flex; align-items: center; justify-content: center; overflow: hidden;"><a href="#admin" class="brand-link p-0 w-100 h-100 d-flex align-items-center justify-content-center"><img src="${esc(logoURL())}" alt="Logo" class="w-100 h-auto" style="max-height: 70px; object-fit: contain;"><span class="brand-text d-none">${esc(appName())}</span></a></div>
   <div class="sidebar-wrapper" style="overflow-y:auto"><nav class="mt-2"><ul class="nav sidebar-menu flex-column" role="menu" data-accordion="false">
    ${navItem('#admin','bi-speedometer2','لوحة التحكم',A('dashboard'))}
    ${navItem('#admin/inventory44','bi-calendar-check','خطط الجرد والدورات والنقل',A('inventory44'))}
    ${navItem('#admin/tasks','bi-list-check','مهامي',A('tasks'))}
    <li class="nav-header">إدارة البيانات</li>
    ${navItem('#admin/collections','bi-collection','أعمال الجرد',A('collections'))}
    ${navItem('#admin/analytics','bi-diagram-3','تحليل الأصول',A('analytics'))}
    ${navItem('#admin/quality','bi-clipboard-check','جودة البيانات',A('quality'))}
    ${navItem('#admin/production','bi-bar-chart-steps','الإنتاج اليومي والغرف',A('production'))}
    ${navItem('#admin/exceptions','bi-exclamation-octagon','سجل الاستثناءات',A('exceptions'))}
    ${navItem('#admin/approvals','bi-diagram-3','اعتماد الجرد',A('approvals'))}
    ${navItem('#admin/conflicts','bi-intersect','تعارضات المزامنة',A('conflicts'))}
    ${!can('review')?'':navItem('#admin/review','bi-images','مراجعة الصور'+(reviewPending()?` <span class="badge text-bg-warning ms-1" data-nv-revn>${reviewPending()}</span>`:''),A('review'))}
    ${navTree('bi-building','المباني',A('schools')||A('schools.create')||A('schools.edit')||A('map'),[navItem('#admin/schools','bi-list','كل المباني',A('schools')),navItem('#admin/map','bi-geo-alt','خريطة المباني',A('map')),navItem('#admin/schools/create','bi-plus-circle','إضافة مبنى',A('schools.create'))])}
    ${navItem('#admin/employees','bi-people','المستخدمون',active.startsWith('employees')||A('users'))}
    <li class="nav-header">النظام</li>
    ${isSys()?navItem('#admin/clients','bi-buildings','العملاء والاشتراكات',A('clients')):''}
    ${docAllowed45('guide')?navItem('#admin/guide','bi-book','دليل المنصة',A('guide')):''}
    ${docAllowed45('releases')?navItem('#admin/releases','bi-clock-history','الإصدارات والفحص',A('releases')):''}${isSys()?navItem('#admin/usage','bi-person-lines-fill','نشاط المستخدمين',A('usage')):''}
    ${navItem(isSys()?'#admin/system':can('settings')?'#admin/settings':'#admin/asset-types','bi-gear','الإعدادات',A('settings')||A('label')||A('system')||A('subscription')||A('room-templates')||A('site-form')||!!LK[active.split('.')[0]])}
    ${can('backup')||can('export')||can('import')?navItem('#admin/data','bi-database','البيانات والنسخ',A('data')):''}
    ${can('delete')?navItem('#admin/trash','bi-trash3','سلة محذوفات الأصول',A('trash')):''}
    <li class="nav-item"><a href="javascript:void 0" class="nav-link" data-nv-logout><i class="nav-icon bi bi-box-arrow-right"></i><p>تسجيل الخروج</p></a></li>
   </ul></nav></div></aside>
  <main class="app-main"><div class="app-content-header"><div class="container-fluid">${pageHead(active,title)}</div></div>
   <div class="app-content"><div class="container-fluid">${subBanner()}${Cloud.on&&Cloud.dbOld&&Cloud.dbOld.length?`<div class="alert alert-warning py-2 small"><i class="bi bi-database-exclamation me-1"></i><b>قاعدة بيانات Solvix تحتاج تحديثاً:</b> شغّل <code>solvix_setup.sql</code> في Supabase ← SQL Editor. البيانات تُرفع الآن بدون الحقول الجديدة (${esc(Cloud.dbOld.join('، '))}).</div>`:''}${settingsTabs(active)}${fl?`<div class="alert alert-${fl.k} alert-dismissible"><button type="button" class="btn-close" data-bs-dismiss="alert"></button>${esc(fl.m)}</div>`:''}${content}</div></div></main>
  <footer class="app-footer"><div class="float-end d-none d-sm-inline">RakizoraFM • إدارة المرافق والأصول الذكية</div><strong>&copy; ${new Date().getFullYear()} ${esc(appName())}.</strong> جميع الحقوق محفوظة.</footer>
  </div><div class="sidebar-overlay"></div>`;
  hydratePhotos(app());Cloud.badge();
}
/* sidebar / treeview / fullscreen / theme / logout (AdminLTE's own JS binds once at load, so these are delegated here) */
document.addEventListener('click',e=>{
  if(!document.body.classList.contains('app-loaded'))return;
  const sb=e.target.closest('[data-nv-sidebar]');if(sb){e.preventDefault();if(window.innerWidth<992){document.body.classList.toggle('sidebar-open')}else document.body.classList.toggle('sidebar-collapse');return}
  if(e.target.classList.contains('sidebar-overlay')){document.body.classList.remove('sidebar-open');return}
  const tr=e.target.closest('[data-nv-tree]');if(tr){e.preventDefault();const li=tr.parentElement,ul=li.querySelector('.nav-treeview');const open=!li.classList.contains('menu-open');li.classList.toggle('menu-open',open);if(ul)ul.style.display=open?'block':'none';return}
  const fs=e.target.closest('[data-nv-fullscreen]');if(fs){e.preventDefault();if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();return}
  const tb=e.target.closest('[data-bs-theme-value]');if(tb){lsSet('bsTheme',tb.getAttribute('data-bs-theme-value'));route();return}
  const lo=e.target.closest('[data-nv-logout]');if(lo){e.preventDefault();if(Cloud.on){Cloud.signOut().then(ok=>{if(ok!==false)go('#admin/login')})}else{setAdmin(false);go('#admin/login')}return}
  const nl=e.target.closest('.app-sidebar a.nav-link[href^="#"]');if(nl&&window.innerWidth<992)document.body.classList.remove('sidebar-open');
});
/* NV10 — the reference lists live under «الإعدادات» as tabs */
function settingsTabs(active){const k=active.split('.')[0]==='asset-categories'?'asset-types':active.split('.')[0];if(k!=='settings'&&k!=='label'&&k!=='system'&&k!=='clients'&&k!=='releases'&&k!=='usage'&&k!=='guide'&&k!=='subscription'&&k!=='room-templates'&&k!=='approval-path'&&k!=='site-form'&&!LK[k])return '';
  const T=[...(docAllowed45('guide')?[['guide','bi-book','دليل المنصة']]:[]),...(docAllowed45('releases')?[['releases','bi-clock-history','الإصدارات والفحص']]:[]),...(isSys()?[['system','bi-shield-lock','إدارة النظام (Admin)'],['clients','bi-buildings','العملاء والاشتراكات'],['usage','bi-person-lines-fill','نشاط المستخدمين']]:Cloud.on?[['subscription','bi-patch-check','الاشتراك والاستخدام']]:[]),...(can('settings')?[['settings','bi-sliders','الإعدادات العامة'],['label','bi-qr-code','إعدادات الملصق']]:[]),['asset-types','bi-diagram-3','دليل الأصول'],['room-names','bi-door-open','أسماء الغرف'],...(can('settings')?[['site-form','bi-building-gear','نموذج بيانات المباني'],['room-templates','bi-ui-checks-grid','قوالب الغرف'],['approval-path','bi-signpost-split','مسار الاعتماد']]:[]),['asset-conditions','bi-shield-check','حالات الأصول']];
  return `<ul class="nav nav-pills nv-set-tabs flex-nowrap overflow-auto gap-1 mb-3 pb-1">${T.map(([id,ic,l])=>`<li class="nav-item"><a class="nav-link text-nowrap ${k===id?'active':''}" href="#admin/${id}"><i class="bi ${ic} me-1"></i>${l}</a></li>`).join('')}</ul>`}
const iconBtn=(href,icon,title)=>`<a href="${href}" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle"${title?` title="${title}"`:''}><i class="bi ${icon}"></i></a>`;

/* ---------- auth/login.blade.php ---------- */
function vAdminLogin(err,emv){if(Cloud.on)return vCloudLogin(err,emv);
  const first=!Cloud.on&&!(S.settings.admin_login&&S.settings.admin_login.hash);const rem=lsGet('nv_remember_admin','');
  authPage({kind:'admin',title:tx('دخول الإدارة','Admin sign-in'),err,
    sub:first?tx('أول دخول على هذا الجهاز: البريد وكلمة المرور اللذان تكتبهما الآن يصبحان دخول المدير هنا','First use on this device: the e-mail and password you enter become the admin sign-in here'):Cloud.on?tx('ادخل بحساب Solvix (البريد وكلمة المرور)','Sign in with your Solvix account'):tx('مرحباً بك، يرجى تسجيل الدخول للمتابعة','Welcome — please sign in to continue'),
    fields:[{id:'em',label:tx('البريد الإلكتروني','E-mail'),type:'email',icon:'bi-envelope',ph:tx('أدخل بريدك الإلكتروني','Enter your e-mail'),value:emv||(rem&&rem!=='1'?rem:'')||(Cloud.on?'':(S.settings.admin_login||{}).email||''),auto:'username',dir:'ltr',bad:1},
      {id:'pw',label:tx('كلمة المرور','Password'),type:'password',icon:'bi-lock',ph:tx('أدخل كلمة المرور','Enter your password'),auto:first?'new-password':'current-password',dir:'ltr',bad:1},
      ...(first?[{id:'pw2',label:tx('تأكيد كلمة المرور','Confirm password'),type:'password',icon:'bi-lock',ph:tx('أعد كتابة كلمة المرور','Repeat the password'),auto:'new-password',dir:'ltr'}]:[])],
    note:first?tx('البيانات تُحفظ في هذا المتصفح فقط.','The data is stored in this browser only.'):'',
    submit:first?tx('إنشاء الحساب والدخول','Create & sign in'):tx('دخول','Sign in'),rememberValue:()=>$('#em').value.trim().toLowerCase(),
    extra:Cloud.on?'':`<details class="sx-connect"><summary>${tx('ربط هذا الجهاز بقاعدة بيانات Solvix','Connect this device to the Solvix database')}</summary><input id="cf_url" placeholder="Project URL — https://xxxx.supabase.co" dir="ltr"><input id="cf_key" placeholder="Publishable / anon key" dir="ltr"><button type="button" id="cf_go">${tx('ربط','Connect')}</button></details>`,
    onSubmit:async()=>{const em=$('#em').value.trim().toLowerCase(),pw=$('#pw').value;
      if(Cloud.on){try{const me=await Cloud.signIn(em,pw);if(!me||(me.role!=='admin'&&me.role!=='reader')){await Cloud.signOut();return vAdminLogin(tx('هذا الحساب ليس له صلاحية على صفحات الإدارة.','This account has no access to the Solvix admin pages.'),em)}
          await Cloud.pull();return go('#admin')}
        catch(er){return vAdminLogin(/Invalid login/i.test(er.message)?tx('البريد أو كلمة المرور غير صحيحة.','These credentials do not match our records.'):er.message,em)}}
      if(first){if(pw.length<6)return vAdminLogin(tx('كلمة المرور 6 أحرف على الأقل.','The password must be at least 6 characters.'),em);if(pw!==$('#pw2').value)return vAdminLogin(tx('كلمتا المرور غير متطابقتين.','The passwords do not match.'),em);S.settings.admin_login={email:em,hash:await hashPin(em+'|'+pw)};await saveNow('settings')}
      else{const a=S.settings.admin_login;if(a.email!==em||a.hash!==await hashPin(em+'|'+pw))return vAdminLogin(tx('البريد أو كلمة المرور غير صحيحة.','These credentials do not match our records.'),em)}
      setAdmin(true);go('#admin')}});
  if($('#cf_go'))$('#cf_go').onclick=()=>{try{Cloud.setCfg({url:$('#cf_url').value,key:$('#cf_key').value});location.hash='#admin';location.reload()}catch(e){alert(e.message)}};
}

/* ---------- dashboard.blade.php ---------- */
/* ---------- collections/index.blade.php ---------- */
function collectionFilter(list,p){const q=norm(p.get('search')||''),emp=p.get('employee_id'),sch=p.get('school_id'),date=p.get('date'),status=p.get('status');const sst=schoolStats();
  return list.filter(c=>{if(emp&&c.employee_id!==emp)return false;if(sch&&c.school_id!==sch)return false;if(date&&!(c.submitted_at&&dayKey(c.submitted_at)===date))return false;const s=get('schools',c.school_id)||{};
    if(status&&schoolState(s,sst.get(c.school_id))!==status)return false;
    if(q){const r=get('rooms',c.room_name_id)||{};if(!(norm(s.name).includes(q)||norm(s.moe).includes(q)||norm(s.ident).includes(q)||norm(c.brand).includes(q)||norm(c.serial).includes(q)||(c.no&&assetLabel(c).includes(q))||norm(c.tag).includes(q)||norm(r.ar).includes(q)||norm(r.en).includes(q)))return false}return true})}
function bulkBarHTML(btns){return `<div id="bulk-actions-bar" class="bg-primary bg-opacity-10 border-bottom py-2 px-3 d-none"><div class="d-flex align-items-center justify-content-between"><div class="d-flex align-items-center gap-3"><span class="fw-bold text-primary small"><span id="selected-count">0</span> عنصر محدد</span><div class="vr"></div>${btns}</div><button type="button" class="btn-close small" style="font-size: 0.7rem;" id="desel"></button></div></div>`}
function reassignModal(title,text){return `<div class="modal fade" id="reassignModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog"><form id="reassign-form"><div class="modal-content shadow border-0"><div class="modal-header border-bottom-0 pb-0"><h5 class="modal-title fw-bold">${title}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button></div>
  <div class="modal-body py-4"><p class="text-muted small mb-4">${text}</p><div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase mb-1">مشرف الميدان المستلم</label><select name="new_employee_id" class="form-select shadow-none" required><option value="">-- اختر الموظف --</option>${S.employees.filter(e=>!e.archived).slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</select></div></div>
  <div class="modal-footer border-top-0 pt-0"><button type="button" class="btn btn-light border" data-bs-dismiss="modal">إلغاء</button><button type="submit" class="btn btn-primary px-4">نقل الآن</button></div></div></form></div></div>`}
function bindBulk(){const all=$('#select-all'),bar=$('#bulk-actions-bar');const upd=()=>{const n=$$('.row-checkbox:checked').length;bar.classList.toggle('d-none',!n);$('#selected-count').textContent=n};
  if(all)all.onchange=()=>{$$('.row-checkbox').forEach(c=>c.checked=all.checked);upd()};$$('.row-checkbox').forEach(c=>c.onchange=upd);$('#desel').onclick=()=>{$$('.row-checkbox').forEach(c=>c.checked=false);if(all)all.checked=false;bar.classList.add('d-none')};
  return ()=>$$('.row-checkbox:checked').map(c=>c.value)}
function hideModal(){const m=$('#reassignModal');if(m&&window.bootstrap)bootstrap.Modal.getOrCreateInstance(m).hide();$$('.modal-backdrop').forEach(b=>b.remove());document.body.classList.remove('modal-open');document.body.style.removeProperty('overflow');document.body.style.removeProperty('padding-right')}
async function removeCollections(list){return trashCollections(list)}
const stampDash=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`};

/* ---------- collections/view.blade.php ---------- */
/* ---------- collections/show.blade.php ---------- */
function vCollectionShow(id){
  const c=S.collections.find(x=>x.id===id);if(!c){go('#admin/collections');return}const e=get('employees',c.employee_id),s=get('schools',c.school_id),r=get('rooms',c.room_name_id);
  const hist=S.log.filter(l=>l.coll===id);const hasLL=c.lat!=null&&c.lng!=null;
  const row=(k,v)=>`<tr><th${k==='الموظف'?' style="width:40%"':''}>${k}</th><td>${v}</td></tr>`;
  adminShell('collections','سجل جرد #'+(c.no||''),`<div class="row"><div class="col-md-6"><div class="card"><div class="card-header"><h3 class="card-title">تفاصيل السجل</h3></div><div class="card-body"><table class="table table-bordered">
   ${row('الموظف',esc(e?e.name:'غير محدد'))}${row('الرقم الوظيفي',esc(e?e.number:'غير محدد'))}${row('المبنى',esc(s?s.name:'غير محدد'))}${row('معرّف المبنى',esc(s?s.ident:'غير محدد'))}${row('الدور',esc(c.floor||''))}${row('رقم الغرفة',esc(c.room_number||''))}${row('اسم الغرفة',esc(r?r.ar:'غير محدد'))}
   ${row('خط العرض',esc(c.lat??'--'))}${row('خط الطول',esc(c.lng??'--'))}${row('ملاحظات',esc(c.notes||'--'))}${row('مراجعة الصور',c.review_status==='ok'?'<span class="badge text-bg-success">معتمد</span>':c.review_status==='returned'?`<span class="badge text-bg-danger">مُرجع</span> <small>${esc(c.review_note||'')}</small>`:'<span class="badge text-bg-warning">بانتظار المراجعة</span>')}${row('بُعد التصوير عن المبنى',c.geo_dist!=null?`<span class="${c.geo_dist>geoCfg().m?'text-danger fw-bold':''}">${fmtDist(c.geo_dist)}</span>`:'--')}
   ${row('اعتماد الجرد',`<a href="#admin/approvals?asset=${encodeURIComponent(c.id)}">عرض مسار الاعتماد وقراراته</a>`)}${row('الحالة',c.submitted_at?`<span class="badge text-bg-success">مُرسل</span><small class="text-muted ms-2">${fmtYmd(c.submitted_at)}</small>`:'<span class="badge text-bg-warning">معلّق</span>')}${row('تاريخ الإنشاء',fmtYmd(c.created_at))}</table></div></div></div>
  <div class="col-md-6"><div class="card"><div class="card-header"><h3 class="card-title">صورة المبنى</h3></div><div class="card-body text-center">${c.school_image?`<img data-photo="${esc(c.school_image)}" alt="صورة المبنى" class="img-fluid rounded shadow-sm cursor-pointer" style="max-height: 300px; cursor: zoom-in;">`:'<p class="text-muted">لا توجد صورة.</p>'}</div></div>
   <div class="card mt-3"><div class="card-header"><h3 class="card-title">صور الأصل من موقعه</h3></div><div class="card-body"><div class="row g-2 text-center">${[['asset_image','الأصل كاملاً في مكانه'],['asset_image2','لوحة البيانات / الرقم التسلسلي']].map(([k,l])=>`<div class="col-6"><div class="small fw-bold text-muted mb-1">${l}</div>${c[k]?`<img data-photo="${esc(c[k])}" alt="${l}" class="img-fluid rounded shadow-sm" style="max-height:260px;cursor:zoom-in">`:'<div class="border rounded py-5 small text-muted">لا توجد صورة</div>'}</div>`).join('')}${(c.extra_images||[]).length?`<div class="col-12 small fw-bold text-muted mt-2">صور إضافية (${c.extra_images.length})</div>${c.extra_images.map(k=>`<div class="col-4 col-md-3"><img data-photo="${esc(k)}" alt="صورة إضافية" class="img-fluid rounded shadow-sm" style="aspect-ratio:1;object-fit:cover;cursor:zoom-in"></div>`).join('')}`:''}</div></div></div>
   ${labelPanel(c)}
   <div class="card mt-3"><div class="card-header d-flex justify-content-between align-items-center"><h3 class="card-title">ملصق الأصل</h3>${c.type_id?'<button type="button" class="btn btn-sm btn-dark ms-auto" id="lbl1"><i class="bi bi-printer me-1"></i>طباعة</button>':''}</div><div class="card-body d-flex align-items-center gap-3"><div id="qr1" style="width:120px;height:120px"></div><div><div class="small text-muted">رقم الملصق</div><div class="fs-4 fw-bold font-monospace">${esc(assetLabel(c)||'—')}</div></div></div></div>
   <div class="card mt-3"><div class="card-header"><h3 class="card-title">خريطة موقع الأصل</h3></div><div class="card-body p-2">${hasLL?'<div id="location-map"></div>':'<p class="text-muted text-center py-4">لا توجد بيانات موقع.</p>'}</div></div></div></div>
  <div class="card"><div class="card-header"><h3 class="card-title">تفاصيل الأصل</h3>${(()=>{const ty=get('types',c.type_id);return ty&&ty.code?`<div class="small mt-1">${esc(typeLevels(ty))} · <span class="font-monospace" dir="ltr">${esc(ty.code)}</span> · ${ty.critical?'<span class="badge text-bg-danger">حرج</span>':'<span class="badge text-bg-light border">غير حرج</span>'}</div>`:''})()}</div><div class="card-body table-responsive p-0"><table class="table table-striped"><thead><tr>${['المستوى الأول','وصف الأصل','الكمية','السعر','الشركة المصنعة','الماركة','الموديل','السعة','الرقم التسلسلي','رقم ASAD','الحالة الفنية','الإرسال','تاريخ الإرسال'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>
   ${c.type_id?`<tr><td>${esc((get('categories',c.category_id)||{}).ar||'--')}</td><td>${esc((get('types',c.type_id)||{}).ar||'--')}</td><td><span class="badge text-bg-secondary">${num(c.quantity)}</span></td><td>${c.price?Number(c.price).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'--'}</td><td>${esc(c.manufacturer||'--')}</td><td>${esc(c.brand||'--')}</td><td>${esc(c.model||'--')}</td><td>${esc(c.capacity||'--')}</td><td>${esc(c.serial||'--')}</td><td>${esc(c.tag||'--')}</td>
    <td>${c.condition_id?`<span class="badge text-bg-info">${esc((get('conditions',c.condition_id)||{}).ar||'')}</span>`:'--'}</td><td>${c.submitted_at?'<span class="badge text-bg-success">مُرسل</span>':'<span class="badge text-bg-warning">معلّق</span>'}</td><td>${c.submitted_at?fmtYmd(c.submitted_at):'--'}</td></tr>`:emptyRow(13,'bi-box-seam','لا توجد أصول مسجلة')}</tbody></table></div></div>
  <div class="row"><div class="col-md-12"><div class="card"><div class="card-header"><h3 class="card-title">معلومات إضافية</h3></div><div class="card-body"><div class="row">
   <div class="col-md-4"><p><strong>الوكيل (إن وجد):</strong> ${esc(c.agency||'--')}</p><p><strong>الضمان (إن وجد):</strong> ${esc(c.warranty||'--')}</p></div>
   <div class="col-md-4"><p><strong>تاريخ التركيب:</strong> ${esc(c.install_date||'--')}</p><p><strong>Tag Number:</strong> <span class="font-monospace fw-bold">${esc(assetLabel(c)||'--')}</span></p></div>
   <div class="col-md-4"><p><strong>أصل رئيسي أو فرعي:</strong> ${esc(c.parent_child||'--')}</p></div></div></div></div></div></div>
  ${hist.length?`<div class="card"><div class="card-header"><h3 class="card-title">سجل التعديلات (${hist.length})</h3></div><div class="card-body table-responsive p-0">${logTable(hist)}</div></div>`:''}
  <a href="#admin/collections" class="btn btn-secondary mt-3">العودة إلى أعمال الجرد</a>`);
  $$('img[data-photo]').forEach(i=>i.onclick=()=>window.open(i.src,'_blank'));
  needQR().then(()=>{const el=$('#qr1');if(el)el.innerHTML=qrSvg(qrText(c))}).catch(()=>{});if($('#lbl1'))$('#lbl1').onclick=()=>printLabels([c],s?s.name:'');
  if(hasLL)needLeaflet().then(()=>{if(!$('#location-map'))return;const m=L.map('location-map').setView([+c.lat,+c.lng],16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors'}).addTo(m);L.marker([+c.lat,+c.lng]).addTo(m).bindPopup(esc(s?s.name:'')).openPopup()}).catch(()=>{leafP=null});
}

/* ---------- collections/edit.blade.php ---------- */
function vCollectionEdit(id){
  const c=S.collections.find(x=>x.id===id);if(!c){go('#admin/collections');return}
  const opt=(list,sel,lbl)=>list.map(x=>`<option value="${esc(x.id)}" ${sel===x.id?'selected':''}>${lbl(x)}</option>`).join('');
  const byAr=(a,b)=>(a.ar||a.name||'').localeCompare(b.ar||b.name||'','ar');
  adminShell('collections','تعديل سجل الجرد',`<div class="row justify-content-center"><div class="col-md-8"><div class="card"><div class="card-header"><h3 class="card-title">تعديل سجل الجرد</h3></div><form id="f"><div class="card-body">
  <div class="row"><div class="col-md-6 mb-3"><label class="form-label">الموظف</label><select name="employee_id" class="form-select" required>${opt(S.employees.filter(e=>!e.archived).slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')),c.employee_id,e=>`${esc(e.name)} (${esc(e.number)})`)}</select></div>
   <div class="col-md-6 mb-3"><label class="form-label">المبنى</label><select name="school_id" class="form-select" required>${opt(S.schools.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')),c.school_id,s=>`${esc(s.name)} (${esc(s.ident)})`)}</select></div></div>
  <div class="row"><div class="col-md-4 mb-3"><label class="form-label">الدور</label><input type="text" name="floor" value="${esc(c.floor||'')}" class="form-control" required></div>
   <div class="col-md-4 mb-3"><label class="form-label">رقم الغرفة</label><input type="text" name="room_number" value="${esc(c.room_number||'')}" class="form-control" required></div>
   <div class="col-md-4 mb-3"><label class="form-label">اسم الغرفة</label><select name="room_name_id" class="form-select" required><option value="">اختر...</option>${opt(S.rooms.slice().sort(byAr),c.room_name_id,r=>esc(r.ar))}</select></div></div><hr>
  <div class="row"><div class="col-md-6 mb-3"><label class="form-label">الفئة</label><select name="category_id" id="asset_category_id" class="form-select"><option value="">-- اختر الفئة --</option>${opt(S.categories.slice().sort(byAr),c.category_id,x=>esc(x.ar))}</select></div>
   <div class="col-md-6 mb-3"><label class="form-label">نوع الأصل</label><select name="type_id" id="asset_type_id" class="form-select"><option value="">-- اختر النوع --</option>${opt(S.types.filter(x=>x.cat===c.category_id).sort(byAr),c.type_id,x=>esc(x.ar))}</select></div></div>
  <div class="row"><div class="col-md-3 mb-3"><label class="form-label">الكمية</label><input type="number" name="quantity" value="${esc(c.quantity??0)}" class="form-control" required min="0"></div>
   <div class="col-md-3 mb-3"><label class="form-label">السعر</label><input type="number" step="0.01" name="price" value="${esc(c.price??'')}" class="form-control"></div>
   <div class="col-md-4 mb-3"><label class="form-label">الماركة</label><input type="text" name="brand" value="${esc(c.brand||'')}" class="form-control"></div></div>
  <div class="row"><div class="col-md-6 mb-3"><label class="form-label">الرقم التسلسلي</label><input type="text" name="serial" value="${esc(c.serial||'')}" class="form-control"><label class="form-label mt-2">رقم الأصل الخارجي (اختياري)</label><input name="tag" value="${esc(c.tag||'')}" class="form-control" maxlength="256"></div><div class="col-md-6 mb-3"><label class="form-label">Tag Number <small class="text-muted">(ثابت من النظام)</small></label><input type="text" value="${esc(assetLabel(c)||'')}" class="form-control font-monospace" readonly disabled></div></div>
  <div class="mb-3"><label class="form-label">ملاحظات</label><textarea name="notes" class="form-control" rows="3">${esc(c.notes||'')}</textarea></div></div>
  <div class="card-footer text-end"><a href="#admin/collections/view/${encodeURIComponent(c.employee_id)}/${encodeURIComponent(c.school_id)}" class="btn btn-secondary">إلغاء</a> <button type="submit" class="btn btn-primary">حفظ التعديل</button></div></form></div></div></div>`);
  if(window.L44)l44LockLocation($('#f'),c);
  $('#asset_category_id').onchange=function(){const ts=S.types.filter(x=>x.cat===this.value).sort(byAr);$('#asset_type_id').innerHTML='<option value="">-- اختر النوع --</option>'+ts.map(x=>`<option value="${esc(x.id)}">${esc(x.ar)}</option>`).join('')};
  $('#f').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const old=Object.assign({},c);
    const v={employee_id:fd.get('employee_id'),school_id:fd.get('school_id'),floor:fd.get('floor').trim(),room_number:fd.get('room_number').trim(),room_name_id:fd.get('room_name_id'),category_id:fd.get('category_id')||null,type_id:fd.get('type_id')||null,
      quantity:Math.max(0,Math.round(num(fd.get('quantity')))),price:fd.get('price')===''?null:num(fd.get('price')),brand:fd.get('brand').trim(),serial:fd.get('serial').trim(),tag:fd.get('tag').trim(),notes:fd.get('notes').trim()};
    if(c.submitted_at)for(const k of ['school_id','floor','room_number','room_name_id'])v[k]=c[k]??null;
    if(!await duplicatePreflight([{...c,...v}]))return;
    Object.assign(c,v,{updated_at:now()});logChange(c,'admin',diff(old,c,TRACK.concat(['employee_id','school_id'])));save('collections');
    setAFlash('تم تحديث السجل.');go(`#admin/collections/view/${encodeURIComponent(c.employee_id)}/${encodeURIComponent(c.school_id)}`)};
}

/* ---------- schools/index.blade.php ---------- */

/* ---------- generic create/edit form (schools, employees, categories, types, conditions, rooms) ---------- */
function crudForm(active,title,fields,rec,onSave,cancelHref){
  adminShell(active,title,`<div class="row"><div class="col-md-8 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">${title}</h3></div><form id="f" novalidate><div class="card-body">
  ${fields.map(f=>`<div class="mb-3"><label for="${f.k}" class="form-label">${esc(f.l)}${f.req?' <span class="text-danger">*</span>':''}</label>${f.type==='select'?`<select name="${f.k}" id="${f.k}" class="form-select" ${f.req?'required':''}>${f.blank?`<option value="">${f.blank}</option>`:''}${f.opts.map(([v,l])=>`<option value="${esc(v)}" ${String(rec[f.k]??'')===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`
    :f.type==='textarea'?`<textarea name="${f.k}" id="${f.k}" rows="3" class="form-control">${esc(rec[f.k]||'')}</textarea>`:f.type==='list'?`<input type="text" name="${f.k}" id="${f.k}" list="dl_${f.k}" class="form-control" autocomplete="off" value="${esc(f.get?f.get(rec):rec[f.k]??'')}" ${f.req?'required':''}><datalist id="dl_${f.k}">${f.opts.map(([v])=>`<option value="${esc(v)}">`).join('')}</datalist><div class="form-text">اختر من القائمة أو اكتب قيمة جديدة.</div>`:`<input type="${f.type==='number'||f.type==='date'?f.type:'text'}"${f.type==='number'?' step="any" inputmode="decimal"':''} name="${f.k}" id="${f.k}" class="form-control" value="${esc(rec[f.k]??'')}" ${f.req?'required':''}>`}<div class="invalid-feedback" data-err="${f.k}"></div></div>`).join('')}
  </div><div class="card-footer"><button type="submit" class="btn btn-primary">حفظ</button> <a href="${cancelHref}" class="btn btn-secondary">إلغاء</a></div></form></div></div></div>`);
  $('#f').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);const v={};$$('.is-invalid').forEach(x=>x.classList.remove('is-invalid'));let bad=false;
    for(const f of fields){v[f.k]=String(fd.get(f.k)||'').trim();if(f.req&&!v[f.k]){bad=true;$('#'+f.k).classList.add('is-invalid');$(`[data-err="${f.k}"]`).textContent=`حقل «${f.l}» مطلوب.`}}
    if(bad)return;const err=onSave(v);if(err){$('#'+err[0]).classList.add('is-invalid');$(`[data-err="${err[0]}"]`).textContent=err[1]}}}
/* NV46 — «نموذج بيانات المباني»: each customer (its own database) shows / hides / renames the built-in building fields
   and adds its own fields. S.settings.site = {fields:{key:{on,l}}, extra:[{k,l,t:'text'|'number'|'date'|'select',opts,req}]}
   (synced in nv_settings.data.site); the values of the own fields live in nv_schools.extra {k: value}. */
const SITE_F=[['ident','معرّف المبنى',1],['name','اسم المبنى',1],['moe','رقم المبنى'],['site','الموقع (Site)'],['district','الحي / المكتب'],['city','المحافظة'],['geo','إحداثيات المبنى'],['description','الوصف']];
const SITE_XT={text:'نص',number:'رقم',date:'تاريخ',select:'قائمة اختيار'};
/* names are shown in table headers and forms, so markup characters are dropped */
const siteName=v=>String(v==null?'':v).replace(/[<>&"`]/g,'').trim().slice(0,60);
function siteCfg(){const s=S.settings.site||{};const f={};for(const [k,l,fix] of SITE_F){const x=(s.fields||{})[k]||{};f[k]={on:fix?true:x.on!==false,l:siteName(x.l)||l}}
  return {f,extra:(Array.isArray(s.extra)?s.extra:[]).filter(x=>x&&/^[a-z0-9_]{1,24}$/i.test(x.k)&&siteName(x.l)).map(x=>({k:x.k,l:siteName(x.l),t:SITE_XT[x.t]?x.t:'text',opts:String(x.opts||''),req:!!x.req}))}}
const siteOpts=x=>String(x.opts||'').split(/[,،]/).map(o=>o.trim()).filter(Boolean);
const siteVal=(s,x)=>{const v=(s.extra||{})[x.k];return v==null?'':String(v)};
/* NV47: required own fields left empty (e.g. a field made required after the buildings were added) */
const siteMissing=(s,C)=>(C||siteCfg()).extra.filter(x=>x.req&&siteVal(s,x).trim()==='');
function vSchoolForm(id){const isNew=!id;const s=isNew?{status:'active'}:get('schools',id);if(!s){go('#admin/schools');return}const C=siteCfg(),F=C.f;
  const fields=[{k:'ident',l:F.ident.l,req:1},{k:'name',l:F.name.l,req:1}];
  for(const k of ['moe','site','district','city'])if(F[k].on)fields.push({k,l:F[k].l});
  fields.push({k:'status',l:'الحالة',req:1,type:'select',opts:[['active','نشطة'],['inactive','غير نشطة']]});
  if(F.geo.on)fields.push({k:'geo',l:F.geo.l+' (خط العرض، خط الطول) — انسخها من خرائط Google، مثل: 26.3301, 43.9712'});
  for(const x of C.extra)fields.push({k:'x_'+x.k,l:x.l,req:x.req?1:0,type:x.t==='select'?'select':x.t==='number'||x.t==='date'?x.t:undefined,blank:x.t==='select'?'—':undefined,
    opts:x.t==='select'?[...new Set(siteOpts(x).concat(siteVal(s,x)?[siteVal(s,x)]:[]))].map(o=>[o,o]):undefined});
  if(F.description.on)fields.push({k:'description',l:F.description.l,type:'textarea'});
  const rec=Object.assign({},s,{geo:s.lat!=null&&s.lat!==''?`${s.lat}, ${s.lng}`:''});for(const x of C.extra)rec['x_'+x.k]=siteVal(s,x);
  crudForm(isNew?'schools.create':'schools.edit',isNew?'إضافة مبنى':'تعديل مبنى',fields,rec,v=>{
    if(S.schools.some(x=>x.ident===v.ident&&x!==s))return ['ident','هذا المعرّف مستخدم لمبنى آخر.'];
    if('geo' in v){const g=parseGeo(v.geo);delete v.geo;if(g===false)return ['geo','اكتب خط العرض ثم خط الطول مفصولين بفاصلة، مثل 26.3301, 43.9712'];v.lat=g?g[0]:null;v.lng=g?g[1]:null}
    const nx=Object.assign({},s.extra||{});for(const x of C.extra){const val=v['x_'+x.k];delete v['x_'+x.k];if(x.t==='number'&&val!==''&&isNaN(+val))return ['x_'+x.k,'اكتب رقماً.'];if(val==='')delete nx[x.k];else nx[x.k]=x.t==='number'?String(+val):val}v.extra=nx;
    Object.assign(s,v);if(isNew){Object.assign(s,{id:nextId('schools','s'),completed_at:null,completed_by:null,created_at:now()});S.schools.push(s)}reindex();save('schools');setAFlash(isNew?'تمت إضافة المبنى.':'تم تحديث المبنى.');go('#admin/schools')},'#admin/schools')}
/* the buildings table follows the form: hidden built-in columns go, names change, the own fields become columns */
function siteTable(cols){const C=siteCfg();const out=cols.filter(c=>!(['moe','city','district','site'].includes(c.k)&&!C.f[c.k].on)).map(c=>C.f[c.k]&&c.k!=='ident'?Object.assign({},c,{l:C.f[c.k].l.replace(/ \(Site\)$/,'')}):c);
  const at=out.findIndex(c=>c.k==='emp');out.splice(at<0?out.length:at,0,...C.extra.map(x=>({k:'x_'+x.k,l:x.l,w:'110px',filter:x.t==='select'?'select':undefined,cls:x.t==='number'?'num':''})));
  if(C.extra.some(x=>x.req)){const n=out.findIndex(c=>c.k==='name');out.splice(n+1,0,{k:'miss',l:'اكتمال البيانات',w:'120px',filter:'select',v:r=>r.miss&&r.miss.length?'ناقصة':'مكتملة',
    html:r=>r.miss&&r.miss.length?`<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle" title="${esc('ينقص: '+r.miss.map(x=>x.l).join('، '))}"><i class="bi bi-exclamation-circle"></i> ناقصة (${r.miss.length})</span>`:'<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check2"></i> مكتملة</span>'})}
  return out}
/* the own fields read from an imported file: the column header is the field's name */
function siteExtraPick(r,s){const C=siteCfg();let any=false;const o=Object.assign({},s&&s.extra||{});for(const x of C.extra){const v=x.l in r?String(r[x.l]).trim():'';if(v!==''){o[x.k]=v;any=true}}return any?o:null}

/* ---------- employees ---------- */
/* technicians' sign-in (cloud): employee number + a password set here */
const genPw=()=>{const a=new Uint32Array(2);crypto.getRandomValues(a);return String(10000000+a[0]%90000000)};
function vEmployeeForm(id){const isNew=!id;const e=isNew?{}:get('employees',id);if(!e){go('#admin/employees');return}
  const oldEm=e.email||'';
  crudForm(isNew?'employees.create':'employees.edit',isNew?'إضافة مشرف ميدان':'تعديل مشرف ميدان',[{k:'number',l:'الرقم الوظيفي',req:1},{k:'name',l:'الاسم',req:1},{k:'email',l:'البريد الإلكتروني (للدخول واستعادة كلمة المرور)',req:Cloud.on?1:0}],e,v=>{
    v.email=(v.email||'').trim().toLowerCase()||null;if(v.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email))return ['email','البريد الإلكتروني غير صحيح.'];
    if(v.email&&S.employees.some(x=>x!==e&&(x.email||'').toLowerCase()===v.email))return ['email','هذا البريد مستخدم لمشرف آخر.'];
    if(S.employees.some(x=>String(x.number)===v.number&&x!==e))return ['number','هذا الرقم الوظيفي مستخدم لموظف آخر.'];
    Object.assign(e,v);if(isNew){Object.assign(e,{id:nextId('employees','e'),created_at:now()});S.employees.push(e)}reindex();save('employees');
    (async()=>{if(Cloud.on&&!isNew&&v.email&&v.email!==oldEm){try{await Cloud.sync();const c=await Cloud.sb();const r=Cloud.chk(await c.rpc('nv_emp_sync_email',{p_emp:e.id}));if(r)setAFlash(`تم التحديث. صار دخول ${e.name} بالبريد ${r}.`)}catch(er){setAFlash('تم حفظ البيانات، لكن لم يُنقل حساب الدخول للبريد الجديد: '+er.message,'warning')}}else setAFlash(isNew?'تمت إضافة مشرف الميدان.':'تم تحديث مشرف الميدان.');go('#admin/employees')})()},'#admin/employees')}

/* ---------- lookups: asset categories / types / conditions / room names ---------- */
const LK={
 'asset-categories':{t:'categories',one:'الفئة',p:'c',title:'فئات الأصول',icon:'bi-tags',add:'إضافة فئة',create:'إضافة فئة',edit:'تعديل فئة',ph:'ابحث في الفئات...',empty:'لا توجد فئات.',headSearch:true,
   fields:()=>[{k:'ar',l:'الاسم بالعربية',req:1},{k:'en',l:'الاسم بالإنجليزية',req:1}],cols:[['ar','الاسم بالعربية'],['en','الاسم بالإنجليزية'],['types_count','أنواع الأصول']],uniq:x=>x.ar+'|'+x.en},
 'asset-types':{t:'types',one:'الأصل',p:'t',title:'دليل الأصول',icon:'bi-diagram-3',add:'إضافة أصل للدليل',create:'إضافة أصل للدليل',edit:'تعديل أصل في الدليل',ph:'الوصف أو الكود أو المستوى...',empty:'الدليل فارغ.',
   fields:()=>{const u=f=>[...new Set(S.types.map(f).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')).map(x=>[x,x]);return [{k:'l1',l:'المستوى الأول',req:1,type:'list',opts:S.categories.map(c=>[c.ar,c.ar]),get:x=>(get('categories',x.cat)||{}).ar||''},{k:'l2',l:'المستوى الثاني',req:1,type:'list',opts:u(t=>t.l2)},{k:'l3',l:'المستوى الثالث',req:1,type:'list',opts:u(t=>t.l3)},{k:'ar',l:'وصف الأصل الموحد (المستوى الرابع)',req:1},{k:'code',l:'كود الأصل'},{k:'critical',l:'التصنيف',type:'select',opts:[['false','غير حرج'],['true','حرج']]},{k:'en',l:'الاسم بالإنجليزية'}]},
   cols:[['code','الكود'],['asset_category_id','المستوى الأول'],['levels','المستوى الثاني › الثالث'],['ar','وصف الأصل'],['critical','التصنيف']],uniq:x=>x.code?'code|'+x.code:x.cat+'|'+norm(x.ar),
   fix:v=>{v.critical=v.critical==='true';const n=norm(v.l1);const c=S.categories.find(x=>norm(x.ar)===n);v.cat=c?c.id:'__new';v._l1=v.l1;delete v.l1;if(v.code&&!/^\d{6,}$/.test(v.code))return ['code','الكود أرقام فقط (6 أرقام على الأقل).'];if(!v.code)v.code=null}},
 'asset-conditions':{t:'conditions',one:'الحالة',p:'k',title:'حالات الأصول',icon:'bi-shield-check',add:'إضافة حالة',create:'إضافة حالة',edit:'تعديل حالة',ph:'ابحث في الحالات...',empty:'لا توجد حالات.',headSearch:true,del:true,
   fields:()=>[{k:'ar',l:'الاسم بالعربية',req:1},{k:'en',l:'الاسم بالإنجليزية'}],cols:[['ar','الاسم بالعربية'],['en','الاسم بالإنجليزية']],uniq:x=>x.ar},
 'room-names':{t:'rooms',one:'اسم الغرفة',p:'r',title:'أسماء الغرف',icon:'bi-door-open',add:'إضافة اسم غرفة',create:'إضافة اسم غرفة',edit:'تعديل اسم غرفة',ph:'اسم الغرفة...',empty:'لا توجد أسماء غرف.',
   fields:()=>[{k:'en',l:'الاسم بالإنجليزية',req:1},{k:'ar',l:'الاسم بالعربية',req:1}],cols:[['ar','الاسم بالعربية'],['en','الاسم بالإنجليزية']],uniq:x=>x.en+'|'+x.ar}};
function vLookup(key){if(key==='asset-categories')return go('#admin/asset-types');if(key==='asset-types')return vCatalog();const L=LK[key];const p=qp();const q=norm(p.get('search')||''),cat=p.get('category_id');
  let list=S[L.t].filter(x=>(!q||norm(x.ar).includes(q)||norm(x.en).includes(q)||String(x.code||'').includes(q)||norm(x.l2).includes(q)||norm(x.l3).includes(q))&&(!cat||x.cat===cat)&&(p.get('crit')!=='1'||x.critical));
  const tc=id=>S.types.filter(t=>t.cat===id).length;
  list=sorted(list,{id:x=>num(dispId(x.id)),name_ar:x=>x.ar,name_en:x=>x.en,asset_category_id:x=>(get('categories',x.cat)||{}).ar,types_count:x=>tc(x.id),code:x=>x.code||'',levels:x=>(x.l2||'')+'|'+(x.l3||''),critical:x=>x.critical?0:1},'name_ar','asc');const pg=paginate(list);
  const sk={ar:'name_ar',en:'name_en'};const any=p.get('search')||cat;
  const head=L.headSearch?`<form class="input-group input-group-sm d-none d-md-flex" style="width: 250px;" data-search><span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span><input type="text" name="search" class="form-control border-start-0 shadow-none" placeholder="${L.ph}" value="${esc(p.get('search')||'')}">${p.get('search')?`<a href="#admin/${key}" class="btn btn-outline-danger border-start-0"><i class="bi bi-x-lg"></i></a>`:''}</form><button class="btn btn-light border btn-sm d-md-none" type="button" data-bs-toggle="collapse" data-bs-target="#searchCollapse"><i class="bi bi-search"></i></button>`
    :`<button class="btn btn-light border btn-sm d-md-none" type="button" data-bs-toggle="collapse" data-bs-target="#filterCollapse"><i class="bi bi-funnel"></i></button>`;
  const filt=L.headSearch?`<div class="collapse d-md-none border-bottom bg-light-subtle" id="searchCollapse"><div class="card-body py-3"><form class="row g-2" data-search><div class="col-12"><div class="input-group input-group-sm"><span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span><input type="text" name="search" class="form-control border-start-0 shadow-none" placeholder="بحث..." value="${esc(p.get('search')||'')}"></div></div><div class="col-12 d-flex gap-2"><button type="submit" class="btn btn-sm btn-dark w-100">بحث</button>${any?`<a href="#admin/${key}" class="btn btn-sm btn-outline-danger w-100">إعادة ضبط</a>`:''}</div></form></div></div>`
    :`<div class="collapse d-md-block border-bottom bg-light-subtle" id="filterCollapse"><div class="card-body py-3"><form class="row g-3" data-search><div class="col-12 col-md-4"><label class="form-label small fw-bold text-muted mb-1">بحث</label><div class="input-group input-group-sm"><span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span><input type="text" name="search" class="form-control border-start-0 shadow-none" placeholder="${L.ph}" value="${esc(p.get('search')||'')}"></div></div>
      ${key==='asset-types'?`<div class="col-12 col-md-4"> <label class="form-label small fw-bold text-muted mb-1">المستوى الأول</label><select name="category_id" class="form-select form-select-sm shadow-none" data-autosubmit><option value="">الكل</option>${S.categories.slice().sort((a,b)=>a.ar.localeCompare(b.ar,'ar')).map(c=>`<option value="${esc(c.id)}" ${cat===c.id?'selected':''}>${esc(c.ar)}</option>`).join('')}</select></div>`:''}
      <div class="col-12 col-md-4 d-flex align-items-end gap-2"><button type="submit" class="btn btn-sm btn-dark px-3 w-100 w-md-auto">تصفية</button>${any?`<a href="#admin/${key}" class="btn btn-sm btn-outline-danger px-3 w-100 w-md-auto" title="إعادة ضبط"><i class="bi bi-arrow-counterclockwise"></i></a>`:''}</div></form></div></div>`;
  const cell=(x,c)=>c==='code'?`<td class="font-monospace small" dir="ltr">${esc(x.code||'—')}</td>`:c==='levels'?`<td class="small text-muted">${esc([x.l2,x.l3].filter(Boolean).join(' › ')||'—')}</td>`:c==='critical'?`<td>${x.critical?'<span class="badge text-bg-danger">حرج</span>':'<span class="badge text-bg-light border">غير حرج</span>'}</td>`:c==='ar'?`<td class="fw-medium">${esc(x.ar)}</td>`:c==='en'?`<td class="text-muted">${esc(x.en||'')}</td>`:c==='types_count'?`<td class="text-center"><span class="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3">${tc(x.id)}</span></td>`:`<td><span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2">${esc((get('categories',x.cat)||{}).ar||'غير محدد')}</span></td>`;
  adminShell(key,L.title,`<div class="card shadow-sm border-0 mb-4"><div class="card-header bg-white py-3"><div class="d-flex align-items-center justify-content-between"><div><h3 class="card-title fw-bold mb-0 text-dark"><i class="bi ${L.icon} me-2 text-primary"></i>${L.title}</h3></div>
   <div class="d-flex gap-2">${head}<a href="#admin/${key}/create" class="btn btn-primary btn-sm d-flex align-items-center gap-1"><i class="bi bi-plus-lg"></i><span class="d-none d-sm-inline">${L.add}</span></a></div></div></div>${filt}
  ${key==='asset-types'?catalogBar():''}
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3" style="width: 100px;">${sortA('id','#')}</th>${L.cols.map(([c,l])=>`<th${c==='types_count'?' class="text-center"':''}>${sortA(sk[c]||c,l,c==='ar'?'name_ar':null,'asc')}</th>`).join('')}<th class="text-end pe-3">إجراءات</th></tr></thead><tbody>
  ${pg.items.map(x=>`<tr><td class="ps-3 text-muted">${esc(dispId(x.id))}</td>${L.cols.map(([c])=>cell(x,c)).join('')}<td class="text-end pe-3"><div class="d-flex justify-content-end gap-2">${iconBtn(`#admin/${key}/${encodeURIComponent(x.id)}/edit`,'bi-pencil text-warning')}${L.del?`<button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-del="${esc(x.id)}"><i class="bi bi-trash text-danger"></i></button>`:''}</div></td></tr>`).join('')||emptyRow(L.cols.length+2,L.icon,L.empty)}
  </tbody></table></div></div>${pg.footer}</div>`);
  $$('[data-search]').forEach(f=>{const sub=()=>{const fd=new FormData(f);location.hash=withQuery({search:fd.get('search')||null,category_id:fd.get('category_id')||null,page:null})};f.onsubmit=e=>{e.preventDefault();sub()};$$('[data-autosubmit]',f).forEach(s=>s.onchange=sub)});
  $$('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('هل أنت متأكد؟'))return;const id=b.dataset.del;if(S.collections.some(c=>c.condition_id===id)){setAFlash('هذه الحالة مستخدمة في أصول مجرودة ولا يمكن حذفها.','danger');return vLookup(key)}S[L.t]=S[L.t].filter(x=>x.id!==id);reindex();save(L.t);setAFlash('تم حذف الحالة.');vLookup(key)});
}
function vLookupForm(key,id){if(key==='asset-categories')return go('#admin/asset-types');const L=LK[key];const isNew=!id;const x=isNew?{cat:qp().get('category_id')||''}:get(L.t,id);if(!x){go('#admin/'+key);return}
  crudForm(key+(isNew?'.create':'.edit'),isNew?L.create:L.edit,L.fields(),x,v=>{if(L.fix){const er=L.fix(v);if(er)return er}if(v.code&&S[L.t].some(y=>y!==x&&y.code===v.code))return ['code','هذا الكود مستخدم لأصل آخر.'];
    if(S[L.t].some(y=>y!==x&&L.uniq(y)===L.uniq(v)))return [L.t==='types'?'ar':L.fields()[L.fields().length-1].k,'هذا العنصر موجود بالفعل.'];
    if(v.cat==='__new'){const c={id:nextId('categories','c'),ar:v._l1,en:''};S.categories.push(c);save('categories');v.cat=c.id}delete v._l1;
    Object.assign(x,v);if(isNew){x.id=v.code?'a'+v.code:nextId(L.t,L.p);S[L.t].push(x)}reindex();save(L.t);setAFlash((isNew?'تمت إضافة ':'تم تحديث ')+L.one+'.');go('#admin/'+key)},'#admin/'+key)}

/* ---------- settings/index.blade.php ---------- */
function vSettings(){if(!can('settings'))return go('#admin/asset-types');
  adminShell('settings','الإعدادات',`${isSys()?'<p><a class="btn btn-outline-primary" href="#admin/system">صلاحيات دليل المنصة والإصدارات لكل مستخدم</a></p>':''}<div class="row"><div class="col-md-8 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">إعدادات التطبيق</h3></div><form id="f"><div class="card-body">
  <div class="mb-3"><label for="application_name" class="form-label">اسم التطبيق <span class="text-danger">*</span></label><input type="text" id="application_name" class="form-control" value="${esc(appName())}" required maxlength="255"></div>
  <div class="mb-3"><label for="admin_email" class="form-label">بريد المستلمين ${Cloud.on?'<button type="button" class="btn btn-xs btn-outline-primary ms-2" onclick="testMail()"><i class="bi bi-envelope-check"></i> إرسال رسالة تجريبية</button>':''}</label><input type="text" id="admin_email" class="form-control" value="${esc(S.settings.admin_email||'')}" maxlength="500"><div class="form-text text-muted">عند إنهاء مشرف الميدان لمبنى يُرسل ملف Excel الكامل (البيانات + صور الأصول و QR) إلى هذه العناوين وإلى بريد المشرف نفسه. افصل بين العناوين بفاصلة (مثال: admin@example.com, manager@example.com). يتطلب نشر دالة البريد solvix-mail في Supabase.</div></div>
  <div class="mb-3 p-3 border rounded-3 bg-body-tertiary"><b class="d-block mb-1"><i class="bi bi-geo-alt me-1 text-primary"></i>التحقق من موقع التصوير</b><div class="form-text mt-0 mb-2">تُقاس المسافة بين مكان التقاط صور الأصل وموقع المبنى (إحداثياتها، أو متوسط مواقع الأصول المسجلة فيها). تُحفظ المسافة مع الأصل وتظهر في «مراجعة الصور».</div>
   <div class="row g-2 align-items-center"><div class="col-6"><label class="form-label small mb-0" for="geo_m">المسافة المسموحة (متر)</label><input type="number" id="geo_m" class="form-control form-control-sm" min="50" max="5000" step="10" value="${esc(geoCfg().m)}"></div>
   <div class="col-6"><div class="form-check mt-3"><input class="form-check-input" type="checkbox" id="geo_block" ${geoCfg().block?'checked':''}><label class="form-check-label small" for="geo_block">منع الحفظ عند التجاوز (بدلاً من التنبيه فقط)</label></div></div></div>
   <div class="form-check mt-2"><input class="form-check-input" type="checkbox" id="geo_nostamp" ${geoCfg().stamp===false?'checked':''}><label class="form-check-label small" for="geo_nostamp"><b>مواقع حساسة:</b> عدم طباعة الإحداثيات على الصور</label><div class="form-text mt-0">يبقى على الصورة الوقت والمبنى والغرفة فقط. الإحداثيات تُحفظ مع الأصل للتحقق من موقع التصوير ولا تُطبع.</div></div></div>
  <div class="mb-3 p-3 border rounded-3 bg-body-tertiary"><b class="d-block mb-1"><i class="bi bi-diagram-3 me-1 text-primary"></i>الموقع والإنتاج اليومي</b>
   <div class="form-check"><input class="form-check-input" type="checkbox" id="ops_zone" ${opsCfg().zone.on?'checked':''}><label class="form-check-label small" for="ops_zone">إظهار حقل «منطقة / قسم» في شاشة الموقع لمشرف الميدان (اختياري عند الإدخال)</label></div>
   <div class="row g-2 align-items-end mt-1"><div class="col-6"><label class="form-label small mb-0" for="ops_zone_l">اسم الحقل</label><input id="ops_zone_l" class="form-control form-control-sm" maxlength="40" value="${esc(opsCfg().zone.l)}"></div>
    <div class="col-6"><label class="form-label small mb-0" for="ops_target">الهدف اليومي لكل مشرف (أصل / يوم)</label><input type="number" id="ops_target" class="form-control form-control-sm" min="1" max="2000" value="${esc(opsCfg().target)}"></div></div>
   <div class="form-text">يظهر الهدف في «الإنتاج اليومي». الحقل يُصدَّر في Excel (Zone) ويظهر في الملصق والتقارير.</div></div>
  <div class="mb-3"><label for="application_logo" class="form-label">شعار التطبيق</label><input type="file" id="application_logo" class="form-control" accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp">
   <div class="mt-2"><p class="text-muted small mb-1">الشعار الحالي:</p><img src="${esc(logoURL())}" alt="شعار التطبيق" class="img-thumbnail" style="max-height: 80px; max-width: 200px;" id="logo-preview"></div></div>
  </div><div class="card-footer"><button type="submit" class="btn btn-primary">حفظ</button></div></form></div></div></div>`);
  let logo=null;$('#application_logo').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{logo=await blobToData(await resizeImage(f,600,.9));$('#logo-preview').src=logo}catch(er){alert(er.message)}};
  $('#f').onsubmit=async e=>{e.preventDefault();const n=$('#application_name').value.trim();if(!n)return;S.settings.app_name=n;S.settings.admin_email=$('#admin_email').value.trim();if(logo)S.settings.logo=logo;S.settings.geo={m:Math.min(5000,Math.max(50,Math.round(+$('#geo_m').value||300))),block:$('#geo_block').checked,stamp:!$('#geo_nostamp').checked};S.settings.ops=Object.assign({},S.settings.ops||{},{target:Math.min(2000,Math.max(1,Math.round(+$('#ops_target').value||40))),zone:{on:$('#ops_zone').checked,l:$('#ops_zone_l').value.trim().slice(0,40)||'المنطقة / القسم'}});
    await saveNow('settings');if(Cloud.on){await Cloud.sync();if(Cloud.err){setAFlash('لم يُحفظ في قاعدة البيانات: '+Cloud.err.message,'danger');return vSettings()}}setAFlash('تم حفظ الإعدادات.');vSettings()};
}
/* NV22 — label settings in their own tab «إعدادات الملصق» (#admin/label) */
function vLabelSettings(){if(!can('settings'))return go('#admin/asset-types');
  adminShell('label','إعدادات الملصق',`<div class="card shadow-sm border-0"><div class="card-header"><h3 class="card-title"><i class="bi bi-qr-code me-1"></i>إعدادات ملصق الأصل</h3></div><form id="f"><div class="card-body">
  <h6 class="fw-bold mb-1"><i class="bi bi-rulers me-1"></i>مقاس الملصق</h6><p class="form-text mt-0">بالسنتيمتر. تُرتَّب الملصقات على صفحة A4 بقدر ما تتسع، أو اختر «ملصق واحد في كل صفحة» لطابعة الملصقات.</p>
  <div class="row g-2 align-items-end"><div class="col-6 col-md-3"><label class="form-label small" for="lbl_w">العرض (سم)</label><input type="number" id="lbl_w" class="form-control" min="3" max="20" step="0.1" value="${esc(labelSize().w)}"></div><div class="col-6 col-md-3"><label class="form-label small" for="lbl_h">الارتفاع (سم)</label><input type="number" id="lbl_h" class="form-control" min="2" max="20" step="0.1" value="${esc(labelSize().h)}"></div>
   <div class="col-12 col-md-6"><label class="form-label small" for="lbl_mode">طريقة الطباعة</label><select id="lbl_mode" class="form-select"><option value="roll" ${labelSize().one?'selected':''}>رول ملصقات (طابعة ملصقات — ملصق لكل صفحة بمقاس الملصق)</option><option value="a4" ${labelSize().one?'':'selected'}>ورق A4 (عدة ملصقات في الصفحة)</option></select>
    <div class="form-check mt-1" id="lbl_rot_w"><input class="form-check-input" type="checkbox" id="lbl_rot" ${labelSize().rot?'checked':''}><label class="form-check-label small" for="lbl_rot">تدوير 90° (إذا كانت الطابعة تُخرج الملصق بالطول)</label></div></div></div>
  <div class="form-text">للرول: اضبط في الطابعة ورق الملصقات بنفس المقاس، وفي نافذة الطباعة اختر الهوامش «بلا» والمقياس 100%.</div>
  <div class="row g-2 mt-1"><div class="col-12 col-md-6"><label class="form-label small" for="lbl_logo">شعار الملصق (يظهر بجانب رمز QR)</label><input type="file" id="lbl_logo" class="form-control form-control-sm" accept="image/png,image/jpeg,image/svg+xml,image/webp"><button type="button" class="btn btn-link btn-sm px-0 text-danger" id="lbl_nologo" ${labelSize().logo?'':'hidden'}>إزالة الشعار</button></div>
   <div class="col-6 col-md-3"><label class="form-label small" for="lbl_ar">النص العربي أسفل الملصق</label><input id="lbl_ar" class="form-control form-control-sm" maxlength="60" value="${esc(labelSize().ar)}"></div><div class="col-6 col-md-3"><label class="form-label small" for="lbl_en">النص الإنجليزي</label><input id="lbl_en" class="form-control form-control-sm" maxlength="60" dir="ltr" value="${esc(labelSize().en)}"></div></div>
  <div class="row g-2 mt-2 p-2 border rounded-3 bg-body-tertiary mx-0"><div class="col-12 col-md-7"><label class="form-label small mb-0" for="lbl_fmt"><b>صيغة رقم الأصل (Tag Number)</b></label><input id="lbl_fmt" class="form-control form-control-sm" dir="ltr" maxlength="40" placeholder="${TAG_DEF}" value="${esc(labelSize().fmt)}">
    <div class="form-text mt-0">نص ثابت (حروف إنجليزية وأرقام و - _ / .) مع <code>{N:8}</code> = رقم السجل بثماني خانات، و<code>{B}</code> = رقم المبنى، و<code>{Y}</code> = السنة. فارغ = ${TAG_DEF}. مثال: <code>QSM-{B}-{N:6}</code> ← <b id="lbl_fmt_x" dir="ltr"></b></div>
    ${S.collections.some(c=>c.label_printed_at||c.label_at)?'<div class="form-text text-danger mt-0">تنبيه: طُبعت ملصقات بالصيغة الحالية. تغيير الصيغة يغيّر الرقم الظاهر في الملصقات الجديدة والتقارير؛ الملصقات القديمة (101…) تبقى مقروءة.</div>':''}</div>
   <div class="col-12 col-md-5"><div class="form-check mt-md-4"><input class="form-check-input" type="checkbox" id="lbl_bc" ${labelSize().bc?'checked':''}><label class="form-check-label small" for="lbl_bc">إضافة باركود (Code 128) لرقم الأصل أسفل الملصق — لقارئات الباركود في المستودعات وأنظمة الصيانة</label></div></div></div>
  <div class="mt-3"><div class="d-flex flex-wrap align-items-center gap-2 mb-1"><b class="small">البيانات التي تظهر عند مسح رمز QR</b><button type="button" class="btn btn-xs btn-outline-secondary" data-qrset="all">الكل</button><button type="button" class="btn btn-xs btn-outline-secondary" data-qrset="basic">الأساسية فقط</button><button type="button" class="btn btn-xs btn-outline-secondary" data-qrset="loc">الموقع فقط</button><button type="button" class="btn btn-xs btn-outline-primary" data-qrset="url" title="عند المسح يفتح الجوال صفحة الأصل بصوره بعد تسجيل الدخول">الرابط فقط (يفتح صور الأصل)</button></div>
   <div class="row g-1">${QR_FIELDS.map(f=>`<div class="col-6 col-md-4 col-lg-3"><label class="form-check small mb-0"><input class="form-check-input" type="checkbox" data-qrf="${f[0]}" ${(labelSize().qr||QR_ALL()).includes(f[0])?'checked':''}> ${f[1]}${f[2]==='loc'?' <span class="badge text-bg-light border">موقع</span>':''}</label></div>`).join('')}</div>
   <div id="qr_meter" class="alert py-2 px-3 mt-2 mb-0 small"></div></div>
  <style id="lbl_css"></style><div class="mt-3"><span class="small text-muted d-block mb-1">معاينة بالمقاس الحقيقي (أصل تجريبي):</span><div id="lbl_prev" style="display:inline-block;border:1px dashed #94a3b8;border-radius:2mm"></div></div>
  </div><div class="card-footer"><button type="submit" class="btn btn-primary">حفظ</button></div></form></div>`);
  let lblLogo=labelSize().logo;const qrKeys=()=>$$('[data-qrf]').filter(x=>x.checked).map(x=>x.dataset.qrf);const Zf=()=>({w:+$('#lbl_w').value||6.3,h:+$('#lbl_h').value||3.6,one:$('#lbl_mode').value==='roll',rot:$('#lbl_rot').checked,logo:lblLogo,ar:$('#lbl_ar').value,en:$('#lbl_en').value,qr:qrKeys(),bc:$('#lbl_bc').checked});
  const sample=S.collections.find(c=>c.no&&c.type_id)||{no:84,school_id:(S.schools[0]||{}).id,floor:'الأرضي',room_name_id:(S.rooms[0]||{}).id,room_number:'3',type_id:(S.types.find(t=>t.code)||S.types[0]||{}).id,category_id:(S.types.find(t=>t.code)||S.types[0]||{}).cat,quantity:1};
  /* the density check uses a FULL record (every field filled), so the warning covers the longest label */
  const full=Object.assign({},sample,{no:sample.no||94,floor:sample.floor||'الأول',room_number:sample.room_number||'12',quantity:2,price:4500,manufacturer:'Carrier',brand:'Carrier',model:'53KHCT-24',capacity:'24000 BTU',serial:'SN8812AX19',tag:'ASAD-77812',asad_country:'السعودية',agency:'الوكيل المعتمد',warranty:'سنتان',install_date:'2024-05-01',parent_child:'Parent',notes:'',submitted_at:now(),condition_id:(S.conditions[0]||{}).id});
  const meter=Z=>{const d=qrDensity(qrText(full,Z.qr),Z),m=$('#qr_meter');m.className='alert py-2 px-3 mt-2 mb-0 small alert-'+(d.lvl==='ok'?'success':d.lvl==='warn'?'warning':'danger');
    m.innerHTML=`${d.lvl==='ok'?'✅ الرمز واضح وسهل المسح.':d.lvl==='warn'?'⚠️ بيانات كثيرة: الرمز كثيف — جرّب مسح ملصق مطبوع قبل الطباعة الكاملة، أو قلّل البيانات، أو كبّر الملصق.':'⛔ بيانات كثيرة جداً لهذا المقاس: غالباً لن يُقرأ الرمز بالجوال. قلّل البيانات أو كبّر الملصق.'}<br><span class="text-muted">حتى ${d.chars} حرفاً · ${d.mods}×${d.mods} مربعاً · عرض المربع عند الطباعة ≈ ${d.mm.toFixed(2)} مم (المريح ≥ 0.30 مم) · رمز QR ≈ ${labelDims(Z).qr.toFixed(0)} مم</span>`;return d};
  const fmtV=()=>$('#lbl_fmt').value.trim();
  const pv=()=>{const Z=Zf(),f=fmtV(),ok=!f||tagFmtOk(f);$('#lbl_fmt').classList.toggle('is-invalid',!ok);$('#lbl_fmt_x').textContent=ok?tagOf(Object.assign({},sample,{no:sample.no||84}),f||TAG_DEF):'صيغة غير صالحة — يلزم {N} وحروف إنجليزية وأرقام فقط';
    const keep=S.settings.label;S.settings.label=Object.assign({},keep||{},{fmt:ok?f:''});$('#lbl_css').textContent=labelCSS(Z);needQR().then(()=>{S.settings.label=Object.assign({},keep||{},{fmt:ok?f:''});$('#lbl_prev').innerHTML=labelHTML(sample,Z);meter(Z);S.settings.label=keep}).catch(()=>{S.settings.label=keep});S.settings.label=keep};
  ['lbl_w','lbl_h','lbl_ar','lbl_en','lbl_fmt'].forEach(id=>$('#'+id).oninput=pv);$('#lbl_bc').onchange=pv;$$('[data-qrf]').forEach(x=>x.onchange=pv);
  $$('[data-qrset]').forEach(b=>b.onclick=()=>{const v=b.dataset.qrset;$$('[data-qrf]').forEach(x=>{x.checked=v==='url'?x.dataset.qrf==='url':v==='all'?x.dataset.qrf!=='url':(v==='basic'?QR_BASIC.includes(x.dataset.qrf):QR_FIELDS.find(f=>f[0]===x.dataset.qrf)[2]==='loc')});pv()});pv();
  $('#lbl_logo').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{lblLogo=await logoPng(f,420);$('#lbl_nologo').hidden=false;pv()}catch(er){alert(er.message)}};
  $('#lbl_nologo').onclick=()=>{lblLogo='';$('#lbl_logo').value='';$('#lbl_nologo').hidden=true;pv()};
  $('#f').onsubmit=async e=>{e.preventDefault();
    const lw=+$('#lbl_w').value,lh=+$('#lbl_h').value;if(!(lw>=3&&lw<=20&&lh>=2&&lh<=20)){alert('مقاس الملصق: العرض من 3 إلى 20 سم، والارتفاع من 2 إلى 20 سم.');return}const qk=qrKeys();if(!qk.length){alert('اختر بياناً واحداً على الأقل لرمز QR.');return}const fm=fmtV();if(fm&&!tagFmtOk(fm)){alert('صيغة رقم الأصل غير صالحة: يلزم {N} أو {N:8}، وحروف إنجليزية وأرقام و - _ / . فقط (حتى 40 حرفاً).');return}
    if(fm!==labelSize().fmt&&S.collections.some(c=>c.label_printed_at||c.label_at)&&!confirm('طُبعت ملصقات بالصيغة الحالية. ستظهر الأرقام الجديدة في الملصقات والتقارير والتصدير من الآن، وتبقى الملصقات القديمة مقروءة. متابعة؟'))return;if(window.qrcode){const d=qrDensity(qrText(full,qk),{w:lw,h:lh});if(d.lvl==='bad'&&!confirm(`تنبيه: البيانات المختارة كثيرة جداً لملصق ${lw} × ${lh} سم (عرض المربع ≈ ${d.mm.toFixed(2)} مم)، وقد لا يُقرأ الرمز بالجوال.\nهل تريد الحفظ رغم ذلك؟`))return}
    S.settings.label={w:Math.round(lw*10)/10,h:Math.round(lh*10)/10,one:$('#lbl_mode').value==='roll',rot:$('#lbl_rot').checked,logo:lblLogo||'',ar:$('#lbl_ar').value.trim(),en:$('#lbl_en').value.trim(),qr:qk,bc:$('#lbl_bc').checked,fmt:fm};await saveNow('settings');if(Cloud.on){await Cloud.sync();if(Cloud.err){setAFlash('لم يُحفظ في قاعدة البيانات: '+Cloud.err.message,'danger');return vLabelSettings()}}setAFlash('تم حفظ إعدادات الملصق.');vLabelSettings()};
}

/* ---------- extra: data & backup, admin account (replaces the server and the database) ---------- */
async function vData(){let est='';try{const e=await navigator.storage.estimate();est=`${(e.usage/1048576).toFixed(1)} م.ب مستخدمة`}catch(e){}
  const nPhotos=(await IDB.keys('photos').catch(()=>[])).length;const adm=S.settings.admin_login||{};
  const cl=Cloud.on;const pend=cl?Cloud.pendingCount():0;
  adminShell('data','البيانات والنسخ الاحتياطي',`${cl?`<div class="card mb-4 border-primary"><div class="card-header"><h3 class="card-title"><i class="bi bi-cloud-check me-1"></i>قاعدة بيانات Solvix</h3></div><div class="card-body">
   <p class="mb-2">داخل باسم <strong>${esc((Cloud.user&&Cloud.user.email)||'')}</strong> (${ROLE_L[staffRole()]||''}). ${pend?`<span class="badge text-bg-warning">${pend} تعديل بانتظار الإرسال</span>`:'<span class="badge text-bg-success">كل شيء مُرسل</span>'} ${Cloud.err?`<span class="text-danger small">آخر خطأ: ${esc(Cloud.err.message)}</span>`:''}</p>
   <div class="d-flex flex-wrap gap-2"><button class="btn btn-primary" id="cSync"><i class="bi bi-arrow-repeat me-1"></i>مزامنة الآن</button><button class="btn btn-outline-primary" id="cPull"><i class="bi bi-cloud-download me-1"></i>إعادة التحميل من قاعدة البيانات</button>
   ${Cloud.role==='admin'?`<button class="btn btn-outline-success" id="cLocal"><i class="bi bi-upload me-1"></i>رفع البيانات المحفوظة على هذا الجهاز</button>${S.schools.length?'':'<button class="btn btn-warning" id="cInit">تحميل القوائم الجاهزة</button>'}`:''}</div>
   <p class="form-text mt-2 mb-0">يدخل مشرفو الميدان برقمهم الوظيفي وكلمة المرور من «المستخدمون ← حساب الدخول». تصل سجلاتهم إلى هنا فور اتصال الجوال بالإنترنت.</p>
   ${SOLVIX_CFG.url?'':`<hr><p class="small mb-2">هذا الموقع ليس فيه اتصال مدمج بعد. أرسل هذا الرابط مرة واحدة لكل جوال (أو حاسب) ليتصل بقاعدة البيانات:</p><div class="input-group input-group-sm"><input class="form-control" id="cLink" readonly dir="ltr" value="${esc(Cloud.link())}"><button class="btn btn-outline-secondary" id="cCopy"><i class="bi bi-clipboard"></i> نسخ</button></div>`}
   <button class="btn btn-sm btn-link text-danger px-0 mt-2" id="cOff">فصل هذا الجهاز عن قاعدة البيانات</button></div></div>`:`<div class="card mb-4 border-warning"><div class="card-header"><h3 class="card-title"><i class="bi bi-cloud-slash me-1"></i>غير متصل بقاعدة بيانات Solvix</h3></div><div class="card-body">
   ${Cloud.tablesMissing?'<div class="alert alert-warning py-2">قاعدة البيانات ترد، لكن جداول Solvix غير موجودة: شغّل <code>solvix_setup.sql</code> في SQL Editor.</div>':''}
   <div class="row g-2"><div class="col-md-5"><input class="form-control" id="cf_url2" placeholder="Project URL — https://xxxx.supabase.co" dir="ltr" value="${esc((Cloud.cfg()||{}).url||'')}"></div><div class="col-md-5"><input class="form-control" id="cf_key2" placeholder="Publishable / anon key" dir="ltr"></div><div class="col-md-2"><button class="btn btn-primary w-100" id="cf_go2">ربط</button></div></div>
   <p class="form-text mb-0">Supabase ← Project Settings ← API. استخدم المفتاح العام فقط، ولا تستخدم مفتاح service_role / secret أبداً. بيانات هذا الجهاز تبقى عليه؛ بعد الربط ارفعها من «رفع البيانات المحفوظة على هذا الجهاز».</p></div></div>`}
  <div class="row g-4"><div class="col-lg-6">
  <div class="card mb-4"><div class="card-header"><h3 class="card-title">البيانات على هذا الجهاز</h3></div><div class="card-body"><p class="text-muted mb-3">${S.collections.length} سجل جرد · ${nPhotos} صورة · ${S.schools.length} مبنى · ${S.employees.length} موظف${est?' · '+est:''}</p>
   <div class="d-flex flex-wrap gap-2"><button class="btn btn-primary" id="bk"><i class="bi bi-download me-1"></i>نسخة بيانات الجهاز مع الصور</button><button class="btn btn-outline-primary" id="bk2">نسخة بدون صور</button></div><p class="small text-muted mt-2">نسخة الجهاز تخص البيانات المحمّلة عليه. لحفظ خطط ودورات الجرد وسجلات النقل والفصل، احتفظ أيضًا بنسخة قاعدة العميل وملفات صوره.</p>
   <hr><div class="d-flex flex-wrap gap-2"><button class="btn btn-success" id="mg"><i class="bi bi-intersect me-1"></i>دمج ملفات مشرفي الميدان</button>${cl?'':'<button class="btn btn-outline-secondary" id="rs"><i class="bi bi-arrow-counterclockwise me-1"></i>استعادة بيانات الجهاز</button>'}</div>
   <p class="form-text mt-2">عدة أجهزة: يضغط كل مشرف ميدان «إرسال بياناتي» في صفحته ويرسل الملف، ثم تدمج الملفات هنا. الدمج يضيف السجلات الجديدة ويحتفظ بأحدث نسخة من كل سجل ولا يحذف شيئاً.</p></div></div>
  <div class="card mb-4"><div class="card-header"><h3 class="card-title">التصدير</h3></div><div class="card-body d-flex flex-wrap gap-2"><button class="btn btn-success" id="xa"><i class="bi bi-file-earmark-excel me-1"></i>كل سجلات الجرد (Excel)</button><button class="btn btn-success" id="xf"><i class="bi bi-images me-1"></i>كل البيانات بالصور و QR (Excel)</button><button class="btn btn-outline-success" id="za"><i class="bi bi-images me-1"></i>كل الصور (ZIP)</button></div></div></div>
  <div class="col-lg-6"><div class="card mb-4"><div class="card-header"><h3 class="card-title">الاستيراد من Excel</h3></div><div class="card-body"><p class="text-muted small">المباني: الأعمدة <code>building_identifier</code> (أو <code>Identifier</code> / <code>معرّف المبنى</code>)، <code>Name (Arabic)</code> / <code>اسم المبنى</code>، <code>Building Number</code> / <code>رقم المبنى</code>، <code>City</code> / <code>المحافظة</code>، <code>District</code>، <code>Site</code>، <code>Description</code> — المطابقة بالمعرّف، والخلايا الفارغة لا تمسح قيمة موجودة. الموظفون: <code>Employee Number</code> / <code>الرقم الوظيفي</code>، <code>Name</code> / <code>الاسم</code>.</p>
   <div class="d-flex flex-wrap gap-2"><button class="btn btn-outline-primary" id="is"><i class="bi bi-building me-1"></i>استيراد المباني</button><button class="btn btn-outline-primary" id="ie"><i class="bi bi-people me-1"></i>استيراد الموظفين</button><button class="btn btn-outline-primary" id="ic"><i class="bi bi-box-seam me-1"></i>استيراد أعمال الجرد</button></div></div></div>
  ${cl?'':`<div class="card mb-4"><div class="card-header"><h3 class="card-title">حساب المدير</h3></div><form id="fa"><div class="card-body"><div class="mb-3"><label class="form-label">البريد الإلكتروني</label><input type="email" class="form-control" id="a_em" value="${esc(adm.email||'')}" required></div><div class="mb-3"><label class="form-label">كلمة المرور الحالية</label><input type="password" class="form-control" id="a_p0" required></div><div class="mb-3"><label class="form-label">كلمة المرور الجديدة</label><input type="password" class="form-control" id="a_p1" minlength="6" required></div></div><div class="card-footer"><button class="btn btn-primary">تحديث الحساب</button></div></form></div>
  <div class="card border-danger"><div class="card-header"><h3 class="card-title text-danger">منطقة الخطر</h3></div><div class="card-body"><button class="btn btn-outline-danger" id="wipe">حذف كل البيانات والبدء من القوائم الأصلية</button></div></div>`}</div></div>
  <p class="text-muted small">الإصدار ${NV.version} · ${NV.date}</p>`);
  $('#bk').onclick=()=>exportPackage({kind:'full'});$('#bk2').onclick=()=>exportPackage({kind:'full',photos:false});
  $('#xa').onclick=()=>exportCollections(S.collections,'collections-'+stampDash()+'.xlsx');$('#xf').onclick=()=>exportFull(S.collections,'solvix-full-'+stampDash());$('#za').onclick=()=>exportPhotosZip(S.collections);
  $('#mg').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.json';i.multiple=true;i.onchange=async()=>{const out=[];for(const f of i.files){try{const r=await mergePackage(await readPackage(f));out.push(`${f.name}: ${r.coll} جديد، ${r.upd} محدَّث، ${r.photos} صورة، ${r.sch} مبنى مكتملة${r.emp?`، ${r.emp} موظف جديد`:''}`)}catch(e){out.push(`${f.name}: ${e.message}`)}}setAFlash(out.join(' | '),'info');vData()};i.click()};
  if($('#cf_go2'))$('#cf_go2').onclick=()=>{try{Cloud.setCfg({url:$('#cf_url2').value,key:$('#cf_key2').value});location.hash='#admin';location.reload()}catch(e){alert(e.message)}};
  if($('#cCopy'))$('#cCopy').onclick=()=>{const i=$('#cLink');i.select();try{navigator.clipboard.writeText(i.value)}catch(e){document.execCommand('copy')}toast('تم نسخ الرابط')};
  if($('#cOff'))$('#cOff').onclick=async()=>{if(!confirm('فصل هذا الجهاز ومسح النسخة المحلية بعد اكتمال المزامنة؟'))return;if(await Cloud.signOut()===false)return;localStorage.removeItem(NV_CFG_KEY);location.hash='#admin';location.reload()};
  if(cl){$('#cSync').onclick=async()=>{await Cloud.sync();vData()};$('#cPull').onclick=async()=>{await Cloud.sync();await Cloud.pull();setAFlash('تمت إعادة التحميل من قاعدة البيانات.');vData()};
    if($('#cInit'))$('#cInit').onclick=()=>initCloudLists();
    if($('#cLocal'))$('#cLocal').onclick=async()=>{try{const pkg=await readOfflineDb();if(!pkg){alert('لا توجد بيانات Solvix محفوظة على هذا الجهاز.');return}
      const n=(pkg.data.collections||[]).length;if(!confirm(`رفع ${n} سجل (مع صورها) من نسخة هذا الجهاز إلى قاعدة البيانات؟ المباني والموظفون والقوائم المطابقة تُستخدم كما هي.`))return;
      const r=await mergePackage(pkg);await Cloud.sync();setAFlash(`تم الرفع: ${r.coll} سجل جديد، ${r.upd} محدَّث، ${r.photos} صورة.`,'info');vData()}catch(e){alert(e.message)}}}
  if($('#rs'))$('#rs').onclick=async()=>{const f=await pickFile('.json');if(!f)return;let pkg;try{pkg=await readPackage(f)}catch(e){return alert(e.message)}if(!confirm('الاستعادة تستبدل كل البيانات على هذا الجهاز بمحتوى الملف. متابعة؟'))return;try{await restorePackage(pkg);setAFlash('تمت استعادة النسخة.');vData()}catch(e){alert(e.message)}};
  $('#is').onclick=()=>importSchoolsFile(()=>vData());$('#ie').onclick=()=>importEmployeesFile(()=>vData());$('#ic').onclick=()=>importCollections();
  if($('#fa'))$('#fa').onsubmit=async e=>{e.preventDefault();const a=S.settings.admin_login;const p0=$('#a_p0').value;if(a.hash!==await hashPin(a.email+'|'+p0))return alert('كلمة المرور الحالية غير صحيحة.');const em=$('#a_em').value.trim().toLowerCase(),p1=$('#a_p1').value;if(p1.length<6)return alert('كلمة المرور الجديدة 6 أحرف على الأقل.');S.settings.admin_login={email:em,hash:await hashPin(em+'|'+p1)};await saveNow('settings');setAFlash('تم تحديث حساب المدير.');vData()};
  if($('#wipe'))$('#wipe').onclick=async()=>{if(!confirm('حذف كل سجلات الجرد والصور والتعديلات على هذا الجهاز وإعادة القوائم الأصلية؟ خذ نسخة احتياطية أولاً.'))return;const adm2=S.settings.admin_login;await IDB.clear('photos');urlCache.clear();seedData();S.settings.admin_login=adm2;reindex();await saveAll();clearSess();setAFlash('تمت إعادة ضبط كل البيانات.');vData()};
}

/* ---------- extra: change log (the original e-mails the admin on edits) ---------- */
function logTable(list){return `<table class="table table-striped mb-0"><thead><tr><th>التاريخ</th><th>بواسطة</th><th>المبنى</th><th>التعديلات</th><th></th></tr></thead><tbody>${list.map(l=>`<tr><td class="small text-nowrap">${ymdhms(l.at)}</td><td>${l.by==='admin'?'<span class="badge text-bg-primary">المدير</span>':esc(empName(String(l.by).replace('emp:','')))}</td><td>${esc((get('schools',l.school)||{}).name||'')}</td>
  <td class="small">${Object.entries(l.changes).map(([k,v])=>`<div><strong>${esc(FIELD_LBL[k]||k)}:</strong> <span class="text-muted text-decoration-line-through">${esc(fieldText(k,v.old))}</span> → ${esc(fieldText(k,v.new))}</div>`).join('')}</td>
  <td>${S.collections.some(c=>c.id===l.coll)?iconBtn('#admin/collections/'+encodeURIComponent(l.coll),'bi-eye text-primary'):'<span class="text-muted small">محذوف</span>'}</td></tr>`).join('')}</tbody></table>`}
function vLog(){const pg=paginate(S.log,50);
  adminShell('log','سجل التعديلات',`<div class="card shadow-sm border-0 mb-4"><div class="card-header bg-white py-3"><h3 class="card-title fw-bold mb-0 text-dark"><i class="bi bi-journal-text me-2 text-primary"></i>سجل التعديلات</h3></div><div class="card-body p-0 table-responsive">${pg.items.length?logTable(pg.items):emptyBox('bi-journal-check','لا توجد تعديلات مسجلة','يُسجَّل هنا كل تعديل يجريه مشرف الميدان على أصل بعد إرساله.')}</div>${pg.footer}</div>`)}
</script>
<script id="nv-admin-cloud">
/* fill an empty cloud with the built-in lists (seeders), then send them */
async function initCloudLists(){if(S.schools.length&&!confirm('قاعدة البيانات فيها مباني بالفعل. إضافة القوائم الجاهزة رغم ذلك؟ (السجلات الموجودة تبقى)'))return;
  const T=seedLists({});T.schools=[];T.employees=[];{const hs=new Set(S.schools.map(x=>x.id)),he=new Set(S.employees.map(x=>x.id));if(!await limitOk('schools',T.schools.filter(x=>!hs.has(x.id)).length)||!await limitOk('field',T.employees.filter(x=>!he.has(x.id)).length))return}for(const t of ['categories','conditions','rooms','types','employees','schools']){const have=new Set(S[t].map(x=>x.id));for(const r of T[t])if(!have.has(r.id))S[t].push(r)}
  reindex();for(const t of ['categories','conditions','rooms','types','employees','schools'])save(t);toast('جارٍ إرسال القوائم إلى قاعدة البيانات…',4000);await Cloud.sync();
  setAFlash(Cloud.err?('لم يُرسل كل شيء: '+Cloud.err.message):'القوائم الجاهزة الآن في قاعدة البيانات.',Cloud.err?'danger':'success');route()}
/* the offline copy (novaro_v2) kept by NV1/NV2 or by «?local» on this device, as a merge package */
function readOfflineDb(){return new Promise((res,rej)=>{const r=indexedDB.open('novaro_v2',1);r.onupgradeneeded=()=>{r.transaction.abort()};r.onerror=()=>res(null);
  r.onsuccess=async()=>{const db=r.result;if(!db.objectStoreNames.contains('kv')){db.close();return res(null)}
    const get=(st,k)=>new Promise(ok=>{const q=db.transaction(st).objectStore(st).get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>ok(null)});
    const data={};for(const t of ['schools','employees','categories','types','conditions','rooms','collections','log'])data[t]=await get('kv',t)||[];
    if(!data.collections.length){db.close();return res(null)}
    const photos={};for(const c of data.collections)for(const k of photoKeys(c)){if(k&&!photos[k]){const b=await get('photos',k);if(b)photos[k]=await blobToData(b)}}
    db.close();res({app:'novaro',v:1,kind:'full',data,photos})}})}
</script>
<script id="nv-admin-users">
/* NV5 — Users: who may open the admin pages (table nv_staff in the Solvix project) */
function vUsers(){go('#admin/employees')}
/* NV10 — «إضافة مستخدم»: one form for the four roles */
function addUserCard(){const staff=Cloud.on&&canUsers();
  const roles=[['field',ROLE_L.field],...(staff?[['coordinator',ROLE_L.coordinator],['manager',ROLE_L.manager],...(isOwnerRole()?[['owner',ROLE_L.owner]]:[]),...(isSys()?[['sysadmin',ROLE_L.sysadmin]]:[])]:[])];
  return `<div class="card shadow-sm border-0 mb-4 ${qp().get('add')?'':'d-none'}" id="addUser"><div class="card-header bg-white py-3 d-flex justify-content-between align-items-center"><h3 class="card-title fw-bold mb-0"><i class="bi bi-person-plus me-2 text-primary"></i>إضافة مستخدم</h3><button type="button" class="btn-close" data-adduser aria-label="إغلاق"></button></div>
  <form id="fu" class="card-body"><div class="row g-3">
   <div class="col-md-3"><label class="form-label fw-bold small">الدور</label><select class="form-select" id="u_role">${roles.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>
   <div class="col-md-3"><label class="form-label fw-bold small">الاسم</label><input class="form-control" id="u_name" required></div>
   <div class="col-md-3" data-for="field"><label class="form-label fw-bold small">الرقم الوظيفي</label><input class="form-control" id="u_num" dir="ltr"></div>
   <div class="col-md-3"><label class="form-label fw-bold small">البريد الإلكتروني</label><input type="email" class="form-control" id="u_email" dir="ltr"></div>
   ${Cloud.on?'<div class="col-md-3"><label class="form-label fw-bold small">كلمة المرور</label><input class="form-control" id="u_pw" minlength="8" dir="ltr"></div>':''}
  ${documentChoices45('u')}</div><p class="form-text mt-2 mb-3" id="u_hint"></p><button class="btn btn-primary"><i class="bi bi-check-lg me-1"></i>إضافة</button></form></div>`}
function bindAddUser(){const card=$('#addUser');if(!card)return;
  $$('[data-adduser]').forEach(b=>b.onclick=()=>{card.classList.toggle('d-none');if(!card.classList.contains('d-none'))$('#u_name').focus()});
  if($('#u_pw'))$('#u_pw').value=genPw();
  const HINT={field:'مشرف الميدان يدخل تطبيق الجرد على الجوال ببريده الإلكتروني وكلمة المرور، ويرى أعماله فقط.',coordinator:'منسق المشروع يدخل لوحة الإدارة بالبريد: يعدّل المباني والجرد والقوائم وينقل الأعمال، ولا يدير المستخدمين ولا الإعدادات العامة.',manager:'مدير المشروع: كل الصلاحيات، ومنها إدارة المستخدمين، عدا تعديل حسابات المالكين.',owner:'مالك المشروع: كل الصلاحيات.'};
  const sync=()=>{const v=$('#u_role').value,f=v==='field';$$('[data-for="field"]').forEach(x=>x.classList.toggle('d-none',!f));$$('[data-for="staff"]').forEach(x=>x.classList.toggle('d-none',f));$('#u_num').required=f;$('#u_email').required=!f||Cloud.on;$('#u_hint').textContent=HINT[v]+(Cloud.on?'':' (هذا الجهاز غير متصل بقاعدة البيانات: يُضاف مشرف الميدان بدون حساب دخول.)')};
  $('#u_role').onchange=sync;sync();
  $('#fu').onsubmit=async e=>{e.preventDefault();const role=$('#u_role').value,name=$('#u_name').value.trim(),pw=$('#u_pw')?$('#u_pw').value:'';const btn=e.submitter||$('#fu button');
    if(!name)return;if(Cloud.on&&pw.length<8)return alert('كلمة المرور 8 أحرف على الأقل.');btn.disabled=true;
    try{if(role==='field'){const num=$('#u_num').value.trim();if(!num)return;if(S.employees.some(x=>String(x.number)===num))throw new Error('هذا الرقم الوظيفي مستخدم لموظف آخر.');
        const fe=$('#u_email').value.trim().toLowerCase()||null;if(Cloud.on&&!fe)throw new Error('اكتب البريد الإلكتروني لمشرف الميدان — يدخل به.');if(fe&&S.employees.some(x=>(x.email||'').toLowerCase()===fe))throw new Error('هذا البريد مستخدم لمشرف آخر.');
        const emp={id:nextId('employees','e'),number:num,name,email:fe,created_at:now()};S.employees.push(emp);reindex();save('employees');
        if(Cloud.on){await Cloud.sync();if(Cloud.err)throw new Error('لم يُحفظ في قاعدة البيانات: '+Cloud.err.message);const c=await Cloud.sb();Cloud.chk(await c.rpc('nv_emp_login45',{p_emp:emp.id,p_password:pw,...documentSelection45('u')}));
          setAFlash(`تمت إضافة مشرف الميدان ${name}. الدخول: ${fe} / كلمة المرور ${pw}`)}else setAFlash(`تمت إضافة مشرف الميدان ${name}.`)}
      else{const em=$('#u_email').value.trim().toLowerCase();if(!em)return;const c=await Cloud.sb();Cloud.chk(await c.rpc('nv_staff_create45',{p_email:em,p_password:pw,p_name:name,p_role:role,...documentSelection45('u')}));
        setAFlash(`تمت إضافة ${ROLE_L[role]} ${name}. الدخول: ${em} / ${pw}`)}
      location.hash='#admin/employees';vEmployees()}catch(er){alert(er.message)}finally{if(document.body.contains(btn))btn.disabled=false}}}
/* NV10 — accounts that sign in by e-mail (owner / manager / coordinator), shown above the field supervisors */
async function loadStaff(){const box=$('#staffBox');if(!box)return;let list=[],err='';try{const c=await Cloud.sb();list=Cloud.chk(await c.from('nv_staff').select('*').order('created_at'))||[]}catch(e){err=e.message}
  if(!$('#staffBox'))return;const me=Cloud.user&&Cloud.user.id;const own=isOwnerRole();const R=r=>r==='admin'?'owner':r;
  box.innerHTML=`${err?`<div class="alert alert-danger">${esc(err)}</div>`:''}<div class="card shadow-sm border-0 mb-4"><div class="card-header bg-white py-3"><h3 class="card-title fw-bold mb-0 text-dark"><i class="bi bi-person-lock me-2 text-primary"></i>حسابات الإدارة <span class="badge text-bg-light border fw-normal">${list.length}</span></h3><small class="text-muted d-block">يدخلون لوحة الإدارة بالبريد الإلكتروني</small></div>
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3">الاسم</th><th>البريد</th><th>الدور</th><th>نشط</th><th class="text-end pe-3">إجراءات</th></tr></thead><tbody>
  ${list.map(u=>{const lock=u.user_id===me||(!own&&R(u.role)==='owner')||(u.role==='sysadmin'&&!isSys());const opts=[...(isSys()||u.role==='sysadmin'?[['sysadmin',ROLE_L.sysadmin]]:[]),['owner',ROLE_L.owner],['manager',ROLE_L.manager],['coordinator',ROLE_L.coordinator],...(u.role==='reader'?[['reader',ROLE_L.reader]]:[])].filter(([v])=>own||v!=='owner'||R(u.role)==='owner');
   return `<tr><td class="ps-3 fw-medium">${esc(u.name)}${u.user_id===me?' <span class="badge text-bg-light border">أنت</span>':''}</td><td class="small" dir="ltr">${esc(u.email)}</td>
   <td><select class="form-select form-select-sm" data-role="${esc(u.user_id)}" ${lock?'disabled':''} style="width:auto">${opts.map(([v,l])=>`<option value="${v}" ${R(u.role)===v?'selected':''}>${l}</option>`).join('')}</select></td>
   <td><div class="form-check form-switch"><input class="form-check-input" type="checkbox" data-act="${esc(u.user_id)}" ${u.active?'checked':''} ${lock?'disabled':''}></div></td>
   <td class="text-end pe-3">${lock&&u.user_id!==me?'':`<button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-pw="${esc(u.user_id)}" title="كلمة مرور جديدة"><i class="bi bi-key text-primary"></i></button>`}${isSys()?`<button type="button" class="btn btn-sm btn-outline-danger ms-1" data-user-delete="${esc(u.user_id)}" title="حذف حساب الدخول نهائياً"><i class="bi bi-trash"></i></button>`:''}</td></tr>`}).join('')||emptyRow(5,'bi-person-badge','لا توجد حسابات')}
  </tbody></table></div></div></div>`;
  const rpc=async(fn,args,msg)=>{try{const c=await Cloud.sb();Cloud.chk(await c.rpc(fn,args));if(msg)setAFlash(msg)}catch(e){setAFlash(e.message,'danger')}vEmployees()};
  $$('[data-role]',box).forEach(x=>x.onchange=()=>{const u=list.find(y=>y.user_id===x.dataset.role);rpc('nv_staff_set',{p_user:u.user_id,p_role:x.value,p_active:u.active},`تم تغيير دور ${u.name} إلى ${ROLE_L[x.value]}.`)});
  $$('[data-act]',box).forEach(x=>x.onchange=()=>{const u=list.find(y=>y.user_id===x.dataset.act);rpc('nv_staff_set',{p_user:u.user_id,p_role:R(u.role),p_active:x.checked},x.checked?'تم تفعيل المستخدم.':'تم إيقاف المستخدم.')});
  $$('[data-user-delete]',box).forEach(b=>b.onclick=async()=>{try{if(await deleteLogin(b.dataset.userDelete))vEmployees()}catch(e){alert(e.message)}});
  $$('[data-pw]',box).forEach(b=>b.onclick=()=>{const u=list.find(y=>y.user_id===b.dataset.pw);const pw=prompt(`كلمة مرور جديدة لـ ${u.email} (8 أحرف على الأقل):`,genPw());if(!pw)return;rpc('nv_staff_set_password',{p_user:u.user_id,p_password:pw},`تم تغيير كلمة المرور. أعطها لـ ${u.email}: ${pw}`)});
}
</script>
<script id="nv-nv12">
/* NV12 — asset labels (number + QR), building report (Arabic / English), category drill-down, collections import, in-app notifications */
let qrP=null;
/* NV20 — label design from «الإعدادات»: size (cm), logo, the two «do not remove» texts */
const LBL_AR='يرجى عدم إزالة الملصق',LBL_EN='Please do not remove';
const labelSize=()=>{const l=S.settings.label||{};return {w:Number(l.w)||6.3,h:Number(l.h)||3.6,one:l.one==null?true:!!l.one,rot:!!l.rot,logo:l.logo||'',ar:l.ar!=null?l.ar:LBL_AR,en:l.en!=null?l.en:LBL_EN,qr:Array.isArray(l.qr)?l.qr:null,bc:!!l.bc,fmt:tagFmtOk(l.fmt)?l.fmt:''}};
function labelDims(Z){const W=Z.w*10,H=Z.h*10,pad=Math.max(1.2,H*.05),fh=Math.max(3.2,H*.16),bh=Z.bc?Math.max(4.5,H*.2):0,ta=H-2*pad-fh-bh,fn=Math.max(5,Math.min(9,H*.2));return {W,H,pad,fh,bh,ta,fn,qr:Math.max(8,Math.min(ta-fn*.5,W*.44)),ff:Math.max(4.5,Math.min(8,H*.16))}}
function labelCSS(Z){const {W,H,pad,fh,bh,ta,fn,qr,ff}=labelDims(Z);
  return `.lb{box-sizing:border-box;width:${W}mm;height:${H}mm;padding:${pad}mm ${pad*1.3}mm;display:flex;flex-direction:column;background:#fff;color:#111;border-radius:2mm;overflow:hidden;font-family:Tahoma,Arial,sans-serif;break-inside:avoid}
  .lb .tp{flex:1;display:flex;align-items:center;gap:${pad}mm;min-height:0}.lb .lg{flex:1;display:flex;align-items:center;justify-content:center;height:100%;min-width:0}.lb .lg img{max-width:100%;max-height:${ta*.85}mm;object-fit:contain}
  .lb .lg .nm{font-weight:700;font-size:${ff*1.1}pt;text-align:center;line-height:1.3}.lb .qc{flex:none;display:flex;flex-direction:column;align-items:center;gap:.3mm}.lb .qr{width:${qr}mm;height:${qr}mm}.lb .qr svg{width:100%;height:100%;display:block}
  .lb .no{font:700 ${fn}pt/1.1 Arial,monospace;direction:ltr;letter-spacing:.2px}.lb .ft{height:${fh}mm;flex:none;border-top:.35mm solid #111;display:flex;align-items:center;justify-content:space-between;gap:2mm;font-size:${ff}pt;font-weight:700;white-space:nowrap;overflow:hidden}
  .lb .ft .en{direction:ltr}.lb .bc{flex:none;height:${bh}mm;display:flex;align-items:center;justify-content:center;padding:.4mm 0}.lb .bc svg{height:100%;width:100%;display:block}`}
function labelHTML(c,Z){const s=get('schools',c.school_id)||{};
  return `<div class="lb"><div class="tp"><div class="lg">${Z.logo?`<img src="${Z.logo}" alt="">`:`<div class="nm">${esc(s.name||appName())}</div>`}</div><div class="qc"><div class="qr">${qrSvg(qrText(c,Z.qr))}</div><div class="no">${esc(assetLabel(c))}</div></div></div>${Z.bc&&assetLabel(c)?`<div class="bc">${code128Svg(assetLabel(c))}</div>`:''}${Z.ar||Z.en?`<div class="ft"><span class="ar">${esc(Z.ar)}</span><span class="en">${esc(Z.en)}</span></div>`:''}</div>`}
/* a logo keeps its transparency: PNG, at most `max` px */
function logoPng(file,max){return new Promise((res,rej)=>{if(file.size>4*1048576)return rej(new Error('حجم الشعار أكبر من 4 م.ب'));const u=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const cv=document.createElement('canvas');cv.width=Math.round(img.naturalWidth*k)||max;cv.height=Math.round(img.naturalHeight*k)||max;cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(u);res(cv.toDataURL('image/png'))};
  img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('تعذرت قراءة الصورة'))};img.src=u})}
const needQR=()=>qrP||(qrP=window.qrcode?Promise.resolve():loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js').catch(e=>{qrP=null;throw e}));
function qrSvg(text){qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8'];const q=qrcode(0,text.length>220?'L':'M');q.addData(text,'Byte');q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}
/* NV20 — scanning a label shows WHERE the asset is first (building, floor, room), then the full asset data */
/* NV21 — the QR fields are chosen in «الإعدادات» (S.settings.label.qr = keys, default all); location first, then the asset data */
const QR_FIELDS=[['b','المبنى','loc',(c,x)=>x.s.name?`${x.s.name}${x.s.moe?' ('+x.s.moe+')':''}`:''],['z','المنطقة / القسم','loc',c=>c.zone],['f','الطابق','loc',c=>c.floor],['r','الغرفة','loc',(c,x)=>x.r.ar?`${x.r.ar}${c.room_number?' (رقم '+c.room_number+')':''}`:c.room_number],
  ['no','Tag Number','a',c=>assetLabel(c)],['d','الوصف','a',(c,x)=>x.t.ar],['code','الكود والتصنيف','a',(c,x)=>x.t.code?x.t.code+(x.t.critical?' (حرج)':' (غير حرج)'):''],['lv','المستويات','a',(c,x)=>[x.k.ar,x.t.l2,x.t.l3].filter(Boolean).join(' › ')],
  ['cond','الحالة الفنية','a',c=>(get('conditions',c.condition_id)||{}).ar],['q','الكمية','a',c=>c.type_id?num(c.quantity):''],['p','السعر','a',c=>c.price],['mf','الشركة المصنعة','a',c=>c.manufacturer],['br','الماركة','a',c=>c.brand],['md','الموديل','a',c=>c.model],
  ['cap','السعة','a',c=>c.capacity],['sn','الرقم التسلسلي','a',c=>c.serial],['ag','الوكيل','a',c=>c.agency],['wr','الضمان','a',c=>c.warranty],['in','تاريخ التركيب','a',c=>c.install_date],
  ['pc','رئيسي / فرعي','a',c=>c.parent_child==='Parent'?'رئيسي':c.parent_child==='Child'?'فرعي':c.parent_child],['nt','ملاحظات','a',c=>c.notes],['dt','تاريخ الجرد','a',c=>c.submitted_at?fmtYmd(c.submitted_at):''],['url','رابط صفحة الأصل (بالصور)','a',c=>assetURL(c)]];
const QR_BASIC=['b','f','r','no','d','code'];const QR_ALL=()=>QR_FIELDS.map(f=>f[0]).filter(k=>k!=='url');
function qrText(c,keys){keys=keys||labelSize().qr||QR_ALL();if(keys.length===1&&keys[0]==='url')return assetURL(c)||assetLabel(c);const x={s:get('schools',c.school_id)||{},r:get('rooms',c.room_name_id)||{},t:get('types',c.type_id)||{},k:get('categories',c.category_id)||{}};const on=new Set(keys);
  const line=f=>{const v=f[3](c,x);return on.has(f[0])&&v!=null&&v!==''?`${f[1]==='الكود والتصنيف'?'الكود':f[1]}: ${v}`:''};
  const loc=QR_FIELDS.filter(f=>f[2]==='loc').map(line).filter(Boolean),as=QR_FIELDS.filter(f=>f[2]==='a').map(line).filter(Boolean);
  return [...(loc.length?['📍 موقع الأصل',...loc]:[]),...(as.length?[loc.length?'— بيانات الأصل —':'',...as]:[])].filter(Boolean).join('\n')||assetLabel(c)}
/* density: modules of the QR and the printed size of one module on this label */
function qrDensity(text,Z){qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8'];const q=qrcode(0,text.length>220?'L':'M');q.addData(text,'Byte');q.make();const n=q.getModuleCount()+4;const mm=labelDims(Z).qr/n;
  return {chars:text.length,mods:q.getModuleCount(),mm,lvl:mm>=.30?'ok':mm>=.24?'warn':'bad'}}
async function printLabels(list,title){list=list.filter(c=>c.no).sort((a,b)=>num(a.no)-num(b.no));if(!list.length)return alert('لا توجد أصول مُرسلة لطباعة ملصقاتها.');
  const w=window.open('','_blank');if(!w)return alert('اسمح للموقع بفتح النوافذ المنبثقة لطباعة الملصقات.');w.document.write('<p style="font-family:Tahoma;padding:20px">…</p>');
  try{await needQR()}catch(e){w.close();return alert(e.message)}
  /* NV27 — roll printing (label printers, polyester roll): every label is one page of exactly W × H mm with no margin, no border and no gap,
     so the printer feeds one label per page; «rot» turns the page 90° for printers that feed the label lengthwise. A4 keeps the sheet layout. */
  const Z=labelSize(),W=Z.w*10,H=Z.h*10,roll=Z.one,rot=roll&&Z.rot,PW=rot?H:W,PH=rot?W:H;
  const L=list.map(c=>roll?`<div class="pg">${labelHTML(c,Z)}</div>`:labelHTML(c,Z)).join('');
  w.document.open();w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملصقات الأصول ${esc(title||'')}</title><style>
  @page{size:${roll?`${PW}mm ${PH}mm`:'A4'};margin:${roll?0:'8mm'}}html,body{margin:0;padding:0;color:#0f172a;background:#fff}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}${labelCSS(Z)}
  .g{display:flex;flex-wrap:wrap;gap:3mm;align-content:flex-start}.g .lb{border:1px dashed #94a3b8}
  .roll{display:flex;flex-direction:column;align-items:center;gap:4mm;padding:6mm 0}.roll .pg{width:${PW}mm;height:${PH}mm;overflow:hidden;position:relative;background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.25);border-radius:1.5mm}
  .roll .lb{border-radius:0${rot?`;position:absolute;top:0;left:0;transform-origin:top left;transform:translateX(${PW}mm) rotate(90deg)`:''}}
  .bar{padding:10px 14px;text-align:center;font-family:Tahoma,Arial;font-size:14px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;line-height:1.7}.bar button{font:inherit;padding:4px 16px;margin-inline-start:8px}.bar small{display:block;color:#475569}
  @media screen{html,body{min-height:100%;background:${roll?'#e2e8f0':'#fff'}}}
  @media print{.bar{display:none}.roll{display:block;padding:0;gap:0}.roll .pg{box-shadow:none;border-radius:0;break-after:page;page-break-after:always}.roll .pg:last-child{break-after:auto;page-break-after:auto}.g .lb{border:0}}</style></head>
  <body><div class="bar">${list.length} ملصق · ${Z.w} × ${Z.h} سم · ${roll?'رول ملصقات':'ورق A4'}${rot?' · مدوَّر 90°':''} <button onclick="print()">طباعة</button>${roll?`<small>في نافذة الطباعة: اختر طابعة الملصقات، حجم الورق ${PW} × ${PH} مم، الهوامش «بلا»، المقياس 100%، وألغِ «الرؤوس والتذييلات».</small>`:''}</div>
  <div class="${roll?'roll':'g'}">${L}</div><script>setTimeout(()=>print(),500)<\/script></body></html>`);w.document.close();if(window.markLabelsPrinted)markLabelsPrinted(list)}
/* building report: one sheet in Arabic, one in English */
function schoolReport(list,s){const sub=list.filter(c=>c.type_id);if(!sub.length)return alert('لا توجد أصول في هذا المبنى.');
  const row=(c,l)=>{const e=get('employees',c.employee_id)||{},cat=get('categories',c.category_id)||{},ty=get('types',c.type_id)||{},co=get('conditions',c.condition_id)||{},r=get('rooms',c.room_name_id)||{};const n=x=>l==='ar'?(x.ar||x.en||''):(x.en||x.ar||'');
    return [assetLabel(c),ty.code||'',n(cat),ty.l2||'',ty.l3||'',n(ty),ty.critical?(l==='ar'?'حرج':'Critical'):(l==='ar'?'غير حرج':'Non-critical'),n(co),num(c.quantity),c.price??'',c.price!=null&&c.price!==''?num(c.quantity)*Number(c.price):'',c.parent_child||'',c.brand||'',c.model||'',c.serial||'',c.floor||'',n(r),c.room_number||'',e.name||'',ymdhms(c.submitted_at)]};
  const AR=['رقم الأصل (Tag Number)','كود الأصل','المستوى الأول','المستوى الثاني','المستوى الثالث','وصف الأصل','التصنيف','الحالة الفنية','الكمية','سعر الوحدة','الإجمالي','رئيسي / فرعي','الماركة','الموديل','الرقم التسلسلي','الدور','اسم الغرفة','رقم الغرفة','مشرف الميدان','تاريخ الإرسال'];
  const EN=['Tag Number','Asset Code','Level 1','Level 2','Level 3','Asset','Criticality','Condition','Quantity','Unit Price','Total','Parent/Child','Brand','Model','Serial Number','Floor','Room Name','Room Number','Field Supervisor','Submitted At'];
  const head=l=>[[l==='ar'?'المبنى':'Building',s.name],[l==='ar'?'رقم المبنى':'Building Number',s.moe],[l==='ar'?'المعرّف':'Identifier',s.ident],[l==='ar'?'المحافظة':'City',s.city],[]];
  writeXlsx([['عربي',[...head('ar'),AR,...sub.map(c=>row(c,'ar'))]],['English',[...head('en'),EN,...sub.map(c=>row(c,'en'))]]],`${s.moe||s.ident}_${s.name}_report.xlsx`)}
/* collections import (same columns as the export; every row is checked first, nothing is added if one row fails) */
async function importCollections(){const f=await pickFile('.xlsx,.xls,.csv');if(!f)return;let rows;try{rows=await readXlsx(f);if(typeof xlFromAr==='function')rows=xlFromAr(rows)}catch(e){return alert(e.message)}
  const pick=(r,names)=>{for(const n of names)if(n in r&&String(r[n]).trim()!=='')return String(r[n]).trim();return ''};
  const byName=(t,v)=>{if(!v)return null;const n=norm(v);return S[t].find(x=>norm(x.ar)===n||norm(x.en)===n)||null};
  const errs=[],out=[],seen=new Set();const labels=new Set(S.collections.map(c=>NV38.norm(assetLabel(c))));
  rows.forEach((r,i)=>{const line=i+2,E=m=>errs.push(`السطر ${line}: ${m}`);
    const empN=pick(r,['Employee #','الرقم الوظيفي']),e=S.employees.find(x=>String(x.number)===empN);if(!e)return E(`الموظف «${empN}» غير موجود`);
    const sid=pick(r,['Building Identifier','معرّف المبنى']),moe=pick(r,['Building Number','رقم المبنى']);const s=S.schools.find(x=>(sid&&x.ident===sid)||(!sid&&moe&&x.moe===moe));if(!s)return E(`المبنى «${sid||moe}» غير موجودة`);
    const room=byName('rooms',pick(r,['Room Name','اسم الغرفة']));if(!room)return E('اسم الغرفة غير موجود في القائمة');
    const cat=byName('categories',pick(r,['Category','الفئة']));if(!cat)return E('الفئة غير موجودة');
    const tn=norm(pick(r,['Asset Type','نوع الأصل']));const ty=S.types.find(x=>x.cat===cat.id&&(norm(x.ar)===tn||norm(x.en)===tn));if(!ty)return E('نوع الأصل غير موجود في هذه الفئة');
    const cv=pick(r,['Condition','الحالة الفنية']);const co=cv?byName('conditions',cv):null;if(cv&&!co)return E(`الحالة «${cv}» غير موجودة`);
    const q=pick(r,['Quantity','الكمية'])||'1',pr=pick(r,['Price','السعر']);if(!/^\d+$/.test(q))return E('الكمية يجب أن تكون صفراً أو أكثر');if(pr&&!(Number(pr)>=0))return E('السعر يجب أن يكون صفراً أو أكثر');
    const lb=pick(r,['Tag Number','Label Number','رقم الملصق']);if(lb&&(labels.has(NV38.norm(lb))||seen.has(NV38.norm(lb))))return E(`رقم الملصق ${lb} مكرر`);if(lb)seen.add(NV38.norm(lb));
    const sub=pick(r,['Submitted At','تاريخ الإرسال']);const d=sub&&!isNaN(new Date(sub))?new Date(sub).toISOString():now();
    out.push(Object.assign(newCollection(e.id,s.id,null,{}),{floor:pick(r,['Floor','الدور']),room_number:pick(r,['Room Number','رقم الغرفة']),room_name_id:room.id,category_id:cat.id,type_id:ty.id,condition_id:co?co.id:null,quantity:+q,price:pr===''?null:Number(pr),
      manufacturer:pick(r,['Manufacturer']),brand:pick(r,['Brand','الماركة']),model:pick(r,['Model','الموديل']),capacity:pick(r,['Capacity']),serial:pick(r,['Serial Number','الرقم التسلسلي']),
      agency:pick(r,['Agency']),warranty:pick(r,['Warranty']),install_date:pick(r,['Installation Date']),asad_country:pick(r,['ASAD Country']),tag:pick(r,['Asset Number','رقم الأصل','ASAD Tag #','رقم ASAD']),parent_child:pick(r,['Parent/Child','رئيسي / فرعي']),notes:pick(r,['Notes','ملاحظات']),submitted_at:d}))});
  if(!rows.length)return alert('الملف فارغ.');
  if(errs.length){alert(`لم يُستورد أي سجل — ${errs.length} سطر فيه أخطاء:\n\n`+errs.slice(0,25).join('\n')+(errs.length>25?`\n… و${errs.length-25} أخرى`:''));return}
  if(!await duplicatePreflight(out))return;
  if(!await limitOk('assets',out.length))return;
  if(!confirm(`كل الأسطر سليمة. استيراد ${out.length} سجل جرد؟`))return;
  S.collections.push(...out);save('collections');setAFlash(`تم استيراد ${out.length} سجل جرد.`);vData()}
/* in-app notifications: schools finished by field supervisors and edits of submitted assets */
function notifList(){const ev=[];const since=Date.now()-60*864e5;
  for(const s of S.schools)if(s.completed_at&&new Date(s.completed_at).getTime()>since)ev.push({at:s.completed_at,icon:'bi-check-circle-fill text-success',t:`${empName(s.completed_by)==='—'?'تم':empName(s.completed_by)+' أنهى'} جرد ${s.name}`,h:s.completed_by?`#admin/collections/view/${encodeURIComponent(s.completed_by)}/${encodeURIComponent(s.id)}`:`#admin/collections?school_id=${encodeURIComponent(s.id)}`});
  for(const l of S.log)if(String(l.by).startsWith('emp:')&&new Date(l.at).getTime()>since)ev.push({at:l.at,icon:'bi-pencil-square text-warning',t:`${empName(String(l.by).slice(4))} عدّل أصلاً مُرسلاً في ${(get('schools',l.school)||{}).name||''}`,h:'#admin/collections/'+encodeURIComponent(l.coll)});
  return ev.sort((a,b)=>a.at<b.at?1:-1).slice(0,30)}
function notifBell(){const seen=lsGet('nv_notif_seen','');const ev=notifList();const n=ev.filter(x=>x.at>seen).length;
  return `<li class="nav-item dropdown"><a class="nav-link position-relative" href="javascript:void 0" data-bs-toggle="dropdown" data-nv-notif title="الإشعارات"><i class="bi bi-bell"></i>${n?`<span class="position-absolute top-0 start-0 badge rounded-pill bg-danger" style="font-size:.6rem">${n>9?'9+':n}</span>`:''}</a>
   <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" style="width:340px;max-width:92vw"><div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom"><strong>الإشعارات</strong>${n?'<button type="button" class="btn btn-link btn-sm p-0" data-nv-notif-read>تعليم الكل كمقروء</button>':''}</div>
   <div style="max-height:380px;overflow:auto">${ev.map(x=>`<a href="${x.h}" class="dropdown-item d-flex gap-2 py-2 text-wrap ${x.at>seen?'bg-primary-subtle':''}"><i class="bi ${x.icon} mt-1"></i><span class="small">${esc(x.t)}<br><span class="text-muted">${ymdhms(x.at)}</span></span></a>`).join('')||'<p class="text-muted small text-center py-4 mb-0">لا توجد إشعارات خلال آخر 60 يوماً.</p>'}</div></div></li>`}
document.addEventListener('click',e=>{if(e.target.closest('[data-nv-notif-read]')){e.preventDefault();const ev=notifList();if(ev[0])lsSet('nv_notif_seen',ev[0].at);route()}});
</script>
<script id="nv-nv14">
/* NV14 — the approved 4-level asset catalog (level 1 › 2 › 3 › asset, 12-digit code, critical / not critical) */
function catalogBar(){const n=S.types.filter(t=>t.code).length,c=S.types.filter(t=>t.critical).length,ro=Cloud.on&&Cloud.role==='reader';const p=qp();
  return `<div class="border-bottom px-3 py-2 d-flex flex-wrap align-items-center gap-2 bg-body-tertiary"><span class="small"><i class="bi bi-diagram-3 text-primary me-1"></i>دليل الأصول المعتمد: <b>${n}</b> أصلاً بكود، منها <b class="text-danger">${c}</b> حرج</span>
   <a class="btn btn-xs ${p.get('crit')==='1'?'btn-danger':'btn-outline-danger'}" href="${withQuery({crit:p.get('crit')==='1'?null:'1',page:null})}">الحرجة فقط</a>
   ${ro?'':`<span class="ms-auto d-flex gap-2"><button type="button" class="btn btn-xs btn-outline-primary" id="catSeed"><i class="bi bi-patch-check me-1"></i>اعتماد الدليل المدمج (279)</button><button type="button" class="btn btn-xs btn-outline-success" id="catFile"><i class="bi bi-file-earmark-excel me-1"></i>استيراد دليل من Excel</button></span>`}</div>`}
async function applyCatalog(rows,label){const usedT=new Set(S.collections.map(c=>c.type_id)),before=S.types.length;
  const r=catalogInto(S,rows);if(!r.add&&!r.upd)return alert('لم أجد أي صف صالح. الأعمدة: المستوى الأول، الثاني، الثالث، وصف الأصل، الكود (أرقام)، حرج / غير حرج.');
  /* the old list (types without a code) leaves when no record uses it, and so do empty categories */
  const old=S.types.filter(t=>!t.code&&!usedT.has(t.id));S.types=S.types.filter(t=>t.code||usedT.has(t.id));
  const usedC=new Set(S.types.map(t=>t.cat).concat(S.collections.map(c=>c.category_id)));const oc=S.categories.filter(c=>!usedC.has(c.id));S.categories=S.categories.filter(c=>usedC.has(c.id));
  reindex();save('categories');save('types');if(Cloud.on){await Cloud.sync();if(Cloud.err){setAFlash('لم يُحفظ كله في قاعدة البيانات: '+Cloud.err.message,'danger');return route()}
    if(old.length||oc.length){try{const c=await Cloud.sb();if(old.length)Cloud.chk(await c.from('nv_types').delete().in('id',old.map(t=>t.id)));if(oc.length)Cloud.chk(await c.from('nv_categories').delete().in('id',oc.map(x=>x.id)));await Cloud.pull()}catch(e){setAFlash('تم الاعتماد، لكن لم تُحذف القائمة القديمة من قاعدة البيانات: '+e.message,'warning');return route()}}}
  setAFlash(`${label}: ${r.add} أصل جديد، ${r.upd} محدَّث، ${r.cats} فئة جديدة${old.length?`، وحُذف ${old.length} نوع قديم غير مستخدم`:''}.`);route()}
document.addEventListener('click',async e=>{
  if(e.target.closest('#catSeed')){if(!confirm('اعتماد دليل الأصول المدمج (279 أصلاً بأربعة مستويات وكود وتصنيف حرج)؟ الأنواع القديمة غير المستخدمة في أي سجل تُحذف، والمستخدمة تبقى.'))return;
    applyCatalog(JSON.parse(document.getElementById('nv-seed').textContent).catalog||[],'تم اعتماد الدليل')}
  if(e.target.closest('#catFile')){const f=await pickFile('.xlsx,.xls,.csv');if(!f)return;try{await needXLSX();const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:''}).slice(1).filter(r=>r.some(x=>String(x).trim()));
    if(!confirm(`استيراد ${rows.length} صف من «${f.name}» إلى دليل الأصول؟ الأصل الموجود بنفس الكود يُحدَّث.`))return;applyCatalog(rows,'تم استيراد الدليل')}catch(er){alert(er.message)}}});
</script>
<script id="nv-nv15">
/* NV15 — «دليل الأصول» as a full data table: every column sortable, a filter per column, row selection with bulk actions, Excel export / import */
const CAT_COLS=[['code','الكود'],['l1','المستوى الأول'],['l2','المستوى الثاني'],['l3','المستوى الثالث'],['ar','وصف الأصل الموحد'],['en','الاسم بالإنجليزية'],['critical','التصنيف'],['used','الاستخدام']];
const catState={sort:'code',dir:'asc',f:{},sel:new Set(),page:1,per:50};
function catRows(){const used=new Map();for(const c of S.collections)used.set(c.type_id,(used.get(c.type_id)||0)+num(c.quantity||1));
  return S.types.map(t=>({t,id:t.id,code:t.code||'',l1:(get('categories',t.cat)||{}).ar||'',l2:t.l2||'',l3:t.l3||'',ar:t.ar||'',en:t.en||'',critical:t.critical?1:0,used:used.get(t.id)||0}))}
function catFiltered(){const F=catState.f;const has=(v,q)=>!q||norm(v).includes(norm(q));
  let L=catRows().filter(r=>has(r.code,F.code)&&(!F.l1||r.l1===F.l1)&&(!F.l2||r.l2===F.l2)&&(!F.l3||r.l3===F.l3)&&has(r.ar,F.ar)&&has(r.en,F.en)&&(F.critical==null||F.critical===''||String(r.critical)===F.critical)&&(F.used==null||F.used===''||(F.used==='1'?r.used>0:r.used===0))&&(!F.q||[r.code,r.l1,r.l2,r.l3,r.ar,r.en].some(v=>norm(v).includes(norm(F.q)))));
  const k=catState.sort,d=catState.dir==='desc'?-1:1;return L.sort((a,b)=>cmp(a[k],b[k])*d||cmp(a.code,b.code))}
function vCatalog(){const ro=Cloud.on&&(Cloud.role==='reader'||!can('catalog'));
  adminShell('asset-types','دليل الأصول',`<style>
   .nvc-card .table{--bs-table-striped-bg:rgba(37,99,235,.035)}.nvc-card thead th{position:sticky;top:0;z-index:2;background:#f8fafc;white-space:nowrap;font-size:.8rem;color:#334155;border-bottom-width:1px}
   .nvc-card thead tr.nvc-f th{top:38px;background:#fff;padding:.35rem .4rem}.nvc-card thead tr.nvc-f .form-control,.nvc-card thead tr.nvc-f .form-select{font-size:.74rem;padding:.2rem .35rem;min-width:0;width:100%}.nvc-card thead tr.nvc-f .form-select{padding-inline-start:1.4rem;background-position:left .3rem center}
   .nvc-card table{table-layout:fixed;width:100%;min-width:980px}.nvc-card td,.nvc-card th{overflow-wrap:anywhere}.nvc-card .nvc-chip{white-space:normal;text-align:start;line-height:1.3}
   .nvc-sort{cursor:pointer;user-select:none}.nvc-sort:hover{color:#2563eb}.nvc-sort i{opacity:.35}.nvc-sort.on i{opacity:1;color:#2563eb}
   .nvc-card tbody td{font-size:.86rem;vertical-align:middle}.nvc-card tbody tr.crit td:first-child{box-shadow:inset -3px 0 0 #dc2626}.nvc-card tbody tr.sel{--bs-table-bg:#eff6ff}
   .nvc-wrap{max-height:68vh;overflow:auto}.nvc-chip{font-size:.72rem}
   [data-bs-theme=dark] .nvc-card thead th{background:#1e293b;color:#cbd5e1}[data-bs-theme=dark] .nvc-card thead tr.nvc-f th{background:#0f172a}</style>
  <div class="card shadow-sm border-0 nvc-card"><div class="card-header bg-white py-3 d-flex flex-wrap align-items-center gap-2">
   <h3 class="card-title fw-bold mb-0 me-auto"><i class="bi bi-diagram-3 me-2 text-primary"></i>دليل الأصول <span class="badge text-bg-light border fw-normal" id="nvcCount"></span></h3>
   <div class="input-group input-group-sm" style="width:240px"><span class="input-group-text bg-white"><i class="bi bi-search"></i></span><input class="form-control" id="nvcQ" placeholder="بحث في كل الأعمدة..." value="${esc(catState.f.q||'')}"></div>
   <button class="btn btn-sm btn-outline-secondary" id="nvcClear" title="مسح كل الفلاتر"><i class="bi bi-funnel"></i> مسح الفلاتر</button>
   <button class="btn btn-sm btn-success" id="nvcXl"><i class="bi bi-file-earmark-excel me-1"></i>تصدير Excel</button>
   ${ro?'':`<button class="btn btn-sm btn-outline-success" id="catFile"><i class="bi bi-upload me-1"></i>استيراد Excel</button><button class="btn btn-sm btn-outline-primary" id="catSeed"><i class="bi bi-patch-check me-1"></i>اعتماد الدليل المدمج</button><a href="#admin/asset-types/create" class="btn btn-sm btn-primary"><i class="bi bi-plus-lg me-1"></i>إضافة أصل</a>`}</div>
  <div id="nvcBulk" class="px-3 py-2 border-bottom d-none flex-wrap align-items-center gap-2" style="background:#eff6ff"><b class="text-primary small"><span id="nvcSelN">0</span> محدد</b>
   <button class="btn btn-xs btn-success" data-nvc="xl"><i class="bi bi-download"></i> تصدير المحدد</button>${ro?'':`<button class="btn btn-xs btn-danger" data-nvc="crit">تعيين «حرج»</button><button class="btn btn-xs btn-outline-secondary" data-nvc="ncrit">تعيين «غير حرج»</button><button class="btn btn-xs btn-outline-danger" data-nvc="del"><i class="bi bi-trash"></i> حذف غير المستخدم</button>`}
   <button class="btn btn-xs btn-link" data-nvc="none">إلغاء التحديد</button></div>
  <div class="nvc-wrap"><table class="table table-hover table-striped mb-0"><thead><tr><th style="width:34px" class="text-center"><input type="checkbox" class="form-check-input" id="nvcAll" title="تحديد كل النتائج"></th>
   ${CAT_COLS.map(([k,l])=>`<th class="nvc-sort" data-sort="${k}" style="width:${{code:'124px',l1:'14%',l2:'12%',l3:'12%',ar:'17%',en:'12%',critical:'92px',used:'80px'}[k]}">${l} <i class="bi bi-arrow-down-up"></i></th>`).join('')}<th class="text-end pe-2" style="width:52px"></th></tr>
   <tr class="nvc-f"><th></th>${CAT_COLS.map(([k])=>`<th>${['l1','l2','l3'].includes(k)?`<select class="form-select" data-f="${k}"></select>`:k==='critical'?`<select class="form-select" data-f="critical"><option value="">الكل</option><option value="1">حرج</option><option value="0">غير حرج</option></select>`:k==='used'?`<select class="form-select" data-f="used"><option value="">الكل</option><option value="1">مستخدم</option><option value="0">غير مستخدم</option></select>`:`<input class="form-control" data-f="${k}" placeholder="تصفية...">`}</th>`).join('')}<th></th></tr></thead><tbody id="nvcBody"></tbody></table></div>
  <div class="card-footer bg-white d-flex flex-wrap align-items-center gap-2"><span class="small text-muted" id="nvcInfo"></span><select class="form-select form-select-sm ms-auto" id="nvcPer" style="width:auto">${[25,50,100,0].map(n=>`<option value="${n}" ${catState.per===n?'selected':''}>${n?n+' صف':'الكل'}</option>`).join('')}</select><nav><ul class="pagination pagination-sm mb-0" id="nvcPg"></ul></nav></div></div>`);
  const F=catState.f;
  $$('[data-f]').forEach(el=>{if(el.tagName==='INPUT')el.value=F[el.dataset.f]||'';el.oninput=el.onchange=()=>{F[el.dataset.f]=el.value;if(el.dataset.f==='l1'){F.l2='';F.l3=''}if(el.dataset.f==='l2')F.l3='';catState.page=1;draw()}});
  $('#nvcQ').oninput=e=>{F.q=e.target.value;catState.page=1;draw()};$('#nvcClear').onclick=()=>{catState.f={};catState.page=1;vCatalog()};
  $$('[data-sort]').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;catState.dir=catState.sort===k&&catState.dir==='asc'?'desc':'asc';catState.sort=k;draw()});
  $('#nvcPer').onchange=e=>{catState.per=+e.target.value;catState.page=1;draw()};
  $('#nvcAll').onchange=e=>{const ids=catFiltered().map(r=>r.id);ids.forEach(id=>e.target.checked?catState.sel.add(id):catState.sel.delete(id));draw()};
  $('#nvcXl').onclick=()=>catExport(catFiltered(),'asset-catalog');
  $$('[data-nvc]').forEach(b=>b.onclick=()=>catBulk(b.dataset.nvc));
  draw();
  function opts(el,vals,cur){el.innerHTML=`<option value="">الكل</option>`+vals.map(v=>`<option ${v===cur?'selected':''}>${esc(v)}</option>`).join('')}
  function draw(){const all=catRows(),rows=catFiltered();const u=a=>[...new Set(a)].filter(Boolean).sort((x,y)=>x.localeCompare(y,'ar'));
    opts($('[data-f="l1"]'),u(all.map(r=>r.l1)),F.l1);opts($('[data-f="l2"]'),u(all.filter(r=>!F.l1||r.l1===F.l1).map(r=>r.l2)),F.l2);opts($('[data-f="l3"]'),u(all.filter(r=>(!F.l1||r.l1===F.l1)&&(!F.l2||r.l2===F.l2)).map(r=>r.l3)),F.l3);
    $$('[data-f="critical"],[data-f="used"]').forEach(s=>s.value=F[s.dataset.f]||'');
    $$('[data-sort]').forEach(th=>{const on=th.dataset.sort===catState.sort;th.classList.toggle('on',on);th.querySelector('i').className='bi '+(on?(catState.dir==='asc'?'bi-sort-up':'bi-sort-down'):'bi-arrow-down-up')});
    const per=catState.per||rows.length||1,last=Math.max(1,Math.ceil(rows.length/per));catState.page=Math.min(catState.page,last);const items=rows.slice((catState.page-1)*per,catState.page*per);
    const hi=(v,k)=>{const q=F[k]||F.q;if(!q||!v)return esc(v||'');const i=norm(v).indexOf(norm(q));return i<0||norm(v).length!==v.length?esc(v):esc(v.slice(0,i))+'<mark class="p-0">'+esc(v.slice(i,i+q.length))+'</mark>'+esc(v.slice(i+q.length))};
    $('#nvcBody').innerHTML=items.map(r=>`<tr class="${r.critical?'crit':''} ${catState.sel.has(r.id)?'sel':''}"><td class="text-center"><input type="checkbox" class="form-check-input" data-id="${esc(r.id)}" ${catState.sel.has(r.id)?'checked':''}></td>
     <td class="font-monospace small text-nowrap" dir="ltr" style="overflow-wrap:normal">${hi(r.code,'code')||'<span class="text-muted">—</span>'}</td><td><span class="badge bg-primary-subtle text-primary border border-primary-subtle nvc-chip">${esc(r.l1)}</span></td><td class="small">${esc(r.l2)}</td><td class="small">${esc(r.l3)}</td>
     <td class="fw-semibold">${hi(r.ar,'ar')}</td><td class="small text-muted" dir="ltr">${hi(r.en,'en')}</td><td>${r.critical?'<span class="badge text-bg-danger">⚠️ حرج</span>':'<span class="badge text-bg-light border">غير حرج</span>'}</td>
     <td class="text-center">${r.used?`<span class="badge rounded-pill bg-info-subtle text-info border border-info-subtle">${r.used}</span>`:'<span class="text-muted small">—</span>'}</td>
     <td class="text-end pe-3 text-nowrap">${ro?'':iconBtn(`#admin/asset-types/${encodeURIComponent(r.id)}/edit`,'bi-pencil text-warning','تعديل')}</td></tr>`).join('')||emptyRow(CAT_COLS.length+2,'bi-search','لا توجد نتائج مطابقة للفلاتر','جرّب كلمة أخرى أو امسح الفلاتر.');
    $$('#nvcBody [data-id]').forEach(c=>c.onchange=()=>{c.checked?catState.sel.add(c.dataset.id):catState.sel.delete(c.dataset.id);c.closest('tr').classList.toggle('sel',c.checked);bulk()});
    $('#nvcCount').textContent=`${rows.length} من ${all.length} · ${rows.filter(r=>r.critical).length} حرج`;
    $('#nvcInfo').textContent=rows.length?`عرض ${(catState.page-1)*per+1}–${(catState.page-1)*per+items.length} من ${rows.length}`:'';
    const pg=[];const P=(n,l,dis,act)=>`<li class="page-item ${dis?'disabled':''} ${act?'active':''}"><a class="page-link" href="javascript:void 0" data-pg="${n}">${l}</a></li>`;
    if(last>1){pg.push(P(catState.page-1,'&rsaquo;',catState.page<=1));for(let i=1;i<=last;i++){if(i===1||i===last||Math.abs(i-catState.page)<=2)pg.push(P(i,i,false,i===catState.page));else if(Math.abs(i-catState.page)===3)pg.push('<li class="page-item disabled"><span class="page-link">…</span></li>')}pg.push(P(catState.page+1,'&lsaquo;',catState.page>=last))}
    $('#nvcPg').innerHTML=pg.join('');$$('#nvcPg [data-pg]').forEach(a=>a.onclick=()=>{catState.page=+a.dataset.pg;draw()});
    const ids=rows.map(r=>r.id);$('#nvcAll').checked=ids.length>0&&ids.every(id=>catState.sel.has(id));$('#nvcAll').indeterminate=!$('#nvcAll').checked&&ids.some(id=>catState.sel.has(id));bulk()}
  function bulk(){const n=[...catState.sel].filter(id=>get('types',id)).length;$('#nvcBulk').classList.toggle('d-none',!n);$('#nvcBulk').classList.toggle('d-flex',!!n);$('#nvcSelN').textContent=n}
  window.__nvcDraw=draw}
/* Excel: the same 6 columns as the approved file (+ English name), so an exported file can be edited and imported back */
function catExport(rows,name){writeXlsx([['دليل الأصول',[['المستوى الأول','المستوى الثاني','المستوى الثالث','وصف الأصل الموحد','كود الأصل كله','حرج / غير حرج','الاسم بالإنجليزية','الاستخدام'],...rows.map(r=>[r.l1,r.l2,r.l3,r.ar,r.code,r.critical?'حرج':'غير حرج',r.en,r.used])]]],name+'-'+stampDash()+'.xlsx')}
async function catBulk(a){const ids=[...catState.sel].filter(id=>get('types',id));
  if(a==='none'){catState.sel.clear();return vCatalog()}
  if(a==='xl'){const set=new Set(ids);return catExport(catRows().filter(r=>set.has(r.id)),'asset-catalog-selected')}
  if(a==='crit'||a==='ncrit'){if(!confirm(`تعيين ${ids.length} أصل «${a==='crit'?'حرج':'غير حرج'}»؟`))return;for(const id of ids)get('types',id).critical=a==='crit';save('types');setAFlash(`تم تحديث تصنيف ${ids.length} أصل.`);return vCatalog()}
  if(a==='del'){const used=new Set(S.collections.map(c=>c.type_id));const del=ids.filter(id=>!used.has(id));const keep=ids.length-del.length;
    if(!del.length)return alert('كل الأصول المحددة مستخدمة في سجلات جرد ولا يمكن حذفها.');if(!confirm(`حذف ${del.length} أصل من الدليل؟${keep?`\n(${keep} مستخدم في سجلات جرد ولن يُحذف)`:''}`))return;
    const set=new Set(del);S.types=S.types.filter(t=>!set.has(t.id));for(const id of del)catState.sel.delete(id);reindex();save('types');setAFlash(`تم حذف ${del.length} أصل من الدليل.`);return vCatalog()}}
</script>
<script id="nv-nv16">
/* NV16 — one data-table component (sort on every column, a filter per column, search, selection kept across pages, bulk actions, Excel export / import),
   used by «المباني» and «المستخدمون ← مشرفو الميدان» */
const NVT={};
/* NV47: saved views per table and user on this browser (filters, sort, columns, page size); the last state comes back on the next visit */
const nvtKey=k=>'nv_tview_'+(Cloud.on&&Cloud.cfg?.()?.url?Cloud.scope():'local')+'_'+(Cloud.user?.id||'admin')+'_'+k;
const nvtPack=st=>({f:Object.fromEntries(Object.entries(st.f).filter(([,v])=>v!=null&&v!=='')),sort:st.sort,dir:st.dir,hidden:[...st.hidden],per:st.per,group:st.group||''});
function nvtApply(st,v,c){if(!v||typeof v!=='object')return;const ks=new Set(c.cols.map(x=>x.k));for(const k in st.f)delete st.f[k];for(const [k,x] of Object.entries(v.f||{}))if(k==='q'||ks.has(k))st.f[k]=String(x);
  if(ks.has(v.sort))st.sort=v.sort;st.dir=v.dir==='desc'?'desc':'asc';if(Array.isArray(v.hidden))st.hidden=new Set(v.hidden.filter(k=>ks.has(k)));if([25,50,100,0].includes(v.per))st.per=v.per;st.group=ks.has(v.group)?v.group:'';st.gclosed=new Set();st.page=1}
function nvTable(c){const st=NVT[c.key]||(NVT[c.key]={sort:c.sort||c.cols[0].k,dir:c.dir||'asc',f:{},sel:new Set(),page:1,per:50,hidden:new Set(c.cols.filter(k=>k.hide).map(k=>k.k))});const qs=(location.hash.split('?')[1])||'';
  if(!st.restored){st.restored=1;if(!qs){nvtApply(st,lsGet(nvtKey(c.key)+'_last',null),c);st.qs=qs}}
  if(c.init&&st.qs!==qs){st.qs=qs;for(const k in st.f)delete st.f[k];st.page=1;c.init(st)}const vis=c.cols.filter(k=>!st.hidden.has(k.k));
  const views=(a=>Array.isArray(a)?a.filter(v=>v&&typeof v.name==='string'):[])(lsGet(nvtKey(c.key)+'_views',[])).slice(0,20);
  const ro=Cloud.on&&Cloud.role==='reader';const F=st.f;const noDel=!can('delete'),noImp=!can('import'),noExp=!can('export');
  const head=`<style>.nvt .table{--bs-table-striped-bg:rgba(37,99,235,.035)}.nvt thead th{position:sticky;top:0;z-index:2;background:#f8fafc;white-space:nowrap;font-size:.8rem;color:#334155}
   .nvt thead tr.nvt-f th{top:37px;background:#fff;padding:.3rem .35rem}.nvt thead tr.nvt-f .form-control,.nvt thead tr.nvt-f .form-select{font-size:.74rem;padding:.2rem .35rem;width:100%;min-width:0}.nvt thead tr.nvt-f .form-select{padding-inline-start:1.4rem;background-position:left .3rem center}
   .nvt-sort{cursor:pointer;user-select:none}.nvt-sort:hover{color:#2563eb}.nvt-sort i{opacity:.35}.nvt-sort.on i{opacity:1;color:#2563eb}.nvt tbody td{font-size:.86rem;vertical-align:middle}.nvt tbody tr.sel{--bs-table-bg:#eff6ff}
   .nvt-wrap{max-height:68vh;overflow:auto}.nvt table{table-layout:fixed;width:100%;min-width:${Math.max(c.minW||900,vis.reduce((a,k)=>a+(parseInt(k.w)||170),34+(parseInt(c.actW)||90)))}px}.nvt td{overflow-wrap:anywhere}.nvt td .btn-icon{display:inline-flex;vertical-align:middle}.nvt tr.nvt-g td{background:#eef4ff!important;border-top:2px solid #c7d7fe}[data-bs-theme=dark] .nvt tr.nvt-g td{background:#1e293b!important}
   [data-bs-theme=dark] .nvt thead th{background:#1e293b;color:#cbd5e1}[data-bs-theme=dark] .nvt thead tr.nvt-f th{background:#0f172a}</style>`;
  const html=`${head}<div class="card shadow-sm border-0 nvt mb-4" id="nvt-${c.key}"><div class="card-header bg-white py-3 d-flex flex-wrap align-items-center gap-2">
   <h3 class="card-title fw-bold mb-0 me-auto"><i class="bi ${c.icon} me-2 text-primary"></i>${c.title} <span class="badge text-bg-light border fw-normal" data-nvt="count"></span>${c.sub?`<small class="text-muted d-block fw-normal mt-1" style="font-size:.78rem">${c.sub}</small>`:''}</h3>
   <div class="input-group input-group-sm" style="width:230px"><span class="input-group-text bg-white"><i class="bi bi-search"></i></span><input class="form-control" data-nvt="q" placeholder="بحث في كل الأعمدة..." value="${esc(F.q||'')}"></div>
   <button class="btn btn-sm btn-outline-secondary" data-nvt="clear"><i class="bi bi-funnel"></i> مسح الفلاتر</button>
   <div class="dropdown"><button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" data-bs-auto-close="outside" data-nvt="cols"><i class="bi bi-layout-three-columns"></i> الأعمدة</button><div class="dropdown-menu p-2" style="min-width:200px">${c.cols.map(k=>`<label class="dropdown-item d-flex gap-2 rounded"><input type="checkbox" class="form-check-input" data-col="${k.k}" ${st.hidden.has(k.k)?'':'checked'}> ${k.l}</label>`).join('')}</div></div>
   <div class="dropdown"><button class="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" data-nvt="views"><i class="bi bi-bookmark-star"></i> العروض${views.length?` <span class="badge text-bg-primary">${views.length}</span>`:''}</button><div class="dropdown-menu p-1" style="min-width:240px">
    ${views.map((v,i)=>`<div class="d-flex align-items-center gap-1"><button type="button" class="dropdown-item rounded flex-grow-1 text-truncate" data-nvv="${i}"><i class="bi bi-bookmark me-1 text-primary"></i>${esc(v.name)}</button><button type="button" class="btn btn-sm btn-link text-danger px-2" data-nvvdel="${i}" title="حذف العرض" aria-label="حذف العرض ${esc(v.name)}"><i class="bi bi-x-lg"></i></button></div>`).join('')||'<div class="small text-muted px-2 py-1">لا توجد عروض محفوظة.</div>'}
    <div class="dropdown-divider"></div><button type="button" class="dropdown-item rounded" data-nvt="vsave"><i class="bi bi-plus-lg me-1"></i>حفظ العرض الحالي…</button><button type="button" class="dropdown-item rounded" data-nvt="vreset"><i class="bi bi-arrow-counterclockwise me-1"></i>العرض الافتراضي</button></div></div>
   ${c.cols.some(k=>k.filter==='select')?`<select class="form-select form-select-sm" style="width:auto" data-nvt="group" aria-label="تجميع الصفوف"><option value="">بدون تجميع</option>${c.cols.filter(k=>k.filter==='select').map(k=>`<option value="${k.k}" ${st.group===k.k?'selected':''}>تجميع حسب ${k.l}</option>`).join('')}</select>`:''}
   ${noExp?'':'<button class="btn btn-sm btn-success" data-nvt="xl"><i class="bi bi-file-earmark-excel me-1"></i>تصدير Excel</button>'}
   ${ro||noImp||!c.onImport?'':'<button class="btn btn-sm btn-outline-success" data-nvt="imp"><i class="bi bi-upload me-1"></i>استيراد Excel</button>'}${ro?'':(c.tools||'')}</div>
  <div data-nvt="bulk" class="px-3 py-2 border-bottom d-none flex-wrap align-items-center gap-2" style="background:#eff6ff"><b class="text-primary small"><span data-nvt="seln">0</span> محدد</b>
   ${noExp?'':`<button class="btn btn-xs btn-success" data-nvb="__xl"><i class="bi bi-download"></i> تصدير المحدد</button>`}${ro?'':c.bulk.filter(b=>!(noDel&&/del/i.test(b.id))&&!(noExp&&b.id==='full')).map(b=>`<button class="btn btn-xs ${b.cls||'btn-outline-secondary'}" data-nvb="${b.id}">${b.label}</button>`).join('')}
   <button class="btn btn-xs btn-link" data-nvb="__none">إلغاء التحديد</button></div>
  <div class="nvt-wrap"><table class="table table-hover table-striped mb-0"><thead><tr><th style="width:34px" class="text-center"><input type="checkbox" class="form-check-input" data-nvt="all" title="تحديد كل النتائج"></th>
   ${vis.map(k=>`<th class="nvt-sort" data-sort="${k.k}" style="width:${k.w||'auto'}">${k.l} <i class="bi bi-arrow-down-up"></i></th>`).join('')}<th style="width:${c.actW||'90px'}"></th></tr>
   <tr class="nvt-f"><th></th>${vis.map(k=>`<th>${k.filter==='select'?`<select class="form-select" data-f="${k.k}"></select>`:k.filter===false?'':`<input class="form-control" data-f="${k.k}" placeholder="تصفية...">`}</th>`).join('')}<th></th></tr></thead><tbody data-nvt="body"></tbody></table></div>
  <div class="card-footer bg-white d-flex flex-wrap align-items-center gap-2"><span class="small text-muted" data-nvt="info"></span><select class="form-select form-select-sm ms-auto" data-nvt="per" style="width:auto">${[25,50,100,0].map(n=>`<option value="${n}" ${st.per===n?'selected':''}>${n?n+' صف':'الكل'}</option>`).join('')}</select><nav><ul class="pagination pagination-sm mb-0" data-nvt="pg"></ul></nav></div></div>`;
  const val=(r,k)=>{const col=c.cols.find(x=>x.k===k);return col&&col.v?col.v(r):r[k]};
  const rowsF=()=>{const all=c.rows();const has=(v,q)=>!q||norm(v).includes(norm(q));
    const L=all.filter(r=>c.cols.every(k=>{const q=F[k.k];if(q==null||q==='')return true;const v=val(r,k.k);return k.filter==='select'?String(v??'')===q:has(v,q)})&&(!F.q||c.cols.some(k=>has(val(r,k.k),F.q))));
    const k=st.sort,d=st.dir==='desc'?-1:1;const col=c.cols.find(x=>x.k===k)||{};return {all,rows:L.sort((a,b)=>cmp(col.sv?col.sv(a):val(a,k),col.sv?col.sv(b):val(b,k))*d)}};
  function bind(root){const Q=s=>root.querySelector(s),QA=s=>[...root.querySelectorAll(s)];
    QA('[data-f]').forEach(el=>{if(el.tagName==='INPUT')el.value=F[el.dataset.f]||'';el.oninput=el.onchange=()=>{F[el.dataset.f]=el.value;const col=c.cols.find(x=>x.k===el.dataset.f);if(col&&col.resets)col.resets.forEach(x=>F[x]='');st.page=1;draw()}});
    Q('[data-nvt="q"]').oninput=e=>{F.q=e.target.value;st.page=1;draw()};Q('[data-nvt="clear"]').onclick=()=>{for(const k in F)delete F[k];QA('[data-f]').forEach(el=>el.value='');Q('[data-nvt="q"]').value='';st.page=1;draw()};
    QA('[data-sort]').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;st.dir=st.sort===k&&st.dir==='asc'?'desc':'asc';st.sort=k;draw()});
    QA('[data-col]').forEach(x=>x.onchange=()=>{x.checked?st.hidden.delete(x.dataset.col):st.hidden.add(x.dataset.col);delete F[x.dataset.col];if(!x.checked&&st.sort===x.dataset.col)st.sort=(c.cols.find(k=>!st.hidden.has(k.k))||c.cols[0]).k;route()});
    Q('[data-nvt="per"]').onchange=e=>{st.per=+e.target.value;st.page=1;draw()};
    if(Q('[data-nvt="group"]'))Q('[data-nvt="group"]').onchange=e=>{st.group=e.target.value;st.page=1;const {rows}=rowsF();/* more rows than one page: start folded, so every group's totals show first */
      st.gclosed=st.group&&st.per&&rows.length>st.per?new Set(rows.map(r=>String(val(r,st.group)??''))):new Set();draw()};
    Q('[data-nvt="body"]').addEventListener('click',e=>{const g=e.target.closest('[data-nvg]');if(!g)return;const k=g.dataset.nvg;st.gclosed=st.gclosed||new Set();st.gclosed.has(k)?st.gclosed.delete(k):st.gclosed.add(k);draw()});
    const vk=nvtKey(c.key)+'_views',vlist=()=>{const a=lsGet(vk,[]);return Array.isArray(a)?a.filter(v=>v&&typeof v.name==='string'):[]};
    Q('[data-nvt="vsave"]').onclick=()=>{const name=String(prompt('اسم العرض (مثل: مباني بريدة غير المكتملة):','')||'').trim().slice(0,60);if(!name)return;const L=vlist().filter(v=>v.name!==name);if(L.length>=20)return alert('الحد الأقصى 20 عرضاً لهذا الجدول. احذف عرضاً أولاً.');
      L.push(Object.assign({name},nvtPack(st)));lsSet(vk,L);toast(`حُفظ العرض «${name}».`);route()};
    QA('[data-nvv]').forEach(b=>b.onclick=()=>{const v=vlist()[+b.dataset.nvv];if(!v)return;nvtApply(st,v,c);st.qs=qs;route()});
    QA('[data-nvvdel]').forEach(b=>b.onclick=e=>{e.stopPropagation();const L=vlist(),v=L[+b.dataset.nvvdel];if(!v||!confirm(`حذف العرض «${v.name}»؟`))return;L.splice(+b.dataset.nvvdel,1);lsSet(vk,L);route()});
    Q('[data-nvt="vreset"]').onclick=()=>{nvtApply(st,{f:{},sort:c.sort||c.cols[0].k,dir:c.dir||'asc',hidden:c.cols.filter(k=>k.hide).map(k=>k.k),per:50},c);try{localStorage.removeItem(nvtKey(c.key)+'_last')}catch(e){}route()};
    Q('[data-nvt="all"]').onchange=e=>{rowsF().rows.forEach(r=>e.target.checked?st.sel.add(r.id):st.sel.delete(r.id));draw()};
    if(Q('[data-nvt="xl"]'))Q('[data-nvt="xl"]').onclick=()=>c.exp(rowsF().rows,c.key);if(Q('[data-nvt="imp"]'))Q('[data-nvt="imp"]').onclick=()=>c.onImport();
    QA('[data-nvb]').forEach(b=>b.onclick=async()=>{const ids=[...st.sel].filter(id=>c.rows().some(r=>r.id===id));
      if(b.dataset.nvb==='__none'){st.sel.clear();return draw()}if(b.dataset.nvb==='__xl'){const set=new Set(ids);return c.exp(c.rows().filter(r=>set.has(r.id)),c.key+'-selected')}
      const B=c.bulk.find(x=>x.id===b.dataset.nvb);if(B)await B.run(ids,st)})}
  function opts(el,vals,cur,lbl){el.innerHTML=`<option value="">الكل</option>`+vals.map(v=>`<option value="${esc(v)}" ${String(v)===cur?'selected':''}>${esc(lbl?lbl(v):v)}</option>`).join('')}
  function draw(){const root=document.getElementById('nvt-'+c.key);if(!root)return;lsSet(nvtKey(c.key)+'_last',nvtPack(st));const Q=s=>root.querySelector(s),QA=s=>[...root.querySelectorAll(s)];const {all,rows}=rowsF();
    for(const k of vis.filter(x=>x.filter==='select')){const src=k.dep?all.filter(r=>k.dep.every(d=>!F[d]||String(val(r,d))===F[d])):all;opts(Q(`[data-f="${k.k}"]`),[...new Set(src.map(r=>val(r,k.k)))].filter(v=>v!==''&&v!=null).sort((a,b)=>cmp(a,b)),F[k.k]||'',k.lbl)}
    QA('[data-sort]').forEach(th=>{const on=th.dataset.sort===st.sort;th.classList.toggle('on',on);th.querySelector('i').className='bi '+(on?(st.dir==='asc'?'bi-sort-up':'bi-sort-down'):'bi-arrow-down-up')});
    /* NV48: grouping — the rows of one value together under a header with its count and totals (c.groupSum); a header click folds the group */
    const gcol=st.group&&c.cols.find(x=>x.k===st.group);let flat=rows;if(gcol){const gv=r=>String(val(r,gcol.k)??'');const order=[...new Set(rows.map(gv))].sort((a,b)=>(a===''?1:0)-(b===''?1:0)||cmp(a,b));const by=new Map(order.map(k=>[k,[]]));for(const r of rows)by.get(gv(r)).push(r);
      st.gclosed=st.gclosed||new Set();flat=[];for(const k of order){const L=by.get(k);flat.push({__g:k,n:L.length,rows:L});if(!st.gclosed.has(k))flat.push(...L)}}
    const per=st.per||flat.length||1,last=Math.max(1,Math.ceil(flat.length/per));st.page=Math.min(st.page,last);const items=flat.slice((st.page-1)*per,st.page*per);
    const gRow=g=>`<tr class="nvt-g"><td colspan="${vis.length+2}"><button type="button" class="btn btn-sm btn-link text-decoration-none p-0 fw-bold" data-nvg="${esc(g.__g)}" aria-expanded="${!st.gclosed.has(g.__g)}"><i class="bi ${st.gclosed.has(g.__g)?'bi-chevron-left':'bi-chevron-down'} me-1"></i>${esc(g.__g===''?'غير محدد':gcol.lbl?gcol.lbl(g.__g):g.__g)}</button> <span class="badge text-bg-light border ms-1">${nf(g.n)}</span> <span class="small text-muted ms-2">${c.groupSum?c.groupSum(g.rows):''}</span></td></tr>`;
    Q('[data-nvt="body"]').innerHTML=items.map(r=>r.__g!==undefined?gRow(r):`<tr class="${st.sel.has(r.id)?'sel':''} ${c.rowCls?c.rowCls(r):''}"><td class="text-center"><input type="checkbox" class="form-check-input" data-id="${esc(r.id)}" ${st.sel.has(r.id)?'checked':''}></td>${vis.map(k=>`<td class="${k.cls||''}">${k.html?k.html(r):esc(val(r,k.k)??'')}</td>`).join('')}<td class="text-end pe-2 text-nowrap">${ro?'':c.actions(r)}</td></tr>`).join('')||(all.length?emptyRow(vis.length+2,'bi-search','لا توجد نتائج مطابقة','جرّب كلمة أخرى أو اضغط «مسح الفلاتر».'):emptyRow(vis.length+2,c.icon,c.empty||'لا توجد بيانات بعد',c.emptyHint||''));
    QA('[data-nvt="body"] [data-id]').forEach(x=>x.onchange=()=>{x.checked?st.sel.add(x.dataset.id):st.sel.delete(x.dataset.id);x.closest('tr').classList.toggle('sel',x.checked);bulk()});
    Q('[data-nvt="count"]').textContent=`${rows.length} من ${all.length}`;Q('[data-nvt="info"]').textContent=rows.length?`عرض ${(st.page-1)*per+1}–${(st.page-1)*per+items.length} من ${rows.length}`:'';
    const P=(n,l,dis,act)=>`<li class="page-item ${dis?'disabled':''} ${act?'active':''}"><a class="page-link" href="javascript:void 0" data-pg="${n}">${l}</a></li>`;const pg=[];
    if(last>1){pg.push(P(st.page-1,'&rsaquo;',st.page<=1));for(let i=1;i<=last;i++){if(i===1||i===last||Math.abs(i-st.page)<=2)pg.push(P(i,i,false,i===st.page));else if(Math.abs(i-st.page)===3)pg.push('<li class="page-item disabled"><span class="page-link">…</span></li>')}pg.push(P(st.page+1,'&lsaquo;',st.page>=last))}
    Q('[data-nvt="pg"]').innerHTML=pg.join('');QA('[data-pg]').forEach(a=>a.onclick=()=>{st.page=+a.dataset.pg;draw()});
    const ids=rows.map(r=>r.id),all1=Q('[data-nvt="all"]');all1.checked=ids.length>0&&ids.every(id=>st.sel.has(id));all1.indeterminate=!all1.checked&&ids.some(id=>st.sel.has(id));bulk();if(c.after)c.after(root)}
  function bulk(){const root=document.getElementById('nvt-'+c.key);const n=[...st.sel].filter(id=>c.rows().some(r=>r.id===id)).length;const b=root.querySelector('[data-nvt="bulk"]');b.classList.toggle('d-none',!n);b.classList.toggle('d-flex',!!n);root.querySelector('[data-nvt="seln"]').textContent=n}
  return {html,mount(){const root=document.getElementById('nvt-'+c.key);bind(root);draw()},draw,st}}

/* ---------- «المباني» ---------- */
const SCH_ST={completed:'مكتملة',in_progress:'قيد التنفيذ',not_started:'لم تبدأ'};
function vSchools(){const sst=schoolStats();const x48u=new Map();for(const c of S.collections){if(!c.type_id||!c.submitted_at)continue;const u=x48u.get(c.school_id)||{q:0,v:0};u.q+=num(c.quantity);u.v+=c.price!=null&&c.price!==''?num(c.quantity)*Number(c.price):0;x48u.set(c.school_id,u)}const lastEmp=new Map();for(const c of S.collections){const x=lastEmp.get(c.school_id);if(!x||(c.submitted_at||'')>(x.submitted_at||''))lastEmp.set(c.school_id,c)}
  const T=nvTable({key:'schools',title:'المباني',icon:'bi-building',empty:'لا توجد مباني بعد',emptyHint:'أضف مبنى أو استورد ملف Excel بالمباني.',minW:1000,sort:'name',actW:'140px',
    init:st=>{const s=qp().get('status');if(s&&SCH_ST[s])st.f.work=SCH_ST[s];else if(s==='active'||s==='inactive')st.f.status=s==='active'?'نشطة':'غير نشطة';const q=qp().get('search');if(q)st.f.q=q;if(qp().get('missing')==='1'){st.f.miss='ناقصة';st.hidden.delete('miss')}},
    rows:()=>S.schools.map(s=>{const x=sst.get(s.id);const le=lastEmp.get(s.id);return {id:s.id,s,no:num(dispId(s.id))||0,moe:s.moe||'',ident:s.ident||'',name:s.name||'',city:s.city||'',district:s.district||'',site:s.site||'',...Object.fromEntries(siteCfg().extra.map(x=>['x_'+x.k,siteVal(s,x)])),miss:siteMissing(s),units:(x48u.get(s.id)||{}).q||0,value:(x48u.get(s.id)||{}).v||0,
      emp:s.completed_by?empName(s.completed_by):le?empName(le.employee_id):'',work:SCH_ST[schoolState(s,x)],status:s.status==='active'?'نشطة':'غير نشطة',recs:x?x.any:0,created:fmtYmd(s.created_at)}}),
    cols:siteTable([{k:'no',l:'#',w:'60px',cls:'text-muted small',hide:1},{k:'moe',l:'رقم المبنى',w:'95px'},{k:'ident',l:'المعرّف',w:'150px',cls:'small',html:r=>`<code class="text-primary">${esc(r.ident)}</code>`},
      {k:'name',l:'اسم المبنى',html:r=>{const rel=r.s.completed_by||(lastEmp.get(r.id)||{}).employee_id;return `<a class="fw-bold link-primary" href="${rel?`#admin/collections/view/${encodeURIComponent(rel)}/${encodeURIComponent(r.id)}`:`#admin/collections?school_id=${encodeURIComponent(r.id)}`}">${esc(r.name)}</a>`}},
      {k:'city',l:'المحافظة',w:'95px',filter:'select',resets:['district']},{k:'district',l:'الحي / المكتب',w:'105px',filter:'select',dep:['city']},{k:'site',l:'الموقع',w:'120px',hide:1},{k:'emp',l:'مشرف الميدان',w:'120px',filter:'select'},
      {k:'work',l:'حالة الجرد',w:'96px',filter:'select',html:r=>`<span class="badge rounded-pill ${r.work==='مكتملة'?'bg-success-subtle text-success border border-success-subtle':r.work==='قيد التنفيذ'?'bg-info-subtle text-info border border-info-subtle':'bg-secondary-subtle text-secondary border border-secondary-subtle'}">${r.work}</span>`},
      {k:'status',l:'الحالة',w:'82px',filter:'select'},{k:'recs',l:'السجلات',w:'72px',filter:false,cls:'text-center',html:r=>r.recs?`<span class="badge bg-info-subtle text-info border border-info-subtle">${r.recs}</span>`:'<span class="text-muted">—</span>'},{k:'created',l:'تاريخ الإضافة',w:'100px',cls:'small text-muted',hide:1}]),
    actions:r=>`${iconBtn('#admin/collections/building/'+encodeURIComponent(r.id),'bi-building-check text-primary','فحص جميع أصول المبنى')} ${iconBtn('#admin/schools/'+encodeURIComponent(r.id)+'/edit','bi-pencil text-warning','تعديل')} <button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-delschool="${esc(r.id)}" title="حذف"><i class="bi bi-trash text-danger"></i></button>`,
    tools:'<a href="#admin/schools/create" class="btn btn-sm btn-primary"><i class="bi bi-plus-lg me-1"></i>إضافة مبنى</a>',
    exp:(rows,name)=>writeXlsx([['المباني',[[...xlHead(['ID','Building Number','building_identifier','Name (Arabic)','City','District','Site','Status','Collection Status','Field Supervisor','Asset Collections Count','Completed At','Description','Created At']),...siteCfg().extra.map(x=>x.l)],...rows.map(r=>[r.no||r.id,r.moe,r.ident,r.name,r.city,r.district,r.site,r.s.status,r.work,r.emp,r.recs,ymdhms(r.s.completed_at),r.s.description||'',ymdhms(r.s.created_at),...siteCfg().extra.map(x=>siteVal(r.s,x))])]]],'schools-'+stampDash()+'.xlsx'),
    groupSum:L=>{const done=L.filter(r=>r.work===SCH_ST.completed).length;return `${nf(L.reduce((a,r)=>a+r.units,0))} أصل · ${sar(L.reduce((a,r)=>a+r.value,0))} ريال · الإنجاز ${L.length?Math.round(done/L.length*100):0}%`},
    onImport:()=>importSchoolsFile(()=>vSchools()),
    bulk:[{id:'complete',label:'<i class="bi bi-check-circle"></i> اعتماد كمكتملة',cls:'btn-success',run:async ids=>{if(!confirm(`اعتماد ${ids.length} مبنى كمكتملة؟`))return;for(const id of ids){const s=get('schools',id);if(s)Object.assign(s,{completed_at:s.completed_at||now(),status:'inactive'})}save('schools');setAFlash('تم اعتماد المباني المحددة كمكتملة.');vSchools()}},
      ...(siteCfg().extra.length&&can('edit')?[{id:'fill',label:'<i class="bi bi-input-cursor-text"></i> تعبئة حقل',cls:'btn-outline-primary',run:async ids=>siteFill(ids)}]:[]),
      {id:'full',label:'<i class="bi bi-images"></i> Excel كامل بالصور',cls:'btn-outline-success',run:async ids=>{const set=new Set(ids);exportFull(S.collections.filter(c=>set.has(c.school_id)),'schools-full-'+stampDash())}},
      {id:'reassign',label:'<i class="bi bi-person-gear"></i> نقل لمشرف آخر',cls:'btn-primary',run:async ids=>{NVT.schools.reIds=ids;bootstrap.Modal.getOrCreateInstance($('#reassignModal')).show()}},
      {id:'delwork',label:'<i class="bi bi-eraser"></i> حذف أعمال الجرد',cls:'btn-outline-danger',run:async ids=>{const set=new Set(ids);const n=S.collections.filter(c=>set.has(c.school_id)).length;if(!n)return alert('لا توجد أعمال جرد في المباني المحددة.');if(!confirm(`حذف ${n} سجل جرد من ${ids.length} مبنى؟ تبقى المباني نفسها.`))return;if(!await removeCollections(S.collections.filter(c=>set.has(c.school_id))))return;setAFlash('تم حذف أعمال المباني المحددة.');vSchools()}},
      {id:'del',label:'<i class="bi bi-trash"></i> حذف المباني',cls:'btn-danger',run:async (ids,st)=>{await deleteSchools(ids);ids.forEach(id=>st.sel.delete(id));vSchools()}}]});
  adminShell('schools','المباني',T.html+reassignModal('نقل المباني','اختر مشرف الميدان الذي تُنقل إليه كل أعمال المباني المحددة.'));T.mount();
  document.getElementById('nvt-schools').addEventListener('click',async e=>{const b=e.target.closest('[data-delschool]');if(b){await deleteSchools([b.dataset.delschool]);vSchools()}});
  $('#reassign-form').onsubmit=e=>{e.preventDefault();const to=e.target.new_employee_id.value;const ids=NVT.schools.reIds||[];if(!confirm('هل تريد نقل كل أعمال المباني المحددة إلى مشرف الميدان المختار؟'))return;
    const set=new Set(ids.filter(id=>!(get('schools',id)||{}).completed_at));for(const c of S.collections)if(set.has(c.school_id)){c.employee_id=to;c.updated_at=now()}save('collections');hideModal();setAFlash(`تم نقل أعمال ${set.size} مبنى.`);vSchools()}}
async function deleteSchools(ids){const set=new Set(ids);const recs=S.collections.filter(c=>set.has(c.school_id));const typed=ids.length>20?prompt(`سيتم حذف ${ids.length} مبنى نهائياً${recs.length?` مع ${recs.length} سجل جرد وصورها`:''}.\nللتأكيد اكتب: حذف`):(confirm(`حذف ${ids.length===1?'هذا المبنى':ids.length+' مبنى'} نهائياً${recs.length?` مع ${recs.length} سجل جرد وصورها`:''}؟`)?'حذف':'');
  if(typed!=='حذف')return false;if(!await removeCollections(recs))return;S.schools=S.schools.filter(s=>!set.has(s.id));reindex();save('schools');setAFlash(`تم حذف ${ids.length} مبنى.`);return true}
async function importSchoolsFile(done){const f=await pickFile('.xlsx,.xls,.csv');if(!f)return;let rows;try{rows=await readXlsx(f)}catch(e){return alert(e.message)}
  const pick=(r,names)=>{for(const n of names)if(n in r&&String(r[n]).trim()!=='')return String(r[n]).trim();return null};let add=0,upd=0,skip=0;const seen=new Set();
  {const have=new Set(S.schools.map(x=>x.ident)),nw=new Set();for(const r of rows){const id=pick(r,['building_identifier','Identifier','المعرّف','معرّف المبنى']);if(id&&!have.has(id))nw.add(id)}if(!await limitOk('schools',nw.size))return}
  for(const r of rows){const ident=pick(r,['building_identifier','Identifier','المعرّف','معرّف المبنى']);if(!ident||seen.has(ident)){skip++;continue}seen.add(ident);
    const F=siteCfg().f,nm=k=>[F[k].l];const v={name:pick(r,['Name (Arabic)','Arabic Name','name_ar','اسم المبنى',...nm('name')]),moe:pick(r,['Building Number','Building No','moe_no','رقم المبنى',...nm('moe')]),city:pick(r,['City','city_ar','المحافظة',...nm('city')]),district:pick(r,['District','District Arabic','district_ar','الحي / المكتب',...nm('district')]),site:pick(r,['Site','site','الموقع',...nm('site')]),description:pick(r,['Description','description','الوصف',...nm('description')])};
    const st=pick(r,['Status','الحالة']);if(st)v.status=/inactive|غير/i.test(st)?'inactive':'active';
    {const la=pick(r,['Latitude','Lat','lat','خط العرض']),ln=pick(r,['Longitude','Lng','Long','lng','خط الطول']),gg=pick(r,['Coordinates','الإحداثيات']);const g=parseGeo(la&&ln?la+','+ln:gg||'');if(g){v.lat=g[0];v.lng=g[1]}}
    let s=S.schools.find(x=>x.ident===ident);{const ex=siteExtraPick(r,s);if(ex)v.extra=ex}if(s){for(const [k,val] of Object.entries(v))if(val!=null)s[k]=val;upd++}else{if(!v.name){skip++;continue}s={id:nextId('schools','s'),ident,moe:'',site:'',name:'',district:'',city:'',description:'',status:'active',completed_at:null,completed_by:null,created_at:now()};for(const [k,val] of Object.entries(v))if(val!=null)s[k]=val;S.schools.push(s);add++}}
  reindex();save('schools');setAFlash(`استيراد المباني: ${add} جديدة، ${upd} محدَّثة، ${skip} صف متجاهَل (بدون معرّف أو مكرر).`);done()}

/* ---------- «المستخدمون ← مشرفو الميدان» ---------- */
let empLoginMap=null;
async function loadEmpLogins(force){if(!Cloud.on)return;if(empLoginMap&&!force)return;try{const c=await Cloud.sb();empLoginMap=new Map((Cloud.chk(await c.rpc('nv_emp_logins'))||[]).map(r=>[r.id,r.has_login]))}catch(e){empLoginMap=new Map()}}
function vEmployees(){const cnt=new Map();for(const c of S.collections)cnt.set(c.employee_id,(cnt.get(c.employee_id)||0)+1);const ed=Cloud.role==='admin'||!Cloud.on;
  const T=nvTable({key:'employees',title:'مشرفو الميدان',icon:'bi-person-badge',empty:'لا يوجد مشرفو ميدان بعد',emptyHint:'أضف مشرفاً من «إضافة مستخدم» أعلاه أو استورد ملف Excel.',sub:'يدخلون تطبيق الجرد برقمهم الوظيفي',sort:'name',minW:Cloud.on?860:760,actW:'120px',
    init:st=>{const q=qp().get('search');if(q)st.f.q=q},groupSum:L=>`${nf(L.reduce((a,r)=>a+r.recs,0))} سجل جرد`,
    rows:()=>S.employees.filter(e=>!e.archived).map(e=>({id:e.id,e,no:num(dispId(e.id))||0,number:String(e.number),name:e.name,email:e.email||'',role:'مشرف ميدان',recs:cnt.get(e.id)||0,login:!Cloud.on?'':empLoginMap?(empLoginMap.get(e.id)?'نعم':'لا'):'…',created:fmtYmd(e.created_at)})),
    cols:[{k:'no',l:'#',w:'60px',cls:'text-muted small'},{k:'number',l:'الرقم الوظيفي',w:'130px',html:r=>`<code class="text-primary">${esc(r.number)}</code>`},{k:'name',l:'الاسم',w:'24%',cls:'fw-medium'},{k:'email',l:'البريد الإلكتروني',w:'22%',cls:'small',html:r=>r.email?`<span dir="ltr">${esc(r.email)}</span>`:'<span class="text-danger small">بدون بريد</span>'},
      {k:'role',l:'الدور',w:'110px',filter:'select',html:()=>'<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle">مشرف ميدان</span>'},
      {k:'recs',l:'السجلات',w:'90px',cls:'text-center',filter:false,html:r=>r.recs?`<span class="badge rounded-pill bg-info-subtle text-info border border-info-subtle">${r.recs}</span>`:'<span class="text-muted">—</span>'},
      ...(Cloud.on?[{k:'login',l:'حساب الدخول',w:'110px',filter:'select',html:r=>r.login==='نعم'?'<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle me-1"></i>نعم</span>':r.login==='لا'?'<span class="badge rounded-pill bg-secondary-subtle text-secondary border">لا</span>':'…'}]:[]),
      {k:'created',l:'تاريخ الإضافة',w:'110px',cls:'small text-muted'}],
    actions:r=>`${Cloud.on&&ed?`<button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-setpw="${esc(r.id)}" title="${r.login==='نعم'?'كلمة مرور جديدة':'إنشاء حساب دخول'}"><i class="bi bi-key text-primary"></i></button> `:''}${iconBtn('#admin/employees/'+encodeURIComponent(r.id)+'/edit','bi-pencil text-warning','تعديل')} <button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-delemp="${esc(r.id)}" title="حذف"><i class="bi bi-trash text-danger"></i></button>`,
    tools:`<button type="button" data-adduser class="btn btn-sm btn-primary"><i class="bi bi-person-plus me-1"></i>إضافة مستخدم</button>`,
    exp:(rows,name)=>writeXlsx([['مشرفو الميدان',[['Employee Number','Name','Email','الدور','Asset Collections Count',...(Cloud.on?['حساب الدخول']:[]),'Created At'],...rows.map(r=>[r.number,r.name,r.email,r.role,r.recs,...(Cloud.on?[r.login]:[]),ymdhms(r.e.created_at)])]]],'field-supervisors-'+stampDash()+'.xlsx'),
    onImport:()=>importEmployeesFile(()=>vEmployees()),
    bulk:[...(Cloud.on&&ed?[{id:'logins',label:'<i class="bi bi-key"></i> إنشاء حسابات دخول',cls:'btn-success',run:async ids=>{await createLogins(ids.map(id=>get('employees',id)).filter(e=>e&&!(empLoginMap&&empLoginMap.get(e.id))))}}]:[]),
      {id:'del',label:'<i class="bi bi-trash"></i> حذف',cls:'btn-danger',run:async (ids,st)=>{if(await deleteEmployees(ids)){ids.forEach(id=>st.sel.delete(id));vEmployees()}}}],
    after:root=>{root.querySelectorAll('[data-setpw]').forEach(b=>b.onclick=()=>setEmpPw(b.dataset.setpw))}});
  adminShell('employees','المستخدمون',`${addUserCard()}<div id="staffBox"></div>${isSys()?'<details class="card p-3 mb-3"><summary>كل حسابات الدخول — بما فيها الحسابات غير المرتبطة</summary><div id="allLoginBox"></div></details>':''}${T.html}`);T.mount();bindAddUser();if(isSys())loadAllLogins();if(Cloud.on&&canUsers())loadStaff();
  if(Cloud.on&&!empLoginMap)loadEmpLogins().then(()=>T.draw());
  const g=document.createElement('span');if(Cloud.on&&ed){const b=document.querySelector('#nvt-employees .card-header');b.insertAdjacentHTML('beforeend','<button type="button" id="genLogins" class="btn btn-sm btn-outline-success"><i class="bi bi-key me-1"></i>حسابات لكل من ليس له</button>');
    $('#genLogins').onclick=async()=>{await loadEmpLogins(true);await createLogins(S.employees.filter(e=>!e.archived&&!empLoginMap.get(e.id)))}}
  document.getElementById('nvt-employees').addEventListener('click',async e=>{const b=e.target.closest('[data-delemp]');if(b&&await deleteEmployees([b.dataset.delemp]))vEmployees()})}
async function setEmpPw(id){const e=get('employees',id);if(!e)return;if(Cloud.pendingCount())await Cloud.sync();
  const pw=prompt(`كلمة المرور لـ ${e.name} (${e.number}) — 8 أحرف على الأقل. اترك المقترحة أو اكتب غيرها:`,genPw());if(!pw)return;
  try{const c=await Cloud.sb();Cloud.chk(await c.rpc('nv_emp_set_login',{p_emp:e.id,p_password:pw}));alert(`تم.\n\nالبريد: ${e.email||'(بدون بريد — يدخل بالرقم الوظيفي '+e.number+')'}\nكلمة المرور: ${pw}\n\nيفتح مشرف الميدان رابط Solvix ويدخل بهما.`);await loadEmpLogins(true);vEmployees()}catch(er){alert(er.message)}}
async function createLogins(list){if(!list.length)return alert('لكل المحددين حسابات دخول بالفعل.');
  if(!confirm(`إنشاء حسابات دخول لـ ${list.length} مشرف ميدان؟ سيُنزَّل ملف Excel بكلمات المرور — احفظه بأمان وأعطِ كل مشرف سطره فقط.`))return;
  await Cloud.sync();const c=await Cloud.sb();const rows=[['الرقم الوظيفي','الاسم','البريد (للدخول)','كلمة المرور','الرابط']];let ok=0;toast('جارٍ إنشاء الحسابات…',4000);
  for(const e of list){const pw=genPw();try{Cloud.chk(await c.rpc('nv_emp_set_login',{p_emp:e.id,p_password:pw}));rows.push([e.number,e.name,e.email||('nv'+String(e.number).toLowerCase().replace(/[^a-z0-9]/g,'')+'@novaro.local'),pw,Cloud.link()]);ok++}catch(er){rows.push([e.number,e.name,'خطأ: '+er.message,''])}}
  await writeXlsx([['حسابات الدخول',rows]],'solvix-logins-'+stampDash()+'.xlsx');setAFlash(`تم إنشاء ${ok} حساب دخول. كلمات المرور موجودة فقط في الملف الذي نزل.`);await loadEmpLogins(true);vEmployees()}
async function deleteEmployees(ids){if(Cloud.on){if(!isSys()){alert('حذف حسابات المستخدمين متاح لمدير النظام فقط.');return false}for(const id of ids)if(!await deleteLogin(null,id))return false;return true}const set=new Set(ids);const recs=S.collections.filter(c=>set.has(c.employee_id));
  const msg=`حذف ${ids.length===1?'مشرف الميدان «'+((get('employees',ids[0])||{}).name||'')+'»':ids.length+' مشرف ميدان'} نهائياً${recs.length?` مع ${recs.length} سجل جرد وصورها`:''}؟`;
  const typed=ids.length>20?prompt(msg+'\nللتأكيد اكتب: حذف'):(confirm(msg)?'حذف':'');if(typed!=='حذف')return false;
  if(!await removeCollections(recs))return;S.employees=S.employees.filter(x=>!set.has(x.id));for(const s of S.schools)if(set.has(s.completed_by))s.completed_by=null;reindex();save('employees');save('schools');setAFlash(`تم حذف ${ids.length} مشرف ميدان.`);return true}
async function importEmployeesFile(done){const f=await pickFile('.xlsx,.xls,.csv');if(!f)return;let rows;try{rows=await readXlsx(f)}catch(e){return alert(e.message)}let add=0,upd=0,skip=0;const seen=new Set();
  {const have=new Set(S.employees.map(x=>String(x.number))),nw=new Set();for(const r of rows){const n=String(r['Employee Number']??r['employee_number']??r['الرقم الوظيفي']??'').trim();if(n&&!have.has(n))nw.add(n)}if(!await limitOk('field',nw.size))return}
  for(const r of rows){const n=String(r['Employee Number']??r['employee_number']??r['الرقم الوظيفي']??'').trim(),nm=String(r['Name']??r['name']??r['الاسم']??'').trim();if(!n||!nm||seen.has(n)){skip++;continue}seen.add(n);
    const em=String(r['Email']??r['email']??r['البريد الإلكتروني']??r['البريد']??'').trim().toLowerCase()||null;const e=S.employees.find(x=>String(x.number)===n);if(e){e.name=nm;if(em)e.email=em;upd++}else{S.employees.push({id:nextId('employees','e'),number:n,name:nm,email:em,created_at:now()});add++}}
  reindex();save('employees');setAFlash(`استيراد مشرفي الميدان: ${add} جديد، ${upd} محدَّث${skip?`، ${skip} صف متجاهَل`:''}.`);done()}
</script>
<script id="nv-nv18">
/* NV18 — full Excel report: sheet «البيانات» (every collected field, asset number first) + sheet «صور الأصول» (asset photo, its QR code and the asset number
   side by side), for everything, one school or a selection. The same file is e-mailed when a field supervisor finishes a building (Edge Function «solvix-mail»). */
let xjsP=null;const needExcelJS=()=>xjsP||(xjsP=window.ExcelJS?Promise.resolve():loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js').catch(e=>{xjsP=null;throw e}));
async function photoThumb(key){if(!key)return null;try{let b=await IDB.get('photos',key).catch(()=>null);if(!b&&Cloud.on)b=await Cloud.fetchPhoto(key);if(!b)return null;
  const t=await resizeImage(b,360,.78);const d=await blobToData(t);const img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=d});return {b64:d.split(',')[1],w:img?img.naturalWidth:360,h:img?img.naturalHeight:270}}catch(e){return null}}
function qrPng(text){qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8'];const q=qrcode(0,'M');q.addData(text,'Byte');q.make();const n=q.getModuleCount(),cell=4,m=2,sz=(n+m*2)*cell;
  const cv=document.createElement('canvas');cv.width=cv.height=sz;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,sz,sz);g.fillStyle='#000';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))g.fillRect((c+m)*cell,(r+m)*cell,cell,cell);return cv.toDataURL('image/png').split(',')[1]}
async function buildFullXlsx(list,title,progress){await Promise.all([needExcelJS(),needQR()]);
  list=list.filter(c=>c.type_id||c.submitted_at).slice().sort((a,b)=>num(a.no)-num(b.no));
  const wb=new ExcelJS.Workbook();wb.creator='Solvix';wb.created=new Date();
  const hd={font:{bold:true,color:{argb:'FFFFFFFF'}},fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF1E3A8A'}},alignment:{vertical:'middle',horizontal:'center',wrapText:true}};
  /* sheet 1: the data */
  const ws=wb.addWorksheet('البيانات',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});const H=xlHead(EXPORT_HEAD);
  ws.addRow(H);ws.getRow(1).eachCell(c=>Object.assign(c,hd));ws.getRow(1).height=30;
  for(const c of list)ws.addRow(exportRow(c));
  ws.columns.forEach((col,i)=>{col.width=H[i]==='Label Number'?16:Math.min(34,Math.max(12,String(H[i]).length+4))});ws.autoFilter={from:'A1',to:{row:1,column:H.length}};
  /* sheet 2: photo + QR + asset number */
  const wp=wb.addWorksheet('صور الأصول',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});
  wp.columns=[{header:'رقم الأصل',width:18},{header:'صورة الأصل',width:26},{header:'لوحة البيانات',width:26},{header:'رمز QR',width:18},{header:'وصف الأصل',width:30},{header:'كود الأصل',width:16},{header:'المبنى',width:30},{header:'الموقع',width:28}];
  wp.getRow(1).eachCell(c=>Object.assign(c,hd));wp.getRow(1).height=26;
  let i=0;for(const c of list){i++;if(progress)progress(i,list.length);const ty=get('types',c.type_id)||{},s=get('schools',c.school_id)||{},rm=get('rooms',c.room_name_id)||{};
    const row=wp.addRow([assetLabel(c),'','','',ty.ar||'',ty.code||'',s.name||'',[c.floor,rm.ar,c.room_number].filter(Boolean).join(' · ')]);row.height=96;
    row.eachCell(x=>{x.alignment={vertical:'middle',horizontal:'center',wrapText:true}});row.getCell(1).font={bold:true,size:12};
    for(const [k,col] of [['asset_image',1],['asset_image2',2]]){const ph=await photoThumb(c[k]);if(ph){const id=wb.addImage({base64:ph.b64,extension:'jpeg'});const z=Math.min(170/ph.w,120/ph.h);wp.addImage(id,{tl:{col:col+.05,row:row.number-1+.05},ext:{width:Math.round(ph.w*z),height:Math.round(ph.h*z)},editAs:'oneCell'})}else row.getCell(col+1).value='لا توجد صورة'}
    if(c.no){const q=wb.addImage({base64:qrPng(qrText(c)),extension:'png'});wp.addImage(q,{tl:{col:3.1,row:row.number-1+.08},ext:{width:112,height:112},editAs:'oneCell'})}}
  /* NV51 — sheet 3: exceptions (asset not reached / label not stuck) with the photo */
  const ex=list.filter(hasExc);if(ex.length){const we=wb.addWorksheet('الاستثناءات',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});
    we.columns=[{header:'رقم الأصل',width:18},{header:'الاستثناء',width:22},{header:'السبب',width:40},{header:'صورة الاستثناء',width:26},{header:'وصف الأصل',width:30},{header:'المبنى',width:30},{header:'الموقع',width:28},{header:'مشرف الميدان',width:22},{header:'التاريخ',width:18}];
    we.getRow(1).eachCell(c=>Object.assign(c,hd));we.getRow(1).height=26;
    for(const c of ex){const ty=get('types',c.type_id)||{},s=get('schools',c.school_id)||{},rm=get('rooms',c.room_name_id)||{};
      const row=we.addRow([assetLabel(c),excText(c),[c.exc_kind?c.exc_reason:'',c.label_check==='fail'?c.label_note:''].filter(Boolean).join(' / '),'',ty.ar||'',s.name||'',[c.zone,c.floor,rm.ar,c.room_number].filter(Boolean).join(' · '),empName(c.employee_id),ymdhms(c.label_check==='fail'&&c.label_at||c.submitted_at)]);row.height=96;
      row.eachCell(x=>{x.alignment={vertical:'middle',horizontal:'center',wrapText:true}});const ph=await photoThumb(c.exc_photo||(c.label_check==='fail'?c.label_photo:null));
      if(ph){const id=wb.addImage({base64:ph.b64,extension:'jpeg'});const z=Math.min(170/ph.w,120/ph.h);we.addImage(id,{tl:{col:3.05,row:row.number-1+.05},ext:{width:Math.round(ph.w*z),height:Math.round(ph.h*z)},editAs:'oneCell'})}else row.getCell(4).value='لا توجد صورة'}}
  const buf=await wb.xlsx.writeBuffer();return new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
async function exportFull(list,name){const sub=list.filter(c=>c.type_id);if(!sub.length)return alert('لا توجد أصول للتصدير.');
  if(sub.length>800&&!confirm(`سيُجهَّز ملف فيه ${sub.length} أصل بالصور — قد يستغرق عدة دقائق ويكون حجمه كبيراً. متابعة؟`))return;
  const box=document.createElement('div');box.className='nv-toast';box.textContent='جارٍ تجهيز الملف…';document.body.appendChild(box);
  try{const b=await buildFullXlsx(sub,name,(i,n)=>{box.textContent=`جارٍ تجهيز الصور ${i} / ${n}…`});download(b,name.replace(/[\\/:*?"<>|]/g,'-')+'.xlsx')}catch(e){alert(e.message)}finally{box.remove()}}

/* ---- e-mail when a field supervisor finishes a building ----
   The page cannot send mail by itself: it calls the Supabase Edge Function «solvix-mail» (supabase/functions/solvix-mail), which checks the caller, picks the
   recipients on the server (the supervisor's e-mail + «بريد المستلمين» in the settings) and sends through Resend. Queued until the records and photos are sent. */
const MAILQ=()=>Cloud.on?'nv_mail_queue_'+Cloud.scope()+'_'+(Cloud.user&&Cloud.user.id||'signed-out'):'nv_mail_queue_local';
const mailQ=()=>{try{return JSON.parse(localStorage.getItem(MAILQ())||'[]')}catch(e){return []}};const mailQSet=q=>{try{localStorage.setItem(MAILQ(),JSON.stringify(q))}catch(e){}};
function queueSchoolMail(schoolId,empId){if(!Cloud.on)return;const q=mailQ().filter(x=>x.school!==schoolId);q.push({school:schoolId,emp:empId,at:now(),tries:0});mailQSet(q);setTimeout(flushMail,1500)}
let mailBusy=false;
async function flushMail(){if(mailBusy||!Cloud.on||!navigator.onLine)return;let q=mailQ();if(!q.length)return;mailBusy=true;
  try{if(Cloud.pendingCount&&Cloud.pendingCount()){await Cloud.sync();if(Cloud.pendingCount())return}
    for(const it of q.slice()){const s=get('schools',it.school);const list=S.collections.filter(c=>c.school_id===it.school&&c.type_id&&(!it.emp||c.employee_id===it.emp));
      try{if(!s||!list.length)throw Object.assign(new Error('nothing to send'),{drop:true});
        const blob=await buildFullXlsx(list,s.name);if(blob.size>25*1048576)throw Object.assign(new Error('الملف أكبر من 25 م.ب'),{drop:true});
        const b64=(await blobToData(blob)).split(',')[1];const c=await Cloud.sb();
        const {data,error}=await c.functions.invoke('solvix-mail',{body:{kind:'school',school_id:s.id,emp_id:it.emp,count:list.length,qty:list.reduce((a,x)=>a+num(x.quantity),0),filename:`${s.moe||s.ident}_${s.name}.xlsx`.replace(/[\\/:*?"<>|]/g,'-'),file_b64:b64}});
        if(error)throw error;q=mailQ().filter(x=>x.school!==it.school);mailQSet(q);toast(tx('تم إرسال تقرير المبنى بالبريد'+(data&&data.to?' إلى '+data.to.length+' مستلم':''),'Building report e-mailed'),4000)}
      catch(e){q=mailQ();const x=q.find(y=>y.school===it.school);if(x){x.tries=(x.tries||0)+1;x.err=String(e.message||e);if(e.drop||x.tries>=6)q=q.filter(y=>y!==x)}mailQSet(q);console.warn('solvix-mail',e)}}}
  finally{mailBusy=false}}
window.addEventListener('online',()=>setTimeout(flushMail,3000));setInterval(flushMail,120000);setTimeout(flushMail,8000);
async function testMail(){try{const c=await Cloud.sb();const {data,error}=await c.functions.invoke('solvix-mail',{body:{kind:'test'}});if(error)throw error;alert('تم الإرسال إلى: '+((data&&data.to)||[]).join('، '))}
  catch(e){alert('لم يُرسل البريد: '+(e.message||e)+'\n\nتأكد من نشر الدالة solvix-mail في Supabase وضبط RESEND_API_KEY و MAIL_FROM (راجع README).')}}
</script>
<script id="nv-nv23">
/* NV23 — dashboard redesign: white KPI cards with context, one progress bar for all schools, filters (city / supervisor / period) that drive every chart,
   horizontal supervisor bars, daily columns + 7-day average, completion per city, estimated value per level 1. One colour per state everywhere. */
const DASH={city:'',emp:'',days:30,x:{}};
/* charts do not redraw themselves on resize (a pending redraw on a destroyed chart drew NaN paths); the dashboard re-renders once the resize settles */
let dashRz=0;window.addEventListener('resize',()=>{clearTimeout(dashRz);dashRz=setTimeout(()=>{if(charts.length&&/^admin\/?$/.test(routePath()))vDashboard()},350)});
const DC={done:'#0ca30c',prog:'#2a78d6',rest:'#cbd5e1',one:'#2a78d6',avg:'#eb6834'};
const fmtDay=k=>new Date(k+'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory',{day:'numeric',month:'short'});
const sar=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
const isWeak=id=>/ضعيف|صيانة|تالف|سيئ|عطل/.test((get('conditions',id)||{}).ar||'');
function vDashboard(){
  const F=DASH,since=F.days?Date.now()-F.days*864e5:0;
  const schools=S.schools.filter(s=>!F.city||s.city===F.city);const schSet=new Set(schools.map(s=>s.id));
  const coll=S.collections.filter(c=>schSet.has(c.school_id)&&(!F.emp||c.employee_id===F.emp));
  const st=new Map();for(const c of coll){let x=st.get(c.school_id);if(!x){x={any:0};st.set(c.school_id,x)}x.any++}
  const scope=F.emp?schools.filter(s=>st.has(s.id)||s.completed_by===F.emp):schools;
  let comp=0,prog=0,ns=0;for(const s of scope){const k=schoolState(s,st.get(s.id));k==='completed'?comp++:k==='in_progress'?prog++:ns++}
  const tot=comp+prog+ns||1,pct=x=>Math.round(x/tot*1000)/10;
  const sub=coll.filter(c=>c.submitted_at&&c.type_id);const inP=sub.filter(c=>!since||new Date(c.submitted_at).getTime()>=since);
  const qtyAll=sub.reduce((a,c)=>a+num(c.quantity),0);
  const wk=d0=>sub.filter(c=>{const t=Date.now()-new Date(c.submitted_at).getTime();return t>=d0*864e5&&t<(d0+7)*864e5}).reduce((a,c)=>a+num(c.quantity),0);
  const thisWk=wk(0),lastWk=wk(7);const delta=lastWk?Math.round((thisWk-lastWk)/lastWk*100):null;
  const crit=sub.filter(c=>(get('types',c.type_id)||{}).critical);const critQ=crit.reduce((a,c)=>a+num(c.quantity),0),critWeak=crit.filter(c=>isWeak(c.condition_id)).reduce((a,c)=>a+num(c.quantity),0);
  const value=sub.reduce((a,c)=>a+(c.price!=null&&c.price!==''?num(c.quantity)*Number(c.price):0),0);
  const activeEmp=new Set(sub.filter(c=>Date.now()-new Date(c.submitted_at).getTime()<7*864e5).map(c=>c.employee_id)).size;
  const cities=[...new Set(S.schools.map(s=>s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const emps=S.employees.filter(e=>!e.archived).slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  const empty=Cloud.on&&!S.schools.length;
  const kpi=(key,icon,tone,label,val,subtxt,extra)=>`<div class="col-xl-3 col-md-6"><div class="nvk card h-100" data-kpi="${key}" data-val="${esc(String(val).replace(/[^\d.]/g,''))}"><div class="card-body">
    <div class="d-flex align-items-center gap-2 mb-2"><span class="nvk-ic" style="--c:${tone}"><i class="bi ${icon}"></i></span><span class="nvk-l">${label}</span></div>
    <div class="nvk-v">${val}</div><div class="nvk-s">${subtxt}</div>${extra||''}</div></div></div>`;
  const seg=(k,n,c,l)=>n?`<a class="nvp-seg" href="#admin/schools?status=${k}" style="flex:${n};background:${c}" title="${l}: ${nf(n)} (${pct(n)}%)"></a>`:'';
  adminShell('dashboard','لوحة التحكم',`
  <div class="nvd">
  ${empty?`<div class="alert alert-warning d-flex flex-wrap align-items-center gap-2"><div class="flex-grow-1"><strong>لا توجد بيانات في قاعدة Solvix بعد.</strong> حمّل القوائم الجاهزة (المباني، دليل الأصول، أسماء الغرف، الموظفين) مرة واحدة للبدء.</div>${Cloud.role==='admin'?'<button class="btn btn-warning btn-sm" id="initCloud">تحميل القوائم الجاهزة</button>':''}</div>`:''}
  <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
   <select class="form-select form-select-sm" style="width:auto" id="dCity"><option value="">كل المحافظات</option>${cities.map(c=>`<option ${F.city===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
   <select class="form-select form-select-sm" style="width:auto;max-width:240px" id="dEmp"><option value="">كل مشرفي الميدان</option>${emps.map(e=>`<option value="${esc(e.id)}" ${F.emp===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select>
   <div class="btn-group btn-group-sm" role="group">${[[7,'7 أيام'],[30,'30 يوماً'],[90,'90 يوماً'],[0,'الكل']].map(([d,l])=>`<button type="button" class="btn ${F.days===d?'btn-primary':'btn-outline-secondary'}" data-days="${d}">${l}</button>`).join('')}</div>
   ${F.city||F.emp||F.days!==30?'<button type="button" class="btn btn-sm btn-link" id="dReset">إعادة ضبط</button>':''}</div>
  <div class="row g-3">
   ${kpi('pct','bi-check2-circle',DC.done,'نسبة الإنجاز',pct(comp)+'%',`${nf(comp)} مكتملة من ${nf(comp+prog+ns)} مبنى`,`<div class="nvk-bar"><i style="width:${pct(comp)}%"></i></div>`)}
   ${kpi('assets','bi-box-seam',DC.one,'الأصول المجرودة',nf(qtyAll),thisWk||lastWk?`هذا الأسبوع ${nf(thisWk)} ${delta==null?'':delta>=0?`<span class="up">▲ ${delta}%</span>`:`<span class="down">▼ ${Math.abs(delta)}%</span>`} عن السابق`:'لا جرد في آخر أسبوعين')}
   ${kpi('critical','bi-exclamation-triangle',critWeak?'#d03b3b':'#eda100','الأصول الحرجة',nf(critQ),critQ?`${critWeak?`<span class="down">${nf(critWeak)} بحالة ضعيفة / تحتاج صيانة</span>`:'لا يوجد منها بحالة ضعيفة'}`:'لم تُجرد أصول حرجة بعد')}
   ${kpi('value','bi-cash-coin','#6250d6','القيمة التقديرية (ريال)',sar(value),`${nf(prog)} مبنى قيد التنفيذ · ${nf(activeEmp)} مشرف نشط هذا الأسبوع`)}
  </div>
  <div class="card mt-3"><div class="card-body"><div class="d-flex flex-wrap justify-content-between align-items-baseline mb-2"><h6 class="card-title mb-0">حالة الجرد في المباني</h6><span class="sub">${F.city?esc(F.city)+' · ':''}${nf(comp+prog+ns)} مبنى — اضغط أي جزء لعرض مبانيه</span></div>
   <div class="nvp" data-kpi="bar" data-val="${comp},${prog},${ns}">${seg('completed',comp,DC.done,'مكتملة')}${seg('in_progress',prog,DC.prog,'قيد التنفيذ')}${seg('not_started',ns,DC.rest,'لم تبدأ').replace('class="nvp-seg"','class="nvp-seg rest"')}</div>
   <div class="nvlg"><span><i style="background:${DC.done}"></i>مكتملة <b>${nf(comp)}</b> <span class="sub">(${pct(comp)}%)</span></span><span><i style="background:${DC.prog}"></i>قيد التنفيذ <b>${nf(prog)}</b> <span class="sub">(${pct(prog)}%)</span></span><span><i class="rest" style="background:${DC.rest}"></i>لم تبدأ <b>${nf(ns)}</b> <span class="sub">(${pct(ns)}%)</span></span></div></div></div>
  ${labelsCard(sub)}
  <div class="row g-3 mt-0">
   <div class="col-lg-7"><div class="card h-100"><div class="card-body"><h6 class="card-title mb-0">النشاط اليومي</h6><div class="sub">الأصول المجرودة يومياً ${F.days?`— آخر ${F.days} يوماً`:''}، والخط = متوسط 7 أيام</div><div id="chDaily" class="mt-2">${skel(280)}</div></div></div></div>
   <div class="col-lg-5"><div class="card h-100"><div class="card-body"><h6 class="card-title mb-0">أداء مشرفي الميدان</h6><div class="sub">عدد المباني لكل مشرف — مرتبة من الأعلى</div><div id="chEmp"></div></div></div></div>
   <div class="col-lg-6"><div class="card h-100"><div class="card-body"><h6 class="card-title mb-1">الإنجاز حسب المحافظة</h6><div class="sub mb-2">المكتمل والجاري من مباني كل محافظة</div><div id="byCity"></div></div></div></div>
   <div class="col-lg-6"><div class="card h-100"><div class="card-body"><h6 class="card-title mb-0">القيمة التقديرية حسب المستوى الأول</h6><div class="sub">الكمية × السعر (ريال) — اضغط للتحليل</div><div id="chValue"></div></div></div></div>
  </div></div>`);
  /* filters */
  $('#dCity').onchange=e=>{F.city=e.target.value;vDashboard()};$('#dEmp').onchange=e=>{F.emp=e.target.value;vDashboard()};
  $$('[data-days]').forEach(b=>b.onclick=()=>{F.days=+b.dataset.days;vDashboard()});if($('#dReset'))$('#dReset').onclick=()=>{Object.assign(F,{city:'',emp:'',days:30});vDashboard()};
  if($('#initCloud'))$('#initCloud').onclick=()=>initCloudLists();
  /* completion per city (HTML bars) */
  const cm=new Map();for(const s of scope){const k=s.city||'غير محدد';const x=cm.get(k)||{n:0,c:0,p:0};x.n++;const t=schoolState(s,st.get(s.id));if(t==='completed')x.c++;else if(t==='in_progress')x.p++;cm.set(k,x)}
  const cr=[...cm.entries()].sort((a,b)=>(b[1].c+b[1].p)/b[1].n-(a[1].c+a[1].p)/a[1].n||b[1].n-a[1].n);
  const cityRows=(n)=>cr.slice(0,n).map(([k,x])=>`<div class="nvc-row"><a href="#admin/schools?search=${encodeURIComponent(k)}" title="${esc(k)}">${esc(k)}</a><div class="nvc-track" title="مكتملة ${x.c} · قيد التنفيذ ${x.p} · لم تبدأ ${x.n-x.c-x.p}"><span style="width:${x.c/x.n*100}%;background:${DC.done}"></span><span style="width:${x.p/x.n*100}%;background:${DC.prog}"></span></div><span class="num"><b>${x.c+x.p}</b> من ${x.n}</span></div>`).join('');
  $('#byCity').innerHTML=cr.length?cityRows(8)+(cr.length>8?`<button class="btn btn-sm btn-link px-0" id="moreCity">عرض كل المحافظات (${cr.length})</button>`:''):'<p class="text-muted small mb-0">لا توجد مباني.</p>';
  if($('#moreCity'))$('#moreCity').onclick=()=>{$('#byCity').innerHTML=cityRows(cr.length)};
  /* supervisors: horizontal stacked bars (HTML), sorted by schools */
  const tm=new Map();for(const c of coll){let x=tm.get(c.employee_id);if(!x){x={d:new Set(),p:new Set()};tm.set(c.employee_id,x)}const s=get('schools',c.school_id);(s&&s.completed_at?x.d:x.p).add(c.school_id)}
  const tr=[...tm.entries()].map(([id,x])=>({id,name:empName(id),d:x.d.size,p:x.p.size})).filter(r=>r.d+r.p).sort((a,b)=>b.d+b.p-(a.d+a.p)||b.d-a.d);const tmax=Math.max(1,...tr.map(r=>r.d+r.p));
  const empRows=n=>tr.slice(0,n).map(r=>`<div class="nvc-row" title="${esc(r.name)} — مكتملة ${r.d} · قيد التنفيذ ${r.p}"><a href="#admin/collections?employee_id=${encodeURIComponent(r.id)}">${esc(r.name)}</a><div class="nvc-track nvc-plain"><span style="width:${r.d/tmax*100}%;background:${DC.done}"></span><span style="width:${r.p/tmax*100}%;background:${DC.prog}"></span></div><span class="num"><b>${r.d+r.p}</b> <small>مكتملة ${r.d}</small></span></div>`).join('');
  $('#chEmp').innerHTML=tr.length?`<div class="nvlg mt-1 mb-2"><span><i style="background:${DC.done}"></i>مكتملة</span><span><i style="background:${DC.prog}"></i>قيد التنفيذ</span></div>`+empRows(10)+(tr.length>10?`<button class="btn btn-sm btn-link px-0" id="moreEmp">عرض الكل (${tr.length})</button>`:''):'<div class="text-center text-muted small py-5">لا يوجد عمل لمشرفي الميدان بعد.</div>';
  if($('#moreEmp'))$('#moreEmp').onclick=()=>{$('#chEmp').innerHTML=`<div class="nvlg mt-1 mb-2"><span><i style="background:${DC.done}"></i>مكتملة</span><span><i style="background:${DC.prog}"></i>قيد التنفيذ</span></div>`+empRows(tr.length)};
  /* estimated value per level 1 (HTML bars) */
  const vm=new Map();for(const c of sub){if(c.price==null||c.price==='')continue;const k=c.category_id||'none';vm.set(k,(vm.get(k)||0)+num(c.quantity)*Number(c.price))}
  const vr=[...vm.entries()].sort((a,b)=>b[1]-a[1]);const vmax=Math.max(1,...vr.map(x=>x[1]));
  $('#chValue').innerHTML=vr.length?'<div class="mt-2"></div>'+vr.slice(0,9).map(([k,v])=>{const nm=(get('categories',k)||{}).ar||'غير محدد';return `<div class="nvc-row nvc-wide" title="${esc(nm)}: ${sar(v)} ريال"><a href="#admin/analytics?cat=${encodeURIComponent(k)}">${esc(nm)}</a><div class="nvc-track nvc-plain"><span style="width:${v/vmax*100}%;background:${DC.one}"></span></div><span class="num">${sar(v)}</span></div>`}).join(''):'<div class="text-center text-muted small py-5">لا توجد أسعار مسجلة بعد.</div>';
  /* charts */
  needAdminLibs().then(()=>{if(routePath()!=='admin'&&routePath()!=='admin/')return;
    const dark=document.documentElement.getAttribute('data-bs-theme')==='dark',fg=dark?'#cbd5e1':'#475569',grid=dark?'#1e293b':'#eef2f7';
    const base={chart:{fontFamily:'Cairo, Tahoma, sans-serif',foreColor:fg,toolbar:{show:false},zoom:{enabled:false}},grid:{borderColor:grid,strokeDashArray:3},tooltip:{theme:dark?'dark':'light'},dataLabels:{enabled:false},legend:{position:'top',horizontalAlign:'right',markers:{radius:3}}};
    const emptyNote=(el,t)=>{el.innerHTML=`<div class="text-center text-muted small py-5">${t}</div>`};
    /* daily columns + 7-day average (same unit, one axis) */
    const days=F.days||Math.max(14,Math.min(120,Math.ceil((Date.now()-Math.min(...sub.map(c=>new Date(c.submitted_at).getTime()),Date.now()))/864e5)+1));
    const keys=[];for(let i=days-1;i>=0;i--)keys.push(dayKey(new Date(Date.now()-i*864e5).toISOString()));
    const dm=new Map(keys.map(k=>[k,0]));for(const c of sub){const k=dayKey(c.submitted_at);if(dm.has(k))dm.set(k,dm.get(k)+num(c.quantity))}
    const vals=keys.map(k=>dm.get(k)),avg=vals.map((v,i)=>{const w=vals.slice(Math.max(0,i-6),i+1);return Math.round(w.reduce((a,b)=>a+b,0)/w.length*10)/10});
    if(!inP.length)emptyNote($('#chDaily'),'لا يوجد جرد في هذه الفترة.');
    else chart($('#chDaily'),{...base,series:[{name:'الأصول المجرودة',type:'column',data:vals},{name:'متوسط 7 أيام',type:'line',data:avg}],chart:{...base.chart,height:300,type:'line',events:{dataPointSelection:(e,c,cfg)=>{location.hash='#admin/collections?date='+keys[cfg.dataPointIndex]}}},
      colors:[DC.one,DC.avg],stroke:{width:[0,2],curve:'smooth'},plotOptions:{bar:{columnWidth:days>45?'80%':'55%',borderRadius:4,borderRadiusApplication:'end'}},markers:{size:0,hover:{size:5}},
      xaxis:{categories:keys.map(fmtDay),tickAmount:Math.min(innerWidth<600?4:10,days),labels:{rotate:0,hideOverlappingLabels:true,style:{fontSize:'11px'}},axisBorder:{show:false},axisTicks:{show:false}},yaxis:{labels:{formatter:v=>nf(Math.round(v))}},tooltip:{...base.tooltip,shared:true,intersect:false,y:{formatter:v=>nf(v)}}});
  }).catch(()=>{});
}
</script>
<script id="nv-nv24">
/* NV24 — one look for every admin page: page header (icon + title + one-line purpose), empty states with a next step,
   a skeleton while the first data loads, a busy line while the cloud refreshes, and «تحليل الأصول» in the dashboard style. */
const PAGE_META={dashboard:['bi-speedometer2','متابعة تقدم الجرد في المباني'],collections:['bi-collection','ما أرسله مشرفو الميدان، مجمّعاً حسب المبنى والمشرف'],
  analytics:['bi-diagram-3','الكمية والتكلفة حسب الفئة ثم الحالة ثم النوع ثم المبنى'],schools:['bi-building','المباني وحالة الجرد في كل منها'],
  employees:['bi-people','حسابات الإدارة ومشرفو الميدان'],users:['bi-people','حسابات الإدارة ومشرفو الميدان'],settings:['bi-gear','إعدادات التطبيق والقوائم المرجعية'],
  label:['bi-qr-code','حجم الملصق وشعاره ومحتوى رمز QR'],'asset-types':['bi-diagram-3','الدليل المعتمد بأربعة مستويات وكود لكل أصل'],'asset-categories':['bi-diagram-3','الدليل المعتمد بأربعة مستويات وكود لكل أصل'],
  'room-names':['bi-door-open','الأسماء التي يختار منها مشرف الميدان'],'asset-conditions':['bi-shield-check','الحالات الفنية التي تُسجَّل لكل أصل'],
  data:['bi-database','الاتصال بقاعدة البيانات، والنسخ الاحتياطي، والاستيراد والتصدير'],log:['bi-journal-text','تعديلات مشرفي الميدان على الأصول بعد إرسالها']};
function pageHead(active,title){const m=PAGE_META[active.split('.')[0]]||['bi-grid',''];
  return `<div class="nv-ph"><span class="nv-ph-ic"><i class="bi ${m[0]}"></i></span><div class="flex-grow-1" style="min-width:0"><h3 class="mb-0">${esc(title)}</h3>${m[1]?`<div class="nv-ph-sub">${m[1]}</div>`:''}</div></div>`}
function emptyBox(icon,title,text,action){return `<div class="nv-empty"><span class="ic"><i class="bi ${icon||'bi-inbox'}"></i></span><b>${title}</b>${text?`<p>${text}</p>`:''}${action?`<p>${action}</p>`:''}</div>`}
const emptyRow=(cols,icon,title,text,action)=>`<tr><td colspan="${cols}" class="p-0 border-0">${emptyBox(icon,String(title||'').replace(/\.$/,''),text,action)}</td></tr>`;
const skel=h=>`<div class="nv-sk-in" style="height:${h}px"></div>`;
/* «تحليل الأصول»: filters (city, critical only, sort), KPI cards, condition split, top cost, drill-down table */
const condColor=(id,i)=>{if(id==='none')return '#94a3b8';const n=(get('conditions',id)||{}).ar||'';if(isWeak(id))return '#d03b3b';if(/ممتاز|جديد|سليم|جيد/.test(n))return '#0ca30c';if(/مناسب|مقبول|متوسط/.test(n))return '#eda100';return ['#2a78d6','#6250d6','#1baf7a','#eb6834'][i%4]};
function vAnalytics(){const p=qp();const cat=p.get('cat'),cond=p.get('cond'),type=p.get('type'),city=p.get('city')||'',crit=p.get('crit')==='1',sort=p.get('sort')==='cost'?'cost':'qty';
  let list=S.collections.filter(c=>c.submitted_at&&c.type_id);
  if(city)list=list.filter(c=>(get('schools',c.school_id)||{}).city===city);if(crit)list=list.filter(c=>(get('types',c.type_id)||{}).critical);
  const base=list;if(cat)list=list.filter(c=>c.category_id===cat);if(cond)list=list.filter(c=>(c.condition_id||'none')===cond);if(type)list=list.filter(c=>c.type_id===type);
  const cost=c=>c.price!=null&&c.price!==''?num(c.quantity)*Number(c.price):0;
  const group=(L,key)=>{const m=new Map();for(const c of L){const k=key(c)||'none';const x=m.get(k)||{k,rec:0,qty:0,cost:0,priced:0,schools:new Set()};x.rec++;x.qty+=num(c.quantity);x.cost+=cost(c);if(c.price!=null&&c.price!=='')x.priced+=num(c.quantity);x.schools.add(c.school_id);m.set(k,x)}return [...m.values()].sort((a,b)=>b[sort]-a[sort]||b.qty-a.qty)};
  const nm=(t,id)=>{if(id==='none')return 'غير محدد';const x=get(t,id)||{};return x.ar||x.name||id};
  const lvl=!cat?['cat','categories','المستوى الأول']:!cond?['cond','conditions','الحالة الفنية']:!type?['type','types','الأصل']:['school','schools','المبنى'];
  const rows=group(list,c=>lvl[0]==='cat'?c.category_id:lvl[0]==='cond'?c.condition_id:lvl[0]==='type'?c.type_id:c.school_id);
  const tot=rows.reduce((a,x)=>({qty:a.qty+x.qty,cost:a.cost+x.cost,rec:a.rec+x.rec}),{qty:0,cost:0,rec:0});
  const schoolsN=new Set(list.map(c=>c.school_id)).size;const critL=list.filter(c=>(get('types',c.type_id)||{}).critical);const critQ=critL.reduce((a,c)=>a+num(c.quantity),0),critW=critL.filter(c=>isWeak(c.condition_id)).reduce((a,c)=>a+num(c.quantity),0);
  const keep={city:city||null,crit:crit?'1':null,sort:sort==='cost'?'cost':null};const q=o=>{const s=new URLSearchParams();for(const [k,v] of Object.entries(Object.assign({},keep,o)))if(v)s.set(k,v);const t=s.toString();return '#admin/analytics'+(t?'?'+t:'')};
  const crumbs=[[q({}),'كل المستوى الأول'],...(cat?[[q({cat}),nm('categories',cat)]]:[]),...(cond?[[q({cat,cond}),nm('conditions',cond)]]:[]),...(type?[['',nm('types',type)]]:[])];
  const link=x=>lvl[0]==='school'?`#admin/collections?school_id=${encodeURIComponent(x.k)}`:withQuery({[lvl[0]]:x.k});
  const cities=[...new Set(S.schools.map(s=>s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const kpi=(key,icon,tone,label,val,subtxt)=>`<div class="col-xl-3 col-md-6"><div class="nvk card h-100" data-kpi="${key}" data-val="${esc(String(val).replace(/[^\d.]/g,''))}"><div class="card-body"><div class="d-flex align-items-center gap-2 mb-2"><span class="nvk-ic" style="--c:${tone}"><i class="bi ${icon}"></i></span><span class="nvk-l">${label}</span></div><div class="nvk-v">${val}</div><div class="nvk-s">${subtxt}</div></div></div></div>`;
  /* condition split of the current selection (one stacked bar) */
  const cs=group(list,c=>c.condition_id).sort((a,b)=>b.qty-a.qty);const cHref=x=>cat&&!cond?withQuery({cond:x.k}):'';
  const condBar=cs.length?`<div class="nvp" data-kpi="cond" data-val="${cs.length}">${cs.map((x,i)=>{const h=cHref(x);return `<${h?'a':'span'} class="nvp-seg" ${h?`href="${h}"`:''} style="flex:${x.qty||.0001};background:${condColor(x.k,i)}" title="${esc(nm('conditions',x.k))}: ${nf(x.qty)}"></${h?'a':'span'}>`}).join('')}</div>
    <div class="nvlg">${cs.map((x,i)=>`<span><i style="background:${condColor(x.k,i)}"></i>${cHref(x)?`<a href="${cHref(x)}">${esc(nm('conditions',x.k))}</a>`:esc(nm('conditions',x.k))} <b>${nf(x.qty)}</b> <span class="sub">(${tot.qty?Math.round(x.qty/tot.qty*100):0}%)</span></span>`).join('')}</div>`:'';
  /* top cost at the current level */
  const tc=rows.filter(x=>x.cost>0).sort((a,b)=>b.cost-a.cost).slice(0,6);const cmax=Math.max(1,...tc.map(x=>x.cost));
  const costBars=tc.map(x=>`<div class="nvc-row nvc-wide" title="${esc(nm(lvl[1],x.k))}: ${sar(x.cost)} ريال"><a href="${link(x)}">${esc(nm(lvl[1],x.k))}</a><div class="nvc-track nvc-plain"><span style="width:${x.cost/cmax*100}%;background:#6250d6"></span></div><span class="num">${sar(x.cost)}</span></div>`).join('');
  const sh=x=>tot.qty?Math.round(x.qty/tot.qty*1000)/10:0;
  adminShell('analytics','تحليل الأصول',`<div class="nva">
  <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
   <nav aria-label="breadcrumb" class="me-auto"><ol class="breadcrumb nv-crumb mb-0">${crumbs.map(([h,l],i)=>i===crumbs.length-1?`<li class="breadcrumb-item active">${esc(l)}</li>`:`<li class="breadcrumb-item"><a href="${h}">${esc(l)}</a></li>`).join('')}</ol></nav>
   <select class="form-select form-select-sm" style="width:auto" id="aCity"><option value="">كل المحافظات</option>${cities.map(c=>`<option ${city===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
   <a class="btn btn-sm ${crit?'btn-danger':'btn-outline-danger'}" href="${withQuery({crit:crit?null:'1'})}"><i class="bi bi-exclamation-triangle me-1"></i>الحرجة فقط</a>
   <div class="btn-group btn-group-sm">${[['qty','الكمية'],['cost','التكلفة']].map(([k,l])=>`<a class="btn ${sort===k?'btn-primary':'btn-outline-secondary'}" href="${withQuery({sort:k==='cost'?'cost':null})}">ترتيب: ${l}</a>`).join('')}</div>
   <button type="button" class="btn btn-sm btn-success" id="aXl"${rows.length?'':' disabled'}><i class="bi bi-file-earmark-excel me-1"></i>تصدير</button></div>
  <div class="row g-3 mb-3">
   ${kpi('qty','bi-box-seam','#2a78d6','إجمالي الكمية',nf(tot.qty),`${nf(tot.rec)} سجل في ${nf(schoolsN)} مبنى`)}
   ${kpi('cost','bi-cash-coin','#6250d6','إجمالي التكلفة (ريال)',sar(tot.cost),tot.qty?`متوسط ${sar(tot.cost/Math.max(1,rows.reduce((a,x)=>a+x.priced,0)))} ريال للوحدة المسعّرة`:'لا توجد أسعار')}
   ${kpi('rec','bi-list-ol','#1baf7a','عدد السجلات',nf(tot.rec),`${rows.length} ${lvl[2]==='المبنى'?'مبنى':'بنداً'} في هذا المستوى`)}
   ${kpi('crit','bi-exclamation-triangle',critW?'#d03b3b':'#eda100','الأصول الحرجة',nf(critQ),critQ?(critW?`<span class="down">${nf(critW)} بحالة ضعيفة / تحتاج صيانة</span>`:'لا يوجد منها بحالة ضعيفة'):'لا توجد أصول حرجة في الاختيار')}
  </div>
  ${rows.length?`<div class="row g-3 mb-3"><div class="col-lg-6"><div class="card h-100"><div class="card-body"><h6 class="card-title mb-0">الحالة الفنية</h6><div class="sub mb-2">توزيع الكمية حسب الحالة${cat&&!cond?' — اضغط حالة للتعمق':''}</div>${condBar}</div></div></div>
   <div class="col-lg-6"><div class="card h-100"><div class="card-body"><h6 class="card-title mb-0">الأعلى تكلفة</h6><div class="sub mb-2">حسب ${lvl[2]} (ريال)</div>${costBars||'<p class="text-muted small mb-0">لا توجد أسعار مسجلة في هذا الاختيار.</p>'}</div></div></div></div>`:''}
  <div class="card"><div class="card-header py-3"><h3 class="card-title mb-0">حسب ${lvl[2]}</h3><small class="text-muted d-block">${lvl[0]==='school'?'اضغط المبنى لفتح أعمالها':'اضغط أي صف للتعمق'}</small></div>
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3">${lvl[2]}</th><th class="num">الكمية</th><th style="width:22%">حصة الكمية</th><th class="num">السجلات</th><th class="num">المباني</th><th class="num pe-3">إجمالي التكلفة</th></tr></thead><tbody>
  ${rows.map(x=>`<tr style="cursor:pointer" onclick="location.hash='${link(x)}'"><td class="ps-3 fw-bold"><a href="${link(x)}" class="text-decoration-none">${esc(nm(lvl[1],x.k))}</a></td><td class="num fw-bold">${nf(x.qty)}</td>
   <td><div class="nv-share"><div class="nvc-track"><span style="width:${sh(x)}%;background:#2a78d6"></span></div><small>${sh(x)}%</small></div></td><td class="num">${nf(x.rec)}</td><td class="num">${x.schools.size}</td><td class="num pe-3">${sar(x.cost)}</td></tr>`).join('')
   ||emptyRow(6,base.length?'bi-search':'bi-diagram-3',base.length?'لا توجد أصول في هذا الاختيار':'لا توجد أصول مُرسلة بعد',base.length?'غيّر الفلاتر أو ارجع للمستوى السابق.':'يظهر التحليل بعد أن يرسل مشرفو الميدان أول أصول.')}
  </tbody></table></div></div></div></div>`);
  $('#aCity').onchange=e=>{location.hash=withQuery({city:e.target.value||null})};
  $('#aXl').onclick=()=>writeXlsx([['تحليل الأصول',[[lvl[2],'الكمية','حصة الكمية %','السجلات','المباني','إجمالي التكلفة'],...rows.map(x=>[nm(lvl[1],x.k),x.qty,sh(x),x.rec,x.schools.size,Math.round(x.cost*100)/100])]]],'asset-analytics.xlsx')}
/* busy line while the cloud refreshes a list page */
let nvBusyN=0;function nvBusy(on){nvBusyN=Math.max(0,nvBusyN+(on?1:-1));let b=document.getElementById('nv-busy');if(nvBusyN&&!b){b=document.createElement('div');b.id='nv-busy';b.setAttribute('role','progressbar');b.setAttribute('aria-label','جارٍ التحديث');document.body.appendChild(b)}else if(!nvBusyN&&b)b.remove()}
</script>
<script id="nv-nv26">
/* NV27 — the navbar search box opens an asset by its Tag Number (the fixed system number = assetLabel) */
document.addEventListener('submit',e=>{const f=e.target.closest&&e.target.closest('[data-nv-tagq]');if(!f)return;e.preventDefault();const raw=String(f.tag.value||'').trim(),v=raw.replace(/\D/g,'');if(!raw)return;
  const c=S.collections.find(x=>labelIs(x,raw)||labelIs(x,raw.toUpperCase()))||(v?(v.length<11?S.collections.find(x=>x.no&&(String(x.no)===v.replace(/^0+/,'')||legacyLabel(x).endsWith(v.padStart(8,'0')))):null):null);
  if(c)go('#admin/collections/'+encodeURIComponent(c.id));else{setAFlash(`لا يوجد أصل برقم ${raw}.`,'warning');route()}});
/* NV26 — «مراجعة الصور»: the management approves each asset's two on-site photos or returns the asset to its field supervisor with a note.
   review_status null = waiting, 'ok' = approved, 'returned' = sent back (the server lets only the management set it; a supervisor's edit clears it). */
PAGE_META.review=['bi-images','اعتماد صور الأصول أو إرجاعها لمشرف الميدان مع ملاحظة'];
const reviewable=()=>S.collections.filter(c=>c.submitted_at&&c.type_id);
function reviewPending(){let n=0;for(const c of S.collections)if(c.submitted_at&&c.type_id&&!c.review_status)n++;return n>999?'999+':n}
function parseGeo(v){v=String(v||'').trim();if(!v)return null;const m=v.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,،\s]\s*(-?\d{1,3}(?:\.\d+)?)/);if(!m)return false;const a=+m[1],b=+m[2];
  if(!(a>=-90&&a<=90&&b>=-180&&b<=180))return false;return [Math.round(a*1e7)/1e7,Math.round(b*1e7)/1e7]}
const reviewer=()=>Cloud.on?((Cloud.user&&Cloud.user.email)||'admin'):((S.settings.admin_login||{}).email||'admin');
function setReview(list,status,note){const t=now(),by=reviewer();for(const c of list)Object.assign(c,{review_status:status,review_note:status==='returned'?note:(c.review_note||''),reviewed_at:t,reviewed_by:by});save('collections')}
function vReview(){const p=qp(),sid=p.get('school'),st=p.get('st')||'pending',G=geoCfg(),ro=Cloud.on&&(Cloud.role==='reader'||!can('review'));
  const all=reviewable();const far=c=>c.geo_dist!=null&&c.geo_dist>G.m;const snN=new Map();for(const x of S.collections){const k=normSN(x.serial);if(k.length>=4&&x.type_id)snN.set(k,(snN.get(k)||0)+1)}
  const pass={pending:c=>!c.review_status,returned:c=>c.review_status==='returned',ok:c=>c.review_status==='ok',far,nolabel:c=>!c.label_at,all:()=>true};
  const cnt=L=>({pending:L.filter(pass.pending).length,returned:L.filter(pass.returned).length,ok:L.filter(pass.ok).length,far:L.filter(far).length,nolabel:L.filter(pass.nolabel).length,all:L.length});
  const kpi=(key,icon,tone,label,val,sub)=>`<div class="col-xl-3 col-6"><div class="nvk card h-100" data-kpi="${key}" data-val="${val}"><div class="card-body"><div class="d-flex align-items-center gap-2 mb-2"><span class="nvk-ic" style="--c:${tone}"><i class="bi ${icon}"></i></span><span class="nvk-l">${label}</span></div><div class="nvk-v">${nf(val)}</div><div class="nvk-s">${sub}</div></div></div></div>`;
  const C=cnt(all);
  if(!sid){const m=new Map();for(const c of all){let x=m.get(c.school_id);if(!x){x={id:c.school_id,L:[],emp:new Map()};m.set(c.school_id,x)}x.L.push(c);x.emp.set(c.employee_id,(x.emp.get(c.employee_id)||0)+1)}
    const rows=[...m.values()].map(x=>Object.assign(x,cnt(x.L),{s:get('schools',x.id)||{name:x.id},e:[...x.emp.entries()].sort((a,b)=>b[1]-a[1])[0][0]})).filter(x=>st==='all'||x[st]>0).sort((a,b)=>b.pending-a.pending||b.far-a.far||a.s.name.localeCompare(b.s.name,'ar'));
    const pg=paginate(rows,25);const tab=(k,l)=>`<a class="btn btn-sm ${st===k?'btn-primary':'btn-outline-secondary'}" href="${withQuery({st:k==='pending'?null:k,page:null})}">${l}</a>`;
    adminShell('review','مراجعة الصور',`<div class="row g-3 mb-3">${kpi('pending','bi-hourglass-split','#eda100','بانتظار المراجعة',C.pending,'أصل لم تُراجع صوره بعد')}${kpi('returned','bi-arrow-return-left','#d03b3b','مُرجعة للمشرف',C.returned,'تنتظر تصحيح مشرف الميدان')}${kpi('ok','bi-patch-check','#0ca30c','معتمدة',C.ok,`${C.all?Math.round(C.ok/C.all*100):0}% من الأصول`)}${kpi('far','bi-geo-alt','#6250d6','بعيدة عن المبنى',C.far,`صورت على بعد أكثر من ${fmtDist(G.m)}`)}</div>
    <div class="card"><div class="card-header py-3 d-flex flex-wrap gap-2 align-items-center"><h3 class="card-title mb-0 me-auto">المباني</h3><div class="btn-group">${tab('pending','بانتظار المراجعة')}${tab('returned','مُرجعة')}${tab('far','بعيدة')}${tab('nolabel','بلا تأكيد ملصق')}${tab('ok','معتمدة')}${tab('all','الكل')}</div></div>
    <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3">المبنى</th><th>مشرف الميدان</th><th class="num">الأصول</th><th class="num">بانتظار</th><th class="num">مُرجعة</th><th class="num">معتمدة</th><th class="num pe-3">بعيدة</th></tr></thead><tbody>
    ${pg.items.map(x=>{const h=withQuery({school:x.id,page:null});return `<tr style="cursor:pointer" onclick="location.hash='${h}'"><td class="ps-3"><a href="${h}" class="fw-bold text-decoration-none">${esc(x.s.name)}</a><div class="small text-muted">${esc([x.s.city,x.s.moe].filter(Boolean).join(' · '))}</div></td><td>${esc(empName(x.e))}</td><td class="num">${nf(x.all)}</td><td class="num">${x.pending?`<span class="badge text-bg-warning">${nf(x.pending)}</span>`:'0'}</td><td class="num">${x.returned?`<span class="badge text-bg-danger">${nf(x.returned)}</span>`:'0'}</td><td class="num">${nf(x.ok)}</td><td class="num pe-3">${x.far?`<span class="text-danger fw-bold">${nf(x.far)}</span>`:'0'}</td></tr>`}).join('')
     ||emptyRow(7,all.length?'bi-check2-all':'bi-images',all.length?'لا توجد مباني في هذا التصنيف':'لا توجد أصول مُرسلة بعد',all.length?'كل شيء مُراجَع هنا. اختر تصنيفاً آخر.':'تظهر هنا المباني بعد أن يرسل مشرفو الميدان أصولها بالصور.')}
    </tbody></table></div></div>${pg.footer}</div>`);return}
  const s=get('schools',sid)||{name:sid};const L=all.filter(c=>c.school_id===sid);const K=cnt(L);const list=L.filter(pass[st]||pass.pending).sort((a,b)=>(b.geo_dist||0)>G.m!==(a.geo_dist||0)>G.m?((b.geo_dist||0)>G.m?1:-1):(a.no||0)-(b.no||0));
  const pg=paginate(list,24);const tab=(k,l)=>`<a class="btn btn-sm ${st===k?'btn-primary':'btn-outline-secondary'}" href="${withQuery({st:k==='pending'?null:k,page:null})}">${l} <span class="badge text-bg-light">${K[k]}</span></a>`;
  const badge=c=>c.review_status==='ok'?'<span class="badge text-bg-success">معتمد</span>':c.review_status==='returned'?'<span class="badge text-bg-danger">مُرجع</span>':'<span class="badge text-bg-warning">بانتظار</span>';
  const card=c=>{const ty=get('types',c.type_id)||{},rm=get('rooms',c.room_name_id)||{};return `<div class="col-md-6 col-xl-4"><div class="card h-100 nv-rv" data-rv="${esc(c.id)}">
    <div class="nv-rv-ph">${[['asset_image','الأصل'],['asset_image2','لوحة البيانات']].map(([k,l])=>c[k]?`<figure><img data-photo="${esc(c[k])}" alt="${l}" loading="lazy"><figcaption>${l}</figcaption></figure>`:`<figure class="no"><span><i class="bi bi-camera-video-off"></i><br>لا توجد صورة ${l}</span></figure>`).join('')}</div>
    <div class="card-body p-3"><div class="d-flex justify-content-between gap-2 align-items-start"><b>${esc(ty.ar||'')}</b>${badge(c)}</div>
     <div class="small text-muted mt-1">${esc(assetLabel(c))} · ${esc([c.floor,rm.ar,c.room_number].filter(Boolean).join(' · '))}</div>
     <div class="small mt-1">${esc((get('conditions',c.condition_id)||{}).ar||'')}${c.serial?' · S/N '+esc(c.serial):''} · ${esc(empName(c.employee_id))}</div>
     ${c.geo_dist!=null?`<div class="small mt-1 ${c.geo_dist>G.m?'text-danger fw-bold':'text-success'}"><i class="bi bi-geo-alt"></i> صُوِّر على بعد ${fmtDist(c.geo_dist)} من المبنى</div>`:'<div class="small mt-1 text-muted"><i class="bi bi-geo"></i> لا توجد مسافة مسجلة</div>'}
     ${(snN.get(normSN(c.serial))||0)>1?`<div class="small mt-1 text-danger fw-bold" data-dup><i class="bi bi-files"></i> رقم تسلسلي مكرر في ${snN.get(normSN(c.serial))} أصول</div>`:''}
     <div class="small mt-1" data-lbl="${c.label_check==='fail'?'fail':c.label_at?(c.label_check==='ok'?'ok':'unread'):c.label_printed_at?'printed':'none'}">${c.label_check==='fail'?`<span class="text-danger fw-bold">⚠️ تعذّر اللصق: ${esc(c.label_note||'')}</span>`:c.label_at?(c.label_check==='ok'?'<span class="text-success fw-bold">🏷️ الملصق مُلصق ومؤكد</span>':'<span class="text-warning fw-bold">🏷️ صورة الملصق — لم يُقرأ الرمز</span>'):c.label_printed_at?'<span class="text-primary">🏷️ طُبع — بانتظار تأكيد اللصق</span>':'<span class="text-muted">🏷️ لم يُطبع الملصق</span>'}</div>
     ${(c.extra_images||[]).length?`<div class="small mt-1 text-primary"><i class="bi bi-images"></i> ${c.extra_images.length} صورة إضافية — في التفاصيل</div>`:''}
     ${c.review_status==='returned'&&c.review_note?`<div class="alert alert-danger py-1 px-2 small mt-2 mb-0">${esc(c.review_note)}</div>`:''}</div>
    <div class="card-footer d-flex gap-2 flex-wrap">${ro?'':`<button type="button" class="btn btn-sm btn-success" data-ok="${esc(c.id)}"${c.review_status==='ok'?' disabled':''}><i class="bi bi-check2"></i> اعتماد الصور</button><button type="button" class="btn btn-sm btn-outline-danger" data-ret="${esc(c.id)}"><i class="bi bi-arrow-return-left"></i> إرجاع</button>`}<a class="btn btn-sm btn-light border ms-auto" href="#admin/collections/${encodeURIComponent(c.id)}">التفاصيل</a></div></div></div>`};
  const waiting=pg.items.filter(c=>!c.review_status);
  adminShell('review','مراجعة الصور',`<div class="d-flex flex-wrap gap-2 align-items-center mb-3"><a href="${withQuery({school:null,page:null})}" class="btn btn-sm btn-light border"><i class="bi bi-arrow-right"></i> كل المباني</a><h5 class="mb-0 fw-bold me-auto">${esc(s.name)} <small class="text-muted fw-normal">${esc([s.city,s.moe].filter(Boolean).join(' · '))}</small></h5>
   <div class="btn-group flex-wrap">${tab('pending','بانتظار')}${tab('returned','مُرجعة')}${tab('far','بعيدة')}${tab('nolabel','بلا تأكيد ملصق')}${tab('ok','معتمدة')}${tab('all','الكل')}</div>
   ${ro||!waiting.length?'':`<button type="button" class="btn btn-sm btn-success" id="okAll"><i class="bi bi-check2-all me-1"></i>اعتماد صور المعروض بانتظار المراجعة (${waiting.length})</button>`}</div>
   ${s.lat==null||s.lat===''?`<div class="alert alert-info py-2 small"><i class="bi bi-info-circle me-1"></i>لا توجد إحداثيات لهذا المبنى؛ تُقاس المسافة من متوسط مواقع أصولها. ${ro?'':`<a href="#admin/schools/${encodeURIComponent(sid)}/edit">أضف الإحداثيات</a>`}</div>`:''}
   <div class="row g-3">${pg.items.map(card).join('')||`<div class="col-12"><div class="card">${emptyBox('bi-check2-all','لا توجد أصول في هذا التصنيف',L.length?'اختر تصنيفاً آخر من الأعلى.':'لم تُرسل أصول لهذا المبنى بعد.')}</div></div>`}</div><div class="mt-3">${pg.footer}</div>`);
  const byId=id=>S.collections.find(x=>x.id===id);
  $$('[data-ok]').forEach(b=>b.onclick=()=>{setReview([byId(b.dataset.ok)],'ok');setAFlash('تم اعتماد الأصل.');vReview()});
  $$('[data-ret]').forEach(b=>b.onclick=()=>{const c=byId(b.dataset.ret);const n=prompt('سبب الإرجاع (يظهر لمشرف الميدان):',c.review_note||'أعد تصوير لوحة البيانات بوضوح');if(n==null)return;if(!n.trim())return alert('اكتب سبب الإرجاع.');setReview([c],'returned',n.trim());setAFlash('أُرجع الأصل لمشرف الميدان.');vReview()});
  if($('#okAll'))$('#okAll').onclick=()=>{if(!confirm(`اعتماد ${waiting.length} أصل معروض في هذه الصفحة؟`))return;setReview(waiting,'ok');setAFlash(`تم اعتماد ${waiting.length} أصل.`);vReview()};
}
</script><script id="nv-nv28">
/* NV28 — «إدارة النظام (Admin)»: the system Admin (above the owner) manages the subscription (dates, plan, grace, limits, renewals),
   the Admin accounts and every person's permissions. Everything is enforced by the database (nv_perm / nv_emp_perm / nv_sub_ok / nv_limit_trg). */
PAGE_META.system=['bi-shield-lock','الاشتراك والحدود وحسابات Admin وصلاحيات كل مستخدم'];
const PERMS_STAFF=[['view','العرض'],['edit','إضافة وتعديل البيانات'],['delete','الحذف'],['users','إدارة المستخدمين'],['settings','الإعدادات والملصق'],['catalog','دليل الأصول والقوائم'],['review','مراجعة الصور'],['export','التصدير والتقارير'],['import','الاستيراد'],['backup','البيانات والنسخ']];
const PERMS_FIELD=[['collect','جرد أصول جديدة'],['edit_sent','تعديل أصل بعد إرساله'],['finish','إنهاء المبنى'],['gallery','صور من المعرض'],['extra','صور إضافية']];
const ROLE_PERMS={sysadmin:'*',owner:'view edit delete users settings catalog review export import backup',admin:'view edit delete users settings catalog review export import backup',manager:'view edit delete users settings catalog review export import backup',
  coordinator:'view edit delete catalog review export import',reader:'view export',field:'collect edit_sent finish gallery extra'};
const roleHas=(role,p)=>ROLE_PERMS[role]==='*'||(ROLE_PERMS[role]||'').split(' ').includes(p);
const PLAN_L={trial:'تجريبي',quarterly:'ربع سنوي',half:'نصف سنوي',yearly:'سنوي',custom:'خاص'};
function subBanner(){const s=subInfo();if(!s||s.state==='ok')return '';const d=x=>new Date(x).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{day:'numeric',month:'long',year:'numeric'});
  const link=isSys()?' <a href="#admin/system" class="alert-link">إدارة الاشتراك</a>':' <button type="button" class="btn btn-sm btn-light border ms-2" data-renew><i class="bi bi-send me-1"></i>طلب تجديد</button> <a href="#admin/subscription" class="alert-link ms-1">الاستخدام</a>';
  if(s.state==='over')return `<div class="alert alert-danger py-2 small" data-sub="over"><i class="bi bi-lock me-1"></i><b>انتهى الاشتراك في ${d(s.end)} — النظام الآن للقراءة فقط.</b> البيانات محفوظة كاملة ويمكن عرضها وتصديرها.${link}</div>`;
  if(s.state==='grace')return `<div class="alert alert-warning py-2 small" data-sub="grace"><i class="bi bi-hourglass-split me-1"></i><b>انتهى الاشتراك في ${d(s.end)}.</b> يعمل النظام في فترة السماح حتى ${d(s.graceEnd)}، ثم يصبح للقراءة فقط.${link}</div>`;
  return `<div class="alert alert-info py-2 small" data-sub="soon"><i class="bi bi-calendar-event me-1"></i>ينتهي الاشتراك خلال <b>${s.days}</b> يوماً (${d(s.end)}).${link}</div>`}
async function vSystem(){if(!isSys())return go(can('settings')?'#admin/settings':'#admin/asset-types');
  adminShell('system','إدارة النظام (Admin)',`${systemHistoryLinks('system')}<div id="documentSettings45"></div><div id="sysBox">${skel(160)}<div class="mt-3">${skel(260)}</div></div>`);
  renderDocumentSettings45();let sub=null,staff=[],err='';try{const c=await Cloud.sb();sub=Cloud.chk(await c.rpc('nv_sub_get'));staff=Cloud.chk(await c.rpc('nv_staff_list'))||[]}catch(e){err=e.message}
  if(!$('#sysBox'))return;
  if(err||!sub){$('#sysBox').innerHTML=`<div class="alert alert-danger">${esc(err||'لا توجد بيانات اشتراك')} — شغّل <code>solvix_setup.sql</code> في Supabase ← SQL Editor.</div>`;return}
  const me=Cloud.user&&Cloud.user.id,U=sub.usage||{},dIn=x=>x?new Date(x).toISOString().slice(0,10):'',fmt=x=>x?new Date(x).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{day:'numeric',month:'long',year:'numeric'}):'—';
  const end=sub.ends_at?new Date(sub.ends_at).getTime():null,days=end?Math.ceil((end-Date.now())/864e5):null,graceEnd=end?end+(+sub.grace_days||0)*864e5:null;
  const st=!end?['secondary','بلا تاريخ انتهاء']:!sub.ok?['danger','منتهٍ — قراءة فقط']:Date.now()>=end?['warning','فترة سماح']:days<=14?['warning','ينتهي قريباً']:['success','نشط'];
  const lim=(k,l,used)=>{const v=sub['max_'+k];const pc=v?Math.min(100,Math.round(used/v*100)):0;return `<div class="col-md-6 col-xl-3"><label class="form-label small fw-bold" for="s_${k}">${l}</label><input type="number" min="0" class="form-control" id="s_${k}" value="${v??''}" placeholder="بلا حد">
    <div class="small text-muted mt-1">المستخدم: <b>${nf(used)}</b>${v?` من ${nf(v)}`:''}</div>${v?`<div class="nvk-bar"><i style="width:${pc}%;background:${pc>=100?'#d03b3b':pc>=85?'#eda100':'#0ca30c'}"></i></div>`:''}</div>`};
  const admins=staff.filter(u=>u.role==='sysadmin'),others=staff.filter(u=>u.role!=='sysadmin');
  const permCell=(who,id,role,perms,[k])=>{const def=roleHas(role,k),on=perms&&k in perms?!!perms[k]:def;return `<td class="text-center"><input type="checkbox" class="form-check-input ${on!==def?'nv-pchg':''}" data-pw="${who}" data-id="${esc(id)}" data-k="${k}" ${on?'checked':''} title="${on===def?'الافتراضي للدور':'معدّل عن الافتراضي'}"></td>`};
  $('#sysBox').innerHTML=`
  <div class="card mb-3"><div class="card-header py-3 d-flex flex-wrap gap-2 align-items-center"><h3 class="card-title mb-0 me-auto"><i class="bi bi-patch-check me-2 text-primary"></i>الاشتراك</h3><span class="badge text-bg-${st[0]} fs-6" data-sub-state>${st[1]}</span></div>
   <div class="card-body"><div class="row g-3 mb-3">
    <div class="col-md-4"><div class="small text-muted">الجهة المشتركة</div><div class="fw-bold fs-5">${esc(sub.customer||'—')}</div></div>
    <div class="col-md-4"><div class="small text-muted">ينتهي في</div><div class="fw-bold fs-5">${fmt(sub.ends_at)}</div>${end?`<div class="small ${days<=14?'text-danger fw-bold':'text-muted'}">${days>=0?`متبقٍ ${nf(days)} يوماً`:`انتهى منذ ${nf(-days)} يوماً`}${!sub.ok?'':Date.now()>=end?` · السماح حتى ${fmt(graceEnd)}`:''}</div>`:''}</div>
    <div class="col-md-4"><div class="small text-muted mb-1">تمديد سريع (من تاريخ الانتهاء أو من اليوم)</div><div class="btn-group btn-group-sm flex-wrap">${[[1,'شهر'],[3,'3 أشهر'],[6,'6 أشهر'],[12,'سنة']].map(([m,l])=>`<button type="button" class="btn btn-outline-primary" data-ext="${m}">+ ${l}</button>`).join('')}</div></div></div>
   <form id="subF" class="row g-3">
    <div class="col-md-4"><label class="form-label small fw-bold" for="s_customer">اسم الجهة المشتركة</label><input class="form-control" id="s_customer" value="${esc(sub.customer||'')}"></div>
    <div class="col-md-2"><label class="form-label small fw-bold" for="s_plan">الباقة</label><select class="form-select" id="s_plan">${Object.entries(PLAN_L).map(([v,l])=>`<option value="${v}" ${sub.plan===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="col-md-2"><label class="form-label small fw-bold" for="s_start">تاريخ البداية</label><input type="date" class="form-control" id="s_start" value="${dIn(sub.starts_at)}"></div>
    <div class="col-md-2"><label class="form-label small fw-bold" for="s_end">تاريخ الانتهاء</label><input type="date" class="form-control" id="s_end" value="${dIn(sub.ends_at)}"></div>
    <div class="col-md-2"><label class="form-label small fw-bold" for="s_grace">أيام السماح</label><input type="number" min="0" max="90" class="form-control" id="s_grace" value="${sub.grace_days??7}"></div>
    <div class="col-12"><h6 class="fw-bold mt-2 mb-0"><i class="bi bi-sliders me-1"></i>الحدود <small class="text-muted fw-normal">(اتركها فارغة = بلا حد؛ لا تنطبق على Admin)</small></h6></div>
    ${lim('schools','عدد المباني',U.schools||0)}${lim('field','مشرفو الميدان',U.field||0)}${lim('staff','حسابات الإدارة',U.staff||0)}${lim('assets','عدد الأصول',U.assets||0)}
    <div class="col-12"><label class="form-label small fw-bold" for="s_notes">ملاحظات</label><textarea class="form-control" id="s_notes" rows="2">${esc(sub.notes||'')}</textarea></div>
    <div class="col-12 d-flex gap-2"><button type="submit" class="btn btn-primary"><i class="bi bi-check2 me-1"></i>حفظ الاشتراك والحدود</button><button type="button" class="btn btn-outline-danger ms-auto" id="subEnd"><i class="bi bi-lock me-1"></i>إنهاء الاشتراك الآن (قراءة فقط)</button></div>
    <div class="col-12 small text-muted">عند الانتهاء: بعد تاريخ الانتهاء + أيام السماح يصبح النظام للقراءة فقط لكل المستخدمين ومشرفي الميدان (العرض والتصدير متاحان، ولا يُحذف شيء). أنت (Admin) غير مقيّد.</div></form></div></div>
  <div class="row g-3 mb-3"><div class="col-xl-5"><div class="card h-100"><div class="card-header py-3"><h3 class="card-title mb-0 float-none"><i class="bi bi-shield-lock me-2 text-primary"></i>حسابات Admin</h3><small class="text-muted d-block">لا يراها مالك المشروع ولا غيره</small></div>
    <div class="card-body p-0"><table class="table align-middle mb-0"><tbody>${admins.map(u=>`<tr><td class="ps-3"><b>${esc(u.name)}</b>${u.user_id===me?' <span class="badge text-bg-light border">أنت</span>':''}<div class="small text-muted" dir="ltr">${esc(u.email)}</div></td><td class="text-end pe-3">${isSys()?`<button type="button" class="btn btn-sm btn-outline-danger ms-2" data-system-delete="${esc(u.user_id)}">حذف الحساب</button>`:''}${u.user_id===me?'':`<div class="form-check form-switch d-inline-block" title="نشط"><input class="form-check-input" type="checkbox" data-adm="${esc(u.user_id)}" ${u.active?'checked':''}></div>`}</td></tr>`).join('')}</tbody></table>
    <form id="admF" class="p-3 border-top row g-2">${documentChoices45("a")}<div class="col-12 small fw-bold">إضافة Admin</div><div class="col-md-4"><input class="form-control form-control-sm" id="a_n" placeholder="الاسم" required></div><div class="col-md-4"><input type="email" class="form-control form-control-sm" id="a_e" placeholder="البريد" dir="ltr" required></div><div class="col-md-4"><input class="form-control form-control-sm" id="a_p" placeholder="كلمة المرور (8+)" dir="ltr" value="${genPw()}" required></div><div class="col-12"><button class="btn btn-sm btn-primary"><i class="bi bi-person-plus me-1"></i>إضافة</button></div></form></div></div></div>
   <div class="col-xl-7"><div class="card h-100"><div class="card-header py-3"><h3 class="card-title mb-0"><i class="bi bi-clock-history me-2 text-primary"></i>سجل الاشتراك</h3></div><div class="card-body p-0" style="max-height:330px;overflow:auto"><table class="table table-sm mb-0"><thead class="bg-light"><tr><th class="ps-3">الوقت</th><th>الإجراء</th><th>بواسطة</th><th class="pe-3">التفاصيل</th></tr></thead><tbody>
    ${(sub.log||[]).map(l=>`<tr><td class="ps-3 small text-nowrap">${esc(ymdhms(l.at))}</td><td class="small">${esc(l.action)}</td><td class="small" dir="ltr">${esc(l.by||'')}</td><td class="small pe-3 text-muted" dir="ltr" style="max-width:280px;overflow-wrap:anywhere">${esc(Object.entries(l.data||{}).filter(([k,v])=>v!==''&&v!=null).map(([k,v])=>k+': '+(/_at$/.test(k)?String(v).slice(0,10):v)).join(' · '))}</td></tr>`).join('')||emptyRow(4,'bi-clock-history','لا توجد تغييرات بعد')}</tbody></table></div></div></div></div>
  <div class="card mb-3"><div class="card-header py-3 d-flex flex-wrap gap-2 align-items-center"><h3 class="card-title mb-0 me-auto"><i class="bi bi-key me-2 text-primary"></i>الصلاحيات</h3><input class="form-control form-control-sm" style="width:220px" id="pq" placeholder="بحث بالاسم أو البريد"><small class="text-muted w-100">✔ = مسموح. المربع المميّز بإطار برتقالي معدّل عن الافتراضي لدوره. يُحفظ كل تغيير فوراً ويُطبَّق في قاعدة البيانات.</small></div>
   <div class="card-body p-0"><ul class="nav nav-tabs px-3 pt-2"><li class="nav-item"><a class="nav-link active" href="javascript:void 0" data-ptab="staff">حسابات الإدارة (${others.length})</a></li><li class="nav-item"><a class="nav-link" href="javascript:void 0" data-ptab="field">مشرفو الميدان (${S.employees.length})</a></li></ul>
   <div class="table-responsive" data-pane="staff"><table class="table table-hover align-middle mb-0 nv-ptab"><thead class="bg-light"><tr><th class="ps-3">المستخدم</th><th>الدور</th>${PERMS_STAFF.map(([k,l])=>`<th class="text-center small" style="white-space:normal;min-width:70px">${l}</th>`).join('')}<th></th></tr></thead><tbody>
    ${others.map(u=>`<tr data-q="${esc((u.name+' '+u.email).toLowerCase())}"><td class="ps-3"><b>${esc(u.name)}</b>${u.active?'':' <span class="badge text-bg-secondary">موقوف</span>'}<div class="small text-muted" dir="ltr">${esc(u.email)}</div></td><td class="small">${esc(ROLE_L[u.role==='admin'?'owner':u.role]||u.role)}</td>${PERMS_STAFF.map(p=>permCell('s',u.user_id,u.role==='admin'?'owner':u.role,u.perms,p)).join('')}<td class="pe-3">${u.perms?`<button type="button" class="btn btn-xs btn-link" data-pdef="s" data-id="${esc(u.user_id)}">الافتراضي</button>`:''}</td></tr>`).join('')||emptyRow(PERMS_STAFF.length+3,'bi-people','لا توجد حسابات إدارة')}</tbody></table></div>
   <div class="table-responsive d-none" data-pane="field"><table class="table table-hover align-middle mb-0 nv-ptab"><thead class="bg-light"><tr><th class="ps-3">مشرف الميدان</th>${PERMS_FIELD.map(([k,l])=>`<th class="text-center small" style="white-space:normal;min-width:80px">${l}</th>`).join('')}<th></th></tr></thead><tbody>
    ${S.employees.filter(e=>!e.archived).slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(e=>`<tr data-q="${esc((e.name+' '+(e.email||'')+' '+e.number).toLowerCase())}"><td class="ps-3"><b>${esc(e.name)}</b><div class="small text-muted">${esc(e.number)}${e.email?' · '+esc(e.email):''}</div></td>${PERMS_FIELD.map(p=>permCell('e',e.id,'field',e.perms,p)).join('')}<td class="pe-3">${e.perms?`<button type="button" class="btn btn-xs btn-link" data-pdef="e" data-id="${esc(e.id)}">الافتراضي</button>`:''}</td></tr>`).join('')||emptyRow(PERMS_FIELD.length+2,'bi-person-badge','لا يوجد مشرفو ميدان')}</tbody></table></div></div></div>`;
  const rpc=async(fn,args)=>{const c=await Cloud.sb();return Cloud.chk(await c.rpc(fn,args))};
  const save=async(p,action,msg)=>{try{await rpc('nv_sub_save',{p,p_action:action});await Cloud.init();setAFlash(msg)}catch(e){setAFlash('لم يُحفظ: '+e.message,'danger')}vSystem()};
  const day=v=>v?new Date(v+'T23:59:59').toISOString():'';
  $('#subF').onsubmit=e=>{e.preventDefault();const s=$('#s_start').value,en=$('#s_end').value;if(s&&en&&en<s)return alert('تاريخ الانتهاء قبل تاريخ البداية.');
    const p={customer:$('#s_customer').value.trim(),plan:$('#s_plan').value,starts_at:s?new Date(s+'T00:00:00').toISOString():'',ends_at:day(en),grace_days:Math.max(0,Math.min(90,+$('#s_grace').value||0))};
    for(const k of ['schools','field','staff','assets']){const v=$('#s_'+k).value.trim();p['max_'+k]=v===''?'':String(Math.max(0,Math.round(+v)))}p.notes=$('#s_notes').value;save(p,'edit','تم حفظ الاشتراك والحدود.')};
  $$('[data-ext]').forEach(b=>b.onclick=()=>{const m=+b.dataset.ext;const base=new Date(Math.max(Date.now(),end||0));base.setMonth(base.getMonth()+m);
    if(!confirm(`تمديد الاشتراك ${b.textContent.trim()} حتى ${fmt(base)}؟`))return;save({ends_at:base.toISOString(),...(sub.starts_at?{}:{starts_at:new Date().toISOString()})},`renew +${m}m`,`تم التمديد حتى ${fmt(base)}.`)});
  $('#subEnd').onclick=()=>{if(prompt('سيصبح النظام للقراءة فقط فوراً لكل المستخدمين (بدون فترة سماح). اكتب «إنهاء» للتأكيد:')!=='إنهاء')return;save({ends_at:new Date(Date.now()-6e4).toISOString(),grace_days:0},'end','تم إنهاء الاشتراك — النظام للقراءة فقط.')};
  $('#admF').onsubmit=async e=>{e.preventDefault();try{await rpc('nv_staff_create45',{p_email:$('#a_e').value.trim(),p_password:$('#a_p').value,p_name:$('#a_n').value.trim(),p_role:'sysadmin',...documentSelection45('a')});setAFlash(`تمت إضافة Admin: ${$('#a_e').value.trim()} — كلمة المرور: ${$('#a_p').value}`)}catch(er){setAFlash(er.message,'danger')}vSystem()};
  $$('[data-system-delete]').forEach(b=>b.onclick=async()=>{try{if(await deleteLogin(b.dataset.systemDelete))vSystem()}catch(e){alert(e.message)}});
  $$('[data-adm]').forEach(x=>x.onchange=async()=>{try{await rpc('nv_staff_set',{p_user:x.dataset.adm,p_role:'sysadmin',p_active:x.checked});setAFlash(x.checked?'تم تفعيل الحساب.':'تم إيقاف حساب Admin.')}catch(er){setAFlash(er.message,'danger')}vSystem()});
  $$('[data-ptab]').forEach(a=>a.onclick=()=>{$$('[data-ptab]').forEach(x=>x.classList.toggle('active',x===a));$$('[data-pane]').forEach(x=>x.classList.toggle('d-none',x.dataset.pane!==a.dataset.ptab))});
  $('#pq').oninput=e=>{const q=e.target.value.trim().toLowerCase();$$('.nv-ptab tbody tr[data-q]').forEach(r=>r.hidden=!!q&&!r.dataset.q.includes(q))};
  const permsOf=(who,id)=>{const row=$$(`[data-pw="${who}"][data-id="${CSS.escape(id)}"]`);const role=who==='e'?'field':((others.find(u=>u.user_id===id)||{}).role||'reader');const o={};
    for(const x of row){const def=roleHas(role==='admin'?'owner':role,x.dataset.k);if(x.checked!==def)o[x.dataset.k]=x.checked}return Object.keys(o).length?o:null};
  const setPerms=async(who,id,o)=>{try{if(who==='e'){await rpc('nv_emp_perms',{p_emp:id,p_perms:o});const e=get('employees',id);if(e)e.perms=o}else{await rpc('nv_staff_perms',{p_user:id,p_perms:o});const u=others.find(x=>x.user_id===id);if(u)u.perms=o}toast('تم حفظ الصلاحيات.',1800)}
    catch(er){toast('لم تُحفظ: '+er.message,5000)}};
  $$('[data-pw]').forEach(x=>x.onchange=async()=>{const o=permsOf(x.dataset.pw,x.dataset.id);x.classList.toggle('nv-pchg',x.checked!==roleHas(x.dataset.pw==='e'?'field':(((others.find(u=>u.user_id===x.dataset.id)||{}).role)||'reader').replace('admin','owner'),x.dataset.k));await setPerms(x.dataset.pw,x.dataset.id,o)});
  $$('[data-pdef]').forEach(b=>b.onclick=async()=>{await setPerms(b.dataset.pdef,b.dataset.id,null);vSystem()});
}
</script>
<script id="nv-nv29">
/* NV29 — «الاشتراك والاستخدام» for the management (usage against the plan's limits, «طلب تجديد»), the daily reminder trigger,
   the limit check before an import, and Arabic messages for the database's limit errors. */
PAGE_META.subscription=['bi-patch-check','حالة الاشتراك واستخدامك مقابل حدود الباقة'];
const LIM_L={schools:'المباني',field:'مشرفو الميدان',staff:'حسابات الإدارة',assets:'الأصول'};
async function subGet(){const c=await Cloud.sb();return Cloud.chk(await c.rpc('nv_sub_get'))}
async function renewRequest(){const note=prompt('طلب تجديد الاشتراك — يُرسل إلى مزوّد الخدمة. اكتب ملاحظة إن أردت (المدة المطلوبة، زيادة الحدود…):','');if(note==null)return;
  try{const c=await Cloud.sb();const {data,error}=await c.functions.invoke('solvix-mail',{body:{kind:'renew_request',note}});if(error)throw error;if(data&&data.error)throw new Error(data.error);toast('تم إرسال طلب التجديد. سيتواصل معك مزوّد الخدمة.',5000)}
  catch(e){const m=String(e.message||e);toast(/12 hours/.test(m)?'أُرسل طلب تجديد خلال آخر 12 ساعة — يكفي طلب واحد.':'لم يُرسل الطلب: '+m,6000)}}
document.addEventListener('click',e=>{if(e.target.closest('[data-renew]')){e.preventDefault();renewRequest()}});
/* once a day, any management account that opens the platform lets the server check the subscription reminders (it sends each one only once) */
function subReminderPing(){if(!Cloud.on||!Cloud.role||Cloud.role==='tech')return;if(isSys()){clientAction('reminders').catch(()=>{});return}if(!Cloud.sub||!Cloud.sub.ends_at)return;const d=new Date().toISOString().slice(0,10);const key='nv_subrem_'+new URL(Cloud.cfg().url).hostname;if(lsGet(key,'')===d)return;lsSet(key,d);
  Cloud.sb().then(c=>c.functions.invoke('solvix-mail',{body:{kind:'sub_reminder'}})).catch(()=>{})}
setTimeout(subReminderPing,6000);
/* limit check before adding many rows (the database refuses anyway; this stops before anything is sent) */
async function limitOk(kind,adding){if(!Cloud.on||isSys()||!adding)return true;let s;try{s=await subGet()}catch(e){return true}
  const max=s&&s['max_'+kind],used=+((s&&s.usage||{})[kind]||0);if(max==null||used+adding<=max)return true;
  alert(`لن يُستورد شيء: الملف يضيف ${nf(adding)} جديداً إلى «${LIM_L[kind]}»، والمتاح في باقتك ${nf(Math.max(0,max-used))} فقط (المستخدم ${nf(used)} من ${nf(max)}).\n\nقلّل الملف أو اطلب زيادة الحد من «الإعدادات ← الاشتراك والاستخدام ← طلب تجديد».`);return false}
const limitMsg=m=>{const x=/subscription limit reached: ([a-z ]+) \((\d+)\)/i.exec(String(m||''));if(!x)return m;const k={schools:'المباني','field supervisors':'مشرفي الميدان','management accounts':'حسابات الإدارة',assets:'الأصول'}[x[1]]||x[1];
  return `تم بلوغ حد الباقة: ${k} (${x[2]}). اطلب زيادة الحد من «الإعدادات ← الاشتراك والاستخدام».`};
async function vSubscription(){if(!Cloud.on)return go('#admin');if(isSys())return go('#admin/system');
  adminShell('subscription','الاشتراك والاستخدام',`<div id="subBox">${skel(140)}<div class="mt-3">${skel(220)}</div></div>`);
  let s;try{s=await subGet()}catch(e){if($('#subBox'))$('#subBox').innerHTML=`<div class="alert alert-danger">${esc(e.message)}</div>`;return}if(!$('#subBox'))return;
  const end=s.ends_at?new Date(s.ends_at).getTime():null,days=end?Math.ceil((end-Date.now())/864e5):null,fmt=x=>x?new Date(x).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{day:'numeric',month:'long',year:'numeric'}):'—';
  const st=!end?['secondary','بلا تاريخ انتهاء']:!s.ok?['danger','منتهٍ — قراءة فقط']:Date.now()>=end?['warning','فترة سماح']:days<=14?['warning','ينتهي قريباً']:['success','نشط'];
  const U=s.usage||{};const card=k=>{const used=+(U[k]||0),max=s['max_'+k];const pc=max?Math.min(100,Math.round(used/max*100)):0,tone=!max?'#2a78d6':pc>=100?'#d03b3b':pc>=85?'#eda100':'#0ca30c';
    return `<div class="col-md-6 col-xl-3"><div class="nvk card h-100" data-kpi="use-${k}" data-val="${used}"><div class="card-body"><div class="nvk-l mb-1">${LIM_L[k]}</div><div class="nvk-v">${nf(used)}${max?` <span class="fs-6 text-muted fw-normal">من ${nf(max)}</span>`:''}</div>
     ${max?`<div class="nvk-bar"><i style="width:${pc}%;background:${tone}"></i></div><div class="nvk-s mt-1">${pc>=100?'<span class="down">بلغت الحد — لا يمكن الإضافة</span>':pc>=85?`<span class="down">قريب من الحد (${pc}%) — المتبقي ${nf(max-used)}</span>`:`المتبقي ${nf(max-used)} (${100-pc}%)`}</div>`:'<div class="nvk-s mt-2">بلا حد في باقتك</div>'}</div></div></div>`};
  const near=['schools','field','staff','assets'].filter(k=>s['max_'+k]&&(+(U[k]||0))/s['max_'+k]>=.85);
  $('#subBox').innerHTML=`<div class="card mb-3"><div class="card-body d-flex flex-wrap gap-4 align-items-center">
    <div><div class="small text-muted">الجهة</div><div class="fw-bold fs-5">${esc(s.customer||'—')}</div></div>
    <div><div class="small text-muted">الباقة</div><div class="fw-bold fs-5">${esc(PLAN_L[s.plan]||s.plan||'—')}</div></div>
    <div><div class="small text-muted">ينتهي في</div><div class="fw-bold fs-5">${fmt(s.ends_at)}</div>${end?`<div class="small ${days<=14?'text-danger fw-bold':'text-muted'}">${days>=0?`متبقٍ ${nf(days)} يوماً`:`انتهى منذ ${nf(-days)} يوماً`}</div>`:''}</div>
    <span class="badge text-bg-${st[0]} fs-6" data-sub-state>${st[1]}</span>
    <button type="button" class="btn btn-primary ms-auto" data-renew><i class="bi bi-send me-1"></i>طلب تجديد / زيادة الحدود</button></div></div>
   ${near.length?`<div class="alert alert-warning py-2 small"><i class="bi bi-exclamation-triangle me-1"></i>اقتربت من حد: ${near.map(k=>LIM_L[k]).join('، ')}. اطلب ترقية الباقة قبل أن تتوقف الإضافة.</div>`:''}
   <div class="row g-3">${['schools','field','staff','assets'].map(card).join('')}</div>
   <p class="small text-muted mt-3 mb-0">بعد تاريخ الانتهاء وفترة السماح (${esc(s.grace_days)} أيام) يصبح النظام للقراءة فقط: يبقى العرض والتصدير، ولا يُحذف أي شيء، ويعود كل شيء فور التجديد. تصلك رسالة تذكير بالبريد قبل الانتهاء بأربعة عشر يوماً، ثم بسبعة أيام، ثم بيوم واحد.</p>`}
</script>
<script id="nv-nv30">
/* NV30 — «قوالب الغرف»: the usual assets of each room name (S.settings.room_tpl = {roomId: [{t: typeId, q: qty}]}, synced in nv_settings.data.room_tpl).
   The field app offers them on a new asset in that room; without a template it suggests the types most often recorded there. */
PAGE_META['room-templates']=['bi-ui-checks-grid','الأصول المعتادة في كل غرفة — يختار منها مشرف الميدان بدل إدخال كل أصل من الصفر'];
function vRoomTpl(){if(!can('settings'))return go('#admin/asset-types');const p=qp();const rooms=S.rooms.slice().sort((a,b)=>a.ar.localeCompare(b.ar,'ar'));const T=S.settings.room_tpl||{};
  const rid=p.get('room')&&get('rooms',p.get('room'))?p.get('room'):(rooms.find(r=>(T[r.id]||[]).length)||rooms[0]||{}).id;let items=(T[rid]||[]).map(x=>Object.assign({},x)).filter(x=>get('types',x.t));
  const types=(isCatalog()?S.types.filter(t=>t.code):S.types).slice().sort((a,b)=>a.ar.localeCompare(b.ar,'ar'));const tl=t=>`${t.ar}${t.code?' — '+t.code:''}`;
  adminShell('room-templates','قوالب الغرف',`<div class="row g-3"><div class="col-lg-4"><div class="card h-100"><div class="card-header py-3"><h3 class="card-title mb-0 float-none">الغرف</h3><small class="text-muted d-block">${Object.values(T).filter(x=>(x||[]).length).length} غرفة لها قالب</small></div>
    <div class="list-group list-group-flush" style="max-height:62vh;overflow:auto">${rooms.map(r=>`<a href="#admin/room-templates?room=${encodeURIComponent(r.id)}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${r.id===rid?'active':''}">${esc(r.ar)}${(T[r.id]||[]).length?`<span class="badge ${r.id===rid?'text-bg-light':'text-bg-primary'}">${T[r.id].length}</span>`:''}</a>`).join('')||emptyBox('bi-door-open','لا توجد أسماء غرف')}</div></div></div>
   <div class="col-lg-8"><div class="card"><div class="card-header py-3 d-flex flex-wrap gap-2 align-items-center"><h3 class="card-title mb-0 me-auto float-none">قالب: ${esc((get('rooms',rid)||{}).ar||'—')}</h3><button type="button" class="btn btn-sm btn-outline-secondary" id="rtSuggest"><i class="bi bi-magic me-1"></i>اقتراح من البيانات المسجلة</button></div>
    <div class="card-body"><div class="input-group mb-3"><input class="form-control" id="rtAdd" list="rtTypes" placeholder="ابحث في دليل الأصول وأضف أصلاً للقالب…"><button class="btn btn-primary" type="button" id="rtAddBtn"><i class="bi bi-plus-lg"></i> إضافة</button></div>
     <datalist id="rtTypes">${types.map(t=>`<option value="${esc(tl(t))}">`).join('')}</datalist>
     <div id="rtList"></div>
     <div class="d-flex gap-2 mt-3"><button type="button" class="btn btn-success" id="rtSave"><i class="bi bi-check2 me-1"></i>حفظ القالب</button><button type="button" class="btn btn-outline-danger ms-auto" id="rtClear">إفراغ القالب</button></div>
     <p class="small text-muted mt-3 mb-0">عند اختيار هذه الغرفة في تطبيق الجوال تظهر هذه الأصول ليعلّم المشرف الموجود منها ويعدّل الكمية، ثم تُفتح واحداً بعد الآخر جاهزة (يضيف الصور والحالة فقط). بدون قالب يقترح التطبيق الأصول الأكثر تسجيلاً في غرف بنفس الاسم.</p></div></div></div></div>`);
  const draw=()=>{$('#rtList').innerHTML=items.length?`<table class="table table-sm align-middle mb-0"><thead><tr><th>الأصل</th><th style="width:110px" class="text-center">الكمية المعتادة</th><th style="width:44px"></th></tr></thead><tbody>${items.map((x,i)=>{const t=get('types',x.t)||{};
      return `<tr><td><b>${esc(t.ar||'')}</b>${t.critical?' <span class="badge text-bg-danger">حرج</span>':''}<div class="small text-muted">${esc([t.code,(get('categories',t.cat)||{}).ar].filter(Boolean).join(' · '))}</div></td><td><input type="number" min="1" class="form-control form-control-sm text-center" data-rq="${i}" value="${esc(x.q||1)}"></td><td><button type="button" class="btn btn-sm btn-light border" data-rdel="${i}" title="حذف"><i class="bi bi-x-lg"></i></button></td></tr>`}).join('')}</tbody></table>`:emptyBox('bi-ui-checks-grid','القالب فارغ','أضف الأصول المعتادة في هذه الغرفة، أو اضغط «اقتراح من البيانات المسجلة».');
    $$('[data-rq]').forEach(x=>x.oninput=()=>{items[+x.dataset.rq].q=Math.max(1,Math.round(+x.value||1))});$$('[data-rdel]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.rdel,1);draw()})};draw();
  const addT=()=>{const v=$('#rtAdd').value.trim();const t=types.find(x=>tl(x)===v)||types.find(x=>x.ar===v)||types.find(x=>x.code&&v.endsWith(x.code));if(!t)return toast('اختر أصلاً من القائمة.',2500);if(!items.some(x=>x.t===t.id))items.push({t:t.id,q:1});$('#rtAdd').value='';draw()};
  $('#rtAddBtn').onclick=addT;$('#rtAdd').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addT()}};
  $('#rtSuggest').onclick=()=>{const m=new Map();for(const c of S.collections)if(c.room_name_id===rid&&c.submitted_at&&c.type_id){const x=m.get(c.type_id)||{t:c.type_id,n:0,q:[]};x.n++;x.q.push(num(c.quantity)||1);m.set(c.type_id,x)}
    const sug=[...m.values()].sort((a,b)=>b.n-a.n).slice(0,12).filter(x=>!items.some(y=>y.t===x.t));if(!sug.length)return toast('لا توجد بيانات مسجلة كافية لهذه الغرفة بعد.',3000);
    for(const x of sug)items.push({t:x.t,q:x.q.sort((a,b)=>a-b)[x.q.length>>1]});draw();toast(`أُضيف ${sug.length} أصل مقترح — راجعها ثم احفظ.`,3000)};
  $('#rtClear').onclick=()=>{if(items.length&&confirm('إفراغ قالب هذه الغرفة؟')){items=[];draw()}};
  $('#rtSave').onclick=async()=>{const all=Object.assign({},S.settings.room_tpl||{});if(items.length)all[rid]=items.map(x=>({t:x.t,q:Math.max(1,Math.round(+x.q||1))}));else delete all[rid];S.settings.room_tpl=all;await saveNow('settings');
    if(Cloud.on){Cloud.dirty.add('settings');await Cloud.sync();if(Cloud.err){setAFlash('لم يُحفظ في قاعدة البيانات: '+Cloud.err.message,'danger');return vRoomTpl()}}setAFlash('تم حفظ قالب الغرفة.');vRoomTpl()};
}
</script>
<script id="nv-nv32">
/* NV32 — labels in the admin pages: dashboard card (stuck + confirmed / printed, waiting for confirmation / not printed), the asset page panel
   (label photo, QR check, who and when), review card status and the «بلا تأكيد ملصق» tab. */
function labelsCard(list){const fl=list.filter(c=>c.label_check==='fail').length,ok=list.filter(c=>c.label_at&&c.label_check!=='fail').length,pr=list.filter(c=>!c.label_at&&c.label_printed_at).length,np=list.length-ok-pr-fl,tot=list.length||1,pc=x=>Math.round(x/tot*1000)/10;
  const unread=list.filter(c=>c.label_at&&c.label_check==='unread').length;const seg=(n,c,l,h)=>n?`<a class="nvp-seg" href="${h}" style="flex:${n};background:${c}" title="${l}: ${nf(n)} (${pc(n)}%)"></a>`:'';
  return `<div class="card mt-3"><div class="card-body"><div class="d-flex flex-wrap justify-content-between align-items-baseline mb-2"><h6 class="card-title mb-0">ملصقات الأصول</h6><span class="sub">${nf(list.length)} أصلاً مجروداً — اضغط جزءاً للمراجعة</span></div>
   <div class="nvp" data-kpi="labels" data-val="${ok},${pr},${np}" data-fail="${fl}">${seg(ok,'#0ca30c','مُلصق ومؤكد','#admin/review?st=all')}${seg(fl,'#dc2626','تعذّر اللصق (استثناء)','#admin/exceptions?k=label')}${seg(pr,'#eda100','طُبع — بانتظار تأكيد اللصق','#admin/review?st=nolabel')}${seg(np,'#cbd5e1','لم يُطبع','#admin/review?st=nolabel').replace('class="nvp-seg"','class="nvp-seg rest"')}</div>
   <div class="nvlg"><span><i style="background:#0ca30c"></i>مُلصق ومؤكد بصورة <b>${nf(ok)}</b> <span class="sub">(${pc(ok)}%)</span></span><span><i style="background:#eda100"></i>طُبع ولم يُؤكَّد لصقه <b>${nf(pr)}</b> <span class="sub">(${pc(pr)}%)</span></span><span><i class="rest" style="background:#cbd5e1"></i>لم يُطبع ملصقه <b>${nf(np)}</b> <span class="sub">(${pc(np)}%)</span></span>${fl?`<span><i style="background:#dc2626"></i><a href="#admin/exceptions?k=label">تعذّر اللصق (استثناء)</a> <b>${nf(fl)}</b></span>`:''}${unread?`<span class="down">${nf(unread)} صورة لم يُقرأ رمزها</span>`:''}</div></div></div>`}
function labelPanel(c){if(!c.type_id||!c.submitted_at)return '';const by=String(c.label_by||'');const who=by.startsWith('emp:')?empName(by.slice(4)):by;
  return `${excPanel51(c)}<div class="card mt-3"><div class="card-header"><h3 class="card-title">الملصق على الأصل</h3></div><div class="card-body">${c.label_at?`<div class="row g-2 align-items-center"><div class="col-5">${c.label_photo?`<img data-photo="${esc(c.label_photo)}" alt="الملصق على الأصل" class="img-fluid rounded shadow-sm" style="cursor:zoom-in">`:''}</div>
   <div class="col-7 small"><div class="mb-1">${c.label_check==='fail'?`<span class="badge text-bg-danger">تعذّر اللصق — استثناء</span><div class="mt-1">السبب: <b>${esc(c.label_note||'—')}</b></div>`:c.label_check==='ok'?'<span class="badge text-bg-success">مُلصق ومؤكد — الرمز مطابق</span>':'<span class="badge text-bg-warning">لم يُقرأ الرمز في الصورة — راجعها</span>'}</div><div>بواسطة: <b>${esc(who||'—')}</b></div><div>في: ${esc(ymdhms(c.label_at))}</div>${c.label_printed_at?`<div class="text-muted">أول طباعة: ${esc(ymdhms(c.label_printed_at))}</div>`:''}</div></div>`
   :c.label_printed_at?`<span class="badge text-bg-warning">طُبع في ${esc(ymdhms(c.label_printed_at))} — بانتظار تأكيد اللصق بصورة</span>`:'<span class="badge text-bg-secondary">لم يُطبع الملصق بعد</span>'}</div></div>`}
</script>
<script id="nv-nv33">
/* NV33 — dashboard in the owner's mockup layout: asset search, 5 KPI cards with 6-month mini columns and a 30-day delta, condition donut,
   assets per level 1, 12-month trend (or daily for the filter period), assets per city / school, latest assets, install-age donut,
   top assets by value, assets that need maintenance (weak condition; Solvix has no maintenance schedule) and urgent alerts.
   The NV23 filters, the buildings progress bar, the labels card and the supervisors / cities / value bars stay below. */
const DASH33={trend:'m',loc:'city'};
const AGE_C=['#93c5fd','#3b82f6','#1d4ed8','#1e3a8a'],AGE_L=['أقل من سنة','1 – 3 سنوات','4 – 7 سنوات','أكثر من 7 سنوات'];
const monKey=iso=>String(iso||'').slice(0,7);const fmtMon=k=>new Date(k+'-15T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory',{month:'short',year:'2-digit'});
function lastMonths(n){const out=[],d=new Date();d.setDate(15);for(let i=n-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,15);out.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'))}return out}
function ageYears(v){if(v==null||v==='')return null;const s=String(v).trim();let t=null;const y=s.match(/^(19|20)\d{2}$/);if(y)t=new Date(+s,6,1).getTime();else{const d=new Date(s);if(!isNaN(d))t=d.getTime()}if(t==null||t>Date.now()+864e5)return null;return (Date.now()-t)/(365.25*864e5)}
const ageBucket=a=>a==null?-1:a<1?0:a<=3?1:a<=7?2:3;
const cval=c=>c.price!=null&&c.price!==''?num(c.quantity)*Number(c.price):0;
const locOf=c=>{const s=get('schools',c.school_id)||{};const r=(get('rooms',c.room_name_id)||{}).ar||'';return (s.name||'—')+(r?' · '+r:'')};
function condBadge(c){const n=(get('conditions',c.condition_id)||{}).ar;if(!n)return '<span class="badge nv33-b" style="--c:#94a3b8">غير محدد</span>';return `<span class="badge nv33-b" style="--c:${condColor(c.condition_id,0)}"><i class="bi ${isWeak(c.condition_id)?'bi-wrench':'bi-check-circle'}"></i> ${esc(n)}</span>`}
/* HTML columns (one hue, 4px rounded tops, value above the column, name under it); rows {l,q,h?,t?,lab?} */
function cols33(rows,key,qPct,labAll){const mx=Math.max(1,...rows.map(r=>r.q));return `<div class="nv33-cols" data-kpi="${key}" data-val="${rows.map(r=>r.q).join(',')}">${rows.map(r=>{const tag=r.h?'a':'div';return `<${tag} class="nv33-col" ${r.h?`href="${r.h}"`:''} title="${esc(r.t||r.l)}: ${nf(r.q)}${qPct?` (${qPct(r.q)}%)`:''}"><span class="nv33-cb"><span class="nv33-cv num">${labAll||r.lab?nf(r.q):''}</span><i style="height:${r.q?Math.max(2,r.q/mx*100):0}%"></i></span><span class="nv33-cl">${esc(r.l)}</span></${tag}>`}).join('')}</div>`}
function vDashboard(){
  destroyCharts();const tok=window.__nvDashTok=(window.__nvDashTok||0)+1;
  const F=DASH,G=DASH33,since=F.days?Date.now()-F.days*864e5:0;
  /* NV47: the customer's own select fields filter the dashboard too */
  const SC=siteCfg(),XS=SC.extra.filter(x=>x.t==='select');F.x=F.x||{};for(const k in F.x)if(!XS.some(x=>x.k===k))delete F.x[k];
  if(G.loc&&G.loc.startsWith('x:')&&!SC.extra.some(x=>'x:'+x.k===G.loc))G.loc='city';
  const schools=S.schools.filter(s=>(!F.city||s.city===F.city)&&Object.entries(F.x).every(([k,v])=>!v||siteVal(s,{k})===v));const schSet=new Set(schools.map(s=>s.id));
  const coll=S.collections.filter(c=>schSet.has(c.school_id)&&(!F.emp||c.employee_id===F.emp));
  const st=new Map();for(const c of coll){let x=st.get(c.school_id);if(!x){x={any:0};st.set(c.school_id,x)}x.any++}
  const scope=F.emp?schools.filter(s=>st.has(s.id)||s.completed_by===F.emp):schools;
  let comp=0,prog=0,ns=0;for(const s of scope){const k=schoolState(s,st.get(s.id));k==='completed'?comp++:k==='in_progress'?prog++:ns++}
  const tot=comp+prog+ns||1,pct=x=>Math.round(x/tot*1000)/10;
  const sub=coll.filter(c=>c.submitted_at&&c.type_id);const inP=sub.filter(c=>!since||new Date(c.submitted_at).getTime()>=since);
  const Q=l=>l.reduce((a,c)=>a+num(c.quantity),0),V=l=>l.reduce((a,c)=>a+cval(c),0);
  const qtyAll=Q(sub),qPct=x=>qtyAll?Math.round(x/qtyAll*1000)/10:0;
  const win=(l,d0,f)=>f(l.filter(c=>{const t=Date.now()-new Date(c.submitted_at).getTime();return t>=d0*864e5&&t<(d0+30)*864e5}));
  const dl=(l,f)=>{const a=win(l,0,f),b=win(l,30,f);return b?Math.round((a-b)/b*1000)/10:null};
  const good=sub.filter(c=>c.condition_id&&!isWeak(c.condition_id)),weak=sub.filter(c=>isWeak(c.condition_id));
  const crit=sub.filter(c=>(get('types',c.type_id)||{}).critical);const critQ=Q(crit),critWeak=Q(crit.filter(c=>isWeak(c.condition_id)));
  const value=V(sub);const M6=lastMonths(6),mon=(l,f)=>M6.map(k=>f(l.filter(c=>monKey(c.submitted_at)===k)));
  const cities=[...new Set(S.schools.map(s=>s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const emps=S.employees.filter(e=>!e.archived).slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  const empty=Cloud.on&&!S.schools.length;
  const delta=d=>d==null?'<span class="sub">لا جرد في الـ60 يوماً الماضية</span>':`<span class="${d>=0?'up':'down'}">${d>=0?'▲':'▼'} ${Math.abs(d)}%</span> <span class="sub">عن الـ30 يوماً السابقة</span>`;
  const mini=(vals,c,fmt)=>{const mx=Math.max(1,...vals);return `<div class="nv33-mini" aria-hidden="true">${vals.map((v,i)=>`<i title="${fmtMon(M6[i])}: ${fmt?fmt(v):nf(v)}" style="height:${Math.max(6,v/mx*100)}%;background:${c};opacity:${i===vals.length-1?1:.45}"></i>`).join('')}</div>`};
  const kpi=(key,icon,tone,label,val,subtxt,extra)=>`<div class="col"><div class="nvk card h-100" data-kpi="${key}" data-val="${esc(String(val).replace(/[^\d.]/g,''))}"><div class="card-body">
    <div class="d-flex align-items-center gap-2 mb-2"><span class="nvk-ic" style="--c:${tone}"><i class="bi ${icon}"></i></span><span class="nvk-l">${label}</span></div>
    <div class="d-flex flex-wrap align-items-end justify-content-between gap-2"><div class="nvk-v">${val}</div>${extra||''}</div><div class="nvk-s">${subtxt}</div></div></div></div>`;
  const seg=(k,n,c,l)=>n?`<a class="nvp-seg" href="#admin/schools?status=${k}" style="flex:${n};background:${c}" title="${l}: ${nf(n)} (${pct(n)}%)"></a>`:'';
  const card=(cls,title,subt,body,tool)=>`<div class="${cls}"><div class="card h-100"><div class="card-body"><div class="d-flex justify-content-between align-items-start gap-2 mb-1"><div><h6 class="card-title mb-0">${title}</h6>${subt?`<div class="sub">${subt}</div>`:''}</div>${tool||''}</div>${body}</div></div></div>`;
  /* lists */
  const latest=sub.slice().sort((a,b)=>String(b.submitted_at).localeCompare(String(a.submitted_at))).slice(0,6);
  const topVal=sub.filter(c=>cval(c)>0).sort((a,b)=>cval(b)-cval(a)).slice(0,6);
  const isCrit=c=>!!(get('types',c.type_id)||{}).critical;
  const maint=weak.slice().sort((a,b)=>isCrit(b)-isCrit(a)||cval(b)-cval(a)||String(b.submitted_at).localeCompare(String(a.submitted_at))).slice(0,6);
  const tname=c=>(get('types',c.type_id)||{}).ar||'—',cname=c=>(get('categories',c.category_id)||{}).ar||'—';
  const aLink=c=>`#admin/collections/${encodeURIComponent(c.id)}`;
  const tagCell=c=>`<a href="${aLink(c)}" class="fw-bold text-decoration-none num">${esc(assetLabel(c)||'—')}</a>`;
  const tbl=(head,rows,cols,emptyT)=>rows.length?`<div class="table-responsive"><table class="table table-sm table-hover align-middle mb-0 nv33-t"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="text-center text-muted small py-4">${emptyT}</div>`;
  /* alerts */
  const Gc=geoCfg();const dupM=new Map();for(const c of sub){const s=String(c.serial||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(s.length>=4)dupM.set(s,(dupM.get(s)||0)+1)}
  const dups=[...dupM.values()].filter(n=>n>1).reduce((a,n)=>a+n,0);
  const si=subInfo();
  const al=[
    [sub.filter(c=>c.review_status==='returned').length,'bi-arrow-return-left','#d03b3b','أصول مُرجعة لمشرفي الميدان','#admin/review?st=returned','تنتظر تصحيح الصور'],
    [critWeak?crit.filter(c=>isWeak(c.condition_id)).length:0,'bi-exclamation-octagon','#d03b3b','أصول حرجة بحالة ضعيفة','#admin/analytics?crit=1','تحتاج صيانة عاجلة'],
    [sub.filter(c=>!c.review_status).length,'bi-hourglass-split','#eda100','صور بانتظار المراجعة','#admin/review?st=pending','اعتمد أو أرجع'],
    [sub.filter(c=>c.geo_dist!=null&&c.geo_dist>Gc.m).length,'bi-geo-alt','#6250d6','صُوّرت بعيداً عن المبنى','#admin/review?st=far',`أبعد من ${fmtDist(Gc.m)}`],
    [sub.filter(c=>!c.label_at&&c.label_printed_at).length,'bi-tag','#eda100','ملصقات طُبعت ولم يُؤكَّد لصقها','#admin/review?st=nolabel','بانتظار صورة الملصق'],
    [dups,'bi-files','#2a78d6','أرقام تسلسلية مكررة','#admin/review?st=all','راجع الأصول المكررة'],
    [SC.extra.some(x=>x.req)?schools.filter(s=>siteMissing(s,SC).length).length:0,'bi-building-exclamation','#eda100','مبانٍ بياناتها ناقصة','#admin/schools?missing=1','حقول إلزامية فارغة في نموذج المبنى'],
  ].filter(x=>x[0]>0);
  if(si&&si.state!=='ok')al.unshift([1,'bi-calendar-x','#d03b3b',si.state==='over'?'انتهى الاشتراك — قراءة فقط':si.state==='grace'?'الاشتراك في فترة السماح':`ينتهي الاشتراك خلال ${nf(si.days)} يوم`,can('settings')?'#admin/subscription':'#admin','جدّد الاشتراك']);
  const alertsHtml=al.length?`<ul class="nv33-al">${al.map(([n,ic,c,t,h,s])=>`<li><a href="${h}"><span class="nvk-ic" style="--c:${c}"><i class="bi ${ic}"></i></span><span class="flex-grow-1"><b>${t}</b><small>${s}</small></span>${n>1||!/subscription/.test(h)?`<span class="nv33-n">${nf(n)}</span>`:''}</a></li>`).join('')}</ul>`:'<div class="text-center text-muted small py-4"><i class="bi bi-check2-circle fs-3 d-block mb-1" style="color:#0ca30c"></i>لا توجد تنبيهات عاجلة.</div>';
  adminShell('dashboard','لوحة التحكم',`
  <div class="nvd nv33">
  ${empty?`<div class="alert alert-warning d-flex flex-wrap align-items-center gap-2"><div class="flex-grow-1"><strong>لا توجد بيانات في قاعدة Solvix بعد.</strong> حمّل القوائم الجاهزة (المباني، دليل الأصول، أسماء الغرف، الموظفين) مرة واحدة للبدء.</div>${Cloud.role==='admin'?'<button class="btn btn-warning btn-sm" id="initCloud">تحميل القوائم الجاهزة</button>':''}</div>`:''}
  <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
   <div class="nv33-q position-relative flex-grow-1"><i class="bi bi-search"></i><input type="search" class="form-control form-control-sm" id="dQ" placeholder="ابحث عن أصل، رقم، مبنى، مشرف، رقم تسلسلي…" autocomplete="off" aria-label="بحث عن أصل"><div class="nv33-qr d-none" id="dQr"></div></div>
   <select class="form-select form-select-sm" style="width:auto" id="dCity"><option value="">${SC.f.city.l==='المحافظة'?'كل المحافظات':'كل '+esc(SC.f.city.l)}</option>${cities.map(c=>`<option ${F.city===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
   <select class="form-select form-select-sm" style="width:auto;max-width:220px" id="dEmp"><option value="">كل مشرفي الميدان</option>${emps.map(e=>`<option value="${esc(e.id)}" ${F.emp===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select>
   <div class="btn-group btn-group-sm" role="group">${[[7,'7 أيام'],[30,'30 يوماً'],[90,'90 يوماً'],[0,'الكل']].map(([d,l])=>`<button type="button" class="btn ${F.days===d?'btn-primary':'btn-outline-secondary'}" data-days="${d}">${l}</button>`).join('')}</div>
   ${XS.map(x=>`<select class="form-select form-select-sm" style="width:auto;max-width:200px" data-dx="${esc(x.k)}" aria-label="${esc(x.l)}"><option value="">كل ${esc(x.l)}</option>${[...new Set(siteOpts(x).concat(S.schools.map(s=>siteVal(s,x)).filter(Boolean)))].map(o=>`<option ${F.x[x.k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`).join('')}
   ${F.city||F.emp||F.days!==30||Object.values(F.x).some(Boolean)?'<button type="button" class="btn btn-sm btn-link" id="dReset">إعادة ضبط</button>':''}</div>
  <div class="row row-cols-2 row-cols-lg-3 row-cols-xxl-5 g-3 nv33-kpis">
   ${kpi('assets','bi-box-seam','#2a78d6','إجمالي الأصول',nf(qtyAll),delta(dl(sub,Q)),mini(mon(sub,Q),'#2a78d6'))}
   ${kpi('good','bi-check2-circle','#0ca30c','بحالة جيدة / مناسبة',nf(Q(good)),`${qPct(Q(good))}% من الأصول`,`<span class="nv33-ring" style="--p:${qPct(Q(good))};--c:#0ca30c"></span>`)}
   ${kpi('weak','bi-wrench-adjustable','#eda100','تحتاج صيانة',nf(Q(weak)),`${qPct(Q(weak))}% من الأصول (حالة ضعيفة)`,mini(mon(weak,Q),'#eda100'))}
   ${kpi('critical','bi-exclamation-triangle',critWeak?'#d03b3b':'#6250d6','الأصول الحرجة',nf(critQ),critQ?(critWeak?`<span class="down">${nf(critWeak)} بحالة ضعيفة</span>`:'لا يوجد منها بحالة ضعيفة'):'لم تُجرد أصول حرجة بعد',`<span class="nv33-ring" style="--p:${qPct(critQ)};--c:${critWeak?'#d03b3b':'#6250d6'}"></span>`)}
   ${kpi('value','bi-cash-coin','#6250d6','القيمة التقديرية (ريال)',sar(value),delta(dl(sub,V)),mini(mon(sub,V),'#6250d6',sar))}
  </div>
  <div class="row g-3 mt-0">
   ${card('col-xl-4 col-lg-6','حالة الأصول','الكمية حسب الحالة الفنية',`<div id="chCond" class="mt-1">${skel(220)}</div><div id="lgCond"></div>`)}
   ${card('col-xl-4 col-lg-6','الأصول حسب الفئة الرئيسية','الكمية في المستوى الأول — اضغط للتحليل',`<div id="chCat" class="mt-2"></div>`)}
   ${card('col-xl-4','اتجاه الأصول المجرودة',G.trend==='m'?'الكمية المجرودة كل شهر':`يومياً ${F.days?`— آخر ${F.days} يوماً`:''}، والخط = متوسط 7 أيام`,`<div id="chDaily" class="mt-1">${G.trend==='m'?'':skel(260)}</div>`,`<select class="form-select form-select-sm w-auto" id="dTrend"><option value="m" ${G.trend==='m'?'selected':''}>آخر 12 شهراً</option><option value="d" ${G.trend==='d'?'selected':''}>يومي — فترة الفلتر</option></select>`)}
  </div>
  <div class="row g-3 mt-0">
   ${card('col-xl-3 col-lg-6','الأصول حسب الموقع',G.loc==='city'?'الكمية في كل محافظة':G.loc==='school'?'أعلى المباني بالكمية':'الكمية حسب '+esc((SC.extra.find(x=>'x:'+x.k===G.loc)||{}).l||''),`<div id="byLoc" class="mt-2"></div>`,`<select class="form-select form-select-sm w-auto" id="dLoc"><option value="city" ${G.loc==='city'?'selected':''}>حسب المحافظة</option><option value="school" ${G.loc==='school'?'selected':''}>حسب المبنى</option>${SC.extra.filter(x=>x.t!=='date').map(x=>`<option value="x:${esc(x.k)}" ${G.loc==='x:'+x.k?'selected':''}>حسب ${esc(x.l)}</option>`).join('')}</select>`)}
   ${card('col-xl-6 col-lg-12 order-lg-last order-xl-0','أحدث الأصول المضافة','',tbl(['رقم الأصل','الأصل / الفئة','الموقع','التاريخ','الحالة',''],latest.map(c=>`<tr><td>${tagCell(c)}</td><td class="nv33-cut" title="${esc(tname(c))} — ${esc(cname(c))}">${esc(tname(c))}<small class="d-block text-muted">${esc(cname(c))}</small></td><td class="nv33-cut" title="${esc(locOf(c))}">${esc(locOf(c))}</td><td class="num">${esc(String(c.submitted_at).slice(0,10))}</td><td>${condBadge(c)}</td><td><a href="${aLink(c)}" class="btn btn-sm btn-light border rounded-circle" title="عرض"><i class="bi bi-eye text-primary"></i></a></td></tr>`),7,'لا توجد أصول مجرودة بعد.'),`<a href="#admin/collections" class="btn btn-sm btn-outline-primary">عرض الكل</a>`)}
   ${card('col-xl-3 col-lg-6','الأصول حسب العمر','من تاريخ التركيب (إن وجد)',`<div id="chAge" class="mt-1">${skel(220)}</div><div id="lgAge"></div>`)}
  </div>
  <div class="row g-3 mt-0">
   ${card('col-xl-4 col-lg-6','أعلى الأصول قيمة','الكمية × السعر (ريال)',tbl(['رقم الأصل','الأصل','المبنى','الكمية','القيمة'],topVal.map(c=>`<tr><td>${tagCell(c)}</td><td class="nv33-cut" title="${esc(tname(c))}">${esc(tname(c))}</td><td class="nv33-cut">${esc((get('schools',c.school_id)||{}).name||'—')}</td><td class="num">${nf(num(c.quantity))}</td><td class="num"><b>${sar(cval(c))}</b></td></tr>`),5,'لا توجد أسعار مسجلة بعد.'),`<a href="#admin/analytics?sort=cost" class="btn btn-sm btn-outline-primary">التحليل</a>`)}
   ${card('col-xl-4 col-lg-6','أصول تحتاج صيانة','بحالة ضعيفة — الحرجة أولاً',tbl(['رقم الأصل','الأصل','المبنى','الأولوية'],maint.map(c=>`<tr><td>${tagCell(c)}</td><td class="nv33-cut" title="${esc(tname(c))}">${esc(tname(c))}</td><td class="nv33-cut">${esc((get('schools',c.school_id)||{}).name||'—')}</td><td>${isCrit(c)?'<span class="badge nv33-b" style="--c:#d03b3b"><i class="bi bi-exclamation-octagon"></i> عالية — حرج</span>':'<span class="badge nv33-b" style="--c:#eda100"><i class="bi bi-wrench"></i> متوسطة</span>'}</td></tr>`),4,'لا توجد أصول بحالة ضعيفة.'),weak.length?`<span class="nv33-n" title="عدد السجلات">${nf(weak.length)}</span>`:'')}
   ${card('col-xl-4','التنبيهات والمهام العاجلة','',alertsHtml)}
  </div>
  <div class="row g-3 mt-0"><div class="col-lg-6"><div class="card h-100"><div class="card-body"><div class="d-flex flex-wrap justify-content-between align-items-baseline mb-2"><h6 class="card-title mb-0">حالة الجرد في المباني</h6><span class="sub" data-kpi="pct" data-val="${pct(comp)}">الإنجاز <b>${pct(comp)}%</b> · ${F.city?esc(F.city)+' · ':''}${nf(comp+prog+ns)} مبنى</span></div>
   <div class="nvp" data-kpi="bar" data-val="${comp},${prog},${ns}">${seg('completed',comp,DC.done,'مكتملة')}${seg('in_progress',prog,DC.prog,'قيد التنفيذ')}${seg('not_started',ns,DC.rest,'لم تبدأ').replace('class="nvp-seg"','class="nvp-seg rest"')}</div>
   <div class="nvlg"><span><i style="background:${DC.done}"></i>مكتملة <b>${nf(comp)}</b> <span class="sub">(${pct(comp)}%)</span></span><span><i style="background:${DC.prog}"></i>قيد التنفيذ <b>${nf(prog)}</b> <span class="sub">(${pct(prog)}%)</span></span><span><i class="rest" style="background:${DC.rest}"></i>لم تبدأ <b>${nf(ns)}</b> <span class="sub">(${pct(ns)}%)</span></span></div></div></div></div>
   <div class="col-lg-6 nv33-lbl">${labelsCard(sub)}</div></div>
  <div class="row g-3 mt-0">
   ${card('col-lg-4','أداء مشرفي الميدان','عدد المباني لكل مشرف',`<div id="chEmp"></div>`)}
   ${card('col-lg-4','الإنجاز حسب المحافظة','المكتمل والجاري من مباني كل محافظة',`<div id="byCity" class="mt-2"></div>`)}
   ${card('col-lg-4','القيمة التقديرية حسب المستوى الأول','ريال — اضغط للتحليل',`<div id="chValue"></div>`)}
  </div></div>`);
  /* filters */
  $('#dCity').onchange=e=>{F.city=e.target.value;vDashboard()};$('#dEmp').onchange=e=>{F.emp=e.target.value;vDashboard()};
  $$('[data-days]').forEach(b=>b.onclick=()=>{F.days=+b.dataset.days;vDashboard()});if($('#dReset'))$('#dReset').onclick=()=>{Object.assign(F,{city:'',emp:'',days:30,x:{}});vDashboard()};
  $$('[data-dx]').forEach(el=>el.onchange=()=>{F.x[el.dataset.dx]=el.value;vDashboard()});
  $('#dTrend').onchange=e=>{G.trend=e.target.value;vDashboard()};$('#dLoc').onchange=e=>{G.loc=e.target.value;vDashboard()};
  if($('#initCloud'))$('#initCloud').onclick=()=>initCloudLists();
  /* asset search: tag number, asset, school, supervisor, serial, room */
  const qi=$('#dQ'),qr=$('#dQr');const hay=c=>norm([assetLabel(c),tname(c),cname(c),locOf(c),empName(c.employee_id),c.serial,c.model,c.brand,(get('schools',c.school_id)||{}).moe].join(' '));
  const qRun=()=>{const q=norm(qi.value.trim());if(!q){qr.classList.add('d-none');return}const d=q.replace(/\D/g,'');
    const hits=sub.filter(c=>hay(c).includes(q)||(d.length>=3&&assetLabel(c).endsWith(d))).slice(0,8);
    qr.innerHTML=hits.length?hits.map(c=>`<a href="${aLink(c)}"><b class="num">${esc(assetLabel(c))}</b> ${esc(tname(c))}<small>${esc(locOf(c))} · ${esc(empName(c.employee_id))}</small></a>`).join(''):'<div class="text-muted small p-2">لا توجد نتائج.</div>';qr.classList.remove('d-none')};
  qi.oninput=qRun;qi.onkeydown=e=>{if(e.key==='Enter'){const a=qr.querySelector('a');if(a){e.preventDefault();location.hash=a.getAttribute('href')}}else if(e.key==='Escape'){qi.value='';qRun()}};
  qi.onblur=()=>setTimeout(()=>qr.classList.add('d-none'),200);qi.onfocus=qRun;
  /* assets per city / school (HTML bars, one hue) */
  const lm=new Map();for(const c of sub){const s=get('schools',c.school_id)||{};const k=G.loc==='city'?(s.city||'غير محدد'):G.loc==='school'?(s.name||'—'):(siteVal(s,{k:G.loc.slice(2)})||'غير محدد');const x=lm.get(k)||{q:0,id:s.id};x.q+=num(c.quantity);lm.set(k,x)}
  const lr=[...lm.entries()].sort((a,b)=>b[1].q-a[1].q);const lmax=Math.max(1,...lr.map(x=>x[1].q));
  $('#byLoc').innerHTML=lr.length?lr.slice(0,8).map(([k,x])=>`<div class="nvc-row" title="${esc(k)}: ${nf(x.q)}"><a href="${G.loc==='city'?'#admin/analytics?city='+encodeURIComponent(k):G.loc==='school'?'#admin/schools?search='+encodeURIComponent(k):'#admin/analytics'}">${esc(k)}</a><div class="nvc-track nvc-plain"><span style="width:${x.q/lmax*100}%;background:#2a78d6"></span></div><span class="num"><b>${nf(x.q)}</b> <small>${qPct(x.q)}%</small></span></div>`).join('')+(lr.length>8?`<div class="sub mt-1">و${nf(lr.length-8)} أخرى</div>`:''):'<div class="text-center text-muted small py-4">لا توجد أصول مجرودة بعد.</div>';
  /* completion per city, supervisors, value per level 1 — as in NV23 */
  const cm=new Map();for(const s of scope){const k=s.city||'غير محدد';const x=cm.get(k)||{n:0,c:0,p:0};x.n++;const t=schoolState(s,st.get(s.id));if(t==='completed')x.c++;else if(t==='in_progress')x.p++;cm.set(k,x)}
  const cr=[...cm.entries()].sort((a,b)=>(b[1].c+b[1].p)/b[1].n-(a[1].c+a[1].p)/a[1].n||b[1].n-a[1].n);
  const cityRows=n=>cr.slice(0,n).map(([k,x])=>`<div class="nvc-row"><a href="#admin/schools?search=${encodeURIComponent(k)}" title="${esc(k)}">${esc(k)}</a><div class="nvc-track" title="مكتملة ${x.c} · قيد التنفيذ ${x.p} · لم تبدأ ${x.n-x.c-x.p}"><span style="width:${x.c/x.n*100}%;background:${DC.done}"></span><span style="width:${x.p/x.n*100}%;background:${DC.prog}"></span></div><span class="num"><b>${x.c+x.p}</b> من ${x.n}</span></div>`).join('');
  $('#byCity').innerHTML=cr.length?cityRows(8)+(cr.length>8?`<button class="btn btn-sm btn-link px-0" id="moreCity">عرض كل المحافظات (${cr.length})</button>`:''):'<p class="text-muted small mb-0">لا توجد مباني.</p>';
  if($('#moreCity'))$('#moreCity').onclick=()=>{$('#byCity').innerHTML=cityRows(cr.length)};
  const tm=new Map();for(const c of coll){let x=tm.get(c.employee_id);if(!x){x={d:new Set(),p:new Set()};tm.set(c.employee_id,x)}const s=get('schools',c.school_id);(s&&s.completed_at?x.d:x.p).add(c.school_id)}
  const tr=[...tm.entries()].map(([id,x])=>({id,name:empName(id),d:x.d.size,p:x.p.size})).filter(r=>r.d+r.p).sort((a,b)=>b.d+b.p-(a.d+a.p)||b.d-a.d);const tmax=Math.max(1,...tr.map(r=>r.d+r.p));
  const lgE=`<div class="nvlg mt-1 mb-2"><span><i style="background:${DC.done}"></i>مكتملة</span><span><i style="background:${DC.prog}"></i>قيد التنفيذ</span></div>`;
  const empRows=n=>tr.slice(0,n).map(r=>`<div class="nvc-row" title="${esc(r.name)} — مكتملة ${r.d} · قيد التنفيذ ${r.p}"><a href="#admin/collections?employee_id=${encodeURIComponent(r.id)}">${esc(r.name)}</a><div class="nvc-track nvc-plain"><span style="width:${r.d/tmax*100}%;background:${DC.done}"></span><span style="width:${r.p/tmax*100}%;background:${DC.prog}"></span></div><span class="num"><b>${r.d+r.p}</b> <small>مكتملة ${r.d}</small></span></div>`).join('');
  $('#chEmp').innerHTML=tr.length?lgE+empRows(8)+(tr.length>8?`<button class="btn btn-sm btn-link px-0" id="moreEmp">عرض الكل (${tr.length})</button>`:''):'<div class="text-center text-muted small py-5">لا يوجد عمل لمشرفي الميدان بعد.</div>';
  if($('#moreEmp'))$('#moreEmp').onclick=()=>{$('#chEmp').innerHTML=lgE+empRows(tr.length)};
  const vm=new Map();for(const c of sub){if(c.price==null||c.price==='')continue;const k=c.category_id||'none';vm.set(k,(vm.get(k)||0)+cval(c))}
  const vr=[...vm.entries()].sort((a,b)=>b[1]-a[1]);const vmax=Math.max(1,...vr.map(x=>x[1]));
  $('#chValue').innerHTML=vr.length?'<div class="mt-2"></div>'+vr.slice(0,8).map(([k,v])=>{const nm=(get('categories',k)||{}).ar||'غير محدد';return `<div class="nvc-row nvc-wide" title="${esc(nm)}: ${sar(v)} ريال"><a href="#admin/analytics?cat=${encodeURIComponent(k)}">${esc(nm)}</a><div class="nvc-track nvc-plain"><span style="width:${v/vmax*100}%;background:#6250d6"></span></div><span class="num">${sar(v)}</span></div>`}).join(''):'<div class="text-center text-muted small py-5">لا توجد أسعار مسجلة بعد.</div>';
  /* donut legends (HTML: name, quantity, share) */
  const cgm=new Map();for(const c of sub){const k=c.condition_id&&get('conditions',c.condition_id)?c.condition_id:'none';cgm.set(k,(cgm.get(k)||0)+num(c.quantity))}
  const cg=[...cgm.entries()].sort((a,b)=>(a[0]==='none')-(b[0]==='none')||b[1]-a[1]).map(([k,q],i)=>({k,q,n:k==='none'?'غير محدد':(get('conditions',k)||{}).ar,c:condColor(k,i)}));
  const ag=[0,0,0,0,0];for(const c of sub){const b=ageBucket(ageYears(c.install_date));ag[b<0?4:b]+=num(c.quantity)}
  const ages=AGE_L.map((n,i)=>({n,q:ag[i],c:AGE_C[i]})).concat([{n:'غير محدد',q:ag[4],c:'#cbd5e1',rest:1}]);
  const lg=(rows,id)=>`<div class="nv33-lg" data-kpi="${id}" data-val="${rows.map(r=>r.q).join(',')}">${rows.filter(r=>r.q).map(r=>`<div><i class="${r.rest?'rest':''}" style="background:${r.c}"></i><span>${esc(r.n)}</span><b class="num">${nf(r.q)}</b><small>${qPct(r.q)}%</small></div>`).join('')}</div>`;
  /* assets per level 1: HTML columns (one hue, value on top, the name under each column; Apex rotated labels ran into the bars in RTL) */
  const km=new Map();for(const c of sub){const k=c.category_id||'none';km.set(k,(km.get(k)||0)+num(c.quantity))}
  let kr=[...km.entries()].sort((a,b)=>b[1]-a[1]);if(kr.length>8){const o=kr.slice(7).reduce((a,x)=>a+x[1],0);kr=kr.slice(0,7).concat([['__o',o]])}
  const kn=k=>k==='__o'?'أخرى':(get('categories',k)||{}).ar||'غير محدد';const kmax=Math.max(1,...kr.map(x=>x[1]));
  $('#chCat').innerHTML=kr.length?cols33(kr.map(([k,q])=>({l:kn(k),q,h:k!=='__o'&&k!=='none'?'#admin/analytics?cat='+encodeURIComponent(k):''})),'cat',qPct,true):'<div class="text-center text-muted small py-5">لا توجد أصول مجرودة بعد.</div>';
  /* 12-month trend: HTML columns too (Apex 3.37.1 draws NaN paths for a zero column with rounded corners); the value is shown on the latest and the highest month */
  if(G.trend==='m'){const M=lastMonths(12),mm=new Map(M.map(k=>[k,0]));for(const c of sub){const k=monKey(c.submitted_at);if(mm.has(k))mm.set(k,mm.get(k)+num(c.quantity))}
    const mv=M.map(k=>mm.get(k)),top=Math.max(...mv);$('#chDaily').innerHTML=sub.length?cols33(M.map((k,j)=>({l:+k.slice(5)+(j===0||k.slice(5)==='01'?'/'+k.slice(2,4):''),t:fmtMon(k),q:mv[j],lab:mv[j]&&(j===11||mv[j]===top),h:'#admin/collections'})),'trend').replace('class="nv33-cols"','class="nv33-cols nv33-tr"'):'<div class="text-center text-muted small py-5">لا يوجد جرد بعد.</div>'}
  $('#lgCond').innerHTML=cg.length?lg(cg,'cond'):'';$('#lgAge').innerHTML=qtyAll?lg(ages,'age'):'';
  /* charts */
  needAdminLibs().then(()=>{if(routePath()!=='admin'&&routePath()!=='admin/')return;if(tok!==window.__nvDashTok||!$('#chCond'))return;
    const dark=document.documentElement.getAttribute('data-bs-theme')==='dark',fg=dark?'#cbd5e1':'#475569',grid=dark?'#1e293b':'#eef2f7',surf=dark?'#0f172a':'#ffffff',ink=dark?'#f1f5f9':'#0f172a';
    const base={chart:{fontFamily:'Cairo, Tahoma, sans-serif',foreColor:fg,toolbar:{show:false},zoom:{enabled:false}},grid:{borderColor:grid,strokeDashArray:3},tooltip:{theme:dark?'dark':'light'},dataLabels:{enabled:false},legend:{show:false}};
    const emptyNote=(el,t)=>{if(el)el.innerHTML=`<div class="text-center text-muted small py-5">${t}</div>`};
    const donut=(el,rows,label)=>{const r=rows.filter(x=>x.q);if(!r.length)return emptyNote(el,'لا توجد أصول مجرودة بعد.');
      chart(el,{...base,series:r.map(x=>x.q),labels:r.map(x=>x.n),colors:r.map(x=>x.c),chart:{...base.chart,type:'donut',height:220},stroke:{width:2,colors:[surf]},
        plotOptions:{pie:{expandOnClick:false,donut:{size:'68%',labels:{show:true,name:{offsetY:18,fontSize:'12px',color:fg},value:{offsetY:-12,fontSize:'24px',fontWeight:800,color:ink,formatter:v=>nf(+v)},total:{show:true,showAlways:true,label,fontSize:'12px',color:fg,formatter:w=>nf(w.globals.seriesTotals.reduce((a,b)=>a+b,0))}}}}},
        tooltip:{...base.tooltip,y:{formatter:v=>`${nf(v)} (${qPct(v)}%)`}}})};
    donut($('#chCond'),cg,'إجمالي الأصول');donut($('#chAge'),ages,'إجمالي الأصول');
    /* trend: 12 months (columns) or daily for the filter period (columns + 7-day average, same unit) */
    const el=$('#chDaily');
    if(G.trend!=='m'){const days=F.days||Math.max(14,Math.min(120,Math.ceil((Date.now()-Math.min(...sub.map(c=>new Date(c.submitted_at).getTime()),Date.now()))/864e5)+1));
      const keys=[];for(let i=days-1;i>=0;i--)keys.push(dayKey(new Date(Date.now()-i*864e5).toISOString()));
      const dm=new Map(keys.map(k=>[k,0]));for(const c of sub){const k=dayKey(c.submitted_at);if(dm.has(k))dm.set(k,dm.get(k)+num(c.quantity))}
      const vals=keys.map(k=>dm.get(k)),avg=vals.map((v,i)=>{const w=vals.slice(Math.max(0,i-6),i+1);return Math.round(w.reduce((a,b)=>a+b,0)/w.length*10)/10});
      if(!inP.length)emptyNote(el,'لا يوجد جرد في هذه الفترة.');
      else chart(el,{...base,legend:{show:true,position:'top',horizontalAlign:'right',markers:{radius:3}},series:[{name:'الأصول المجرودة',type:'column',data:vals},{name:'متوسط 7 أيام',type:'line',data:avg}],chart:{...base.chart,height:260,type:'line',events:{dataPointSelection:(e,c,cfg)=>{location.hash='#admin/collections?date='+keys[cfg.dataPointIndex]}}},
        colors:['#2a78d6',DC.avg],stroke:{width:[0,2],curve:'smooth'},plotOptions:{bar:{columnWidth:days>45?'80%':'55%',borderRadius:vals.some(v=>!v)?0:4,borderRadiusApplication:'end'}},markers:{size:0,hover:{size:5}},
        xaxis:{categories:keys.map(fmtDay),tickAmount:Math.min(innerWidth<600?4:8,days),labels:{rotate:0,hideOverlappingLabels:true,style:{fontSize:'11px'}},axisBorder:{show:false},axisTicks:{show:false}},yaxis:{labels:{formatter:v=>nf(Math.round(v))}},tooltip:{...base.tooltip,shared:true,intersect:false,y:{formatter:v=>nf(v)}}})}
  }).catch(()=>{});
}

/* NV46 — settings tab «نموذج بيانات المباني» (#admin/site-form): the customer shapes its building form (see siteCfg) */
PAGE_META['site-form']=['bi-building-gear','شكل بيانات المباني لهذا العميل: الحقول الظاهرة وأسماؤها وحقولكم الخاصة'];
function vSiteForm(keep){if(!can('settings'))return go('#admin/settings');const C=siteCfg();
  const st=(keep&&vSiteForm.st)||(vSiteForm.st=JSON.parse(JSON.stringify({f:C.f,extra:C.extra})));
  const used=k=>S.schools.filter(s=>s.extra&&s.extra[k]!=null&&s.extra[k]!=='').length;
  const old=Cloud.on&&(Cloud.dbOld||[]).includes('nv_schools.extra');
  adminShell('site-form','نموذج بيانات المباني',`
  <div class="alert alert-info small"><i class="bi bi-info-circle me-1"></i>هذا النموذج خاص بقاعدة هذا العميل فقط: يحدد الحقول التي تظهر عند إضافة المباني وفي جدولها وملف Excel، وأسماءها، والحقول الخاصة بنشاطكم. البيانات المسجلة لا تُحذف عند إخفاء حقل.</div>
  ${old?'<div class="alert alert-warning small"><i class="bi bi-database-exclamation me-1"></i>قاعدة البيانات لم تُرقَّ بعد: شغّل <code>migrations/046_building_fields.sql</code> في Supabase ← SQL Editor حتى تُحفظ قيم الحقول الخاصة في الخادم.</div>':''}
  <form id="sfF"><div class="card mb-3"><div class="card-header py-3"><h3 class="card-title mb-0 float-none"><i class="bi bi-ui-checks me-2 text-primary"></i>الحقول الأساسية</h3><small class="text-muted">أوقف ما لا تحتاجه وغيّر اسم أي حقل. المعرّف والاسم إلزاميان دائماً.</small></div>
   <div class="card-body p-0"><div class="table-responsive"><table class="table align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3" style="width:80px">يظهر</th><th>اسم الحقل</th><th class="text-muted small">الاسم الافتراضي</th></tr></thead><tbody>
   ${SITE_F.map(([k,l,fix])=>`<tr><td class="ps-3"><div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" data-fon="${k}" aria-label="إظهار ${esc(l)}" ${st.f[k].on?'checked':''} ${fix?'disabled':''}></div></td><td><input class="form-control form-control-sm" data-fl="${k}" maxlength="60" value="${esc(st.f[k].l)}"></td><td class="small text-muted">${esc(l)}${fix?' · إلزامي':''}</td></tr>`).join('')}
   </tbody></table></div></div></div>
  <div class="card mb-3"><div class="card-header py-3 d-flex align-items-center gap-2 flex-wrap"><div class="me-auto"><h3 class="card-title mb-0 float-none"><i class="bi bi-plus-square me-2 text-primary"></i>حقول خاصة</h3><small class="text-muted">مثل: نوع المبنى، عدد الأدوار، المساحة، تاريخ الاستلام</small></div><button type="button" class="btn btn-sm btn-outline-primary" id="sfAdd"><i class="bi bi-plus-lg me-1"></i>إضافة حقل</button></div>
   <div class="card-body p-0"><div class="table-responsive"><table class="table align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3">اسم الحقل</th><th style="width:140px">النوع</th><th>الخيارات (افصل بفاصلة)</th><th class="text-center" style="width:70px">إلزامي</th><th class="text-center" style="width:80px">مستخدم في</th><th style="width:50px"></th></tr></thead><tbody>
   ${st.extra.map((x,i)=>`<tr><td class="ps-3"><input class="form-control form-control-sm" data-xl="${i}" maxlength="60" value="${esc(x.l)}" placeholder="اسم الحقل"></td><td><select class="form-select form-select-sm" data-xt="${i}">${Object.entries(SITE_XT).map(([v,l])=>`<option value="${v}" ${x.t===v?'selected':''}>${l}</option>`).join('')}</select></td>
     <td><input class="form-control form-control-sm" data-xo="${i}" value="${esc(x.opts||'')}" ${x.t==='select'?'':'disabled'} placeholder="${x.t==='select'?'مثل: إداري, سكني, تجاري':'—'}"></td><td class="text-center"><input type="checkbox" class="form-check-input" data-xr="${i}" aria-label="إلزامي" ${x.req?'checked':''}></td>
     <td class="text-center small text-muted">${nf(used(x.k))} مبنى</td><td><button type="button" class="btn btn-sm btn-light border" data-xd="${i}" title="حذف الحقل"><i class="bi bi-trash text-danger"></i></button></td></tr>`).join('')||'<tr><td colspan="6" class="text-center text-muted small py-4">لا توجد حقول خاصة بعد.</td></tr>'}
   </tbody></table></div></div></div>
  <div class="d-flex gap-2 flex-wrap"><button type="submit" class="btn btn-primary px-4" id="sfSave"><i class="bi bi-check2 me-1"></i>حفظ</button><button type="button" class="btn btn-light border" id="sfReset">الرجوع للنموذج الافتراضي</button><a class="btn btn-light border" href="#admin/schools/create">تجربة نموذج إضافة مبنى</a></div></form>`);
  const read=()=>{$$('[data-fon]').forEach(x=>{st.f[x.dataset.fon].on=x.checked});$$('[data-fl]').forEach(x=>{st.f[x.dataset.fl].l=x.value});
    st.extra.forEach((x,i)=>{x.l=$(`[data-xl="${i}"]`).value;x.t=$(`[data-xt="${i}"]`).value;x.opts=$(`[data-xo="${i}"]`).value;x.req=$(`[data-xr="${i}"]`).checked})};
  $('#sfAdd').onclick=()=>{read();if(st.extra.length>=40)return alert('الحد الأقصى 40 حقلاً خاصاً.');st.extra.push({k:'f'+Date.now().toString(36),l:'',t:'text',opts:'',req:false});vSiteForm(true);const i=$$('[data-xl]');if(i.length)i[i.length-1].focus()};
  $$('[data-xd]').forEach(b=>b.onclick=()=>{read();const x=st.extra[+b.dataset.xd];const n=used(x.k);if(n&&!confirm(`الحقل «${x.l}» له قيم في ${n} مبنى. حذفه من النموذج يخفي هذه القيم ولا يمسحها. متابعة؟`))return;st.extra.splice(+b.dataset.xd,1);vSiteForm(true)});
  $$('[data-xt]').forEach(sl=>sl.onchange=()=>{read();vSiteForm(true)});
  $('#sfReset').onclick=()=>{if(!confirm('الرجوع للنموذج الافتراضي؟ تُزال الحقول الخاصة من النموذج، وتبقى قيمها محفوظة في المباني.'))return;vSiteForm.st=null;S.settings.site={fields:{},extra:[]};save('settings');setAFlash('أُعيد النموذج الافتراضي.');vSiteForm()};
  $('#sfF').onsubmit=e=>{e.preventDefault();read();
    for(const [k,l] of SITE_F)if(!siteName(st.f[k].l))st.f[k].l=l;
    if(st.extra.some(x=>!siteName(x.l)))return alert('اكتب اسماً لكل حقل خاص أو احذفه.');
    const names=SITE_F.filter(([k])=>st.f[k].on).map(([k])=>siteName(st.f[k].l)).concat(st.extra.map(x=>siteName(x.l)));const dup=names.find((l,i,a)=>a.indexOf(l)!==i);if(dup)return alert(`اسم الحقل «${dup}» مكرر.`);
    const bad=st.extra.find(x=>x.t==='select'&&!siteOpts(x).length);if(bad)return alert(`اكتب خيارات القائمة للحقل «${siteName(bad.l)}».`);
    const fields={};for(const [k,l,fix] of SITE_F){const nm=siteName(st.f[k].l);if((!fix&&!st.f[k].on)||nm!==l)fields[k]={on:fix?true:st.f[k].on,l:nm!==l?nm:''}}
    S.settings.site={fields,extra:st.extra.map(x=>({k:x.k,l:siteName(x.l),t:x.t,opts:x.t==='select'?siteOpts(x).join(', '):'',req:!!x.req}))};vSiteForm.st=null;save('settings');
    setAFlash('تم حفظ نموذج بيانات المباني.');vSiteForm()}}

/* NV47 — «تعبئة حقل»: one own-field value for the selected buildings (fills the gaps the completeness column shows) */
function siteFill(ids){const C=siteCfg();if(!C.extra.length||!ids.length)return;$('#nvFill')?.remove();
  const req=C.extra.filter(x=>x.req),first=req.find(x=>ids.some(id=>{const s=get('schools',id);return s&&!siteVal(s,x)}))||C.extra[0];
  document.body.insertAdjacentHTML('beforeend',`<div class="modal fade" id="nvFill" tabindex="-1" aria-labelledby="nvFillT"><div class="modal-dialog"><form class="modal-content" id="nvFillF"><div class="modal-header"><h5 class="modal-title" id="nvFillT">تعبئة حقل لـ${nf(ids.length)} مبنى</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button></div>
   <div class="modal-body"><label class="form-label" for="nvFillK">الحقل</label><select class="form-select mb-3" id="nvFillK">${C.extra.map(x=>`<option value="${esc(x.k)}" ${x===first?'selected':''}>${esc(x.l)}${x.req?' *':''}</option>`).join('')}</select>
    <label class="form-label" for="nvFillV">القيمة</label><div id="nvFillVB"></div>
    <div class="form-check mt-3"><input class="form-check-input" type="checkbox" id="nvFillE" checked><label class="form-check-label" for="nvFillE">المباني الفارغة فقط (لا تغيّر القيم المسجلة)</label></div><div class="small text-muted mt-2" id="nvFillN"></div></div>
   <div class="modal-footer"><button type="button" class="btn btn-light border" data-bs-dismiss="modal">إلغاء</button><button type="submit" class="btn btn-primary">تطبيق</button></div></form></div></div>`);
  const fld=()=>C.extra.find(x=>x.k===$('#nvFillK').value);
  const box=()=>{const x=fld();$('#nvFillVB').innerHTML=x.t==='select'?`<select class="form-select" id="nvFillV"><option value="">—</option>${siteOpts(x).map(o=>`<option>${esc(o)}</option>`).join('')}</select>`:`<input class="form-control" id="nvFillV" type="${x.t==='number'||x.t==='date'?x.t:'text'}"${x.t==='number'?' step="any"':''}>`;cnt()};
  const targets=()=>{const x=fld(),only=$('#nvFillE').checked;return ids.map(id=>get('schools',id)).filter(s=>s&&(!only||!siteVal(s,x)))};
  const cnt=()=>{$('#nvFillN').textContent=`سيتغير ${nf(targets().length)} من ${nf(ids.length)} مبنى.`};
  $('#nvFillK').onchange=box;$('#nvFillE').onchange=cnt;box();
  const m=bootstrap.Modal.getOrCreateInstance($('#nvFill'));m.show();
  $('#nvFillF').onsubmit=e=>{e.preventDefault();const x=fld();let v=String($('#nvFillV').value||'').trim();if(!v)return alert('اختر أو اكتب قيمة.');if(x.t==='number'){if(isNaN(+v))return alert('اكتب رقماً.');v=String(+v)}
    const L=targets();if(!L.length)return alert('لا توجد مبانٍ تحتاج هذا التغيير.');for(const s of L){s.extra=Object.assign({},s.extra||{},{[x.k]:v})}save('schools');m.hide();setAFlash(`تمت تعبئة «${x.l}» في ${nf(L.length)} مبنى.`);vSchools()}}
</script>
