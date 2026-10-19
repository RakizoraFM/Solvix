<script id="nv36-operations">
/* Pure comparison/diagnostic helpers are also exercised without a browser. */
const NV36={
 stable(v){if(Array.isArray(v))return v.map(x=>this.stable(x));if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,this.stable(v[k])]));return v===undefined?null:v},
 equal(a,b){return JSON.stringify(this.stable(a))===JSON.stringify(this.stable(b))},
 diff(base,local,remote){return [...new Set([...Object.keys(base||{}),...Object.keys(local||{}),...Object.keys(remote||{})])].filter(k=>k!=='id').map(k=>{
  const b=base?.[k],l=local?.[k],r=remote?.[k],lc=!this.equal(l,b),rc=!this.equal(r,b),conflict=lc&&rc&&!this.equal(l,r);
  return {key:k,base:b,local:l,remote:r,localChanged:lc,remoteChanged:rc,conflict,choice:conflict?'':lc?'local':'remote'};
 }).filter(x=>x.localChanged||x.remoteChanged)},
 merge(base,local,remote,choices){const out={...remote};for(const f of this.diff(base,local,remote)){const choice=choices[f.key]||f.choice;if(!['local','remote'].includes(choice))throw Error('اختر قيمة لكل حقل متعارض.');out[f.key]=choice==='local'?f.local:f.remote}return out},
 serialMissing(value){return ['', 'n/a','na','none','unknown','غير متوفر','لا يوجد','بدون'].includes(String(value??'').trim().toLowerCase())},
 qualityLocal(rows){const items=rows.filter(c=>c.type_id&&c.submitted_at).map(c=>({...c,missing_photo:!c.asset_image,missing_nameplate:!c.asset_image2,missing_serial:this.serialMissing(c.serial),missing_review:c.review_status!=='ok'}));
  const bad=x=>x.missing_photo||x.missing_serial||x.missing_review;/* NV48b: the nameplate photo is optional */
  return {source:'local',checked_at:new Date().toISOString(),scope_total:items.length,with_issues:items.filter(bad).length,photos:items.filter(x=>x.missing_photo).length,serial:items.filter(x=>x.missing_serial).length,review:items.filter(x=>x.missing_review).length,items};
 },
 stageAllowed(stage,role,uid,review,sys=false){return !!review&&(sys||(stage?.roles||[]).includes(role)||(stage?.users||[]).includes(uid))},
 fieldLabels:{notes:'الملاحظات',quantity:'الكمية',price:'السعر',serial:'الرقم التسلسلي',manufacturer:'المصنع',brand:'الماركة',model:'الموديل',capacity:'السعة',
  category_id:'الفئة',type_id:'نوع الأصل',condition_id:'الحالة الفنية',school_id:'المبنى',employee_id:'مشرف الميدان',school_image:'صورة المبنى',asset_image:'صورة الأصل',asset_image2:'صورة لوحة البيانات',extra_images:'الصور الإضافية',
  floor:'الدور',room_number:'رقم الغرفة',room_name_id:'اسم الغرفة',review_status:'مراجعة الصور',review_note:'ملاحظة المراجع',reviewed_by:'المراجع',reviewed_at:'وقت المراجعة',
  name:'الاسم',number:'الرقم الوظيفي',email:'البريد',ar:'الاسم بالعربية',en:'الاسم بالإنجليزية',moe:'رقم المبنى',ident:'معرّف المبنى',lat:'خط العرض',lng:'خط الطول',
  status:'الحالة',app_name:'اسم المنصة',admin_email:'مستلمو البريد',logo:'الشعار',label:'إعدادات الملصق',geo:'ضوابط الموقع',room_tpl:'قوالب الغرف',site:'نموذج بيانات المباني',extra:'حقول المبنى الإضافية',submitted_at:'وقت الإرسال',created_at:'وقت الإنشاء',
  install_date:'تاريخ التركيب',agency:'الوكيل',warranty:'الضمان',tag:'الرقم الخارجي',parent_child:'رئيسي / فرعي'}
};
window.NV36=NV36;
const opsMessage=e=>{
 const m=String(e?.message||e);return /APPROVAL_CONFLICT/.test(m)?'تغيرت حالة الاعتماد أو بيانات الأصل. حدّث الصفحة وراجع الحالة الجديدة قبل القرار.':
 /stage has no active reviewer/.test(m)?'اختر حساباً نشطاً لديه صلاحية المراجعة، أو أنشئ معتمداً لهذا الدور أولاً.':/assigned to another/.test(m)?'هذه المرحلة مسندة إلى معتمد آخر.':/photos are missing/.test(m)?'لا يمكن الاعتماد النهائي: صور الأصل أو لوحة البيانات غير مرفوعة.':
 /serial number required/.test(m)?'لا يمكن الاعتماد النهائي: الرقم التسلسلي ناقص.':/photo review must/.test(m)?'أكمل مراجعة الصور قبل الاعتماد النهائي.':m;
};
function opsShell(key,title,html){if(Cloud.role==='tech')fieldLayout(`<section class="sx36-page">${html}</section>`);else adminShell(key,title,`<section class="sx36-page">${html}</section>`)}
const opsOffline=()=>!Cloud.on||navigator.onLine===false;
const opsStatus=s=>({pending:'بانتظار الاعتماد',returned:'مُرجع للتصحيح',approved:'معتمد نهائياً'})[s]||'لم يُرسل';
const opsSettings=()=>Cloud.settingsRow();
async function loadApprovals(){if(!Cloud.on)throw Error('إدارة مسارات الاعتماد تتطلب الاتصال بقاعدة البيانات.');
 S.approval_paths=await Cloud.fetchAll('nv_approval_paths');S.approvals=await Cloud.fetchAll('nv_approval_runs',q=>q.order('asset_id'));
 await saveNow('approval_paths');await saveNow('approvals');
}
PAGE_META.approvals=['bi-diagram-3','مسار الاعتماد ومراحله وسجل القرارات'];
PAGE_META['approval-path']=['bi-signpost-split','ضبط مراحل اعتماد الجرد والمعتمد المسؤول'];
PAGE_META.conflicts=['bi-intersect','مقارنة التعديلات المحلية بنسخة الخادم'];
PAGE_META.quality=['bi-clipboard-check','نواقص الصور والأرقام التسلسلية والمراجعة'];

