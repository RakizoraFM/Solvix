// NV30: room templates, «like the previous», duplicate warnings, label scanning (offline mode)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local',fs=require('fs');
(async()=>{
 const br=await chromium.launch();
 const ctx=await br.newContext({ignoreHTTPSErrors:true,permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:{width:1280,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 let mode='accept',dialogs=[];p.on('dialog',d=>{dialogs.push(d.message());mode==='dismiss'&&d.type()==='confirm'?d.dismiss():d.accept()});
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 await p.goto(U+'#admin');await p.waitForSelector('#em');
 const q=await p.evaluate(()=>[labelFromQR('https://x/index.html#a/10100000031'),labelFromQR('📍 موقع الأصل\nTag Number: 10100000042\n…'),labelFromQR('10100000007'),labelFromQR('hello')]);
 ok(q.join()==='10100000031,10100000042,10100000007,','QR text → Tag Number '+q.join());
 // admin: a template for «Class»
 await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd');
 const cls=await p.evaluate(()=>S.rooms.find(r=>r.en==='Class').id);const tt=await p.evaluate(()=>S.types.filter(t=>t.code).slice(0,2).map(t=>({id:t.id,l:t.ar+' — '+t.code})));
 await p.goto(U+'#admin/room-templates?room='+cls);await p.evaluate(()=>route());await p.waitForSelector('#rtAdd');
 ok((await p.textContent('.nv-set-tabs')).includes('قوالب الغرف'),'settings tab «قوالب الغرف»');
 for(const t of tt){await p.fill('#rtAdd',t.l);await p.click('#rtAddBtn')}await p.fill('[data-rq="1"]','3');await p.click('#rtSave');await p.waitForSelector('.alert-success');
 ok(await p.evaluate(([c,a,b])=>{const x=(S.settings.room_tpl||{})[c];return x&&x.length===2&&x[0].t===a&&x[1].t===b&&x[1].q===3},[cls,tt[0].id,tt[1].id]),'template saved (2 assets, qty 3)');
 await p.screenshot({path:B+'/shots/80-room-tpl.png',fullPage:true});
 // field: the template on a new asset in a «Class» room
 await p.goto(U+'#login');await p.waitForSelector('#employee-id');await p.fill('#employee-id','22912');await p.click('button[type=submit]');await p.waitForSelector('#screen-data');
 await p.click('#homeStart');await p.fill('#q','الضياء');await p.waitForSelector('#res li');await p.click('#res li >> nth=0');await p.setInputFiles('#school-image',B+'/a.png');await p.click('#next');
 await p.waitForSelector('#floor-select');await p.selectOption('#floor-select','الأرضي');await p.selectOption('#room-number','1');await p.selectOption('#room-name',cls);await p.click('#submit-btn');await p.waitForSelector('#tplBox');
 ok((await p.$$('#tplBox [data-tplon]')).length===2&&(await p.textContent('#tplGo')).includes('(2)'),'template offered on the new asset');await p.screenshot({path:B+'/shots/81-tpl-field.png',fullPage:true});
 await p.click('#tplGo');await p.waitForSelector('#a_category_id');ok(await p.$eval('#a_type_id',s=>s.value)===tt[0].id&&!(await p.$('#tplBox'))&&(await p.textContent('.nv-tplnote')).includes('1'),'first template asset opened ready');
 const img=n=>({name:n+'.png',mimeType:'image/png',buffer:fs.readFileSync(B+'/'+n+'.png')});
 const finish=async(sn)=>{await p.setInputFiles('#aimg',img('b'));await p.setInputFiles('#aimg2',img('a'));await p.selectOption('#a_condition_id',{index:1});await p.selectOption('#a_parent_child','Parent');if(sn!=null)await p.fill('#a_serial',sn);await p.fill('#a_brand',await p.$eval('#a_brand',x=>x.value)||'LG')};
 await finish('SN-1001');await p.click('#sb');await p.waitForSelector('#tplNext');ok((await p.textContent('#tplNext')).includes('1'),'success page: «next from the template»');
 await p.click('#tplNext');await p.waitForSelector('#a_category_id');ok(await p.$eval('#a_type_id',s=>s.value)===tt[1].id&&await p.$eval('#a_quantity',x=>x.value)==='3','second template asset: type + qty 3');
 await finish('SN-2002');await p.click('#sb');await p.waitForSelector('#like');ok(!(await p.$('#tplNext')),'template finished');
 // «like the previous»
 await p.click('#like');await p.waitForSelector('#a_category_id');
 ok(await p.$eval('#a_type_id',s=>s.value)===tt[1].id&&await p.$eval('#a_brand',x=>x.value)==='LG'&&await p.$eval('#a_serial',x=>x.value)===''&&!(await p.$('[data-shot="0"].ok')),'like the previous: type + brand copied, serial and photos empty');
 // the same serial → warning (cancel = not saved)
 await finish('sn 2002');mode='dismiss';dialogs=[];const n0=await p.evaluate(()=>S.collections.filter(c=>c.submitted_at).length);await p.click('#sb');await p.waitForTimeout(800);
 ok(dialogs.some(m=>m.includes('مسجّل لأصل آخر'))&&await p.evaluate(()=>S.collections.filter(c=>c.submitted_at).length)===n0,'duplicate serial warned, cancel keeps it unsaved');
 // another serial, same type in the same room minutes ago → second warning; accept saves
 await p.fill('#a_serial','SN-3003');mode='accept';dialogs=[];await p.click('#sb');await p.waitForSelector('#screen-success');
 ok(dialogs.some(m=>m.includes('في نفس الغرفة قبل')),'same asset in the same room a few minutes ago: warned');
 // scanning: a supervisor's own asset opens its card with «update»
 const lb=await p.evaluate(()=>assetLabel(S.collections.filter(c=>c.submitted_at&&c.type_id).slice(-1)[0]));
 await p.evaluate(l=>onScanText('https://rakizorafm.github.io/Solvix/#a/'+l),lb);await p.waitForSelector('#cardEdit');ok((await p.textContent('#app')).includes(lb),'scan → asset card with «update» ('+lb+')');
 ok(!!(await p.$('#scanQR')),'scan button in the header');
 // admin review: duplicate serial badge
 await p.evaluate(()=>{const L=S.collections.filter(c=>c.submitted_at&&c.type_id);L[1].serial='SN-1001';save('collections')});
 const sid=await p.evaluate(()=>S.collections.find(c=>c.submitted_at&&c.type_id).school_id);await p.goto(U+'#admin/review?school='+sid+'&st=all');await p.evaluate(()=>route());await p.waitForSelector('.nv-rv');
 ok((await p.$$('[data-dup]')).length===2,'review: duplicate serial badge on both assets');
 ok(!errs.length,'no page errors '+errs.join(' | '));await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
