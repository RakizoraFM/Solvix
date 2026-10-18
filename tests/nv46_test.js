// NV46: «نموذج بيانات المباني» — hide / rename built-in building fields, own fields in the form, table, export, import and the building page (offline mode)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({acceptDownloads:true,viewport:{width:1366,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));let alerts=[];p.on('dialog',d=>{alerts.push(d.message());d.accept()});
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const xl=async dl=>p.evaluate(async b=>{await needXLSX();const wb=XLSX.read(Uint8Array.from(atob(b),c=>c.charCodeAt(0)),{type:'array'});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1})},require('fs').readFileSync(await dl.path()).toString('base64'));
 const mkFile=async aoa=>{await p.evaluate(()=>needXLSX());return Buffer.from(await p.evaluate(a=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(a),'S');return XLSX.write(wb,{type:'base64',bookType:'xlsx'})},aoa),'base64')};
 await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd [data-kpi=bar]');
 // default form = the NV45 form
 await p.goto(U+'#admin/schools/create');await p.waitForSelector('#f');
 ok(await p.evaluate(()=>['ident','name','moe','site','district','city','status','geo','description'].every(k=>document.getElementById(k))),'default building form unchanged');
 // settings tab
 await p.goto(U+'#admin/settings');await p.waitForSelector('.nv-set-tabs');ok(!!await p.$('.nv-set-tabs a[href="#admin/site-form"]'),'settings tab «نموذج بيانات المباني»');
 await p.click('.nv-set-tabs a[href="#admin/site-form"]');await p.waitForSelector('#sfF');
 ok(await p.$eval('[data-fon="ident"]',x=>x.disabled&&x.checked)&&await p.$eval('[data-fon="name"]',x=>x.disabled),'identifier and name cannot be hidden');
 await p.uncheck('[data-fon="moe"]');await p.uncheck('[data-fon="site"]');await p.fill('[data-fl="city"]','المدينة');await p.fill('[data-fl="name"]','اسم الموقع');
 await p.click('#sfAdd');await p.fill('[data-xl="0"]','نوع المبنى');await p.selectOption('[data-xt="0"]','select');await p.waitForSelector('[data-xo="0"]:not([disabled])');
 ok(await p.$eval('[data-fl="city"]',x=>x.value)==='المدينة'&&!(await p.$eval('[data-fon="moe"]',x=>x.checked)),'redraw keeps unsaved edits');
 await p.click('#sfSave');ok(alerts.pop()?.includes('اكتب خيارات القائمة'),'select field without options refused');
 await p.fill('[data-xo="0"]','إداري، سكني, تجاري');await p.check('[data-xr="0"]');
 await p.click('#sfAdd');await p.fill('[data-xl="1"]','عدد الأدوار');await p.selectOption('[data-xt="1"]','number');
 await p.click('#sfAdd');await p.fill('[data-xl="2"]','المدينة');await p.click('#sfSave');ok(alerts.pop()?.includes('مكرر'),'duplicate field name refused');
 await p.click('[data-xd="2"]');await p.click('#sfAdd');await p.fill('[data-xl="2"]','تاريخ الاستلام <b>');await p.selectOption('[data-xt="2"]','date');
 await p.click('#sfSave');await p.waitForSelector('.alert-success');
 const site=await p.evaluate(()=>S.settings.site);
 ok(site.fields.moe.on===false&&site.fields.site.on===false&&site.fields.city.l==='المدينة'&&site.fields.name.l==='اسم الموقع'&&site.extra.length===3,'form saved in S.settings.site');
 ok(site.extra[0].t==='select'&&site.extra[0].opts==='إداري, سكني, تجاري'&&site.extra[0].req&&site.extra[2].l==='تاريخ الاستلام b','options normalised, markup dropped from names');
 ok(await p.evaluate(()=>Cloud.settingsRow().site===S.settings.site),'site goes with the synced settings');
 await p.screenshot({path:B+'/shots/70-site-form.png',fullPage:true});
 // building form follows it
 await p.goto(U+'#admin/schools/create');await p.waitForSelector('#f');
 const ids=await p.$$eval('#f [name]',x=>x.map(y=>y.name));const K=site.extra.map(x=>'x_'+x.k);
 ok(!ids.includes('moe')&&!ids.includes('site')&&ids.includes('city')&&K.every(k=>ids.includes(k)),'form: hidden fields gone, own fields added');
 ok(await p.textContent('label[for="city"]')==='المدينة'&&(await p.textContent('label[for="name"]')).startsWith('اسم الموقع'),'form: renamed labels');
 ok(await p.$eval('#'+K[1],x=>x.type)==='number'&&await p.$eval('#'+K[2],x=>x.type)==='date'&&(await p.$$eval('#'+K[0]+' option',o=>o.map(x=>x.value))).join('|')==='|إداري|سكني|تجاري','field types: number, date, select');
 await p.fill('#ident','NV46-B1');await p.fill('#name','برج الإدارة');await p.fill('#city','بريدة');await p.click('#f button[type=submit]');
 ok(await p.$eval('#'+K[0],x=>x.classList.contains('is-invalid')),'required own field enforced');
 await p.selectOption('#'+K[0],'إداري');await p.fill('#'+K[1],'7');await p.fill('#'+K[2],'2026-01-15');await p.click('#f button[type=submit]');await p.waitForSelector('#nvt-schools');
 const b1=await p.evaluate(()=>S.schools.find(s=>s.ident==='NV46-B1'));
 ok(b1&&b1.extra[site.extra[0].k]==='إداري'&&b1.extra[site.extra[1].k]==='7'&&b1.extra[site.extra[2].k]==='2026-01-15','own values saved in school.extra');
 ok(await p.evaluate(id=>{const s=get('schools',id);return JSON.stringify(Cloud.canon('schools',s))},b1.id).then(j=>!j.includes('"extra"')),'offline / old DB: extra not in the sync row until the column is detected');
 // table
 const heads=await p.$$eval('#nvt-schools thead [data-sort]',x=>x.map(y=>y.dataset.sort));
 ok(!heads.includes('moe')&&K.every(k=>heads.includes(k)),'table: moe column hidden, own columns shown');
 ok((await p.textContent('#nvt-schools [data-sort="city"]')).includes('المدينة'),'table: renamed header');
 await p.fill('#nvt-schools [data-f="q"]','NV46-B1').catch(()=>{});
 await p.selectOption('#nvt-schools [data-f="'+K[0]+'"]','إداري');ok((await p.textContent('#nvt-schools [data-nvt="count"]')).startsWith('1 من'),'table: filter by own select field');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#nvt-schools [data-nvt="xl"]')]);const rows=await xl(dl);
 ok(rows[0].slice(-3).join('|')==='نوع المبنى|عدد الأدوار|تاريخ الاستلام b'&&rows[1].slice(-3).join('|')==='إداري|7|2026-01-15','export: own columns at the end');
 // import by field names
 const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#nvt-schools [data-nvt="imp"]')]);
 await fc.setFiles({name:'s.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await mkFile([['building_identifier','اسم الموقع','المدينة','نوع المبنى','عدد الأدوار'],['NV46-B1','','','سكني',''],['NV46-B2','مستودع الشمال','عنيزة','تجاري','2']])});
 await p.waitForSelector('.alert-success');
 const im=await p.evaluate(K=>{const a=S.schools.find(s=>s.ident==='NV46-B1'),b=S.schools.find(s=>s.ident==='NV46-B2');return {a:a.extra,b:b&&{name:b.name,city:b.city,extra:b.extra}}},K);
 ok(im.a[site.extra[0].k]==='سكني'&&im.a[site.extra[1].k]==='7'&&im.a[site.extra[2].k]==='2026-01-15','import: updates one own field, keeps the others');
 ok(im.b&&im.b.name==='مستودع الشمال'&&im.b.city==='عنيزة'&&im.b.extra[site.extra[1].k]==='2','import: renamed headers and own fields on a new building');
 // edit keeps values; building page shows them
 await p.goto(U+'#admin/schools/'+encodeURIComponent(b1.id)+'/edit');await p.waitForSelector('#f');ok(await p.$eval('#'+K[0],x=>x.value)==='سكني'&&await p.$eval('#'+K[1],x=>x.value)==='7','edit form shows saved values');
 await p.goto(U+'#admin/collections/building/'+encodeURIComponent(b1.id));await p.waitForSelector('.b43-meta');const meta=await p.textContent('.b43-meta');
 ok(meta.includes('نوع المبنى')&&meta.includes('سكني')&&meta.includes('المدينة')&&!meta.includes('رقم المبنى'),'building page follows the form');
 // reset
 await p.goto(U+'#admin/site-form');await p.waitForSelector('#sfF');await p.click('#sfReset');await p.waitForSelector('.alert-success');
 ok(await p.evaluate(()=>JSON.stringify(S.settings.site)==='{"fields":{},"extra":[]}'&&!!Cloud.settingsRow().site),'reset = empty form object (so the server copy is replaced)');
 await p.goto(U+'#admin/schools/create');await p.waitForSelector('#f');ok(await p.evaluate(()=>['moe','site'].every(k=>document.getElementById(k))&&!document.querySelector('[name^="x_"]')),'after reset the default form is back');
 ok(await p.evaluate(id=>Object.keys(get('schools',id).extra).length===3,b1.id),'reset keeps stored values');
 await p.setViewportSize({width:390,height:800});await p.goto(U+'#admin/site-form');await p.waitForSelector('#sfF');ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'phone width: no horizontal page scroll');
 console.log(errs.length?errs.join('\n'):'no console errors');if(errs.length)process.exitCode=1;await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
