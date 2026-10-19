// NV50: building report — QR as printed + stuck-label photo in the summary cards; full report with every asset (data + 4 images)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1350,height:900}});
 await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 await ctx.addInitScript(()=>{window.print=()=>{window.__printed=1}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('.nvd [data-kpi=bar]');
 // 3 sent assets: one with asset + nameplate + stuck label, one with asset only (label printed, not confirmed), one without a printed label
 const sid=await p.evaluate(async()=>{const s=S.schools[5];const mkImg=async col=>{const cv=document.createElement('canvas');cv.width=1600;cv.height=1200;const g=cv.getContext('2d');g.fillStyle=col;g.fillRect(0,0,1600,1200);return new Promise(r=>cv.toBlob(r,'image/jpeg'))};
  for(const [k,c] of [['q50a','#2563eb'],['q50b','#16a34a'],['q50l','#f59e0b'],['q50c','#7c3aed']])await IDB.put('photos',k,await mkImg(c));
  const t=S.types.find(x=>x.code)||S.types[0];const mk=(o)=>Object.assign(newCollection(S.employees[0].id,s.id,null,{}),{category_id:t.cat,type_id:t.id,quantity:1,price:10,condition_id:S.conditions[0].id,submitted_at:now()},o);
  S.collections.push(mk({no:9001,floor:'الأول',room_number:'2',asset_image:'q50a',asset_image2:'q50b',label_photo:'q50l',label_at:now(),label_check:'ok',label_printed_at:now(),serial:'S50-A'}),mk({no:9002,floor:'الأرضي',room_number:'1',asset_image:'q50c',label_printed_at:now(),serial:'S50-B'}),mk({no:9003,floor:'الأرضي',room_number:'3',serial:'S50-C'}));
  save('collections');return s.id});
 await p.evaluate(id=>location.hash='#admin/collections/building/'+encodeURIComponent(id),sid);await p.waitForSelector('#b48-full');ok(!!await p.$('#b48-pdf'),'building page: summary + full report buttons');
 // summary
 const [r1]=await Promise.all([ctx.waitForEvent('page'),p.click('#b48-pdf')]);await r1.waitForSelector('.kpis',{timeout:30000});
 const cards=await r1.$$eval('.cards .ac',x=>x.map(c=>({qr:!!c.querySelector('figure.qr svg'),imgs:c.querySelectorAll('figure img').length,t:c.textContent})));
 ok(cards.length===2,'summary: cards for assets with photos (2)');
 const a=cards.find(c=>c.t.includes('10100009001'));ok(a&&a.qr&&a.imgs===2&&a.t.includes('الملصق بعد اللصق')&&a.t.includes('مؤكد اللصق'),'summary card: asset photo + QR + stuck-label photo, label confirmed');
 const b=cards.find(c=>c.t.includes('10100009002'));ok(b&&b.qr&&b.imgs===1&&b.t.includes('لم تُرفع صورة اللصق')&&b.t.includes('طُبع ولم يُؤكد'),'summary card without a label photo says so');
 const qrTxt=await p.evaluate(()=>{const c=S.collections.find(x=>x.no===9001);return qrText(c,labelSize().qr)});ok(qrTxt.includes('10100009001'),'QR text = the printed label text');
 ok(await r1.evaluate(()=>{const r=document.querySelector('.pg').getBoundingClientRect();return Math.abs(r.left-(innerWidth-r.right))<2}),'page centred on screen');
 ok(await r1.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>i.src.startsWith('data:image/jpeg')).every(i=>i.naturalWidth<=900)),'photos scaled down (≤ 900 px)');
 await r1.screenshot({path:B+'/shots/95-report-summary.png',fullPage:true,timeout:15000}).catch(()=>console.log('note: summary screenshot skipped'));await r1.close();
 // full
 const [r2]=await Promise.all([ctx.waitForEvent('page'),p.click('#b48-full')]);await r2.waitForSelector('.ac.full',{timeout:60000});
 const f=await r2.$$eval('.ac.full',x=>x.map(c=>({tag:c.querySelector('.tag').textContent,figs:c.querySelectorAll('figure').length,qr:!!c.querySelector('figure.qr svg'),imgs:c.querySelectorAll('figure img').length,t:c.textContent})));
 ok(f.length===3&&f.every(x=>x.figs===4),'full report: one card per sent asset with 4 image slots');
 ok(f[0].tag==='10100009002'&&f[1].tag==='10100009003'&&f[2].tag==='10100009001','sorted by floor then room');
 const A=f.find(x=>x.tag==='10100009001');ok(A.imgs===3&&A.qr&&A.t.includes('S50-A')&&A.t.includes('مشرف الميدان'),'full card: asset, nameplate, QR, label + all data');
 const Cc=f.find(x=>x.tag==='10100009003');ok(Cc.imgs===0&&Cc.qr&&Cc.t.includes('لم يُطبع الملصق')&&Cc.t.includes('غير مرفقة (اختيارية)'),'full card: missing images labelled');
 ok((await r2.textContent('h1')).includes('التقرير الشامل'),'full report title');
 await r2.screenshot({path:B+'/shots/96-report-full.png',fullPage:true,timeout:15000}).catch(()=>console.log('note: full report screenshot skipped'));await r2.close();
 console.log(errs.length?errs.join('\n'):'no console errors');if(errs.length)process.exitCode=1;await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
