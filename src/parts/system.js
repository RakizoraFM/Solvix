<script id="nv37-system">
const PLATFORM_GUIDE=__PLATFORM_GUIDE__;
const PLATFORM_RELEASES=__PLATFORM_RELEASES__;

// NV45: explicit grants, server recheck before rendering protected routes.
function docAllowed45(key){return !!(Cloud.on&&Cloud.role&&Cloud.docAccess&&Cloud.docAccess[key]===true)}
function documentChoices45(prefix){return isSys()?`<fieldset class="col-12"><legend class="fs-6">إظهار صفحات النظام لهذا المستخدم</legend>${[['guide','دليل المنصة'],['releases','الإصدارات والفحص']].map(([k,l])=>`<label class="me-4"><input type="checkbox" id="${prefix}_doc_${k}"> ${l}</label>`).join('')}<small class="d-block text-muted">اختياران مستقلان؛ يمكن تغييرهما من الإعدادات ← إدارة النظام.</small></fieldset>`:''}
function documentSelection45(prefix){return {p_guide:!!$('#'+prefix+'_doc_guide')?.checked,p_releases:!!$('#'+prefix+'_doc_releases')?.checked}}
async function refreshDocumentAccess45(){
 Cloud.docAccess={};if(!Cloud.on||!Cloud.role||navigator.onLine===false)return;
 const uid=Cloud.user?.id,scope=Cloud.scope(),c=await Cloud.sb(),access=Cloud.chk(await c.rpc('nv_document_access45'))||{};if(Cloud.user?.id===uid&&Cloud.scope()===scope&&Cloud.role)Cloud.docAccess=access;
}
async function documentGuard45(key){const hash=location.hash;
 // Clear any previously rendered document while verifying; fail closed offline or on old databases.
 const box=document.getElementById('app');if(box)box.innerHTML='';
 try{await refreshDocumentAccess45()}catch(e){Cloud.docAccess={}}
 if(location.hash!==hash)return false;
 if(docAllowed45(key))return true;
 const html='<p class="alert alert-warning">هذه الصفحة غير متاحة لحسابك. يلزم اختيار صلاحيتها من مدير النظام واتصال للتحقق منها.</p>';
 if(hash.startsWith('#admin/'))opsShell(key,'صلاحية الصفحة',html);else{setMode('field');fieldLayout(html)}return false;
}
function releaseShell45(html){if(location.hash.startsWith('#releases')){setMode('field');fieldLayout(`<section class="sx36-page">${html}</section>`)}else opsShell('releases','سجل الإصدارات والفحص',html)}
async function renderDocumentSettings45(){
 const box=$('#documentSettings45');if(!box||!isSys())return;box.innerHTML='<p>جارٍ تحميل صلاحيات الدليل والإصدارات…</p>';
 try{const c=await Cloud.sb(),users=Cloud.chk(await c.rpc('nv_document_users45'))||[];if(!document.body.contains(box))return;
 box.innerHTML=`<section class="card mb-3"><div class="card-body"><h3>ظهور دليل المنصة والإصدارات</h3><p>لكل حساب اختياران مستقلان، بما يشمل Admin. الافتراضي مغلق. احفظ كل صف بعد التعديل.</p><div class="table-responsive"><table class="table"><thead><tr><th>المستخدم</th><th>دليل المنصة</th><th>الإصدارات والفحص</th><th>الحفظ</th></tr></thead><tbody>${users.map((u,i)=>`<tr data-doc-row="${i}"><td>${esc(u.name||u.email)}<br><small>${esc(u.email)} — ${esc(ROLE_L[u.role]||u.role)}</small></td><td><input aria-label="دليل المنصة: ${esc(u.name||u.email)}" type="checkbox" data-doc="guide" ${u.guide?'checked':''}></td><td><input aria-label="الإصدارات: ${esc(u.name||u.email)}" type="checkbox" data-doc="releases" ${u.releases?'checked':''}></td><td><button type="button" class="btn btn-sm btn-primary" data-doc-save="${i}">حفظ</button><span role="status"></span></td></tr>`).join('')}</tbody></table></div></div></section>`;
 box.querySelectorAll('[data-doc-save]').forEach(b=>b.onclick=async()=>{const row=b.closest('tr'),u=users[+b.dataset.docSave],status=row.querySelector('[role=status]');b.disabled=true;status.textContent='جارٍ الحفظ…';try{Cloud.chk(await c.rpc('nv_document_set45',{p_user:u.id,p_guide:row.querySelector('[data-doc=guide]').checked,p_releases:row.querySelector('[data-doc=releases]').checked}));await refreshDocumentAccess45();status.textContent='تم الحفظ';if(u.id===Cloud.user?.id)vSystem()}catch(e){status.textContent='لم يُحفظ: '+e.message}finally{b.disabled=false}});
 }catch(e){box.innerHTML=`<p class="alert alert-warning">تعذر تحميل صلاحيات الصفحات: ${esc(e.message)}. طبّق ترقية NV45.</p>`}
}
// Refresh visible links and revoke an open page within 30 seconds of a server-side change.
setInterval(async()=>{if(!Cloud.on||!Cloud.role||document.hidden)return;const before=JSON.stringify(Cloud.docAccess||{}),hash=location.hash;try{await refreshDocumentAccess45()}catch(e){Cloud.docAccess={}}if(location.hash===hash&&before!==JSON.stringify(Cloud.docAccess||{}))route()},30000);

