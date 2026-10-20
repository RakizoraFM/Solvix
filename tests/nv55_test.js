// NV55: «مساعدك الذكي» — floating button + chat window (admin and field), «املأ البيانات من الصورة» in the asset form, settings card.
// The Edge Function «solvix-ai» is replaced by the mock (M.handle intercepts op 'fn' name 'solvix-ai'); the function itself is tested with Deno in tests/nv55_fn_test.sh.
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html';const M=require('./mock-server.js')();
const calls=[];let reply=null;const handle=M.handle;
let schema='ok';
M.handle=j=>{const s=JSON.parse(j);if(s.op==='rpc'&&s.fn==='nv_schema_level'){if(schema==='old')return JSON.stringify({data:null,error:{message:'Could not find the function public.nv_schema_level without parameters in the schema cache'}});const items=[['044','دورات الجرد'],['045','الدليل'],['046','المباني'],['047','لوحة البيانات'],['048','الاستثناءات'],['049','الدليل للأدمن'],['050','مساعدك الذكي'],['051','المتابعة المباشرة']].map(([m,name])=>({m,name,ok:!(schema==='miss'&&(m==='048'||m==='049'))}));return JSON.stringify({data:{latest:'051',items},error:null})}
 if(s.op==='fn'&&s.name==='solvix-ai'){calls.push(s.body);const r=typeof reply==='function'?reply(s.body):reply;return JSON.stringify({data:r,error:null})}return handle(j)};
