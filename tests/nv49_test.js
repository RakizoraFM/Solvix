// NV49: the nameplate / serial photo is optional — the field form saves with the whole-asset photo only; it is not counted as missing data
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:{width:420,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 await ctx.route(/tile\.openstreetmap/,r=>r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 await p.goto(U);await p.waitForSelector('#employee-id');await p.fill('#employee-id','22912');await p.click('button[type=submit]');await p.waitForSelector('#screen-data');
 await p.click('text=تأكيد البيانات');await p.waitForSelector('#q');await p.fill('#q','الضياء');await p.waitForSelector('#res li');await p.click('#res li >> nth=0');
 await p.setInputFiles('#school-image',B+'/a.png');await p.click('#next');await p.waitForSelector('#floor-select');await p.selectOption('#floor-select','الأرضي');await p.selectOption('#room-number','1');
 const cls=await p.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value);await p.selectOption('#room-name',cls);await p.click('#submit-btn');await p.waitForSelector('#a_category_id');
 ok(await p.$eval('[data-shot="0"] b',b=>!!b.querySelector('.text-red-500')),'photo 1 (whole asset) marked required');
 ok(await p.$eval('[data-shot="1"] b',b=>!b.querySelector('.text-red-500')&&b.textContent.includes('اختيارية')),'photo 2 (nameplate) marked optional');
 const cat=await p.$eval('#a_category_id',s=>s.options[2].value);await p.selectOption('#a_category_id',cat);await p.selectOption('#a_l2',{index:1});await p.selectOption('#a_l3',{index:1});await p.selectOption('#a_type_id',{index:1});
 await p.fill('#a_quantity','1');await p.selectOption('#a_condition_id',{index:2});await p.selectOption('#a_parent_child','Parent');await p.fill('#a_serial','NV49-SN');
 const n0=await p.evaluate(()=>S.collections.filter(c=>c.submitted_at).length);
 await p.click('#sb');await p.waitForFunction(()=>document.querySelector('#e_img')?.textContent.includes('الأصل كاملاً'));ok(await p.evaluate(n=>S.collections.filter(c=>c.submitted_at).length===n,n0),'no photo at all: refused, asks for the whole-asset photo only');
 ok(!(await p.textContent('#e_img')).includes('لوحة البيانات'),'the message does not ask for the nameplate');
 await p.setInputFiles('#aimg',{name:'b.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/b.png')});await p.waitForSelector('[data-shot="0"].ok');
 await p.click('#sb');await p.waitForFunction(n=>S.collections.filter(c=>c.submitted_at).length===n+1,n0,{timeout:20000});
 const c=await p.evaluate(()=>{const c=S.collections.find(x=>x.serial==='NV49-SN');return {a:!!c.asset_image,b:!!c.asset_image2}});ok(c.a&&!c.b,'saved with the whole-asset photo only');
 // missing-data indicators ignore the nameplate
 const q=await p.evaluate(()=>{const c=S.collections.find(x=>x.serial==='NV49-SN');const f=I42.facts([c],{schools:S.schools,employees:S.employees,types:S.types,conditions:S.conditions,rooms:S.rooms},[])[0];const r=NV36.qualityLocal([Object.assign({},c,{review_status:'ok'})]);return {photos:f.photos,miss:f.missing,with:r.with_issues,ph:r.photos}});
 ok(!q.photos&&!q.miss,'inventory: no «نقص الصور» for a missing nameplate');ok(q.with===0&&q.ph===0,'data quality: not counted as an issue');
 console.log(errs.length?errs.join('\n'):'no console errors');if(errs.length)process.exitCode=1;await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
