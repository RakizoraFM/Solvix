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
const chart=(el,o)=>{const c=new ApexCharts(el,o);charts.push(c);c.render()};const setAFlash=(m,k='success')=>{aflash={m,k}};
const isAuthed=()=>Cloud.on?(Cloud.role==='admin'||Cloud.role==='reader'):isAdmin();
/* NV10 roles: owner (مالك المشروع) / manager (مدير المشروع) / coordinator (منسق المشروع) sign in by e-mail; field supervisors (مشرف ميدان) are employees */
const ROLE_L={owner:'مالك المشروع',manager:'مدير المشروع',coordinator:'منسق المشروع',reader:'قراءة فقط',field:'مشرف ميدان'};
const staffRole=()=>Cloud.on?(Cloud.staffRole||(Cloud.role==='admin'?'owner':Cloud.role==='reader'?'reader':null)):'owner';
const canUsers=()=>['owner','manager'].includes(staffRole());
const isOwnerRole=()=>staffRole()==='owner';

/* ---------- layout (admin/layouts/app.blade.php) ---------- */
function applyTheme(){const th=lsGet('bsTheme','auto');const dark=th==='dark'||(th==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-bs-theme',dark?'dark':'light');return th}
function setMode(m){$$('[data-mode]').forEach(el=>{const on=el.dataset.mode===m;if(el.tagName==='STYLE'&&el.id==='nv-tw'){el.media=on?'all':'not all'}else el.media=on?'all':'not all'});if(m!=='admin')document.documentElement.removeAttribute('data-bs-theme')}
function navItem(href,icon,label,active){return `<li class="nav-item"><a href="${href}" class="nav-link ${active?'active':''}"><i class="nav-icon bi ${icon}"></i><p>${label}</p></a></li>`}
function navTree(icon,label,open,items){return `<li class="nav-item ${open?'menu-open':''}"><a href="javascript:void 0" class="nav-link" data-nv-tree><i class="nav-icon bi ${icon}"></i><p>${label}<i class="nav-arrow bi bi-chevron-left"></i></p></a><ul class="nav nav-treeview" style="display:${open?'block':'none'}">${items.join('')}</ul></li>`}
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
   <ul class="navbar-nav ms-auto">
    ${notifBell()}
    <li class="nav-item"><a class="nav-link" href="javascript:void 0" data-nv-fullscreen><i class="bi bi-arrows-fullscreen"></i></a></li>
    <li class="nav-item dropdown"><a class="nav-link" href="javascript:void 0" id="bd-theme" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi ${th==='light'?'bi-sun-fill':th==='dark'?'bi-moon-fill':'bi-circle-half'}"></i></a>
     <ul class="dropdown-menu dropdown-menu-end" style="--bs-dropdown-min-width: 8rem;">${[['light','bi-sun-fill','فاتح'],['dark','bi-moon-fill','داكن'],['auto','bi-circle-half','تلقائي']].map(([v,i,l])=>`<li><button type="button" class="dropdown-item d-flex align-items-center ${th===v?'active':''}" data-bs-theme-value="${v}" aria-pressed="${th===v}"><i class="bi ${i} me-2"></i> ${l}<i class="bi bi-check-lg ms-auto ${th===v?'':'d-none'}"></i></button></li>`).join('')}</ul></li>
    <li class="nav-item dropdown user-menu"><a href="javascript:void 0" class="nav-link dropdown-toggle" data-bs-toggle="dropdown"><span class="user-image rounded-circle shadow d-inline-flex align-items-center justify-content-center bg-secondary text-white" style="width:2rem;height:2rem"><i class="bi bi-person-fill"></i></span><span class="d-none d-md-inline">${ROLE_L[staffRole()]||'المدير'}</span></a>
     <ul class="dropdown-menu dropdown-menu-lg dropdown-menu-end"><li class="user-header text-bg-primary"><span class="rounded-circle shadow d-inline-flex align-items-center justify-content-center bg-white text-primary" style="width:90px;height:90px;font-size:2.5rem"><i class="bi bi-person-fill"></i></span><p>${ROLE_L[staffRole()]||'المدير'}<small>${esc(adm.email||'')}</small></p></li>
      <li class="user-footer"><a href="javascript:void 0" class="btn btn-outline-danger float-end" data-nv-logout><i class="bi bi-box-arrow-right me-1"></i>تسجيل الخروج</a></li></ul></li></ul></div></nav>
  <aside class="app-sidebar nv-rkz shadow-sm">
   <div class="sidebar-brand bg-white p-2" style="height: auto; min-height: 80px; display: flex; align-items: center; justify-content: center; overflow: hidden;"><a href="#admin" class="brand-link p-0 w-100 h-100 d-flex align-items-center justify-content-center"><img src="${esc(logoURL())}" alt="Logo" class="w-100 h-auto" style="max-height: 70px; object-fit: contain;"><span class="brand-text d-none">${esc(appName())}</span></a></div>
   <div class="sidebar-wrapper" style="overflow-y:auto"><nav class="mt-2"><ul class="nav sidebar-menu flex-column" role="menu" data-accordion="false">
    ${navItem('#admin','bi-speedometer2','لوحة التحكم',A('dashboard'))}
    <li class="nav-header">إدارة البيانات</li>
    ${navItem('#admin/collections','bi-collection','أعمال الجرد',A('collections'))}
    ${navItem('#admin/analytics','bi-diagram-3','تحليل الأصول',A('analytics'))}
    ${navTree('bi-building','المدارس',A('schools')||A('schools.create')||A('schools.edit'),[navItem('#admin/schools','bi-list','كل المدارس',A('schools')),navItem('#admin/schools/create','bi-plus-circle','إضافة مدرسة',A('schools.create'))])}
    ${navItem('#admin/employees','bi-people','المستخدمون',active.startsWith('employees')||A('users'))}
    <li class="nav-header">النظام</li>
    ${navItem(canUsers()?'#admin/settings':'#admin/asset-types','bi-gear','الإعدادات',A('settings')||!!LK[active.split('.')[0]])}
    ${navItem('#admin/data','bi-database','البيانات والنسخ',A('data'))}
    ${navItem('#admin/log','bi-journal-text','سجل التعديلات',A('log'))}
    <li class="nav-item"><a href="javascript:void 0" class="nav-link" data-nv-logout><i class="nav-icon bi bi-box-arrow-right"></i><p>تسجيل الخروج</p></a></li>
   </ul></nav></div></aside>
  <main class="app-main"><div class="app-content-header"><div class="container-fluid"><div class="row"><div class="col-sm-6"><h3 class="mb-0">${esc(title)}</h3></div></div></div></div>
   <div class="app-content"><div class="container-fluid">${settingsTabs(active)}${fl?`<div class="alert alert-${fl.k} alert-dismissible"><button type="button" class="btn-close" data-bs-dismiss="alert"></button>${esc(fl.m)}</div>`:''}${content}</div></div></main>
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
  const lo=e.target.closest('[data-nv-logout]');if(lo){e.preventDefault();if(Cloud.on){Cloud.signOut().then(()=>go('#admin/login'))}else{setAdmin(false);go('#admin/login')}return}
  const nl=e.target.closest('.app-sidebar a.nav-link[href^="#"]');if(nl&&window.innerWidth<992)document.body.classList.remove('sidebar-open');
});
/* NV10 — the reference lists live under «الإعدادات» as tabs */
function settingsTabs(active){const k=active.split('.')[0]==='asset-categories'?'asset-types':active.split('.')[0];if(k!=='settings'&&!LK[k])return '';
  const T=[...(canUsers()?[['settings','bi-sliders','الإعدادات العامة']]:[]),['asset-types','bi-diagram-3','دليل الأصول'],['room-names','bi-door-open','أسماء الغرف'],['asset-conditions','bi-shield-check','حالات الأصول']];
  return `<ul class="nav nav-pills nv-set-tabs flex-nowrap overflow-auto gap-1 mb-3 pb-1">${T.map(([id,ic,l])=>`<li class="nav-item"><a class="nav-link text-nowrap ${k===id?'active':''}" href="#admin/${id}"><i class="bi ${ic} me-1"></i>${l}</a></li>`).join('')}</ul>`}
const iconBtn=(href,icon,title)=>`<a href="${href}" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle"${title?` title="${title}"`:''}><i class="bi ${icon}"></i></a>`;