(async()=>{
 const br=await chromium.launch();const errs=[];
 const mk=async(vw)=>{const ctx=await br.newContext({ignoreHTTPSErrors:true,permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:vw||{width:1280,height:900}});
  await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{if(/supabase-js/.test(r.request().url()))return r.abort();try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
  await ctx.exposeFunction('__mockCall',j=>M.handle(j));await ctx.addInitScript({path:B+'/mock-client.js'});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());return {ctx,p}};
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 // ---- admin: lists, a supervisor login
 const A=await mk();const a=A.p;
 await a.goto(U+'#admin');await a.waitForSelector('#em');await a.fill('#em','admin@x.com');await a.fill('#pw','adminpass');await a.click('button[type=submit]');await a.waitForSelector('#initCloud');
 await a.click('#initCloud');await a.waitForSelector('.alert-success',{timeout:60000});
 await a.evaluate(async()=>{const demo=seedLists({});S.schools=demo.schools;S.employees=demo.employees;reindex();save('schools');save('employees');await Cloud.sync()});
 M.handle(JSON.stringify({user:{id:'u-admin'},op:'rpc',fn:'nv_emp_set_login',args:{p_emp:M.db.nv_employees.find(e=>e.number==='22912').id,p_password:'87654321'}}));
 // assistant off: no button, settings card unticked
 await a.goto(U+'#admin/settings');await a.waitForSelector('#aiCard');ok(!(await a.$eval('#ai_on',e=>e.checked)),'settings: AI card, off by default');
 ok(!(await a.$eval('#ai55Btn',e=>e.classList.contains('on')).catch(()=>false)),'no assistant button while off');
 // switched on (as saved by the settings page)
 M.db.nv_settings[0].data.ai={on:true,daily:5};await a.evaluate(async()=>{await Cloud.pull();route()});await a.waitForTimeout(400);
 await a.goto(U+'#admin/settings');await a.waitForSelector('#aiCard');ok(await a.$eval('#ai_on',e=>e.checked)&&(await a.$eval('#ai_daily',e=>e.value))==='5','settings: on, limit 5');
 await a.waitForSelector('#ai55Btn.on');ok(true,'admin: assistant button shown');
 // the settings form keeps «ai» (what is sent to nv_settings_save)
 ok(await a.evaluate(()=>{const o=Cloud.settingsOf(S.settings);return o.ai&&o.ai.on===true&&o.ai.daily===5}),'settings row carries «ai»');
 // database status card (system Admin)
 const Y=await mk();const y=Y.p;await y.goto(U+'#admin');await y.waitForSelector('#em');await y.fill('#em','sys@x.com');await y.fill('#pw','syspass');await y.click('button[type=submit]');await y.waitForTimeout(1500);
 await y.goto(U+'#admin/system');await y.waitForSelector('#schemaCard');ok((await y.getAttribute('#schemaCard','data-miss'))===''&&(await y.textContent('#schemaCard')).includes('محدّثة حتى الترحيل 051'),'database status: up to date');
 schema='miss';await y.click('#schemaRe');await y.waitForSelector('#schemaCard[data-miss="048,049"]');ok((await y.textContent('#schemaCard')).includes('migrations/048_*.sql')&&(await y.textContent('#schemaCard')).includes('solvix_setup.sql'),'database status: lists the missing upgrades');
 schema='old';await y.click('#schemaRe');await y.waitForSelector('#schemaCard[data-miss="old"]');ok((await y.textContent('#schemaCard')).includes('أقدم من NV55'),'database status: an older database');schema='ok';
 await Y.ctx.close();
 // chat
 reply=b=>({answer:'افتح «المستخدمون» ثم «إضافة مستخدم».',quota:{used:1,limit:5}});
 await a.click('#ai55Btn');await a.waitForSelector('#ai55Panel.on');ok(await a.$$eval('[data-ai55q]',x=>x.length)===4,'chat: 4 suggested questions');
 await a.fill('#ai55Q','كيف أضيف مشرف ميدان؟');await a.click('#ai55Send');await a.waitForSelector('.ai55-a');
 ok((await a.textContent('.ai55-a')).includes('إضافة مستخدم'),'chat: answer shown');
 const c0=calls[0];ok(c0&&c0.kind==='chat'&&c0.messages.length===1&&c0.messages[0].content.includes('مشرف ميدان')&&/المباني: 2170/.test(c0.context)&&c0.guide.length>50,'chat request: question, own numbers, guide');
 ok(!JSON.stringify(c0).match(/sk-ant|service_role/),'no secret in the request');
 // limit reached → Arabic message, history kept
 reply={code:'limit'};await a.fill('#ai55Q','سؤال آخر');await a.press('#ai55Q','Enter');await a.waitForSelector('.ai55-a.err');ok((await a.textContent('.ai55-a.err')).includes('الحد اليومي'),'limit message');
 ok(calls[1].messages.length===3,'follow-up sends the conversation (3 turns)');
 await a.click('#ai55New');ok(!(await a.$('.ai55-a')),'«جديد» clears the conversation');await a.click('#ai55X');
 // ---- field supervisor
 const T=await mk({width:390,height:844});const t=T.p;
 await t.goto(U);await t.waitForSelector('#pw');await t.fill('#em','22912');await t.fill('#pw','87654321');await t.click('button[type=submit]');await t.waitForSelector('#screen-data');
 await t.waitForSelector('#ai55Btn.on');const bb=await t.$eval('#ai55Btn',e=>e.getBoundingClientRect().bottom);ok(bb<844-60,'field: button above the bottom bar ('+Math.round(bb)+')');
 // chat with a photo
 reply={answer:'هذا مكيف سبليت جداري، الماركة Carrier.',quota:{used:1,limit:5}};
 await t.click('#ai55Btn');await t.waitForSelector('#ai55Panel.on');const pw=await t.$eval('#ai55Panel',e=>e.getBoundingClientRect().width);ok(pw>=388,'phone: the window is full width');
 await t.setInputFiles('#ai55Gal',B+'/a.png');await t.waitForSelector('#ai55Att.on');await t.click('#ai55Send');await t.waitForSelector('.ai55-a');
 const c2=calls[calls.length-1];ok(c2.images&&c2.images.length===1&&/^image\/(jpeg|png)$/.test(c2.images[0].media_type)&&c2.images[0].data.length>100&&/مشرف ميدان/.test(c2.context),'photo question: one image + supervisor context');
 ok((await t.textContent('.ai55-q')).includes('📷'),'the question shows the photo mark');await t.click('#ai55X');
 // asset form: fill from the photo
 await t.click('#homeStart');await t.fill('#q','الضياء');await t.waitForSelector('#res li');await t.click('#res li >> nth=0');await t.setInputFiles('#school-image',B+'/a.png');await t.click('#next');
 await t.waitForSelector('#floor-select');await t.selectOption('#floor-select','الأرضي');await t.selectOption('#room-number','1');
 await t.selectOption('#room-name',await t.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value));await t.click('#submit-btn');await t.waitForSelector('#a_category_id');
 ok(!!(await t.$('#aiFill')),'asset form: «املأ البيانات من الصورة» button');
 await t.click('#aiFill');await t.waitForFunction(()=>/أضف صورة/.test(document.querySelector('#aiMsg').textContent));ok(true,'no photo → asks for the photo first');
 const pick=await t.evaluate(()=>{const x=S.types.find(t=>t.code&&t.l2);return {code:x.code,id:x.id,ar:x.ar,cond:S.conditions[1].id}});
 reply={fields:{type_code:pick.code,manufacturer:'Carrier',brand:'Carrier',model:'42QHC018',capacity:'18000 BTU',serial:'SN-AI-1',condition_id:pick.cond,description:'مكيف سبليت جداري',notes:'',confidence:'high'},quota:{used:2,limit:5}};
 await t.fill('#a_brand','LG');
 await t.setInputFiles('#aimg',{name:'b.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/b.png')});await t.waitForSelector('[data-shot="0"].ok');
 await t.click('#aiFill');await t.waitForFunction(()=>/تمت تعبئة/.test(document.querySelector('#aiMsg').textContent),null,{timeout:20000});
 const f=await t.evaluate(()=>({type:$('#a_type_id').value,cat:$('#a_category_id').value,serial:$('#a_serial').value,model:$('#a_model').value,brand:$('#a_brand').value,cond:$('#a_condition_id').value,notes:$('#a_notes').value}));
 ok(f.type===pick.id&&!!f.cat,'type chosen through level 1 → 2 → 3 → asset ('+pick.ar+')');
 ok(f.serial==='SN-AI-1'&&f.model==='42QHC018'&&f.cond===pick.cond&&/سبليت/.test(f.notes),'serial, model, condition, notes filled');
 ok(f.brand==='LG','a field the supervisor filled is not overwritten');
 const c3=calls[calls.length-1];ok(c3.kind==='asset'&&c3.images.length===1&&c3.catalog.split('\n').length>=279&&c3.catalog.includes(pick.code+'|')&&c3.conditions.includes(pick.cond+'|'),'asset request: photo, catalog with codes, conditions');
 await t.screenshot({path:B+'/shots/nv55-asset-fill.png',fullPage:false});
 // the filled form saves normally
 await t.fill('#a_quantity','1');await t.selectOption('#a_parent_child','Parent');await t.click('#sb');await t.waitForSelector('#screen-success');await t.waitForTimeout(1200);
 const rec=M.db.nv_collections.find(c=>c.serial==='SN-AI-1');ok(rec&&rec.type_id===pick.id&&rec.model==='42QHC018','saved to the cloud with the filled data');
 // assistant switched off → no button, no form button
 M.db.nv_settings[0].data.ai={on:false,daily:5};await t.evaluate(async()=>{await Cloud.pull();location.hash='#employee-data'});await t.waitForTimeout(800);await t.evaluate(()=>ai55Sync());
 ok(!(await t.$eval('#ai55Btn',e=>e.classList.contains('on'))),'off again: button hidden');
 await t.screenshot({path:B+'/shots/nv55-home-phone.png'});
 ok(!errs.length,'no page errors '+errs.join(' | '));
 await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
