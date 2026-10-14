// NV28: system Admin page (subscription, limits, Admin accounts, permissions), banners, field permissions — against the mock Supabase
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html';const M=require('./mock-server.js')();
(async()=>{
 const br=await chromium.launch();const errs=[];
 const mk=async(vw)=>{const ctx=await br.newContext({ignoreHTTPSErrors:true,viewport:vw||{width:1280,height:900}});
  await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{if(/supabase-js/.test(r.request().url()))return r.abort();try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
  await ctx.exposeFunction('__mockCall',j=>M.handle(j));await ctx.addInitScript({path:B+'/mock-client.js'});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.type()==='prompt'?d.accept(/إنهاء/.test(d.message())?'إنهاء':d.defaultValue()):d.accept());return {ctx,p}};
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const signIn=async(p,em,pw,sel)=>{await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em',em);await p.fill('#pw',pw);await p.click('button[type=submit]');await p.waitForSelector(sel)};
 // system Admin
 const S1=await mk();const a=S1.p;await signIn(a,'sys@x.com','syspass','#initCloud');await a.click('#initCloud');await a.waitForSelector('.alert-success',{timeout:60000});
 ok(await a.evaluate(()=>Cloud.sys&&staffRole()==='sysadmin'),'signed in as Admin');
 await a.goto(U+'#admin/system');await a.waitForSelector('#subF');const tabs=await a.$$eval('.nv-set-tabs a',x=>x.map(y=>y.textContent.trim()));ok(tabs[0].includes('إدارة النظام'),'settings tab «إدارة النظام (Admin)» first: '+tabs.join(' | '));
 const in10=new Date(Date.now()+10*864e5).toISOString().slice(0,10);
 await a.fill('#s_customer','شلفا العالمية');await a.fill('#s_end',in10);await a.fill('#s_schools','3000');await a.fill('#s_field','150');await a.click('#subF button[type=submit]');await a.waitForSelector('#subF');await a.waitForSelector('.alert-success');
 ok(M.sub.customer==='شلفا العالمية'&&M.sub.max_schools===3000&&M.sub.max_field===150&&M.sub.ends_at.startsWith(in10),'subscription + limits saved '+JSON.stringify({c:M.sub.customer,e:M.sub.ends_at,ms:M.sub.max_schools}));
 ok((await a.textContent('[data-sub-state]')).includes('ينتهي قريباً')&&!!(await a.$('[data-sub="soon"]')),'status «ينتهي قريباً» + banner');
 await a.screenshot({path:B+'/shots/70-system.png',fullPage:true});
 await a.click('[data-ext="3"]');await a.waitForSelector('.alert-success');const e3=new Date(M.sub.ends_at).getTime();ok(e3>Date.now()+95*864e5&&e3<Date.now()+105*864e5,'renew +3 months from the end date');
 await a.waitForFunction(()=>document.querySelector('#sysBox')&&document.querySelector('#sysBox').textContent.includes('renew +3m'),null,{timeout:10000}).catch(()=>{});ok((await a.textContent('#sysBox')).includes('renew +3m'),'renewal log');
 // add another Admin
 await a.fill('#a_n','Admin 2');await a.fill('#a_e','adm2@x.com');await a.click('#admF button');await a.waitForSelector('.alert-success');ok(M.db.nv_staff.some(u=>u.email==='adm2@x.com'&&u.role==='sysadmin'),'second Admin added');
 // permissions: a coordinator without «delete», a field supervisor without «gallery»
 M.handle(JSON.stringify({user:{id:'u-sys'},op:'rpc',fn:'nv_staff_create',args:{p_email:'co@x.com',p_password:'12345678',p_name:'منسق',p_role:'coordinator'}}));
 await a.goto(U+'#admin/settings');await a.goto(U+'#admin/system');await a.waitForSelector('[data-pw="s"]');
 const coId=M.db.nv_staff.find(u=>u.email==='co@x.com').user_id;await a.uncheck(`[data-pw="s"][data-id="${coId}"][data-k="delete"]`);await a.waitForTimeout(400);
 ok(JSON.stringify(M.db.nv_staff.find(u=>u.email==='co@x.com').perms)==='{"delete":false}','coordinator: delete removed');
 await a.click('[data-ptab="field"]');const emp=M.db.nv_employees.find(e=>e.number==='22912');await a.fill('#pq','22912');await a.uncheck(`[data-pw="e"][data-id="${emp.id}"][data-k="gallery"]`);await a.waitForTimeout(400);
 ok(JSON.stringify(emp.perms)==='{"gallery":false}','supervisor: gallery removed');await a.screenshot({path:B+'/shots/71-perms.png',fullPage:true});
 M.handle(JSON.stringify({user:{id:'u-sys'},op:'rpc',fn:'nv_emp_set_login',args:{p_emp:emp.id,p_password:'87654321'}}));
 // the owner: no Admin tab, banner with «contact the provider», no subscription edits
 const O=await mk();const o=O.p;await signIn(o,'admin@x.com','adminpass','.nvd');
 await o.goto(U+'#admin/settings');await o.waitForSelector('.nv-set-tabs');ok(!(await o.textContent('.nv-set-tabs')).includes('إدارة النظام'),'owner: no Admin tab');
 await o.goto(U+'#admin/system');await o.waitForFunction(()=>location.hash==='#admin/settings');ok(true,'owner: #admin/system redirects');
 ok(!!(await o.evaluate(()=>window.__mockCall(JSON.stringify({user:{id:'u-admin'},op:'rpc',fn:'nv_sub_save',args:{p:{plan:'x'}}})).then(r=>JSON.parse(r).error))),'owner cannot change the subscription');
 // coordinator without delete: no delete actions
 const Cc=await mk();const cc=Cc.p;await signIn(cc,'co@x.com','12345678','.nvd');await cc.goto(U+'#admin/schools');await cc.waitForSelector('#nvt-schools');
 ok(!(await cc.$('[data-nvb="del"]'))&&!(await cc.$('[data-nvb="delwork"]'))&&!!(await cc.$('[data-nvb="complete"]')),'coordinator: delete actions hidden');
 // subscription ends → owner banner, field read only
 M.sub.ends_at=new Date(Date.now()-2*864e5).toISOString();M.sub.grace_days=0;
 await o.evaluate(()=>Cloud.init());await o.goto(U+'#admin/collections');await o.evaluate(()=>route());await o.waitForSelector('[data-sub="over"]');ok((await o.textContent('[data-sub="over"]')).includes('للقراءة فقط'),'owner banner: read only after the end');
 const T=await mk({width:390,height:844});const t=T.p;await t.goto(U);await t.waitForSelector('#pw');await t.fill('#em','22912');await t.fill('#pw','87654321');await t.click('button[type=submit]');await t.waitForSelector('#screen-data');
 ok(!!(await t.$('[data-sub="over"]')),'field: read-only bar');await t.click('text=تأكيد البيانات');await t.waitForSelector('#empMsg');ok((await t.textContent('#empMsg')).includes('انتهى الاشتراك'),'field: no new collection after the end');
 await t.screenshot({path:B+'/shots/72-field-over.png'});
 // renewed → the supervisor works, without the gallery button
 M.sub.ends_at=new Date(Date.now()+90*864e5).toISOString();await t.evaluate(()=>Cloud.init());await t.goto(U+'#employee-data');await t.evaluate(()=>route());await t.click('text=تأكيد البيانات');await t.waitForSelector('#q');
 await t.fill('#q','الضياء');await t.waitForSelector('#res li');await t.click('#res li >> nth=0');await t.setInputFiles('#school-image',B+'/a.png');await t.click('#next');await t.waitForSelector('#floor-select');
 await t.selectOption('#floor-select','الأرضي');await t.selectOption('#room-number','1');await t.selectOption('#room-name',await t.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value));await t.click('#submit-btn');await t.waitForSelector('#a_category_id');
 ok(!!(await t.$('#aimg'))&&!(await t.$('#aimgG'))&&!(await t.$('#aimgXG')),'field: camera only (gallery permission removed)');
 ok(!errs.length,'no page errors '+errs.join(' | '));await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
