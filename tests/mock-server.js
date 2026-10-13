// Node side: an in-memory stand-in for the section 20 tables, functions and policies.
module.exports=function(){
 const db={nv_categories:[],nv_conditions:[],nv_rooms:[],nv_types:[],nv_employees:[],nv_schools:[],nv_collections:[],nv_log:[],nv_settings:[{id:1,data:{}}],nv_staff:[{user_id:'u-admin',email:'admin@x.com',name:'Admin',role:'admin',active:true,created_at:'2026-01-01'}]};
 const users={'admin@x.com':{id:'u-admin',pw:'adminpass',kind:'admin'}};const files={};let no=0;const resets=[];
 const who=u=>{if(!u)return {role:null};const x=Object.entries(users).find(([e,v])=>v.id===u.id);if(!x)return {role:null};if(x[1].kind==='admin')return {role:'admin',staff_role:'owner'};if(['owner','manager','coordinator'].includes(x[1].kind))return {role:'admin',staff_role:x[1].kind};if(x[1].kind==='reader')return {role:'reader',staff_role:'reader'};const emp=db.nv_employees.find(e=>e.user_id===u.id);return emp?{role:'tech',emp}:{role:null}};
 const err=m=>({data:null,error:{message:m}});
 const vis=(t,me)=>{let rows=db[t];if(me.role==='tech'){if(t==='nv_collections')rows=rows.filter(r=>r.employee_id===me.emp.id);if(t==='nv_employees')rows=rows.filter(r=>r.id===me.emp.id);if(t==='nv_log')rows=[]}else if(me.role!=='admin'&&me.role!=='reader'&&t!=='nv_settings')rows=[];return rows};
 const match=(r,f)=>f.every(([op,k,v])=>op==='eq'?String(r[k])===String(v):v.map(String).includes(String(r[k])));
 const open=(sid,me)=>{const s=db.nv_schools.find(x=>x.id===sid);return s&&s.status==='active'&&!s.completed_at&&!db.nv_collections.some(c=>c.school_id===sid&&c.employee_id!==me.emp.id)};
 const LOGK=['category_id','type_id','condition_id','quantity','price','status','brand','serial','notes','floor','room_number','room_name_id','employee_id','asset_image'];
 const handle=s=>{const me=who(s.user);const t=s.table;
  if(s.op==='reset'){resets.push(s.email);return {data:{},error:null}}
  if(s.op==='setpw'){const x=Object.values(users).find(v=>v.id===(s.user&&s.user.id));if(!x)return err('not signed in');x.pw=s.password;return {data:{user:s.user},error:null}}
  if(s.op==='signin'){const u=users[s.email];if(!u||u.pw!==s.password)return err('Invalid login credentials');return {data:{user:{id:u.id,email:s.email}},error:null}}
  if(s.op==='upload'){if(!me.role)return err('not allowed');files[s.name]=s.data;return {data:{path:s.name},error:null}}
  if(s.op==='download'){if(!me.role)return err('not allowed');return files[s.name]?{data:files[s.name],error:null}:err('not found')}
  if(s.op==='rpc'){const a=s.args||{};switch(s.fn){
   case 'nv_me':return {data:{role:me.role,staff_role:me.staff_role||null,emp:me.emp?{id:me.emp.id,number:me.emp.number,name:me.emp.name}:null},error:null};
   case 'nv_busy_schools':return {data:[...new Set(db.nv_collections.filter(c=>!me.emp||c.employee_id!==me.emp.id).map(c=>c.school_id))],error:null};
   case 'nv_emp_logins':return {data:db.nv_employees.map(e=>({id:e.id,has_login:!!e.user_id})),error:null};
   case 'nv_emp_set_login':{if(me.role!=='admin')return err('not allowed');if((a.p_password||'').length<8)return err('password too short');const e=db.nv_employees.find(x=>x.id===a.p_emp);if(!e)return err('employee not found');
     const em=e.email||'nv'+e.number.toLowerCase().replace(/[^a-z0-9]/g,'')+'@novaro.local';for(const k of Object.keys(users))if(users[k].id==='u-'+e.id&&k!==em){users[em]=users[k];delete users[k]}users[em]=users[em]||{id:'u-'+e.id,kind:'tech'};users[em].pw=a.p_password;e.user_id=users[em].id;return {data:em,error:null}}
   case 'nv_complete_school':{if(me.role!=='tech')return err('not allowed');if(!db.nv_collections.some(c=>c.school_id===a.p_school&&c.employee_id===me.emp.id&&c.submitted_at))return err('no submitted assets');
     db.nv_collections=db.nv_collections.filter(c=>!(c.school_id===a.p_school&&c.employee_id===me.emp.id&&!c.submitted_at));const sc=db.nv_schools.find(x=>x.id===a.p_school);Object.assign(sc,{completed_at:sc.completed_at||new Date().toISOString(),completed_by:sc.completed_by||me.emp.id,status:'inactive'});return {data:null,error:null}}
   case 'nv_staff_create':{if(!['owner','manager'].includes(me.staff_role))return err('not allowed');if(!['owner','manager','coordinator'].includes(a.p_role))return err('invalid role');if((a.p_password||'').length<8)return err('password too short');const id='u-'+a.p_email;users[a.p_email]={id,pw:a.p_password,kind:a.p_role};db.nv_staff.push({user_id:id,email:a.p_email,name:a.p_name,role:a.p_role,active:true,created_at:new Date().toISOString()});return {data:id,error:null}}
   case 'nv_staff_set':{if(!['owner','manager'].includes(me.staff_role))return err('not allowed');const u=db.nv_staff.find(x=>x.user_id===a.p_user);Object.assign(u,{role:a.p_role,active:a.p_active});const e=Object.values(users).find(x=>x.id===a.p_user);if(e)e.kind=a.p_active?a.p_role:'none';return {data:null,error:null}}
   case 'nv_staff_set_password':{const e=Object.values(users).find(x=>x.id===a.p_user);e.pw=a.p_password;return {data:null,error:null}}
   default:return err('unknown rpc '+s.fn)}}
  if(!db[t])return err(`relation "public.${t}" does not exist`);
  if(s.op==='select'){if(!me.role&&t!=='nv_settings')return err('permission denied for table '+t);let rows=vis(t,me).filter(r=>match(r,s.filters));if(s.range)rows=rows.slice(s.range[0],s.range[1]+1);if(s.limit)rows=rows.slice(0,s.limit);rows=JSON.parse(JSON.stringify(rows));return {data:s.single?(rows[0]||null):rows,error:null}}
  const admin=me.role==='admin',tech=me.role==='tech';
  if(s.op==='insert'||s.op==='upsert'){const out=[];for(const r0 of s.rows){const r=Object.assign({},r0);const ex=db[t].find(x=>x.id===r.id);
     if(!admin){if(!(tech&&t==='nv_collections'&&r.employee_id===me.emp.id&&(ex||open(r.school_id,me))))return err('new row violates row-level security policy for table "'+t+'"')}
     if(ex){if(s.op==='insert')return err('duplicate key value violates unique constraint');upd(t,ex,r,me)}else{if(t==='nv_collections'){r.no=++no;r.updated_at=new Date().toISOString()}db[t].push(r);out.push(r)}}
   return {data:out.map(r=>({id:r.id,no:r.no})),error:null}}
  if(s.op==='update'){let n=0;for(const r of db[t].filter(r=>match(r,s.filters))){if(!(admin||(tech&&t==='nv_collections'&&r.employee_id===me.emp.id)||(t==='nv_settings'&&admin)))continue;upd(t,r,s.patch,me);n++}return {data:null,error:null}}
  if(s.op==='delete'){db[t]=db[t].filter(r=>!(match(r,s.filters)&&(admin||(tech&&t==='nv_collections'&&r.employee_id===me.emp.id&&!r.submitted_at))));return {data:null,error:null}}
  return err('bad op')};
 const upd=(t,r,p,me)=>{if(t==='nv_collections'&&r.submitted_at){const ch={};for(const k of LOGK)if(k in p&&JSON.stringify(r[k]??null)!==JSON.stringify(p[k]??null))ch[k]={old:r[k]??null,new:p[k]??null};if(Object.keys(ch).length)db.nv_log.unshift({id:'l'+Math.random(),at:new Date().toISOString(),by:me.role==='admin'?'admin':'emp:'+me.emp.id,coll:r.id,school:r.school_id,emp:r.employee_id,changes:ch})}
   Object.assign(r,p);if(t==='nv_collections')r.updated_at=new Date().toISOString()};
 return {db,files,users,resets,handle:j=>JSON.stringify(handle(JSON.parse(j)))};
};
