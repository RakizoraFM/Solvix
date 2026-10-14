// NV26: location check, photo review (approve / return / fix), asset link in the QR, nameplate reading (offline mode)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local',fs=require('fs');
(async()=>{
 const br=await chromium.launch();
 const ctx=await br.newContext({ignoreHTTPSErrors:true,permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:{width:1280,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 let promptText='صورة لوحة البيانات غير واضحة',dialogs=[];p.on('dialog',d=>{dialogs.push(d.message());d.type()==='prompt'?d.accept(promptText):d.accept()});
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 // helpers
 await p.goto(U+'#admin');await p.waitForSelector('#em');
 const u=await p.evaluate(()=>({plate:parsePlate('CARRIER\nMODEL: 53KHCT-24F\nS/N : 4119X77812\nCOOLING CAPACITY 24000 BTU/H\n220V 60Hz'),d:Math.round(geoDist([26.33,43.97],[26.40,43.97])),g1:parseGeo('26.3301, 43.9712'),g2:parseGeo('https://maps.google.com/@26.3301,43.9712,17z'),g3:parseGeo('abc')}));
 ok(u.plate.serial==='4119X77812'&&u.plate.model==='53KHCT-24F'&&/24000 BTU/.test(u.plate.capacity)&&u.plate.brand==='Carrier','nameplate parser '+JSON.stringify(u.plate));
 ok(u.d>7700&&u.d<7850&&u.g1.join()==='26.3301,43.9712'&&u.g2.join()==='26.3301,43.9712'&&u.g3===false,'distance '+u.d+' m, coordinates parser');
 // admin: location settings
 await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd');
 await p.goto(U+'#admin/settings');await p.waitForSelector('#geo_m');await p.fill('#geo_m','300');await p.click('#f button[type=submit]');await p.waitForSelector('.alert-success');
 ok(await p.evaluate(()=>S.settings.geo.m===300&&S.settings.geo.block===false),'settings: 300 m, warn only');
 // field: school far from where the photos are taken
 await p.goto(U+'#login');await p.waitForSelector('#employee-id');await p.fill('#employee-id','22912');await p.click('button[type=submit]');await p.waitForSelector('#screen-data');
 await p.click('text=تأكيد البيانات');await p.fill('#q','الضياء');await p.waitForSelector('#res li');await p.click('#res li >> nth=0');await p.setInputFiles('#school-image',B+'/a.png');await p.click('#next');
 await p.waitForSelector('#floor-select');const sid=await p.evaluate(()=>{const s=get('schools',sess().school);s.lat=26.40;s.lng=43.97;save('schools');return s.id});
 await p.selectOption('#floor-select','الأرضي');await p.selectOption('#room-number','1');await p.selectOption('#room-name',await p.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value));await p.click('#submit-btn');await p.waitForSelector('#a_category_id');
 const img=n=>({name:n+'.png',mimeType:'image/png',buffer:fs.readFileSync(B+'/'+n+'.png')});
 const fill=async()=>{await p.selectOption('#a_category_id',await p.$eval('#a_category_id',s=>s.options[2].value));await p.selectOption('#a_l2',{index:1});await p.selectOption('#a_l3',{index:1});await p.selectOption('#a_type_id',{index:1});
   await p.setInputFiles('#aimg',img('b'));await p.setInputFiles('#aimg2',img('a'));await p.fill('#a_quantity','1');await p.fill('#a_price','100');await p.selectOption('#a_condition_id',{index:1});await p.check('[name=parent_child][value=Parent]')};
 await fill();await p.waitForFunction(()=>/كم/.test(document.querySelector('[data-shot="0"] [data-geo]').textContent));
 ok(await p.$eval('[data-shot="0"] [data-geo]',e=>e.classList.contains('far')&&e.textContent.includes('⚠️')),'photo tile: far from the school ('+(await p.textContent('[data-shot="0"] [data-geo]'))+')');
 await p.screenshot({path:B+'/shots/60-geo-tiles.png',clip:{x:0,y:600,width:1280,height:420}});
 dialogs=[];await p.click('#sb');await p.waitForSelector('#screen-success');const c1=await p.evaluate(()=>S.collections.filter(c=>c.type_id).slice(-1)[0]);
 ok(dialogs.some(m=>m.includes('على بعد'))&&c1.geo_dist>7700&&c1.geo_dist<7900,'warned, saved with distance '+c1.geo_dist+' m');
 // block mode: not saved
 await p.evaluate(()=>{S.settings.geo={m:300,block:true};save('settings')});const n0=await p.evaluate(()=>S.collections.filter(c=>c.submitted_at).length);
 await p.click('#same');await p.waitForSelector('#a_category_id');await fill();await p.waitForFunction(()=>/كم/.test(document.querySelector('[data-shot="1"] [data-geo]').textContent));await p.click('#sb');
 await p.waitForFunction(()=>document.querySelector('#e_img').textContent.includes('على بعد'));ok(await p.evaluate(n=>S.collections.filter(c=>c.submitted_at).length===n,n0),'block mode: refused ('+(await p.textContent('#e_img')).slice(0,60)+')');
 // near the school → saved without a warning
 await p.evaluate(()=>{const s=get('schools',sess().school);s.lat=26.3302;s.lng=43.9701;save('schools')});
 await p.evaluate(()=>route());await p.waitForSelector('#a_category_id');await fill();await p.waitForFunction(()=>/ م من/.test(document.querySelector('[data-shot="0"] [data-geo]').textContent));
 dialogs=[];await p.click('#sb');await p.waitForSelector('#screen-success');const c2=await p.evaluate(()=>S.collections.filter(c=>c.type_id).slice(-1)[0]);
 ok(!dialogs.some(m=>m.includes('على بعد'))&&c2.geo_dist<300,'near the school: saved, '+c2.geo_dist+' m');await p.evaluate(()=>{S.settings.geo={m:300,block:false};save('settings')});
 // OCR on a drawn nameplate (needs the jsdelivr files)
 const ocr=await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=900;c.height=360;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,900,360);x.fillStyle='#000';x.font='bold 46px Arial';
   ['CARRIER','MODEL: 53KHCT24F','S/N: 4119X77812','CAPACITY 24000 BTU/H'].forEach((t,i)=>x.fillText(t,30,70+i*80));const b=await new Promise(r=>c.toBlob(r,'image/png'));
   try{return parsePlate(await Promise.race([ocrPlate(b),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),150000))]))}catch(e){return {err:String(e.message||e)}}});
 ok(ocr.serial==='4119X77812'&&ocr.brand==='Carrier','OCR read the plate '+JSON.stringify(ocr));
 // admin: review page
 await p.goto(U+'#admin/review');await p.evaluate(()=>route());await p.waitForSelector('[data-kpi=pending]');ok(+(await p.getAttribute('[data-kpi=pending]','data-val'))>=2&&+(await p.getAttribute('[data-kpi=far]','data-val'))>=1,'review KPIs: pending / far');
 await p.goto(U+'#admin/review?school='+sid);await p.evaluate(()=>route());await p.waitForSelector('.nv-rv');ok((await p.$$('.nv-rv')).length===2&&(await p.$$('.nv-rv img[data-photo]')).length===4,'school cards with both photos');
 await p.screenshot({path:B+'/shots/61-review.png',fullPage:true});
 const farId=c1.id;await p.click(`[data-ret="${farId}"]`);await p.waitForSelector('.alert-success');await p.click(`[data-ok="${c2.id}"]`);await p.waitForSelector('.alert-success');
 const rv=await p.evaluate(([a,b])=>[a,b].map(id=>{const c=S.collections.find(x=>x.id===id);return c.review_status+'|'+c.review_note}),[farId,c2.id]);
 ok(rv[0]==='returned|صورة لوحة البيانات غير واضحة'&&rv[1].startsWith('ok'),'returned with a note / approved: '+rv);
 // QR link → the asset page
 const lb=await p.evaluate(id=>{const c=S.collections.find(x=>x.id===id);return {q:qrText(c,['url']),l:assetLabel(c)}},c2.id);ok(lb.q.endsWith('#a/'+lb.l),'QR link only: '+lb.q);
 await p.goto(U+'#a/'+lb.l);await p.waitForFunction(id=>location.hash==='#admin/collections/'+id,c2.id);ok(true,'admin: link opens the asset page');
 // field: the returned asset, fixed → back to review
 await p.goto(U+'#employee-data');await p.waitForSelector('#retBox');ok((await p.textContent('#retBox')).includes('غير واضحة'),'supervisor sees the returned asset and the note');
 await p.goto(U+'#employee-data');await p.click('#retBox [data-ret]');await p.waitForSelector('#floor-select');await p.click('#submit-btn');await p.waitForSelector('.nv-ret');await p.click('#sb');await p.waitForSelector('#screen-success');
 ok(await p.evaluate(id=>S.collections.find(x=>x.id===id).review_status===null,farId),'fixed → back to review');
 ok(!errs.length,'no page errors '+errs.join(' | '));await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
