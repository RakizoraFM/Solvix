// NV48: buildings map, table grouping, building PDF report, asset table display options, Arabic Excel headers (offline mode)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({acceptDownloads:true,viewport:{width:1366,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 await ctx.route(/tile\.openstreetmap\.org/,r=>r.abort());await ctx.addInitScript(()=>{window.print=()=>{window.__printed=1}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const go=async(h,sel)=>{await p.evaluate(h=>location.hash=h,h);await p.waitForSelector(sel)};
 const xl=async dl=>p.evaluate(async b=>{await needXLSX();const wb=XLSX.read(Uint8Array.from(atob(b),c=>c.charCodeAt(0)),{type:'array'});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1})},require('fs').readFileSync(await dl.path()).toString('base64'));
 await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd [data-kpi=bar]');
 // data: 3 buildings with coordinates (one completed), one located only by its assets' GPS; photos in IndexedDB
 const ids=await p.evaluate(async()=>{const sc=S.schools.slice(0,4);S.settings.site={fields:{},extra:[{k:'ty',l:'نوع المبنى',t:'select',opts:'إداري, سكني',req:false}]};save('settings');
  Object.assign(sc[0],{lat:26.33,lng:43.97,completed_at:now(),extra:{ty:'إداري'}});Object.assign(sc[1],{lat:26.35,lng:43.95,extra:{ty:'سكني'}});Object.assign(sc[2],{lat:26.30,lng:43.99});save('schools');
  const cv=document.createElement('canvas');cv.width=cv.height=40;const g=cv.getContext('2d');g.fillStyle='#2563eb';g.fillRect(0,0,40,40);const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg'));
  await IDB.put('photos','p48a',blob);await IDB.put('photos','p48b',blob);
  const t=S.types.find(x=>x.critical)||S.types[0],weak=S.conditions.find(c=>isWeak(c.id))||S.conditions[0];
  const mk=(s,o)=>Object.assign(newCollection(S.employees[0].id,s.id,null,{}),{category_id:t.cat,type_id:t.id,quantity:2,price:50,condition_id:weak.id,submitted_at:now()},o);
  S.collections.push(mk(sc[0],{asset_image:'p48a',school_image:'p48b',serial:'X1'}),mk(sc[1],{}),mk(sc[3],{lat:26.4,lng:44.0}));save('collections');reindex();return sc.map(s=>s.id)});
 // ---- map
 await go('#admin/map','#m48');await p.waitForFunction(()=>document.querySelector('#m48')._m48,null,{timeout:30000});
 ok(await p.$eval('[data-kpi="map"]',e=>e.dataset.val)==='1,2,1,2166','map legend: 1 completed, 2 in progress, 1 not started, 2166 without location');
 ok(await p.evaluate(()=>{let n=0;document.querySelector('#m48')._m48.eachLayer(l=>{if(l instanceof L.CircleMarker)n++});return n})===4,'4 dots on the map (one approximate from assets)');
 ok(!!await p.$('a[href="#admin/map"].active'),'sidebar item «خريطة المباني» active');
 await p.selectOption('#m48St','completed');await p.waitForFunction(()=>document.querySelector('[data-kpi="map"]').dataset.val.startsWith('1,0,0'));ok(true,'state filter');
 await p.selectOption('#m48St','');await p.waitForSelector('[data-m48x="ty"]');await p.selectOption('[data-m48x="ty"]','سكني');await p.waitForFunction(()=>document.querySelector('[data-kpi="map"]').dataset.val==='0,1,0,0');ok(true,'own-field filter on the map');
 await p.selectOption('[data-m48x="ty"]','');await p.waitForFunction(()=>document.querySelector('#m48')?._m48);
 await p.evaluate(id=>{document.querySelector('#m48')._m48.eachLayer(l=>{if(l.getPopup&&l.getPopup()&&String(l.getPopup().getContent()).includes(id))l.openPopup()})},encodeURIComponent(ids[0]));
 await p.waitForSelector('.nv48-pop');const pop=await p.textContent('.nv48-pop');ok(pop.includes('مكتملة')&&pop.includes('إداري')&&!!await p.$(`.nv48-pop a[href="#admin/collections/building/${encodeURIComponent(ids[0])}"]`),'popup: state, own field, link to the building');
 await p.screenshot({path:B+'/shots/90-map.png'});
 // ---- PDF report from the popup
 const [rp]=await Promise.all([ctx.waitForEvent('page'),p.click('.nv48-pop [data-r48]')]);await rp.waitForSelector('.kpis',{timeout:30000});
 const rt=await rp.textContent('body');const name=await p.evaluate(id=>get('schools',id).name,ids[0]);
 ok(rt.includes('تقرير أصول المبنى')&&rt.includes(name)&&rt.includes('نوع المبنى')&&rt.includes('إداري'),'report: title, building and own field');
 ok(rt.includes('حسب الحالة الفنية')&&rt.includes('أصول تحتاج صيانة')&&rt.includes('100')&&await rp.$$eval('.ph img',x=>x.length)===1&&!!await rp.$('img.bimg'),'report: totals, condition table, attention list, asset + building photos');
 await rp.screenshot({path:B+'/shots/91-report.png',fullPage:true,timeout:15000}).catch(()=>console.log('note: report screenshot skipped (web font still loading)'));await rp.close();
 // ---- building page: thumbnails + report button
 await go('#admin/collections/building/'+encodeURIComponent(ids[0]),'#b48-pdf');await p.waitForFunction(()=>document.querySelector('.b48-th')?.src?.startsWith('blob:'));ok(true,'building page: asset thumbnail + PDF button');
 // ---- asset table display options
 await go('#admin/collections','[data-nv48-view]');await p.selectOption('[data-nv48="p"]','l');await p.selectOption('[data-nv48="d"]','dense');
 ok(await p.$eval('section.i42',s=>s.classList.contains('nv48-p-l')&&s.classList.contains('nv48-dense')),'collections: large photos + compact rows');
 await p.reload();await p.waitForSelector('[data-nv48-view]');ok(await p.$eval('section.i42',s=>s.classList.contains('nv48-p-l'))&&await p.$eval('[data-nv48="d"]',s=>s.value)==='dense','display options remembered');
 await p.selectOption('[data-nv48="p"]','0');ok(await p.$eval('section.i42',s=>s.classList.contains('nv48-p-0')),'photos hidden');
 // ---- grouping
 await go('#admin/schools','#nvt-schools [data-nvt="group"]');await p.selectOption('#nvt-schools [data-nvt="group"]','work');await p.waitForSelector('#nvt-schools tr.nvt-g');
 const g=await p.$$eval('#nvt-schools tr.nvt-g',x=>x.map(y=>y.textContent.replace(/\s+/g,' ').trim()));
 ok(g.length===3&&g.some(t=>t.includes('مكتملة')&&t.includes('الإنجاز 100%')&&t.includes('2 أصل')),'group by work state: 3 headers with totals');
 ok(await p.$$eval('#nvt-schools tbody tr:not(.nvt-g)',x=>x.length)===0,'many rows: groups start folded');await p.click('#nvt-schools tr.nvt-g [data-nvg="مكتملة"]');
 await p.waitForFunction(()=>document.querySelector('#nvt-schools [data-nvg="مكتملة"]').getAttribute('aria-expanded')==='true');ok(await p.$$eval('#nvt-schools tbody tr:not(.nvt-g)',x=>x.length)===1,'open a group: its building shows');
 await p.selectOption('#nvt-schools [data-nvt="group"]','city');await p.waitForSelector('#nvt-schools tr.nvt-g');ok((await p.$$eval('#nvt-schools tr.nvt-g',x=>x.length))>3,'group by city');
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith('schools_last')))).group==='city'),'grouping kept in the table state / views');
 await p.screenshot({path:B+'/shots/92-group.png'});
 await p.selectOption('#nvt-schools [data-nvt="group"]','');await p.waitForFunction(()=>!document.querySelector('#nvt-schools tr.nvt-g'));
 // ---- Excel headers
 const [d1]=await Promise.all([p.waitForEvent('download'),p.click('#nvt-schools [data-nvt="xl"]')]);ok((await xl(d1))[0][1]==='Building Number','default English headers');
 await p.click('.user-menu > a');await p.click('[data-xl-lang="ar"]');ok(await p.evaluate(()=>xlLang())==='ar','user menu: Arabic headers');
 const [d2]=await Promise.all([p.waitForEvent('download'),p.click('#nvt-schools [data-nvt="xl"]')]);const h2=(await xl(d2))[0];ok(h2[1]==='رقم المبنى'&&h2[3]==='اسم المبنى'&&h2.at(-1)==='نوع المبنى','buildings Excel in Arabic');
 await go('#admin/data','#xa');const [d3]=await Promise.all([p.waitForEvent('download'),p.click('#xa')]);const r3=await xl(d3);ok(r3[0].includes('الرقم الوظيفي')&&r3[0].includes('رقم الأصل (Tag)')&&r3[0].length===await p.evaluate(()=>EXPORT_HEAD.length),'assets Excel in Arabic, same columns');
 ok(await p.evaluate(h=>{const o={};h.forEach((k,i)=>o[k]='v'+i);const r=xlFromAr([o])[0];return r['Employee #']&&r['Asset Type']&&r['Tag Number']&&r['Building Identifier']},r3[0]),'Arabic headers map back for import');
 await p.setViewportSize({width:390,height:800});await go('#admin/map','#m48');ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'map page: no horizontal scroll on a phone');
 console.log(errs.length?errs.join('\n'):'no console errors');if(errs.length)process.exitCode=1;await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
