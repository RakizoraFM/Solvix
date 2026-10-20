// NV56: live monitoring (heartbeat from the field app → «المتابعة المباشرة») and working without internet (sw.js + «تنزيل المبنى»).
// The cloud is the mock (tests/mock-server.js); nv_presence_ping / nv_presence_list are answered here like migration 051.
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html';const M=require('./mock-server.js')();
const pings=[];let extra=[];const handle=M.handle;const day=d=>new Date(d).toLocaleDateString('en-CA',{timeZone:'Asia/Riyadh'});
M.handle=j=>{const s=JSON.parse(j);
  if(s.op==='rpc'&&s.fn==='nv_presence_ping'){const e=M.db.nv_employees.find(x=>x.user_id===(s.user&&s.user.id));if(!e)return JSON.stringify({data:null,error:{message:'not allowed'}});pings.push({emp:e.id,at:new Date().toISOString(),...s.args.p});return JSON.stringify({data:null,error:null})}
  if(s.op==='rpc'&&s.fn==='nv_presence_list'){const items=M.db.nv_employees.filter(e=>e.user_id).map(e=>{const p=pings.filter(x=>x.emp===e.id).pop();const mine=M.db.nv_collections.filter(c=>c.employee_id===e.id&&c.submitted_at);
      const sc=p&&M.db.nv_schools.find(x=>x.id===p.school);return {emp:e.id,name:e.name,number:e.number,at:p?p.at:null,school_id:p&&p.school||null,school:sc?sc.name:null,floor:p&&p.floor,room:p&&p.room,page:p&&p.page,pending:p?p.pending:0,version:p&&p.version,
        today:mine.filter(c=>c.type_id&&day(c.submitted_at)===day(Date.now())).length,last_asset:mine.map(c=>c.submitted_at).sort().pop()||null}}).concat(extra);
    return JSON.stringify({data:{now:new Date().toISOString(),items},error:null})}
  return handle(j)};