const NV37={
 guideSearch(query){const q=String(query||'').trim().toLocaleLowerCase('ar');return PLATFORM_GUIDE.features.filter(f=>[f.name,f.what,f.where,f.who,...f.steps].join(' ').toLocaleLowerCase('ar').includes(q))},
 dateBound(value,end=false){if(!value)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('تاريخ غير صالح');const d=new Date(value+'T00:00:00');if(isNaN(d)||ymd(d)!==value)throw Error('تاريخ غير صالح');if(end)d.setDate(d.getDate()+1);return d.toISOString()},
 usageArgs(q){const offset=Number(q.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)throw Error('رقم الصفحة غير صالح');const actor=q.get('user')||null,kind=q.get('kind')||'all';if(actor&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor))throw Error('معرّف المستخدم غير صالح');if(!['all','login','change','approval'].includes(kind))throw Error('نوع الحدث غير صالح');const from=this.dateBound(q.get('from')),to=this.dateBound(q.get('to'),true);if(from&&to&&from>=to)throw Error('نهاية الفترة قبل بدايتها');return {p_actor:actor,p_kind:kind,p_from:from,p_to:to,p_offset:offset,p_limit:50}},
 eventName(kind,action){if(kind==='login')return 'تسجيل دخول ناجح';const names={INSERT:'إضافة',UPDATE:'تعديل',DELETE:'حذف',RESTORE:'استعادة أصل',approve:'اعتماد مرحلة',return:'إرجاع للتصحيح',reroute:'تغيير مسار الاعتماد',submit:'إرسال للاعتماد',migration:'تهيئة الاعتماد',reset:'إعادة بدء الاعتماد',PROVISIONED:'إنشاء حساب عميل',WELCOME_SENT:'إرسال رسالة الترحيب',SUBSCRIPTION_UPDATED:'تعديل الاشتراك',REMOTE_USER_DELETED:'حذف حساب عميل'};return names[action]||action||'حدث'},
 entityName(t){return {nv_collections:'الأصول',nv_schools:'المباني',nv_employees:'مشرفو الميدان',nv_staff:'حسابات الإدارة',nv_settings:'الإعدادات',nv_clients:'العملاء',nv_approval_paths:'مسارات الاعتماد',asset:'أصل',account:'الحساب'}[t]||t||'—'}
};
window.NV37=NV37;
PAGE_META.guide=['bi-book','ما هي كل خاصية، وأين تجدها، وكيف تستخدمها، ومن يستخدمها'];
PAGE_META.releases=['bi-clock-history','الإصدارات والتغييرات ونتائج الاختبار وحدود التحقق'];
PAGE_META.usage=['bi-person-lines-fill','نشاط المستخدمين وتسجيل الدخول في المشروع الحالي'];
function guideShell(html){if(location.hash.startsWith('#guide')){setMode('field');fieldLayout(`<section class="sx36-page">${html}</section>`);}else opsShell('guide','دليل المنصة',html)}
async function vPlatformGuide(){
 if(!await documentGuard45('guide'))return;
 const query=qp().get('q')||'',list=NV37.guideSearch(query),field=location.hash.startsWith('#guide'),base=field?'#guide':'#admin/guide';
 guideShell(`<div class="sx36-row"><h3>دليل المنصة</h3><span class="sx36-badge">${esc(PLATFORM_GUIDE.version)}</span></div><p>لكل خاصية: التعريف والمكان والخطوات والمستخدمون. آخر مراجعة: ${esc(PLATFORM_GUIDE.updated_at)}. ظهور الخاصية وإمكانية استخدامها يعتمدان على صلاحيات حسابك وإعداد المشروع.</p>
 <form id="guideSearch" class="sx36-actions"><input class="sx36-input" name="q" value="${esc(query)}" placeholder="ابحث عن خاصية أو طريقة استخدام" aria-label="البحث في دليل المنصة"><button>بحث</button><a href="${base}">عرض الكل</a></form><p>${nf(list.length)} خاصية</p>
 ${list.map(f=>`<details class="sx36-card" id="guide-${esc(f.id)}"><summary><b>${esc(f.name)}</b></summary><p><b>ما هي؟</b> ${esc(f.what)}</p><p><b>أين تجدها؟</b> ${esc(f.where)}</p><p><b>كيف تستخدمها؟</b></p><ol>${f.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p><b>من يستخدمها؟</b> ${esc(f.who)}</p><small>تمت المراجعة في ${esc(f.reviewed_in)}</small></details>`).join('')||'<p class="sx36-card">لا توجد نتائج. جرّب كلمة أخرى.</p>'}`);
 $('#guideSearch').onsubmit=e=>{e.preventDefault();go(base+'?q='+encodeURIComponent(new FormData(e.target).get('q')||''))};
}
function systemHistoryLinks(active){return `<nav class="sx36-actions" aria-label="سجلات النظام">${[['system','إدارة النظام'],['clients','العملاء والاشتراكات'],['releases','سجل الإصدارات والفحص'],['usage','نشاط المستخدمين'],['guide','دليل المنصة']].filter(([k])=>k==='guide'||k==='releases'?docAllowed45(k):isSys()).map(([k,l])=>`<a href="#admin/${k}" ${active===k?'aria-current="page"':''}>${l}</a>`).join('')}</nav>`}
async function vReleases(){if(!await documentGuard45('releases'))return;
 const status={passed:'نجح',pending:'قيد التحقق',not_run:'لم يُنفذ'};
 releaseShell45(`${systemHistoryLinks('releases')}<h3>سجل الإصدارات والفحص</h3><p class="sx36-note">هذه نتائج اختبار الحزمة المسجلة عند إعداد الإصدار، وليست فحصاً مباشراً لقاعدة بياناتك أو إثباتاً لنجاح النشر. يشمل السجل الإصدارات التي تتوفر لها نتائج موثقة.</p>
 ${PLATFORM_RELEASES.releases.map(r=>`<article class="sx36-card"><div class="sx36-row"><h4>${esc(r.version)}</h4><span>${esc(r.date)}</span>${r.version===NV.version?'<span class="sx36-badge">الإصدار الحالي</span>':''}</div><ul>${r.changes.map(c=>`<li>${esc(c)}</li>`).join('')}</ul><h5>الفحص</h5>${r.checks.map(c=>`<p><b>${esc(c.name)} — ${esc(status[c.status]||c.status)}</b><br>${esc(c.detail)}</p>`).join('')}<h5>حدود التحقق</h5><ul>${r.limitations.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></article>`).join('')}`);
}
async function vPlatformUsage(){if(!isSys())return go('#admin/guide');
 const q=qp(),hash=location.hash;let args;try{args=NV37.usageArgs(q)}catch(e){opsShell('usage','نشاط المستخدمين',`${systemHistoryLinks('usage')}<p class="sx36-note">${esc(e.message)}</p><a href="#admin/usage">إعادة ضبط المرشحات</a>`);return}
 opsShell('usage','نشاط المستخدمين',`${systemHistoryLinks('usage')}<h3>نشاط المستخدمين وتسجيل الدخول</h3><div id="usageBox" aria-live="polite">جارٍ تحميل السجل…</div>`);
 try{
  if(!Cloud.on||navigator.onLine===false)throw Error('سجل الاستخدام يحتاج اتصالاً بالخادم. لا تعرض بيانات حسابات مخبأة على هذا الجهاز.');
  const c=await Cloud.sb();const [users,page]=await Promise.all([c.rpc('nv_usage_users').then(x=>Cloud.chk(x)),c.rpc('nv_usage_page',args).then(x=>Cloud.chk(x))]);
  if(location.hash!==hash||!$('#usageBox'))return;
  const selected=args.p_actor,rows=users||[],events=page?.items||[],total=Number(page?.total)||0,offset=args.p_offset;
  const userRows=rows.filter(u=>!selected||u.id===selected);const date=v=>v?esc(ymdhms(v)):'—';
  $('#usageBox').innerHTML=`<p class="sx36-note">المشروع الحالي فقط. يسجل الدخول عند تحديث وقت الدخول في خدمة الحسابات؛ يبدأ التاريخ التفصيلي بعد الترقية (${date(page.login_history_since)}). آخر دخول قد يسبق الترقية. لا يشمل السجل محاولات الدخول الفاشلة أو كل نقرة وتصفح، ولا يثبت أن المستخدم متصل الآن.</p>
  <form id="usageFilter" class="sx36-actions"><label>المستخدم <select class="sx36-input" name="user"><option value="">كل المستخدمين والأحداث المؤرشفة</option>${rows.map(u=>`<option value="${esc(u.id)}" ${u.id===selected?'selected':''}>${esc(u.name||u.email||u.id)}</option>`).join('')}${selected&&!rows.some(u=>u.id===selected)?`<option value="${esc(selected)}" selected>حساب محذوف — ${esc(selected)}</option>`:''}</select></label><label>نوع الحدث <select class="sx36-input" name="kind">${[['all','الكل'],['login','تسجيل الدخول'],['change','تغيير البيانات'],['approval','الاعتماد']].map(([k,l])=>`<option value="${k}" ${args.p_kind===k?'selected':''}>${l}</option>`).join('')}</select></label><label>من <input class="sx36-input" type="date" name="from" value="${esc(q.get('from')||'')}"></label><label>إلى <input class="sx36-input" type="date" name="to" value="${esc(q.get('to')||'')}"></label><button>تصفية</button><a href="#admin/usage">مسح المرشحات</a></form>
  <details class="sx36-card" open><summary>بيانات المستخدمين وآخر دخول (${nf(userRows.length)})</summary><p class="sx36-muted">بيانات الحسابات الحالية. عدد مرات الدخول هو الأحداث المسجلة منذ الترقية، ولا يتغير بمرشحات فترة الأحداث أدناه. نشاط التغيير لا يشمل التصفح.</p><div class="sx36-scroll"><table class="sx36-table"><thead><tr><th>المستخدم والبريد</th><th>الدور والحالة</th><th>إنشاء الحساب</th><th>آخر دخول</th><th>مرات الدخول المسجلة</th><th>آخر تغيير بيانات</th></tr></thead><tbody>${userRows.map(u=>`<tr><td>${esc(u.name||'—')}<br><span dir="ltr">${esc(u.email||'—')}</span></td><td>${esc(ROLE_L[u.role]||({field:'مشرف ميدان',unassigned:'غير مسند'})[u.role]||u.role)}<br>${u.active?'نشط':'موقوف / غير مسند'}</td><td>${date(u.created_at)}</td><td>${date(u.last_sign_in_at)}</td><td>${nf(u.recorded_logins||0)}</td><td>${date(u.last_change_at)}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد حسابات مطابقة.</td></tr>'}</tbody></table></div></details>
  <h4>الأحداث (${nf(total)})</h4><div class="sx36-scroll"><table class="sx36-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>البيانات</th></tr></thead><tbody>${events.map(e=>`<tr><td>${date(e.at)}</td><td>${esc(e.name||e.email||(e.actor?'حساب محذوف / غير متاح':'خدمة النظام'))}${e.actor?`<br><a href="#admin/usage?user=${encodeURIComponent(e.actor)}">سجل الحساب</a>`:''}<br><small dir="ltr">${esc(e.email||e.actor||'')}</small></td><td>${esc(NV37.eventName(e.kind,e.action))}</td><td>${esc(NV37.entityName(e.entity))}<br><small>${esc(e.row_id||'')}</small></td></tr>`).join('')||'<tr><td colspan="4">لا توجد أحداث ضمن المرشحات.</td></tr>'}</tbody></table></div><div class="sx36-actions">${offset>0?'<button id="usagePrev">السابق</button>':''}<span>${total?nf(offset+1):0}–${nf(Math.min(total,offset+50))} من ${nf(total)}</span>${offset+50<total?'<button id="usageNext">التالي</button>':''}</div>`;
  const navigate=n=>{const next=new URLSearchParams(q);next.set('offset',String(n));go('#admin/usage?'+next)};
  $('#usageFilter').onsubmit=e=>{e.preventDefault();go('#admin/usage?'+new URLSearchParams(new FormData(e.target)))};
  if($('#usagePrev'))$('#usagePrev').onclick=()=>navigate(Math.max(0,offset-50));if($('#usageNext'))$('#usageNext').onclick=()=>navigate(offset+50);
 }catch(e){if(location.hash===hash&&$('#usageBox'))$('#usageBox').innerHTML=`<p class="sx36-note">تعذر تحميل السجل: ${esc(e.message)}. تأكد من تطبيق ترقية NV37 وصلاحية مدير النظام.</p>`}
}
</script>
