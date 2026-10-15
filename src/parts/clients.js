<script id="nv-clients">
/* NV35: provider control plane. Each client owns an isolated Supabase project. */
PAGE_META.clients=['bi-buildings','العملاء واشتراكاتهم المستقلة'];
async function clientAction(action,values={}) {
 const c=await Cloud.sb(),{data,error}=await c.functions.invoke('client-manager',{body:{action,...values}});
 if(error){let message=error.message;try{const payload=await error.context.json();message=payload.error||message}catch{}throw Error(message)}
 if(!data?.ok)throw Error(data?.error||'تعذّر تنفيذ الإجراء');return data;
}
async function vClients(){
 if(!isSys())return go('#admin');adminShell('clients','العملاء والاشتراكات',`<div id="clientBox">${skel(220)}</div>`);
 let list;try{list=Cloud.chk(await (await Cloud.sb()).rpc('nv_clients_list'))||[]}catch(e){const box=$('#clientBox');if(box)box.innerHTML=`<div class="alert alert-danger">${esc(e.message)} — يلزم نشر ترقية NV35 ودالة client-manager.</div>`;return}
 if(!$('#clientBox'))return;
 const input=(id,label,value='',type='text',extra='')=>`<div class="col-md-4"><label class="form-label small fw-bold" for="cl_${id}">${label}</label><input class="form-control" id="cl_${id}" type="${type}" value="${esc(value??'')}" ${extra}></div>`;
 const defaults={max_staff:3,max_field:10,max_schools:20,max_assets:10000,grace_days:7};
 $('#clientBox').innerHTML=`<div class="alert alert-info">لكل عميل قاعدة بيانات ومستخدمون واشتراك مستقل. جهّز مشروع Supabase خاصاً به وشغّل solvix_setup.sql قبل إضافته. مفاتيحه السرية تُشفّر في الخادم ولا تُعرض بعد حفظها.</div>
 <div class="card mb-4"><div class="card-header"><h3 class="card-title">إضافة عميل أو تعديل اشتراكه</h3></div><form id="clientForm" class="card-body"><input type="hidden" id="cl_id"><div class="row g-3">
 ${input('name','اسم العميل','','text','required')}${input('contact_name','اسم المسؤول','','text','required')}${input('email','بريد الدخول للعميل','','email','required dir="ltr"')}
 ${input('cc','نسخ CC — مفصولة بفواصل','','text','dir="ltr"')}${input('portal_url','رابط ملف المنصة',location.origin+location.pathname,'url','required dir="ltr"')}
 <div class="col-md-4"><label class="form-label small fw-bold" for="cl_plan">الباقة</label><select class="form-select" id="cl_plan">${Object.entries(PLAN_L).map(([v,l])=>`<option value="${v}" ${v==='yearly'?'selected':''}>${l}</option>`).join('')}</select></div>
 ${input('starts_at','بداية الاشتراك',new Date().toISOString().slice(0,10),'date')}${input('ends_at','انتهاء الاشتراك','','date','required')}${input('grace_days','أيام السماح',7,'number','min="0" max="90"')}
 ${[['max_staff','عدد حسابات الإدارة'],['max_field','عدد مشرفي الميدان'],['max_schools','عدد المباني'],['max_assets','عدد الأصول']].map(([k,l])=>input(k,l,defaults[k],'number','min="0" step="1" placeholder="بلا حد"')).join('')}
 <div class="col-12 small text-muted">إجمالي المستخدمين = حسابات الإدارة + مشرفي الميدان. الحقل الفارغ في الحدود يعني بلا حد.</div>
 <div id="clientProject" class="col-12"><div class="row g-3">${input('project_url','رابط مشروع Supabase الخاص بالعميل','','url','required dir="ltr"')}${input('publishable_key','المفتاح العام Publishable / anon','','text','required dir="ltr" autocomplete="off"')}${input('service_key','المفتاح السري Service role / secret','','password','required dir="ltr" autocomplete="new-password"')}</div></div>
 <div class="col-12 small text-muted">بيانات الدخول تُرسل إلى العميل فقط. عناوين CC تستلم رسالة منفصلة ببيانات الاشتراك والرابط دون كلمة المرور.</div>
 <div class="col-12 d-flex gap-2"><button class="btn btn-primary" type="submit" id="clientSave">إنشاء العميل وإرسال الترحيب</button><button class="btn btn-outline-secondary" type="button" id="clientReset">نموذج جديد</button><span id="clientResult" role="status"></span></div>
 </div></form></div>
 <div class="d-flex justify-content-between mb-3"><h5>العملاء (${list.length})</h5><button class="btn btn-outline-primary btn-sm" id="clientReminders">فحص تذكيرات الاشتراك</button></div>
 <div class="row g-3">${list.map(c=>`<div class="col-xl-6"><div class="card h-100"><div class="card-body"><h5>${esc(c.name)}</h5><div>${esc(c.contact_name)} — <span dir="ltr">${esc(c.email)}</span></div><div class="small text-muted">ينتهي: ${c.ends_at?esc(fmtYmd(c.ends_at)):'غير محدد'} · المباني: ${c.max_schools??'بلا حد'} · الإدارة: ${c.max_staff??'بلا حد'} · الميدان: ${c.max_field??'بلا حد'}</div>
 <div class="small mt-2">التجهيز: ${esc(c.status)} · البريد: ${esc(c.mail_status)}</div>${c.last_error?`<div class="text-danger small">${esc(c.last_error)}</div>`:''}${c.reminder_error?`<div class="text-danger small">التذكير: ${esc(c.reminder_error)}</div>`:''}
 <div class="d-flex flex-wrap gap-2 mt-3"><button class="btn btn-sm btn-outline-primary" data-client-edit="${c.id}">تعديل الاشتراك وCC</button><button class="btn btn-sm btn-outline-success" data-client-provision="${c.id}">تجهيز / استعادة حساب العميل</button>${c.remote_user_id?`<button class="btn btn-sm btn-outline-secondary" data-client-resend="${c.id}">إعادة إرسال الدخول وتغيير كلمة المرور</button>`:''}<button class="btn btn-sm btn-outline-danger" data-client-users="${c.id}">إدارة وحذف المستخدمين</button></div><div class="mt-3" id="cu_${c.id}"></div></div></div></div>`).join('')||'<p class="text-muted">لا يوجد عملاء بعد.</p>'}</div>`;
 const form=$('#clientForm'),field=k=>$('#cl_'+k),setStatus=(text,bad=false)=>{const el=$('#clientResult');if(el){el.textContent=text;el.className=bad?'text-danger':'text-success'}};
 const busy=async(button,fn)=>{button.disabled=true;try{await fn()}catch(e){setStatus(e.message,true);toast(e.message,8000)}finally{if(document.body.contains(button))button.disabled=false}};
 $('#clientReset').onclick=()=>vClients();
 form.onsubmit=e=>{e.preventDefault();busy($('#clientSave'),async()=>{
  const payload={};for(const k of ['name','contact_name','email','cc','portal_url','plan','grace_days','max_staff','max_field','max_schools','max_assets','project_url','publishable_key'])payload[k]=field(k).value.trim();
  payload.starts_at=field('starts_at').value?new Date(field('starts_at').value+'T00:00:00+03:00').toISOString():null;
  payload.ends_at=field('ends_at').value?new Date(field('ends_at').value+'T23:59:59+03:00').toISOString():null;
  const id=field('id').value,service_key=field('service_key').value;setStatus('جارٍ تجهيز العميل وحفظ الاشتراك…');
  try{const result=await clientAction(id?'save':'create',{client:payload,service_key,client_id:id});field('service_key').value='';setAFlash(result.sent===false?'تم تجهيز الحساب، لكن البريد لم يكتمل: '+result.error:id?'تم تحديث الاشتراك وCC.':'تم تجهيز العميل وإرسال بيانات الدخول.',result.sent===false?'warning':'success');await vClients()}
  catch(error){field('service_key').value='';setAFlash('لم يكتمل الإجراء: '+error.message+' — راجع بطاقة العميل لاستئناف التجهيز.','danger');await vClients()}
 })};
 $$('[data-client-edit]').forEach(b=>b.onclick=()=>{const c=list.find(x=>x.id===b.dataset.clientEdit);for(const k of ['id','name','contact_name','email','portal_url','plan','grace_days','max_staff','max_field','max_schools','max_assets'])field(k).value=c[k]??'';field('cc').value=(c.cc||[]).join(', ');field('starts_at').value=c.starts_at?new Date(new Date(c.starts_at).getTime()+10800000).toISOString().slice(0,10):'';field('ends_at').value=c.ends_at?new Date(new Date(c.ends_at).getTime()+10800000).toISOString().slice(0,10):'';field('email').readOnly=true;$('#clientProject').hidden=false;field('project_url').value=c.project_url;field('project_url').readOnly=true;field('publishable_key').value=c.publishable_key;field('publishable_key').readOnly=true;field('service_key').placeholder='مفتاح سري جديد — اختياري عند التعديل';for(const k of ['service_key','project_url','publishable_key'])field(k).required=false;$('#clientSave').textContent='حفظ الاشتراك وCC';form.scrollIntoView({behavior:'smooth'})});
 const operation=(selector,key,action,question)=>$$(selector).forEach(b=>b.onclick=()=>busy(b,async()=>{if(question&&!confirm(question))return;const r=await clientAction(action,{client_id:b.dataset[key]});setAFlash(r.sent===false?'تمت العملية، لكن البريد لم يكتمل: '+r.error:'تمت العملية بنجاح.',r.sent===false?'warning':'success');await vClients()}));
 operation('[data-client-provision]','clientProvision','provision','تجهيز حساب مالك العميل أو استعادته وإرسال كلمة مرور جديدة؟');
 operation('[data-client-resend]','clientResend','resend','سيتم تغيير كلمة مرور العميل وإرسال كلمة جديدة إلى بريده. هل تريد المتابعة؟');
 $$('[data-client-users]').forEach(b=>b.onclick=()=>busy(b,async()=>{
  const id=b.dataset.clientUsers,r=await clientAction('users',{client_id:id}),box=$('#cu_'+id);if(!box)return;
  box.innerHTML=`<table class="table table-sm"><tbody>${r.users.map(u=>`<tr><td>${esc(u.name)}<div dir="ltr">${esc(u.email||u.id)}</div></td><td><button type="button" class="btn btn-sm btn-danger" data-remote-delete="${esc(u.id)}">حذف الحساب نهائياً</button></td></tr>`).join('')||'<tr><td>لا توجد حسابات.</td></tr>'}</tbody></table>`;
  $$('[data-remote-delete]',box).forEach(button=>button.onclick=()=>busy(button,async()=>{if(prompt('سيُحذف حساب الدخول مهما كان دوره، مع بقاء سجل الأصول. اكتب «حذف» للتأكيد:')!=='حذف')return;await clientAction('delete_user',{client_id:id,user_id:button.dataset.remoteDelete});await vClients()}));
 }));
 $('#clientReminders').onclick=e=>busy(e.target,async()=>{const r=await clientAction('reminders');const sent=r.results.filter(x=>x.sent).length,failed=r.results.filter(x=>x.error).length;setStatus(`فُحص ${r.checked} عميل؛ أُرسل ${sent} تذكير؛ أخطاء ${failed}.`)});
}
async function deleteLogin(userId=null,employeeId=null){
 if(!isSys())throw Error('حذف حسابات الدخول متاح لمدير النظام فقط.');
 if(prompt('سيُحذف حساب الدخول نهائياً مهما كان دوره، مع الحفاظ على تاريخ الأصول. إذا كان حسابك فستخرج من المنصة. اكتب «حذف» للتأكيد:')!=='حذف')return false;
 const c=await Cloud.sb();const result=Cloud.chk(await c.rpc('nv_delete_user',{p_user:userId,p_emp:employeeId}));
 if(result.self){await c.auth.signOut();await Cloud.wipeLocal();location.reload();return true}
 await Cloud.pull();empLoginMap=null;setAFlash('تم حذف حساب المستخدم وحفظ تاريخ أصوله.');return true;
}
async function loadAllLogins(){const box=$('#allLoginBox');if(!box||!isSys())return;
 try{const rows=Cloud.chk(await (await Cloud.sb()).rpc('nv_all_users'))||[];
  box.innerHTML=`<table class="table table-sm"><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th></th></tr></thead><tbody>${rows.map(u=>`<tr><td>${esc(u.name||'')}</td><td dir="ltr">${esc(u.email||u.id)}</td><td>${esc(ROLE_L[u.role]||'غير مرتبط')}</td><td><button type="button" class="btn btn-sm btn-outline-danger" data-any-delete="${esc(u.id)}">حذف الحساب</button></td></tr>`).join('')}</tbody></table>`;
  $$('[data-any-delete]',box).forEach(b=>b.onclick=async()=>{try{if(await deleteLogin(b.dataset.anyDelete))vEmployees()}catch(e){alert(e.message)}});
 }catch(e){box.textContent=e.message}
}
</script>
