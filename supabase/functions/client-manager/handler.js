// Provider control plane. Deploy on the provider project ONLY with --no-verify-jwt.
// Every interactive action verifies the caller using Auth + nv_me().sys.
// Secrets: CLIENTS_ENCRYPTION_KEY (32 random bytes, base64), RESEND_API_KEY, MAIL_FROM,
// CRON_SECRET, and standard SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY.
import {createClient} from 'jsr:@supabase/supabase-js@2';
import {clientInput,clientLink,encryptCredential,decryptCredential,password,welcomeHtml,esc,isMail,isServiceKey} from './shared.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-cron-secret','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,'Content-Type':'application/json'}});
const checked=({data,error})=>{if(error)throw Error(error.message);return data};
const clean=e=>String(e?.message||e).replace(/sb_secret_[A-Za-z0-9_-]+/g,'[secret]').replace(/eyJ[A-Za-z0-9_.-]{30,}/g,'[token]').slice(0,500);
const adminClient=(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'POST only'},405);
 let central,clientId=null,lock=null;
 try{
  if(Number(req.headers.get('content-length')||0)>24000)return json({error:'request too large'},413);
  const raw=await req.text();if(raw.length>24000)return json({error:'request too large'},413);const body=JSON.parse(raw);
  const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),encryption=Deno.env.get('CLIENTS_ENCRYPTION_KEY');
  if(!encryption)throw Error('CLIENTS_ENCRYPTION_KEY is not configured');
  central=adminClient(url,service);
  const cron=!!Deno.env.get('CRON_SECRET')&&req.headers.get('x-cron-secret')===Deno.env.get('CRON_SECRET');
  let actor=null,actorEmail=null;
  if(cron){if(body.action!=='reminders')return json({error:'not allowed'},403)}
  else{
   const sb=createClient(url,Deno.env.get('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false}});
   const user=checked(await sb.auth.getUser());if(!user?.user)return json({error:'not allowed'},403);
   const me=checked(await sb.rpc('nv_me'));if(!me?.sys)return json({error:'only the system administrator'},403);actor=user.user.id;actorEmail=user.user.email;
  }
  const audit=async(op,id,details={})=>checked(await central.from('nv_audit').insert({actor,table_name:'nv_clients',operation:op,row_id:id,new_data:details}));
  const mail=async(to,cc,subject,html)=>{
   const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('MAIL_FROM');if(!key||!from)throw Error('RESEND_API_KEY / MAIL_FROM are not configured');
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,...(cc.length?{cc}:{}),subject,html})});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.message||'mail delivery failed');return data.id;
  };
  const remote=async c=>adminClient(c.project_url,await decryptCredential(c.credential_cipher,encryption,c.id));
  const welcome=async(c,pw)=>{
   try{
    await mail([c.email],[],`Solvix — بيانات دخول ${c.name}`,welcomeHtml(c,pw));
    checked(await central.from('nv_clients').update({mail_status:'credentials_sent'}).eq('id',c.id));
    if(c.cc.length)await mail([c.email],c.cc,`Solvix — ملخص اشتراك ${c.name}`,welcomeHtml(c));
    checked(await central.from('nv_clients').update({mail_status:'sent',last_error:null}).eq('id',c.id));
    await audit('WELCOME_SENT',c.id,{to:c.email,cc:c.cc});return {sent:true};
   }catch(e){checked(await central.from('nv_clients').update({mail_status:'error',last_error:clean(e)}).eq('id',c.id));return {sent:false,error:clean(e)}}
  };
  const subscription=c=>({customer:c.name,contact_name:c.contact_name,contact_email:c.email,mail_cc:c.cc,portal_url:clientLink(c),provider_email:Deno.env.get('SUPPORT_EMAIL')||actorEmail||null,plan:c.plan,starts_at:c.starts_at,ends_at:c.ends_at,grace_days:c.grace_days,max_schools:c.max_schools,max_field:c.max_field,max_staff:c.max_staff,max_assets:c.max_assets,updated_at:new Date().toISOString(),updated_by:'provider'});
  const provision=async c=>{
   const sb=await remote(c);const branding=checked(await sb.rpc('nv_public_settings'));if(branding?.schema_version!==38)throw Error('حدّث قاعدة العميل إلى NV38 أولاً.');
   // Never attach an already populated customer backend to a different client.
   const other=checked(await sb.from('nv_staff').select('user_id').neq('role','sysadmin'))||[];
   if(!c.provisioned_at&&other.some(x=>x.user_id!==c.remote_user_id))throw Error('مشروع العميل يحتوي حسابات عميل موجود؛ استخدم مشروعاً مستقلاً فارغاً.');
   const pw=password();let uid=c.remote_user_id;
   if(!uid){
    for(let page=1;;page++){
     const data=checked(await sb.auth.admin.listUsers({page,perPage:1000}));
     const found=data.users.find(u=>u.email?.toLowerCase()===c.email);
     if(found){if(found.app_metadata?.solvix_client_id!==c.id)throw Error('البريد موجود مسبقاً في المشروع ولا يرتبط بطلب تجهيز هذا العميل.');uid=found.id;break}
     if(data.users.length<1000)break;
    }
   }
   if(uid)checked(await sb.auth.admin.updateUserById(uid,{password:pw}));
   else{
    const made=checked(await sb.auth.admin.createUser({email:c.email,password:pw,email_confirm:true,user_metadata:{full_name:c.contact_name},app_metadata:{solvix_client_id:c.id}}));uid=made.user.id;
   }
   checked(await central.from('nv_clients').update({remote_user_id:uid}).eq('id',c.id));
   checked(await sb.from('nv_staff').upsert({user_id:uid,email:c.email,name:c.contact_name,role:'owner',active:true},{onConflict:'user_id'}));
   checked(await sb.from('nv_subscription').update(subscription(c)).eq('id',1));
   const currentSettings=checked(await sb.from('nv_settings').select('data').eq('id',1));
   checked(await sb.from('nv_settings').update({data:{...(currentSettings?.[0]?.data||{}),app_name:'Solvix — '+c.name}}).eq('id',1));
   checked(await central.from('nv_clients').update({status:'active',remote_user_id:uid,provisioned_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq('id',c.id));
   await audit('PROVISIONED',c.id,{email:c.email,project_url:c.project_url});return {user_id:uid,...await welcome(c,pw)};
  };
  if(body.action==='reminders'){
   const cutoff=new Date(Date.now()-12*3600e3).toISOString();
   const rows=checked(await central.from('nv_clients').select('*').eq('status','active').or('last_reminder_check.is.null,last_reminder_check.lt.'+cutoff).order('last_reminder_check',{nullsFirst:true}).limit(20))||[];
   const results=[];
   for(let offset=0;offset<rows.length;offset+=4)await Promise.all(rows.slice(offset,offset+4).map(async c=>{
    try{
     checked(await central.from('nv_clients').update({last_reminder_check:new Date().toISOString()}).eq('id',c.id));
     const sb=await remote(c),due=checked(await sb.rpc('nv_sub_reminder_due'));if(!due){checked(await central.from('nv_clients').update({reminder_error:null}).eq('id',c.id));results.push({id:c.id,sent:false});return}
     const to=[...new Set([...(due.to||[]),c.email].filter(isMail))],cc=[...new Set([...(due.cc||[]),...c.cc].filter(isMail))].filter(x=>!to.includes(x));
     if(!checked(await sb.rpc('nv_sub_reminder_claim',{p_stage:due.stage,p_ends_at:due.ends_at}))){results.push({id:c.id,sent:false});return}
     const subject=due.stage===0?'انتهى الاشتراك':`تذكير: انتهاء الاشتراك خلال ${due.days} يوم`;
     await mail(to,cc,`Solvix — ${subject} — ${c.name}`,`<div dir="rtl" style="font-family:Tahoma;line-height:1.9"><h3>${esc(subject)}</h3><p>العميل: ${esc(c.name)}</p><p>ينتهي في: ${esc(new Date(due.ends_at).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{timeZone:'Asia/Riyadh'}))}</p><p>فترة السماح: ${esc(due.grace_days)} أيام، ثم يتوقف التعديل وتبقى البيانات متاحة للعرض والتصدير.</p><p><a href="${esc(clientLink(c))}">فتح المنصة وطلب التجديد</a></p></div>`);
     checked(await sb.rpc('nv_sub_reminder_mark',{p_stage:due.stage,p_ends_at:due.ends_at,p_to:to.concat(cc)}));
     checked(await central.from('nv_clients').update({reminder_error:null}).eq('id',c.id));results.push({id:c.id,sent:true});
    }catch(e){await central.from('nv_clients').update({reminder_error:clean(e)}).eq('id',c.id);results.push({id:c.id,error:clean(e)})}
   }));return json({ok:true,checked:rows.length,results});
  }
  if(body.action==='create'){
   const c=clientInput(body.client,true);if(c.project_url===new URL(url).origin)throw Error('لا يمكن استخدام مشروع الإدارة المركزية كقاعدة عميل.');
   const secret=String(body.service_key||'').trim();if(!isServiceKey(secret))throw Error('مفتاح service_role أو secret لمشروع العميل مطلوب.');
   clientId=crypto.randomUUID();c.id=clientId;c.credential_cipher=await encryptCredential(secret,encryption,c.id);
   checked(await central.from('nv_clients').insert(c));await audit('CREATED',c.id,{name:c.name,email:c.email,project_url:c.project_url});
  }else clientId=String(body.client_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(clientId))throw Error('invalid client id');
  lock=crypto.randomUUID();const c=checked(await central.rpc('nv_client_lock',{p_id:clientId,p_token:lock}));if(!c)throw Error('يوجد إجراء جارٍ لهذا العميل. حاول بعد اكتماله.');
  let result={};
  if(body.action==='create'||body.action==='provision')result=await provision(c);
  else if(body.action==='save'){
   const changes=clientInput(body.client);if(changes.email!==c.email)throw Error('بريد حساب العميل ثابت؛ عدّل الحساب من إدارة المستخدمين أولاً.');
   const next={...c,...changes};let credential=null;
   if(body.service_key){if(!isServiceKey(String(body.service_key)))throw Error('المفتاح السري الجديد غير صحيح.');credential=await encryptCredential(String(body.service_key),encryption,c.id);next.credential_cipher=credential;}
   const sb=await remote(next);checked(await sb.from('nv_subscription').update(subscription(next)).eq('id',1));
   if(c.remote_user_id&&changes.contact_name!==c.contact_name){checked(await sb.auth.admin.updateUserById(c.remote_user_id,{user_metadata:{full_name:changes.contact_name}}));checked(await sb.from('nv_staff').update({name:changes.contact_name}).eq('user_id',c.remote_user_id));}
   checked(await central.from('nv_clients').update({...changes,...(credential?{credential_cipher:credential}:{}),updated_at:new Date().toISOString(),last_error:null,last_reminder_check:null,reminder_error:null}).eq('id',c.id));await audit('SUBSCRIPTION_UPDATED',c.id,changes);result={saved:true};
  }else if(body.action==='resend'){
   if(!c.remote_user_id)throw Error('أكمل تجهيز العميل أولاً.');const sb=await remote(c),pw=password();
   checked(await sb.auth.admin.updateUserById(c.remote_user_id,{password:pw}));result=await welcome(c,pw);
  }else if(body.action==='users'){
   const sb=await remote(c),users=[];for(let page=1;;page++){const data=checked(await sb.auth.admin.listUsers({page,perPage:1000}));users.push(...data.users.map(u=>({id:u.id,email:u.email,name:u.user_metadata?.full_name||'',created_at:u.created_at})));if(data.users.length<1000)break;}result={users};
  }else if(body.action==='delete_user'){
   const sb=await remote(c);result=checked(await sb.rpc('nv_delete_user',{p_user:body.user_id,p_emp:null}));
   if(body.user_id===c.remote_user_id)checked(await central.from('nv_clients').update({remote_user_id:null,mail_status:'owner_deleted'}).eq('id',c.id));
   await audit('REMOTE_USER_DELETED',c.id,{user_id:body.user_id});
  }else throw Error('unknown action');
  return json({ok:true,client_id:clientId,...result});
 }catch(e){
  if(central&&clientId&&lock){await central.from('nv_clients').update({last_error:clean(e)}).eq('id',clientId).eq('lock_token',lock)}
  return json({ok:false,error:clean(e),client_id:clientId},400);
 }finally{
  if(central&&clientId&&lock)await central.from('nv_clients').update({busy_until:null,lock_token:null}).eq('id',clientId).eq('lock_token',lock);
 }
});
