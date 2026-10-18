// NV46: nv_schools.extra sync switch — old snapshots get extra:{} once the column is detected, so nothing is resent; an old DB keeps syncing without it
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/node-tools/node_modules/playwright')}})();
(async()=>{const br=await chromium.launch();const p=await br.newPage();const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 await p.route(/^https:\/\//,r=>r.abort());await p.goto('http://localhost:8766/index.html?local#admin');await p.waitForFunction(()=>typeof Cloud!=='undefined'&&typeof S!=='undefined'&&S.schools.length);
 const r=await p.evaluate(async()=>{const out={};Cloud.scope=()=>'nv46.test';localStorage.removeItem('nv_extra_ok_nv46.test');
  const s=S.schools[0];s.extra={};Cloud.snap.schools={[s.id]:Cloud.key('schools',s)};out.before=!Cloud.snap.schools[s.id].includes('"extra"');
  await Cloud.detectExtra([{id:s.id,extra:{}}]);out.ok=Cloud.extraOk();out.migrated=Cloud.snap.schools[s.id]===Cloud.key('schools',s);out.has=Cloud.key('schools',s).includes('"extra":{}');
  s.extra={f1:'x'};out.pending=Cloud.snap.schools[s.id]!==Cloud.key('schools',s);
  const before=JSON.parse(Cloud.snap.schools[s.id]),row=Cloud.canon('schools',s);out.patch=Object.keys(row).filter(k=>k!=='id'&&JSON.stringify(row[k])!==JSON.stringify(before[k]));
  await Cloud.detectExtra([{id:s.id}]);out.off=!Cloud.extraOk()&&Cloud.dbOld.includes('nv_schools.extra')&&!Cloud.key('schools',s).includes('extra');
  out.settings=JSON.stringify(Cloud.settingsOf({app_name:'A',site:null}))===JSON.stringify({app_name:'A',admin_email:'',logo:null,label:null,geo:null,room_tpl:null})&&!!Cloud.settingsOf({site:{fields:{},extra:[]}}).site;return out});
 ok(r.before,'NV45 snapshot has no extra');ok(r.ok&&r.migrated&&r.has,'column detected: old snapshot upgraded, row not pending');ok(r.pending&&r.patch.join()==='extra','an own-field edit sends only extra');
 ok(r.off,'old DB: extra dropped from sync, update banner listed');ok(r.settings,'settings: site only when set');await br.close()})().catch(e=>{console.error(e);process.exit(1)});
