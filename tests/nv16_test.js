// NV16: schools and field supervisors tables — sort, filters, selection, bulk delete, export, import (offline mode)
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
const B=__dirname,U='http://localhost:8766/index.html?local';
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({acceptDownloads:true,viewport:{width:1366,height:900}});
 await ctx.route(/^https:\/\/(cdnjs|cdn\.jsdelivr|fonts|[abc]\.tile)/,async r=>{try{const res=await fetch(r.request().url());await r.fulfill({status:res.status,body:Buffer.from(await res.arrayBuffer()),headers:{'content-type':res.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'}})}catch(e){await r.abort()}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('dialog',d=>d.type()==='prompt'?d.accept('حذف'):d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const xlRows=async dl=>p.evaluate(async b=>{await needXLSX();const wb=XLSX.read(Uint8Array.from(atob(b),c=>c.charCodeAt(0)),{type:'array'});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1}).length-1},require('fs').readFileSync(await dl.path()).toString('base64'));
 const mkFile=async aoa=>{await p.evaluate(()=>needXLSX());return Buffer.from(await p.evaluate(a=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(a),'S');return XLSX.write(wb,{type:'base64',bookType:'xlsx'})},aoa),'base64')};
 await p.goto(U+'#admin');await p.waitForSelector('#em');await p.fill('#em','a@b.com');await p.fill('#pw','123456');await p.fill('#pw2','123456');await p.click('button[type=submit]');await p.waitForSelector('#schoolStatusChart');
 // ---- schools
 await p.goto(U+'#admin/schools');await p.waitForSelector('#nvt-schools tbody tr');const C=()=>p.textContent('#nvt-schools [data-nvt="count"]');ok((await C())==='2170 من 2170','schools: 2170');
 ok((await p.$$eval('#nvt-schools .nvt-sort',t=>t.length))===9,'schools: 9 visible sortable headers');await p.click('#nvt-schools .dropdown-toggle');await p.check('#nvt-schools [data-col="site"]');await p.waitForSelector('#nvt-schools [data-sort="site"]');ok((await p.$$eval('#nvt-schools .nvt-sort',t=>t.length))===10,'column chooser: show «الموقع»');await p.click('#nvt-schools .dropdown-toggle');await p.uncheck('#nvt-schools [data-col="site"]');await p.waitForFunction(()=>!document.querySelector('#nvt-schools [data-sort="site"]'));
 const city=await p.evaluate(()=>{const m={};for(const s of S.schools)m[s.city]=(m[s.city]||0)+1;return Object.entries(m).sort((a,b)=>a[1]-b[1]).filter(x=>x[1]>=25)[0][0]});await p.selectOption('#nvt-schools [data-f="city"]',city);const nCity=+(await C()).split(' ')[0];
 const dists=await p.$$eval('#nvt-schools [data-f="district"] option',o=>o.length-1);ok(nCity>0&&nCity<2170&&dists>0,`city filter «${city}»: ${nCity}, ${dists} districts`);
 await p.click('#nvt-schools [data-sort="name"]');const names=await p.$$eval('#nvt-schools tbody tr td:nth-child(4)',t=>t.map(x=>x.textContent.trim()));
 ok(names.every((n,i)=>!i||names[i-1].localeCompare(n,'ar',{numeric:true})>=0),'sort by name (desc)');
 await p.check('#nvt-schools [data-nvt="all"]');ok(+(await p.textContent('#nvt-schools [data-nvt="seln"]'))===nCity,'select all filtered = '+nCity);
 const [d1]=await Promise.all([p.waitForEvent('download'),p.click('#nvt-schools [data-nvb="__xl"]')]);ok((await xlRows(d1))===nCity,'export selected schools');
 await p.click('#nvt-schools [data-nvb="del"]');await p.waitForSelector('.alert-success');ok(await p.evaluate(n=>S.schools.length===2170-n,nCity),'bulk delete '+nCity+' schools (typed confirmation)');
 await p.click('#nvt-schools [data-nvt="clear"]');const [d2]=await Promise.all([p.waitForEvent('download'),p.click('#nvt-schools [data-nvt="xl"]')]);ok((await xlRows(d2))===2170-nCity,'export all schools');
 const one=await p.evaluate(()=>({ident:S.schools[0].ident,name:S.schools[0].name}));
 const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#nvt-schools [data-nvt="imp"]')]);await fc.setFiles({name:'s.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await mkFile([['school_identifier','Name (Arabic)','City'],[one.ident,one.name+' (محدث)',''],['NEW-0001','مدرسة جديدة','بريدة']])});
 await p.waitForSelector('.alert-success');ok(await p.evaluate(o=>S.schools.find(s=>s.ident===o.ident).name.endsWith('(محدث)')&&!!S.schools.find(s=>s.ident==='NEW-0001'),one),'import schools: updated + added');
 await p.screenshot({path:B+'/shots/60-schools-table.png'});
 // ---- field supervisors
 await p.goto(U+'#admin/employees');await p.waitForSelector('#nvt-employees tbody tr');const E=()=>p.textContent('#nvt-employees [data-nvt="count"]');ok((await E())==='142 من 142','supervisors: 142');
 await p.fill('#nvt-employees [data-f="number"]','229');const n229=+(await E()).split(' ')[0];ok(n229>=1,'filter by number: '+n229);
 await p.fill('#nvt-employees [data-f="number"]','');await p.click('#nvt-employees tbody tr:nth-child(1) [data-id]');await p.click('#nvt-employees tbody tr:nth-child(2) [data-id]');
 const del=await p.$$eval('#nvt-employees tbody tr.sel [data-id]',x=>x.map(y=>y.dataset.id));await p.click('#nvt-employees [data-nvb="del"]');await p.waitForSelector('.alert-success');
 ok(await p.evaluate(d=>S.employees.length===140&&!d.some(id=>get('employees',id)),del),'delete 2 selected supervisors');
 const [fe]=await Promise.all([p.waitForEvent('filechooser'),p.click('#nvt-employees [data-nvt="imp"]')]);await fe.setFiles({name:'e.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await mkFile([['Employee Number','Name'],['88001','مشرف جديد'],['88001','مكرر']])});
 await p.waitForSelector('.alert-success');ok(await p.evaluate(()=>S.employees.length===141&&S.employees.some(e=>e.number==='88001')),'import supervisors (duplicate row skipped)');
 // delete everything: select all then delete
 await p.check('#nvt-employees [data-nvt="all"]');await p.click('#nvt-employees [data-nvb="del"]');await p.waitForSelector('.alert-success');ok(await p.evaluate(()=>S.employees.length===0),'delete all supervisors');
 await p.screenshot({path:B+'/shots/61-users-table.png'});
 console.log(errs.length?errs.join('\n'):'no console errors');await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
