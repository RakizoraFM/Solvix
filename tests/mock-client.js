// Browser side of the Supabase stand-in: every call goes to the Node test process (window.__mockCall).
(()=>{const KEY='solvix-auth';try{if(!localStorage.getItem('solvix_cloud_cfg'))localStorage.setItem('solvix_cloud_cfg',JSON.stringify({url:'https://test-solvix.supabase.co',key:'sb_publishable_test_key_0123456789abcdefghij'}))}catch(e){}
const sess=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
const call=async spec=>{const s=sess();const r=JSON.parse(await window.__mockCall(JSON.stringify(Object.assign({user:s&&s.user},spec))));return r};
class Q{constructor(t){this.s={table:t,op:'select',filters:[]}}
  select(c){if(this.s.op==='select')this.s.op='select';this.s.ret=true;return this}
  range(a,b){this.s.range=[a,b];return this} order(){return this} limit(n){this.s.limit=n;return this}
  eq(k,v){this.s.filters.push(['eq',k,v]);return this} in(k,v){this.s.filters.push(['in',k,v]);return this}
  maybeSingle(){this.s.single=true;return this}
  insert(rows){this.s.op='insert';this.s.rows=rows;return this} upsert(rows){this.s.op='upsert';this.s.rows=rows;return this}
  update(o){this.s.op='update';this.s.patch=o;return this} delete(){this.s.op='delete';return this}
  then(res,rej){return call(this.s).then(res,rej)}}
const b64=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(b)});
window.supabase={createClient(){return {
  auth:{async getSession(){const s=sess();return {data:{session:s}}},
    async signInWithPassword({email,password}){const r=await call({op:'signin',email,password});if(r.error)return r;localStorage.setItem(KEY,JSON.stringify({user:r.data.user}));return r},
    async signOut(){localStorage.removeItem(KEY);return {error:null}},
    async resetPasswordForEmail(email,o){return call({op:'reset',email,redirectTo:o&&o.redirectTo})},
    async updateUser({password}){return call({op:'setpw',password})}},
  from:t=>new Q(t), rpc:(fn,args)=>({then:(a,b)=>call({op:'rpc',fn,args}).then(a,b)}),
  storage:{from:()=>({async upload(name,blob){return call({op:'upload',name,data:await b64(blob)})},
    async download(name){const r=await call({op:'download',name});if(r.error)return r;const bin=atob(r.data);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return {data:new Blob([u],{type:'image/jpeg'}),error:null}}})}
}}};})();
