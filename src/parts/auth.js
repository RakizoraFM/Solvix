<script id="nv-auth-page">
/* NV7 — one sign-in page for technicians (#login) and admins (#admin/login): the card + the product hero. */
function authArt(){
  const st=schoolStats();let done=0,prog=0;for(const s of S.schools){const k=schoolState(s,st.get(s.id));if(k==='completed')done++;else if(k==='in_progress')prog++}
  const qty=S.collections.filter(submitted).reduce((a,c)=>a+num(c.quantity),0);const f=n=>Number(n||0).toLocaleString('en-US');
  const ar=lang()==='ar';const L=(a,e)=>esc(ar?a:e);
  const k=[[L('إجمالي المدارس','Schools'),f(S.schools.length),'#0f172a'],[L('الأصول المسجلة','Assets'),f(qty),'#1d4ed8'],[L('قيد العمل','In progress'),f(prog),'#7c3aed'],[L('مكتملة','Completed'),f(done),'#059669']];
  const bars=[38,62,48,80,56,92,70];
  const qr=(()=>{let o='';const seed=[0b1110111,0b1010101,0b1101011,0b0011100,0b1110010,0b0101110,0b1011011];for(let y=0;y<7;y++)for(let x=0;x<7;x++)if(seed[y]>>x&1)o+=`<rect x="${x*6}" y="${y*6}" width="6" height="6"/>`;return o})();
  return `<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" direction="ltr" font-family="Cairo,Tahoma,sans-serif" role="img" aria-label="${L('لوحة المؤشرات','Dashboard')}">
  <defs><linearGradient id="sxg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset=".5" stop-color="#2563eb"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>
  <linearGradient id="sxb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs>
  <rect x="58" y="22" width="430" height="282" rx="16" fill="#111827"/><rect x="70" y="34" width="406" height="258" rx="8" fill="#f8fafc"/>
  <rect x="${ar?396:70}" y="34" width="80" height="258" fill="#0b1f4d"/>
  ${[0,1,2,3,4,5,6].map(i=>`<rect x="${ar?406:80}" y="${74+i*26}" width="${i?52:60}" height="14" rx="5" fill="${i?'#1e3a8a':'#2563eb'}" opacity="${i?.9:1}"/>`).join('')}
  <rect x="${ar?408:82}" y="44" width="18" height="18" rx="5" fill="url(#sxg)"/><text x="${ar?452:122}" y="58" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">Solvix</text>
  ${k.map((c,i)=>{const x=(ar?306:162)-(ar?i*76:-i*76);return `<rect x="${x}" y="52" width="68" height="54" rx="8" fill="#fff" stroke="#e2e8f0"/><text x="${x+34}" y="70" text-anchor="middle" font-size="8" fill="#64748b">${c[0]}</text><text x="${x+34}" y="94" text-anchor="middle" font-size="16" font-weight="800" fill="${c[2]}">${c[1]}</text>`}).join('')}
  <rect x="${ar?236:162}" y="118" width="${158}" height="160" rx="10" fill="#fff" stroke="#e2e8f0"/><text x="${ar?380:176}" y="138" text-anchor="${ar?'end':'start'}" font-size="9" font-weight="800" fill="#0f172a">${L('الأصول حسب الفئة','Assets by category')}</text>
  ${bars.map((h,i)=>`<rect x="${(ar?250:176)+i*20}" y="${262-h*1.1}" width="11" height="${h*1.1}" rx="3" fill="url(#sxb)" opacity="${.55+i*.06}"/>`).join('')}
  <rect x="${ar?82:328}" y="118" width="146" height="160" rx="10" fill="#fff" stroke="#e2e8f0"/><text x="${ar?216:342}" y="138" text-anchor="${ar?'end':'start'}" font-size="9" font-weight="800" fill="#0f172a">${L('حالة المدارس','School status')}</text>
  <circle cx="${ar?155:401}" cy="200" r="42" fill="none" stroke="#e2e8f0" stroke-width="16"/><circle cx="${ar?155:401}" cy="200" r="42" fill="none" stroke="#2563eb" stroke-width="16" stroke-dasharray="170 264" transform="rotate(-90 ${ar?155:401} 200)"/>
  <circle cx="${ar?155:401}" cy="200" r="42" fill="none" stroke="#7c3aed" stroke-width="16" stroke-dasharray="50 264" stroke-dashoffset="-170" transform="rotate(-90 ${ar?155:401} 200)"/>
  <path d="M30 304h486l-22 26H52z" fill="#cbd5e1"/><rect x="230" y="304" width="86" height="7" rx="3" fill="#94a3b8"/>
  <g transform="translate(470 200) rotate(6)"><rect width="128" height="168" rx="14" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="8" y="8" width="112" height="152" rx="10" fill="#f8fafc"/>
   <g transform="translate(43 20)" fill="#0b1f4d">${qr}</g><rect x="40" y="17" width="48" height="48" fill="none" stroke="#0b1f4d" stroke-width="3" rx="2"/>
   <text x="64" y="92" text-anchor="middle" font-size="13" font-weight="800" fill="#0f172a">${L('أصل رقم','Asset No.')}</text><text x="64" y="112" text-anchor="middle" font-size="12" font-weight="800" fill="#1d4ed8" direction="ltr">AST-2026-001</text>
   <rect x="34" y="126" width="18" height="18" rx="5" fill="url(#sxg)"/><text x="58" y="140" font-size="11" font-weight="800" fill="#0b1f4d">Solvix</text></g>
  </svg>`}
