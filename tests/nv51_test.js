// NV51: exceptions (asset not reached / label not stuck), daily production, room completion, ZIP photo names,
// zone field, customer tag format + optional Code 128 barcode, no GPS on photos for sensitive sites
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:{width:420,height:900}});
 await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());await ctx.route(/tile\.openstreetmap/,r=>r.abort());
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 await ctx.addInitScript(()=>{window.print=()=>{window.__printed=1}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const png=n=>({name:n+'.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/'+n+'.png')});
 await p.goto(U);await p.waitForSelector('#employee-id');
 // --- tag format, legacy labels, barcode encoder (pure functions)
 const f=await p.evaluate(()=>{const c={no:84,school_id:S.schools[0].id,created_at:'2026-03-01T10:00:00Z'};const r={};r.def=assetLabel(c);
  S.settings.label=Object.assign({},S.settings.label||{},{fmt:'QSM-{B}-{N:6}'});r.custom=assetLabel(c);r.moe=S.schools[0].moe||S.schools[0].ident;
  r.okBad=[tagFmtOk('QSM-{N:6}'),tagFmtOk('ABC'),tagFmtOk('أ{N}'),tagFmtOk('X{N}{Y}')];r.isNew=labelIs(c,r.custom);r.isOld=labelIs(c,'10100000084');r.qrNew=labelFromQR('📍 x\nTag Number: '+r.custom+'\n');r.qrUrl=labelFromQR('https://x/#a/'+encodeURIComponent(r.custom));r.qrBare=labelFromQR('see '+r.custom+' here');r.qrOld=labelFromQR('Tag Number: 10100000084');
  r.codes=code128Codes('10100000084');r.codesB=code128Codes('QSM-12');S.settings.label.fmt='';r.back=assetLabel(c);
  const W=s=>code128Codes(s).map(v=>C128[v]).join('');r.sums=C128.every((w,i)=>[...w].reduce((a,b)=>a+ +b,0)===(i===106?13:11));r.len=W('10100000084').length;return r});
 ok(f.def==='10100000084','default Tag Number = 101 + 8 digits ('+f.def+')');
 ok(f.custom==='QSM-'+String(f.moe).replace(/[^A-Za-z0-9-]/g,'')+'-000084','customer format QSM-{B}-{N:6} → '+f.custom);
 ok(f.okBad.join()==='true,false,false,true','format check: needs {N}, ASCII only');
 ok(f.isNew&&f.isOld,'a label is recognised in the new format and the old 101… number');
 ok(f.qrNew===f.custom&&f.qrUrl===f.custom&&f.qrBare===f.custom&&f.qrOld==='10100000084','labels read from QR text, link, bare text and old labels');
 // 10100000084 → start C, pairs 10 10 00 00 00, code B, '8'?? no: 11 digits = 5 pairs + 1 → C then B for the last digit
 ok(f.codes[0]===105&&f.codes.slice(1,6).join()==='10,10,0,0,8'&&f.codes[6]===100&&f.codes[7]===('4'.charCodeAt(0)-32)&&f.codes[f.codes.length-1]===106,'Code 128: digit pairs in set C, last digit in set B, stop ('+f.codes.join(' ')+')');
 {const v=f.codes.slice(0,-2);let s=v[0];for(let i=1;i<v.length;i++)s+=v[i]*i;ok(f.codes[f.codes.length-2]===s%103,'Code 128 check digit (mod 103)')}
 ok(f.codesB[0]===104&&f.codesB[1]==='Q'.charCodeAt(0)-32,'text in set B');ok(f.sums,'every Code 128 pattern is 11 modules (stop 13)');ok(f.back==='10100000084','empty format = default again');
 // --- settings: zone on, target 5, no GPS on photos
 await p.evaluate(async()=>{S.settings.ops={target:5,zone:{on:true,l:'الجناح'}};S.settings.geo=Object.assign({},S.settings.geo||{},{stamp:false});await saveNow('settings')});
 ok(await p.evaluate(()=>!stampGeo51()&&opsCfg().target===5&&opsCfg().zone.l==='الجناح'),'settings: zone field, daily target, no GPS stamp');
 // capture the lines burnt into each photo
 await p.evaluate(()=>{window.__lines=[];const o=window.stampPhoto;window.stampPhoto=(b,l)=>{window.__lines.push(l);return o(b,l)}});
 // --- field: location with zone
 await p.fill('#employee-id','22912');await p.click('button[type=submit]');await p.waitForSelector('#screen-data');
 await p.click('text=تأكيد البيانات');await p.waitForSelector('#q');await p.fill('#q','الضياء');await p.waitForSelector('#res li');await p.click('#res li >> nth=0');
 await p.setInputFiles('#school-image',B+'/a.png');await p.click('#next');await p.waitForSelector('#floor-select');
 ok(!!await p.$('#zone')&&(await p.textContent('label[for=zone]')).includes('الجناح'),'location: zone field with the customer name');
 await p.selectOption('#floor-select','الأرضي');await p.selectOption('#room-number','1');const cls=await p.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value);await p.selectOption('#room-name',cls);await p.fill('#zone','الجناح الشرقي');
 await p.click('#submit-btn');await p.waitForSelector('#a_category_id');
 const fill=async sn=>{const cat=await p.$eval('#a_category_id',s=>s.options[2].value);await p.selectOption('#a_category_id',cat);await p.selectOption('#a_l2',{index:1});await p.selectOption('#a_l3',{index:1});await p.selectOption('#a_type_id',{index:1});
  await p.fill('#a_quantity','1');await p.selectOption('#a_parent_child','Parent');await p.fill('#a_serial',sn)};
 // asset 1: not reachable — no asset photo, no condition
 await fill('NV51-A');ok(await p.$eval('#excBox',b=>!b.classList.contains('on')),'exception panel closed by default');
 await p.check('#exc_on');ok(await p.$eval('#a_condition_id',s=>!s.required),'exception on: condition no longer required');
 await p.click('#sb');await p.waitForFunction(()=>/السبب|سبب/.test(document.querySelector('#exc_e').textContent));ok(true,'exception without a reason is refused');
 await p.selectOption('#exc_r',{index:2});await p.click('#sb');await p.waitForFunction(()=>/صورة الاستثناء/.test(document.querySelector('#exc_e').textContent));ok(true,'exception without its photo is refused');
 await p.setInputFiles('#exc_cam',png('a'));await p.waitForSelector('#excShot.ok');await p.click('#sb');await p.waitForSelector('#screen-success');
 const a1=await p.evaluate(()=>{const c=S.collections.find(x=>x.serial==='NV51-A');return {k:c.exc_kind,r:c.exc_reason,ph:!!c.exc_photo,ai:!!c.asset_image,z:c.zone,cond:c.condition_id}});
 ok(a1.k==='access'&&a1.r==='مرتفع — يحتاج سلّماً أو رافعة'&&a1.ph&&!a1.ai&&!a1.cond,'saved: access exception with reason + photo, no asset photo / condition');ok(a1.z==='الجناح الشرقي','zone saved on the record');
 const L=await p.evaluate(()=>window.__lines.map(l=>l.join(' | ')));ok(L.length===1&&L[0].includes('استثناء')&&!/\d{2}\.\d{5}/.test(L[0]),'exception photo stamped without coordinates ('+L[0]+')');
 // room card on the success page
 ok(!!await p.$('#rmCard'),'success page: room completion card');const pct1=await p.$eval('#rmCard',e=>+e.dataset.pct);ok(pct1===0,'room progress 0% (the asset has no label yet) — '+pct1);
 // asset 2 in the same room, with a photo; zone copied
 await p.click('#same');await p.waitForSelector('#a_category_id');ok(await p.evaluate(()=>curColl().zone==='الجناح الشرقي'),'«same room» keeps the zone');
 await fill('NV51-B');await p.selectOption('#a_condition_id',{index:2});await p.setInputFiles('#aimg',png('b'));await p.waitForSelector('[data-shot="0"].ok');await p.click('#sb');await p.waitForSelector('#screen-success');
 const L2=await p.evaluate(()=>window.__lines.slice(1).map(l=>l.join(' | ')));ok(L2.length===1&&!/\d+\.\d{5}, \d+\.\d{5}/.test(L2[0]),'asset photo stamped without coordinates');
 // label not stuck (exception) on asset 2 — local mode: the label is ready at once
 await p.waitForSelector('#lfBox');await p.click('#lfBox summary');await p.selectOption('#lf_r',{index:1});await p.setInputFiles('#lfCam',png('a'));
 await p.waitForFunction(()=>{const c=S.collections.find(x=>x.serial==='NV51-B');return c&&c.label_check==='fail'});
 const b2=await p.evaluate(()=>{const c=S.collections.find(x=>x.serial==='NV51-B');return {n:c.label_note,ph:!!c.label_photo,L:labelOf(c).check}});ok(b2.n==='السطح غير مناسب (خشن / رطب / ساخن)'&&b2.ph&&b2.L==='fail','label exception saved: reason + photo');
 await p.waitForSelector('#lcDone');ok((await p.textContent('#lcDone')).includes('تعذّر اللصق'),'success page shows the label exception');ok(!!await p.$('#lcCam'),'a later confirmation is still possible');
 // room: asset 2 complete (photo + label exception), asset 1 photo via exception but no label → 50%
 const pct2=await p.$eval('#rmCard',e=>+e.dataset.pct);ok(pct2===50,'room progress 50% ('+pct2+')');
 await p.click('[data-rd="1"]');await p.waitForSelector('.nv-room-done');ok(await p.evaluate(()=>!!RD.get(RD.key(curColl()))),'room marked complete (confirm accepted below 100%)');
 await p.click('[data-rd="0"]');await p.waitForSelector('[data-rd="1"]');ok(await p.evaluate(()=>!RD.get(RD.key(curColl()))),'room reopened');await p.click('[data-rd="1"]');await p.waitForSelector('.nv-room-done');
 await p.screenshot({path:B+'/shots/nv51-field-success.png',fullPage:true});
 // --- data checks
 const d=await p.evaluate(()=>{const A=S.collections.find(x=>x.serial==='NV51-A'),Bc=S.collections.find(x=>x.serial==='NV51-B');const q=NV36.qualityLocal([A,Bc].map(c=>Object.assign({},c,{review_status:'ok'})));
  const f=I42.facts([A],{schools:S.schools,employees:S.employees,types:S.types,conditions:S.conditions,rooms:S.rooms},[])[0];
  const row=exportRow(A),H=EXPORT_HEAD;return {exc:q.exceptions,ph:q.photos,fp:f.photos,zone:row[H.indexOf('Zone')],ex:row[H.indexOf('Exception')],rs:row[H.indexOf('Exception Reason')],ei:row[H.indexOf('Exception Image URL')],
   names:zipNames([A,Bc]).map(x=>x.name),tagA:assetLabel(A),tagB:assetLabel(Bc),keys:photoKeys(A)}});
 ok(d.exc===2&&d.ph===0,'data quality: 2 exceptions, the unreachable asset is not «photo missing»');ok(!d.fp,'inventory: no «نقص الصور» for an access exception with its photo');
 ok(d.zone==='الجناح الشرقي'&&d.ex==='تعذّر الوصول'&&d.rs.includes('مرتفع')&&/\.jpg$/.test(d.ei),'Excel columns Zone / Exception / Reason / Image');
 ok(d.keys.length===2,'exception photo is one of the record photos (upload / backup / delete)');
 const nm=d.names;ok(nm.some(n=>n.endsWith('/'+d.tagA+'_exception.jpg'))&&nm.some(n=>n.endsWith('/'+d.tagB+'_asset.jpg'))&&nm.some(n=>n.endsWith('/'+d.tagB+'_label.jpg'))&&nm.filter(n=>n.endsWith('/_building.jpg')).length===1&&nm.every(n=>/^[^/]+\/[^/]+\.jpg$/.test(n)),'ZIP names: <building>/<Tag>_<kind>.jpg, building photo once ('+nm.join(', ')+')');
 // ZIP download
 const zipInfo=await p.evaluate(async()=>{let blob=null;const o=window.download;window.download=(b,n)=>{blob={b,n}};await exportPhotosZip(S.collections.filter(x=>/^NV51-/.test(x.serial)));window.download=o;if(!blob)return null;const z=await JSZip.loadAsync(blob.b);const files=Object.keys(z.files);return {n:blob.n,files,csv:(await z.file('index.csv').async('string')).split('\n').length}});
 ok(zipInfo&&zipInfo.files.includes('index.csv')&&zipInfo.files.filter(x=>x.endsWith('.jpg')).length===4&&zipInfo.csv===5,'ZIP: 4 photos named by asset number + index.csv ('+(zipInfo&&zipInfo.files.join(', '))+')');
 // --- admin pages
 await p.setViewportSize({width:1350,height:900});await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd [data-kpi=bar]');
 ok(!!await p.$('.app-sidebar a[href="#admin/production"]')&&!!await p.$('.app-sidebar a[href="#admin/exceptions"]'),'sidebar: production and exceptions pages');
 await p.click('.app-sidebar a[href="#admin/exceptions"]');await p.waitForSelector('[data-kpi=exc]');ok(await p.getAttribute('[data-kpi=exc]','data-val')==='2,1,1','exceptions log: 2 (1 access, 1 label)');
 ok((await p.$$('tr[data-x51]')).length===2&&(await p.$$('tr[data-x51] img.x51-th')).length===2,'two rows with their photos');await p.selectOption('#x51K','label');await p.waitForFunction(()=>document.querySelectorAll('tr[data-x51]').length===1);ok(true,'filter by kind');
 await p.screenshot({path:B+'/shots/nv51-exceptions.png'});
 await p.evaluate(()=>location.hash='#admin/production');await p.waitForSelector('[data-kpi=prod]');const pv=(await p.getAttribute('[data-kpi=prod]','data-val')).split(',').map(Number);
 ok(pv[0]===2&&pv[3]===1,'production: 2 assets, 1 room today ('+pv+')');ok((await p.$$('#p51Tbl tbody tr[data-p51]')).length===1,'one row (today × supervisor)');
 ok((await p.textContent('#p51Tbl tbody')).includes('/ 5'),'target shown (5)');await p.fill('#p51T','2');await p.click('#p51TS');await p.waitForFunction(()=>opsCfg().target===2);await p.waitForSelector('#p51Tbl b.ok');ok(true,'target saved; 2 / 2 reaches the target');
 await p.screenshot({path:B+'/shots/nv51-production.png'});
 await p.click('a[href="#admin/production?tab=rooms"]');await p.waitForSelector('[data-kpi=rooms]');ok(await p.getAttribute('[data-kpi=rooms]','data-val')==='1,1,50','rooms: 1 room, 1 complete, 50% average');
 await p.click('[data-rm51="0"]');await p.waitForSelector('[data-rm51="1"]');ok((await p.getAttribute('[data-kpi=rooms]','data-val')).startsWith('1,0'),'admin reopens the room');await p.click('[data-rm51="1"]');await p.waitForSelector('[data-rm51="0"]');
 await p.screenshot({path:B+'/shots/nv51-rooms.png'});
 await p.evaluate(()=>location.hash='#admin/quality');await p.waitForSelector('.sx36-grid');ok((await p.textContent('.sx36-grid')).includes('استثناءات'),'quality page: exceptions card');
 await p.evaluate(()=>location.hash='#admin/quality?issue=exceptions');await p.waitForFunction(()=>document.querySelectorAll('.sx36-table tbody tr').length===2);ok(true,'quality filter «الاستثناءات»: 2 assets');
 // label settings: format + barcode on the printed label
 await p.evaluate(()=>location.hash='#admin/label');await p.waitForSelector('#lbl_fmt');await p.fill('#lbl_fmt','QSM-{N:6}');await p.waitForFunction(()=>/QSM-\d{6}/.test(document.querySelector('#lbl_fmt_x').textContent));
 await p.check('#lbl_bc');await p.waitForSelector('#lbl_prev .bc svg rect');ok(true,'label preview: example number in the new format + barcode');
 await p.click('#f button[type=submit]');await p.waitForFunction(()=>S.settings.label&&S.settings.label.fmt==='QSM-{N:6}'&&S.settings.label.bc===true);
 const lb=await p.evaluate(()=>{const c=S.collections.find(x=>x.serial==='NV51-B');return {t:assetLabel(c),h:labelHTML(c,labelSize())}});ok(/^QSM-\d{6}$/.test(lb.t)&&lb.h.includes('class="bc"')&&lb.h.includes(lb.t),'label: new Tag Number + barcode ('+lb.t+')');
 // full Excel: «الاستثناءات» sheet
 const sh=await p.evaluate(async()=>{const b=await buildFullXlsx(S.collections.filter(x=>/^NV51-/.test(x.serial)),'t');const wb=new ExcelJS.Workbook();await wb.xlsx.load(await b.arrayBuffer());const w=wb.getWorksheet('الاستثناءات');return {names:wb.worksheets.map(x=>x.name),rows:w?w.rowCount:0,img:w?w.getImages().length:0}});
 ok(sh.names.includes('الاستثناءات')&&sh.rows===3&&sh.img===2,'full Excel: sheet «الاستثناءات» with 2 rows and their photos ('+sh.names.join(', ')+')');
 // building report: rooms + exceptions
 const sid=await p.evaluate(()=>S.collections.find(x=>x.serial==='NV51-A').school_id);await p.evaluate(id=>location.hash='#admin/collections/building/'+encodeURIComponent(id),sid);await p.waitForSelector('#b48-pdf');
 const [r1]=await Promise.all([ctx.waitForEvent('page'),p.click('#b48-pdf')]);await r1.waitForSelector('.kpis',{timeout:30000});const rt=await r1.textContent('body');
 ok(rt.includes('اكتمال الغرف')&&rt.includes('سجل الاستثناءات (2)')&&rt.includes('الجناح الشرقي'),'building report: rooms and exceptions sections');ok((await r1.$$('section img[src^="data:image"]')).length>=2,'report: exception photos');
 await r1.screenshot({path:B+'/shots/nv51-report.png',fullPage:true,timeout:8000}).catch(()=>{});await r1.close();
 // cloud sync: the new columns are sent only once the database has them
 const cs=await p.evaluate(async()=>{const c=S.collections.find(x=>x.serial==='NV51-A');const sc=Cloud.scope;Cloud.scope=()=>'nv51.test';try{localStorage.removeItem('nv51_ok_nv51.test');const off=Object.keys(Cloud.canon('collections',c));
   Cloud.snap.collections=Cloud.snap.collections||{};Cloud.snap.collections.__t=JSON.stringify({id:'__t',zone:undefined});localStorage.setItem('nv51_ok_nv51.test','1');const on=Cloud.canon('collections',c);
   await Cloud.detect51([{id:'x',exc_kind:null}]);const patched=JSON.parse(Cloud.snap.collections.__t);delete Cloud.snap.collections.__t;
   return {off:off.includes('zone')||off.includes('exc_kind'),on:on.zone==='الجناح الشرقي'&&on.exc_kind==='access'&&'label_note' in on,patched:'exc_photo' in patched&&patched.exc_photo===null,ops:'ops' in Cloud.settingsOf({ops:{target:3}})&&!('ops' in Cloud.settingsOf({}))}}finally{Cloud.scope=sc;localStorage.removeItem('nv51_ok_nv51.test')}});
 ok(!cs.off,'sync: without migration 048 the new columns are not sent');ok(cs.on,'sync: with it zone / exceptions / label note are sent');ok(cs.patched,'old snapshots get the new columns (no resend of every record)');ok(cs.ops,'settings: «ops» sent only once set');
 console.log(errs.length?errs.join('\n'):'no console errors');if(errs.length)process.exitCode=1;await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
