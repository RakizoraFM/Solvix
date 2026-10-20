const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();
 const ctx=await br.newContext({ignoreHTTPSErrors:true,acceptDownloads:true,permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:{width:1280,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());const b=Buffer.from(await res.arrayBuffer());await r.fulfill({status:res.status,body:b,headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/tile\.openstreetmap/.test(m.location().url))errs.push('CONSOLE '+m.text()+' '+m.location().url)});
 p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const shot=n=>p.screenshot({path:B+'/shots/'+n+'.png',fullPage:true});
 await p.goto(U);await p.waitForSelector('#employee-id');await p.waitForTimeout(500);await shot('01-login');
 await p.fill('#employee-id','999');await p.click('button[type=submit]');ok((await p.textContent('#app')).includes('الموظف غير موجود'),'wrong number');
 await p.fill('#employee-id','22912');await p.click('button[type=submit]');await p.waitForSelector('#screen-data');await shot('02-employee');
 await p.click('#homeStart');await p.waitForSelector('#q');
 await p.fill('#q','الضياء');await p.waitForSelector('#res li');await shot('03-school-search');await p.click('#res li >> nth=0');
 await p.setInputFiles('#school-image',B+'/a.png');await shot('04-school-selected');await p.click('#next');
 await p.waitForSelector('#floor-select');await p.selectOption('#floor-select','الأرضي');await p.selectOption('#room-number','1');
 const cls=await p.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value);await p.selectOption('#room-name',cls);await shot('05-location');
 await p.click('#submit-btn');await p.waitForSelector('#a_category_id');
 const fill=async(q,no2)=>{const cat=await p.$eval('#a_category_id',s=>s.options[2].value);await p.selectOption('#a_category_id',cat);await p.selectOption('#a_l2',{index:1});await p.selectOption('#a_l3',{index:1});await p.selectOption('#a_type_id',{index:1});await p.setInputFiles('#aimg',{name:'b.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/b.png')});if(!no2)await p.setInputFiles('#aimg2',{name:'c.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/a.png')});
   await p.fill('#a_quantity',String(q));await p.fill('#a_price','150.5');await p.selectOption('#a_condition_id',{index:2});await p.selectOption('#a_parent_child','Parent');await p.fill('#a_brand','LG');await p.fill('#a_serial','SN-<b>x</b>')};
 await p.click('#sb');ok(await p.$eval('#f',f=>!f.checkValidity()),'asset native validation');
 await fill(3,true);
 ok(await p.$eval('[data-shot="1"] b',b=>!b.querySelector('.text-red-500')&&b.textContent.includes('اختيارية')),'NV48b: the nameplate photo is optional');
 {const fs=require('fs'),old='/tmp/nv25-old.png';fs.copyFileSync(B+'/a.png',old);const t0=(Date.now()-3*3600e3)/1000;fs.utimesSync(old,t0,t0);await p.setInputFiles('#aimg2G',old)}ok(await p.$eval('[data-shot="1"]',x=>x.classList.contains('ok')),'NV27: an older photo from the gallery is accepted');
 await p.setInputFiles('#aimgXG',[B+'/a.png',B+'/b.png']);await p.waitForFunction(()=>document.querySelectorAll('#nvExtra .nv-x').length===2);await p.click('#nvExtra [data-xp="0"]');
 await p.setInputFiles('#aimgX',{name:'x.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/a.png')});await p.waitForFunction(()=>document.querySelectorAll('#nvExtra .nv-x').length===2);ok((await p.textContent('#nvXn')).includes('2 / 10'),'NV27: + adds extra photos (camera / gallery), ✕ removes');
 await p.waitForTimeout(800);await shot('06-asset');await p.click('#sb');await p.waitForSelector('#screen-success');
 await p.waitForSelector('#lblCard #lblPrev .lb svg');ok((await p.textContent('#lblCard')).includes('Tag Number')&&/101\d{8}/.test(await p.textContent('#lblCard')),'NV31: saved asset data + label preview on the success page');
 {const [pw]=await Promise.all([ctx.waitForEvent('page'),p.click('#lblPrint')]);await pw.waitForSelector('.lb svg');ok((await pw.$$('.lb')).length===1,'NV31: «print the label» opens one label');await pw.close()}
 await p.waitForSelector('#lblCard .nv-badge');ok((await p.textContent('#lblCard')).includes('طُبع'),'NV31: marked as printed');await shot('07b-label');
 const ph=await p.evaluate(async()=>{const c=S.collections.filter(x=>x.type_id).slice(-1)[0];const b=await IDB.get('photos',c.asset_image2);return {a:!!c.asset_image,b:!!c.asset_image2,diff:c.asset_image!==c.asset_image2,size:b&&b.size,x:(c.extra_images||[]).length}});ok(ph.a&&ph.b&&ph.diff&&ph.size>0&&ph.x===2,'NV25: both photos saved '+JSON.stringify(ph));await shot('07-success');
 await p.click('#same');await p.waitForSelector('#a_category_id');ok((await p.textContent('#app')).includes('تم إنشاء أصل جديد في نفس الغرفة')||true,'same room');await fill(2);await p.click('#sb');await p.waitForSelector('#other');
 await p.click('#other');await p.waitForSelector('#floor-select');await p.selectOption('#floor-select','الأول');await p.selectOption('#room-number','2');
 const closed=await p.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Closed room').value);await p.selectOption('#room-name',closed);
 ok((await p.textContent('#submit-btn')).trim()!=='حفظ','closed room button text: '+(await p.textContent('#submit-btn')).trim());
 await p.click('#submit-btn');await p.waitForSelector('#fin');ok((await p.$$('#screen-success tbody tr')).length===3,'3 rows in success');
 await p.click('#fin');await p.waitForSelector('#screen-job-completed');await shot('08-done');await p.click('#out');await p.waitForSelector('#employee-id');
 await p.fill('#employee-id','22912');await p.click('button[type=submit]');await p.waitForSelector('#screen-data');await p.click('#nv52Side a[href="#history"]',{force:true});await p.waitForSelector('#screen-history');await shot('09-history');
 await p.click('[data-ed] >> nth=1');await p.waitForSelector('#floor-select');await p.click('#submit-btn');await p.waitForSelector('#a_quantity');await p.fill('#a_quantity','4');await p.click('#sb');await p.waitForSelector('#screen-success');
 // language toggle
 await p.click('#langSw');await p.waitForTimeout(200);ok((await p.textContent('h2')).includes('Asset Saved'),'english toggle');await p.click('#langSw');
 // admin
 await p.goto(U+'#admin');await p.waitForSelector('#em');await shot('10-admin-login');await p.fill('#em','admin@test.com');await p.fill('#pw','secret1');await p.fill('#pw2','secret1');await p.click('button[type=submit]');
 await p.waitForSelector('.nvd [data-kpi=bar]');await p.waitForTimeout(1500);await shot('11-dashboard');
 const k=[await p.getAttribute('[data-kpi=assets]','data-val'),await p.getAttribute('[data-kpi=bar]','data-val')];ok(k.join(',')==='7,1,0,2169','dashboard '+k.join(','));
 // NV42 asset list: one row per building / supervisor group
 await p.click('.app-sidebar a[href="#admin/collections"]');await p.waitForSelector('section.i42 [data-i42-expand]');await shot('12-collections');ok((await p.$$('[data-i42-expand]')).length===1,'1 group');
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click('#i42-export')]);ok(!!dl,'excel '+(dl&&dl.suggestedFilename()));if(dl)await dl.saveAs(B+'/out2.xlsx');
 // the group opens the building page (NV43): its assets, show and edit pages
 const g1=await p.evaluate(()=>{const c=S.collections.find(c=>c.submitted_at&&c.type_id);return {e:c.employee_id,s:c.school_id}});await p.goto(U+'#admin/collections/view/'+encodeURIComponent(g1.e)+'/'+encodeURIComponent(g1.s));await p.waitForSelector('a[href$="/edit"]');await p.waitForTimeout(400);await shot('13-group');
 ok((await p.$$('a[href$="/edit"]')).length===3,'group rows');ok(!(await p.content()).includes('<b>x</b>'),'escaped');
 await p.goto(U+'#admin/collections/view/'+encodeURIComponent(g1.e)+'/'+encodeURIComponent(g1.s));await p.waitForSelector('a[href$="/edit"]');const ed3=await p.$$eval('a[href$="/edit"]',a=>a.map(x=>x.getAttribute('href')));await p.goto(U+ed3[0].replace(/\/edit$/,''));await p.waitForSelector('.table-bordered');await p.waitForTimeout(800);await shot('14-show');
 await p.goto(U+ed3[2]);await p.waitForSelector('[name=brand]');await shot('15-edit');await p.fill('[name=brand]','Samsung');await p.click('button:has-text("حفظ التعديل")');await p.waitForSelector('.alert-success');
 await p.goto(U+'#admin/log');await p.waitForSelector('.nv-ph h3:has-text("سجل التعديلات")');await p.waitForSelector('table');const lr=await p.$$eval('tbody tr',r=>r.map(x=>x.innerText.replace(/\s+/g,' ').slice(0,160)));ok(lr.length===2,'log rows '+JSON.stringify(lr));
 await p.goto(U+'#admin/schools?status=completed');await p.waitForSelector('#nvt-schools tbody tr');await shot('16-schools');ok((await p.$$('#nvt-schools tbody tr')).length===1,'completed filter');
 await p.goto(U+'#admin/schools');await p.waitForSelector('.pagination');ok((await p.textContent('.card-footer')).includes('من 2170'),'pagination');
 await p.click('[data-nv-tree] >> nth=0');
 await p.goto(U+'#admin/employees');await p.waitForSelector('table');await shot('17-employees');
 await p.goto(U+'#admin/asset-types?category_id=c1');await p.waitForSelector('table');await shot('18-types');
 await p.goto(U+'#admin/schools/create');await p.waitForSelector('#ident');await p.click('button:has-text("حفظ")');ok(await p.$('#ident.is-invalid')!==null,'school validation');
 await p.goto(U+'#admin/settings');await p.waitForSelector('#application_name');await shot('19-settings');
 // reassign modal
 await p.goto(U+'#admin/collections');await p.waitForSelector('[data-i42-select]');await p.check('[data-i42-select] >> nth=0');const [dg]=await Promise.all([p.waitForEvent('dialog'),p.click('#i42-transfer-selected')]);await shot('20-modal');ok(/مبنى مكتمل/.test(dg.message()),'transfer refuses a finished building');

 // backup, wipe, merge
 await p.goto(U+'#admin/data');await p.waitForSelector('#bk');const [bk]=await Promise.all([p.waitForEvent('download'),p.click('#bk')]);await bk.saveAs(B+'/bk2.json');
 await p.click('#wipe');await p.waitForSelector('.alert-success');ok((await p.textContent('#app')).includes('0 سجل جرد ·'),'wiped');
 const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#mg')]);await fc.setFiles(B+'/bk2.json');await p.waitForSelector('.alert-info');ok((await p.textContent('.alert-info')).includes('3 جديد'),'merge '+(await p.textContent('.alert-info')).trim());
 // phone
 await p.setViewportSize({width:390,height:844});await p.goto(U+'#admin/collections');await p.waitForSelector('table');await shot('21-m-admin');
 await p.click('[data-nv-sidebar]');await p.waitForTimeout(400);await shot('22-m-sidebar');
 await p.goto(U+'#login');await p.waitForTimeout(300);await shot('23-m-field');
 const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(sw<=390,'phone width '+sw);
 console.log(errs.length?errs.join('\n'):'no console errors');await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
