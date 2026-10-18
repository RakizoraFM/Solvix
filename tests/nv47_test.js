// NV47: own building fields in the dashboard / analytics, missing-data column + bulk fill, saved table views (offline mode)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1366,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));let answer='';p.on('dialog',d=>d.type()==='prompt'?d.accept(answer):d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const go=async(h,sel)=>{await p.evaluate(h=>location.hash=h,h);await p.waitForSelector(sel)};
 await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd [data-kpi=bar]');
 // nothing new without own fields
 ok(!await p.$('[data-dx]')&&await p.$$eval('#dLoc option',o=>o.length)===2,'no own fields: dashboard unchanged');
 // form: required select «نوع المبنى» + text «المالك»; 3 buildings typed, 3 with assets
 const ids=await p.evaluate(()=>{S.settings.site={fields:{city:{on:true,l:'المدينة'}},extra:[{k:'ty',l:'نوع المبنى',t:'select',opts:'إداري, سكني',req:true},{k:'ow',l:'المالك',t:'text',opts:'',req:false}]};save('settings');
  const sc=S.schools.slice(0,4);sc[0].extra={ty:'إداري',ow:'أ'};sc[1].extra={ty:'إداري'};sc[2].extra={ty:'سكني',ow:'ب'};save('schools');
  const t=S.types.find(x=>x.code)||S.types[0];const mk=(s,q,pr)=>Object.assign(newCollection(S.employees[0].id,s.id,null,{}),{category_id:t.cat,type_id:t.id,quantity:q,price:pr,submitted_at:now()});
  S.collections.push(mk(sc[0],5,100),mk(sc[1],3,100),mk(sc[2],7,10));save('collections');return sc.map(s=>s.id)});
 // dashboard
 await go('#admin/schools','#nvt-schools');await go('#admin','.nvd [data-kpi=bar]');
 ok(await p.$$eval('[data-dx="ty"] option',o=>o.map(x=>x.value).join('|'))==='|إداري|سكني'&&!await p.$('[data-dx="ow"]'),'dashboard: filter for the select field only');
 await p.selectOption('[data-dx="ty"]','إداري');await p.waitForSelector('#dReset');
 ok(await p.$eval('[data-kpi="assets"]',e=>e.dataset.val)==='8','dashboard filter: assets of «إداري» buildings = 8');
 ok(await p.$eval('[data-kpi="bar"]',e=>e.dataset.val.split(',').map(Number).reduce((a,b)=>a+b,0))===2,'dashboard filter: 2 buildings in scope');
 await p.click('#dReset');await p.waitForFunction(()=>!document.querySelector('#dReset'));ok(await p.$eval('[data-kpi="assets"]',e=>e.dataset.val)==='15','reset clears the own-field filter');
 await p.selectOption('#dLoc','x:ty');await p.waitForFunction(()=>document.querySelector('#byLoc')?.textContent.includes('سكني'));
 const loc=await p.$eval('#byLoc',e=>e.textContent);ok(loc.includes('إداري')&&loc.includes('8')&&loc.includes('سكني')&&loc.includes('7'),'«الأصول حسب» an own field');
 const al=await p.$eval('.nv33-al',e=>e.textContent).catch(()=>'');ok(al.includes('مبانٍ بياناتها ناقصة')&&al.includes(await p.evaluate(()=>nf(2167))),'alert: buildings with a missing required field (2167)');
 await p.screenshot({path:B+'/shots/80-dash-ownfields.png'});
 // analytics
 await go('#admin/analytics','.a41');
 ok(await p.$('[data-a41-filter="bx_ty"]')&&!await p.$('[data-a41-filter="bx_ow"]'),'analytics: slicer for the select field');
 ok(await p.$eval('#a41-chart-dim',s=>[...s.options].some(o=>o.value==='bx_ow'&&o.textContent.includes('المالك'))),'analytics: own fields are dimensions');
 ok(await p.$eval('#a41-filters',e=>e.textContent.includes('المدينة')),'analytics: renamed city label');
 await p.selectOption('[data-a41-row="0"]','bx_ty');await p.waitForFunction(()=>document.querySelector('.a41-pivot tbody')?.textContent.includes('سكني'));
 const piv=await p.$eval('.a41-pivot tbody',e=>e.textContent);ok(piv.includes('إداري')&&piv.includes('سكني'),'pivot rows by an own field');
 await p.selectOption('[data-a41-filter="bx_ty"]',JSON.stringify('سكني'));await p.waitForFunction(()=>!document.querySelector('.a41-pivot tbody').textContent.includes('إداري'));
 ok((await p.$eval('.a41-kpis',e=>e.textContent)).includes('7'),'analytics filter by an own field: quantity 7');
 // schools: completeness + bulk fill
 await go('#admin/schools?missing=1','#nvt-schools [data-sort="miss"]');
 ok((await p.textContent('#nvt-schools [data-nvt="count"]'))==='2167 من 2170','link from the alert opens the missing buildings');
 await p.click('#nvt-schools [data-nvt="clear"]');await p.selectOption('#nvt-schools [data-f="miss"]','مكتملة');ok((await p.textContent('#nvt-schools [data-nvt="count"]')).startsWith('3 من'),'filter «مكتملة» = 3');
 await p.selectOption('#nvt-schools [data-f="miss"]','');
 await p.fill('#nvt-schools [data-f="ident"]',await p.evaluate(id=>get('schools',id).ident,ids[3]));await p.waitForFunction(()=>document.querySelector('#nvt-schools [data-nvt="count"]').textContent.startsWith('1 من'));
 await p.check('#nvt-schools [data-nvt="all"]');await p.click('#nvt-schools [data-nvb="fill"]');await p.waitForSelector('#nvFill.show');
 ok(await p.$eval('#nvFillK',s=>s.value)==='ty','fill: the missing required field is preselected');
 await p.selectOption('#nvFillV','سكني');await p.click('#nvFillF button[type=submit]');await p.waitForSelector('.alert-success');
 ok(await p.evaluate(id=>get('schools',id).extra.ty==='سكني',ids[3]),'bulk fill sets the value');
 // fill only empty keeps recorded values
 await p.evaluate(()=>{NVT.schools.sel.clear()});await go('#admin/schools','#nvt-schools');await p.click('#nvt-schools [data-nvt="clear"]');
 await p.selectOption('#nvt-schools [data-f="x_ty"]','إداري');await p.check('#nvt-schools [data-nvt="all"]');await p.click('#nvt-schools [data-nvb="fill"]');await p.waitForSelector('#nvFill.show');
 await p.selectOption('#nvFillK','ow');await p.fill('#nvFillV','ج');ok((await p.textContent('#nvFillN')).includes('1 من 2'),'fill: only empty ones counted');
 await p.click('#nvFillF button[type=submit]');await p.waitForSelector('.alert-success');
 ok(await p.evaluate(ids=>get('schools',ids[0]).extra.ow==='أ'&&get('schools',ids[1]).extra.ow==='ج',ids),'fill keeps recorded values');
 // saved views
 await p.evaluate(()=>NVT.schools.sel.clear());await go('#admin/schools','#nvt-schools');await p.click('#nvt-schools [data-nvt="clear"]');
 await p.selectOption('#nvt-schools [data-f="x_ty"]','سكني');await p.click('#nvt-schools [data-sort="name"]');
 await p.click('#nvt-schools [data-nvt="cols"]');await p.check('#nvt-schools [data-col="site"]');await p.waitForSelector('#nvt-schools [data-sort="site"]');
 answer='مباني سكنية';await p.click('#nvt-schools [data-nvt="views"]');await p.click('#nvt-schools [data-nvt="vsave"]');await p.waitForSelector('#nvt-schools [data-nvv="0"]',{state:'attached'});
 await p.click('#nvt-schools [data-nvt="clear"]');ok((await p.textContent('#nvt-schools [data-nvt="count"]'))==='2170 من 2170','filters cleared');
 await p.click('#nvt-schools [data-nvt="views"]');await p.click('#nvt-schools [data-nvv="0"]');await p.waitForFunction(()=>document.querySelector('#nvt-schools [data-nvt="count"]').textContent.startsWith('2 من'));
 ok(await p.evaluate(()=>NVT.schools.sort==='name'&&NVT.schools.f.x_ty==='سكني'&&!NVT.schools.hidden.has('site')),'open a saved view: filter, sort and column back');
 // last state survives a reload
 await p.reload();await p.waitForSelector('#nvt-schools tbody tr');ok((await p.textContent('#nvt-schools [data-nvt="count"]')).startsWith('2 من')&&!!await p.$('#nvt-schools [data-sort="site"]'),'reload: last table state restored');
 await p.click('#nvt-schools [data-nvt="views"]');await p.click('#nvt-schools [data-nvt="vreset"]');await p.waitForFunction(()=>document.querySelector('#nvt-schools [data-nvt="count"]').textContent==='2170 من 2170');
 ok(!await p.$('#nvt-schools [data-sort="site"]'),'default view: columns back');
 await p.click('#nvt-schools [data-nvt="views"]');await p.click('#nvt-schools [data-nvvdel="0"]');await p.waitForFunction(()=>!document.querySelector('#nvt-schools [data-nvv]'));ok(true,'delete a saved view');
 ok(await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('nv_tview_local_admin_schools')).length===2),'views stored per table and user');
 // URL query wins over the remembered state
 await go('#admin/schools?missing=1','#nvt-schools');await p.waitForFunction(()=>document.querySelector('#nvt-schools [data-nvt="count"]').textContent.startsWith('2166 من'));ok(true,'URL filter wins over the remembered state');
 await p.screenshot({path:B+'/shots/81-schools-views.png'});
 await p.setViewportSize({width:390,height:800});await go('#admin/schools','#nvt-schools');ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'phone width: no horizontal page scroll');
 console.log(errs.length?errs.join('\n'):'no console errors');if(errs.length)process.exitCode=1;await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
