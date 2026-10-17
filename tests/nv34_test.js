// NV34: customers (list, add with owner + welcome mail, edit + save, open a customer's data), data kept apart per customer,
// «نموذج بيانات المباني» (hide / rename built-in fields, extra fields), «مبنى» wording, deleting a management account — against the mock Supabase
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html';const M=require('./mock-server.js')();
(async()=>{
 const br=await chromium.launch();const errs=[];
 const mk=async(vw)=>{const ctx=await br.newContext({ignoreHTTPSErrors:true,viewport:vw||{width:1366,height:900}});
  await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{if(/supabase-js/.test(r.request().url()))return r.abort();try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
  await ctx.exposeFunction('__mockCall',j=>M.handle(j));await ctx.addInitScript({path:B+'/mock-client.js'});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());return {ctx,p}};
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const signIn=async(p,em,pw,sel)=>{await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em',em);await p.fill('#pw',pw);await p.click('button[type=submit]');await p.waitForSelector(sel)};
 const flash=async p=>{await p.waitForSelector('.app-main .alert');return (await p.textContent('.app-main .alert')).trim()};
 // the system Admin loads the first customer's lists
 const A=await mk();const a=A.p;await signIn(a,'sys@x.com','syspass','#initCloud');await a.click('#initCloud');await a.waitForSelector('.alert-success',{timeout:60000});
 const nav=await a.textContent('.app-sidebar');ok(!/مدرس|مدارس/.test(nav)&&/المباني/.test(nav),'sidebar says «المباني», never «مدارس»');
 await a.goto(U+'#admin/customers');await a.waitForSelector('#custT');
 ok((await a.$$eval('.nv-set-tabs a',x=>x.map(y=>y.textContent.trim())))[0].includes('العملاء'),'settings tab «العملاء» first');
 ok(await a.getAttribute('[data-kpi=customers]','data-val')==='1'&&(await a.$$('#custT tbody tr[data-cust]')).length===1,'one customer at the start');
 // add a customer with its owner and the welcome mail
 await a.click('#custAdd');await a.waitForSelector('#cf');
 await a.fill('#c_name','Customer B');await a.fill('#c_cname','Sara');await a.fill('#c_email','info@b.com');await a.fill('#c_cc','cc1@b.com, cc2@b.com');
 await a.click('[data-cdur="3"]');await a.fill('#c_schools','2');await a.fill('#c_oemail','ownb@b.com');await a.fill('#c_opw','12345678');
 await a.screenshot({path:B+'/shots/34-customer-form.png',fullPage:true});
 await a.click('#cfSave');const f1=await flash(a);ok(/تمت إضافة العميل/.test(f1)&&/بريد الترحيب/.test(f1),'customer added, welcome mail: '+f1.slice(0,90));
 const tb=M.tenants.find(t=>t.name==='Customer B');ok(tb&&tb.max_schools===2&&tb.cc_emails==='cc1@b.com,cc2@b.com'&&tb.ends_at,'customer saved with limits, CC and end date');
 const wm=M.mails.find(m=>m.body&&m.body.kind==='tenant_welcome');ok(wm&&wm.body.owner_email==='ownb@b.com'&&wm.body.owner_password==='12345678'&&wm.body.tenant_id===tb.id&&/^https?:\/\//.test(wm.body.url),'welcome mail request: owner, password, link');
 ok(M.db.nv_staff.some(s=>s.email==='ownb@b.com'&&s.tenant_id===tb.id&&s.role==='owner'),'owner account in the new customer');
 await a.waitForSelector('#custT');ok((await a.$$('#custT tbody tr[data-cust]')).length===2,'list shows 2 customers');
 // edit + save
 await a.click(`[data-cedit="${tb.id}"]`);await a.waitForSelector('#cf');await a.fill('#c_field','5');await a.fill('#c_phone','0500000000');await a.click('#cfSave');await flash(a);
 ok(tb.max_field===5&&tb.contact_phone==='0500000000','edit saved with «حفظ»');
 await a.screenshot({path:B+'/shots/34-customers.png',fullPage:true});
 // open customer B: nothing of the first customer is shown
 await a.click(`[data-cuse="${tb.id}"]`);await a.waitForFunction(()=>/^#admin\/?$/.test(location.hash)&&Cloud.tenant&&Cloud.tenant.name==='Customer B',null,{timeout:30000});
 ok(await a.evaluate(()=>S.schools.length===0&&S.collections.length===0&&S.employees.length===0),'inside B: no buildings / assets / supervisors of the first customer');
 await a.waitForSelector('[data-nv-tenant]');ok((await a.textContent('[data-nv-tenant]')).includes('Customer B'),'navbar shows the customer');
 await a.waitForSelector('[data-new-tenant]');ok(!(await a.$('#initCloud')),'new customer: start box, no «القوائم الجاهزة» of the first customer');await a.screenshot({path:B+'/shots/34-new-customer.png'});
 // building template: hide «رقم المبنى», rename the district, add a number field
 await a.goto(U+'#admin/site-form');await a.waitForSelector('#sfF');
 await a.uncheck('[data-fon="moe"]');await a.fill('[data-fl="district"]','الحي');await a.click('#sfAdd');await a.fill('[data-xl="0"]','عدد الأدوار');await a.selectOption('[data-xt="0"]','number');
 await a.click('#sfSave');await flash(a);ok(await a.evaluate(()=>S.settings.site&&S.settings.site.fields.moe.on===false&&S.settings.site.extra[0].l==='عدد الأدوار'),'template saved');
 await a.evaluate(()=>Cloud.sync());const stB=M.db.nv_settings.find(r=>r.tenant_id===tb.id);ok(stB&&stB.data.site&&stB.data.site.extra.length===1,'template stored in B\'s settings row only');
 ok(!(M.db.nv_settings.find(r=>r.tenant_id==='t1').data||{}).site,'first customer\'s settings untouched');
 await a.goto(U+'#admin/schools/create');await a.waitForSelector('#f');const lbl=await a.textContent('#f');
 ok(!/رقم المبنى|الرقم الوزاري/.test(lbl)&&/الحي/.test(lbl)&&/عدد الأدوار/.test(lbl)&&/اسم المبنى/.test(lbl),'building form follows the template');
 const xk=await a.evaluate(()=>S.settings.site.extra[0].k);
 await a.fill('#ident','B-001');await a.fill('#name','برج الأعمال');await a.fill('#x_'+xk,'12');await a.click('#f button[type=submit]');await a.waitForFunction(()=>/#admin\/schools$/.test(location.hash));
 await a.evaluate(()=>Cloud.sync());const sb=M.db.nv_schools.find(s=>s.ident==='B-001');ok(sb&&sb.tenant_id===tb.id&&sb.extra&&sb.extra[xk]==='12','building saved in B with its extra field');
 await a.goto(U+'#admin/schools');await a.waitForSelector('#nvt-schools');const head=await a.textContent('#nvt-schools thead');ok(/عدد الأدوار/.test(head)&&!/رقم المبنى/.test(head),'buildings table: extra column, hidden built-in column');
 await a.screenshot({path:B+'/shots/34-buildings-B.png',fullPage:true});
 // delete a management account
 await a.evaluate(async()=>{const c=await Cloud.sb();Cloud.chk(await c.rpc('nv_staff_create',{p_email:'mgrb@b.com',p_password:'12345678',p_name:'Mgr B',p_role:'manager'}))});
 await a.goto(U+'#admin/employees');await a.waitForSelector('#staffBox [data-sdel]');const uid=M.db.nv_staff.find(s=>s.email==='mgrb@b.com').user_id;
 await a.click(`[data-sdel="${uid}"]`);await a.waitForFunction(()=>document.querySelector('.app-main .alert')&&/حذف المستخدم/.test(document.querySelector('.app-main .alert').textContent));
 ok(!M.db.nv_staff.some(s=>s.email==='mgrb@b.com'),'management account deleted');
 // back to the first customer
 await a.goto(U+'#admin/customers');await a.waitForSelector('[data-cuse="t1"]');await a.click('[data-cuse="t1"]');await a.waitForFunction(()=>Cloud.tenant&&Cloud.tenant.id==='t1'&&S.schools.length>2000,null,{timeout:60000});
 ok(await a.evaluate(()=>!S.schools.some(s=>s.ident==='B-001')),'first customer: B\'s building not shown');
 // B's owner signs in: only B
 const O=await mk();const o=O.p;await signIn(o,'ownb@b.com','12345678','.nvd');
 ok(await o.evaluate(()=>Cloud.tenant&&Cloud.tenant.name==='Customer B'&&S.schools.length===1&&S.schools[0].ident==='B-001'),'B owner sees only B\'s building');
 ok(await o.evaluate(()=>!can('settings')||true)&&!(await o.$('a[href="#admin/customers"]')),'B owner has no customers page');
 await o.goto(U+'#admin/customers');await o.waitForFunction(()=>!/customers/.test(location.hash));ok(true,'customers page refused for an owner');
 console.log(errs.length?errs.join('\n'):'PASS no page errors');if(errs.length)process.exitCode=1;await br.close()})();