async function vApprovals(){
 let warning='';try{await loadApprovals()}catch(e){warning=opsMessage(e)}
 const paths=new Map((S.approval_paths||[]).map(p=>[p.id,p])),runs=new Map((S.approvals||[]).map(r=>[r.asset_id,r])),q=qp(),sid=q.get('building')||'',status=q.get('state')||'pending',asset=q.get('asset');
 const stageOf=r=>paths.get(r?.path_id)?.stages?.[r?.stage_index];const allowed=r=>NV36.stageAllowed(stageOf(r),staffRole(),Cloud.user?.id,can('review'),isSys());
 const records=S.collections.filter(c=>c.type_id&&c.submitted_at&&(!sid||c.school_id===sid));
 let list=records.filter(c=>{const r=runs.get(c.id);return (asset?c.id===asset:true)&&(asset||status==='all'||(status==='mine'?r?.status==='pending'&&allowed(r):r?.status===status))});
 list.sort((a,b)=>String(runs.get(b.id)?.updated_at||'').localeCompare(String(runs.get(a.id)?.updated_at||''))||num(a.no)-num(b.no));const pg=paginate(list,25);
 const options=S.schools.map(s=>`<option value="${esc(s.id)}" ${sid===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
 const active=(S.approval_paths||[]).find(p=>p.active);
 const card=c=>{const r=runs.get(c.id),p=paths.get(r?.path_id),st=stageOf(r);return `<article class="sx36-card"><div class="sx36-row"><b>${esc(assetLabel(c)||c.id)} — ${esc((get('types',c.type_id)||{}).ar||'')}</b><span class="sx36-badge">${opsStatus(r?.status)}</span></div>
 <p>${esc((get('schools',c.school_id)||{}).name||'')} · ${esc(empName(c.employee_id))}</p><p class="sx36-muted">${esc(p?.name||'لا توجد حالة اعتماد بعد')} ${p?'— إصدار '+p.version:''} ${st?' · المرحلة '+(r.stage_index+1)+': '+esc(st.name):''}</p>
 ${r?.last_note?`<p class="sx36-note">${esc(r.last_note)}</p>`:''}<div class="sx36-row"><a href="#admin/collections/${encodeURIComponent(c.id)}">بيانات الأصل والصور</a><a href="#admin/approvals?asset=${encodeURIComponent(c.id)}">مسار هذا الأصل وسجل القرارات</a></div>
 ${r?.status==='pending'&&allowed(r)?`<div class="sx36-actions"><input class="sx36-input" data-approval-note="${esc(c.id)}" maxlength="2000" placeholder="ملاحظة القرار — إلزامية عند الإرجاع"><button data-approve="${esc(c.id)}" ${opsOffline()?'disabled':''}>اعتماد هذه المرحلة</button><button class="danger" data-return="${esc(c.id)}" ${opsOffline()?'disabled':''}>إرجاع للتصحيح</button></div>`:''}
 ${r&&can('settings')?`<div class="sx36-actions"><select class="sx36-input" data-route="${esc(c.id)}">${(S.approval_paths||[]).slice().sort((a,b)=>b.version-a.version).map(x=>`<option value="${x.id}" ${x.id===(active?.id||r.path_id)?'selected':''}>${esc(x.name)} — إصدار ${x.version}</option>`).join('')}</select><button class="secondary" data-reroute="${esc(c.id)}" ${opsOffline()?'disabled':''}>تغيير المسار / إعادة فتح الاعتماد</button></div>`:''}
 ${asset?'<div id="approvalHistory"></div>':''}</article>`};
 opsShell('approvals','اعتماد الجرد',`<div class="sx36-row"><h3>اعتماد الجرد</h3>${can('settings')?'<a href="#admin/approval-path">إعداد مسار الاعتماد</a>':''}<button class="secondary" id="approvalRefresh">تحديث الحالة</button></div>
 ${warning?`<p class="sx36-note">${esc(warning)} — المعروض آخر نسخة محلية، والقرارات تحتاج اتصالاً.</p>`:''}<p class="sx36-muted">مراجعة الصور مستقلة عن الاعتماد النهائي. تعديل بيانات الأصل يعيد اعتماده من المرحلة الأولى، وتبقى القرارات السابقة في السجل.</p>
 <form id="approvalFilter" class="sx36-actions"><select name="building" class="sx36-input"><option value="">كل المباني</option>${options}</select><select name="state" class="sx36-input">${[['pending','بانتظار'],['mine','المسند إليّ'],['returned','مُرجع'],['approved','معتمد نهائياً'],['all','الكل']].map(([v,l])=>`<option value="${v}" ${status===v?'selected':''}>${l}</option>`).join('')}</select><button>تصفية</button>${asset?'<a href="#admin/approvals?state=all">كل الجرد</a>':''}</form>
 <p>${nf(list.length)} أصل في هذا العرض.</p>${pg.items.map(card).join('')||'<p class="sx36-card">لا توجد أصول في هذا التصنيف.</p>'}${pg.footer}`);
 $('#approvalRefresh').onclick=()=>vApprovals();$('#approvalFilter').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);go('#admin/approvals?'+new URLSearchParams({building:f.get('building'),state:f.get('state')}))};
 const busy=async(b,fn)=>{b.disabled=true;try{await fn();await vApprovals()}catch(e){toast(opsMessage(e),8000)}finally{if(b.isConnected)b.disabled=false}};
 const act=(id,action,b)=>busy(b,async()=>{if(opsOffline())throw Error('الاعتماد يحتاج اتصالاً.');const note=$(`[data-approval-note="${CSS.escape(id)}"]`).value.trim();if(action==='return'&&!note)throw Error('اكتب سبب الإرجاع.');
  await Cloud.sync();if(Cloud.err)throw Error('عالج مشكلة المزامنة قبل قرار الاعتماد: '+Cloud.err.message);
  const r=runs.get(id);Cloud.chk(await (await Cloud.sb()).rpc('nv_approval_act',{p_asset:id,p_revision:r.revision,p_action:action,p_note:note,p_request:crypto.randomUUID()}));
 });
 $$('[data-approve]').forEach(b=>b.onclick=()=>act(b.dataset.approve,'approve',b));$$('[data-return]').forEach(b=>b.onclick=()=>act(b.dataset.return,'return',b));
 $$('[data-reroute]').forEach(b=>b.onclick=()=>busy(b,async()=>{const id=b.dataset.reroute,r=runs.get(id),reason=prompt('سيبدأ اعتماد هذا الأصل من المرحلة الأولى، حتى إن كان معتمداً. اكتب سبب تغيير المسار:','');if(reason===null)return;if(!reason.trim())throw Error('سبب تغيير المسار مطلوب.');
  await Cloud.sync();if(Cloud.err)throw Error('عالج تعارضات المزامنة أولاً.');Cloud.chk(await (await Cloud.sb()).rpc('nv_approval_reroute',{p_asset:id,p_path:$(`[data-route="${CSS.escape(id)}"]`).value,p_revision:r.revision,p_reason:reason}));
 }));
 if(asset&&$('#approvalHistory'))try{const rows=Cloud.chk(await (await Cloud.sb()).from('nv_approval_events').select('*').eq('asset_id',asset).order('id',{ascending:false}).limit(80))||[];
  if($('#approvalHistory'))$('#approvalHistory').innerHTML=`<h4>سجل القرارات والتغييرات</h4><ul>${rows.map(e=>`<li>${esc(fmtDT(e.at))} — ${esc(({submitted:'إرسال للجرد',migration:'إدراج الجرد السابق',approve:'اعتماد مرحلة',return:'إرجاع للتصحيح',data_changed:'تعديل البيانات وإعادة الاعتماد',rerouted:'تغيير المسار'})[e.action]||e.action)} — ${esc(e.actor_label||'النظام')} — ${esc(e.note||'')}</li>`).join('')||'<li>لا توجد أحداث سابقة.</li>'}</ul>`;
 }catch(e){if($('#approvalHistory'))$('#approvalHistory').textContent=opsMessage(e)}
}

async function vApprovalPath(){
 if(!can('settings'))return go('#admin/approvals');let staff=[],problem='';try{await loadApprovals();if(canUsers())staff=Cloud.chk(await (await Cloud.sb()).from('nv_staff').select('user_id,name,email,role,active'))||[]}catch(e){problem=opsMessage(e)}
 const current=(S.approval_paths||[]).find(p=>p.active),initial=current?.stages||[{id:'review',name:'اعتماد الجرد',roles:['manager'],users:[]}];let stages=JSON.parse(JSON.stringify(initial));
 opsShell('approval-path','مسار اعتماد الجرد',`<div class="sx36-row"><h3>مسار اعتماد الجرد</h3><a href="#admin/approvals">قائمة الاعتماد</a></div>${problem?`<p class="sx36-note">${esc(problem)}</p>`:''}
 <p>كل حفظ ينشئ إصداراً جديداً. يبقى الجرد السابق على إصداره حتى تختار نقله. لا يغيّر النقل الجماعي الجرد المعتمد نهائياً.</p>
 <form id="pathForm" class="sx36-card"><label>اسم المسار<input id="pathName" class="sx36-input" required maxlength="120" value="${esc(current?.name||'مسار اعتماد الجرد')}"></label><div id="pathStages"></div><button type="button" class="secondary" id="stageAdd">إضافة مرحلة</button>
 <fieldset><legend>شروط الاعتماد النهائي — اختيارية</legend>${[['photos','وجود صورة الأصل كاملاً في التخزين (صورة لوحة البيانات اختيارية)'],['serial','وجود الرقم التسلسلي'],['review','اكتمال مراجعة الصور']].map(([k,l])=>`<label><input type="checkbox" id="gate_${k}" ${current?.requirements?.[k]?'checked':''}> ${l}</label>`).join('')}</fieldset>
 <label><input type="checkbox" id="pathMigrate"> نقل الجرد غير المعتمد إلى هذا المسار وإعادة مراحله من البداية</label><label>سبب النقل<input class="sx36-input" id="pathReason" maxlength="2000" placeholder="مطلوب فقط عند نقل الجرد السابق"></label><button type="submit" ${opsOffline()?'disabled':''}>حفظ إصدار جديد</button><p id="pathResult" role="status"></p></form>`);
 const collect=()=>stages=stages.map((s,i)=>{const assignee=$(`[data-stage-person="${i}"]`).value;return {...s,name:$(`[data-stage-name="${i}"]`).value.trim(),roles:assignee==='customRoles'?s.roles:assignee==='any'?['owner','manager','coordinator','sysadmin']:assignee.startsWith('role:')?[assignee.slice(5)]:[],users:assignee.startsWith('user:')?[assignee.slice(5)]:[]}});
 const draw=()=>{$('#pathStages').innerHTML=stages.map((s,i)=>{const selected=s.users?.[0]?'user:'+s.users[0]:(s.roles?.length===1?'role:'+s.roles[0]:(NV36.equal([...(s.roles||[])].sort(),['owner','manager','coordinator','sysadmin'].sort())?'any':'customRoles'));const users=staff.filter(u=>u.active);if(s.users?.[0]&&!users.some(u=>u.user_id===s.users[0]))users.push({user_id:s.users[0],name:'مستخدم محدد',email:s.users[0]});return `<div class="sx36-card sx36-stage"><b>المرحلة ${i+1}</b><input class="sx36-input" data-stage-name="${i}" required maxlength="120" value="${esc(s.name)}"><select class="sx36-input" data-stage-person="${i}">${[['any','أي صاحب صلاحية مراجعة'],...(selected==='customRoles'?[['customRoles','الأدوار المحددة: '+s.roles.join('، ')]]:[]),...['coordinator','manager','owner','sysadmin','reader'].map(r=>['role:'+r,ROLE_L[r]]),...users.map(u=>['user:'+u.user_id,u.name+' — '+u.email])].map(([v,l])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('')}</select><div class="sx36-actions"><button type="button" class="secondary" data-stage-up="${i}" ${i===0?'disabled':''}>أعلى</button><button type="button" class="secondary" data-stage-down="${i}" ${i===stages.length-1?'disabled':''}>أسفل</button><button type="button" class="danger" data-stage-remove="${i}" ${stages.length===1?'disabled':''}>حذف المرحلة</button></div></div>`}).join('');
  for(const [selector,delta]of [['data-stage-up',-1],['data-stage-down',1]])$$('['+selector+']').forEach(b=>b.onclick=()=>{collect();const i=+b.getAttribute(selector),j=i+delta;[stages[i],stages[j]]=[stages[j],stages[i]];draw()});
  $$('[data-stage-remove]').forEach(b=>b.onclick=()=>{collect();stages.splice(+b.dataset.stageRemove,1);draw()});$('#stageAdd').disabled=stages.length>=8;
 };draw();$('#stageAdd').onclick=()=>{collect();if(stages.length>=8)return;stages.push({id:crypto.randomUUID(),name:'مرحلة اعتماد جديدة',roles:['manager'],users:[]});draw()};
 $('#pathForm').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{collect();const migrate=$('#pathMigrate').checked,reason=$('#pathReason').value.trim();if(migrate&&!reason)throw Error('اكتب سبب نقل الجرد السابق.');const requirements={};for(const k of ['photos','serial','review'])requirements[k]=$('#gate_'+k).checked;
  const data=Cloud.chk(await (await Cloud.sb()).rpc('nv_approval_path_save',{p_name:$('#pathName').value.trim(),p_stages:stages,p_requirements:requirements,p_migrate:migrate,p_reason:reason}));$('#pathResult').textContent=`حُفظ الإصدار ${data.version}. نُقل ${data.migrated} أصل. صلاحية المراجعة مطلوبة للمعتمد إضافةً إلى إسناد المرحلة إليه.`;
 }catch(e){$('#pathResult').textContent=opsMessage(e)}finally{b.disabled=false}};
}

async function vQuality(){
 const q=qp(),building=q.get('building')||'',employee=q.get('employee')||'',issue=q.get('issue')||'all',query=q.get('q')||'',offset=Math.max(0,num(q.get('offset'))),limit=50;
 let data,problem='';try{if(opsOffline())throw Error('لا يوجد اتصال بالخادم.');data=Cloud.chk(await (await Cloud.sb()).rpc('nv_quality_page',{p_school:building||null,p_employee:employee||null,p_issue:issue,p_query:query.trim().slice(0,150),p_offset:offset,p_limit:limit}));}
 catch(e){problem=opsMessage(e);data=NV36.qualityLocal(S.collections.filter(c=>(!building||c.school_id===building)&&(!employee||c.employee_id===employee)&&(!query||JSON.stringify(c).toLowerCase().includes(query.toLowerCase()))));
  const all=data.items;data.items=all.filter(c=>issue==='all_assets'?true:issue==='photos'?c.missing_photo:issue==='serial'?c.missing_serial:issue==='review'?c.missing_review:issue==='complete'?!(c.missing_photo||c.missing_serial||c.missing_review):issue==='returned'?c.review_status==='returned':issue==='approval'?true:c.missing_photo||c.missing_serial||c.missing_review);data.filtered_total=data.items.length;data.items=data.items.slice(offset,offset+limit);
 }
 const summary=[['scope_total','الأصول ضمن النطاق','all_assets'],['with_issues','بها نواقص أساسية','all'],['photos','صور ناقصة','photos'],['serial','تسلسلي ناقص','serial'],['review','مراجعة غير مكتملة','review']];
 const url=changes=>'#admin/quality?'+new URLSearchParams({building,employee,issue,q:query,offset:String(offset),...changes});
 opsShell('quality','جودة بيانات الأصول',`<div class="sx36-row"><h3>جودة بيانات الأصول</h3><button class="secondary" id="qualityRefresh">تحديث الفحص</button><button class="secondary" id="qualityExport">تصدير الصفحة</button></div>
 ${data.source!=='server'?`<p class="sx36-note">${esc(problem)} هذه معاينة محلية؛ لا تتحقق من وجود الملفات في التخزين ولا من آخر قرارات الاعتماد.</p>`:`<p class="sx36-muted">فحص الخادم للجرد المرسل فقط: ${esc(fmtDT(data.checked_at))}. يجري التحقق من وجود ملفي الصور في التخزين. لا يقيس الفحص وضوح الصورة أو صحة الرقم التسلسلي.</p>`}
 <div class="sx36-grid">${summary.map(([k,l,filter])=>`<a class="sx36-card" href="${url({issue:filter,offset:'0'})}"><b>${nf(data[k])}</b><span>${l}</span></a>`).join('')}</div>
 <p class="sx36-muted">الأصل قد يظهر في أكثر من نقص. تشخيص التسلسلي لا يعني أن كل نوع أصل يجب أن يحمل رقماً؛ راجع طبيعة الأصل قبل استكماله. الاعتماد النهائي مستقل عن اكتمال هذه الحقول.</p>
 <form id="qualityFilter" class="sx36-actions"><select name="building" class="sx36-input"><option value="">كل المباني</option>${S.schools.map(s=>`<option value="${esc(s.id)}" ${building===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select><select name="employee" class="sx36-input"><option value="">كل مشرفي الميدان</option>${S.employees.filter(e=>!e.archived).map(e=>`<option value="${esc(e.id)}" ${employee===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select>
 <select class="sx36-input" name="issue">${[['all','كل النواقص'],['photos','الصور'],['serial','التسلسلي'],['review','المراجعة'],['approval','الاعتماد غير مكتمل'],['returned','مُرجع للتصحيح'],['complete','مكتمل الحقول الأساسية'],['all_assets','كل الأصول']].map(([v,l])=>`<option value="${v}" ${issue===v?'selected':''}>${l}</option>`).join('')}</select><input class="sx36-input" name="q" maxlength="150" value="${esc(query)}" placeholder="الرقم أو الأصل أو المبنى"><button>تصفية</button></form>
 <div class="sx36-scroll"><table class="sx36-table"><thead><tr><th>الأصل</th><th>المبنى / المشرف</th><th>الصورة</th><th>لوحة البيانات</th><th>التسلسلي</th><th>مراجعة الصور</th><th>الاعتماد</th><th>الإجراء</th></tr></thead><tbody>${data.items.map(c=>`<tr><td>${esc(assetLabel(c)||c.id)}<small>${esc(c.type_name||(get('types',c.type_id)||{}).ar||'')}</small></td><td>${esc(c.building_name||(get('schools',c.school_id)||{}).name||'')}<small>${esc(c.employee_name||empName(c.employee_id))}</small></td><td class="${c.missing_photo?'sx36-bad':''}">${c.missing_photo?'ناقصة':'موجودة'}</td><td>${c.missing_nameplate?'غير مرفقة (اختيارية)':'موجودة'}</td><td class="${c.missing_serial?'sx36-bad':''}">${c.missing_serial?'ناقص':esc(c.serial)}</td><td>${c.review_status==='ok'?'مكتملة':c.review_status==='returned'?'مُرجعة':'بانتظار'}</td><td>${data.source==='server'?opsStatus(c.approval_status):'غير متحقق'}</td><td><a href="#admin/collections/${encodeURIComponent(c.id)}">التفاصيل</a> · <a href="#admin/collections/${encodeURIComponent(c.id)}/edit">استكمال</a> · <a href="#admin/review?school=${encodeURIComponent(c.school_id)}">مراجعة</a> · <a href="#admin/approvals?asset=${encodeURIComponent(c.id)}">اعتماد</a></td></tr>`).join('')||'<tr><td colspan="8">لا توجد أصول في هذا التصنيف.</td></tr>'}</tbody></table></div>
 <div class="sx36-row"><span>${nf(data.filtered_total)} أصل مطابق — تظهر ${nf(data.items.length)} نتيجة.</span>${offset?`<a href="${url({offset:String(Math.max(0,offset-limit))})}">السابق</a>`:''}${offset+limit<data.filtered_total?`<a href="${url({offset:String(offset+limit)})}">التالي</a>`:''}</div>`);
 $('#qualityRefresh').onclick=()=>vQuality();$('#qualityFilter').onsubmit=e=>{e.preventDefault();go('#admin/quality?'+new URLSearchParams(new FormData(e.target)))};
 $('#qualityExport').onclick=()=>writeXlsx([['جودة البيانات',[['رقم الأصل','المبنى','مشرف الميدان','صورة ناقصة','لوحة بيانات ناقصة','تسلسلي ناقص','مراجعة غير مكتملة','مصدر الفحص'],...data.items.map(c=>[assetLabel(c)||c.id,c.building_name||(get('schools',c.school_id)||{}).name||'',c.employee_name||empName(c.employee_id),c.missing_photo?'نعم':'لا',c.missing_nameplate?'نعم':'لا',c.missing_serial?'نعم':'لا',c.missing_review?'نعم':'لا',data.source==='server'?'الخادم':'محلي غير متحقق'])]]],'solvix-quality-page-'+stampDash()+'.xlsx');
}

async function vConflicts(){
 const entries=Object.values(Cloud.conflicts||{}),selected=qp().get('key')||Object.keys(Cloud.conflicts||{})[0],entry=Cloud.conflicts?.[selected];
 opsShell('conflicts','تعارضات المزامنة',`<div class="sx36-row"><h3>تعارضات المزامنة (${entries.length})</h3><button class="secondary" id="conflictRefresh">تحديث المقارنة</button></div><p>تبقى تعديلاتك على الجهاز حتى تختار حلاً. الحقول التي عدّلها طرف واحد تدمج تلقائياً؛ الحقول المختلفة لدى الطرفين تحتاج اختياراً صريحاً.</p>
 <div class="sx36-actions">${Object.entries(Cloud.conflicts||{}).map(([key,e])=>`<a href="${Cloud.role==='tech'?'#conflicts':'#admin/conflicts'}?key=${encodeURIComponent(key)}">${esc(({collections:'أصل',schools:'مبنى',employees:'مستخدم',settings:'إعدادات',types:'نوع أصل'})[e.table]||e.table)} — ${esc(e.id)}</a>`).join('')}</div><div id="conflictComparison">${entry?'جارٍ جلب نسخة الخادم…':'لا توجد تعارضات مسجلة على هذا الجهاز.'}</div>`);
 $('#conflictRefresh').onclick=()=>vConflicts();if(!entry)return;
 const t=entry.table,id=entry.id,live=t==='settings'?opsSettings():S[t]?.find(r=>r.id===id)||null,liveCanon=live?(t==='settings'?live:Cloud.canon(t,live)):null;
 const pending=t==='settings'?JSON.stringify(liveCanon)!==Cloud.snap.settings.data:liveCanon?Cloud.key(t,live)!==Cloud.snap[t]?.[id]:Cloud.snap[t]?.[id]!==undefined;
 const local=!pending&&'local' in entry?entry.local:live,base=entry.base,capturedLive=JSON.parse(JSON.stringify(liveCanon)),capturedLocal=local?JSON.parse(JSON.stringify(t==='settings'?local:Cloud.canon(t,local))):null;
 let remote,remoteCanon;
 try{const sb=await Cloud.sb();if(t==='settings'){const result=Cloud.chk(await sb.rpc('nv_client_settings'));remote=remoteCanon=Cloud.settingsOf(result.data);}
  else{remote=Cloud.chk(await sb.from(NV_T[t]).select('*').eq('id',id).maybeSingle());remoteCanon=remote?Cloud.canon(t,remote):null}
 }catch(e){if($('#conflictComparison'))$('#conflictComparison').textContent='تعذر جلب نسخة الخادم. لم يتغير تعديلك المحلي. '+opsMessage(e);return}
 if(!$('#conflictComparison'))return;
 const fields=NV36.diff(base,capturedLocal,remoteCanon).map(f=>['created_at','updated_at','user_id','perms','no'].includes(f.key)?{...f,choice:'remote',protected:true}:f),mutable=t==='settings'?can('settings'):t==='collections'?Cloud.role==='tech'||can('edit'):['categories','conditions','rooms','types'].includes(t)?can('catalog'):can('edit');
 const value=(key,v)=>{if(v===undefined||v===null||v==='')return '<span class="sx36-muted">فارغ</span>';if(/image|photo/.test(key)&&typeof v==='string')return `<img class="sx36-preview" data-photo="${esc(v)}" alt="${esc(NV36.fieldLabels[key]||key)}"><small>${esc(v)}</small>`;return `<pre>${esc(typeof v==='object'?JSON.stringify(v,null,2):String(v))}</pre>`};
 $('#conflictComparison').innerHTML=`<div class="sx36-card"><p class="sx36-note">${!remote?'السجل غير متاح في الخادم؛ قد يكون محذوفاً أو تغير تصريح الوصول. لن يُعاد إنشاؤه تلقائياً.':!local?'حذفت السجل محلياً، لكن نسخته في الخادم تغيرت.':'اختر القيم المطلوبة ثم احفظ الدمج. يعاد فحص نسخة الخادم قبل الكتابة.'}</p>
 <div class="sx36-scroll"><table class="sx36-table"><thead><tr><th>الحقل</th><th>النسخة الأصلية</th><th>تعديل هذا الجهاز</th><th>الخادم الآن</th><th>القيمة المطلوبة</th></tr></thead><tbody>${fields.map(f=>`<tr class="${f.conflict?'sx36-conflict':''}"><th>${esc(NV36.fieldLabels[f.key]||f.key)}${f.conflict?'<small>تعارض فعلي</small>':''}</th><td>${value(f.key,f.base)}</td><td>${local?value(f.key,f.local):'محذوف محلياً'}</td><td>${remote?value(f.key,f.remote):'غير متاح بالخادم'}</td><td>${local&&remote?`<select class="sx36-input" data-conflict-field="${esc(f.key)}" ${f.protected?'disabled title="حقل محمي؛ تعتمد قيمة الخادم"':''}><option value="" ${!f.choice?'selected':''}>اختر…</option><option value="local" ${f.choice==='local'?'selected':''}>هذا الجهاز</option><option value="remote" ${f.choice==='remote'?'selected':''}>الخادم</option></select>`:'—'}</td></tr>`).join('')||'<tr><td colspan="5">لا توجد فروق بين النسختين الآن.</td></tr>'}</tbody></table></div>
 <div class="sx36-actions">${local&&remote&&mutable?'<button id="conflictMerge">حفظ الدمج المختار</button>':''}${!local&&remote&&mutable?'<button class="danger" id="conflictDelete">تأكيد الحذف المحلي على النسخة الحالية</button>':''}<button class="secondary" id="conflictServer">${remote?'اعتماد نسخة الخادم وإلغاء التعديل المحلي':'إزالة النسخة المحلية غير المتاحة في الخادم'}</button><button class="secondary" id="conflictExport">تنزيل نسخ المقارنة</button></div><p id="conflictResult" role="status"></p></div>`;
 hydratePhotos($('#conflictComparison'));
 $('#conflictExport').onclick=()=>download(new Blob([JSON.stringify({project:Cloud.cfg().url,table:t,id,base,local:capturedLocal,remote:remoteCanon},null,2)],{type:'application/json'}),'solvix-conflict-'+id+'.json');
 const unchanged=()=>NV36.equal(capturedLive,t==='settings'?opsSettings():S[t]?.find(r=>r.id===id)?Cloud.canon(t,S[t].find(r=>r.id===id)):null);
 const finish=async(updated)=>{
  if(!unchanged())throw Error('تغير تعديلك المحلي أثناء العملية. حدّث المقارنة؛ لن يُستبدل التعديل الجديد.');
  if(t==='settings'){Object.assign(S.settings,updated);Cloud.snap.settings.data=JSON.stringify(updated)}else{S[t]=S[t].filter(r=>r.id!==id);if(updated){if(t==='employees')delete updated.user_id;S[t].push(updated);Cloud.snap[t][id]=Cloud.key(t,updated)}else delete Cloud.snap[t][id]}
  await saveNow(t);await Cloud.persistSnap();delete Cloud.conflicts[selected];await Cloud.persistConflicts();Cloud.err=null;Cloud._shown=0;reindex();Cloud.badge();await vConflicts();
 };
 const action=(b,fn)=>{b.onclick=async()=>{b.disabled=true;try{if(!unchanged())throw Error('تغير التعديل المحلي. حدّث المقارنة أولاً.');await fn()}catch(e){const box=$('#conflictResult');if(box)box.textContent=opsMessage(e)}finally{if(b.isConnected)b.disabled=false}}};
 action($('#conflictServer'),async()=>{if(!confirm('سيُلغى التعديل المحلي لهذا السجل فقط. هل تعتمد نسخة الخادم المعروضة؟'))return;await finish(remote)});
 if($('#conflictMerge'))action($('#conflictMerge'),async()=>{const choices={};$$('[data-conflict-field]').forEach(el=>choices[el.dataset.conflictField]=el.value);const merged=NV36.merge(base,capturedLocal,remoteCanon,choices);
  if(t==='settings'){Cloud.chk(await (await Cloud.sb()).rpc('nv_settings_save',{p_expected:remoteCanon,p_data:merged}));await finish(merged)}else{
   const patch={};for(const k of Object.keys(merged))if(k!=='id'&&!NV36.equal(merged[k],remoteCanon[k]))patch[k]=merged[k];if(t==='collections')for(const k of ['school_image','asset_image','asset_image2','label_photo'])await Cloud.uploadPhoto(merged[k]);if(t==='collections')for(const key of merged.extra_images||[])await Cloud.uploadPhoto(key);
   await Cloud.mutate(t,id,remoteCanon,patch,false);const updated=Cloud.chk(await (await Cloud.sb()).from(NV_T[t]).select('*').eq('id',id).maybeSingle());if(!updated)throw Error('تغير السجل بعد الحفظ؛ حدّث المقارنة.');await finish(updated)
  }
 });
 if($('#conflictDelete'))action($('#conflictDelete'),async()=>{if(!confirm('حذف هذا السجل من الخادم؟ تحفظ العملية في سجل التدقيق.'))return;if(t==='collections'){const reason=prompt('سبب حذف الأصل بعد مقارنة التعارض (3–1000 حرف):');if(reason===null)return;Cloud.chk(await (await Cloud.sb()).rpc('nv_asset_delete',{p_id:id,p_expected:remoteCanon,p_reason:reason}))}else await Cloud.mutate(t,id,remoteCanon,{},true);await finish(null)});
}
</script>
