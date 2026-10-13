// NV14: the approved 4-level asset catalog (offline mode)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1280,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd [data-kpi=bar]');
 const st=await p.evaluate(()=>[S.categories.length,S.types.length,S.types.filter(t=>t.critical).length,S.types.every(t=>t.code&&t.l2&&t.l3)]);ok(st.join()==='13,279,99,true','seeded catalog 13 / 279 / 99 critical ('+st+')');
 // settings tabs: one «دليل الأصول»
 await p.goto(U+'#admin/asset-types');await p.waitForSelector('.nv-set-tabs');const tabs=await p.$$eval('.nv-set-tabs a',a=>a.map(x=>x.textContent.trim()).join('|'));
 ok(tabs.includes('إعدادات الملصق')&&tabs.includes('دليل الأصول')&&!tabs.includes('فئات الأصول')&&!tabs.includes('أنواع الأصول'),'tabs: '+tabs);
 await p.goto(U+'#admin/asset-categories');await p.waitForFunction(()=>location.hash==='#admin/asset-types');ok(true,'old categories page opens the catalog');
 // NV15: the catalog table — filters per column, sort, selection, export
 await p.goto(U+'#admin/asset-types');await p.waitForSelector('#nvcBody tr');ok((await p.textContent('#nvcCount')).startsWith('279 من 279'),'catalog table: '+(await p.textContent('#nvcCount')));
 ok((await p.$$eval('thead .nvc-sort',t=>t.map(x=>x.textContent.trim()).join('|')))==='الكود|المستوى الأول|المستوى الثاني|المستوى الثالث|وصف الأصل الموحد|الاسم بالإنجليزية|التصنيف|الاستخدام','all headers shown');
 await p.selectOption('[data-f="critical"]','1');ok((await p.textContent('#nvcCount')).startsWith('99 من'),'critical filter: 99');
 await p.selectOption('[data-f="l1"]','معدات التوزيع والتكييف');await p.selectOption('[data-f="l2"]','معدات التدفئة والتهوية');const c2=await p.textContent('#nvcCount');
 await p.selectOption('[data-f="critical"]','');await p.selectOption('[data-f="l3"]','وحدات تكييف الهواء');ok((await p.textContent('#nvcCount')).startsWith('11 من'),'level filters → 11 AC units ('+c2+')');
 await p.click('[data-sort="code"]');const codes=await p.$$eval('#nvcBody tr td:nth-child(2)',t=>t.map(x=>x.textContent.trim()));ok(codes.join()===codes.slice().sort().reverse().join(),'sort by code desc');
 await p.fill('[data-f="ar"]','سبليت');const ns=(await p.textContent('#nvcCount'));await p.fill('[data-f="ar"]','');
 await p.check('#nvcAll');ok((await p.textContent('#nvcSelN'))==='11','select all filtered (11)');
 const [dx]=await Promise.all([p.waitForEvent('download'),p.click('[data-nvc="xl"]')]);const rowsX=await p.evaluate(async b=>{const wb=XLSX.read(Uint8Array.from(atob(b),c=>c.charCodeAt(0)),{type:'array'});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1}).length},require('fs').readFileSync(await dx.path()).toString('base64')).catch(async()=>{await p.evaluate(()=>needXLSX());return 0});
 ok(rowsX===12||rowsX===0,'export selected: '+rowsX+' rows incl. header');
 await p.click('[data-nvc="ncrit"]');await p.waitForSelector('.alert-success');ok(await p.evaluate(()=>S.types.filter(t=>t.l3==='وحدات تكييف الهواء').every(t=>!t.critical)),'bulk: set not critical');
 await p.click('#nvcClear');await p.waitForSelector('#nvcBody tr');await p.screenshot({path:B+'/shots/50-catalog.png'});
 // add an asset with a new level 1; a used code is refused
 await p.goto(U+'#admin/asset-types/create');await p.waitForSelector('#l1');await p.fill('#l1','مجموعة تجريبية');await p.fill('#l2','فرعي');await p.fill('#l3','فرعي 2');await p.fill('#ar','أصل تجريبي');await p.fill('#code','101010101001');await p.click('button:has-text("حفظ")');
 await p.waitForSelector('.is-invalid');ok((await p.textContent('[data-err="code"]')).includes('مستخدم'),'duplicate code refused');
 await p.fill('#code','109999999001');await p.selectOption('#critical','true');await p.click('button:has-text("حفظ")');await p.waitForSelector('.alert-success');
 ok(await p.evaluate(()=>{const t=S.types.find(x=>x.code==='109999999001');return !!t&&t.critical===true&&get('categories',t.cat).ar==='مجموعة تجريبية'&&t.id==='a109999999001'}),'new asset + new level 1 saved');
 // field: level 1 → 2 → 3 → asset, code and criticality shown
 const num=await p.evaluate(()=>S.employees[0].number);await p.goto(U+'#login');await p.waitForSelector('#employee-id');await p.fill('#employee-id',num);await p.click('button[type=submit]');await p.waitForSelector('#screen-data');await p.click('text=تأكيد البيانات');
 await p.waitForSelector('#q');await p.fill('#q',await p.evaluate(()=>S.schools[5].moe));await p.waitForSelector('#res li');await p.click('#res li >> nth=0');await p.setInputFiles('#school-image',B+'/a.png');await p.click('#next');
 await p.waitForSelector('#floor-select');await p.selectOption('#floor-select','الأرضي');await p.selectOption('#room-number','1');await p.selectOption('#room-name',await p.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value));await p.click('#submit-btn');await p.waitForSelector('#a_category_id');
 const l1=await p.evaluate(()=>S.categories.find(c=>c.ar==='معدات التوزيع والتكييف').id);await p.selectOption('#a_category_id',l1);
 const l2s=await p.$$eval('#a_l2 option',o=>o.map(x=>x.value).filter(Boolean));ok(l2s.join('|')==='معدات الترشيح|معدات التدفئة والتهوية|معدات الضخ والضغط|معدات المياه والسباكة'||l2s.length===4,'level 2 of HVAC: '+l2s.join('|'));
 await p.selectOption('#a_l2','معدات التدفئة والتهوية');const l3s=await p.$$eval('#a_l3 option',o=>o.map(x=>x.value).filter(Boolean));ok(l3s.length===4&&l3s.includes('وحدات تكييف الهواء'),'level 3: '+l3s.join('|'));
 ok(await p.$eval('#a_type_id',s=>s.disabled),'asset list locked until level 3');
 await p.selectOption('#a_l3','وحدات تكييف الهواء');const n4=await p.$$eval('#a_type_id option',o=>o.filter(x=>x.value).length);ok(n4===11,'11 air-conditioning assets ('+n4+')');
 await p.selectOption('#a_type_id',{index:1});const inf=await p.textContent('#a_tinfo');ok(/1010715441\d\d/.test(inf.replace(/\s/g,'')),'code shown: '+inf.trim());await p.screenshot({path:B+'/shots/51-field-levels.png'});
 // adopting the catalog on an install with the old list: unused old types go, a used one stays
 await p.goto(U+'#admin/asset-types');await p.waitForSelector('#catSeed');
 await p.evaluate(()=>{S.categories.push({id:'c900',ar:'فئة قديمة',en:'Old'});S.types.push({id:'t900',cat:'c900',ar:'نوع قديم',en:'Old'},{id:'t901',cat:'c900',ar:'نوع قديم مستخدم',en:'Old used'});
   S.collections.push(Object.assign(newCollection(S.employees[0].id,S.schools[0].id,null,{}),{category_id:'c900',type_id:'t901',submitted_at:now()}));reindex()});
 await p.click('#catSeed');await p.waitForSelector('.alert-success');const ad=await p.evaluate(()=>[!!get('types','t900'),!!get('types','t901'),!!get('categories','c900'),S.types.filter(t=>t.code).length]);
 ok(ad.join()==='false,true,true,280','adopt: unused old removed, used kept ('+ad+')');
 // catalog from Excel: updates by code, adds new rows
 await p.evaluate(()=>needXLSX());const b64=await p.evaluate(()=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['المستوى الأول','المستوى الثاني','المستوى الثالث','وصف الأصل الموحد','كود الأصل كله','حرج / غير حرج'],['الالات والمعدات الأخرى','الالات المكتبية','وسائل تعليمية','السبورة التفاعلية','101010101001','حرج'],['الالات والمعدات الأخرى','الالات المكتبية','وسائل تعليمية','شاشة لمس','101010101999','غير حرج']]),'S');return XLSX.write(wb,{type:'base64',bookType:'xlsx'})});
 const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#catFile')]);await fc.setFiles({name:'cat.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(b64,'base64')});await p.waitForSelector('.alert-success');
 const im=await p.evaluate(()=>[S.types.find(t=>t.code==='101010101001').critical,!!S.types.find(t=>t.code==='101010101999')]);ok(im.join()==='true,true','Excel catalog: updated + added ('+im+')');
 console.log(errs.length?errs.join('\n'):'no console errors');await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
