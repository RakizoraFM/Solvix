// Pure helpers, shared by the Edge function and local tests. No secret is returned to a browser.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const isMail = s => typeof s==='string' && s.length<=254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && !s.endsWith('@novaro.local');
export function ccList(value,primary='') {
 const list=Array.isArray(value)?value:String(value||'').split(/[,;\s،]+/);
 const result=[...new Set(list.map(x=>String(x).trim().toLowerCase()).filter(Boolean))].filter(x=>x!==primary.toLowerCase());
 if(result.length>20||result.some(x=>!isMail(x)))throw Error('تحقق من عناوين CC؛ الحد الأقصى 20 عنواناً.');return result;
}
export function projectUrl(raw) {
 const u=new URL(String(raw));
 if(u.protocol!=='https:'||u.username||u.password||u.port||!/^[-a-z0-9]+\.supabase\.co$/.test(u.hostname)||!['','/'].includes(u.pathname)||u.search||u.hash)throw Error('استخدم رابط مشروع Supabase الرسمي فقط.');
 return u.origin;
}
export function portalUrl(raw) {
 const u=new URL(String(raw));if(u.protocol!=='https:'||u.username||u.password)throw Error('رابط المنصة يجب أن يبدأ بـ HTTPS.');
 u.hash='';u.search='';return u.toString();
}
export function isPublicKey(key) {
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;
 try{return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon'}catch{return false}
}
export function isServiceKey(key) {
 if(/^sb_secret_[A-Za-z0-9_-]+$/.test(key))return true;
 try{return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='service_role'}catch{return false}
}
export function clientInput(raw,create=false) {
 const x={};for(const k of ['name','contact_name','email','plan'])x[k]=String(raw[k]||'').trim();x.email=x.email.toLowerCase();
 if(!x.name||!x.contact_name||x.name.length>200||x.contact_name.length>200||!isMail(x.email))throw Error('اسم العميل والمسؤول والبريد الصحيح مطلوبة.');
 if(!['trial','quarterly','half','yearly','custom'].includes(x.plan))throw Error('الباقة غير صحيحة.');
 x.cc=ccList(raw.cc,x.email);x.portal_url=portalUrl(raw.portal_url);
 for(const k of ['starts_at','ends_at']){x[k]=raw[k]?new Date(raw[k]).toISOString():null}
 if(x.starts_at&&x.ends_at&&x.ends_at<x.starts_at)throw Error('تاريخ انتهاء الاشتراك يسبق بدايته.');
 x.grace_days=Number(raw.grace_days??7);if(!Number.isInteger(x.grace_days)||x.grace_days<0||x.grace_days>90)throw Error('أيام السماح من 0 إلى 90.');
 for(const k of ['max_schools','max_field','max_staff','max_assets']){x[k]=raw[k]===''||raw[k]==null?null:Number(raw[k]);if(x[k]!=null&&(!Number.isSafeInteger(x[k])||x[k]<0))throw Error('الحدود يجب أن تكون أعداداً صحيحة غير سالبة.');}
 if(create){x.project_url=projectUrl(raw.project_url);x.publishable_key=String(raw.publishable_key||'').trim();if(!isPublicKey(x.publishable_key))throw Error('مفتاح الربط العام غير صحيح؛ لا تضع المفتاح السري في حقل المفتاح العام.');if(x.max_staff===0)throw Error('يلزم حساب إدارة واحد على الأقل لمالك العميل.');}
 return x;
}
export function clientLink(c) {
 const u=new URL(c.portal_url);u.search='';u.hash='login';u.searchParams.set('project',btoa(JSON.stringify({url:c.project_url,key:c.publishable_key})));return u.toString();
}
const bytesTo64=a=>btoa(String.fromCharCode(...a));
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function aesKey(encoded) {const a=from64(encoded);if(a.length!==32)throw Error('CLIENTS_ENCRYPTION_KEY must encode exactly 32 bytes');return crypto.subtle.importKey('raw',a,'AES-GCM',false,['encrypt','decrypt']);}
export async function encryptCredential(secret,key,id) {
 const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},await aesKey(key),new TextEncoder().encode(secret));
 return {iv:bytesTo64(iv),data:bytesTo64(new Uint8Array(data))};
}
export async function decryptCredential(cipher,key,id) {
 const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(cipher.iv),additionalData:new TextEncoder().encode(id)},await aesKey(key),from64(cipher.data));return new TextDecoder().decode(data);
}
export function password() {return 'Sx!'+bytesTo64(crypto.getRandomValues(new Uint8Array(18))).replace(/[+/=]/g,'A')+'9';}
const date=x=>x?new Date(x).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn',{timeZone:'Asia/Riyadh'}):'غير محدد';
const cap=x=>x==null?'بلا حد':String(x);
export function subscriptionHtml(c) {
 const plans={trial:'تجريبية',quarterly:'ربع سنوية',half:'نصف سنوية',yearly:'سنوية',custom:'خاصة'};
 const days=c.starts_at&&c.ends_at?Math.ceil((new Date(c.ends_at)-new Date(c.starts_at))/864e5):null;
 const users=c.max_field==null||c.max_staff==null?null:c.max_field+c.max_staff;
 return `<table cellpadding="7" style="border-collapse:collapse;border:1px solid #ddd"><tr><td>العميل</td><td>${esc(c.name)}</td></tr><tr><td>المسؤول</td><td>${esc(c.contact_name)}</td></tr><tr><td>الباقة</td><td>${esc(plans[c.plan]||c.plan)}</td></tr><tr><td>بداية الاشتراك</td><td>${esc(date(c.starts_at))}</td></tr><tr><td>انتهاء الاشتراك</td><td>${esc(date(c.ends_at))}</td></tr><tr><td>مدة الاشتراك</td><td>${days==null?'غير محددة':days+' يوم'}</td></tr><tr><td>فترة السماح</td><td>${esc(c.grace_days)} أيام</td></tr><tr><td>إجمالي المستخدمين</td><td>${cap(users)}</td></tr><tr><td>حسابات الإدارة</td><td>${cap(c.max_staff)}</td></tr><tr><td>مشرفو الميدان</td><td>${cap(c.max_field)}</td></tr><tr><td>المباني</td><td>${cap(c.max_schools)}</td></tr><tr><td>الأصول</td><td>${cap(c.max_assets)}</td></tr></table>`;
}
export function welcomeHtml(c,pw=null) {
 return `<div dir="rtl" style="font-family:Tahoma,Arial;line-height:1.9"><h2>مرحباً بك في Solvix</h2><p>أهلاً ${esc(c.contact_name)}، تم تجهيز حساب ${esc(c.name)}.</p><p><a href="${esc(clientLink(c))}">الدخول إلى منصة Solvix</a></p>${pw?`<p>البريد: <b dir="ltr">${esc(c.email)}</b><br>كلمة المرور الأولية: <b dir="ltr">${esc(pw)}</b></p><p>يرجى تغيير كلمة المرور بعد تسجيل الدخول من قائمة حسابك.</p>`:'<p>أُرسلت بيانات الدخول في رسالة مستقلة إلى صاحب الحساب فقط.</p>'}${subscriptionHtml(c)}</div>`;
}
