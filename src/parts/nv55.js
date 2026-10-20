<style id="nv55-css">
#ai55Btn{position:fixed;inset-inline-start:18px;bottom:22px;z-index:1080;border:0;border-radius:999px;padding:12px 16px;display:none;align-items:center;gap:8px;font:700 14px Cairo,Tahoma,sans-serif;color:#fff;cursor:pointer;
 background:linear-gradient(135deg,#0ea5e9,#2563eb 55%,#7c3aed);box-shadow:0 12px 30px rgba(37,99,235,.35)}
#ai55Btn.on{display:inline-flex}#ai55Btn i{font-style:normal;font-size:18px;line-height:1}
@media (max-width:1023px){body.nv52 #ai55Btn{bottom:84px;padding:11px 13px}body.nv52 #ai55Btn span{display:none}}
#ai55Panel{position:fixed;inset-inline-start:18px;bottom:22px;z-index:1090;width:min(420px,calc(100vw - 24px));height:min(640px,calc(100vh - 40px));display:none;flex-direction:column;
 background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,42,.3);overflow:hidden;font-family:Cairo,Tahoma,sans-serif;color:#0f172a;direction:rtl}
#ai55Panel[dir=ltr]{direction:ltr}#ai55Panel.on{display:flex}
@media (max-width:640px){#ai55Panel{inset:0;width:100vw;height:100dvh;border-radius:0}}
.ai55-h{display:flex;align-items:center;gap:10px;padding:12px 14px;color:#fff;background:linear-gradient(135deg,#0f172a,#1e3a8a 60%,#4c1d95)}
.ai55-h b{font-size:16px;flex:1}.ai55-h small{display:block;font-weight:400;font-size:11px;color:#cbd5e1}
.ai55-h button{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:10px;padding:6px 10px;cursor:pointer;font:inherit;font-size:12px}
.ai55-m{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc}
.ai55-q,.ai55-a{max-width:88%;padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
.ai55-q{align-self:flex-end;background:#2563eb;color:#fff;border-end-end-radius:4px}
.ai55-a{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;border-end-start-radius:4px}
.ai55-a.err{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.ai55-q img{display:block;max-width:180px;max-height:160px;border-radius:10px;margin-bottom:6px}
.ai55-typing{align-self:flex-start;color:#64748b;font-size:13px}
.ai55-chips{display:flex;flex-wrap:wrap;gap:6px}.ai55-chips button{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer}
.ai55-hello{color:#334155;font-size:14px;line-height:1.8}
.ai55-f{border-top:1px solid #e2e8f0;padding:10px;background:#fff}
.ai55-att{display:none;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;color:#475569}.ai55-att.on{display:flex}.ai55-att img{width:44px;height:44px;object-fit:cover;border-radius:8px}
.ai55-att button{border:0;background:#f1f5f9;border-radius:8px;padding:4px 8px;cursor:pointer}
.ai55-row{display:flex;gap:6px;align-items:flex-end}
.ai55-row textarea{flex:1;resize:none;border:1px solid #cbd5e1;border-radius:12px;padding:9px 11px;font:inherit;font-size:14px;max-height:120px;outline:none}
.ai55-row textarea:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.ai55-row label,.ai55-row button{flex:none;width:42px;height:42px;border-radius:12px;border:1px solid #dbe3ef;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;position:relative}
.ai55-row label input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.ai55-row button.send{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:0}.ai55-row button:disabled{opacity:.5;cursor:not-allowed}
.ai55-note{font-size:11px;color:#94a3b8;margin-top:6px;text-align:center}
.nv-ai{background:linear-gradient(135deg,#eef2ff,#f5f3ff)!important;border-color:#c7d2fe!important;color:#4338ca!important}
</style>
<script id="nv-nv55">
/* NV55 — «مساعدك الذكي» (AI assistant). The page never talks to the model directly: everything goes through the Edge Function
   «solvix-ai» (supabase/functions/solvix-ai), which checks the caller (nv_me) and the daily quota (nv_ai_take, migration 050) and holds
   the Anthropic key as a secret. Settings key «ai» {on, daily} (general settings). Two entry points:
   1) the floating button #ai55Btn → chat window #ai55Panel (questions about the platform or the user's own work, with an optional photo);
   2) «🤖 املأ البيانات من الصورة» #aiFill in the asset form → ai55Asset(photos, setType) fills only the empty fields. */
const aiCfg=()=>{const a=S.settings.ai||{};return {on:!!a.on,daily:Math.max(1,Math.min(1000,Math.round(+a.daily||50)))}};
const ai55On=()=>!!(window.Cloud&&Cloud.on&&Cloud.role&&aiCfg().on&&navigator.onLine!==false);
const AI55={busy:false,img:null};
const ai55Key=()=>'ai55_hist_'+(Cloud.on?Cloud.scope()+'_'+(Cloud.user&&Cloud.user.id||''):'local');
const ai55Hist=()=>{try{return JSON.parse(sessionStorage.getItem(ai55Key())||'[]')}catch(e){return []}};
const ai55Save=h=>{try{sessionStorage.setItem(ai55Key(),JSON.stringify(h.slice(-30)))}catch(e){}};
const ai55Msg=code=>({disabled:tx('المساعد الذكي غير مفعّل. يفعّله مدير المشروع من الإعدادات العامة.','The assistant is switched off. The project manager can switch it on in the general settings.'),
  limit:tx('بلغت الحد اليومي لطلبات المساعد. يتجدد غداً.','You reached the daily limit of assistant requests. It renews tomorrow.'),
  subscription:tx('انتهى الاشتراك — المساعد متوقف حتى التجديد.','The subscription has ended — the assistant is paused until renewal.'),
  no_migration:tx('قاعدة البيانات تحتاج تحديث NV55 (migrations/050_ai_assistant.sql).','The database needs the NV55 update (migrations/050_ai_assistant.sql).'),
  no_key:tx('خدمة المساعد غير مجهزة على الخادم بعد (مفتاح الخدمة). أبلغ مدير النظام.','The assistant service is not set up on the server yet. Tell the system Admin.'),
  busy:tx('الخدمة مشغولة الآن — أعد المحاولة بعد قليل.','The service is busy — try again shortly.'),
  refusal:tx('لا يستطيع المساعد الإجابة عن هذا الطلب.','The assistant cannot answer this request.'),
  auth:tx('انتهت الجلسة — سجّل الدخول من جديد.','The session ended — sign in again.'),
  no_photo:tx('أضف صورة الأصل أولاً.','Add the asset photo first.'),
  parse:tx('لم تُفهم إجابة المساعد — أعد المحاولة.','The answer could not be read — try again.'),
  offline:tx('المساعد يحتاج اتصالاً بالإنترنت.','The assistant needs an internet connection.')}[code]||tx('تعذر الوصول إلى المساعد. حاول مرة أخرى.','The assistant could not be reached. Try again.'));
/* one call to the Edge Function; returns {data} or {code} */
async function ai55Call(body){if(navigator.onLine===false)return {code:'offline'};
  try{const c=await Cloud.sb();const {data,error}=await c.functions.invoke('solvix-ai',{body});
    if(error){let code='error';try{const r=error.context;const j=r&&typeof r.json==='function'?await r.json():null;if(j&&j.code)code=j.code}catch(e){}
      if(code==='error'&&/Failed to send|fetch|network/i.test(error.message||''))code=/404|not found/i.test(error.message||'')?'no_key':'busy';return {code}}
    if(data&&data.code&&!data.fields&&!data.answer)return {code:data.code};return {data}}
  catch(e){console.warn('ai55',e);return {code:'error'}}}
/* a photo → base64 JPEG ≤ 1600 px (the stamped photos are already ≤ 1600 px) */
async function ai55Img(blob){const b=await resizeImage(blob,1600,.85).catch(()=>blob);const d=await blobToData(b);const m=/^data:(image\/[a-z]+);base64,(.+)$/.exec(d);if(!m)return null;
  const t=['image/jpeg','image/png','image/webp','image/gif'].includes(m[1])?m[1]:'image/jpeg';return {media_type:t,data:m[2]}}
/* what the assistant may know: the platform guide (when the account may read it) + a short summary of the caller's own data */
function ai55Guide(){const G=typeof PLATFORM_GUIDE!=='undefined'?PLATFORM_GUIDE:null;const all=typeof docAllowed45==='function'&&docAllowed45('guide');
  if(G&&all)return G.features.map(f=>`## ${f.name}\n${f.what}\nأين: ${f.where}\n${(f.steps||[]).map((s,i)=>(i+1)+'. '+s).join('\n')}\nمن: ${f.who}`).join('\n\n');
  if(curEmp()&&typeof NAV52==='function')return 'صفحات تطبيق مشرف الميدان (القائمة الجانبية): '+NAV52().filter(x=>x.l&&!x.hide).map(x=>x.l).join('، ')+'.\nالجرد: اختيار المبنى ← الموقع (الدور والغرفة) ← بيانات الأصل وصوره ← حفظ ← طباعة الملصق ولصقه ← تصوير الملصق للتأكيد ← تعليم الغرفة مكتملة ← إنهاء المبنى.';
  return 'صفحات الإدارة: لوحة التحكم، المباني، الأصول، المستخدمون، مراجعة الصور، الإنتاج اليومي والغرف، سجل الاستثناءات، الإعدادات.'}
function ai55Context(){const lines=[`التاريخ: ${new Date().toISOString().slice(0,10)}`,`الصفحة الحالية: ${location.hash||'#'}`];const e=curEmp();
  if(e&&typeof todo52==='function'){const A=sent52(),d=tod52(),T=todo52();lines.push(`المستخدم: مشرف ميدان «${e.name}» (${e.number})`,`أصولي المرسلة: ${A.length}، اليوم: ${A.filter(c=>day51(c.submitted_at)===d).length} من هدف ${opsCfg().target}`,
    `ما يحتاج إجراء: مُرجعة ${T.ret.length}، بلا صورة ${T.nophoto.length}، ملصقات طُبعت ولم تُؤكَّد ${T.printed.length}، غرف جاهزة للتعليم ${T.rready.length}، غرف غير مكتملة ${T.rpart.length}، بانتظار الرفع ${T.pend}`,
    'مبانيّ: '+blds52().slice(0,8).map(b=>`${b.s.name} (${b.n} أصل، الغرف ${b.done}/${b.rooms}${b.completed?'، منتهٍ':''})`).join('؛ '))}
  else{const A=S.collections.filter(c=>c.submitted_at&&c.type_id),d=new Date().toISOString().slice(0,10);
    lines.push(`المستخدم: حساب إدارة (${(typeof ROLE_L!=='undefined'&&ROLE_L[Cloud.staffRole])||Cloud.staffRole||''})`,`المباني: ${S.schools.length}، المنتهية: ${S.schools.filter(s=>s.completed_at).length}، التي بدأ جردها: ${new Set(A.map(c=>c.school_id)).size}`,
      `الأصول المرسلة: ${A.length}، اليوم: ${A.filter(c=>(c.submitted_at||'').slice(0,10)===d).length}، مشرفو الميدان: ${S.employees.length}`,
      `الملصقات المؤكدة: ${A.filter(c=>c.label_at&&c.label_check!=='fail').length}، الاستثناءات: ${A.filter(c=>typeof hasExc==='function'&&hasExc(c)).length}، مُرجعة للمشرفين: ${A.filter(c=>c.review_status==='returned').length}`)}
  return lines.join('\n')}

/* ---- the floating button and the chat window ---- */
function ai55Mount(){if(document.getElementById('ai55Btn'))return;
  document.body.insertAdjacentHTML('beforeend',`<button type="button" id="ai55Btn" aria-label="مساعدك الذكي"><i>🤖</i><span>${tx('مساعدك الذكي','Your smart assistant')}</span></button>
   <section id="ai55Panel" role="dialog" aria-label="مساعدك الذكي"><div class="ai55-h"><span style="font-size:22px">🤖</span><b>${tx('مساعدك الذكي','Your smart assistant')}<small>${tx('اسأل عن المنصة أو عن عملك، أو صوّر أصلاً','Ask about the platform or your work, or photograph an asset')}</small></b><button type="button" id="ai55New">${tx('جديد','New')}</button><button type="button" id="ai55X" aria-label="إغلاق">✕</button></div>
    <div class="ai55-m" id="ai55M"></div>
    <div class="ai55-f"><div class="ai55-att" id="ai55Att"><img alt=""><span>${tx('صورة مرفقة','Photo attached')}</span><button type="button" id="ai55AttX">✕</button></div>
     <div class="ai55-row"><label title="${tx('كاميرا','Camera')}">📷<input type="file" id="ai55Cam" accept="image/*" capture="environment"></label><label title="${tx('المعرض','Gallery')}">🖼️<input type="file" id="ai55Gal" accept="image/*"></label>
      <textarea id="ai55Q" rows="1" placeholder="${tx('اكتب سؤالك…','Type your question…')}"></textarea><button type="button" class="send" id="ai55Send" aria-label="إرسال">➤</button></div>
     <div class="ai55-note">${tx('قد يخطئ المساعد — راجع المعلومات المهمة قبل اعتمادها.','The assistant can make mistakes — check important information.')}</div></div></section>`);
  const P=document.getElementById('ai55Panel');
  document.getElementById('ai55Btn').onclick=()=>{P.classList.add('on');P.dir=lang()==='ar'?'rtl':'ltr';ai55Draw();setTimeout(()=>document.getElementById('ai55Q').focus(),50)};
  document.getElementById('ai55X').onclick=()=>P.classList.remove('on');
  document.getElementById('ai55New').onclick=()=>{ai55Save([]);AI55.img=null;ai55Att();ai55Draw()};
  const pick=async inp=>{const f=inp.files&&inp.files[0];inp.value='';if(!f)return;AI55.img=f;ai55Att()};
  document.getElementById('ai55Cam').onchange=e=>pick(e.target);document.getElementById('ai55Gal').onchange=e=>pick(e.target);
  document.getElementById('ai55AttX').onclick=()=>{AI55.img=null;ai55Att()};
  const q=document.getElementById('ai55Q');q.addEventListener('input',()=>{q.style.height='auto';q.style.height=Math.min(120,q.scrollHeight)+'px'});
  q.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ai55Send()}});
  document.getElementById('ai55Send').onclick=()=>ai55Send()}
function ai55Att(){const a=document.getElementById('ai55Att');if(!a)return;if(AI55.img){a.classList.add('on');const u=URL.createObjectURL(AI55.img);a.querySelector('img').src=u}else a.classList.remove('on')}
function ai55Draw(){const M=document.getElementById('ai55M');if(!M)return;const h=ai55Hist();
  const chips=curEmp()?[tx('كم أصلاً سجلت اليوم؟','How many assets did I record today?'),tx('ما الذي يحتاج إجراء عندي؟','What needs action?'),tx('كيف أؤكد لصق الملصق؟','How do I confirm a label?'),tx('صوّر أصلاً واسألني ما هو','Photograph an asset and ask me what it is')]
    :[tx('لخّص تقدم الجرد','Summarise the progress'),tx('كيف أضيف مشرف ميدان؟','How do I add a field supervisor?'),tx('كيف أطبع ملصقات مبنى؟','How do I print a building’s labels?'),tx('ما أبرز التنبيهات؟','What are the main alerts?')];
  M.innerHTML=(h.length?'':`<div class="ai55-hello">👋 ${tx('أهلاً! أنا مساعدك الذكي في Solvix. اسألني عن طريقة استخدام المنصة أو عن أرقام عملك، أو أرفق صورة أصل وسأخبرك ما هو وما يظهر على لوحة بياناته.','Hi! I am your smart assistant in Solvix. Ask how to use the platform or about your numbers, or attach a photo of an asset.')}</div><div class="ai55-chips">${chips.map(c=>`<button type="button" data-ai55q="${esc(c)}">${esc(c)}</button>`).join('')}</div>`)
   +h.map(m=>m.role==='user'?`<div class="ai55-q">${m.img?'📷 ':''}${esc(m.content)}</div>`:`<div class="ai55-a ${m.err?'err':''}">${esc(m.content)}</div>`).join('')+(AI55.busy?`<div class="ai55-typing" id="ai55T">${tx('🤖 يكتب…','🤖 typing…')}</div>`:'');
  M.querySelectorAll('[data-ai55q]').forEach(b=>b.onclick=()=>{const q=document.getElementById('ai55Q');q.value=b.dataset.ai55q;if(/صوّر|Photograph/.test(q.value)){q.value=tx('ما هذا الأصل؟ وما المكتوب على لوحة بياناته؟','What is this asset, and what is on its nameplate?');document.getElementById('ai55Cam').click()}else ai55Send()});
  M.scrollTop=M.scrollHeight}
async function ai55Send(){if(AI55.busy)return;const q=document.getElementById('ai55Q');const text=q.value.trim()||(AI55.img?tx('ما هذا الأصل؟ وما المكتوب على لوحة بياناته؟','What is this asset, and what is on its nameplate?'):'');if(!text)return;
  const h=ai55Hist();h.push({role:'user',content:text,img:!!AI55.img});ai55Save(h);q.value='';q.style.height='auto';AI55.busy=true;ai55Draw();document.getElementById('ai55Send').disabled=true;
  const img=AI55.img;AI55.img=null;ai55Att();
  let r;try{const images=img?[await ai55Img(img)].filter(Boolean):[];r=await ai55Call({kind:'chat',messages:h.filter(m=>!m.err).map(m=>({role:m.role,content:m.content})),images,guide:ai55Guide(),context:ai55Context()})}catch(e){r={code:'error'}}
  const h2=ai55Hist();if(r.data&&r.data.answer)h2.push({role:'assistant',content:r.data.answer+(r.data.truncated?' …':'')});else h2.push({role:'assistant',content:ai55Msg(r.code),err:1});
  ai55Save(h2);AI55.busy=false;const s=document.getElementById('ai55Send');if(s)s.disabled=false;ai55Draw()}
/* show the button on signed-in pages when the assistant is on */
function ai55Sync(){ai55Mount();const b=document.getElementById('ai55Btn');const signed=(curEmp()||(location.hash.startsWith('#admin')&&typeof isAuthed==='function'&&isAuthed()))&&!/^#(admin\/)?login|^#(forgot|reset-password)/.test(location.hash);
  b.classList.toggle('on',!!(ai55On()&&signed&&!document.body.classList.contains('nv-auth')));if(!b.classList.contains('on'))document.getElementById('ai55Panel').classList.remove('on')}
window.addEventListener('hashchange',()=>setTimeout(ai55Sync,80));window.addEventListener('online',ai55Sync);window.addEventListener('offline',ai55Sync);
setInterval(()=>{if(document.getElementById('app'))ai55Sync()},5000);setTimeout(ai55Sync,600);

/* ---- asset form: fill the empty fields from the photos ---- */
const ai55FillBtn=()=>ai55On()?`<button type="button" id="aiFill" class="nv-ocr nv-ai">🤖 ${tx('املأ البيانات من الصورة (مساعدك الذكي)','Fill the data from the photo (smart assistant)')}</button><p id="aiMsg" class="nv-ocr-msg"></p>`:'';
async function ai55Asset(files,setType){const m=document.getElementById('aiMsg'),b=document.getElementById('aiFill');if(!m||!b)return;
  if(!files.length){m.textContent=ai55Msg('no_photo');return}b.disabled=true;m.textContent=tx('🤖 جارٍ قراءة الصور… (قد يستغرق حتى دقيقة)','🤖 Reading the photos… (up to a minute)');
  try{const images=(await Promise.all(files.slice(0,2).map(ai55Img))).filter(Boolean);
    const catName=c=>(get('categories',c)||{}).ar||'';
    const catalog=S.types.filter(x=>!x.archived).map(x=>`${x.code||x.id}|${[catName(x.cat),x.l2,x.l3,x.ar].filter(Boolean).join(' > ')}${x.en?' ('+x.en+')':''}`).join('\n');
    const conditions=S.conditions.map(x=>`${x.id}|${x.ar}${x.en?' ('+x.en+')':''}`).join('\n');
    const r=await ai55Call({kind:'asset',images,catalog,conditions});if(!r.data||!r.data.fields){m.textContent=ai55Msg(r.code);return}
    const F=r.data.fields,done=[];const set=(id,v,label)=>{const el=document.getElementById(id);v=String(v||'').trim();if(!el||!v||String(el.value||'').trim())return;el.value=v.slice(0,200);el.classList.add('nv-filled');done.push(label+': '+v)};
    const typ=document.getElementById('a_type_id');if(F.type_code&&typ&&!typ.value){const x=S.types.find(t=>t.code===F.type_code||t.id===F.type_code||t.id==='a'+F.type_code);if(x&&setType(x.id)){typ.classList.add('nv-filled');done.push(tx('نوع الأصل','Asset type')+': '+x.ar)}}
    set('a_manufacturer',F.manufacturer,tx('الشركة المصنعة','Manufacturer'));set('a_brand',F.brand,tx('الماركة','Brand'));set('a_model',F.model,tx('الموديل','Model'));set('a_capacity',F.capacity,tx('السعة','Capacity'));set('a_serial',F.serial,tx('الرقم التسلسلي','Serial'));
    const co=document.getElementById('a_condition_id');if(F.condition_id&&co&&!co.value&&S.conditions.some(x=>x.id===F.condition_id)){co.value=F.condition_id;co.classList.add('nv-filled');done.push(tx('الحالة','Condition')+': '+((get('conditions',F.condition_id)||{}).ar||''))}
    set('a_notes',[F.description,F.notes].filter(Boolean).join(' — '),tx('الملاحظات','Notes'));
    const conf={high:tx('عالية','high'),medium:tx('متوسطة','medium'),low:tx('منخفضة','low')}[F.confidence]||'';
    m.textContent=done.length?`✓ ${tx('تمت تعبئة','Filled')} ${done.length}: ${done.join(' · ')}${conf?' — '+tx('الثقة: ','confidence: ')+conf:''}. ${tx('راجعها قبل الحفظ.','Check before saving.')}`:tx('لم تُضف بيانات جديدة: الحقول معبأة مسبقاً أو لم يظهر في الصورة ما يُقرأ بثقة.','Nothing new was added: the fields are filled already or nothing could be read with confidence.')}
  catch(e){console.warn('ai55 asset',e);m.textContent=ai55Msg('error')}finally{b.disabled=false}}

/* ---- settings: usage of the last 30 days (management) ---- */
async function ai55Usage(box){box.innerHTML='<p class="small text-muted mb-0">جارٍ التحميل…</p>';
  try{const c=await Cloud.sb();const rows=Cloud.chk(await c.rpc('nv_ai_usage_report',{p_days:30}))||[];const by=new Map();for(const r of rows){const k=r.name||'—';const o=by.get(k)||{n:0,chat:0,asset:0,days:0,kind:r.kind};o.n+=r.n;o.chat+=r.chat;o.asset+=r.asset;o.days++;by.set(k,o)}
    box.innerHTML=rows.length?`<table class="table table-sm mb-0"><thead><tr><th>المستخدم</th><th>الطلبات</th><th>أسئلة</th><th>تعبئة من الصور</th><th>أيام الاستخدام</th></tr></thead><tbody>${[...by].sort((a,b)=>b[1].n-a[1].n).map(([k,o])=>`<tr><td>${esc(k)} <small class="text-muted">${o.kind==='field'?'مشرف ميدان':'إدارة'}</small></td><td class="num">${o.n}</td><td class="num">${o.chat}</td><td class="num">${o.asset}</td><td class="num">${o.days}</td></tr>`).join('')}</tbody></table>`:'<p class="small text-muted mb-0">لا يوجد استخدام في آخر 30 يوماً.</p>'}
  catch(e){box.innerHTML=`<p class="small text-danger mb-0">${/nv_ai_usage_report|schema cache|does not exist/.test(e.message)?'شغّل migrations/050_ai_assistant.sql في قاعدة البيانات.':esc(e.message)}</p>`}}
/* ---- «حالة قاعدة البيانات» (system Admin): which upgrades (migrations) this customer's database has ---- */
async function nv55Schema(box){if(!box||!Cloud.on)return;box.innerHTML='<div class="card mb-3"><div class="card-body small text-muted">جارٍ فحص قاعدة البيانات…</div></div>';
  let r=null,err='';try{const c=await Cloud.sb();r=Cloud.chk(await c.rpc('nv_schema_level'))}catch(e){err=e.message||String(e)}
  if(!document.body.contains(box))return;
  const miss=r&&Array.isArray(r.items)?r.items.filter(x=>!x.ok):null;const old=!r&&/nv_schema_level|schema cache|does not exist|Could not find/i.test(err);
  box.innerHTML=`<div class="card mb-3 ${miss&&!miss.length?'border-success':'border-warning'}" id="schemaCard" data-miss="${miss?miss.map(x=>x.m).join(','):old?'old':'err'}"><div class="card-body">
   <h3 class="h6 fw-bold mb-2"><i class="bi bi-database-check me-1 ${miss&&!miss.length?'text-success':'text-warning'}"></i>حالة قاعدة البيانات</h3>
   ${miss?(miss.length?`<p class="mb-2">⚠️ ينقص هذه القاعدة ${miss.length} تحديث، فلا تعمل مزاياه:</p><ul class="mb-2">${miss.map(x=>`<li><b dir="ltr">migrations/${esc(x.m)}_*.sql</b> — ${esc(x.name)}</li>`).join('')}</ul><p class="small text-muted mb-0">الحل الأسهل: شغّل <b>solvix_setup.sql</b> كاملاً في Supabase ← SQL Editor (آمن للتكرار ولا يحذف البيانات)، أو الملفات الناقصة بالترتيب.</p>`
      :`<p class="mb-1 text-success">✓ القاعدة محدّثة حتى الترحيل ${esc(r.latest)}.</p><div class="small text-muted">${r.items.map(x=>`${esc(x.m)} ${esc(x.name)}`).join(' · ')}</div>`)
     :old?`<p class="mb-1">⚠️ القاعدة أقدم من NV55: لا يمكن فحص التحديثات تفصيلياً.</p><p class="small text-muted mb-0">شغّل <b>solvix_setup.sql</b> كاملاً في Supabase ← SQL Editor (آمن للتكرار)، ثم أعد فتح هذه الصفحة.</p>`
     :`<p class="small text-danger mb-0">تعذر الفحص: ${esc(err)}</p>`}
   <button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="schemaRe">إعادة الفحص</button></div></div>`;
  const b=box.querySelector('#schemaRe');if(b)b.onclick=()=>nv55Schema(box)}
{const _vSystem55=vSystem;vSystem=async function(){const h=location.hash;const r=_vSystem55.apply(this,arguments);
  setTimeout(()=>{if(location.hash!==h||!isSys())return;const anchor=$('#documentSettings45');if(!anchor||$('#schemaBox'))return;anchor.insertAdjacentHTML('beforebegin','<div id="schemaBox"></div>');nv55Schema($('#schemaBox'))},0);return r}}
</script>
