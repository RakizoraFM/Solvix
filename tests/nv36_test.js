const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(__dirname,'nv34_test.js'),'utf8');
const fixtureSource=source.slice(source.indexOf('function fixture()'),source.indexOf('async function test('));
const box={require,path,root,fs,vm,console,URL,URLSearchParams,atob,btoa,escape,unescape};vm.createContext(box);vm.runInContext(fixtureSource,box);
const helper={window:{},PAGE_META:{}};vm.createContext(helper);vm.runInContext(fs.readFileSync(path.join(root,'src/parts/operations.js'),'utf8').replace(/<\/?script[^>]*>/g,''),helper);const N=helper.window.NV36;
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
function seed(f,id){const r={id,notes:'base',quantity:1};f.db.nv_collections.push({...r});f.ctx.S.collections.push({...r});f.C.snap.collections[id]=f.C.key('collections',r)}
(async()=>{
await test('comparison ignores object key ordering',()=>assert.ok(N.equal({a:1,b:{x:2}},{b:{x:2},a:1})));
await test('independent field edits merge automatically',()=>{const r=N.merge({a:1,b:1},{a:2,b:1},{a:1,b:3},{});assert.equal(r.a,2);assert.equal(r.b,3)});
await test('concurrent field edits require explicit choice',()=>assert.throws(()=>N.merge({a:1},{a:2},{a:3},{})));
await test('explicit remote choice preserves remote edit',()=>assert.equal(N.merge({a:1},{a:2},{a:3},{a:'remote'}).a,3));
await test('same edit on both sides is not a conflict',()=>assert.equal(N.diff({a:1},{a:2},{a:2})[0].conflict,false));
await test('drafts are excluded from quality counts',()=>assert.equal(N.qualityLocal([{type_id:'t'},{submitted_at:'x'}]).scope_total,0));
await test('overlapping quality gaps count an asset once',()=>{const r=N.qualityLocal([{type_id:'t',submitted_at:'x',serial:' N/A '}]);assert.equal(r.with_issues,1);assert.equal(r.photos,1);assert.equal(r.serial,1);assert.equal(r.review,1)});
await test('complete local metadata has no quality gap',()=>assert.equal(N.qualityLocal([{type_id:'t',submitted_at:'x',serial:'12',asset_image:'a',asset_image2:'b',review_status:'ok'}]).with_issues,0));
await test('assigned reviewer requires review permission',()=>{assert.equal(N.stageAllowed({users:['u']},'reader','u',false),false);assert.equal(N.stageAllowed({users:['u']},'reader','u',true),true)});
await test('unassigned role cannot approve',()=>assert.equal(N.stageAllowed({roles:['manager']},'reader','u',true),false));
await test('conflicts persist original and local versions',async()=>{const f=box.fixture();seed(f,'a');f.ctx.S.collections[0].notes='local';f.db.nv_collections[0].notes='remote';await f.C.sync();const q=f.C.conflicts['collections:a'];assert.equal(q.base.notes,'base');assert.equal(q.local.notes,'local');assert.ok(f.memory.sync_conflicts['collections:a'])});
await test('conflicted record does not block independent edits',async()=>{const f=box.fixture();seed(f,'a');seed(f,'b');f.ctx.S.collections[0].notes='local-a';f.ctx.S.collections[1].notes='local-b';f.db.nv_collections[0].notes='remote-a';await f.C.sync();assert.equal(f.db.nv_collections[1].notes,'local-b');assert.equal(f.db.nv_collections[0].notes,'remote-a')});
await test('multiple conflicts remain individually recoverable',async()=>{const f=box.fixture();seed(f,'a');seed(f,'b');for(const r of f.ctx.S.collections)r.notes='local';for(const r of f.db.nv_collections)r.notes='remote';await f.C.sync();assert.equal(Object.keys(f.C.conflicts).length,2)});
await test('repeat sync preserves the original conflict snapshot',async()=>{const f=box.fixture();seed(f,'a');f.ctx.S.collections[0].notes='local';f.db.nv_collections[0].notes='remote';await f.C.sync();const original=JSON.stringify(f.C.conflicts);await f.C.sync();assert.equal(JSON.stringify(f.C.conflicts),original)});
await test('settings conflicts include recoverable local version',async()=>{const f=box.fixture();f.C.staffRole='owner';f.C.snap.settings.data=JSON.stringify(f.settings);f.settings.admin_email='remote@example.test';f.ctx.S.settings.admin_email='local@example.test';await f.C.sync();assert.equal(f.C.conflicts['settings:1'].local.admin_email,'local@example.test')});
console.log(passed+' NV36 tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
