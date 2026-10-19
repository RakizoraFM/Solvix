// NV52: field supervisor app — sidebar / bottom bar, Home, my buildings + rooms map, labels, needs action, account, history search
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:{width:420,height:900}});
 await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());await ctx.route(/tile\.openstreetmap/,r=>r.abort());
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 await ctx.addInitScript(()=>{window.print=()=>{window.__printed=(window.__printed||0)+1}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const png=n=>({name:n+'.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/'+n+'.png')});
 const val=async s=>p.$eval(s,e=>e.dataset.val);
 const nav=async h=>{await p.evaluate(h=>{location.hash=h},h);await p.waitForTimeout(150)};
 await p.goto(U);await p.waitForSelector('#employee-id');
 await p.evaluate(async()=>{S.settings.ops={target:5};await saveNow('settings')});
 await p.fill('#employee-id','22912');await p.click('button[type=submit]');await p.waitForSelector('#screen-data');
 // --- shell + home
 ok(!!await p.$('#nv52Side')&&!!await p.$('#scanQR')&&!!await p.$('.nv52-bot'),'sidebar, scan item and bottom bar exist');
 const items=await p.$$eval('#nv52Side a',a=>a.map(x=>x.textContent.trim()));
 ok(['الرئيسية','مبانيّ','جرد أصل جديد','مسح ملصق','ما يحتاج إجراء','الملصقات','سجل أصولي','مهامي','دورات الجرد','حسابي','تسجيل الخروج'].every(w=>items.some(i=>i.includes(w))),'sidebar items: '+items.join(' | '));
 ok(await p.$eval('#nv52Side a.on',a=>a.textContent.includes('الرئيسية')),'Home is the active item');
 ok(!await p.$('header .nv-scanbtn'),'old header buttons removed');
 ok((await val('#h52Today'))==='0,5,0,0,0','home: today 0 of target 5');
 ok(!!await p.$('#h52Todo .h52-empty'),'home: nothing needs action yet');
 // mobile: sidebar off-screen, ☰ opens it
 let box=await p.$eval('#nv52Side',e=>{const r=e.getBoundingClientRect();return {l:r.left,r:r.right}});ok(box.l>=420-1||box.r<=1,'phone: sidebar hidden off-screen');
 ok(await p.$eval('.nv52-bot',e=>getComputedStyle(e).display==='flex'),'phone: bottom bar shown');
 await p.click('header .nv52-burger');await p.waitForTimeout(300);box=await p.$eval('#nv52Side',e=>{const r=e.getBoundingClientRect();return {l:r.left,r:r.right}});ok(box.r<=421&&box.l>=0,'☰ opens the sidebar');
 await p.click('.nv52-ov',{position:{x:20,y:400}});await p.waitForTimeout(300);ok(await p.evaluate(()=>!document.body.classList.contains('nv52-open')),'tap outside closes it');
 // --- two assets in one room
 await p.click('#homeStart');await p.waitForSelector('#q');await p.fill('#q','الضياء');await p.waitForSelector('#res li');await p.click('#res li >> nth=0');
 await p.setInputFiles('#school-image',B+'/a.png');await p.click('#next');await p.waitForSelector('#floor-select');
 await p.selectOption('#floor-select','الأرضي');await p.selectOption('#room-number','1');const cls=await p.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value);await p.selectOption('#room-name',cls);
 await p.click('#submit-btn');await p.waitForSelector('#a_category_id');
 const fill=async sn=>{const cat=await p.$eval('#a_category_id',s=>s.options[2].value);await p.selectOption('#a_category_id',cat);await p.selectOption('#a_l2',{index:1});await p.selectOption('#a_l3',{index:1});await p.selectOption('#a_type_id',{index:1});
  await p.fill('#a_quantity','1');await p.selectOption('#a_parent_child','Parent');await p.fill('#a_serial',sn);await p.selectOption('#a_condition_id',{index:2})};
 await fill('NV52-A');await p.setInputFiles('#aimg',png('a'));await p.waitForSelector('[data-shot="0"].ok');await p.click('#sb');await p.waitForSelector('#screen-success');
 ok(!!await p.$('#nv52Side a.on')&&await p.$eval('#nv52Side a.on',a=>a.textContent.includes('جرد أصل')),'success page: «collect» active, sidebar kept');
 await p.click('#same');await p.waitForSelector('#a_category_id');await fill('NV52-B');await p.setInputFiles('#aimg',png('b'));await p.waitForSelector('[data-shot="0"].ok');await p.click('#sb');await p.waitForSelector('#screen-success');
 // a third asset started but not saved → «continue» on Home
 await p.click('#same');await p.waitForSelector('#a_category_id');
 await nav('#employee-data');await p.waitForSelector('#screen-data');
 ok((await val('#h52Today')).startsWith('2,5,'),'home: 2 assets today ('+await val('#h52Today')+')');
 ok((await p.$eval('[data-kpi=week]',e=>e.dataset.val)).endsWith(',2'),'home: last 7 days ends with 2');
 ok(await p.$$eval('#h52Blds .h52-it',a=>a.length)===1,'home: my building listed');
 ok(!!await p.$('#homeResume'),'home: «continue where you stopped» shown');
 await p.click('#homeResume');await p.waitForSelector('#a_category_id');ok(true,'continue opens the unsaved asset');
 // --- labels
 await nav('#labels');await p.waitForSelector('#screen-labels');
 ok((await val('[data-kpi=labels52]'))==='2,0,0,0','labels: 2 not printed');
 await p.click('#lbAll');await p.waitForFunction(()=>window.__printed>=1,null,{timeout:15000}).catch(()=>{});await p.waitForTimeout(900);
 await nav('#labels?t=printed');await p.waitForSelector('#screen-labels');ok((await val('[data-kpi=labels52]'))==='0,2,0,0','labels: after printing → 2 printed, not confirmed');
 ok(await p.$$eval('#screen-labels [data-lc]',a=>a.length)===2,'labels: a confirm button per printed label');
 // --- needs action
 await nav('#todo');await p.waitForSelector('#screen-todo');
 ok((await p.$eval('[data-todo52=printed]',e=>e.dataset.val))==='2','todo: 2 labels to confirm');
 ok(!await p.$('[data-todo52=draft]'),'todo: an empty new-asset form is not listed');
 ok((await p.$eval('[data-todo52=rpart]',e=>e.dataset.val))==='1','todo: one room not complete');
 ok((await p.$eval('#nv52Side [data-bd52]',e=>e.textContent))==='2','sidebar badge = 2');
 // confirm both labels (as the confirm step would) → the room is 100% and ready to mark
 await p.evaluate(()=>{const t=new Date().toISOString();for(const c of S.collections.filter(x=>x.submitted_at&&x.type_id)){c.label_at=t;c.label_check='ok';c.label_photo=c.asset_image}save('collections');route()});await p.waitForSelector('[data-todo52=rready]');
 await p.click('[data-rk52]');await p.waitForTimeout(200);ok(!await p.$('[data-todo52=rready]'),'todo: room marked complete from the list');
 // --- buildings + rooms map
 await nav('#buildings');await p.waitForSelector('#screen-buildings');ok((await val('[data-kpi=buildings]'))==='1','buildings: 1');
 await p.click('#screen-buildings .h52-it');await p.waitForSelector('#screen-bmap');ok((await val('[data-kpi=bmap]'))==='1,1,0','map: 1 room, complete');
 ok(await p.$eval('[data-room52]',b=>b.classList.contains('done')),'map: the room tile is green');
 await p.click('[data-room52]');await p.waitForSelector('#bmRoom');ok(await p.$$eval('#bmRoom .h52-row',r=>r.length)===2,'map: the room lists its 2 assets');
 await p.click('[data-mark52="0"]');await p.waitForTimeout(200);ok(await p.$eval('[data-room52]',b=>b.classList.contains('ready')),'map: reopened room = ready (100%)');
 await p.click('#bmAdd');await p.waitForSelector('#a_category_id');ok(await p.evaluate(()=>{const c=curColl();return c.floor==='الأرضي'&&String(c.room_number)==='1'&&!c.type_id}),'«an asset in this room» opens a blank asset in that room');
 // --- returned asset on Home and in the list
 await p.evaluate(()=>{const c=S.collections.find(x=>x.serial==='NV52-A');c.review_status='returned';c.review_note='الصورة غير واضحة';save('collections')});
 await nav('#employee-data');await p.waitForSelector('#retBox');ok((await p.textContent('#retBox')).includes('غير واضحة'),'home: returned asset with the note');
 await nav('#todo');await p.waitForSelector('[data-todo52=ret]');ok(true,'todo: returned section');
 // --- history search
 await nav('#history');await p.waitForSelector('#hq52');await p.fill('#hq52','nv52-b');await p.waitForTimeout(100);
 ok(await p.$$eval('#screen-history tbody tr',r=>r.filter(x=>x.style.display!=='none').length)===1,'history: search by serial');
 const tag=await p.evaluate(()=>assetLabel(S.collections.find(x=>x.serial==='NV52-A')));await p.fill('#hq52',tag);await p.waitForTimeout(100);
 ok(await p.$$eval('#screen-history tbody tr',r=>r.filter(x=>x.style.display!=='none').length)===1,'history: search by Tag Number');
 // --- account
 await nav('#account');await p.waitForSelector('#screen-account');ok((await val('[data-kpi=months]')).startsWith('2,'),'account: month summary 2 assets');
 await p.click('#acLang');await p.waitForSelector('#screen-account');ok((await p.textContent('#nv52Side')).includes('Home'),'language switch from the account page');await p.click('#acLang');await p.waitForTimeout(150);
 // --- the 1-hour un-uploaded warning (cloud only)
 ok(await p.evaluate(()=>{const o={on:Cloud.on,role:Cloud.role,scope:Cloud.scope};Cloud.on=true;Cloud.role='tech';Cloud.scope=()=>'t';lsSet(PK52(),Date.now()-2*36e5);const w=warn52();lsSet(PK52(),Date.now()-5*6e4);const w2=warn52();Object.assign(Cloud,o);return /ساعة/.test(w)&&!w2}),'warning after more than an hour, not before');
 // --- guide / releases links follow the NV45 grants
 ok(await p.evaluate(()=>{const o={on:Cloud.on,role:Cloud.role,d:Cloud.docAccess};Cloud.on=true;Cloud.role='tech';Cloud.docAccess={};const off=side52();Cloud.docAccess={guide:true,releases:true};const on=side52();Cloud.docAccess={guide:true};const g=side52();Object.assign(Cloud,{on:o.on,role:o.role,docAccess:o.d});
   return !/#guide|#releases/.test(off)&&/href="#guide"/.test(on)&&/href="#releases"/.test(on)&&/href="#guide"/.test(g)&&!/#releases/.test(g)}),'sidebar: guide / releases shown only when granted, each on its own');
 ok(await p.evaluate(async()=>{const o={on:Cloud.on,role:Cloud.role,d:Cloud.docAccess,r:window.refreshDocumentAccess45,sc:Cloud.scope,u:Cloud.user};Cloud.on=true;Cloud.role='tech';Cloud.docAccess={};Cloud.scope=()=>'t';Cloud.user={id:'u52'};
   refreshDocumentAccess45=async()=>{Cloud.docAccess={guide:true,releases:true}};doc52();await new Promise(r=>setTimeout(r,50));const has=!!document.querySelector('#nv52Side a[href="#guide"]')&&!!document.querySelector('#nv52Side a[href="#releases"]');
   refreshDocumentAccess45=o.r;Object.assign(Cloud,{on:o.on,role:o.role,docAccess:o.d,scope:o.sc,user:o.u});return has}),'sidebar: granted links appear right after sign-in (no 30 s wait)');
 // --- desktop
 await p.setViewportSize({width:1280,height:900});await nav('#employee-data');await p.waitForSelector('#screen-data');
 ok(await p.$eval('#nv52Side',e=>{const r=e.getBoundingClientRect();return r.width>200&&r.right>1000}),'desktop: sidebar on the right');
 ok(await p.$eval('.nv52-bot',e=>getComputedStyle(e).display==='none'),'desktop: no bottom bar');
 await p.screenshot({path:B+'/shots/nv52-home-desktop.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});await nav('#employee-data');await p.waitForSelector('#screen-data');await p.screenshot({path:B+'/shots/nv52-home-phone.png',fullPage:true});
 await nav('#bmap/'+encodeURIComponent(await p.evaluate(()=>S.collections.find(x=>x.serial==='NV52-A').school_id)));await p.waitForSelector('#screen-bmap');await p.screenshot({path:B+'/shots/nv52-bmap-phone.png',fullPage:true});
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'phone: no horizontal scroll');
 ok(!errs.length,'no page errors '+errs.join(' | '));
 await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