function authModal(key){
  const ar=lang()==='ar';const em=String(S.settings.admin_email||'').split(',').map(s=>s.trim()).filter(Boolean)[0]||'';
  const M={
   about:[tx('عن النظام','About'),tx(`<p>${esc(appName())} نظام لحصر أصول المدارس وتوثيقها: يسجل مشرف الميدان كل أصل في الغرفة والدور مع صورته وموقعه على الخريطة وحالته وسعره، وتتابع الإدارة المدارس المكتملة وأداء مشرفي الميدان وتصدّر التقارير إلى Excel.</p><p>من منظومة RakizoraFM لإدارة المرافق والأصول الذكية.</p>`,`<p>${esc(appName())} records school assets: the technician registers each asset by floor and room with its photo, map location, condition and price; the admin follows completed schools and technicians and exports Excel reports.</p><p>Part of RakizoraFM smart facility &amp; asset management.</p>`)],
   features:[tx('المميزات','Features'),tx('<ul><li>حصر الأصول بالصور والموقع، حتى بدون إنترنت (تُرسل عند عودة الاتصال).</li><li>منع تكرار العمل: كل مدرسة لمشرف ميدان واحد حتى تكتمل.</li><li>لوحة مؤشرات: المدارس المكتملة وقيد العمل، الإنجاز اليومي، أداء مشرفي الميدان.</li><li>سجل لكل تعديل على أصل مُرسل.</li><li>تصدير Excel والصور، وواجهة عربية وإنجليزية.</li></ul>','<ul><li>Asset inventory with photos and location, also offline (sent when back online).</li><li>One technician per school until it is finished.</li><li>Dashboard: completed / in-progress schools, daily progress, technicians.</li><li>A log of every change to a submitted asset.</li><li>Excel and photo export; Arabic and English.</li></ul>')],
   support:[tx('الدعم','Support'),tx('<p><b>مشرف الميدان:</b> الرقم الوظيفي وكلمة المرور يعطيهما لك مدير المشروع أو منسقه. إذا نسيت كلمة المرور اطلب منه كلمة جديدة.</p><p><b>المشرف / الإدارة:</b> ادخل ببريدك وكلمة مرورك، ومدير النظام يعيد تعيينها من صفحة «Users».</p>','<p><b>Technicians:</b> your supervisor gives you your employee ID and password, and a new password if you forget it.</p><p><b>Admins:</b> sign in with your e-mail; the system admin resets passwords from «Users».</p>')],
   contact:[tx('تواصل معنا','Contact'),em?`<p>${tx('البريد','E-mail')}: <a href="mailto:${esc(em)}" dir="ltr">${esc(em)}</a></p>`:`<p>${tx('تواصل مع مشرفك أو مدير النظام.','Contact your supervisor or the system admin.')}</p>`],
   privacy:[tx('سياسة الخصوصية','Privacy'),tx('<p>البيانات المسجلة هنا (الأصول وصورها ومواقعها وأسماء مشرفي الميدان) تُستخدم لحصر أصول المدارس وإدارتها فقط، ولا يراها إلا مشرف الميدان صاحبها ومن تمنحهم الإدارة صلاحية. البيانات غير المرسلة تبقى على جهازك حتى ترسل.</p>','<p>The data recorded here (assets, photos, locations, technician names) is used only to inventory and manage school assets, and is visible only to its technician and the people the admin authorises. Unsent data stays on your device until it is sent.</p>')],
   terms:[tx('الشروط والأحكام','Terms'),tx('<p>الحساب شخصي ولا يُشارك. سجّل الأصول كما هي في الموقع وبصور حقيقية، ولا تُنهِ المدرسة قبل حصر كل غرفها.</p>','<p>Accounts are personal. Record assets as they are on site with real photos, and finish a school only after all its rooms are done.</p>')],
   help:[tx('مركز المساعدة','Help'),tx('<ol><li>ادخل برقمك الوظيفي وكلمة المرور.</li><li>اختر المدرسة وصوّر واجهتها.</li><li>اختر الدور ورقم الغرفة واسمها.</li><li>أدخل بيانات الأصل وصورته وموقعه ثم «حفظ ومتابعة».</li><li>أضف أصلاً آخر في نفس الغرفة أو غرفة أخرى، وفي النهاية «إنهاء العمل».</li></ol>','<ol><li>Sign in with your employee ID and password.</li><li>Pick the school and photograph its front.</li><li>Choose floor, room number and room name.</li><li>Enter the asset details, photo and location, then «Save &amp; Continue».</li><li>Add another asset in the same or another room; finally «Complete and Finish Job».</li></ol>')]};
  const m=M[key];if(!m)return;const d=document.createElement('div');d.className='sx-modal';d.innerHTML=`<div role="dialog" aria-modal="true"><h3>${m[0]}</h3>${m[1]}<button type="button">${tx('إغلاق','Close')}</button></div>`;
  d.onclick=e=>{if(e.target===d||e.target.tagName==='BUTTON')d.remove()};document.querySelector('.sx-auth').appendChild(d)}
