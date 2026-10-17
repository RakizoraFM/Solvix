// NV12: labels + QR, school report, category drill-down, collections import, notifications, field directory filters (offline mode)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();
 const ctx=await br.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const dlg=[];p.on('dialog',d=>{dlg.push(d.message());d.accept()});
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd [data-kpi=bar]');
 // seed: 2 field supervisors, 2 schools, 5 submitted assets (two categories), one finished school and one edit of a submitted asset
 const ids=await p.evaluate(()=>{const e1=S.employees[0],e2=S.employees[1],s1=S.schools[0],s2=S.schools[1];const ty=S.types.filter(t=>t.cat===S.types[0].cat).slice(0,2).concat(S.types.filter(t=>t.cat!==S.types[0].cat).slice(0,1));
   const mk=(e,s,t,q,pr)=>Object.assign(newCollection(e.id,s.id,null,{}),{floor:'الأرضي',room_number:'3',room_name_id:S.rooms[0].id,category_id:t.cat,type_id:t.id,condition_id:S.conditions[0].id,quantity:q,price:pr,status:'Works',parent_child:'Parent',submitted_at:now()});
   const L=[mk(e1,s1,ty[0],2,100),mk(e1,s1,ty[1],1,50),mk(e1,s1,ty[2],4,10),mk(e2,s2,ty[0],3,100),mk(e2,s2,ty[2],1,null)];S.collections.push(...L);save('collections');
   s1.completed_at=now();s1.completed_by=e1.id;save('schools');S.log.unshift({id:'l1',at:now(),by:'emp:'+e1.id,school:s1.id,coll:L[0].id,changes:{quantity:{old:1,new:2}}});save('log');
   return {e1:e1.id,s1:s1.id,s1moe:s1.moe,s1ident:s1.ident,c0:L[0].id,cat0:ty[0].cat,e1num:e1.number,s2ident:s2.ident,type0:ty[0]}});
 // NV23: dashboard KPIs, progress bar, filters
 await p.goto(U+'#admin');await p.evaluate(()=>route());await p.waitForSelector('[data-kpi=bar]');const kb=await p.getAttribute('[data-kpi=bar]','data-val'),ka=await p.getAttribute('[data-kpi=assets]','data-val');ok(kb==='1,1,2168'&&ka==='11','dashboard: '+kb+' / '+ka);
 // NV33: condition donut legend, level-1 columns, latest table, asset search
 await p.waitForSelector('#chCond .apexcharts-svg');const cv=await p.getAttribute('[data-kpi=cond]','data-val');ok(cv.split(',').reduce((x,y)=>x+ +y,0)===11,'NV33 condition legend sums to 11 ('+cv+')');
 ok((await p.getAttribute('[data-kpi=cat]','data-val')).split(',').length===2&&+(await p.getAttribute('[data-kpi=trend]','data-val')).split(',')[11]===11&&(await p.$$('.nv33 .nv33-t tbody tr')).length>=5,'NV33 level-1 columns (2), 12-month trend (11 this month) and latest assets table');
 await p.fill('#dQ',await p.evaluate(()=>assetLabel(S.collections.find(c=>c.submitted_at))));await p.waitForSelector('#dQr a');await p.press('#dQ','Enter');await p.waitForFunction(()=>/^#admin\/collections\/./.test(location.hash));ok(true,'NV33 search by Tag Number opens the asset');
 await p.goto(U+'#admin');await p.evaluate(()=>route());await p.waitForSelector('[data-kpi=bar]');
 const sc=await p.evaluate(()=>S.schools[0].city);await p.selectOption('#dCity',sc);await p.waitForFunction(c=>document.querySelector('[data-kpi=bar]')&&document.querySelector('[data-kpi=bar]').dataset.val.split(',').reduce((a,b)=>a+ +b,0)===S.schools.filter(s=>s.city===c).length,sc);ok(true,'city filter narrows the schools');
 await p.selectOption('#dEmp',ids.e1);await p.waitForFunction(()=>document.querySelector('[data-kpi=assets]').dataset.val==='7');ok(true,'supervisor filter: his 7 assets');
 ok((await p.$$('#chEmp .nvc-row')).length===1&&(await p.$$('#byCity .nvc-row')).length>=1&&(await p.$$('#chValue .nvc-row')).length>=1,'supervisors / cities / value bars rendered');await p.click('#dReset');
 await p.goto(U+'#admin/analytics');await p.waitForSelector('.breadcrumb');
 let rows=await p.$$eval('.app-main tbody tr',r=>r.length);ok(rows===2,'drill-down level 1: 2 categories ('+rows+')');
 const tot=await p.$$eval('[data-kpi=qty],[data-kpi=cost],[data-kpi=rec]',x=>x.map(y=>y.dataset.val));ok(tot[0]==='11'&&tot[1]==='590'&&tot[2]==='5','totals: qty 11, cost 590, 5 records ('+tot+')');
 await p.goto(U+'#admin/analytics?cat='+ids.cat0);await p.waitForSelector('.breadcrumb');await p.click('.app-main tbody tr >> nth=0');await p.waitForFunction(()=>/cond=/.test(location.hash));
 await p.click('.app-main tbody tr >> nth=0');await p.waitForFunction(()=>/type=/.test(location.hash));await p.waitForFunction(()=>{const h=document.querySelector('.app-main thead');return h&&h.textContent.includes('المدرسة')});rows=await p.$$eval('.app-main tbody tr',r=>r.length);
 ok((await p.textContent('.app-main thead')).includes('المبنى')&&rows>=1&&!(await p.textContent('.app-main tbody')).includes('s1'),'drill-down to schools by name ('+rows+')');await p.screenshot({path:B+'/shots/40-analytics.png'});
 // group view: label numbers, labels window, school report
 await p.goto(U+'#admin/collections/view/'+ids.e1+'/'+ids.s1);await p.waitForSelector('#lbl');
 ok(/^101\d{8}$/.test((await p.textContent('.app-main tbody tr td')).trim()),'label number 101XXXXXXXX');
 const [pop]=await Promise.all([ctx.waitForEvent('page'),p.click('#lbl')]);await pop.waitForSelector('.lb .qr svg',{timeout:20000});
 ok((await pop.$$('.lb')).length===3,'3 labels with QR');await pop.screenshot({path:B+'/shots/41-labels.png'});await pop.close();
 // NV13: label size from the settings (cm)
 // NV22: label settings have their own tab
 await p.goto(U+'#admin/settings');await p.waitForSelector('#application_name');ok(!(await p.$('#lbl_w'))&&!!(await p.$('.nv-set-tabs a[href="#admin/label"]')),'label settings: own tab, not in general settings');
 await p.goto(U+'#admin/label');await p.waitForSelector('#lbl_w');await p.fill('#lbl_w','5');await p.fill('#lbl_h','3');await p.selectOption('#lbl_mode','roll');await p.click('button:has-text("حفظ")');await p.waitForSelector('.alert-success');
 ok(await p.evaluate(()=>{const l=S.settings.label;return l.w===5&&l.h===3&&l.one===true}),'label size saved');
 // NV20: label logo + «do not remove» texts + live preview; the QR starts with the location
 await p.goto(U+'#admin/label');await p.waitForSelector('#lbl_prev .lb .qr svg',{timeout:20000});await p.setInputFiles('#lbl_logo',B+'/a.png');await p.waitForSelector('#lbl_prev .lg img');
 ok((await p.textContent('#lbl_prev .ft')).includes('يرجى عدم إزالة الملصق')&&(await p.textContent('#lbl_prev .ft')).includes('Please do not remove'),'preview: logo + footer texts');
 await p.screenshot({path:B+'/shots/44-label-settings.png'});await p.click('button:has-text("حفظ")');await p.waitForSelector('.alert-success');ok(await p.evaluate(()=>S.settings.label.logo.startsWith('data:image/png')),'label logo saved (PNG)');
 const qt=await p.evaluate(c0=>qrText(S.collections.find(x=>x.id===c0)),ids.c0);
 // NV21: choose the QR fields; the density meter warns
 await p.goto(U+'#admin/label');await p.waitForSelector('#qr_meter.alert-success,#qr_meter.alert-warning,#qr_meter.alert-danger',{timeout:20000});await p.fill('#lbl_w','4');await p.fill('#lbl_h','2.5');await p.click('[data-qrset="all"]');
 await p.waitForSelector('#qr_meter.alert-danger');ok(true,'all fields on 4 × 2.5 cm → red warning');
 await p.click('[data-qrset="basic"]');await p.fill('#lbl_w','6.3');await p.fill('#lbl_h','3.6');await p.waitForSelector('#qr_meter.alert-success');ok(true,'basic fields on 6.3 × 3.6 cm → clear');
 await p.screenshot({path:B+'/shots/45-qr-fields.png',fullPage:true});await p.fill('#lbl_w','5');await p.fill('#lbl_h','3');await p.click('button:has-text("حفظ")');await p.waitForSelector('.alert-success');
 const qb=await p.evaluate(c0=>qrText(S.collections.find(x=>x.id===c0)),ids.c0);ok(qb.includes('المبنى:')&&qb.includes('الكود:')&&!qb.includes('الكمية')&&!qb.includes('الحالة الفنية'),'saved: QR has only the chosen fields');ok(/^📍 موقع الأصل\nالمبنى: .+\nالطابق: .+\nالغرفة: .+\(رقم 3\)\n— بيانات الأصل —\nTag Number: 101\d{8}/.test(qt),'QR text: location first, then the asset');
 await p.goto(U+'#admin/collections/view/'+ids.e1+'/'+ids.s1);await p.waitForSelector('#lbl');
 const [pop2]=await Promise.all([ctx.waitForEvent('page'),p.click('#lbl')]);await pop2.waitForSelector('.lb .qr svg',{timeout:20000});
 const box=await pop2.$eval('.lb',e=>{const r=e.getBoundingClientRect();return [Math.round(r.width/37.8*10)/10,Math.round(r.height/37.8*10)/10]});ok(box[0]===5&&box[1]===3,'label printed 5 × 3 cm ('+box+')');ok(!!(await pop2.$('.lb .lg img'))&&(await pop2.textContent('.lb .ft')).includes('Please do not remove'),'printed label: logo + footer');await pop2.screenshot({path:B+'/shots/43-labels-5x3.png'});await pop2.close();
 const [d1]=await Promise.all([p.waitForEvent('download'),p.click('#rep')]);ok(!!d1,'school report downloaded');
 const sheets=await p.evaluate(async b=>{const wb=XLSX.read(Uint8Array.from(atob(b),c=>c.charCodeAt(0)),{type:'array'});return wb.SheetNames.join(',')+'|'+XLSX.utils.sheet_to_json(wb.Sheets['English'],{header:1})[5][0]},require('fs').readFileSync(await d1.path()).toString('base64'));
 ok(sheets.startsWith('عربي,English|Tag Number'),'report sheets '+sheets);
 // NV18: full Excel with photos + QR + asset number
 await p.evaluate(async c0=>{const c=S.collections.find(x=>x.id===c0);c.asset_image=await storePhoto(await (await fetch('/tests/b.png')).blob());save('collections')},ids.c0);
 const [dF]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.click('#full')]);const fx=await p.evaluate(async b=>{const wb=new ExcelJS.Workbook();await wb.xlsx.load(Uint8Array.from(atob(b),c=>c.charCodeAt(0)).buffer);const d=wb.getWorksheet('البيانات'),ph=wb.getWorksheet('صور الأصول');return [d.rowCount,d.getRow(1).getCell(1).value,ph.rowCount,ph.getImages().length,d.getRow(1).values.slice(1).join('|')]},require('fs').readFileSync(await dF.path()).toString('base64'));
 ok(fx[0]===4&&fx[1]==='ID'&&fx[2]===4&&fx[3]===4,'full Excel: 3 assets, 3 QR + 1 photo');
 ok(fx[4]==='ID|Employee|Employee #|School Name|MOE Number|School Identifier|City|District|Site|Floor|Room Number|Room Name|Category|Asset Type|Level 2|Level 3|Asset Code|Critical|Condition|Quantity|Price|Manufacturer|Brand|Model|Capacity|Serial Number|Agency|Warranty|Installation Date|Tag Number|Parent/Child|Notes|School Image URL|Location Diagram URL|Asset Image URL|Asset Image 2 URL|Submitted At|Created At|Label Number|Label Confirmed At','columns in the approved order, no Status');require('fs').copyFileSync(await dF.path(),B+'/shots/full-report.xlsx');
 await p.goto(U+'#admin/collections/'+ids.c0);await p.waitForSelector('#qr1 svg',{timeout:20000});ok(true,'QR on the asset page');
 // notifications
 await p.goto(U+'#admin');await p.waitForSelector('[data-nv-notif] .badge');ok((await p.textContent('[data-nv-notif] .badge')).trim()==='2','2 new notifications');
 await p.click('[data-nv-notif]');await p.click('[data-nv-notif-read]');await p.waitForTimeout(500);ok(!(await p.$('[data-nv-notif] .badge')),'marked as read');
 // import: a bad file is refused as a whole, a good one is added
 const mkFile=aoa=>p.evaluate(a=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(a),'S');return XLSX.write(wb,{type:'base64',bookType:'xlsx'})},aoa);
 const H=['Employee #','School Identifier','Room Name','Category','Asset Type','Condition','Quantity','Price','Floor','Room Number'];
 const room=await p.evaluate(()=>S.rooms[0].ar),cat=await p.evaluate(c=>get('categories',c).ar,ids.cat0),cond=await p.evaluate(()=>S.conditions[0].ar);
 const before=await p.evaluate(()=>S.collections.length);
 const imp=async aoa=>{await p.goto(U+'#admin/data');await p.waitForSelector('#ic');const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#ic')]);await fc.setFiles({name:'c.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await mkFile(aoa),'base64')});await p.waitForTimeout(1500)};
 await imp([H,[ids.e1num,ids.s2ident,room,cat,ids.type0.ar,cond,'2','15','1','4'],['00000',ids.s2ident,room,cat,ids.type0.ar,cond,'-1','x','1','4']]);
 ok(dlg.some(m=>m.includes('لم يُستورد'))&&(await p.evaluate(()=>S.collections.length))===before,'bad file refused, nothing added');
 await imp([H,[ids.e1num,ids.s2ident,room,cat,ids.type0.ar,cond,'2','15','1','4'],[ids.e1num,ids.s2ident,room,cat,ids.type0.en,'','1','','2','5']]);
 ok((await p.evaluate(()=>S.collections.length))===before+2,'2 rows imported');
 // field directory filters
 await p.goto(U+'#login');await p.waitForSelector('#employee-id');await p.fill('#employee-id',ids.e1num);await p.click('button[type=submit]');await p.waitForSelector('#screen-data');await p.click('text=تأكيد البيانات');await p.waitForSelector('#fcity');
 const city=await p.evaluate(()=>S.schools.find(s=>s.status==='active'&&s.city).city);await p.selectOption('#fcity',city);await p.waitForSelector('#res li');
 const all=await p.$$eval('#res li',l=>l.length);ok(all>0&&all<=60,'city filter lists schools ('+all+')');await p.screenshot({path:B+'/shots/42-field-filter.png'});
 console.log(errs.length?errs.join('\n'):'no console errors');await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
