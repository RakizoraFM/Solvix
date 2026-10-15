const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const ctx={window:{},PAGE_META:{},Intl,Date,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/parts/analytics.js'),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);const A=ctx.window.A41;
const L={schools:[{id:'b1',name:'Building',ident:'1',city:'city1'},{id:'b2',name:'Building',ident:'2',city:'city2'}],employees:[{id:'e1',name:'Employee',number:'1'}],types:[{id:'t1',ar:'Type1',cat:'a',critical:true,l2:'L2'},{id:'t2',ar:'Type2',cat:'a'},{id:'t3',ar:'Type3',cat:'b'}],categories:[{id:'a',ar:'A'},{id:'b',ar:'B'}],conditions:[{id:'good',ar:'Good'},{id:'weak',ar:'Weak'}],rooms:[]};
const raw=[{id:'1',no:1,type_id:'t1',category_id:'a',school_id:'b1',employee_id:'e1',quantity:2,price:10,condition_id:'good',submitted_at:'2026-10-14T22:00:00Z',serial:'SERIAL1'},
{id:'2',no:2,type_id:'t2',category_id:'a',school_id:'b1',employee_id:'e1',quantity:3,price:20,condition_id:'weak',submitted_at:'2026-10-15T01:00:00Z'},
{id:'3',no:3,type_id:'t3',category_id:'b',school_id:'b2',quantity:5,price:null,condition_id:'good',submitted_at:'2026-10-13T01:00:00Z'},
{id:'4',no:4,type_id:'t3',category_id:'b',school_id:'b1',quantity:0,price:100,condition_id:null,submitted_at:'2026-10-13T01:00:00Z'}];
const facts=A.facts(raw,L),defaults=()=>A.defaults(),approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-9);let count=0;function test(n,fn){fn();count++;console.log('PASS '+n)}
test('drafts and untyped records are excluded',()=>assert.equal(A.facts([...raw,{...raw[0],submitted_at:null},{...raw[0],type_id:null}],L).length,4));
test('dates use Saudi time across UTC midnight',()=>assert.equal(facts[0].day,'2026-10-15'));
test('quantities count units while records count rows',()=>{const t=A.aggregate(facts);assert.equal(t.qty,10);assert.equal(t.records,4)});
test('value is quantity multiplied by available unit price',()=>assert.equal(A.aggregate(facts).value,80));
test('distinct buildings are counted once across categories',()=>assert.equal(A.aggregate(facts).buildings.size,2));
test('weighted mean excludes unpriced units',()=>{const t=A.aggregate(facts);assert.equal(t.pricedQ,5);assert.equal(A.measure(t,'average'),16)});
test('unknown prices remain missing rather than zero priced',()=>assert.equal(A.aggregate(facts).unpriced,1));
test('zero price is valid and participates in the weighted mean',()=>{const f=A.facts([{...raw[0],price:0}],L);assert.equal(f[0].priced,true);assert.equal(A.measure(A.aggregate(f),'average'),0)});
test('zero priced quantity does not invent an average',()=>assert.equal(A.measure(A.aggregate([facts[3]]),'average'),null));
test('invalid numeric values are flagged without contaminating totals',()=>{const f=A.facts([{...raw[0],price:'NaN'},{...raw[0],quantity:-3}],L);const t=A.aggregate(f);assert.equal(t.invalid,2);assert.equal(t.value,0);assert.equal(t.qty,2)});
test('filters are OR within a dimension and AND across dimensions',()=>{const c=defaults();c.filters={category:['a','b'],condition:['good']};assert.equal(A.filter(facts,c).length,2);c.filters.building=['b1'];assert.equal(A.filter(facts,c).length,1)});
test('all search terms must match the selected records',()=>{const c=defaults();c.search='serial1 type1';assert.equal(A.filter(facts,c).length,1);c.search='serial1 type2';assert.equal(A.filter(facts,c).length,0)});
test('date end is inclusive and uses the same date convention',()=>{const c=defaults();c.from='2026-10-15';c.to='2026-10-15';assert.equal(A.filter(facts,c).length,2)});
test('chart context ignores only its own filter',()=>{const c=defaults();c.filters={category:['a'],condition:['good']};assert.equal(A.filter(facts,c).length,1);assert.equal(A.filter(facts,c,'category').length,2)});
test('single chart selection toggles off when repeated',()=>{const c=defaults();const selected=A.toggle(c,'category',['a']);assert.equal(selected.filters.category[0],'a');assert.equal(A.toggle(selected,'category',['a']).filters.category,undefined);assert.equal(c.filters.category,undefined)});
test('multi selection adds and removes without mutating the input',()=>{let c=A.toggle(defaults(),'category',['a']);const old=c;c=A.toggle(c,'category',['b'],true);assert.equal(c.filters.category.length,2);assert.equal(old.filters.category.length,1);c=A.toggle(c,'category',['a'],true);assert.equal(c.filters.category[0],'b')});
test('missing dimensions can be filtered explicitly',()=>{const c=defaults();c.filters.condition=[null];assert.equal(A.filter(facts,c).length,1)});
test('pivot subtotal and grand total reconcile with source rows',()=>{const m=A.pivot(facts,['category','type'],'condition');assert.equal(m.root.agg.qty,10);assert.equal(m.root.children.get('a').agg.qty,5);assert.equal(m.root.children.get('a').children.get('t1').cells.get('good').value,20)});
test('pivot keeps missing column separate from literal null text',()=>{const m=A.pivot([...facts,{...facts[0],dims:{...facts[0].dims,condition:'null'}}],['category'],'condition');assert.ok(m.columns.includes(null));assert.ok(m.columns.includes('null'))});
test('grand distinct count is recalculated rather than summed',()=>{const m=A.pivot(facts,['category'],'condition');assert.equal(A.measure(m.root.agg,'buildings'),2);assert.equal([...m.root.children.values()].reduce((s,n)=>s+n.agg.buildings.size,0),3)});
test('grand average is recomputed from priced quantity',()=>{const f=A.facts([raw[0],{...raw[1],quantity:1,price:100}],L),m=A.pivot(f,['type'],'condition');approx(A.measure(m.root.agg,'average'),40)});
test('pivot without columns still preserves full totals',()=>{const m=A.pivot(facts,['category'],'');assert.equal(m.columns.length,1);assert.equal(m.root.cells.get(null).qty,10)});
test('collapsed hierarchy only shows top-level rows',()=>{const c=defaults(),m=A.pivot(facts,c.rows,c.column);assert.equal(A.visible(m.root,new Set(),c,n=>n.path.at(-1).key).length,2)});
test('expanded hierarchy displays children without changing totals',()=>{const c=defaults(),m=A.pivot(facts,c.rows,c.column),a=m.root.children.get('a'),expanded=new Set([JSON.stringify(a.path)]);assert.equal(A.visible(m.root,expanded,c,n=>n.path.at(-1).key).length,4);assert.equal(m.root.agg.qty,10)});
test('leaf export excludes parent subtotals',()=>{const c=defaults(),m=A.pivot(facts,c.rows,c.column),leaves=A.leaves(m.root,c,n=>n.path.at(-1).key);assert.equal(leaves.length,3);assert.equal(leaves.reduce((s,n)=>s+n.agg.qty,0),m.root.agg.qty)});
test('drill-through matches row path AND the selected column',()=>{const rows=A.drill(facts,[{dim:'category',key:'a'}],'condition','weak');assert.equal(rows.length,1);assert.equal(rows[0].id,'2')});
test('grand total drill-through includes all filtered rows',()=>assert.equal(A.drill(facts,[]).length,4));
test('empty cell drill-through remains empty',()=>assert.equal(A.drill(facts,[{dim:'category',key:'b'}],'condition','weak').length,0));
test('other chart bucket recomputes a weighted mean',()=>{const f=A.facts([{...raw[0],type_id:'t1',quantity:2,price:10},{...raw[0],id:'x',type_id:'t2',quantity:10,price:20},{...raw[0],id:'y',type_id:'t3',quantity:2,price:40}],L),g=A.group(f,'type','average',1);assert.equal(g.length,2);assert.equal(g[1].other,true);approx(A.measure(g[1].agg,'average'),220/12)});
test('duplicate row dimensions and overlapping columns are rejected',()=>{assert.throws(()=>A.validate({...defaults(),rows:['category','category']}));assert.throws(()=>A.validate({...defaults(),column:'category'}))});
test('unknown and inherited names cannot be used as dimensions or measures',()=>{for(const x of [{metric:'constructor'},{chart:'toString'},{rows:['__proto__']},{filters:{constructor:['x']}}])assert.throws(()=>A.validate({...defaults(),...x}))});
test('reversed and impossible dates are rejected',()=>{assert.throws(()=>A.validate({...defaults(),from:'2026-10-16',to:'2026-10-15'}));assert.throws(()=>A.validate({...defaults(),from:'2026-02-30'}))});
test('valid saved views are normalized and cloned',()=>{const c=defaults();c.filters.category=['a','a'];const v=A.validate(c);assert.equal(v.filters.category.length,1);v.rows.push('building');assert.equal(c.rows.length,2)});
test('equal building names remain distinct by IDs and labels',()=>{assert.notEqual(A.label('building','b1',L),A.label('building','b2',L));assert.equal(A.pivot(facts,['building'],'condition').root.children.size,2)});
test('saved view namespace is isolated by project and user',()=>{ctx.Cloud={on:true,scope:()=> 'project-a',user:{id:'user-1'}};const first=ctx.a41Scope();ctx.Cloud.user.id='user-2';assert.notEqual(first,ctx.a41Scope());ctx.Cloud.user.id='user-1';ctx.Cloud.scope=()=> 'project-b';assert.notEqual(first,ctx.a41Scope())});
console.log(count+' NV41 calculation tests passed');
