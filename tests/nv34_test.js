// Dependency-free client regression tests: node tests/nv34_test.js
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.join(__dirname,'..');let passed=0;
function fixture(){
 const memory={},local=new Map(),calls=[],tables=['categories','conditions','rooms','types','employees','schools','collections','settings','log'];
 const ctx={console:{warn(){}},URL,URLSearchParams,atob,btoa,escape,unescape,window:{addEventListener(){}},location:{hash:'',search:''},
  localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},
  lsGet:(k,d)=>local.has(k)?JSON.parse(local.get(k)):d,lsSet:(k,v)=>local.set(k,JSON.stringify(v)),
  clearSess(){},reindex(){},route(){},saveTimer:{},TABLES:tables,urlCache:new Map(),S:{},
  setTimeout:()=>1,clearTimeout(){},toast(){},$$:()=>[],confirm:()=>false,
  IDB:{get:async(s,k)=>memory[k],put:async(s,k,v)=>{memory[k]=v},clear:async()=>{}},saveNow:async()=>{},saveAll:async()=>{}};
 for(const t of tables)ctx.S[t]=t==='settings'?{app_name:'Solvix',admin_email:'',logo:null,label:null,geo:null,room_tpl:null}:[];
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/parts/cloud.js'),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
 const C=ctx.window.Cloud;C.on=true;C.role='admin';C.staffRole='reader';C.badge=()=>{};
 const db={};for(const t of tables){C.snap[t]={};db['nv_'+t]=[]}
 const settings={...ctx.S.settings};const clone=x=>JSON.parse(JSON.stringify(x));
 C.client={rpc:async(fn,a)=>{
   calls.push({fn,a});
   if(fn==='nv_client_settings'||fn==='nv_public_settings')return {data:{data:clone(settings)}};
   if(fn==='nv_busy_schools')return {data:[]};
   if(fn==='nv_settings_save'){if(JSON.stringify(a.p_expected)!==JSON.stringify(settings))return {error:{message:'SOLVIX_CONFLICT:nv_settings:1'}};Object.assign(settings,a.p_data);return {data:null}}
   if(fn!=='nv_sync_mutate')throw new Error('Unexpected RPC '+fn);
   const rows=db[a.p_table],r=rows.find(r=>r.id===a.p_id),t=Object.keys(db).find(k=>k===a.p_table)?.slice(3);
   if(!r||JSON.stringify(C.canon(t,r))!==JSON.stringify(a.p_expected))return {error:{message:'SOLVIX_CONFLICT:'+a.p_table+':'+a.p_id}};
   if(a.p_delete)rows.splice(rows.indexOf(r),1);else Object.assign(r,a.p_patch);return {data:{ok:true}};
 },from(table){const q={id:null,single:false,select(){return this},range(){return this},order(){return this},limit(){return this},eq(k,v){this.id=v;return this},maybeSingle(){this.single=true;return this},
   then(ok,bad){let rows=clone(db[table]||[]);if(this.id)rows=rows.filter(x=>x.id===this.id);return Promise.resolve({data:this.single?rows[0]||null:rows}).then(ok,bad)}};return q},
   auth:{signOut:async()=>({})}};
 return {C,ctx,db,memory,calls,settings};
}
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
function seed(f,row={id:'a',quantity:1,notes:'old'}){f.db.nv_collections.push({...row});f.ctx.S.collections.push({...row});f.C.snap.collections[row.id]=f.C.key('collections',row)}
(async()=>{
 await test('all inline executable scripts parse',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');let n=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/application\/json|\bsrc=/.test(m[1]))continue;new vm.Script(m[2]);n++}assert.ok(n>10)});
 await test('only changed columns are submitted',async()=>{const f=fixture();seed(f);f.ctx.S.collections[0].notes='edited';await f.C.sync();assert.equal(f.C.err,null);const p=f.calls.find(x=>x.fn==='nv_sync_mutate').a.p_patch;assert.deepEqual(JSON.parse(JSON.stringify(p)),{notes:'edited'});assert.equal(f.db.nv_collections[0].quantity,1)});
 await test('concurrent remote edit is never overwritten',async()=>{const f=fixture();seed(f);f.db.nv_collections[0].quantity=9;f.ctx.S.collections[0].notes='edited';await f.C.sync();assert.match(f.C.err.message,/CONFLICT/);assert.equal(f.db.nv_collections[0].quantity,9);assert.equal(f.db.nv_collections[0].notes,'old');assert.equal(f.ctx.S.collections[0].notes,'edited')});
 await test('remote deletion never becomes an upsert',async()=>{const f=fixture();seed(f);f.db.nv_collections=[];f.ctx.S.collections[0].notes='edited';await f.C.sync();assert.match(f.C.err.message,/CONFLICT/);assert.equal(f.db.nv_collections.length,0)});
 await test('pull retains pending deletion and original snapshot',async()=>{const f=fixture();seed(f);const snap=f.C.snap.collections.a;f.ctx.S.collections=[];await f.C.pull();assert.equal(f.ctx.S.collections.length,0);assert.equal(f.C.snap.collections.a,snap);assert.ok(f.C.pendingCount()>0)});
 await test('pull does not rebase a conflict silently',async()=>{const f=fixture();seed(f);const snap=f.C.snap.collections.a;f.ctx.S.collections[0].notes='edited';f.db.nv_collections[0].quantity=9;await f.C.pull();assert.equal(f.C.snap.collections.a,snap);assert.equal(f.ctx.S.collections[0].notes,'edited');await f.C.sync();assert.match(f.C.err.message,/CONFLICT/)});
 await test('pull preserves edited record deleted remotely',async()=>{const f=fixture();seed(f);const snap=f.C.snap.collections.a;f.ctx.S.collections[0].notes='edited';f.db.nv_collections=[];await f.C.pull();assert.equal(f.ctx.S.collections.length,1);/* NV51: migration-048 columns may be added to the snapshot as null */const strip=s=>{const o=JSON.parse(s);for(const k of ['zone','exc_kind','exc_reason','exc_photo','label_note'])if(o[k]===null)delete o[k];return o};assert.deepEqual(strip(f.C.snap.collections.a),strip(snap))});
 await test('successful local delete is confirmed',async()=>{const f=fixture();seed(f);f.ctx.S.collections=[];await f.C.sync();assert.equal(f.db.nv_collections.length,0);assert.equal(f.C.snap.collections.a,undefined)});
 await test('failed schema migration remains an error',async()=>{const f=fixture();seed(f);f.ctx.S.collections[0].notes='edited';f.C.client.rpc=async()=>({error:{message:"Could not find the 'geo_dist' column of 'nv_collections'"}});await f.C.sync();assert.ok(f.C.err);assert.equal(f.C.skip.size,0);assert.ok(f.C.pendingCount()>0)});
 await test('settings edits count as pending',()=>{const f=fixture();f.C.snap.settings.data=JSON.stringify(f.settings);f.ctx.S.settings.admin_email='new@example.test';assert.equal(f.C.pendingCount(),1)});
 await test('pull preserves pending settings',async()=>{const f=fixture();f.C.snap.settings.data=JSON.stringify(f.settings);f.ctx.S.settings.admin_email='new@example.test';await f.C.pull();assert.equal(f.ctx.S.settings.admin_email,'new@example.test')});
 await test('settings conflict does not overwrite remote',async()=>{const f=fixture();f.C.staffRole='owner';f.C.snap.settings.data=JSON.stringify(f.settings);f.settings.admin_email='remote@example.test';f.ctx.S.settings.admin_email='local@example.test';await f.C.sync();assert.match(f.C.err.message,/CONFLICT/);assert.equal(f.settings.admin_email,'remote@example.test')});
 await test('account switch cannot erase pending work',async()=>{const f=fixture();seed(f);f.ctx.S.collections[0].notes='unsent';f.memory.cloud_owner='old';await assert.rejects(()=>f.C.setMe({role:'admin'},'new'));assert.equal(f.ctx.S.collections[0].notes,'unsent')});
 await test('successful logout clears cached data',async()=>{const f=fixture();seed(f);assert.equal(await f.C.signOut(),true);assert.equal(f.ctx.S.collections.length,0);assert.equal(f.C.role,null)});
 await test('logout refuses to lose unsent work',async()=>{const f=fixture();seed(f);f.ctx.S.collections[0].notes='local';f.db.nv_collections[0].notes='remote';assert.equal(await f.C.signOut(),false);assert.equal(f.C.role,'admin');assert.equal(f.ctx.S.collections[0].notes,'local')});
 await test('conflict screen opens without replacing local data',async()=>{const f=fixture();seed(f);f.C.err=new Error('SOLVIX_CONFLICT:nv_collections:a');f.ctx.S.collections[0].notes='local';await f.C.resolveConflict();assert.equal(f.ctx.S.collections[0].notes,'local');assert.equal(f.ctx.location.hash,'#admin/conflicts')});
 console.log(passed+' client regression tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
