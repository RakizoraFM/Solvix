<script id="nv-boot">
/* Hash router and start-up */
const LIST_PAGES=/^admin(\/(collections|schools|employees|asset-categories|asset-types|asset-conditions|room-names|log|users|analytics|review))?\/?$/;
function route(){
  if(/[#&]cfg=/.test(location.hash)){/* a connection link opened in a tab that was already open */try{const m=location.hash.match(/[#&]cfg=([^&]+)/);const o=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));if(cfgOk(o))localStorage.setItem(NV_CFG_KEY,JSON.stringify({url:o.url.replace(/\/+$/,''),key:o.key}))}catch(e){}location.replace(location.pathname+location.search+'#login');location.reload();return}
  const path=decodeURIComponent(location.hash.replace(/^#/,'').split('?')[0]);const seg=path.split('/');window.scrollTo(0,0);
  if(Cloud.on&&seg[0]==='forgot'){destroyCharts();const ae=Cloud.authErr;Cloud.authErr=null;return vForgot('',ae?'رابط الاستعادة غير صالح أو انتهت صلاحيته — اطلب رابطاً جديداً.':'')}if(Cloud.on&&seg[0]==='reset-password'){destroyCharts();return vResetPw()}
  if(seg[0]==='a'&&seg[1]){destroyCharts();return openAssetLink(seg[1])}
  if(seg[0]==='admin'){
    if(seg[1]==='login'||!isAuthed())return vAdminLogin();
    needAdminLibs().catch(()=>{});
    if(Cloud.on&&LIST_PAGES.test(path)&&Date.now()-Cloud.lastPull>60000){const h=location.hash;Cloud.lastPull=Date.now();nvBusy(1);Cloud.sync().then(()=>Cloud.pull()).then(()=>{if(location.hash===h)route()}).catch(()=>{}).finally(()=>nvBusy(0))}
    const [ ,a,b,c,d]=seg;
    if(!a)return vDashboard();
    if(a==='collections'){if(!b)return vCollections();if(b==='view')return vCollectionGroup(c,d);if(c==='edit')return vCollectionEdit(b);return vCollectionShow(b)}
    if(a==='schools'){if(!b)return vSchools();if(b==='create')return vSchoolForm(null);return vSchoolForm(b)}
    if(a==='employees'){if(!b)return vEmployees();if(b==='create')return vEmployeeForm(null);return vEmployeeForm(b)}
    if(LK[a]){if(!b)return vLookup(a);if(b==='create')return vLookupForm(a,null);return vLookupForm(a,b)}
    if(a==='analytics')return vAnalytics();if(a==='system')return vSystem();if(a==='subscription')return vSubscription();if(a==='room-templates')return vRoomTpl();if(a==='review')return vReview();if(a==='label')return vLabelSettings();if(a==='settings')return vSettings();if(a==='data')return vData();if(a==='log')return vLog();if(a==='users')return vUsers();
    return vDashboard();
  }
  destroyCharts();setMode('field');
  const a=seg[0];
  if(Cloud.on&&Cloud.role!=='tech'&&sess().emp)clearSess();
  if(!curEmp()&&a&&a!=='login'){clearSess();return go('#login')}
  if(Cloud.on&&a==='school'&&Date.now()-Cloud.lastPull>60000){Cloud.lastPull=Date.now();Cloud.sync().then(()=>Cloud.pull()).catch(()=>{})}
  switch(a){case '':case 'login':return curEmp()?go('#employee-data'):vLogin();case 'employee-data':return vEmployee();case 'school':return vSchool();case 'location':return vLocation();case 'asset':return vAsset();case 'success':return vSuccess();case 'history':return vHistory();case 'job-completed':return vJobDone();default:return go('#login')}
}
window.addEventListener('hashchange',route);
(async()=>{try{
  /* cloud by default (same project as start.html); «?local» or a project without section 20 keeps the offline copy */
  const local=/[?&]local\b/.test(location.search)||!Cloud.cfg();Cloud.noCfg=!Cloud.cfg();
  /* NV17: a password-reset link from Supabase lands here as #access_token=…&type=recovery (or #error=…) */
  const H=location.hash;const recovery=/type=recovery/.test(H);const authErr=/error_description=/.test(H)?decodeURIComponent((H.match(/error_description=([^&]+)/)||[])[1]||'').replace(/\+/g,' '):'';
  if(!local){
    await loadState(true);Cloud.on=true;
    let ok=true;try{const c=await Cloud.sb();const {error}=await c.from('nv_settings').select('id').limit(1);if(error&&/does not exist|schema cache|nv_settings/i.test(error.message))ok=false}catch(e){/* offline: work from the cached copy */}
    if(!ok){Cloud.on=false;Cloud.tablesMissing=true;IDB.db.close();IDB.name='novaro_v2';for(const t of TABLES)S[t]=null;await loadState(false)}
    else{await Cloud.init();await Cloud.loadPublicSettings();
      if(recovery){history.replaceState(null,'',location.pathname+location.search+'#reset-password')}else if(authErr){history.replaceState(null,'',location.pathname+location.search+'#forgot');Cloud.authErr=authErr}
      if(Cloud.role){app().innerHTML='<div class="nv-skel" dir="rtl" aria-busy="true"><i style="height:54px"></i><div class="r"><i style="height:110px"></i><i style="height:110px"></i><i style="height:110px"></i><i style="height:110px"></i></div><i style="height:260px"></i><p>جارٍ تحميل البيانات…</p></div>';
        try{await Promise.race([Cloud.sync().then(()=>Cloud.pull()),new Promise(r=>setTimeout(r,15000))])}catch(e){console.warn(e)}}}
  }else await loadState(false);
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
  route();
  if(Cloud.tablesMissing&&location.hash.startsWith('#admin'))toast('قاعدة بيانات Solvix غير مجهزة بعد — شغّل solvix_setup.sql في SQL Editor. يعمل التطبيق الآن على هذا الجهاز فقط.',8000);
}catch(e){document.body.innerHTML=`<p dir="rtl" style="padding:20px;font-family:Cairo,Tahoma,sans-serif">تعذر فتح قاعدة البيانات المحلية: ${esc(e.message||e)}. جرّب متصفحاً آخر أو اخرج من وضع التصفح الخاص.</p>`}})();
</script>
<script id="nv-update">
/* NV9 — new version notice: compares <meta name="fm-version"> with the copy on the server (on open, every 10 minutes and when the tab comes back) */
(function(){
  const mine=(document.querySelector('meta[name="fm-version"]')||{}).content||'';let shown=false,busy=false;
  async function check(){if(shown||busy||!/^https?:$/.test(location.protocol)||navigator.onLine===false)return;busy=true;
    try{const r=await fetch(location.pathname+'?nvv='+Date.now(),{cache:'no-store'});if(!r.ok)return;
      const m=(await r.text()).match(/<meta name="fm-version" content="([^"]+)"/);if(m&&mine&&m[1]!==mine)show(m[1])}catch(e){}finally{busy=false}}
  function show(v){shown=true;const d=document.createElement('div');d.id='nv-upd';d.dir='rtl';
    d.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:4000;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 24px);background:#0e2c45;color:#fff;padding:10px 16px;border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.3);font:700 14px Cairo,Tahoma,sans-serif';
    d.innerHTML='<span>🔔 يوجد إصدار جديد من Solvix ('+v+')</span><button type="button" data-u style="background:#1ea89c;color:#fff;border:0;border-radius:10px;padding:6px 14px;font:inherit;cursor:pointer">تحديث الآن</button><button type="button" data-x aria-label="لاحقاً" style="background:transparent;color:#cbd5e1;border:0;font:inherit;cursor:pointer">لاحقاً</button>';
    document.body.appendChild(d);
    d.querySelector('[data-x]').onclick=()=>d.remove();
    d.querySelector('[data-u]').onclick=async e=>{e.target.disabled=true;e.target.textContent='جارٍ التحديث…';
      try{if(window.Cloud&&Cloud.on&&Cloud.pendingCount&&Cloud.pendingCount())await Cloud.sync()}catch(er){}
      try{await fetch(location.pathname,{cache:'reload'})}catch(er){}location.reload()}}
  setTimeout(check,4000);setInterval(check,600000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
  window.nvCheckUpdate=check;
})();
</script>
</body>
</html>
