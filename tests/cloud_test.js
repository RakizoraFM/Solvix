const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});const fs=require('fs');
const B=__dirname,U='http://localhost:8766/index.html';const M=require('./mock-server.js')();M.noCols.add('nv_collections.geo_dist');M.noCols.add('nv_collections.review_status');/* NV27: a database where solvix_setup.sql was not re-run yet */
(async()=>{
 const br=await chromium.launch();const errs=[];
 const mk=async(vw)=>{const ctx=await br.newContext({ignoreHTTPSErrors:true,acceptDownloads:true,permissions:['geolocation'],geolocation:{latitude:26.33,longitude:43.97},viewport:vw||{width:1280,height:900}});
  await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{if(/supabase-js/.test(r.request().url()))return r.abort();try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
  await ctx.exposeFunction('__mockCall',j=>M.handle(j));await ctx.addInitScript({path:B+'/mock-client.js'});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/tile\.openstreetmap|ERR_FAILED/.test(m.text()))errs.push('CONSOLE '+m.text())});return {ctx,p}};
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 // ---- admin: sign in with a platform account, load the lists, give a technician a login
 const A=await mk();const a=A.p;let dlg='';a.on('dialog',async d=>{dlg=d.message();await(d.type()==='prompt'?d.accept(d.defaultValue()):d.accept())});
 await a.goto(U+'#admin');await a.waitForSelector('#em');ok((await a.textContent('.sx-sub')).includes('Solvix'),'cloud admin login text');
 await a.fill('#em','admin@x.com');await a.fill('#pw','wrong');await a.click('button[type=submit]');await a.waitForSelector('.sx-err');ok(true,'wrong password refused');
 await a.fill('#pw','adminpass');await a.click('button[type=submit]');await a.waitForSelector('#initCloud');ok(true,'empty-cloud banner');
 await a.click('#initCloud');await a.waitForSelector('.alert-success',{timeout:60000});
 ok(M.db.nv_schools.length===2170&&M.db.nv_types.length===279&&M.db.nv_types.every(t=>t.code&&t.l2&&t.l3)&&M.db.nv_employees.length===142,`lists in cloud ${M.db.nv_schools.length}/${M.db.nv_types.length}/${M.db.nv_employees.length}`);
 await a.goto(U+'#admin/employees?search=22912');await a.waitForSelector('[data-setpw]');await a.click('[data-setpw]');await a.waitForTimeout(800);
 const pw=(dlg.match(/كلمة المرور: (\S+)/)||[])[1];ok(!!pw&&M.db.nv_employees.find(e=>e.number==='22912').user_id,'technician login created '+pw);
 // second technician gets a login straight in the mock
 M.handle(JSON.stringify({user:{id:'u-admin'},op:'rpc',fn:'nv_emp_set_login',args:{p_emp:M.db.nv_employees.find(e=>e.number==='21426').id,p_password:'87654321'}}));
 // ---- technician phone
 const T=await mk({width:390,height:844});const t=T.p;t.on('dialog',d=>d.accept());
 await t.goto(U);await t.waitForSelector('#pw');await t.fill('#em','22912');await t.fill('#pw','bad');await t.click('button[type=submit]');
 await t.waitForSelector('.sx-err');ok((await t.textContent('.sx-err')).includes('غير صحيحة'),'tech wrong password');
 await t.fill('#pw',pw);await t.click('button[type=submit]');await t.waitForSelector('#screen-data');ok(!(await t.$('#send')),'no send-file card in cloud');
 await t.click('text=تأكيد البيانات');await t.fill('#q','الضياء');await t.waitForSelector('#res li');await t.click('#res li >> nth=0');await t.setInputFiles('#school-image',B+'/a.png');await t.click('#next');
 await t.waitForSelector('#floor-select');await t.selectOption('#floor-select','الأرضي');await t.selectOption('#room-number','1');
 await t.selectOption('#room-name',await t.$eval('#room-name',s=>[...s.options].find(o=>o.dataset.nameEn==='Class').value));await t.click('#submit-btn');await t.waitForSelector('#a_category_id');
 const fill=async q=>{await t.selectOption('#a_category_id',await t.$eval('#a_category_id',s=>s.options[2].value));await t.selectOption('#a_l2',{index:1});await t.selectOption('#a_l3',{index:1});await t.selectOption('#a_type_id',{index:1});await t.setInputFiles('#aimg',{name:'b.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/b.png')});await t.setInputFiles('#aimg2',{name:'c.png',mimeType:'image/png',buffer:require('fs').readFileSync(B+'/a.png')});
   await t.fill('#a_quantity',String(q));await t.fill('#a_price','99');await t.selectOption('#a_condition_id',{index:1});await t.selectOption('#a_parent_child','Child');await t.fill('#a_brand','LG')};
 await fill(3);await t.click('#sb');await t.waitForSelector('#same');await t.waitForTimeout(1500);
 const c1=M.db.nv_collections.filter(c=>c.submitted_at);ok(c1.length===1&&c1[0].quantity===3&&c1[0].no===1,'record in cloud: '+c1.length);
 ok(M.files[c1[0].asset_image+'.jpg']&&M.files[c1[0].school_image+'.jpg'],'photos uploaded');
 ok(!('geo_dist' in c1[0])&&(await t.evaluate(()=>(Cloud.dbOld||[]).join())).includes('geo_dist'),'NV27: old database (no geo_dist / review_status) — the record is still sent without those columns');
 // offline: the next asset waits on the phone, then goes when the connection returns
 await T.ctx.setOffline(true);await t.evaluate(()=>{window.__mockCallSaved=window.__mockCall;window.__mockCall=()=>Promise.reject(new Error('Failed to fetch'))});
 await t.click('#same');await t.waitForSelector('#a_category_id');await fill(2);await t.click('#sb');await t.waitForSelector('#same');await t.waitForTimeout(800);
 ok(M.db.nv_collections.filter(c=>c.submitted_at).length===1,'offline: not sent yet');ok(!!(await t.$('#lblCard[data-wait]'))&&!(await t.$('#lblPrev')),'NV31: offline — the label waits for the upload (no number yet)');ok((await t.textContent('[data-nv-sync]')).includes('1')||(await t.textContent('[data-nv-sync]')).includes('2'),'pending badge '+(await t.textContent('[data-nv-sync]')));
 await t.evaluate(()=>nvPendUI());await t.waitForTimeout(300);const pb=await t.$eval('#nvPend',e=>({c:e.className,r:+e.dataset.recs,ph:+e.dataset.ph,tx:e.textContent}));ok(/wait|err/.test(pb.c)&&pb.r>=1&&pb.ph>=2&&pb.tx.includes('إرسال الآن'),'NV26 upload bar while offline: '+JSON.stringify(pb));
 await t.evaluate(()=>{window.__mockCall=window.__mockCallSaved});await T.ctx.setOffline(false);await t.evaluate(()=>window.dispatchEvent(new Event('online')));await t.waitForTimeout(2500);
 ok(M.db.nv_collections.filter(c=>c.submitted_at).length===2,'online again: sent ('+M.db.nv_collections.filter(c=>c.submitted_at).length+')');
 await t.waitForSelector('#lblCard:not([data-wait]) #lblPrev .lb svg',{timeout:15000});{const no=M.db.nv_collections.filter(c=>c.submitted_at).map(c=>c.no).sort((a,b)=>b-a)[0];ok((await t.textContent('#lblCard')).includes('101'+String(no).padStart(8,'0')),'NV31: after the upload the label appears with the database number '+no)}
 {const [pw]=await Promise.all([T.ctx.waitForEvent('page'),t.click('#lblPrint')]);await pw.waitForSelector('.lb');await pw.close();
  const cur=await t.evaluate(()=>curColl().id);await t.waitForFunction(id=>!lsGet('nv_label_q',[]).some(x=>x.id===id),cur,{timeout:15000}).catch(()=>{});
  ok(!!(M.db.nv_collections.find(c=>c.id===cur)||{}).label_printed_at,'NV32: print time sent to the database (nv_label_printed)');
  const lb=await t.evaluate(()=>assetLabel(curColl()));const png=Buffer.from((await t.evaluate(async l=>{await needQR();const q=qrcode(0,'M');q.addData('x#a/'+l);q.make();return q.createDataURL(8,6)},lb)).split(',')[1],'base64');
  await t.waitForTimeout(800);await t.setInputFiles('#lcCam',{name:'l.png',mimeType:'image/png',buffer:png});await t.waitForSelector('#lcDone',{timeout:15000}).catch(()=>{});await t.waitForFunction(id=>!lsGet('nv_label_q',[]).some(x=>x.id===id),cur,{timeout:15000}).catch(()=>{});await t.waitForTimeout(500);
  const r=M.db.nv_collections.find(c=>c.id===cur)||{};ok(r.label_check==='ok'&&!!M.files[r.label_photo+'.jpg'],'NV32: label confirmed in the database + photo uploaded (nv_label_confirm)')}
 await t.evaluate(()=>nvPendUI());await t.waitForTimeout(500);const pb2=await t.$eval('#nvPend',e=>({c:e.className,tx:e.textContent}));ok(/\bok\b/.test(pb2.c)&&pb2.tx.includes('مرفوعة'),'NV26 upload bar after sending: '+JSON.stringify(pb2));
 const school=M.db.nv_collections[0].school_id;
 // second technician cannot take a school the first one is working on
 const T2=await mk({width:390,height:844});const t2=T2.p;await t2.goto(U);await t2.waitForSelector('#pw');await t2.fill('#em','21426');await t2.fill('#pw','87654321');await t2.click('button[type=submit]');
 await t2.waitForSelector('#screen-data');await t2.click('text=تأكيد البيانات');const sname=M.db.nv_schools.find(s=>s.id===school).name;await t2.uncheck('#favail');await t2.fill('#q',M.db.nv_schools.find(s=>s.id===school).moe);await t2.waitForSelector('#res li');await t2.click('#res li >> nth=0');
 ok((await t2.textContent('#eid')).length>0,'busy school blocked for technician 2');
 // first technician finishes the school
 await t.click('#fin');await t.waitForSelector('#screen-job-completed');await t.waitForTimeout(1500);
 for(let i=0;i<40&&!M.mails.some(m=>m.body&&m.body.kind==='school');i++)await t.waitForTimeout(500);const ml=M.mails.find(m=>m.body&&m.body.kind==='school');
 ok(!!ml&&ml.fn==='solvix-mail'&&ml.role==='tech'&&ml.body.file_b64.length>1000&&ml.body.count>0,'school report e-mailed on completion ('+(ml?ml.body.count+' assets, '+Math.round(ml.body.file_b64.length/1024)+' KB':'none')+')');
 if(ml){const x=await t.evaluate(async b=>{await needExcelJS();const wb=new ExcelJS.Workbook();await wb.xlsx.load(Uint8Array.from(atob(b),c=>c.charCodeAt(0)).buffer);const p=wb.getWorksheet('صور الأصول');return [wb.worksheets.map(w=>w.name).join('|'),p.getImages().length,p.getRow(2).getCell(1).value]},ml.body.file_b64);
   ok(x[0]==='البيانات|صور الأصول'&&x[1]>=2&&/^101\d{8}$/.test(String(x[2])),'report: sheets '+x[0]+', '+x[1]+' images, first asset '+x[2])}
 const sc=M.db.nv_schools.find(s=>s.id===school);ok(sc.completed_at&&sc.status==='inactive'&&M.db.nv_collections.every(c=>c.submitted_at),'school completed through nv_complete_school');
 await t.click('#out');await t.waitForSelector('#pw');ok(true,'tech signed out');
 // ---- admin sees it, edits, change log from the server
 await a.goto(U+'#admin/collections');await a.waitForSelector('table');await a.waitForTimeout(1500);await a.goto(U+'#admin/data');await a.click('#cPull');await a.waitForSelector('.alert-success');
 await a.goto(U+'#admin/collections');await a.waitForSelector('.app-main a[href^="#admin/collections/view/"]');ok(true,'admin sees the technician group');
 await a.click('.app-main a[href^="#admin/collections/view/"]');await a.waitForSelector('a[title="تعديل"]');await a.waitForTimeout(500);await a.screenshot({path:B+'/shots/30-cloud-group.png'});
 await a.click('a[title="تعديل"] >> nth=0');await a.waitForSelector('[name=brand]');await a.fill('[name=brand]','Samsung');await a.click('button:has-text("حفظ التعديل")');await a.waitForSelector('.alert-success');await a.waitForTimeout(1500);
 ok(M.db.nv_collections.some(c=>c.brand==='Samsung')&&M.db.nv_log.length===1&&M.db.nv_log[0].by==='admin','admin edit + server log');
 await a.goto(U+'#admin/settings');await a.fill('#application_name','Novaro Qassim');await a.click('button:has-text("حفظ")');await a.waitForTimeout(1500);ok(M.db.nv_settings[0].data.app_name==='Novaro Qassim','settings in cloud');
 await a.goto(U+'#admin');await a.waitForSelector('[data-kpi=bar]');const k=[await a.getAttribute('[data-kpi=assets]','data-val'),await a.getAttribute('[data-kpi=bar]','data-val')];ok(k.join(',')==='5,1,0,2169','dashboard '+k.join(','));await a.screenshot({path:B+'/shots/31-cloud-dashboard.png'});
 // users page (NV10): one page, four roles
 await a.goto(U+'#admin/users');await a.waitForSelector('#staffBox table');ok((await a.textContent('#staffBox')).includes('مالك المشروع'),'owner listed in the users page');
 await a.click('button.btn-primary[data-adduser]');await a.selectOption('#u_role','coordinator');await a.fill('#u_name','Coord');await a.fill('#u_email','co@x.com');const cpw=await a.inputValue('#u_pw');await a.click('#fu button.btn-primary');await a.waitForSelector('.alert-success');
 ok(M.db.nv_staff.some(u=>u.email==='co@x.com'&&u.role==='coordinator'),'coordinator added');
 await a.click('button.btn-primary[data-adduser]');await a.selectOption('#u_role','field');await a.fill('#u_name','Field One');await a.fill('#u_num','99001');await a.fill('#u_email','field.one@x.com');const fpw=await a.inputValue('#u_pw');await a.click('#fu button.btn-primary');await a.waitForSelector('.alert-success');
 ok(M.db.nv_employees.some(e=>e.number==='99001'&&e.user_id),'field supervisor added with a sign-in');
 const R=await mk();const rp=R.p;rp.on('dialog',d=>d.accept());await rp.goto(U+'#admin');await rp.waitForSelector('#em');await rp.fill('#em','co@x.com');await rp.fill('#pw',cpw);await rp.click('button[type=submit]');await rp.waitForSelector('.app-sidebar');
 ok(!(await rp.$('a[href="#admin/settings"]')),'coordinator has no general settings');
 await rp.goto(U+'#admin/employees');await rp.waitForSelector('button.btn-primary[data-adduser]');ok((await rp.$$eval('#u_role option',o=>o.map(x=>x.value).join(',')))==='field'&&!(await rp.$('#staffBox table')),'coordinator adds field supervisors only');
 await rp.goto(U+'#admin/schools/'+M.db.nv_schools[0].id+'/edit');await rp.waitForSelector('#name');await rp.fill('#name','Coord edit');await rp.click('button:has-text("حفظ")');await rp.waitForTimeout(1500);ok(M.db.nv_schools[0].name==='Coord edit','coordinator edit saved');
 // NV17: e-mail sign-in for a field supervisor, forgotten password, new password
 const F1=await mk({width:390,height:844});const f1=F1.p;await f1.goto(U);await f1.waitForSelector('#pw');await f1.fill('#em','field.one@x.com');await f1.fill('#pw',fpw);await f1.click('button[type=submit]');await f1.waitForSelector('#screen-data');ok(true,'field supervisor signs in with e-mail');
 const F2=await mk();const f2=F2.p;await f2.goto(U+'#login');await f2.waitForSelector('#pw');await f2.click('a[href="#forgot"]');await f2.waitForSelector('#em');await f2.fill('#em','field.one@x.com');await f2.click('button[type=submit]');await f2.waitForSelector('.sx-note');
 ok(M.resets.includes('field.one@x.com')&&(await f2.textContent('.sx-note')).includes('field.one@x.com'),'forgot password: reset link requested');
 await f2.goto(U+'#reset-password');await f2.waitForSelector('.sx-err');ok((await f2.textContent('.sx-err')).includes('انتهت صلاحية'),'reset page without a session asks for a new link');
 await f1.goto(U+'#reset-password');await f1.waitForSelector('#pw2');await f1.fill('#pw','NewPass123');await f1.fill('#pw2','NewPass123');await f1.click('button[type=submit]');await f1.waitForSelector('#screen-data');
 ok(M.users['field.one@x.com'].pw==='NewPass123','new password saved');
 await a.goto(U+'#admin');await a.waitForSelector('.user-menu');ok(!!(await a.$('a[href="#reset-password"]')),'admin menu: change password');
 // a read-only account (older installs) cannot change anything
 M.users['reader@x.com']={id:'u-reader',pw:'readpass',kind:'reader'};M.db.nv_staff.push({user_id:'u-reader',email:'reader@x.com',name:'Reader',role:'reader',active:true,created_at:'2026-01-02'});
 const R2=await mk();const rq=R2.p;rq.on('dialog',d=>d.accept());await rq.goto(U+'#admin');await rq.waitForSelector('#em');await rq.fill('#em','reader@x.com');await rq.fill('#pw','readpass');await rq.click('button[type=submit]');await rq.waitForSelector('.app-sidebar');const before=JSON.stringify(M.db.nv_schools[0]);
 await rq.goto(U+'#admin/schools/'+M.db.nv_schools[0].id+'/edit');await rq.waitForSelector('#name');await rq.fill('#name','HACK');await rq.click('button:has-text("حفظ")');await rq.waitForTimeout(1500);ok(JSON.stringify(M.db.nv_schools[0])===before,'reader edit not saved');
 // an account without access

 M.users['sup@x.com']={id:'u-sup',pw:'suppass',kind:'none'};const P=await mk();const pp=P.p;await pp.goto(U+'#admin');await pp.waitForSelector('#em');await pp.fill('#em','sup@x.com');await pp.fill('#pw','suppass');await pp.click('button[type=submit]');await pp.waitForSelector('.sx-err');ok((await pp.textContent('.sx-err')).includes('صلاحية'),'no-access account refused');
 console.log(errs.length?errs.join('\n'):'no console errors');await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