(async()=>{
 const br=await chromium.launch();const errs=[];
 const mk=async(vw)=>{const ctx=await br.newContext({ignoreHTTPSErrors:true,permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:vw||{width:1280,height:900}});
  await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{if(/supabase-js/.test(r.request().url()))return r.abort();try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
  await ctx.exposeFunction('__mockCall',j=>M.handle(j));await ctx.addInitScript({path:B+'/mock-client.js'});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());return {ctx,p}};
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 // ---- admin: lists + a supervisor login
 const A=await mk();const a=A.p;
 await a.goto(U+'#admin');await a.waitForSelector('#em');await a.fill('#em','admin@x.com');await a.fill('#pw','adminpass');await a.click('button[type=submit]');await a.waitForSelector('#initCloud');
 await a.click('#initCloud');await a.waitForSelector('.alert-success',{timeout:60000});
 await a.evaluate(async()=>{const demo=seedLists({});S.schools=demo.schools;S.employees=demo.employees;reindex();save('schools');save('employees');await Cloud.sync()});
 M.handle(JSON.stringify({user:{id:'u-admin'},op:'rpc',fn:'nv_emp_set_login',args:{p_emp:M.db.nv_employees.find(e=>e.number==='22912').id,p_password:'87654321'}}));
 ok(!!(await a.$('.app-sidebar a[href="#admin/live"]')),'sidebar: «المتابعة المباشرة»');
 // ---- supervisor works: heartbeats carry the place and the page
 const T=await mk({width:390,height:844});const t=T.p;
 await t.goto(U);await t.waitForSelector('#pw');await t.fill('#em','22912');await t.fill('#pw','87654321');await t.click('button[type=submit]');await t.waitForSelector('#screen-data');
 await t.click('#homeStart');await t.fill('#q','الضياء');await t.waitForSelector('#res li');await t.click('#res li >> nth=0');await t.setInputFiles('#school-image',B+'/a.png');await t.click('#next');
 await t.waitForSelector('#floor-select');await t.selectOption('#floor-select','الأرضي');await t.selectOption('#room-number','1');
 await t.selectOption('#room-name',await t.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value));await t.click('#submit-btn');await t.waitForSelector('#a_category_id');
 await t.evaluate(()=>ping56(true));await t.waitForTimeout(300);
 const pg=pings[pings.length-1];const sid=await t.evaluate(()=>sess().school);
 ok(pg&&pg.page==='asset'&&pg.school===sid&&pg.floor==='الأرضي'&&/\(1\)/.test(pg.room)&&pg.version===(await t.evaluate(()=>NV.version)),'heartbeat: page, building, floor, room, version');
 // save one asset (the heartbeat follows the page)
 await t.selectOption('#a_category_id',await t.$eval('#a_category_id',s=>s.options[2].value));await t.selectOption('#a_l2',{index:1});await t.selectOption('#a_l3',{index:1});await t.selectOption('#a_type_id',{index:1});
 await t.setInputFiles('#aimg',{name:'b.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/b.png')});await t.waitForSelector('[data-shot="0"].ok');
 await t.fill('#a_quantity','1');await t.selectOption('#a_condition_id',{index:1});await t.selectOption('#a_parent_child','Parent');await t.fill('#a_serial','NV56-1');await t.click('#sb');await t.waitForSelector('#screen-success');await t.waitForTimeout(1500);
 await t.evaluate(()=>ping56(true));await t.waitForTimeout(300);ok(pings[pings.length-1].page==='success','heartbeat after saving: «تم الحفظ»');
 // ---- admin: live page (the supervisor + three made-up ones: stopped, waiting uploads on an old version, not started)
 const now=Date.now(),iso=m=>new Date(now-m*6e4).toISOString();
 extra=[{emp:'x1',name:'مشرف متوقف',number:'1',at:iso(150),school:'مبنى 1',floor:'الأول',room:'فصل',page:'asset',pending:0,version:null,today:4,last_asset:iso(150)},
   {emp:'x2',name:'مشرف بلا رفع',number:'2',at:iso(45),school:'مبنى 2',pending:7,version:'NV50',today:1,last_asset:iso(50),page:'success'},
   {emp:'x3',name:'مشرف لم يبدأ',number:'3',at:null,pending:0,today:0,last_asset:null}];
 await a.goto(U+'#admin/live');await a.waitForSelector('#l56T tbody tr');
 ok((await a.getAttribute('[data-kpi=live]','data-val'))==='1,1,1,1','KPIs: 1 working, 1 idle, 1 stopped, 1 not started ('+await a.getAttribute('[data-kpi=live]','data-val')+')');
 const r1=await a.$eval(`#l56T tr[data-emp="${M.db.nv_employees.find(e=>e.number==='22912').id}"]`,tr=>({st:tr.dataset.st,txt:tr.innerText}));
 ok(r1.st==='active'&&/الضياء/.test(r1.txt)&&/الأرضي/.test(r1.txt)&&/1 \/ 40/.test(r1.txt.replace(/\s+/g,' ')),'the supervisor: working now, building + floor, 1 / 40 today');
 const al=await a.textContent('#l56Alerts');ok(/مشرف متوقف/.test(al)&&/متوقف منذ 2 س/.test(al),'alert: stopped for more than two hours');
 ok(/مشرف بلا رفع/.test(al)&&/7 تعديل لم يُرفع/.test(al)&&/نسخة قديمة \(NV50\)/.test(al),'alerts: uploads waiting on a phone, old version');
 await a.click('[data-l56f="stopped"]');ok((await a.$$eval('#l56T tbody tr',r=>r.map(x=>x.dataset.st))).join()==='stopped','filter: stopped only');
 await a.click('[data-l56f=""]');ok((await a.$$('#l56T tbody tr')).length===4,'filter: all');
 ok(!!(await a.$('#l56Auto:checked')),'auto refresh on');await a.screenshot({path:B+'/shots/nv56-live.png',fullPage:true});
 // database not upgraded → built from the saved records, with the upgrade note
 const h2=M.handle;M.handle=j=>{const s=JSON.parse(j);if(s.op==='rpc'&&s.fn==='nv_presence_list')return JSON.stringify({data:null,error:{message:'Could not find the function public.nv_presence_list without parameters in the schema cache'}});return h2(j)};
 await a.evaluate(()=>vLive56());await a.waitForSelector('.alert-warning');ok((await a.textContent('.alert-warning')).includes('051_live_presence'),'old database: upgrade note, list from the saved records');M.handle=h2;
 // ---- offline: download the building (data + photos on the phone)
 await t.evaluate(sid=>{location.hash='#bmap/'+encodeURIComponent(sid)},sid);await t.waitForSelector('#o56Card');ok((await t.textContent('#o56Info')).includes('لم يُنزَّل'),'building map: download card, not downloaded yet');
 const rec=M.db.nv_collections.find(c=>c.serial==='NV56-1');await t.evaluate(k=>IDB.del('photos',k),rec.asset_image);ok(!(await t.evaluate(k=>IDB.get('photos',k),rec.asset_image)),'the asset photo is removed from the phone (test)');
 await t.click('#o56Go');await t.waitForFunction(()=>/جاهز للعمل بلا إنترنت/.test((document.querySelector('#o56Out')||{}).textContent||''),null,{timeout:40000});
 ok(!!(await t.evaluate(k=>IDB.get('photos',k),rec.asset_image)),'download: the photo is back on the phone');
 ok(await t.evaluate(sid=>{const d=dlMap56()[sid];return d&&d.assets===1&&d.photos>=2},sid),'download recorded (1 asset, photos saved)');
 ok((await t.textContent('#o56Info')).includes('آخر تنزيل'),'card shows the last download');
 // a building not started yet, from «مبانيّ»
 await t.evaluate(()=>{location.hash='#buildings'});await t.waitForSelector('#o56Pick');const other=await t.evaluate(()=>{const s=S.schools.find(x=>x.status==='active'&&!x.completed_at&&!S.collections.some(c=>c.school_id===x.id));return (s.moe||s.ident)+' — '+s.name});
 await t.fill('#o56Q',other);await t.click('#o56Dl');await t.waitForFunction(()=>/جاهز للعمل بلا إنترنت/.test((document.querySelector('#o56Out2')||{}).textContent||''),null,{timeout:40000});ok(true,'download a building before starting it');
 // ---- the service worker (enabled for this test): the app opens again without internet
 await t.evaluate(()=>localStorage.setItem('nv56_sw_test','1'));await t.reload();await t.waitForSelector('#nv52Side, #pw',{timeout:30000});
 await t.evaluate(async()=>{await navigator.serviceWorker.ready});await t.evaluate(sid=>{location.hash='#bmap/'+encodeURIComponent(sid)},sid);await t.waitForSelector('#o56Go');
 await t.click('#o56Go');await t.waitForFunction(()=>/جاهز للعمل بلا إنترنت/.test((document.querySelector('#o56Out')||{}).textContent||''),null,{timeout:60000});
 ok(await t.evaluate(()=>appSaved56()),'service worker: the app page is saved');
 await t.evaluate(()=>{location.hash='#account'});await t.waitForSelector('#o56Ready');ok((await t.getAttribute('#o56Ready','data-app'))==='1','account: offline readiness shows the app saved');
 await T.ctx.setOffline(true);await t.reload({timeout:30000}).catch(()=>{});await t.waitForSelector('#screen-data, #pw, .h52',{timeout:30000});
 ok(!!(await t.$('#nv52Side, #pw')),'offline reload: the app opens from the phone');
 await t.evaluate(()=>{location.hash='#employee-data'});await t.waitForSelector('#screen-data');await t.waitForTimeout(500);ok(!!(await t.$('#o56Home')),'Home: «التطبيق محفوظ للعمل بلا إنترنت»');
 await t.screenshot({path:B+'/shots/nv56-offline-home.png'});await T.ctx.setOffline(false);
 ok(!errs.filter(e=>!/Failed to fetch|ERR_INTERNET_DISCONNECTED|NetworkError/.test(e)).length,'no page errors '+errs.join(' | '));
 await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