/* o: {kind:'tech'|'admin', title, sub, fields:[{id,label,type,icon,ph,value,auto}], err, note, submit, remember?, forgot?, extra?, onSubmit(form)} */
function authPage(o){
  const ar=lang()==='ar';setMode('auth');document.documentElement.lang=lang();document.documentElement.dir=ar?'rtl':'ltr';document.documentElement.removeAttribute('data-bs-theme');
  document.body.className='sx-body';app().className='';document.title=(o.kind==='admin'?tx('دخول الإدارة','Admin sign-in'):tx('تسجيل الدخول','Sign in'))+' — '+appName();
  const icon=S.settings.logo||NV_ICON;const tag=tx('نظام حصر وإدارة الأصول','Asset inventory & management');
  const em=String(S.settings.admin_email||'').split(',').map(s=>s.trim()).filter(Boolean)[0]||'';
  const f=x=>`<div class="sx-f"><label for="${x.id}">${x.label}</label><div class="sx-in${o.err&&x.bad?' bad':''}">${x.type==='password'?`<button type="button" class="eye" data-eye="${x.id}" aria-label="${tx('إظهار كلمة المرور','Show password')}"><i class="bi bi-eye"></i></button>`:''}<input id="${x.id}" type="${x.type||'text'}" placeholder="${esc(x.ph||'')}" value="${esc(x.value||'')}" ${x.req===false?'':'required'} ${x.min?`minlength="${x.min}"`:''} autocomplete="${x.auto||'off'}" ${x.mode?`inputmode="${x.mode}"`:''} dir="${x.dir||'auto'}"><i class="ic bi ${x.icon}"></i></div></div>`;
  app().innerHTML=`<div class="sx-auth" dir="${ar?'rtl':'ltr'}"><div class="sx-bg"></div>
  <svg class="sx-city" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true"><g fill="#c7d4ea">${[[40,140],[120,220],[190,170],[260,250],[330,190],[400,120],[470,210],[540,160],[610,230],[680,140],[750,200],[820,170],[890,240],[960,150],[1030,210],[1100,180]].map(([x,h])=>`<rect x="${x}" y="${300-h}" width="58" height="${h}" rx="2"/>`).join('')}</g></svg>
  <div class="sx-panel" aria-hidden="true"></div>
  <header class="sx-top"><a class="sx-brand" href="#login"><img src="${esc(icon)}" alt=""><span><b>${esc(appName())}</b><small>${esc(tag)}</small></span></a>
   <nav class="sx-nav"><a class="on" data-go="home">${tx('الرئيسية','Home')}</a><a data-m="about">${tx('عن النظام','About')}</a><a data-m="features">${tx('المميزات','Features')}</a><a data-m="support">${tx('الدعم','Support')}</a><a data-m="contact">${tx('تواصل معنا','Contact')}</a></nav>
   <button type="button" class="sx-lang" id="langSw"><i class="bi bi-globe2"></i> ${ar?'العربية':'English'} <i class="bi bi-chevron-down" style="font-size:11px"></i></button></header>
  <main class="sx-main">
   <section class="sx-card" aria-labelledby="sxTitle">
    <div class="sx-card-logo sx-wm"><img src="${esc(S.settings.logo||NV_LOGO)}" alt="${esc(appName())}"><small>${esc(tag)}</small></div>
    <h2 id="sxTitle">${o.title}</h2><p class="sx-sub">${o.sub}</p>
    <form id="f" novalidate>${o.fields.map(f).join('')}
     ${o.err?`<div class="sx-err" role="alert">${esc(o.err)}</div>`:''}${o.note?`<div class="sx-note">${o.note}</div>`:''}
     ${o.remember!==false?`<div class="sx-row"><label><input type="checkbox" id="rem" ${lsGet('nv_remember_'+o.kind,'')?'checked':''}> ${tx('تذكرني','Remember me')}</label><a data-m="${o.kind==='admin'?'support':'support'}">${tx('نسيت كلمة المرور؟','Forgot password?')}</a></div>`:''}
     <button type="submit" class="sx-go">${o.submit} <i class="bi bi-arrow-${ar?'left':'right'}"></i></button></form>
    <div class="sx-or">${tx('أو','or')}</div>
    <div class="sx-secure"><i class="bi bi-shield-check"></i> ${tx('تسجيل دخول آمن ومشفّر لحماية بياناتك','Secure, encrypted sign-in to protect your data')}</div>
    <div class="sx-alt">${o.kind==='admin'?`<a href="#login">${tx('دخول مشرفي الميدان بالرقم الوظيفي','Technician sign-in')}</a>`:`<a href="#admin">${tx('دخول الإدارة','Admin sign-in')}</a>`}</div>
    ${o.extra||''}
   </section>
   <section class="sx-hero"><h1>${S.settings.logo?`<span>${esc(appName())}</span>`:`<img class="sx-hero-logo" src="${NV_LOGO}" alt="${esc(appName())}">`}</h1><h3>${esc(tag)}</h3>
    <p>${tx('حل متكامل لحصر أصول المدارس وتوثيقها بالصور والموقع، بكفاءة وشفافية، يدعم قرارات الصيانة والتشغيل ويحافظ على الموارد.','A complete solution to inventory school assets with photos and locations — efficient and transparent, supporting maintenance and operations decisions.')}</p>
    <div class="sx-feats"><div class="sx-feat"><i class="bi bi-box-seam"></i>${tx('حصر الأصول','Asset inventory')}</div><div class="sx-feat"><i class="bi bi-gear-fill"></i>${tx('إدارة دورة الحياة','Lifecycle')}</div><div class="sx-feat"><i class="bi bi-bar-chart-fill"></i>${tx('تقارير وتحليلات','Reports & analytics')}</div><div class="sx-feat"><i class="bi bi-geo-alt-fill"></i>${tx('مراقبة المواقع','Site monitoring')}</div></div>
    <div class="sx-art">${authArt()}</div></section>
  </main>
  <footer class="sx-foot"><div class="sx-help"><i class="bi bi-headset"></i><div>${tx('تحتاج إلى مساعدة؟','Need help?')} <a data-m="contact">${tx('تواصل مع فريق الدعم','Contact support')}</a>${em?`<small>${esc(em)}</small>`:''}</div></div>
   <div class="sx-links"><a data-m="privacy">${tx('سياسة الخصوصية','Privacy')}</a><span>|</span><a data-m="terms">${tx('الشروط والأحكام','Terms')}</a><span>|</span><a data-m="help">${tx('مركز المساعدة','Help center')}</a></div></footer></div>`;
  $$('.sx-auth [data-m]').forEach(a=>a.onclick=e=>{e.preventDefault();authModal(a.dataset.m)});
  $$('[data-go=home]').forEach(a=>a.onclick=()=>window.scrollTo({top:0,behavior:'smooth'}));
  $('#langSw').onclick=()=>{lsSet('nv_lang',ar?'en':'ar');route()};
  $$('[data-eye]').forEach(b=>b.onclick=()=>{const i=$('#'+b.dataset.eye);const sh=i.type==='password';i.type=sh?'text':'password';b.innerHTML=`<i class="bi bi-eye${sh?'-slash':''}"></i>`});
  const first=$('#f input');if(first&&!first.value)first.focus();
  $('#f').onsubmit=async e=>{e.preventDefault();const fm=e.target;const miss=[...fm.querySelectorAll('input[required]')].find(i=>!i.value.trim());if(miss){miss.closest('.sx-in').classList.add('bad');miss.focus();return}
    const r=$('#rem');lsSet('nv_remember_'+o.kind,r&&r.checked?(o.rememberValue?o.rememberValue():'1'):'');const b=fm.querySelector('.sx-go');b.disabled=true;try{await o.onSubmit(fm)}finally{if(document.body.contains(b))b.disabled=false}};
}
</script>