/* ---------- auth/login.blade.php ---------- */
function vAdminLogin(err,emv){
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
function vDashboard(){
  const st=schoolStats();let comp=0,prog=0,ns=0;for(const s of S.schools){const k=schoolState(s,st.get(s.id));k==='completed'?comp++:k==='in_progress'?prog++:ns++}
  const sub=S.collections.filter(submitted);const totalAssets=sub.reduce((a,c)=>a+num(c.quantity),0);
  const tech=new Map();for(const c of S.collections){let x=tech.get(c.employee_id);if(!x){x={done:new Set(),prog:new Set()};tech.set(c.employee_id,x)}const s=get('schools',c.school_id);(s&&s.completed_at?x.done:x.prog).add(c.school_id)}
  const techRows=[...tech.entries()].map(([id,x])=>({id,name:empName(id),done:x.done.size,prog:x.prog.size,total:x.done.size+x.prog.size})).filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
  const since=Date.now()-30*864e5;const dm=new Map();for(const c of sub){if(new Date(c.submitted_at).getTime()<since)continue;const k=dayKey(c.submitted_at);const x=dm.get(k)||{date:k,qty:0,rec:0};x.qty+=num(c.quantity);x.rec++;dm.set(k,x)}
  const daily=[...dm.values()].sort((a,b)=>a.date<b.date?-1:1);
  const card=(bg,icon,val,lbl,href)=>`<div class="col-xl-3 col-lg-6 col-md-6 col-12"><div class="card h-100 shadow-sm border-0 ${bg} text-white cursor-pointer hover-scale transition" onclick="location.hash='${href}'"><div class="card-body d-flex align-items-center p-3"><div class="rounded-circle bg-white bg-opacity-25 p-3 me-3"><i class="bi ${icon} fs-3"></i></div><div><h3 class="mb-0 fw-bold">${val}</h3><span class="opacity-75 small fw-bold text-uppercase">${lbl}</span></div></div></div></div>`;
  const empty=Cloud.on&&!S.schools.length;
  adminShell('dashboard','لوحة التحكم',`${empty?`<div class="alert alert-warning d-flex flex-wrap align-items-center gap-2"><div class="flex-grow-1"><strong>لا توجد بيانات في قاعدة Solvix بعد.</strong> حمّل القوائم الجاهزة (2170 مدرسة، 159 نوع أصل، 88 اسم غرفة، 142 موظفاً) مرة واحدة للبدء.</div>${Cloud.role==='admin'?'<button class="btn btn-warning btn-sm" id="initCloud">تحميل القوائم الجاهزة</button>':''}</div>`:''}<div class="row g-3">${card('bg-primary','bi-box-seam',nf(totalAssets),'إجمالي الأصول','#admin/collections')}${card('bg-success','bi-check-circle-fill',comp,'مدارس مكتملة','#admin/schools?status=completed')}${card('bg-info','bi-clock-history',prog,'قيد التنفيذ','#admin/schools?status=in_progress')}${card('bg-secondary','bi-exclamation-circle-fill',ns,'لم تبدأ','#admin/schools?status=not_started')}</div>
  <div class="row g-4 mt-2"><div class="col-lg-4 col-12"><div class="card shadow-sm border-0 h-100"><div class="card-header bg-transparent border-0 pb-0 pt-3"><h6 class="card-title fw-bold mb-0"><i class="bi bi-pie-chart-fill me-2 text-primary"></i>توزيع حالة المدارس</h6></div><div class="card-body"><div id="schoolStatusChart"></div></div></div></div>
   <div class="col-lg-8 col-12"><div class="card shadow-sm border-0 h-100"><div class="card-header bg-transparent border-0 pb-0 pt-3"><h6 class="card-title fw-bold mb-0"><i class="bi bi-person-badge-fill me-2 text-primary"></i>أداء مشرفي الميدان</h6><small class="text-muted d-block mt-1">المدارس المكتملة مقابل قيد التنفيذ</small></div><div class="card-body"><div id="techPerformanceChart"></div></div></div></div></div>
  <div class="row g-4 mt-2 mb-4"><div class="col-12"><div class="card shadow-sm border-0"><div class="card-header bg-transparent border-0 py-3 d-flex justify-content-between align-items-center"><h6 class="card-title fw-bold mb-0"><i class="bi bi-graph-up-arrow me-2 text-primary"></i>النشاط اليومي للجرد</h6><span class="badge bg-light text-dark border">آخر 30 يوماً</span></div>
   <div class="card-body"><div id="dailyProgressChart"></div><div class="mt-4 border-top pt-4"><h6 class="fw-bold mb-3 small text-uppercase text-muted"><i class="bi bi-list-task me-1"></i>سجل النشاط اليومي</h6>
    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;"><table class="table table-sm table-hover align-middle border-start border-end"><thead class="table-light sticky-top"><tr><th class="ps-3">التاريخ</th><th class="text-center">السجلات المرسلة</th><th class="text-center">الأصول المجرودة</th><th class="text-end pe-3">إجراء</th></tr></thead><tbody>
    ${daily.slice().reverse().map(d=>`<tr><td class="ps-3 fw-bold">${d.date}</td><td class="text-center"><span class="badge bg-info-subtle text-info border border-info px-3">${d.rec}</span></td><td class="text-center"><span class="badge bg-primary-subtle text-primary border border-primary px-3">${nf(d.qty)}</span></td><td class="text-end pe-3"><a href="#admin/collections?date=${d.date}" class="btn btn-xs btn-outline-primary py-0"><i class="bi bi-eye"></i> عرض التفاصيل</a></td></tr>`).join('')||'<tr><td colspan="4" class="text-center py-4 text-muted small">لا يوجد نشاط في آخر 30 يوماً.</td></tr>'}
    </tbody></table></div></div></div></div></div></div>`);
  if($('#initCloud'))$('#initCloud').onclick=()=>initCloudLists();
  needAdminLibs().then(()=>{if(routePath()!=='admin'&&routePath()!=='admin/')return;
    chart($('#schoolStatusChart'),{series:[comp,prog,ns],labels:['مكتملة','قيد التنفيذ','لم تبدأ'],chart:{type:'pie',height:350,events:{dataPointSelection:(e,c,cfg)=>{location.hash='#admin/schools?status='+['completed','in_progress','not_started'][cfg.dataPointIndex]}}},colors:['#10b981','#7c3aed','#94a3b8'],legend:{position:'bottom'},responsive:[{breakpoint:480,options:{chart:{height:280},legend:{position:'bottom'}}}]});
    chart($('#techPerformanceChart'),{series:[{name:'مكتملة',data:techRows.map(r=>r.done)},{name:'قيد التنفيذ',data:techRows.map(r=>r.prog)}],chart:{type:'bar',height:350,stacked:true,toolbar:{show:false},events:{dataPointSelection:(e,c,cfg)=>{location.hash='#admin/collections?employee_id='+techRows[cfg.dataPointIndex].id}}},plotOptions:{bar:{horizontal:false,columnWidth:'45%',borderRadius:4}},xaxis:{categories:techRows.map(r=>r.name),labels:{rotate:-45,trim:true,style:{fontSize:'11px'}}},colors:['#10b981','#7c3aed'],legend:{position:'top',horizontalAlign:'left'},dataLabels:{enabled:false}});
    chart($('#dailyProgressChart'),{series:[{name:'الأصول',data:daily.map(d=>d.qty)}],chart:{type:'area',height:300,toolbar:{show:false}},dataLabels:{enabled:false},stroke:{curve:'smooth',width:3},xaxis:{categories:daily.map(d=>d.date),type:'datetime'},colors:['#2563eb'],fill:{type:'gradient',gradient:{shadeIntensity:1,opacityFrom:.35,opacityTo:.05}},markers:{size:0,hover:{size:6}}});
  }).catch(()=>{});
}

/* ---------- collections/index.blade.php ---------- */
function collectionFilter(list,p){const q=norm(p.get('search')||''),emp=p.get('employee_id'),sch=p.get('school_id'),date=p.get('date'),status=p.get('status');const sst=schoolStats();
  return list.filter(c=>{if(emp&&c.employee_id!==emp)return false;if(sch&&c.school_id!==sch)return false;if(date&&!(c.submitted_at&&dayKey(c.submitted_at)===date))return false;const s=get('schools',c.school_id)||{};
    if(status&&schoolState(s,sst.get(c.school_id))!==status)return false;
    if(q){const r=get('rooms',c.room_name_id)||{};if(!(norm(s.name).includes(q)||norm(s.moe).includes(q)||norm(s.ident).includes(q)||norm(c.brand).includes(q)||norm(c.serial).includes(q)||norm(c.tag).includes(q)||norm(r.ar).includes(q)||norm(r.en).includes(q)))return false}return true})}
function bulkBarHTML(btns){return `<div id="bulk-actions-bar" class="bg-primary bg-opacity-10 border-bottom py-2 px-3 d-none"><div class="d-flex align-items-center justify-content-between"><div class="d-flex align-items-center gap-3"><span class="fw-bold text-primary small"><span id="selected-count">0</span> عنصر محدد</span><div class="vr"></div>${btns}</div><button type="button" class="btn-close small" style="font-size: 0.7rem;" id="desel"></button></div></div>`}
function reassignModal(title,text){return `<div class="modal fade" id="reassignModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog"><form id="reassign-form"><div class="modal-content shadow border-0"><div class="modal-header border-bottom-0 pb-0"><h5 class="modal-title fw-bold">${title}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button></div>
  <div class="modal-body py-4"><p class="text-muted small mb-4">${text}</p><div class="mb-3"><label class="form-label fw-bold small text-muted text-uppercase mb-1">مشرف الميدان المستلم</label><select name="new_employee_id" class="form-select shadow-none" required><option value="">-- اختر الموظف --</option>${S.employees.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</select></div></div>
  <div class="modal-footer border-top-0 pt-0"><button type="button" class="btn btn-light border" data-bs-dismiss="modal">إلغاء</button><button type="submit" class="btn btn-primary px-4">نقل الآن</button></div></div></form></div></div>`}
function bindBulk(){const all=$('#select-all'),bar=$('#bulk-actions-bar');const upd=()=>{const n=$$('.row-checkbox:checked').length;bar.classList.toggle('d-none',!n);$('#selected-count').textContent=n};
  if(all)all.onchange=()=>{$$('.row-checkbox').forEach(c=>c.checked=all.checked);upd()};$$('.row-checkbox').forEach(c=>c.onchange=upd);$('#desel').onclick=()=>{$$('.row-checkbox').forEach(c=>c.checked=false);if(all)all.checked=false;bar.classList.add('d-none')};
  return ()=>$$('.row-checkbox:checked').map(c=>c.value)}
function hideModal(){const m=$('#reassignModal');if(m&&window.bootstrap)bootstrap.Modal.getOrCreateInstance(m).hide();$$('.modal-backdrop').forEach(b=>b.remove());document.body.classList.remove('modal-open');document.body.style.removeProperty('overflow');document.body.style.removeProperty('padding-right')}
async function removeCollections(list){const set=new Set(list);S.collections=S.collections.filter(c=>!set.has(c));for(const c of list){await deletePhoto(c.asset_image);await deletePhoto(c.school_image)}save('collections')}
function vCollections(){
  const p=qp();const filtered=collectionFilter(S.collections,p);const m=new Map();
  for(const c of filtered){const k=c.employee_id+'_'+c.school_id;let g=m.get(k);if(!g){g={k,emp:c.employee_id,school:c.school_id,count:0,last:null};m.set(k,g)}if(c.submitted_at){g.count+=num(c.quantity);if(!g.last||c.submitted_at>g.last)g.last=c.submitted_at}}
  const groups=sorted([...m.values()],{employee_id:g=>empName(g.emp),school_id:g=>(get('schools',g.school)||{}).name,asset_count:g=>g.count,last_submitted:g=>g.last||''},'last_submitted','desc');
  const pg=paginate(groups);const any=['search','employee_id','school_id','date','status'].some(k=>p.get(k));
  adminShell('collections','أعمال الجرد',`<div class="card shadow-sm border-0 mb-4">
  <div class="card-header bg-white py-3"><div class="d-flex align-items-center justify-content-between"><div><h3 class="card-title fw-bold mb-0 text-dark"><i class="bi bi-collection me-2 text-primary"></i>أعمال جرد الأصول</h3></div>
   <div class="d-flex gap-2"><button class="btn btn-light border btn-sm d-md-none" type="button" data-bs-toggle="collapse" data-bs-target="#filterCollapse"><i class="bi bi-funnel"></i></button><button type="button" id="export-btn" class="btn btn-success btn-sm d-flex align-items-center gap-1"><i class="bi bi-download"></i><span class="d-none d-sm-inline">تصدير Excel</span></button></div></div></div>
  <div class="collapse d-md-block border-bottom bg-light-subtle" id="filterCollapse"><div class="card-body py-3"><form id="collections-form" class="row g-3">
   <div class="col-12 col-md-4 col-lg-3"><label class="form-label small fw-bold text-muted mb-1">بحث</label><div class="input-group input-group-sm"><span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span><input type="text" name="search" class="form-control border-start-0 shadow-none" placeholder="المدرسة، الماركة، الرقم التسلسلي..." value="${esc(p.get('search')||'')}"></div></div>
   <div class="col-6 col-md-3"><label class="form-label small fw-bold text-muted mb-1">الموظف</label><select name="employee_id" class="form-select form-select-sm shadow-none" data-autosubmit><option value="">كل الموظفين</option>${S.employees.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(e=>`<option value="${esc(e.id)}" ${p.get('employee_id')===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select></div>
   <div class="col-6 col-md-3"><label class="form-label small fw-bold text-muted mb-1">المدرسة</label><select name="school_id" class="form-select form-select-sm shadow-none" data-autosubmit><option value="">كل المدارس</option>${[...new Set(S.collections.map(c=>c.school_id))].map(id=>get('schools',id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(s=>`<option value="${esc(s.id)}" ${p.get('school_id')===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
   <div class="col-12 col-md-2 d-flex align-items-end gap-2"><button type="submit" class="btn btn-sm btn-dark px-3 w-100 w-md-auto">تصفية</button>${any?'<a href="#admin/collections" class="btn btn-sm btn-outline-danger px-3 w-100 w-md-auto" title="إعادة ضبط"><i class="bi bi-arrow-counterclockwise"></i></a>':''}</div>
   ${p.get('date')?`<input type="hidden" name="date" value="${esc(p.get('date'))}">`:''}${p.get('status')?`<input type="hidden" name="status" value="${esc(p.get('status'))}">`:''}</form></div></div>
  ${bulkBarHTML(`<button type="button" class="btn btn-xs btn-danger d-flex align-items-center gap-1" data-bulk="delete"><i class="bi bi-trash"></i> حذف</button><button type="button" class="btn btn-xs btn-success d-flex align-items-center gap-1" data-bulk="complete"><i class="bi bi-check-circle"></i> إنهاء</button><button type="button" class="btn btn-xs btn-primary d-flex align-items-center gap-1" data-bs-toggle="modal" data-bs-target="#reassignModal"><i class="bi bi-person-gear"></i> نقل لمشرف آخر</button><button type="button" class="btn btn-xs btn-dark d-flex align-items-center gap-1" data-bulk="labels"><i class="bi bi-qr-code"></i> الملصقات</button>`)}
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th style="width: 40px;" class="text-center ps-3"><input type="checkbox" id="select-all" class="form-check-input shadow-none"></th>
   <th>${sortA('employee_id','الموظف')}</th><th>${sortA('school_id','المدرسة')}</th><th class="text-center">${sortA('asset_count','عدد الأصول')}</th><th>${sortA('last_submitted','آخر إرسال','last_submitted','desc')}</th><th class="text-end pe-3">إجراءات</th></tr></thead><tbody>
   ${pg.items.map(g=>`<tr><td class="text-center ps-3"><input type="checkbox" value="${esc(g.k)}" class="form-check-input row-checkbox shadow-none"></td>
    <td><div class="d-flex align-items-center"><div class="avatar avatar-sm bg-primary-subtle text-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;"><i class="bi bi-person small"></i></div><span class="fw-medium">${esc(empName(g.emp)==='—'?'غير محدد':empName(g.emp))}</span></div></td>
    <td><span>${esc((get('schools',g.school)||{}).name||'غير محدد')}</span></td><td class="text-center"><span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3">${g.count}</span></td>
    <td><div class="small text-muted"><i class="bi bi-clock me-1"></i>${g.last?fmtYmd(g.last):'--'}</div></td>
    <td class="text-end pe-3"><div class="d-flex justify-content-end gap-2">${iconBtn(`#admin/collections/view/${encodeURIComponent(g.emp)}/${encodeURIComponent(g.school)}`,'bi-eye text-primary')}<button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-delgroup="${esc(g.k)}"><i class="bi bi-trash text-danger"></i></button></div></td></tr>`).join('')||'<tr><td colspan="6" class="text-center py-5 text-muted">لا توجد أعمال جرد مطابقة.</td></tr>'}
  </tbody></table></div></div>${pg.footer}</div>${reassignModal('نقل أعمال الجرد','اختر مشرف الميدان الذي تُنقل إليه أعمال الجرد المحددة.')}`);
  const form=$('#collections-form');const submitF=()=>{const fd=new FormData(form);const o={page:null};for(const k of ['search','employee_id','school_id','date','status'])o[k]=fd.get(k)||null;location.hash=withQuery(o)};
  form.onsubmit=e=>{e.preventDefault();submitF()};$$('[data-autosubmit]',form).forEach(s=>s.onchange=submitF);
  const selected=bindBulk();const pairs=()=>selected().map(v=>{const [emp,school]=v.split('_');return {emp,school}});
  const recs=ps=>S.collections.filter(c=>ps.some(x=>x.emp===c.employee_id&&x.school===c.school_id));
  $$('[data-delgroup]').forEach(b=>b.onclick=async()=>{if(!confirm('هل تريد حذف كل أعمال الجرد لهذه المدرسة وهذا الموظف؟'))return;const [emp,school]=b.dataset.delgroup.split('_');await removeCollections(recs([{emp,school}]));setAFlash('تم حذف أعمال الجرد.');vCollections()});
  $$('[data-bulk]').forEach(b=>b.onclick=async()=>{const ps=pairs();if(b.dataset.bulk==='labels'){printLabels(recs(ps).filter(c=>c.type_id&&c.submitted_at),'');return}if(b.dataset.bulk==='delete'){if(!confirm('هل تريد حذف كل أعمال الجرد المحددة؟'))return;await removeCollections(recs(ps));setAFlash('تم حذف أعمال الجرد المحددة.')}
    else{if(!confirm('هل تريد اعتماد المدارس المحددة كمكتملة؟'))return;for(const id of new Set(ps.map(x=>x.school))){const s=get('schools',id);if(s)Object.assign(s,{completed_at:s.completed_at||now(),status:'inactive'})}save('schools');setAFlash('تم اعتماد المدارس المحددة كمكتملة.')}vCollections()});
  $('#reassign-form').onsubmit=e=>{e.preventDefault();const to=e.target.new_employee_id.value;const ps=pairs();
    if(ps.some(x=>x.emp===to)){alert('بعض الأعمال المحددة مسندة لهذا المشرف أصلاً. اختر مشرفاً آخر.');return}
    if(!confirm('هل تريد نقل الأعمال المحددة إلى مشرف الميدان المختار؟'))return;let n=0;
    for(const x of ps){const s=get('schools',x.school);if(!s||s.completed_at)continue;let u=0;for(const c of S.collections)if(c.employee_id===x.emp&&c.school_id===x.school){c.employee_id=to;c.updated_at=now();u++}if(u)n++}
    save('collections');hideModal();if(n)setAFlash('تم نقل '+n+' مجموعة جرد.');else setAFlash('لم يُنقل أي عمل. تأكد أنك اخترت مشرفاً مختلفاً وأن المدارس غير مكتملة.','danger');vCollections()};
  $('#export-btn').onclick=async()=>{const btn=$('#export-btn'),h=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> جارٍ التصدير...';
    const sel=pairs();let list=sel.length?S.collections.filter(c=>sel.some(x=>x.school===c.school_id)):filtered;const sch=p.get('school_id')&&get('schools',p.get('school_id'));
    await exportCollections(list,sch?`${sch.moe}_${sch.name}.xlsx`:'collections-'+stampDash()+'.xlsx');btn.disabled=false;btn.innerHTML=h};
}
const stampDash=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`};

/* ---------- collections/view.blade.php ---------- */
function vCollectionGroup(empId,schoolId){
  const e=get('employees',empId),s=get('schools',schoolId);if(!e||!s){setAFlash('غير موجود.','danger');go('#admin/collections');return}
  let list=S.collections.filter(c=>c.employee_id===empId&&c.school_id===schoolId);
  list=sorted(list,{id:c=>num(c.no),asset_type_id:c=>(get('types',c.type_id)||{}).ar,floor:c=>c.floor,quantity:c=>num(c.quantity),submitted_at:c=>c.submitted_at||''},'submitted_at','desc');
  const cb=s.completed_by&&get('employees',s.completed_by);
  adminShell('collections','أعمال الجرد - '+e.name,`<div class="row mb-4"><div class="col-12"><div class="d-flex align-items-center gap-3"><a href="#admin/collections" class="btn btn-light border shadow-sm rounded-circle p-2"><i class="bi bi-arrow-right fs-5"></i></a><div><h3 class="fw-bold mb-0">تفاصيل مجموعة الجرد</h3>
   <nav aria-label="breadcrumb"><ol class="breadcrumb mb-0 small"><li class="breadcrumb-item"><a href="#admin">لوحة التحكم</a></li><li class="breadcrumb-item"><a href="#admin/collections">أعمال الجرد</a></li><li class="breadcrumb-item active" aria-current="page">${esc(e.name)} @ ${esc(s.name)}</li></ol></nav></div></div></div></div>
  <div class="row mb-4 g-4"><div class="col-lg-8"><div class="card shadow-sm border-0 h-100"><div class="card-header bg-white border-bottom-0 py-3 d-flex justify-content-between align-items-center"><h5 class="card-title fw-bold mb-0"><i class="bi bi-building text-primary me-2"></i>بيانات المدرسة</h5>
    ${s.status==='active'?'<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3">نشطة</span>':'<span class="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-3">غير نشطة</span>'}</div>
   <div class="card-body pt-0"><div class="row g-4"><div class="col-md-6"><div class="p-3 bg-light rounded-3 h-100"><div class="mb-3"><label class="text-muted small fw-bold text-uppercase d-block mb-1">اسم المدرسة</label><span class="fw-bold">${esc(s.name)}</span></div>
     <div class="row"><div class="col-6 border-end"><label class="text-muted small fw-bold text-uppercase d-block mb-1">الرقم الوزاري</label><span class="text-primary font-monospace">${esc(s.moe)}</span></div><div class="col-6 ps-3"><label class="text-muted small fw-bold text-uppercase d-block mb-1">معرّف المبنى</label><code>${esc(s.ident)}</code></div></div></div></div>
    <div class="col-md-6"><div class="p-3 bg-light rounded-3 h-100"><div class="mb-3"><label class="text-muted small fw-bold text-uppercase d-block mb-1">الموقع</label><span>${esc(s.city)} - ${esc(s.district)}</span></div><div><label class="text-muted small fw-bold text-uppercase d-block mb-1">الموقع (Site)</label><span class="text-muted">${esc(s.site||'--')}</span></div></div></div></div></div></div></div>
   <div class="col-lg-4"><div class="card shadow-sm border-0 h-100"><div class="card-header bg-white border-bottom-0 py-3"><h5 class="card-title fw-bold mb-0"><i class="bi bi-patch-check text-success me-2"></i>حالة الإنجاز</h5></div><div class="card-body pt-0 d-flex flex-column justify-content-center">
    ${s.completed_at?`<div class="text-center py-3"><div class="avatar avatar-lg bg-success-subtle text-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 64px; height: 64px;"><i class="bi bi-check-circle-fill fs-2"></i></div><h6 class="fw-bold mb-1">اكتمل العمل</h6><p class="text-muted small mb-0">${fmtYmd(s.completed_at)}</p><hr class="my-3"><div class="d-flex align-items-center justify-content-center gap-2"><div class="avatar avatar-xs bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 24px; height: 24px;"><i class="bi bi-person text-xs"></i></div><span class="small fw-medium">${esc(cb?cb.name:'غير محدد')}</span></div></div>`
    :`<div class="text-center py-3"><div class="avatar avatar-lg bg-warning-subtle text-warning rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 64px; height: 64px;"><i class="bi bi-hourglass-split fs-2"></i></div><h6 class="fw-bold mb-1">قيد التنفيذ</h6><p class="text-muted small mb-0">بانتظار الإرسال النهائي</p></div>`}</div></div></div></div>
  <div class="card shadow-sm border-0 mb-4"><div class="card-header bg-white py-3 d-flex justify-content-between align-items-center"><h5 class="card-title fw-bold mb-0"><i class="bi bi-box-seam text-info me-2"></i>الأصول المجرودة</h5>
   <div class="d-flex align-items-center gap-2"><a href="javascript:void 0" id="xl" class="btn btn-success btn-sm d-flex align-items-center gap-1"><i class="bi bi-download"></i><span class="d-none d-sm-inline">تصدير Excel</span></a><button type="button" id="rep" class="btn btn-outline-success btn-sm d-flex align-items-center gap-1"><i class="bi bi-file-earmark-spreadsheet"></i><span class="d-none d-sm-inline">تقرير المدرسة (عربي / English)</span></button><button type="button" id="lbl" class="btn btn-dark btn-sm d-flex align-items-center gap-1"><i class="bi bi-qr-code"></i><span class="d-none d-sm-inline">طباعة الملصقات</span></button><span class="badge text-bg-info py-2 px-3 rounded-pill">${list.length} عنصر</span></div></div>
   <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light text-muted small text-uppercase fw-bold"><tr>
    <th class="ps-3" style="width: 60px;">${sortA('id','رقم الملصق')}</th><th>${sortA('asset_type_id','الأصل')}</th><th>${sortA('floor','الموقع')}</th><th class="text-center">${sortA('quantity','الكمية')}</th><th>الماركة / التسلسلي</th><th>الحالة</th><th>${sortA('submitted_at','تاريخ الإرسال','submitted_at','desc')}</th><th class="text-end pe-3">إجراءات</th></tr></thead><tbody>
   ${list.map(c=>{const r=get('rooms',c.room_name_id);return `<tr><td class="ps-3 text-muted small font-monospace">${esc(assetLabel(c))}</td>
    <td><div class="d-flex align-items-center">${c.asset_image?`<img data-photo="${esc(c.asset_image)}" class="rounded me-3 border shadow-sm cursor-pointer hover-zoom" style="width: 45px; height: 45px; object-fit: cover;" alt="">`:'<div class="bg-light rounded me-3 d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;"><i class="bi bi-image text-muted opacity-25"></i></div>'}
     <div><span class="fw-bold d-block">${esc((get('types',c.type_id)||{}).ar||'--')} ${(get('types',c.type_id)||{}).critical?'<span class="badge text-bg-danger">حرج</span>':''}</span><span class="text-muted small">${esc(typeLevels(get('types',c.type_id)).split(' › ').slice(0,-1).join(' › ')||(get('categories',c.category_id)||{}).ar||'--')}</span>${(get('types',c.type_id)||{}).code?`<span class="d-block small font-monospace text-primary" dir="ltr">${esc(get('types',c.type_id).code)}</span>`:''}</div></div></td>
    <td><div class="fw-bold">${esc(c.floor||'')}</div><span class="text-muted small">${esc(r?r.ar:'غير محدد')} (${esc(c.room_number||'')})</span></td>
    <td class="text-center"><span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3">${num(c.quantity)}</span></td>
    <td><span class="d-block fw-medium">${esc(c.brand||'--')}</span><span class="text-muted small">${esc(c.serial||'--')}</span></td>
    <td>${c.submitted_at?'<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2"><i class="bi bi-check-circle me-1"></i>مُرسل</span>':'<span class="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-2"><i class="bi bi-clock me-1"></i>معلّق</span>'}</td>
    <td><div class="small"><span class="d-block">${c.submitted_at?fmtYmd(c.submitted_at):'--'}</span></div></td>
    <td class="text-end pe-3"><div class="d-flex justify-content-end gap-2">${iconBtn('#admin/collections/'+encodeURIComponent(c.id),'bi-eye text-primary','عرض التفاصيل')}${iconBtn('#admin/collections/'+encodeURIComponent(c.id)+'/edit','bi-pencil text-warning','تعديل')}<button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" title="حذف" data-del="${esc(c.id)}"><i class="bi bi-trash text-danger"></i></button></div></td></tr>`}).join('')||'<tr><td colspan="8" class="text-center py-5 text-muted">لا توجد أعمال جرد.</td></tr>'}
   </tbody></table></div></div></div>`);
  $$('img[data-photo]').forEach(i=>i.onclick=()=>window.open(i.src,'_blank'));
  $('#xl').onclick=()=>exportCollections(list,`${s.moe}_${s.name}.xlsx`);
  $('#rep').onclick=()=>schoolReport(list,s);$('#lbl').onclick=()=>printLabels(list.filter(c=>c.type_id),s.name);
  $$('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('هل أنت متأكد؟'))return;await removeCollections(S.collections.filter(c=>c.id===b.dataset.del));setAFlash('تم حذف السجل.');vCollectionGroup(empId,schoolId)});
}

/* ---------- collections/show.blade.php ---------- */
function vCollectionShow(id){
  const c=S.collections.find(x=>x.id===id);if(!c){go('#admin/collections');return}const e=get('employees',c.employee_id),s=get('schools',c.school_id),r=get('rooms',c.room_name_id);
  const hist=S.log.filter(l=>l.coll===id);const hasLL=c.lat!=null&&c.lng!=null;
  const row=(k,v)=>`<tr><th${k==='الموظف'?' style="width:40%"':''}>${k}</th><td>${v}</td></tr>`;
  adminShell('collections','سجل جرد #'+(c.no||''),`<div class="row"><div class="col-md-6"><div class="card"><div class="card-header"><h3 class="card-title">تفاصيل السجل</h3></div><div class="card-body"><table class="table table-bordered">
   ${row('الموظف',esc(e?e.name:'غير محدد'))}${row('الرقم الوظيفي',esc(e?e.number:'غير محدد'))}${row('المدرسة',esc(s?s.name:'غير محدد'))}${row('معرّف المبنى',esc(s?s.ident:'غير محدد'))}${row('الدور',esc(c.floor||''))}${row('رقم الغرفة',esc(c.room_number||''))}${row('اسم الغرفة',esc(r?r.ar:'غير محدد'))}
   ${row('خط العرض',esc(c.lat??'--'))}${row('خط الطول',esc(c.lng??'--'))}${row('ملاحظات',esc(c.notes||'--'))}
   ${row('الحالة',c.submitted_at?`<span class="badge text-bg-success">مُرسل</span><small class="text-muted ms-2">${fmtYmd(c.submitted_at)}</small>`:'<span class="badge text-bg-warning">معلّق</span>')}${row('تاريخ الإنشاء',fmtYmd(c.created_at))}</table></div></div></div>
  <div class="col-md-6"><div class="card"><div class="card-header"><h3 class="card-title">صورة المدرسة</h3></div><div class="card-body text-center">${c.school_image?`<img data-photo="${esc(c.school_image)}" alt="صورة المدرسة" class="img-fluid rounded shadow-sm cursor-pointer" style="max-height: 300px; cursor: zoom-in;">`:'<p class="text-muted">لا توجد صورة.</p>'}</div></div>
   <div class="card mt-3"><div class="card-header"><h3 class="card-title">صورة الأصل</h3></div><div class="card-body text-center">${c.asset_image?`<img data-photo="${esc(c.asset_image)}" alt="صورة الأصل" class="img-fluid rounded shadow-sm cursor-pointer" style="max-height: 300px; cursor: zoom-in;">`:'<p class="text-muted">لا توجد صورة للأصل.</p>'}</div></div>
   <div class="card mt-3"><div class="card-header d-flex justify-content-between align-items-center"><h3 class="card-title">ملصق الأصل</h3>${c.type_id?'<button type="button" class="btn btn-sm btn-dark ms-auto" id="lbl1"><i class="bi bi-printer me-1"></i>طباعة</button>':''}</div><div class="card-body d-flex align-items-center gap-3"><div id="qr1" style="width:120px;height:120px"></div><div><div class="small text-muted">رقم الملصق</div><div class="fs-4 fw-bold font-monospace">${esc(assetLabel(c)||'—')}</div></div></div></div>
   <div class="card mt-3"><div class="card-header"><h3 class="card-title">خريطة موقع الأصل</h3></div><div class="card-body p-2">${hasLL?'<div id="location-map"></div>':'<p class="text-muted text-center py-4">لا توجد بيانات موقع.</p>'}</div></div></div></div>
  <div class="card"><div class="card-header"><h3 class="card-title">تفاصيل الأصل</h3>${(()=>{const ty=get('types',c.type_id);return ty&&ty.code?`<div class="small mt-1">${esc(typeLevels(ty))} · <span class="font-monospace" dir="ltr">${esc(ty.code)}</span> · ${ty.critical?'<span class="badge text-bg-danger">حرج</span>':'<span class="badge text-bg-light border">غير حرج</span>'}</div>`:''})()}</div><div class="card-body table-responsive p-0"><table class="table table-striped"><thead><tr>${['المستوى الأول','وصف الأصل','الكمية','السعر','الشركة المصنعة','الماركة','الموديل','السعة','الرقم التسلسلي','رقم ASAD','الحالة الفنية','التشغيل','تاريخ الإرسال'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>
   ${c.type_id?`<tr><td>${esc((get('categories',c.category_id)||{}).ar||'--')}</td><td>${esc((get('types',c.type_id)||{}).ar||'--')}</td><td><span class="badge text-bg-secondary">${num(c.quantity)}</span></td><td>${c.price?Number(c.price).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'--'}</td><td>${esc(c.manufacturer||'--')}</td><td>${esc(c.brand||'--')}</td><td>${esc(c.model||'--')}</td><td>${esc(c.capacity||'--')}</td><td>${esc(c.serial||'--')}</td><td>${esc(c.tag||'--')}</td>
    <td>${c.condition_id?`<span class="badge text-bg-info">${esc((get('conditions',c.condition_id)||{}).ar||'')}</span>`:'--'}</td><td>${c.submitted_at?(c.status==='Works'?'<span class="badge text-bg-success">يعمل</span>':'<span class="badge text-bg-danger">لا يعمل</span>'):'<span class="badge text-bg-warning">معلّق</span>'}</td><td>${c.submitted_at?fmtYmd(c.submitted_at):'--'}</td></tr>`:'<tr><td colspan="13" class="text-center">لا توجد أصول مسجلة.</td></tr>'}</tbody></table></div></div>
  <div class="row"><div class="col-md-12"><div class="card"><div class="card-header"><h3 class="card-title">معلومات إضافية</h3></div><div class="card-body"><div class="row">
   <div class="col-md-4"><p><strong>الوكيل (إن وجد):</strong> ${esc(c.agency||'--')}</p><p><strong>الضمان (إن وجد):</strong> ${esc(c.warranty||'--')}</p></div>
   <div class="col-md-4"><p><strong>تاريخ التركيب:</strong> ${esc(c.install_date||'--')}</p><p><strong>دولة الموقع (ASAD):</strong> ${esc(c.asad_country||'--')}</p></div>
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
  <div class="row"><div class="col-md-6 mb-3"><label class="form-label">الموظف</label><select name="employee_id" class="form-select" required>${opt(S.employees.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')),c.employee_id,e=>`${esc(e.name)} (${esc(e.number)})`)}</select></div>
   <div class="col-md-6 mb-3"><label class="form-label">المدرسة</label><select name="school_id" class="form-select" required>${opt(S.schools.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')),c.school_id,s=>`${esc(s.name)} (${esc(s.ident)})`)}</select></div></div>
  <div class="row"><div class="col-md-4 mb-3"><label class="form-label">الدور</label><input type="text" name="floor" value="${esc(c.floor||'')}" class="form-control" required></div>
   <div class="col-md-4 mb-3"><label class="form-label">رقم الغرفة</label><input type="text" name="room_number" value="${esc(c.room_number||'')}" class="form-control" required></div>
   <div class="col-md-4 mb-3"><label class="form-label">اسم الغرفة</label><select name="room_name_id" class="form-select" required><option value="">اختر...</option>${opt(S.rooms.slice().sort(byAr),c.room_name_id,r=>esc(r.ar))}</select></div></div><hr>
  <div class="row"><div class="col-md-6 mb-3"><label class="form-label">الفئة</label><select name="category_id" id="asset_category_id" class="form-select"><option value="">-- اختر الفئة --</option>${opt(S.categories.slice().sort(byAr),c.category_id,x=>esc(x.ar))}</select></div>
   <div class="col-md-6 mb-3"><label class="form-label">نوع الأصل</label><select name="type_id" id="asset_type_id" class="form-select"><option value="">-- اختر النوع --</option>${opt(S.types.filter(x=>x.cat===c.category_id).sort(byAr),c.type_id,x=>esc(x.ar))}</select></div></div>
  <div class="row"><div class="col-md-3 mb-3"><label class="form-label">الكمية</label><input type="number" name="quantity" value="${esc(c.quantity??0)}" class="form-control" required min="0"></div>
   <div class="col-md-3 mb-3"><label class="form-label">السعر</label><input type="number" step="0.01" name="price" value="${esc(c.price??'')}" class="form-control"></div>
   <div class="col-md-4 mb-3"><label class="form-label">التشغيل</label><select name="status" class="form-select"><option value="Works" ${c.status==='Works'?'selected':''}>يعمل</option><option value="Does not work" ${c.status==='Does not work'?'selected':''}>لا يعمل</option></select></div>
   <div class="col-md-4 mb-3"><label class="form-label">الماركة</label><input type="text" name="brand" value="${esc(c.brand||'')}" class="form-control"></div></div>
  <div class="row"><div class="col-md-6 mb-3"><label class="form-label">الرقم التسلسلي</label><input type="text" name="serial" value="${esc(c.serial||'')}" class="form-control"></div><div class="col-md-6 mb-3"><label class="form-label">رقم ASAD</label><input type="text" name="tag" value="${esc(c.tag||'')}" class="form-control"></div></div>
  <div class="mb-3"><label class="form-label">ملاحظات</label><textarea name="notes" class="form-control" rows="3">${esc(c.notes||'')}</textarea></div></div>
  <div class="card-footer text-end"><a href="#admin/collections/view/${encodeURIComponent(c.employee_id)}/${encodeURIComponent(c.school_id)}" class="btn btn-secondary">إلغاء</a> <button type="submit" class="btn btn-primary">حفظ التعديل</button></div></form></div></div></div>`);
  $('#asset_category_id').onchange=function(){const ts=S.types.filter(x=>x.cat===this.value).sort(byAr);$('#asset_type_id').innerHTML='<option value="">-- اختر النوع --</option>'+ts.map(x=>`<option value="${esc(x.id)}">${esc(x.ar)}</option>`).join('')};
  $('#f').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);const old=Object.assign({},c);
    const v={employee_id:fd.get('employee_id'),school_id:fd.get('school_id'),floor:fd.get('floor').trim(),room_number:fd.get('room_number').trim(),room_name_id:fd.get('room_name_id'),category_id:fd.get('category_id')||null,type_id:fd.get('type_id')||null,
      quantity:Math.max(0,Math.round(num(fd.get('quantity')))),price:fd.get('price')===''?null:num(fd.get('price')),status:fd.get('status')||null,brand:fd.get('brand').trim(),serial:fd.get('serial').trim(),tag:fd.get('tag').trim(),notes:fd.get('notes').trim()};
    Object.assign(c,v,{updated_at:now()});logChange(c,'admin',diff(old,c,TRACK.concat(['employee_id','school_id'])));save('collections');
    setAFlash('تم تحديث السجل.');go(`#admin/collections/view/${encodeURIComponent(c.employee_id)}/${encodeURIComponent(c.school_id)}`)};
}

/* ---------- schools/index.blade.php ---------- */
function schoolQuery(p){const q=norm(p.get('search')||''),status=p.get('status'),city=p.get('city'),district=p.get('district');const sst=schoolStats();
  let list=S.schools.filter(s=>{if(q&&!(norm(s.name).includes(q)||norm(s.ident).includes(q)||norm(s.moe).includes(q)))return false;
    if(status){if(['completed','in_progress','not_started'].includes(status)){if(schoolState(s,sst.get(s.id))!==status)return false}else if(s.status!==status)return false}
    if(city&&s.city!==city)return false;if(district&&s.district!==district)return false;return true});
  list=sorted(list,{id:s=>num(dispId(s.id)),moe_no:s=>s.moe,school_identifier:s=>s.ident,name_ar:s=>s.name,city_ar:s=>s.city,district_ar:s=>s.district,status:s=>s.status,asset_collections_count:s=>(sst.get(s.id)||{}).any||0,created_at:s=>s.created_at},'name_ar','asc');
  return {list,sst}}
function vSchools(){
  const p=qp();const {list,sst}=schoolQuery(p);const pg=paginate(list);const any=['search','status','city','district'].some(k=>p.get(k));
  const cities=[...new Set(S.schools.map(s=>s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));const dists=[...new Set(S.schools.map(s=>s.district).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const latestEmp=id=>{let best=null;for(const c of S.collections)if(c.school_id===id&&(!best||(c.submitted_at||'')>(best.submitted_at||'')))best=c;return best&&best.employee_id};
  adminShell('schools','المدارس',`<div class="card shadow-sm border-0 mb-4"><div class="card-header bg-white py-3"><div class="d-flex align-items-center justify-content-between"><div><h3 class="card-title fw-bold mb-0 text-dark"><i class="bi bi-building me-2 text-primary"></i>المدارس</h3></div>
   <div class="d-flex gap-2"><button class="btn btn-light border btn-sm d-md-none" type="button" data-bs-toggle="collapse" data-bs-target="#filterCollapse"><i class="bi bi-funnel"></i></button><button type="button" id="export-btn" class="btn btn-success btn-sm d-flex align-items-center gap-1"><i class="bi bi-download"></i><span class="d-none d-sm-inline">تصدير Excel</span></button><a href="#admin/schools/create" class="btn btn-primary btn-sm d-flex align-items-center gap-1"><i class="bi bi-plus-lg"></i><span class="d-none d-sm-inline">إضافة مدرسة</span></a></div></div></div>
  <div class="collapse d-md-block border-bottom bg-light-subtle" id="filterCollapse"><div class="card-body py-3"><form id="schools-form" class="row g-3">
   <div class="col-12 col-md-4 col-lg-3"><label class="form-label small fw-bold text-muted mb-1">بحث</label><div class="input-group input-group-sm"><span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span><input type="text" name="search" class="form-control border-start-0" placeholder="الاسم، المعرّف، الرقم الوزاري..." value="${esc(p.get('search')||'')}"></div></div>
   <div class="col-6 col-md-2"><label class="form-label small fw-bold text-muted mb-1">الحالة</label><select name="status" class="form-select form-select-sm shadow-none" data-autosubmit><option value="">كل الحالات</option>${[['completed','مكتملة'],['in_progress','قيد التنفيذ'],['not_started','لم تبدأ']].map(([v,l])=>`<option value="${v}" ${p.get('status')===v?'selected':''}>${l}</option>`).join('')}<hr>${[['active','نشطة'],['inactive','غير نشطة']].map(([v,l])=>`<option value="${v}" ${p.get('status')===v?'selected':''}>${l}</option>`).join('')}</select></div>
   <div class="col-6 col-md-2"><label class="form-label small fw-bold text-muted mb-1">المحافظة</label><select name="city" class="form-select form-select-sm shadow-none" data-autosubmit><option value="">كل المحافظات</option>${cities.map(x=>`<option ${p.get('city')===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
   <div class="col-6 col-md-2"><label class="form-label small fw-bold text-muted mb-1">الحي / المكتب</label><select name="district" class="form-select form-select-sm shadow-none" data-autosubmit><option value="">الكل</option>${dists.map(x=>`<option ${p.get('district')===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
   <div class="col-6 col-md-2 col-lg-auto d-flex align-items-end gap-2"><button type="submit" class="btn btn-sm btn-dark px-3 w-100 w-md-auto">تصفية</button>${any?'<a href="#admin/schools" class="btn btn-sm btn-outline-danger px-3 w-100 w-md-auto" title="إعادة ضبط"><i class="bi bi-arrow-counterclockwise"></i></a>':''}</div></form></div></div>
  ${bulkBarHTML(`<button type="button" class="btn btn-xs btn-danger d-flex align-items-center gap-1" data-bulk="delwork"><i class="bi bi-trash"></i> حذف الأعمال</button><button type="button" class="btn btn-xs btn-success d-flex align-items-center gap-1" data-bulk="complete"><i class="bi bi-check-circle"></i> إنهاء</button><button type="button" class="btn btn-xs btn-primary d-flex align-items-center gap-1" data-bs-toggle="modal" data-bs-target="#reassignModal"><i class="bi bi-person-gear"></i> نقل لمشرف آخر</button>`)}
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th style="width: 40px;" class="text-center ps-3"><input type="checkbox" id="select-all" class="form-check-input shadow-none"></th>
   <th>${sortA('id','#')}</th><th>${sortA('moe_no','الرقم الوزاري')}</th><th>${sortA('school_identifier','المعرّف')}</th><th>${sortA('name_ar','اسم المدرسة','name_ar','asc')}</th><th>${sortA('city_ar','الموقع')}</th><th>الموظف</th><th>${sortA('status','الحالة')}</th><th>${sortA('asset_collections_count','السجلات')}</th><th>${sortA('created_at','تاريخ الإضافة')}</th><th class="text-end pe-3">إجراءات</th></tr></thead><tbody>
   ${pg.items.map(s=>{const x=sst.get(s.id);const le=latestEmp(s.id);const rel=s.completed_by||le;const cb=s.completed_by&&get('employees',s.completed_by);return `<tr><td class="text-center ps-3"><input type="checkbox" value="${esc(s.id)}" class="form-check-input row-checkbox shadow-none"></td>
    <td class="ps-3 text-muted">${esc(dispId(s.id))}</td><td class="fw-medium">${esc(s.moe||'--')}</td><td><code class="text-primary small">${esc(s.ident)}</code></td>
    <td>${rel?`<a href="#admin/collections/view/${encodeURIComponent(rel)}/${encodeURIComponent(s.id)}" class="link-primary fw-bold">${esc(s.name)}</a>`:`<a href="#admin/collections?school_id=${encodeURIComponent(s.id)}" class="link-primary fw-bold">${esc(s.name)}</a>`}</td>
    <td><div class="small"><span>${esc(s.city||'--')}</span><br><span class="text-muted">${esc(s.district||'--')}</span></div></td>
    <td>${cb?`<span class="fw-medium">${esc(cb.name)}</span>`:le?`<span class="text-muted small">${esc(empName(le))}</span>`:'<span class="text-muted small">--</span>'}</td>
    <td>${s.completed_at?'<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3">مكتملة</span>':x&&x.any?'<span class="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3">قيد التنفيذ</span>':'<span class="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-3">لم تبدأ</span>'}</td>
    <td><span class="badge bg-info-subtle text-info border border-info-subtle">${x?x.any:0}</span></td><td><div class="small text-muted"><div>${fmtYmd(s.created_at)}</div></div></td>
    <td class="text-end pe-3">${iconBtn('#admin/schools/'+encodeURIComponent(s.id)+'/edit','bi-pencil text-warning')}</td></tr>`}).join('')||'<tr><td colspan="11" class="text-center py-5 text-muted">لا توجد مدارس مطابقة.</td></tr>'}
  </tbody></table></div></div>${pg.footer}</div>${reassignModal('نقل المدارس','اختر مشرف الميدان الذي تُنقل إليه كل أعمال المدارس المحددة.')}`);
  const form=$('#schools-form');const submitF=()=>{const fd=new FormData(form);const o={page:null};for(const k of ['search','status','city','district'])o[k]=fd.get(k)||null;location.hash=withQuery(o)};
  form.onsubmit=e=>{e.preventDefault();submitF()};$$('[data-autosubmit]',form).forEach(s=>s.onchange=submitF);
  const selected=bindBulk();
  $$('[data-bulk]').forEach(b=>b.onclick=async()=>{const ids=selected();
    if(b.dataset.bulk==='delwork'){if(!confirm('هل تريد حذف كل أعمال الجرد للمدارس المحددة؟'))return;const set=new Set(ids);await removeCollections(S.collections.filter(c=>set.has(c.school_id)));setAFlash('تم حذف أعمال المدارس المحددة.')}
    else{if(!confirm('هل تريد اعتماد المدارس المحددة كمكتملة؟'))return;for(const id of ids){const s=get('schools',id);if(s)Object.assign(s,{completed_at:now(),status:'inactive'})}save('schools');setAFlash('تم اعتماد المدارس المحددة كمكتملة.')}vSchools()});
  $('#reassign-form').onsubmit=e=>{e.preventDefault();const to=e.target.new_employee_id.value;if(!confirm('هل تريد نقل كل أعمال المدارس المحددة إلى مشرف الميدان المختار؟'))return;
    const set=new Set(selected().filter(id=>!(get('schools',id)||{}).completed_at));for(const c of S.collections)if(set.has(c.school_id)){c.employee_id=to;c.updated_at=now()}save('collections');hideModal();setAFlash(`تم نقل أعمال ${set.size} مدرسة.`);vSchools()};
  $('#export-btn').onclick=()=>writeXlsx([['Worksheet',[['ID','MOE Number','Identifier','Name (Arabic)','City','District','Site','Status','Asset Collections Count','Completed At','Description','Created At'],...list.map(s=>[num(dispId(s.id))||s.id,s.moe,s.ident,s.name,s.city,s.district,s.site,s.status,(sst.get(s.id)||{}).any||0,ymdhms(s.completed_at),s.description||'',ymdhms(s.created_at)])]]],'schools-'+stampDash()+'.xlsx');
}

/* ---------- generic create/edit form (schools, employees, categories, types, conditions, rooms) ---------- */
function crudForm(active,title,fields,rec,onSave,cancelHref){
  adminShell(active,title,`<div class="row"><div class="col-md-8 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">${title}</h3></div><form id="f" novalidate><div class="card-body">
  ${fields.map(f=>`<div class="mb-3"><label for="${f.k}" class="form-label">${f.l}${f.req?' <span class="text-danger">*</span>':''}</label>${f.type==='select'?`<select name="${f.k}" id="${f.k}" class="form-select" ${f.req?'required':''}>${f.blank?`<option value="">${f.blank}</option>`:''}${f.opts.map(([v,l])=>`<option value="${esc(v)}" ${String(rec[f.k]??'')===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`
    :f.type==='textarea'?`<textarea name="${f.k}" id="${f.k}" rows="3" class="form-control">${esc(rec[f.k]||'')}</textarea>`:f.type==='list'?`<input type="text" name="${f.k}" id="${f.k}" list="dl_${f.k}" class="form-control" autocomplete="off" value="${esc(f.get?f.get(rec):rec[f.k]??'')}" ${f.req?'required':''}><datalist id="dl_${f.k}">${f.opts.map(([v])=>`<option value="${esc(v)}">`).join('')}</datalist><div class="form-text">اختر من القائمة أو اكتب قيمة جديدة.</div>`:`<input type="text" name="${f.k}" id="${f.k}" class="form-control" value="${esc(rec[f.k]??'')}" ${f.req?'required':''}>`}<div class="invalid-feedback" data-err="${f.k}"></div></div>`).join('')}
  </div><div class="card-footer"><button type="submit" class="btn btn-primary">حفظ</button> <a href="${cancelHref}" class="btn btn-secondary">إلغاء</a></div></form></div></div></div>`);
  $('#f').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);const v={};$$('.is-invalid').forEach(x=>x.classList.remove('is-invalid'));let bad=false;
    for(const f of fields){v[f.k]=String(fd.get(f.k)||'').trim();if(f.req&&!v[f.k]){bad=true;$('#'+f.k).classList.add('is-invalid');$(`[data-err="${f.k}"]`).textContent=`حقل «${f.l}» مطلوب.`}}
    if(bad)return;const err=onSave(v);if(err){$('#'+err[0]).classList.add('is-invalid');$(`[data-err="${err[0]}"]`).textContent=err[1]}}}
function vSchoolForm(id){const isNew=!id;const s=isNew?{status:'active'}:get('schools',id);if(!s){go('#admin/schools');return}
  crudForm(isNew?'schools.create':'schools.edit',isNew?'إضافة مدرسة':'تعديل مدرسة',[{k:'ident',l:'معرّف المبنى',req:1},{k:'name',l:'اسم المدرسة',req:1},{k:'moe',l:'الرقم الوزاري'},{k:'site',l:'الموقع (Site)'},{k:'district',l:'الحي / المكتب'},{k:'city',l:'المحافظة'},{k:'status',l:'الحالة',req:1,type:'select',opts:[['active','نشطة'],['inactive','غير نشطة']]},{k:'description',l:'الوصف',type:'textarea'}],s,v=>{
    if(S.schools.some(x=>x.ident===v.ident&&x!==s))return ['ident','هذا المعرّف مستخدم لمدرسة أخرى.'];
    Object.assign(s,v);if(isNew){Object.assign(s,{id:nextId('schools','s'),completed_at:null,completed_by:null,created_at:now()});S.schools.push(s)}reindex();save('schools');setAFlash(isNew?'تمت إضافة المدرسة.':'تم تحديث المدرسة.');go('#admin/schools')},'#admin/schools')}

/* ---------- employees ---------- */
function vEmployees(){const p=qp();const q=norm(p.get('search')||'');const cnt=new Map();for(const c of S.collections)cnt.set(c.employee_id,(cnt.get(c.employee_id)||0)+1);
  let list=S.employees.filter(e=>!q||norm(e.name).includes(q)||String(e.number).includes(q));list=sorted(list,{id:e=>num(dispId(e.id)),employee_number:e=>e.number,name:e=>e.name,asset_collections_count:e=>cnt.get(e.id)||0,created_at:e=>e.created_at},'name','asc');const pg=paginate(list);
  adminShell('employees','المستخدمون',`${addUserCard()}<div id="staffBox"></div><div class="card shadow-sm border-0 mb-4"><div class="card-header bg-white py-3"><div class="d-flex align-items-center justify-content-between"><div><h3 class="card-title fw-bold mb-0 text-dark"><i class="bi bi-person-badge me-2 text-primary"></i>مشرفو الميدان <span class="badge text-bg-light border fw-normal">${S.employees.length}</span></h3><small class="text-muted">يدخلون تطبيق الجرد برقمهم الوظيفي</small></div>
   <div class="d-flex gap-2"><form class="input-group input-group-sm d-none d-md-flex" style="width: 250px;" data-search><span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span><input type="text" name="search" class="form-control border-start-0 shadow-none" placeholder="ابحث عن موظف..." value="${esc(p.get('search')||'')}">${p.get('search')?'<a href="#admin/employees" class="btn btn-outline-danger border-start-0"><i class="bi bi-x-lg"></i></a>':''}</form>
    <button class="btn btn-light border btn-sm d-md-none" type="button" data-bs-toggle="collapse" data-bs-target="#searchCollapse"><i class="bi bi-search"></i></button>${Cloud.on&&Cloud.role==='admin'?'<button type="button" id="genLogins" class="btn btn-success btn-sm d-flex align-items-center gap-1"><i class="bi bi-key"></i><span class="d-none d-sm-inline">إنشاء حسابات الدخول</span></button>':''}${Cloud.on&&Cloud.role==='reader'?'':'<button type="button" data-adduser class="btn btn-primary btn-sm d-flex align-items-center gap-1"><i class="bi bi-person-plus"></i><span class="d-none d-sm-inline">إضافة مستخدم</span></button>'}</div></div></div>
  <div class="collapse d-md-none border-bottom bg-light-subtle" id="searchCollapse"><div class="card-body py-3"><form class="row g-2" data-search><div class="col-12"><div class="input-group input-group-sm"><span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span><input type="text" name="search" class="form-control border-start-0 shadow-none" placeholder="بحث..." value="${esc(p.get('search')||'')}"></div></div><div class="col-12 d-flex gap-2"><button type="submit" class="btn btn-sm btn-dark w-100">بحث</button>${p.get('search')?'<a href="#admin/employees" class="btn btn-sm btn-outline-danger w-100">إعادة ضبط</a>':''}</div></form></div></div>
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3">${sortA('id','#')}</th><th>${sortA('employee_number','الرقم الوظيفي')}</th><th>${sortA('name','الاسم','name','asc')}</th><th>الدور</th><th class="text-center">${sortA('asset_collections_count','السجلات')}</th><th>${sortA('created_at','تاريخ الإضافة')}</th>${Cloud.on?'<th class="text-center">حساب الدخول</th>':''}<th class="text-end pe-3">إجراءات</th></tr></thead><tbody>
  ${pg.items.map(e=>`<tr><td class="ps-3 text-muted">${esc(dispId(e.id))}</td><td><code class="text-primary small">${esc(e.number)}</code></td><td><div class="d-flex align-items-center"><div class="avatar avatar-sm bg-info-subtle text-info rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;"><i class="bi bi-person small"></i></div><span class="fw-medium">${esc(e.name)}</span></div></td><td><span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2">مشرف ميدان</span></td>
   <td class="text-center"><span class="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3">${cnt.get(e.id)||0}</span></td><td class="small text-muted">${fmtYmd(e.created_at)}</td>${Cloud.on?`<td class="text-center"><span data-login="${esc(e.id)}" class="text-muted small">…</span></td>`:''}
   <td class="text-end pe-3"><div class="d-flex justify-content-end gap-2">${iconBtn('#admin/employees/'+encodeURIComponent(e.id)+'/edit','bi-pencil text-warning')}<button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-del="${esc(e.id)}"><i class="bi bi-trash text-danger"></i></button></div></td></tr>`).join('')||`<tr><td colspan="${Cloud.on?8:7}" class="text-center py-5 text-muted">لا يوجد مشرفو ميدان.</td></tr>`}
  </tbody></table></div></div>${pg.footer}</div>`);
  $$('[data-search]').forEach(f=>f.onsubmit=e=>{e.preventDefault();location.hash=withQuery({search:new FormData(f).get('search')||null,page:null})});
  if(Cloud.on)empLogins();bindAddUser();if(Cloud.on&&canUsers())loadStaff();
  $$('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('هل أنت متأكد؟'))return;const id=b.dataset.del;await removeCollections(S.collections.filter(c=>c.employee_id===id));S.employees=S.employees.filter(x=>x.id!==id);for(const s of S.schools)if(s.completed_by===id)s.completed_by=null;reindex();save('employees');save('schools');setAFlash('تم حذف مشرف الميدان.');vEmployees()});
}
/* technicians' sign-in (cloud): employee number + a password set here */
const genPw=()=>{const a=new Uint32Array(2);crypto.getRandomValues(a);return String(10000000+a[0]%90000000)};
async function empLogins(){let map=new Map();try{const c=await Cloud.sb();map=new Map((Cloud.chk(await c.rpc('nv_emp_logins'))||[]).map(r=>[r.id,r.has_login]))}catch(e){}
  $$('[data-login]').forEach(el=>{const id=el.dataset.login,has=map.get(id);el.className='';
    el.innerHTML=`${has?'<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2"><i class="bi bi-check-circle me-1"></i>نعم</span>':'<span class="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-2">لا</span>'}${Cloud.role==='admin'?` <button type="button" class="btn btn-xs btn-outline-primary" data-setpw="${esc(id)}" title="${has?'كلمة مرور جديدة':'إنشاء حساب دخول'}"><i class="bi bi-key"></i></button>`:''}`});
  $$('[data-setpw]').forEach(b=>b.onclick=async()=>{const e=get('employees',b.dataset.setpw);if(!e)return;if(Cloud.pendingCount()){await Cloud.sync()}
    const pw=prompt(`كلمة المرور لـ ${e.name} (${e.number}) — 8 أحرف على الأقل. اترك المقترحة أو اكتب غيرها:`,genPw());if(!pw)return;
    try{const c=await Cloud.sb();Cloud.chk(await c.rpc('nv_emp_set_login',{p_emp:e.id,p_password:pw}));alert(`تم.\n\nالرقم الوظيفي: ${e.number}\nكلمة المرور: ${pw}\n\nيفتح مشرف الميدان رابط Solvix ويدخل بهما.`);empLogins()}catch(er){alert(er.message)}});
  const g=$('#genLogins');if(g)g.onclick=async()=>{const missing=S.employees.filter(e=>!map.get(e.id));if(!missing.length)return alert('لكل الموظفين حسابات دخول بالفعل.');
    if(!confirm(`إنشاء حسابات دخول لـ ${missing.length} مشرف ميدان ليس لهم حساب؟ سيُنزَّل ملف Excel بكلمات المرور — احفظه بأمان وأعطِ كل مشرف سطره فقط.`))return;
    await Cloud.sync();const c=await Cloud.sb();const rows=[['الرقم الوظيفي','الاسم','كلمة المرور','الرابط']];let ok=0;g.disabled=true;
    for(const e of missing){const pw=genPw();try{Cloud.chk(await c.rpc('nv_emp_set_login',{p_emp:e.id,p_password:pw}));rows.push([e.number,e.name,pw,location.origin+location.pathname]);ok++;g.innerHTML=`<span class="spinner-border spinner-border-sm"></span> ${ok}/${missing.length}`}catch(er){rows.push([e.number,e.name,'خطأ: '+er.message,''])}}
    await writeXlsx([['حسابات الدخول',rows]],'solvix-logins-'+stampDash()+'.xlsx');setAFlash(`تم إنشاء ${ok} حساب دخول. كلمات المرور موجودة فقط في الملف الذي نزل.`);vEmployees()};
}
function vEmployeeForm(id){const isNew=!id;const e=isNew?{}:get('employees',id);if(!e){go('#admin/employees');return}
  crudForm(isNew?'employees.create':'employees.edit',isNew?'إضافة موظف':'تعديل موظف',[{k:'number',l:'الرقم الوظيفي',req:1},{k:'name',l:'الاسم',req:1}],e,v=>{
    if(S.employees.some(x=>String(x.number)===v.number&&x!==e))return ['number','هذا الرقم الوظيفي مستخدم لموظف آخر.'];
    Object.assign(e,v);if(isNew){Object.assign(e,{id:nextId('employees','e'),created_at:now()});S.employees.push(e)}reindex();save('employees');setAFlash(isNew?'تمت إضافة الموظف.':'تم تحديث الموظف.');go('#admin/employees')},'#admin/employees')}

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
  ${pg.items.map(x=>`<tr><td class="ps-3 text-muted">${esc(dispId(x.id))}</td>${L.cols.map(([c])=>cell(x,c)).join('')}<td class="text-end pe-3"><div class="d-flex justify-content-end gap-2">${iconBtn(`#admin/${key}/${encodeURIComponent(x.id)}/edit`,'bi-pencil text-warning')}${L.del?`<button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-del="${esc(x.id)}"><i class="bi bi-trash text-danger"></i></button>`:''}</div></td></tr>`).join('')||`<tr><td colspan="${L.cols.length+2}" class="text-center py-5 text-muted">${L.empty}</td></tr>`}
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
function vSettings(){if(!canUsers())return go('#admin/asset-types');
  adminShell('settings','الإعدادات',`<div class="row"><div class="col-md-8 col-lg-6"><div class="card"><div class="card-header"><h3 class="card-title">إعدادات التطبيق</h3></div><form id="f"><div class="card-body">
  <div class="mb-3"><label for="application_name" class="form-label">اسم التطبيق <span class="text-danger">*</span></label><input type="text" id="application_name" class="form-control" value="${esc(appName())}" required maxlength="255"></div>
  <div class="mb-3"><label for="admin_email" class="form-label">بريد المستلمين</label><input type="text" id="admin_email" class="form-control" value="${esc(S.settings.admin_email||'')}" maxlength="500"><div class="form-text text-muted">البريد الذي تصله إشعارات جرد المدارس. افصل بين العناوين بفاصلة (مثال: admin@example.com, manager@example.com). هذه النسخة لا ترسل بريداً؛ التعديلات تُحفظ في «سجل التعديلات».</div></div>
  <div class="mb-3"><label for="application_logo" class="form-label">شعار التطبيق</label><input type="file" id="application_logo" class="form-control" accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp">
   <div class="mt-2"><p class="text-muted small mb-1">الشعار الحالي:</p><img src="${esc(logoURL())}" alt="شعار التطبيق" class="img-thumbnail" style="max-height: 80px; max-width: 200px;" id="logo-preview"></div></div>
  <hr><h6 class="fw-bold mb-1"><i class="bi bi-qr-code me-1"></i>مقاس ملصق الأصل</h6><p class="form-text mt-0">بالسنتيمتر. تُرتَّب الملصقات على صفحة A4 بقدر ما تتسع، أو اختر «ملصق واحد في كل صفحة» لطابعة الملصقات.</p>
  <div class="row g-2 align-items-end"><div class="col-6 col-md-3"><label class="form-label small" for="lbl_w">العرض (سم)</label><input type="number" id="lbl_w" class="form-control" min="3" max="20" step="0.1" value="${esc(labelSize().w)}"></div><div class="col-6 col-md-3"><label class="form-label small" for="lbl_h">الارتفاع (سم)</label><input type="number" id="lbl_h" class="form-control" min="2" max="20" step="0.1" value="${esc(labelSize().h)}"></div>
   <div class="col-12 col-md-6"><div class="form-check"><input class="form-check-input" type="checkbox" id="lbl_one" ${labelSize().one?'checked':''}><label class="form-check-label" for="lbl_one">ملصق واحد في كل صفحة (طابعة ملصقات)</label></div></div></div>
  <div class="mt-2 d-flex align-items-center gap-2"><span class="small text-muted">معاينة بالمقاس الحقيقي:</span><div id="lbl_prev" class="border border-secondary rounded" style="border-style:dashed!important"></div></div>
  </div><div class="card-footer"><button type="submit" class="btn btn-primary">حفظ</button></div></form></div></div></div>`);
  const pv=()=>{const w=+$('#lbl_w').value||0,h=+$('#lbl_h').value||0;$('#lbl_prev').style.width=w+'cm';$('#lbl_prev').style.height=h+'cm'};$('#lbl_w').oninput=pv;$('#lbl_h').oninput=pv;pv();
  let logo=null;$('#application_logo').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{logo=await blobToData(await resizeImage(f,600,.9));$('#logo-preview').src=logo}catch(er){alert(er.message)}};
  $('#f').onsubmit=async e=>{e.preventDefault();const n=$('#application_name').value.trim();if(!n)return;S.settings.app_name=n;S.settings.admin_email=$('#admin_email').value.trim();if(logo)S.settings.logo=logo;
    const lw=+$('#lbl_w').value,lh=+$('#lbl_h').value;if(!(lw>=3&&lw<=20&&lh>=2&&lh<=20)){alert('مقاس الملصق: العرض من 3 إلى 20 سم، والارتفاع من 2 إلى 20 سم.');return}S.settings.label={w:Math.round(lw*10)/10,h:Math.round(lh*10)/10,one:$('#lbl_one').checked};await saveNow('settings');if(Cloud.on){await Cloud.sync();if(Cloud.err){setAFlash('لم يُحفظ في قاعدة البيانات: '+Cloud.err.message,'danger');return vSettings()}}setAFlash('تم حفظ الإعدادات.');vSettings()};
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
  <div class="card mb-4"><div class="card-header"><h3 class="card-title">البيانات على هذا الجهاز</h3></div><div class="card-body"><p class="text-muted mb-3">${S.collections.length} سجل جرد · ${nPhotos} صورة · ${S.schools.length} مدرسة · ${S.employees.length} موظف${est?' · '+est:''}</p>
   <div class="d-flex flex-wrap gap-2"><button class="btn btn-primary" id="bk"><i class="bi bi-download me-1"></i>نسخة احتياطية كاملة (مع الصور)</button><button class="btn btn-outline-primary" id="bk2">نسخة بدون صور</button></div>
   <hr><div class="d-flex flex-wrap gap-2"><button class="btn btn-success" id="mg"><i class="bi bi-intersect me-1"></i>دمج ملفات مشرفي الميدان</button>${cl?'':'<button class="btn btn-outline-secondary" id="rs"><i class="bi bi-arrow-counterclockwise me-1"></i>استعادة نسخة كاملة</button>'}</div>
   <p class="form-text mt-2">عدة أجهزة: يضغط كل مشرف ميدان «إرسال بياناتي» في صفحته ويرسل الملف، ثم تدمج الملفات هنا. الدمج يضيف السجلات الجديدة ويحتفظ بأحدث نسخة من كل سجل ولا يحذف شيئاً.</p></div></div>
  <div class="card mb-4"><div class="card-header"><h3 class="card-title">التصدير</h3></div><div class="card-body d-flex flex-wrap gap-2"><button class="btn btn-success" id="xa"><i class="bi bi-file-earmark-excel me-1"></i>كل سجلات الجرد (Excel)</button><button class="btn btn-outline-success" id="za"><i class="bi bi-images me-1"></i>كل الصور (ZIP)</button></div></div></div>
  <div class="col-lg-6"><div class="card mb-4"><div class="card-header"><h3 class="card-title">الاستيراد من Excel</h3></div><div class="card-body"><p class="text-muted small">المدارس: الأعمدة <code>school_identifier</code> (أو <code>Identifier</code> / <code>معرّف المبنى</code>)، <code>Name (Arabic)</code> / <code>اسم المدرسة</code>، <code>MOE Number</code> / <code>الرقم الوزاري</code>، <code>City</code> / <code>المحافظة</code>، <code>District</code>، <code>Site</code>، <code>Description</code> — المطابقة بالمعرّف، والخلايا الفارغة لا تمسح قيمة موجودة. الموظفون: <code>Employee Number</code> / <code>الرقم الوظيفي</code>، <code>Name</code> / <code>الاسم</code>.</p>
   <div class="d-flex flex-wrap gap-2"><button class="btn btn-outline-primary" id="is"><i class="bi bi-building me-1"></i>استيراد المدارس</button><button class="btn btn-outline-primary" id="ie"><i class="bi bi-people me-1"></i>استيراد الموظفين</button><button class="btn btn-outline-primary" id="ic"><i class="bi bi-box-seam me-1"></i>استيراد أعمال الجرد</button></div></div></div>
  ${cl?'':`<div class="card mb-4"><div class="card-header"><h3 class="card-title">حساب المدير</h3></div><form id="fa"><div class="card-body"><div class="mb-3"><label class="form-label">البريد الإلكتروني</label><input type="email" class="form-control" id="a_em" value="${esc(adm.email||'')}" required></div><div class="mb-3"><label class="form-label">كلمة المرور الحالية</label><input type="password" class="form-control" id="a_p0" required></div><div class="mb-3"><label class="form-label">كلمة المرور الجديدة</label><input type="password" class="form-control" id="a_p1" minlength="6" required></div></div><div class="card-footer"><button class="btn btn-primary">تحديث الحساب</button></div></form></div>
  <div class="card border-danger"><div class="card-header"><h3 class="card-title text-danger">منطقة الخطر</h3></div><div class="card-body"><button class="btn btn-outline-danger" id="wipe">حذف كل البيانات والبدء من القوائم الأصلية</button></div></div>`}</div></div>
  <p class="text-muted small">الإصدار ${NV.version} · ${NV.date}</p>`);
  $('#bk').onclick=()=>exportPackage({kind:'full'});$('#bk2').onclick=()=>exportPackage({kind:'full',photos:false});
  $('#xa').onclick=()=>exportCollections(S.collections,'collections-'+stampDash()+'.xlsx');$('#za').onclick=()=>exportPhotosZip(S.collections);
  $('#mg').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.json';i.multiple=true;i.onchange=async()=>{const out=[];for(const f of i.files){try{const r=await mergePackage(await readPackage(f));out.push(`${f.name}: ${r.coll} جديد، ${r.upd} محدَّث، ${r.photos} صورة، ${r.sch} مدرسة مكتملة${r.emp?`، ${r.emp} موظف جديد`:''}`)}catch(e){out.push(`${f.name}: ${e.message}`)}}setAFlash(out.join(' | '),'info');vData()};i.click()};
  if($('#cf_go2'))$('#cf_go2').onclick=()=>{try{Cloud.setCfg({url:$('#cf_url2').value,key:$('#cf_key2').value});location.hash='#admin';location.reload()}catch(e){alert(e.message)}};
  if($('#cCopy'))$('#cCopy').onclick=()=>{const i=$('#cLink');i.select();try{navigator.clipboard.writeText(i.value)}catch(e){document.execCommand('copy')}toast('تم نسخ الرابط')};
  if($('#cOff'))$('#cOff').onclick=async()=>{if(!confirm('فصل هذا الجهاز؟ التعديلات غير المرسلة تبقى عليه حتى تربطه مرة أخرى.'))return;await Cloud.signOut();localStorage.removeItem(NV_CFG_KEY);location.hash='#admin';location.reload()};
  if(cl){$('#cSync').onclick=async()=>{await Cloud.sync();vData()};$('#cPull').onclick=async()=>{await Cloud.sync();await Cloud.pull();setAFlash('تمت إعادة التحميل من قاعدة البيانات.');vData()};
    if($('#cInit'))$('#cInit').onclick=()=>initCloudLists();
    if($('#cLocal'))$('#cLocal').onclick=async()=>{try{const pkg=await readOfflineDb();if(!pkg){alert('لا توجد بيانات Solvix محفوظة على هذا الجهاز.');return}
      const n=(pkg.data.collections||[]).length;if(!confirm(`رفع ${n} سجل (مع صورها) من نسخة هذا الجهاز إلى قاعدة البيانات؟ المدارس والموظفون والقوائم المطابقة تُستخدم كما هي.`))return;
      const r=await mergePackage(pkg);await Cloud.sync();setAFlash(`تم الرفع: ${r.coll} سجل جديد، ${r.upd} محدَّث، ${r.photos} صورة.`,'info');vData()}catch(e){alert(e.message)}}}
  if($('#rs'))$('#rs').onclick=async()=>{const f=await pickFile('.json');if(!f)return;let pkg;try{pkg=await readPackage(f)}catch(e){return alert(e.message)}if(!confirm('الاستعادة تستبدل كل البيانات على هذا الجهاز بمحتوى الملف. متابعة؟'))return;try{await restorePackage(pkg);setAFlash('تمت استعادة النسخة.');vData()}catch(e){alert(e.message)}};
  $('#is').onclick=async()=>{const f=await pickFile('.xlsx,.xls,.csv');if(!f)return;let rows;try{rows=await readXlsx(f)}catch(e){return alert(e.message)}
    const pick=(r,names)=>{for(const n of names)if(n in r&&String(r[n]).trim()!=='')return String(r[n]).trim();return null};let add=0,upd=0,skip=0;
    for(const r of rows){const ident=pick(r,['school_identifier','Identifier','معرّف المبنى']);if(!ident){skip++;continue}const v={name:pick(r,['Name (Arabic)','Arabic Name','name_ar','اسم المدرسة']),moe:pick(r,['MOE Number','MoE No','moe_no','الرقم الوزاري']),city:pick(r,['City','city_ar','المحافظة']),district:pick(r,['District','District Arabic','district_ar']),site:pick(r,['Site','site']),description:pick(r,['Description','description'])};
      let s=S.schools.find(x=>x.ident===ident);if(s){for(const [k,val] of Object.entries(v))if(val!=null)s[k]=val;upd++}else{if(!v.name){skip++;continue}s={id:nextId('schools','s'),ident,moe:'',site:'',name:'',district:'',city:'',description:'',status:'active',completed_at:null,completed_by:null,created_at:now()};for(const [k,val] of Object.entries(v))if(val!=null)s[k]=val;S.schools.push(s);add++}}
    reindex();save('schools');setAFlash(`استيراد المدارس: ${add} جديدة، ${upd} محدَّثة، ${skip} صف متجاهَل.`);vData()};
  $('#ic').onclick=()=>importCollections();
  $('#ie').onclick=async()=>{const f=await pickFile('.xlsx,.xls,.csv');if(!f)return;let rows;try{rows=await readXlsx(f)}catch(e){return alert(e.message)}let add=0,upd=0;
    for(const r of rows){const n=String(r['Employee Number']??r['employee_number']??r['الرقم الوظيفي']??'').trim(),nm=String(r['Name']??r['name']??r['الاسم']??'').trim();if(!n||!nm)continue;const e=S.employees.find(x=>String(x.number)===n);if(e){e.name=nm;upd++}else{S.employees.push({id:nextId('employees','e'),number:n,name:nm,created_at:now()});add++}}
    reindex();save('employees');setAFlash(`استيراد الموظفين: ${add} جديد، ${upd} محدَّث.`);vData()};
  if($('#fa'))$('#fa').onsubmit=async e=>{e.preventDefault();const a=S.settings.admin_login;const p0=$('#a_p0').value;if(a.hash!==await hashPin(a.email+'|'+p0))return alert('كلمة المرور الحالية غير صحيحة.');const em=$('#a_em').value.trim().toLowerCase(),p1=$('#a_p1').value;if(p1.length<6)return alert('كلمة المرور الجديدة 6 أحرف على الأقل.');S.settings.admin_login={email:em,hash:await hashPin(em+'|'+p1)};await saveNow('settings');setAFlash('تم تحديث حساب المدير.');vData()};
  if($('#wipe'))$('#wipe').onclick=async()=>{if(!confirm('حذف كل سجلات الجرد والصور والتعديلات على هذا الجهاز وإعادة القوائم الأصلية؟ خذ نسخة احتياطية أولاً.'))return;const adm2=S.settings.admin_login;await IDB.clear('photos');urlCache.clear();seedData();S.settings.admin_login=adm2;reindex();await saveAll();clearSess();setAFlash('تمت إعادة ضبط كل البيانات.');vData()};
}

/* ---------- extra: change log (the original e-mails the admin on edits) ---------- */
function logTable(list){return `<table class="table table-striped mb-0"><thead><tr><th>التاريخ</th><th>بواسطة</th><th>المدرسة</th><th>التعديلات</th><th></th></tr></thead><tbody>${list.map(l=>`<tr><td class="small text-nowrap">${ymdhms(l.at)}</td><td>${l.by==='admin'?'<span class="badge text-bg-primary">المدير</span>':esc(empName(String(l.by).replace('emp:','')))}</td><td>${esc((get('schools',l.school)||{}).name||'')}</td>
  <td class="small">${Object.entries(l.changes).map(([k,v])=>`<div><strong>${esc(FIELD_LBL[k]||k)}:</strong> <span class="text-muted text-decoration-line-through">${esc(fieldText(k,v.old))}</span> → ${esc(fieldText(k,v.new))}</div>`).join('')}</td>
  <td>${S.collections.some(c=>c.id===l.coll)?iconBtn('#admin/collections/'+encodeURIComponent(l.coll),'bi-eye text-primary'):'<span class="text-muted small">محذوف</span>'}</td></tr>`).join('')}</tbody></table>`}
function vLog(){const pg=paginate(S.log,50);
  adminShell('log','سجل التعديلات',`<div class="card shadow-sm border-0 mb-4"><div class="card-header bg-white py-3"><h3 class="card-title fw-bold mb-0 text-dark"><i class="bi bi-journal-text me-2 text-primary"></i>سجل التعديلات</h3></div><div class="card-body p-0 table-responsive">${pg.items.length?logTable(pg.items):'<p class="text-center py-5 text-muted mb-0">لا توجد تعديلات مسجلة.</p>'}</div>${pg.footer}</div>`)}
</script>
<script id="nv-admin-cloud">
/* fill an empty cloud with the built-in lists (seeders), then send them */
async function initCloudLists(){if(S.schools.length&&!confirm('قاعدة البيانات فيها مدارس بالفعل. إضافة القوائم الجاهزة رغم ذلك؟ (السجلات الموجودة تبقى)'))return;
  const T=seedLists({});for(const t of ['categories','conditions','rooms','types','employees','schools']){const have=new Set(S[t].map(x=>x.id));for(const r of T[t])if(!have.has(r.id))S[t].push(r)}
  reindex();for(const t of ['categories','conditions','rooms','types','employees','schools'])save(t);toast('جارٍ إرسال القوائم إلى قاعدة البيانات…',4000);await Cloud.sync();
  setAFlash(Cloud.err?('لم يُرسل كل شيء: '+Cloud.err.message):'القوائم الجاهزة الآن في قاعدة البيانات.',Cloud.err?'danger':'success');route()}
/* the offline copy (novaro_v2) kept by NV1/NV2 or by «?local» on this device, as a merge package */
function readOfflineDb(){return new Promise((res,rej)=>{const r=indexedDB.open('novaro_v2',1);r.onupgradeneeded=()=>{r.transaction.abort()};r.onerror=()=>res(null);
  r.onsuccess=async()=>{const db=r.result;if(!db.objectStoreNames.contains('kv')){db.close();return res(null)}
    const get=(st,k)=>new Promise(ok=>{const q=db.transaction(st).objectStore(st).get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>ok(null)});
    const data={};for(const t of ['schools','employees','categories','types','conditions','rooms','collections','log'])data[t]=await get('kv',t)||[];
    if(!data.collections.length){db.close();return res(null)}
    const photos={};for(const c of data.collections)for(const k of [c.school_image,c.asset_image]){if(k&&!photos[k]){const b=await get('photos',k);if(b)photos[k]=await blobToData(b)}}
    db.close();res({app:'novaro',v:1,kind:'full',data,photos})}})}
</script>
<script id="nv-admin-users">
/* NV5 — Users: who may open the admin pages (table nv_staff in the Solvix project) */
function vUsers(){go('#admin/employees')}
/* NV10 — «إضافة مستخدم»: one form for the four roles */
function addUserCard(){const staff=Cloud.on&&canUsers();
  const roles=[['field',ROLE_L.field],...(staff?[['coordinator',ROLE_L.coordinator],['manager',ROLE_L.manager],...(isOwnerRole()?[['owner',ROLE_L.owner]]:[])]:[])];
  return `<div class="card shadow-sm border-0 mb-4 ${qp().get('add')?'':'d-none'}" id="addUser"><div class="card-header bg-white py-3 d-flex justify-content-between align-items-center"><h3 class="card-title fw-bold mb-0"><i class="bi bi-person-plus me-2 text-primary"></i>إضافة مستخدم</h3><button type="button" class="btn-close" data-adduser aria-label="إغلاق"></button></div>
  <form id="fu" class="card-body"><div class="row g-3">
   <div class="col-md-3"><label class="form-label fw-bold small">الدور</label><select class="form-select" id="u_role">${roles.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>
   <div class="col-md-3"><label class="form-label fw-bold small">الاسم</label><input class="form-control" id="u_name" required></div>
   <div class="col-md-3" data-for="field"><label class="form-label fw-bold small">الرقم الوظيفي</label><input class="form-control" id="u_num" dir="ltr"></div>
   <div class="col-md-3 d-none" data-for="staff"><label class="form-label fw-bold small">البريد الإلكتروني</label><input type="email" class="form-control" id="u_email" dir="ltr"></div>
   ${Cloud.on?'<div class="col-md-3"><label class="form-label fw-bold small">كلمة المرور</label><input class="form-control" id="u_pw" minlength="8" dir="ltr"></div>':''}
  </div><p class="form-text mt-2 mb-3" id="u_hint"></p><button class="btn btn-primary"><i class="bi bi-check-lg me-1"></i>إضافة</button></form></div>`}
function bindAddUser(){const card=$('#addUser');if(!card)return;
  $$('[data-adduser]').forEach(b=>b.onclick=()=>{card.classList.toggle('d-none');if(!card.classList.contains('d-none'))$('#u_name').focus()});
  if($('#u_pw'))$('#u_pw').value=genPw();
  const HINT={field:'مشرف الميدان يدخل تطبيق الجرد على الجوال برقمه الوظيفي وكلمة المرور، ويرى أعماله فقط.',coordinator:'منسق المشروع يدخل لوحة الإدارة بالبريد: يعدّل المدارس والجرد والقوائم وينقل الأعمال، ولا يدير المستخدمين ولا الإعدادات العامة.',manager:'مدير المشروع: كل الصلاحيات، ومنها إدارة المستخدمين، عدا تعديل حسابات المالكين.',owner:'مالك المشروع: كل الصلاحيات.'};
  const sync=()=>{const v=$('#u_role').value,f=v==='field';$$('[data-for="field"]').forEach(x=>x.classList.toggle('d-none',!f));$$('[data-for="staff"]').forEach(x=>x.classList.toggle('d-none',f));$('#u_num').required=f;$('#u_email').required=!f;$('#u_hint').textContent=HINT[v]+(Cloud.on?'':' (هذا الجهاز غير متصل بقاعدة البيانات: يُضاف مشرف الميدان بدون حساب دخول.)')};
  $('#u_role').onchange=sync;sync();
  $('#fu').onsubmit=async e=>{e.preventDefault();const role=$('#u_role').value,name=$('#u_name').value.trim(),pw=$('#u_pw')?$('#u_pw').value:'';const btn=e.submitter||$('#fu button');
    if(!name)return;if(Cloud.on&&pw.length<8)return alert('كلمة المرور 8 أحرف على الأقل.');btn.disabled=true;
    try{if(role==='field'){const num=$('#u_num').value.trim();if(!num)return;if(S.employees.some(x=>String(x.number)===num))throw new Error('هذا الرقم الوظيفي مستخدم لموظف آخر.');
        const emp={id:nextId('employees','e'),number:num,name,created_at:now()};S.employees.push(emp);reindex();save('employees');
        if(Cloud.on){await Cloud.sync();if(Cloud.err)throw new Error('لم يُحفظ في قاعدة البيانات: '+Cloud.err.message);const c=await Cloud.sb();Cloud.chk(await c.rpc('nv_emp_set_login',{p_emp:emp.id,p_password:pw}));
          setAFlash(`تمت إضافة مشرف الميدان ${name}. الدخول: الرقم الوظيفي ${num} / كلمة المرور ${pw}`)}else setAFlash(`تمت إضافة مشرف الميدان ${name}.`)}
      else{const em=$('#u_email').value.trim().toLowerCase();if(!em)return;const c=await Cloud.sb();Cloud.chk(await c.rpc('nv_staff_create',{p_email:em,p_password:pw,p_name:name,p_role:role}));
        setAFlash(`تمت إضافة ${ROLE_L[role]} ${name}. الدخول: ${em} / ${pw}`)}
      location.hash='#admin/employees';vEmployees()}catch(er){alert(er.message)}finally{if(document.body.contains(btn))btn.disabled=false}}}
/* NV10 — accounts that sign in by e-mail (owner / manager / coordinator), shown above the field supervisors */
async function loadStaff(){const box=$('#staffBox');if(!box)return;let list=[],err='';try{const c=await Cloud.sb();list=Cloud.chk(await c.from('nv_staff').select('*').order('created_at'))||[]}catch(e){err=e.message}
  if(!$('#staffBox'))return;const me=Cloud.user&&Cloud.user.id;const own=isOwnerRole();const R=r=>r==='admin'?'owner':r;
  box.innerHTML=`${err?`<div class="alert alert-danger">${esc(err)}</div>`:''}<div class="card shadow-sm border-0 mb-4"><div class="card-header bg-white py-3"><h3 class="card-title fw-bold mb-0 text-dark"><i class="bi bi-person-lock me-2 text-primary"></i>حسابات الإدارة <span class="badge text-bg-light border fw-normal">${list.length}</span></h3><small class="text-muted d-block">يدخلون لوحة الإدارة بالبريد الإلكتروني</small></div>
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3">الاسم</th><th>البريد</th><th>الدور</th><th>نشط</th><th class="text-end pe-3">إجراءات</th></tr></thead><tbody>
  ${list.map(u=>{const lock=u.user_id===me||(!own&&R(u.role)==='owner');const opts=[['owner',ROLE_L.owner],['manager',ROLE_L.manager],['coordinator',ROLE_L.coordinator],...(u.role==='reader'?[['reader',ROLE_L.reader]]:[])].filter(([v])=>own||v!=='owner'||R(u.role)==='owner');
   return `<tr><td class="ps-3 fw-medium">${esc(u.name)}${u.user_id===me?' <span class="badge text-bg-light border">أنت</span>':''}</td><td class="small" dir="ltr">${esc(u.email)}</td>
   <td><select class="form-select form-select-sm" data-role="${esc(u.user_id)}" ${lock?'disabled':''} style="width:auto">${opts.map(([v,l])=>`<option value="${v}" ${R(u.role)===v?'selected':''}>${l}</option>`).join('')}</select></td>
   <td><div class="form-check form-switch"><input class="form-check-input" type="checkbox" data-act="${esc(u.user_id)}" ${u.active?'checked':''} ${lock?'disabled':''}></div></td>
   <td class="text-end pe-3">${lock&&u.user_id!==me?'':`<button type="button" class="btn btn-icon btn-sm btn-light border shadow-sm rounded-circle" data-pw="${esc(u.user_id)}" title="كلمة مرور جديدة"><i class="bi bi-key text-primary"></i></button>`}</td></tr>`}).join('')||'<tr><td colspan="5" class="text-center py-4 text-muted">لا توجد حسابات.</td></tr>'}
  </tbody></table></div></div></div>`;
  const rpc=async(fn,args,msg)=>{try{const c=await Cloud.sb();Cloud.chk(await c.rpc(fn,args));if(msg)setAFlash(msg)}catch(e){setAFlash(e.message,'danger')}vEmployees()};
  $$('[data-role]',box).forEach(x=>x.onchange=()=>{const u=list.find(y=>y.user_id===x.dataset.role);rpc('nv_staff_set',{p_user:u.user_id,p_role:x.value,p_active:u.active},`تم تغيير دور ${u.name} إلى ${ROLE_L[x.value]}.`)});
  $$('[data-act]',box).forEach(x=>x.onchange=()=>{const u=list.find(y=>y.user_id===x.dataset.act);rpc('nv_staff_set',{p_user:u.user_id,p_role:R(u.role),p_active:x.checked},x.checked?'تم تفعيل المستخدم.':'تم إيقاف المستخدم.')});
  $$('[data-pw]',box).forEach(b=>b.onclick=()=>{const u=list.find(y=>y.user_id===b.dataset.pw);const pw=prompt(`كلمة مرور جديدة لـ ${u.email} (8 أحرف على الأقل):`,genPw());if(!pw)return;rpc('nv_staff_set_password',{p_user:u.user_id,p_password:pw},`تم تغيير كلمة المرور. أعطها لـ ${u.email}: ${pw}`)});
}
</script>
<script id="nv-nv12">
/* NV12 — asset labels (number + QR), school report (Arabic / English), category drill-down, collections import, in-app notifications */
let qrP=null;const labelSize=()=>{const l=S.settings.label||{};return {w:Number(l.w)||6.3,h:Number(l.h)||3.6,one:!!l.one}};
const needQR=()=>qrP||(qrP=window.qrcode?Promise.resolve():loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js').catch(e=>{qrP=null;throw e}));
function qrSvg(text){qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8'];const q=qrcode(0,'M');q.addData(text,'Byte');q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}
function qrText(c){const s=get('schools',c.school_id)||{},r=get('rooms',c.room_name_id)||{};
  return [`Solvix ${assetLabel(c)}`,`المدرسة: ${s.name||''} (${s.moe||''})`,`الفئة: ${(get('categories',c.category_id)||{}).ar||''}`,`النوع: ${(get('types',c.type_id)||{}).ar||''}`,(get('types',c.type_id)||{}).code?`الكود: ${get('types',c.type_id).code}${get('types',c.type_id).critical?' (حرج)':''}`:'',`الحالة: ${(get('conditions',c.condition_id)||{}).ar||''}`,
    `الكمية: ${num(c.quantity)}`,c.price!=null&&c.price!==''?`السعر: ${c.price}`:'',`الموقع: ${c.floor||''} / ${r.ar||''} ${c.room_number||''}`,c.serial?`التسلسلي: ${c.serial}`:'',c.tag?`ASAD: ${c.tag}`:''].filter(Boolean).join('\n')}
async function printLabels(list,title){list=list.filter(c=>c.no).sort((a,b)=>num(a.no)-num(b.no));if(!list.length)return alert('لا توجد أصول مُرسلة لطباعة ملصقاتها.');
  const w=window.open('','_blank');if(!w)return alert('اسمح للموقع بفتح النوافذ المنبثقة لطباعة الملصقات.');w.document.write('<p style="font-family:Tahoma;padding:20px">…</p>');
  try{await needQR()}catch(e){w.close();return alert(e.message)}
  const L=list.map(c=>{const s=get('schools',c.school_id)||{},r=get('rooms',c.room_name_id)||{};
    return `<div class="l"><div class="q">${qrSvg(qrText(c))}</div><div class="t"><img src="${NV_LOGO}" alt=""><b>${esc(assetLabel(c))}</b><span>${esc((get('types',c.type_id)||{}).ar||'')}</span><small>${esc(s.name||'')}</small><small>${esc([c.floor,r.ar,c.room_number].filter(Boolean).join(' · '))}</small></div></div>`}).join('');
  /* NV13 — label size from «الإعدادات» (cm); the QR and the text scale with it */
  const Z=labelSize(),W=Z.w*10,H=Z.h*10,qr=Math.max(10,Math.min(H-4,W*.48)),fs=Math.max(5,Math.min(11,H/4.2));
  w.document.open();w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملصقات الأصول ${esc(title||'')}</title><style>
  @page{size:${Z.one?`${W}mm ${H}mm`:'A4'};margin:${Z.one?0:'8mm'}}body{margin:0;font-family:Cairo,Tahoma,sans-serif;color:#0f172a}
  .g{display:flex;flex-wrap:wrap;gap:${Z.one?0:'3mm'};align-content:flex-start}.l{box-sizing:border-box;width:${W}mm;height:${H}mm;display:flex;gap:1.5mm;align-items:center;border:${Z.one?'0':'1px dashed #94a3b8'};border-radius:1.5mm;padding:1.5mm;overflow:hidden;break-inside:avoid;${Z.one?'break-after:page;':''}}
  .q{width:${qr}mm;height:${qr}mm;flex:none}.q svg{width:100%;height:100%}.t{display:flex;flex-direction:column;gap:.4mm;min-width:0;font-size:${fs*.8}pt;line-height:1.2}
  .t img{height:${Math.max(2.5,H/7)}mm;width:auto;align-self:flex-start}.t b{font:700 ${fs}pt monospace;direction:ltr;text-align:right}.t span{font-weight:700}.t small{color:#475569;font-size:${fs*.7}pt;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bar{padding:10px;text-align:center;font-family:Tahoma}@media print{.bar{display:none}}</style></head><body><div class="bar">${list.length} ملصق · ${Z.w} × ${Z.h} سم · <button onclick="print()">طباعة</button></div><div class="g">${L}</div><script>setTimeout(()=>print(),400)<\/script></body></html>`);w.document.close()}
/* school report: one sheet in Arabic, one in English */
function schoolReport(list,s){const sub=list.filter(c=>c.type_id);if(!sub.length)return alert('لا توجد أصول في هذه المدرسة.');
  const row=(c,l)=>{const e=get('employees',c.employee_id)||{},cat=get('categories',c.category_id)||{},ty=get('types',c.type_id)||{},co=get('conditions',c.condition_id)||{},r=get('rooms',c.room_name_id)||{};const n=x=>l==='ar'?(x.ar||x.en||''):(x.en||x.ar||'');
    return [assetLabel(c),ty.code||'',n(cat),ty.l2||'',ty.l3||'',n(ty),ty.critical?(l==='ar'?'حرج':'Critical'):(l==='ar'?'غير حرج':'Non-critical'),n(co),num(c.quantity),c.price??'',c.price!=null&&c.price!==''?num(c.quantity)*Number(c.price):'',c.status==='Works'?(l==='ar'?'يعمل':'Works'):c.status?(l==='ar'?'لا يعمل':'Does not work'):'',c.parent_child||'',c.brand||'',c.model||'',c.serial||'',c.tag||'',c.floor||'',n(r),c.room_number||'',e.name||'',ymdhms(c.submitted_at)]};
  const AR=['رقم الملصق','كود الأصل','المستوى الأول','المستوى الثاني','المستوى الثالث','وصف الأصل','التصنيف','الحالة الفنية','الكمية','سعر الوحدة','الإجمالي','التشغيل','رئيسي / فرعي','الماركة','الموديل','الرقم التسلسلي','رقم ASAD','الدور','اسم الغرفة','رقم الغرفة','مشرف الميدان','تاريخ الإرسال'];
  const EN=['Label Number','Asset Code','Level 1','Level 2','Level 3','Asset','Criticality','Condition','Quantity','Unit Price','Total','Status','Parent/Child','Brand','Model','Serial Number','ASAD Tag','Floor','Room Name','Room Number','Field Supervisor','Submitted At'];
  const head=l=>[[l==='ar'?'المدرسة':'School',s.name],[l==='ar'?'الرقم الوزاري':'MOE Number',s.moe],[l==='ar'?'المعرّف':'Identifier',s.ident],[l==='ar'?'المحافظة':'City',s.city],[]];
  writeXlsx([['عربي',[...head('ar'),AR,...sub.map(c=>row(c,'ar'))]],['English',[...head('en'),EN,...sub.map(c=>row(c,'en'))]]],`${s.moe||s.ident}_${s.name}_report.xlsx`)}
/* category drill-down: category → condition → type → schools, with quantity and total cost */
function vAnalytics(){const p=qp();const cat=p.get('cat'),cond=p.get('cond'),type=p.get('type');
  let list=S.collections.filter(c=>c.submitted_at&&c.type_id);if(cat)list=list.filter(c=>c.category_id===cat);if(cond)list=list.filter(c=>(c.condition_id||'none')===cond);if(type)list=list.filter(c=>c.type_id===type);
  const cost=c=>c.price!=null&&c.price!==''?num(c.quantity)*Number(c.price):0;
  const group=key=>{const m=new Map();for(const c of list){const k=key(c)||'none';const x=m.get(k)||{k,rec:0,qty:0,cost:0,schools:new Set()};x.rec++;x.qty+=num(c.quantity);x.cost+=cost(c);x.schools.add(c.school_id);m.set(k,x)}return [...m.values()].sort((a,b)=>b.qty-a.qty)};
  const nm=(t,id)=>{if(id==='none')return 'غير محدد';const x=get(t,id)||{};return x.ar||x.name||id};const money=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const lvl=!cat?['cat','categories','الفئة']:!cond?['cond','conditions','الحالة الفنية']:!type?['type','types','نوع الأصل']:['school','schools','المدرسة'];
  const rows=group(c=>lvl[0]==='cat'?c.category_id:lvl[0]==='cond'?c.condition_id:lvl[0]==='type'?c.type_id:c.school_id);
  const tot=rows.reduce((a,x)=>({qty:a.qty+x.qty,cost:a.cost+x.cost,rec:a.rec+x.rec}),{qty:0,cost:0,rec:0});
  const crumbs=[['#admin/analytics','كل الفئات'],...(cat?[[`#admin/analytics?cat=${encodeURIComponent(cat)}`,nm('categories',cat)]]:[]),...(cond?[[`#admin/analytics?cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(cond)}`,nm('conditions',cond)]]:[]),...(type?[['',nm('types',type)]]:[])];
  const link=x=>lvl[0]==='school'?`#admin/collections?school_id=${encodeURIComponent(x.k)}`:withQuery({[lvl[0]]:x.k});
  adminShell('analytics','تحليل الأصول',`<nav aria-label="breadcrumb"><ol class="breadcrumb mb-3">${crumbs.map(([h,l],i)=>i===crumbs.length-1?`<li class="breadcrumb-item active">${esc(l)}</li>`:`<li class="breadcrumb-item"><a href="${h}">${esc(l)}</a></li>`).join('')}</ol></nav>
  <div class="row g-3 mb-3">${[['bi-box-seam','إجمالي الكمية',nf(tot.qty)],['bi-cash-coin','إجمالي التكلفة',money(tot.cost)],['bi-list-ol','عدد السجلات',nf(tot.rec)]].map(([i,l,v])=>`<div class="col-md-4"><div class="card border-0 shadow-sm"><div class="card-body d-flex align-items-center gap-3"><i class="bi ${i} fs-3 text-primary"></i><div><div class="small text-muted">${l}</div><div class="fs-4 fw-bold">${v}</div></div></div></div></div>`).join('')}</div>
  <div class="card shadow-sm border-0"><div class="card-header bg-white py-3"><h3 class="card-title fw-bold mb-0"><i class="bi bi-diagram-3 me-2 text-primary"></i>حسب ${lvl[2]}</h3><small class="text-muted d-block">${lvl[0]==='school'?'اضغط المدرسة لفتح أعمالها':'اضغط أي صف للتعمق'}</small></div>
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="bg-light"><tr><th class="ps-3">${lvl[2]}</th><th class="text-center">الكمية</th><th class="text-center">السجلات</th><th class="text-center">المدارس</th><th class="text-end pe-3">إجمالي التكلفة</th><th style="width:30%"></th></tr></thead><tbody>
  ${rows.map(x=>`<tr class="cursor-pointer" onclick="location.hash='${link(x)}'"><td class="ps-3 fw-bold"><a href="${link(x)}" class="text-decoration-none">${esc(nm(lvl[1],x.k))}</a></td><td class="text-center">${nf(x.qty)}</td><td class="text-center">${x.rec}</td><td class="text-center">${x.schools.size}</td><td class="text-end pe-3 font-monospace">${money(x.cost)}</td>
   <td><div class="progress" style="height:8px"><div class="progress-bar" style="width:${tot.qty?Math.round(x.qty/tot.qty*100):0}%"></div></div></td></tr>`).join('')||'<tr><td colspan="6" class="text-center py-5 text-muted">لا توجد أصول مُرسلة بعد.</td></tr>'}
  </tbody></table></div></div></div>`)}
/* collections import (same columns as the export; every row is checked first, nothing is added if one row fails) */
async function importCollections(){const f=await pickFile('.xlsx,.xls,.csv');if(!f)return;let rows;try{rows=await readXlsx(f)}catch(e){return alert(e.message)}
  const pick=(r,names)=>{for(const n of names)if(n in r&&String(r[n]).trim()!=='')return String(r[n]).trim();return ''};
  const byName=(t,v)=>{if(!v)return null;const n=norm(v);return S[t].find(x=>norm(x.ar)===n||norm(x.en)===n)||null};
  const errs=[],out=[],seen=new Set();const labels=new Set(S.collections.map(assetLabel));
  rows.forEach((r,i)=>{const line=i+2,E=m=>errs.push(`السطر ${line}: ${m}`);
    const empN=pick(r,['Employee #','الرقم الوظيفي']),e=S.employees.find(x=>String(x.number)===empN);if(!e)return E(`الموظف «${empN}» غير موجود`);
    const sid=pick(r,['School Identifier','معرّف المبنى']),moe=pick(r,['MOE Number','الرقم الوزاري']);const s=S.schools.find(x=>(sid&&x.ident===sid)||(!sid&&moe&&x.moe===moe));if(!s)return E(`المدرسة «${sid||moe}» غير موجودة`);
    const room=byName('rooms',pick(r,['Room Name','اسم الغرفة']));if(!room)return E('اسم الغرفة غير موجود في القائمة');
    const cat=byName('categories',pick(r,['Category','الفئة']));if(!cat)return E('الفئة غير موجودة');
    const tn=norm(pick(r,['Asset Type','نوع الأصل']));const ty=S.types.find(x=>x.cat===cat.id&&(norm(x.ar)===tn||norm(x.en)===tn));if(!ty)return E('نوع الأصل غير موجود في هذه الفئة');
    const cv=pick(r,['Condition','الحالة الفنية']);const co=cv?byName('conditions',cv):null;if(cv&&!co)return E(`الحالة «${cv}» غير موجودة`);
    const q=pick(r,['Quantity','الكمية'])||'1',pr=pick(r,['Price','السعر']);if(!/^\d+$/.test(q))return E('الكمية يجب أن تكون صفراً أو أكثر');if(pr&&!(Number(pr)>=0))return E('السعر يجب أن يكون صفراً أو أكثر');
    const lb=pick(r,['Label Number','رقم الملصق']);if(lb&&(labels.has(lb)||seen.has(lb)))return E(`رقم الملصق ${lb} مكرر`);if(lb)seen.add(lb);
    const st=pick(r,['Status','التشغيل']);const sub=pick(r,['Submitted At','تاريخ الإرسال']);const d=sub&&!isNaN(new Date(sub))?new Date(sub).toISOString():now();
    out.push(Object.assign(newCollection(e.id,s.id,null,{}),{floor:pick(r,['Floor','الدور']),room_number:pick(r,['Room Number','رقم الغرفة']),room_name_id:room.id,category_id:cat.id,type_id:ty.id,condition_id:co?co.id:null,quantity:+q,price:pr===''?null:Number(pr),
      status:/does not|لا يعمل/i.test(st)?'Does not work':st?'Works':null,manufacturer:pick(r,['Manufacturer']),brand:pick(r,['Brand','الماركة']),model:pick(r,['Model','الموديل']),capacity:pick(r,['Capacity']),serial:pick(r,['Serial Number','الرقم التسلسلي']),
      agency:pick(r,['Agency']),warranty:pick(r,['Warranty']),install_date:pick(r,['Installation Date']),asad_country:pick(r,['ASAD Country']),tag:pick(r,['ASAD Tag #','رقم ASAD']),parent_child:pick(r,['Parent/Child','رئيسي / فرعي']),notes:pick(r,['Notes','ملاحظات']),submitted_at:d}))});
  if(!rows.length)return alert('الملف فارغ.');
  if(errs.length){alert(`لم يُستورد أي سجل — ${errs.length} سطر فيه أخطاء:\n\n`+errs.slice(0,25).join('\n')+(errs.length>25?`\n… و${errs.length-25} أخرى`:''));return}
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
function vCatalog(){const ro=Cloud.on&&Cloud.role==='reader';
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
     <td class="text-end pe-3 text-nowrap">${ro?'':iconBtn(`#admin/asset-types/${encodeURIComponent(r.id)}/edit`,'bi-pencil text-warning','تعديل')}</td></tr>`).join('')||`<tr><td colspan="${CAT_COLS.length+2}" class="text-center py-5 text-muted">لا توجد نتائج مطابقة للفلاتر.</td></tr>`;
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
