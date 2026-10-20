<style id="nv56-css">
.l56-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px}
.l56-k{border:1px solid var(--bs-border-color,#e2e8f0);border-radius:14px;padding:10px 12px;background:var(--bs-body-bg,#fff);cursor:pointer;text-align:inherit}
.l56-k.on{outline:2px solid #2563eb}.l56-k span{display:block;font-size:12px;color:var(--bs-secondary-color,#64748b);font-weight:700}.l56-k b{font-size:24px}
.l56-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-inline-end:6px;vertical-align:middle}
.l56-active{background:#16a34a}.l56-idle{background:#f59e0b}.l56-stopped{background:#dc2626}.l56-off{background:#94a3b8}
.l56-bar{display:inline-block;width:80px;height:7px;background:var(--bs-secondary-bg,#eef2f7);border-radius:5px;overflow:hidden;vertical-align:middle;margin-inline-start:6px}.l56-bar i{display:block;height:100%;border-radius:5px;background:#2563eb}
.l56-alert{border-radius:12px;padding:8px 12px;margin-bottom:8px;font-size:14px}.l56-alert.r{background:#fef2f2;color:#991b1b}.l56-alert.y{background:#fffbeb;color:#92400e}
.l56-sub{font-size:12px;color:var(--bs-secondary-color,#64748b)}
.o56{border:1px dashed #93c5fd;background:#f8fbff}
.o56 .row56{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.o56 select,.o56 input{flex:1;min-width:180px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:12px;font:inherit}
.o56-prog{height:8px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin-top:8px}.o56-prog i{display:block;height:100%;background:linear-gradient(90deg,#0ea5e9,#2563eb);width:0}
.o56-ok{display:inline-flex;align-items:center;gap:6px;margin-top:10px;background:rgba(34,197,94,.18);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700}
</style>
<script id="nv-nv56">
/* NV56 — (1) live monitoring of the field supervisors: heartbeat nv_presence_ping from the field app, page «المتابعة المباشرة»
   #admin/live (nv_presence_list, migration 051); (2) working without internet: the service worker sw.js keeps the app and its libraries on
   the phone, «تنزيل المبنى» refreshes the data and saves the building's photos on the phone (dl56). */
PAGE_META.live=['bi-broadcast','من يعمل الآن من مشرفي الميدان، وأين، وآخر نشاط له، وما ينتظر الرفع على جهازه'];
const SW56=()=>'serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&(!navigator.webdriver||(()=>{try{return localStorage.getItem('nv56_sw_test')==='1'}catch(e){return false}})());
if(SW56())window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(e=>console.warn('sw',e))});
const appURL56=()=>location.href.split(/[?#]/)[0];

/* ---------- (1) heartbeat from the field app ---------- */
const P56={t:0,last:0,off:false};
function pending56(){let n=0;try{n=(Cloud.on?Cloud.pendingCount():0)+(window.labelQ?labelQ().length:0)+(window.RD?RD.q().length:0)}catch(e){}return n}
async function ping56(force){if(P56.off||!window.Cloud||!Cloud.on||Cloud.role!=='tech'||!curEmp()||navigator.onLine===false||document.hidden)return;
  if(!force&&Date.now()-P56.last<20000)return;P56.last=Date.now();const c=curColl(),s=sess();
  const p={school:s.school||(c&&c.school_id)||'',floor:c&&c.floor||'',room:c?[roomName(c),c.room_number?'('+c.room_number+')':''].filter(Boolean).join(' '):'',page:(location.hash.replace(/^#/,'').split(/[/?]/)[0]||'home').slice(0,40),pending:pending56(),version:NV.version};
  try{const cl=await Cloud.sb();const {error}=await cl.rpc('nv_presence_ping',{p});if(error&&/nv_presence_ping|schema cache|does not exist/i.test(error.message))P56.off=true}catch(e){}}
window.addEventListener('hashchange',()=>{clearTimeout(P56.t);P56.t=setTimeout(()=>ping56(true),3000)});
window.addEventListener('online',()=>setTimeout(()=>ping56(true),4000));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>ping56(true),1500)});
setInterval(()=>ping56(true),120000);setTimeout(()=>ping56(true),8000);

/* ---------- (1) admin page «المتابعة المباشرة» ---------- */
const L56={f:'',auto:true,t:0,data:null,at:0};
const mins56=iso=>iso?Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/6e4)):null;
const rel56=m=>m==null?'—':m<1?'الآن':m<60?`منذ ${m} د`:m<1440?`منذ ${Math.floor(m/60)} س ${m%60?m%60+' د':''}`:`منذ ${Math.floor(m/1440)} يوم`;
const ST56={active:['l56-active','يعمل الآن'],idle:['l56-idle','خامل'],stopped:['l56-stopped','متوقف'],off:['l56-off','لم يبدأ اليوم']};
const day56=iso=>iso?new Date(iso).toLocaleDateString('en-CA',{timeZone:'Asia/Riyadh'}):'';
function state56(r){const today=day56(new Date().toISOString());const seen=r.at&&day56(r.at)===today?mins56(r.at):null;
  if(seen==null)return r.today>0?'stopped':'off';if(seen<=10)return 'active';if(seen<=120)return 'idle';return 'stopped'}
/* without the cloud (or before migration 051): built from the records on this device */
function local56(){const today=day56(new Date().toISOString());return S.employees.filter(e=>!e.archived).map(e=>{const L=S.collections.filter(c=>c.employee_id===e.id);
  const last=L.reduce((m,c)=>{const t=c.updated_at||c.submitted_at||'';return t>m?t:m},'');const lc=L.filter(c=>c.submitted_at).sort((a,b)=>a.submitted_at<b.submitted_at?1:-1)[0];
  return {emp:e.id,name:e.name,number:e.number,at:last||null,school:lc?(get('schools',lc.school_id)||{}).name:'',floor:lc&&lc.floor,room:lc?[roomName(lc),lc.room_number?'('+lc.room_number+')':''].filter(Boolean).join(' '):'',pending:0,version:null,
    today:L.filter(c=>c.type_id&&day56(c.submitted_at)===today).length,last_asset:lc&&lc.submitted_at,local:true}}).filter(r=>r.at)}
async function load56(){if(!Cloud.on)return {items:local56(),local:true};
  try{const c=await Cloud.sb();const d=Cloud.chk(await c.rpc('nv_presence_list'));return {items:d.items||[],local:false}}
  catch(e){if(/nv_presence_list|schema cache|does not exist|Could not find/i.test(e.message))return {items:local56(),local:true,old:true};throw e}}
async function vLive56(){if(Cloud.on&&!can('view'))return go('#admin');const h=location.hash;clearTimeout(L56.t);
  if(!$('#l56Box'))adminShell('live','المتابعة المباشرة',`<div id="l56Box">${skel(120)}<div class="mt-3">${skel(300)}</div></div>`);
  let d;try{d=await load56()}catch(e){if(location.hash===h&&$('#l56Box'))$('#l56Box').innerHTML=`<div class="alert alert-danger">${esc(e.message)}</div>`;return}
  if(location.hash!==h||!$('#l56Box'))return;L56.data=d;L56.at=Date.now();draw56();
  if(L56.auto&&!d.local)L56.t=setTimeout(()=>{if(location.hash===h&&!document.hidden)vLive56();else if(location.hash===h)L56.t=setTimeout(()=>vLive56(),5000)},60000)}
function draw56(){const d=L56.data,box=$('#l56Box');if(!d||!box)return;const T=opsCfg().target;
  const rows=d.items.map(r=>Object.assign({},r,{st:state56(r),m:mins56(r.at)}));const cnt=k=>rows.filter(r=>r.st===k).length;
  const order={active:0,idle:1,stopped:2,off:3};rows.sort((a,b)=>order[a.st]-order[b.st]||(a.m??1e9)-(b.m??1e9));
  const list=L56.f?rows.filter(r=>r.st===L56.f):rows;const pend=rows.reduce((s,r)=>s+(+r.pending||0),0),todayN=rows.reduce((s,r)=>s+(+r.today||0),0);
  const alerts=[...rows.filter(r=>r.st==='stopped'&&r.today>0).map(r=>`<div class="l56-alert r">⛔ <b>${esc(r.name)}</b> متوقف ${esc(rel56(r.m))} — سجّل اليوم ${r.today} أصل${r.school?' في '+esc(r.school):''}.</div>`),
    ...rows.filter(r=>+r.pending>0&&(r.m==null||r.m>30)).map(r=>`<div class="l56-alert y">⏫ على جهاز <b>${esc(r.name)}</b> ${r.pending} تعديل لم يُرفع (آخر اتصال ${esc(rel56(r.m))}).</div>`),
    ...rows.filter(r=>r.version&&r.version!==NV.version&&r.st!=='off').map(r=>`<div class="l56-alert y">🔄 <b>${esc(r.name)}</b> يستخدم نسخة قديمة (${esc(r.version)}) — يحدّث التطبيق من زر «تحديث الآن».</div>`)];
  box.innerHTML=`${d.local?`<div class="alert alert-${d.old?'warning':'info'} py-2 small">${d.old?'قاعدة البيانات تحتاج تحديث NV56 (migrations/051_live_presence.sql) لتظهر حالة الأجهزة مباشرة. المعروض الآن من السجلات المحفوظة فقط.':'وضع بلا سحابة: المعروض من السجلات على هذا الجهاز فقط.'}</div>`:''}
   <div class="l56-kpis" data-kpi="live" data-val="${cnt('active')},${cnt('idle')},${cnt('stopped')},${cnt('off')}">
    ${[['','الكل',rows.length],['active','يعمل الآن (آخر 10 دقائق)',cnt('active')],['idle','خامل (10 دقائق – ساعتان)',cnt('idle')],['stopped','متوقف (أكثر من ساعتين)',cnt('stopped')],['off','لم يبدأ اليوم',cnt('off')]].map(([k,l,n])=>`<button type="button" class="l56-k ${L56.f===k?'on':''}" data-l56f="${k}"><span>${k?`<i class="l56-dot ${ST56[k][0]}"></i>`:''}${l}</span><b>${n}</b></button>`).join('')}
    <div class="l56-k" style="cursor:default"><span>أصول اليوم / ينتظر الرفع</span><b>${todayN}</b> <small class="l56-sub">/ ${pend}</small></div></div>
   ${alerts.length?`<div class="mb-3" id="l56Alerts">${alerts.join('')}</div>`:''}
   <div class="card"><div class="card-header d-flex flex-wrap gap-2 align-items-center"><h3 class="card-title mb-0 me-auto">مشرفو الميدان</h3>
    <span class="l56-sub" id="l56Upd">آخر تحديث: ${new Date(L56.at).toLocaleTimeString('ar-SA-u-ca-gregory',{hour:'2-digit',minute:'2-digit'})}</span>
    ${d.local?'':`<label class="form-check form-switch small mb-0"><input class="form-check-input" type="checkbox" id="l56Auto" ${L56.auto?'checked':''}> تحديث تلقائي كل دقيقة</label>`}
    <button class="btn btn-sm btn-outline-primary" id="l56Re"><i class="bi bi-arrow-clockwise"></i> تحديث</button></div>
    <div class="card-body table-responsive p-0"><table class="table table-hover mb-0 align-middle" id="l56T"><thead><tr><th>المشرف</th><th>الحالة</th><th>آخر نشاط</th><th>المكان الآن</th><th>اليوم / الهدف</th><th>آخر أصل</th><th>ينتظر الرفع</th></tr></thead><tbody>
    ${list.map(r=>`<tr data-emp="${esc(r.emp)}" data-st="${r.st}"><td><b>${esc(r.name)}</b><div class="l56-sub">${esc(r.number||'')}</div></td>
     <td><i class="l56-dot ${ST56[r.st][0]}"></i>${ST56[r.st][1]}</td><td>${esc(rel56(r.m))}${r.page&&!r.local?`<div class="l56-sub">${esc({asset:'نموذج الأصل',location:'شاشة الموقع',school:'اختيار المبنى',success:'تم الحفظ',labels:'الملصقات',todo:'ما يحتاج إجراء',bmap:'خريطة المبنى',history:'سجل أصوله'}[r.page]||r.page)}</div>`:''}</td>
     <td>${r.school?`${r.school_id?`<a href="#admin/collections/building/${encodeURIComponent(r.school_id)}">${esc(r.school)}</a>`:esc(r.school)}<div class="l56-sub">${esc([r.floor,r.room].filter(Boolean).join(' · '))}</div>`:r.last_school?`<span class="l56-sub">آخر مبنى: ${esc(r.last_school)}</span>`:'—'}</td>
     <td><b>${r.today}</b> / ${T}<span class="l56-bar"><i style="width:${Math.min(100,Math.round(r.today/T*100))}%;background:${r.today>=T?'#16a34a':'#2563eb'}"></i></span></td>
     <td>${r.last_asset?esc(rel56(mins56(r.last_asset))):'—'}</td><td>${+r.pending?`<span class="badge text-bg-warning">${r.pending}</span>`:'<span class="l56-sub">0</span>'}${r.version&&r.version!==NV.version?` <span class="badge text-bg-secondary" title="نسخة قديمة">${esc(r.version)}</span>`:''}</td></tr>`).join('')||`<tr><td colspan="7" class="text-center text-muted py-4">لا يوجد مشرفون في هذا التصنيف.</td></tr>`}
    </tbody></table></div></div>
   <p class="l56-sub mt-2">تُرسل أجهزة المشرفين إشارة عند كل انتقال وكل دقيقتين أثناء فتح التطبيق؛ المشرف بلا إنترنت يظهر بآخر إشارة وصلت منه.</p>`;
  $$('[data-l56f]').forEach(b=>b.onclick=()=>{L56.f=b.dataset.l56f;draw56()});
  if($('#l56Re'))$('#l56Re').onclick=()=>vLive56();if($('#l56Auto'))$('#l56Auto').onchange=e=>{L56.auto=e.target.checked;clearTimeout(L56.t);if(L56.auto)vLive56()}}

/* ---------- (2) working without internet ---------- */
const DLK56=()=>'nv56_dl_'+(Cloud.on?Cloud.scope()+'_'+(Cloud.user&&Cloud.user.id||''):'local');
const dlMap56=()=>lsGet(DLK56(),{});
async function swPrefetch56(){if(!SW56())return {sw:false};let reg=null;try{reg=await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready}catch(e){return {sw:false}}
  const sw=navigator.serviceWorker.controller||(reg&&reg.active);if(!sw)return {sw:false};
  const urls=[appURL56(),typeof NV_LIB!=='undefined'?NV_LIB:'','https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js','https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'].filter(Boolean);
  return await new Promise(res=>{const done=e=>{if(e.data&&e.data.type==='nv56-prefetched'){navigator.serviceWorker.removeEventListener('message',done);res({sw:true,n:e.data.n})}};
    navigator.serviceWorker.addEventListener('message',done);sw.postMessage({type:'nv56-prefetch',urls});setTimeout(()=>{navigator.serviceWorker.removeEventListener('message',done);res({sw:true,n:-1})},25000)})}
async function appSaved56(){try{if(!('caches' in window))return false;const u=appURL56();return !!(await caches.match(u)||await caches.match(u.replace(/index\.html$/,'')))}catch(e){return false}}
/* download one building for offline work: the newest data + the photos of its assets on this phone */
async function dl56(sid,out){const s=get('schools',sid);if(!s)return;const say=(t,p)=>{if(!out)return;out.innerHTML=`<div class="h52-muted">${t}</div>${p!=null?`<div class="o56-prog"><i style="width:${p}%"></i></div>`:''}`};
  if(navigator.onLine===false){say('📴 لا يوجد اتصال الآن — نزّل المبنى قبل الذهاب إليه.');return false}
  say(tx('١/٤ حفظ التطبيق على الجوال…','1/4 Saving the app…'),5);try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist()}catch(e){}
  const pf=await swPrefetch56().catch(()=>({sw:false}));
  say(tx('٢/٤ تحديث البيانات من الخادم…','2/4 Refreshing the data…'),25);
  if(Cloud.on){try{await Cloud.sync();await Cloud.pull();if(window.RD)await RD.pull(true)}catch(e){console.warn('dl56',e)}}
  const list=S.collections.filter(c=>c.school_id===sid);const keys=[...new Set(list.flatMap(c=>[c.school_image,...photoKeys(c)]).filter(Boolean))];let have=0,got=0,miss=0;
  for(let i=0;i<keys.length;i++){const k=keys[i];say(tx(`٣/٤ حفظ الصور على الجوال (${i+1}/${keys.length})…`,`3/4 Saving photos (${i+1}/${keys.length})…`),30+Math.round(60*(i+1)/Math.max(1,keys.length)));
    try{if(await IDB.get('photos',k)){have++;continue}if(Cloud.on&&await Cloud.fetchPhoto(k))got++;else miss++}catch(e){miss++}}
  say(tx('٤/٤ التحقق…','4/4 Checking…'),95);const app=await appSaved56();
  const m=dlMap56();m[sid]={at:now(),assets:list.filter(c=>c.submitted_at&&c.type_id).length,photos:have+got,miss,app,sw:!!pf.sw};lsSet(DLK56(),m);
  say(`✅ ${tx('جاهز للعمل بلا إنترنت','Ready to work offline')}: ${esc(s.name)} — ${m[sid].assets} ${tx('أصل','assets')}، ${m[sid].photos} ${tx('صورة محفوظة','photos saved')}${miss?` (${miss} ${tx('صورة لم تتوفر','not available')})`:''}${app?'':' — '+tx('التطبيق نفسه لم يُحفظ في هذا المتصفح؛ لا تُغلقه أثناء العمل بلا إنترنت.','the app itself could not be saved in this browser; keep it open while offline.')}`,100);
  return true}
function dlInfo56(sid){const d=dlMap56()[sid];return d?`📥 ${tx('آخر تنزيل','Last download')}: ${ymd(d.at)} ${hiA(d.at)} · ${d.photos} ${tx('صورة','photos')}`:tx('لم يُنزَّل بعد على هذا الجوال.','Not downloaded on this phone yet.')}
/* the building map gets the download card */
{const _vBMap56=vBMap52;vBMap52=function(sid){_vBMap56(sid);const first=$('#screen-bmap .h52-card');if(!first||$('#o56Card'))return;
  first.insertAdjacentHTML('afterend',`<div class="h52-card o56" id="o56Card"><h3>📴 ${tx('العمل بلا إنترنت','Working offline')}</h3><div class="h52-muted" id="o56Info">${dlInfo56(sid)}</div>
   <div class="row56"><button type="button" class="h52-btn main" id="o56Go" style="flex:1">⬇️ ${tx('تنزيل المبنى للعمل بلا إنترنت','Download the building for offline work')}</button></div><div id="o56Out"></div></div>`);
  $('#o56Go').onclick=async()=>{const b=$('#o56Go');b.disabled=true;await dl56(sid,$('#o56Out'));b.disabled=false;if($('#o56Info'))$('#o56Info').textContent=dlInfo56(sid)}}}
/* my buildings: download a building before going there (also one not started yet) */
{const _vBuildings56=vBuildings52;vBuildings52=function(){_vBuildings56();const head=$('#screen-buildings .h52-card');if(!head||$('#o56Pick'))return;const e=curEmp();
  const other=new Set(S.collections.filter(c=>c.employee_id!==(e&&e.id)).map(c=>c.school_id));
  const opts=S.schools.filter(s=>s.status==='active'&&!s.completed_at&&!other.has(s.id)&&!(Cloud.on&&Cloud.busy&&Cloud.busy.has(s.id))).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  head.insertAdjacentHTML('afterend',`<div class="h52-card o56" id="o56Pick"><h3>📴 ${tx('تنزيل مبنى قبل الذهاب إليه','Download a building before going there')}</h3><p class="h52-muted">${tx('يحفظ التطبيق وأحدث البيانات وصور الأصول المسجلة على الجوال، لتعمل في مكان بلا تغطية. ما تسجله يُرفع تلقائياً عند عودة الاتصال.','Saves the app, the newest data and the asset photos on the phone so you can work without coverage. What you record is uploaded when the connection returns.')}</p>
   <div class="row56"><input list="o56List" id="o56Q" placeholder="${tx('اكتب اسم المبنى أو رقمه…','Type the building name or number…')}"><datalist id="o56List">${opts.slice(0,3000).map(s=>`<option value="${esc(s.moe||s.ident)} — ${esc(s.name)}"></option>`).join('')}</datalist><button type="button" class="h52-btn main" id="o56Dl">⬇️ ${tx('تنزيل','Download')}</button></div><div id="o56Out2"></div></div>`);
  $('#o56Dl').onclick=async()=>{const v=$('#o56Q').value.trim();const code=v.split(' — ')[0];const s=opts.find(x=>(x.moe||x.ident)===code)||opts.find(x=>x.name===v||String(x.moe)===v||x.ident===v);
    if(!s){$('#o56Out2').innerHTML=`<div class="h52-muted">${tx('اختر مبنى من القائمة.','Pick a building from the list.')}</div>`;return}const b=$('#o56Dl');b.disabled=true;await dl56(s.id,$('#o56Out2'));b.disabled=false}}}
/* my account: offline readiness */
{const _vAccount56=vAccount52;vAccount52=async function(){await _vAccount56();const dev=$('#acDev');if(!dev||$('#o56Ready'))return;
  const app=await appSaved56();let est=null;try{est=navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null}catch(e){}let pers=null;try{pers=navigator.storage&&navigator.storage.persisted?await navigator.storage.persisted():null}catch(e){}
  const D=dlMap56(),ids=Object.keys(D).filter(id=>get('schools',id));const mb=b=>Math.round((b||0)/1048576);
  dev.insertAdjacentHTML('afterend',`<div class="h52-card o56" id="o56Ready" data-app="${app?1:0}"><h3>📴 ${tx('جاهزية العمل بلا إنترنت','Offline readiness')}</h3><table class="h52-tbl">
   <tr><th>${tx('التطبيق محفوظ على الجوال','App saved on the phone')}</th><td>${app?'✅':'⚠️ '+tx('ليس بعد — نزّل مبنى وأنت متصل','not yet — download a building while online')}</td></tr>
   <tr><th>${tx('حماية البيانات من المسح التلقائي','Data protected from automatic clean-up')}</th><td>${pers==null?'—':pers?'✅':'⚠️ '+tx('غير مضمونة في هذا المتصفح','not guaranteed in this browser')}</td></tr>
   ${est?`<tr><th>${tx('المساحة المستخدمة','Storage used')}</th><td>${mb(est.usage)} MB ${tx('من','of')} ${mb(est.quota)} MB</td></tr>`:''}
   <tr><th>${tx('مبانٍ منزّلة','Downloaded buildings')}</th><td>${ids.length?ids.map(id=>`${esc(get('schools',id).name)} <span class="h52-muted">(${ymd(D[id].at)})</span>`).join('<br>'):'—'}</td></tr></table>
   <p class="h52-muted" style="margin-top:8px">${tx('بلا إنترنت: الجرد والصور والملصقات المطبوعة سابقاً تعمل؛ الخريطة والمساعد الذكي وقراءة اللوحة تحتاج اتصالاً. لا تمسح بيانات المتصفح قبل رفع كل شيء.','Offline: collecting, photos and already printed labels work; the map, the smart assistant and the nameplate reader need a connection. Do not clear the browser data before everything is uploaded.')}</p></div>`)}}
/* Home: a small sign in the greeting card when the app is saved */
{const _vEmployee56=vEmployee;vEmployee=function(){_vEmployee56();const h=$('.h52-hello');if(!h)return;appSaved56().then(ok=>{if(ok&&$('.h52-hello')&&!$('#o56Home'))$('.h52-hello').insertAdjacentHTML('beforeend',` <span class="o56-ok" id="o56Home">📴 ${tx('التطبيق محفوظ للعمل بلا إنترنت','App saved for offline work')}</span>`)})}}
/* the database status card expects 051 too */
window.SCHEMA_EXPECT=(window.SCHEMA_EXPECT||[]).concat([{m:'051',name:'المتابعة المباشرة للمشرفين'}]);
</script>
