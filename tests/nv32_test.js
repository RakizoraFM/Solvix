// NV32: print time recorded, label confirmed with a photo (QR read from the photo: ok / another asset refused / unread), admin views, dashboard card — offline mode
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local',fs=require('fs');
(async()=>{
 const br=await chromium.launch();
 const ctx=await br.newContext({ignoreHTTPSErrors:true,permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:{width:1280,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));let dialogs=[];p.on('dialog',d=>{dialogs.push(d.message());d.accept()});
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 await p.goto(U+'#login');await p.waitForSelector('#employee-id');await p.fill('#employee-id','22912');await p.click('button[type=submit]');await p.waitForSelector('#screen-data');
 const ids=await p.evaluate(()=>{const e=curEmp();const s=S.schools[0];const t=S.types.filter(x=>x.code);const mk=(i)=>{const c=Object.assign(newCollection(e.id,s.id,null,{floor:'الأرضي',room_number:'2',room_name_id:S.rooms[0].id}),{type_id:t[i].id,category_id:t[i].cat,condition_id:S.conditions[0].id,quantity:1,submitted_at:now()});S.collections.push(c);return c};
   const a=mk(0),b=mk(1),c=mk(2);save('collections');setSess({school:s.id,coll:a.id});return {a:a.id,b:b.id,c:c.id,la:assetLabel(a),lb:assetLabel(b)}});
 await p.goto(U+'#success');await p.evaluate(()=>route());await p.waitForSelector('#lblPrev .lb svg');
 ok(!!(await p.$('#lcBox'))&&!(await p.$('#lcDone')),'confirm box under the label');
 {const [pw]=await Promise.all([ctx.waitForEvent('page'),p.click('#lblPrint')]);await pw.waitForSelector('.lb');await pw.close()}
 ok(await p.evaluate(id=>!!S.collections.find(x=>x.id===id).label_printed_at,ids.a),'print time recorded on the asset');
 // QR images: this asset, another asset
 const qrPng=async lb=>Buffer.from((await p.evaluate(async l=>{await needQR();const q=qrcode(0,'M');q.addData(location.origin+'/index.html#a/'+l);q.make();return q.createDataURL(8,6)},lb)).split(',')[1],'base64');
 dialogs=[];await p.setInputFiles('#lcCam',{name:'other.png',mimeType:'image/png',buffer:await qrPng(ids.lb)});await p.waitForTimeout(1500);
 ok(dialogs.some(m=>m.includes('لملصق أصل آخر'))&&await p.evaluate(id=>!S.collections.find(x=>x.id===id).label_at,ids.a),"another asset's label refused");
 await p.setInputFiles('#lcCam',{name:'mine.png',mimeType:'image/png',buffer:await qrPng(ids.la)});await p.waitForSelector('#lcDone');
 const st=await p.evaluate(id=>{const c=S.collections.find(x=>x.id===id);return {at:!!c.label_at,check:c.label_check,photo:!!c.label_photo}},ids.a);ok(st.at&&st.check==='ok'&&st.photo,'label confirmed: QR matches '+JSON.stringify(st));
 await p.screenshot({path:B+'/shots/90-label-confirm.png',fullPage:true});
 // unread photo (no QR) → saved as unread after a question
 await p.goto(U+'#history');await p.evaluate(()=>route());await p.waitForSelector(`[data-lc="${ids.b}"]`);dialogs=[];
 const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click(`[data-lc="${ids.b}"]`)]);await fc.setFiles(B+'/a.png');await p.waitForFunction(id=>!!S.collections.find(x=>x.id===id).label_at,ids.b,{timeout:15000});
 ok(dialogs.some(m=>m.includes('لم يُقرأ رمز QR'))&&await p.evaluate(id=>S.collections.find(x=>x.id===id).label_check,ids.b)==='unread','photo without a readable QR saved as «unread»');
 // admin: dashboard card, review, asset page
 await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('[data-kpi="labels"]');
 ok((await p.getAttribute('[data-kpi="labels"]','data-val'))==='2,0,1','dashboard: stuck 2 / printed 0 / not printed 1 ('+(await p.getAttribute('[data-kpi="labels"]','data-val'))+')');
 await p.screenshot({path:B+'/shots/91-dash-labels.png',fullPage:true});
 const sid=await p.evaluate(id=>S.collections.find(x=>x.id===id).school_id,ids.a);await p.goto(U+'#admin/review?school='+sid+'&st=nolabel');await p.evaluate(()=>route());await p.waitForSelector('.nv-rv');
 ok((await p.$$('.nv-rv')).length===1&&!!(await p.$('[data-lbl="none"]')),'review: «بلا تأكيد ملصق» shows the one without a label');
 await p.goto(U+'#admin/collections/'+ids.a);await p.evaluate(()=>route());await p.waitForSelector('img[alt="الملصق على الأصل"]');ok((await p.textContent('.app-main')).includes('مُلصق ومؤكد'),'asset page: label photo + status');
 const ex=await p.evaluate(()=>EXPORT_HEAD.slice(-2).join('|'));ok(ex==='Label Number|Label Confirmed At','export: «Label Confirmed At» column');
 ok(!errs.length,'no page errors '+errs.join(' | '));await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
