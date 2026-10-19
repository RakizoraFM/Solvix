<style id="nv48-css">
.nv48-map{height:68vh;min-height:380px;border-radius:12px;border:1px solid #dbe3ef;z-index:0}
.nv48-lg{display:flex;flex-wrap:wrap;gap:.4rem 1rem;font-size:.85rem}.nv48-lg i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-inline-end:.35rem;vertical-align:-1px;border:2px solid #fff;box-shadow:0 0 0 1px #94a3b8}
.nv48-pop{font-family:Cairo,Tahoma,sans-serif;direction:rtl;text-align:right;min-width:210px}.nv48-pop b{font-size:.95rem}.nv48-pop dl{margin:.4rem 0;display:grid;grid-template-columns:auto 1fr;gap:.1rem .6rem;font-size:.8rem}.nv48-pop dt{color:#64748b;font-weight:400}.nv48-pop dd{margin:0}
.nv48-pop .btns{display:flex;gap:.35rem;flex-wrap:wrap}.nv48-pop .btns a{font-size:.78rem;padding:.2rem .55rem;border-radius:6px;background:#2563eb;color:#fff!important;text-decoration:none}.nv48-pop .btns a.alt{background:#eef2ff;color:#1e3a8a!important}
.nv48-view{display:inline-flex;gap:.35rem;align-items:center;flex-wrap:wrap;font-size:12px}.nv48-view select{padding:4px 8px;border-radius:8px;border:1px solid #d0d9e8;background:var(--bs-body-bg,#fff);color:inherit;font-size:12px}
.i42.nv48-dense .i42-table td{padding:5px 8px}.i42.nv48-dense .i42-table td small{font-size:11px}
.i42.nv48-p-l .i42-photo{width:96px;height:96px}.i42.nv48-p-0 .i42-photo{display:none}
.b48-th{float:inline-start;margin-inline-end:8px}.i42.nv48-p-l .b48-th{width:72px;height:72px}
</style>
<script id="nv48">
/* NV48 — buildings map, building PDF report, asset table display options, Excel header language */

/* ---- Excel header language (user menu «عناوين ملفات Excel») */
document.addEventListener('click',e=>{const b=e.target.closest('[data-xl-lang]');if(!b)return;e.preventDefault();lsSet('nv_xl_lang',b.dataset.xlLang);
  b.parentElement.querySelectorAll('[data-xl-lang]').forEach(x=>{const on=x===b;x.className='btn '+(on?'btn-primary':'btn-outline-secondary');x.setAttribute('aria-pressed',String(on))});
  toast(b.dataset.xlLang==='ar'?'ملفات Excel القادمة بعناوين عربية.':'ملفات Excel القادمة بعناوين إنجليزية (القالب المعتمد).')});

/* ---- «خريطة المباني» (#admin/map): one dot per building coloured by its inventory state; buildings without coordinates
   use the median of their assets' GPS (dashed ring, «موقع تقريبي»); the rest are counted. */
PAGE_META.map=['bi-geo-alt','مواقع المباني على الخريطة بحالة الجرد — اضغط المبنى لفتح بياناته'];
const MAP48={st:'',city:'',x:{}};
function map48Points(){const C=siteCfg(),sst=schoolStats(),F=MAP48;const out=[],none=[];
  for(const s of S.schools){if(F.city&&s.city!==F.city)continue;if(Object.entries(F.x).some(([k,v])=>v&&siteVal(s,{k})!==v))continue;
    const k=schoolState(s,sst.get(s.id));if(F.st&&k!==F.st)continue;const ref=schoolRef(s.id);if(!ref){none.push(s);continue}
    out.push({s,k,p:ref.p,approx:ref.src!=='school',recs:(sst.get(s.id)||{}).any||0})}
  return {C,out,none}}
function vMap48(){if(!can('view')&&Cloud.on)return go('#admin');const {C,out,none}=map48Points(),F=MAP48,XS=C.extra.filter(x=>x.t==='select');
  const cnt=k=>out.filter(x=>x.k===k).length,COL={completed:DC.done,in_progress:DC.prog,not_started:'#94a3b8'};
  const cities=[...new Set(S.schools.map(s=>s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  adminShell('map','خريطة المباني',`<div class="card"><div class="card-body">
   <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
    <select class="form-select form-select-sm" style="width:auto" id="m48St" aria-label="حالة الجرد"><option value="">كل حالات الجرد</option>${Object.entries(SCH_ST).map(([k,l])=>`<option value="${k}" ${F.st===k?'selected':''}>${l}</option>`).join('')}</select>
    <select class="form-select form-select-sm" style="width:auto" id="m48City" aria-label="${esc(C.f.city.l)}"><option value="">كل ${esc(C.f.city.l==='المحافظة'?'المحافظات':C.f.city.l)}</option>${cities.map(c=>`<option ${F.city===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
    ${XS.map(x=>`<select class="form-select form-select-sm" style="width:auto" data-m48x="${esc(x.k)}" aria-label="${esc(x.l)}"><option value="">كل ${esc(x.l)}</option>${[...new Set(siteOpts(x).concat(S.schools.map(s=>siteVal(s,x)).filter(Boolean)))].map(o=>`<option ${F.x[x.k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`).join('')}
    <div class="nv48-lg ms-auto" data-kpi="map" data-val="${cnt('completed')},${cnt('in_progress')},${cnt('not_started')},${none.length}">${Object.entries(SCH_ST).map(([k,l])=>`<span><i style="background:${COL[k]}"></i>${l} <b>${nf(cnt(k))}</b></span>`).join('')}<span><i style="background:#fff;border:2px dashed #64748b;box-shadow:none"></i>موقع تقريبي من الأصول</span></div></div>
   <div id="m48" class="nv48-map" role="region" aria-label="خريطة المباني"></div>
   <div class="small text-muted mt-2">${nf(out.length)} مبنى على الخريطة${none.length?` · <b>${nf(none.length)}</b> مبنى بلا إحداثيات ولا أصول مرسلة بموقع — أضف «إحداثيات المبنى» من نموذج المبنى أو ملف الاستيراد (Latitude / Longitude).`:''}</div></div></div>`);
  $('#m48St').onchange=e=>{F.st=e.target.value;vMap48()};$('#m48City').onchange=e=>{F.city=e.target.value;vMap48()};$$('[data-m48x]').forEach(el=>el.onchange=()=>{F.x[el.dataset.m48x]=el.value;vMap48()});
  needLeaflet().then(()=>{const el=$('#m48');if(!el)return;const L=window.L;const m=L.map(el,{preferCanvas:true}).setView([26.33,43.97],8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(m);
    const pts=[];for(const x of out){const ex=C.extra.map(f=>[f.l,siteVal(x.s,f)]).filter(([,v])=>v);
      const pop=`<div class="nv48-pop"><b>${esc(x.s.name)}</b><dl><dt>${esc(C.f.ident.l)}</dt><dd>${esc(x.s.ident)}</dd>${x.s.city?`<dt>${esc(C.f.city.l)}</dt><dd>${esc(x.s.city)}</dd>`:''}<dt>حالة الجرد</dt><dd>${SCH_ST[x.k]}</dd><dt>سجلات الجرد</dt><dd>${nf(x.recs)}</dd>${ex.map(([l,v])=>`<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}${x.approx?'<dt>الموقع</dt><dd>تقريبي من الأصول</dd>':''}</dl>
        <div class="btns"><a href="#admin/collections/building/${encodeURIComponent(x.s.id)}">فحص أصول المبنى</a><a class="alt" href="javascript:void 0" data-r48="${esc(x.s.id)}">تقرير PDF</a><a class="alt" href="javascript:void 0" data-r48="${esc(x.s.id)}" data-full="1">التقرير الشامل</a>${can('edit')?`<a class="alt" href="#admin/schools/${encodeURIComponent(x.s.id)}/edit">تعديل</a>`:''}</div></div>`;
      L.circleMarker(x.p,{radius:7,color:x.approx?'#475569':'#fff',weight:x.approx?2:1.5,dashArray:x.approx?'3 3':null,fillColor:COL[x.k],fillOpacity:.9}).bindPopup(pop).bindTooltip(x.s.name,{direction:'top'}).addTo(m);pts.push(x.p)}
    if(pts.length)m.fitBounds(pts,{padding:[30,30],maxZoom:15});el._m48=m;setTimeout(()=>m.invalidateSize(),60)}).catch(()=>{const el=$('#m48');if(el)el.innerHTML='<div class="p-4 text-center text-muted">تعذر تحميل الخريطة (يحتاج اتصالاً بالإنترنت).</div>'})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-r48]');if(b){e.preventDefault();buildingReport48(b.dataset.r48,b.dataset.full==='1')}});

/* ---- building PDF report: a printable A4 page (the browser saves it as PDF).
   Summary: building data incl. own fields, totals, assets by condition / level 1, weak assets, and photo cards
   (asset photo + the label QR as printed + the stuck-label photo). full=true adds one card per sent asset with
   all its data and its four images (asset, nameplate, QR, stuck label). Photos are scaled down (thumb48). */
async function thumb48(k,max){if(!k)return '';try{const b=await IDB.get('photos',k).catch(()=>null)||(Cloud.on&&await Cloud.fetchPhoto(k));if(!b)return '';
  const bm=await createImageBitmap(b);const z=Math.min(1,max/Math.max(bm.width,bm.height));const cv=document.createElement('canvas');cv.width=Math.round(bm.width*z);cv.height=Math.round(bm.height*z);
  cv.getContext('2d').drawImage(bm,0,0,cv.width,cv.height);bm.close&&bm.close();return cv.toDataURL('image/jpeg',.78)}catch(e){return ''}}
async function buildingReport48(sid,full){const s=get('schools',sid);if(!s)return;const w=window.open('','_blank');if(!w)return alert('اسمح للموقع بفتح النوافذ المنبثقة لعرض التقرير.');
  w.document.write('<!doctype html><meta charset="utf-8"><p id="prog" style="font-family:Tahoma;padding:20px;direction:rtl">جارٍ تجهيز التقرير…</p>');
  const prog=t=>{try{const e=w.document.getElementById('prog');if(e)e.textContent=t}catch(x){}};
  const C=siteCfg(),all=S.collections.filter(c=>c.school_id===sid),sub=all.filter(c=>c.type_id&&c.submitted_at);
  const T=c=>get('types',c.type_id)||{},Q=l=>l.reduce((a,c)=>a+num(c.quantity),0),V=l=>l.reduce((a,c)=>a+(c.price!=null&&c.price!==''?num(c.quantity)*Number(c.price):0),0);
  const room=c=>[c.floor,(get('rooms',c.room_name_id)||{}).ar,c.room_number].filter(Boolean).join(' / ');
  const cond=c=>(get('conditions',c.condition_id)||{}).ar||'';
  const st=schoolState(s,schoolStats().get(sid)),emps=[...new Set(all.map(c=>c.employee_id))].map(empName).filter(Boolean);
  const grp=(key,name,color)=>{const m=new Map();for(const c of sub){const k=key(c)||'';const x=m.get(k)||{n:name(k),l:[]};x.l.push(c);m.set(k,x)}return [...m.values()].map(x=>({n:x.n,q:Q(x.l),v:V(x.l),c:color?color(x.l[0]):null})).sort((a,b)=>b.q-a.q)};
  const byCond=grp(c=>c.condition_id,k=>(get('conditions',k)||{}).ar||'غير محدد',c=>condColor(c.condition_id,0)),byCat=grp(c=>c.category_id||T(c).cat,k=>(get('categories',k)||{}).ar||'غير محدد');
  const qAll=Q(sub)||1,crit=sub.filter(c=>T(c).critical),weak=sub.filter(c=>isWeak(c.condition_id));
  const attn=weak.slice().sort((a,b)=>(T(b).critical?1:0)-(T(a).critical?1:0)||V([b])-V([a])).slice(0,15);
  const F=C.f,data=[[F.ident.l,s.ident],[F.moe.on&&F.moe.l,s.moe],[F.city.on&&F.city.l,s.city],[F.district.on&&F.district.l,s.district],[F.site.on&&F.site.l,s.site],[F.geo.on&&F.geo.l,s.lat!=null&&s.lat!==''?`${s.lat}, ${s.lng}`:''],...C.extra.map(x=>[x.l,siteVal(s,x)]),['حالة الجرد',SCH_ST[st]],['تاريخ اكتمال الجرد',s.completed_at?fmtYmd(s.completed_at):''],['مشرفو الميدان',emps.join('، ')],[F.description.on&&F.description.l,s.description]].filter(([l])=>l);
  const pick=[...crit.filter(c=>isWeak(c.condition_id)),...crit,...weak,...sub.slice().sort((a,b)=>V([b])-V([a]))].filter((c,i,a)=>(c.asset_image||c.label_photo)&&a.indexOf(c)===i).slice(0,6);
  const list=full?sub.slice().sort((a,b)=>String(a.floor||'').localeCompare(String(b.floor||''),'ar',{numeric:true})||String(a.room_number||'').localeCompare(String(b.room_number||''),'ar',{numeric:true})||num(a.no)-num(b.no)):[];
  /* QR = the same text as the printed label (label settings' QR fields) */
  let qrOk=true;try{await needQR()}catch(e){qrOk=false}
  const Z=labelSize(),qr=c=>qrOk&&c.no?qrSvg(qrText(c,Z.qr)):'';
  const imgs=new Map();const want=[...new Set([...pick,...list])];const bImg=(all.find(c=>c.school_image)||{}).school_image;
  let n=0;for(const c of want){n++;if(n%5===0||n===want.length)prog(`جارٍ تجهيز الصور ${n} / ${want.length}…`);const max=full&&!pick.includes(c)?520:760;
    imgs.set(c.id,{a:await thumb48(c.asset_image,max),p:full?await thumb48(c.asset_image2,max):'',l:await thumb48(c.label_photo,max)})}
  const bU=await thumb48(bImg,900);
  const tbl=(head,rows)=>`<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${head.length}" class="mut">لا توجد بيانات</td></tr>`}</tbody></table>`;
  const bar=(p,c)=>`<span class="bar"><i style="width:${Math.max(1,p)}%;background:${c||'#2563eb'}"></i></span>`;
  const pct=q=>Math.round(q/qAll*1000)/10;
  const fig=(src,cap,empty)=>`<figure>${src?`<img src="${src}" alt="${esc(cap)}">`:`<div class="noimg">${esc(empty||'غير مرفقة')}</div>`}<figcaption>${esc(cap)}</figcaption></figure>`;
  const qfig=c=>`<figure class="qr">${qr(c)?`<div class="qrb">${qr(c)}</div>`:'<div class="noimg">لم يُخصص رقم بعد</div>'}<figcaption>QR الملصق</figcaption></figure>`;
  const lblState=c=>c.label_at?(c.label_check==='unread'?'مؤكد — QR غير مقروء':'مؤكد اللصق')+' · '+fmtYmd(c.label_at):c.label_printed_at?'طُبع ولم يُؤكد لصقه':'لم يُطبع';
  const head=c=>`<div class="ah"><span class="tag">${esc(assetLabel(c)||'—')}</span> <b>${esc(T(c).ar||'—')}</b>${T(c).critical?' <span class="crit">حرج</span>':''}<span class="loc">${esc(room(c)||'')}</span></div>`;
  const pcard=c=>{const I=imgs.get(c.id)||{};return `<div class="ac">${head(c)}<div class="ims i3">${fig(I.a,'الأصل في موقعه')}${qfig(c)}${fig(I.l,'الملصق بعد اللصق',c.label_printed_at?'لم تُرفع صورة اللصق':'لم يُطبع الملصق')}</div><div class="meta">${esc(cond(c)||'—')} · ${esc(lblState(c))}</div></div>`};
  const fcard=c=>{const I=imgs.get(c.id)||{},t=T(c);const kv=[['كود الأصل',t.code],['المستوى 2 / 3',[t.l2,t.l3].filter(Boolean).join(' / ')],['الفئة',(get('categories',c.category_id||t.cat)||{}).ar],['الحالة الفنية',cond(c)],['الكمية',nf(num(c.quantity))],['السعر (ريال)',c.price!=null&&c.price!==''?sar(c.price):''],['الشركة المصنعة',c.manufacturer],['الماركة',c.brand],['الموديل',c.model],['السعة',c.capacity],['الرقم التسلسلي',c.serial],['الوكيل',c.agency],['الضمان',c.warranty],['تاريخ التركيب',c.install_date],['رئيسي / فرعي',c.parent_child],['الرقم الخارجي',c.tag],['مشرف الميدان',empName(c.employee_id)],['وقت الإرسال',ymdhms(c.submitted_at)],['مراجعة الصور',{ok:'معتمدة',returned:'مُرجعة'}[c.review_status]||'بانتظار المراجعة'],['الملصق',lblState(c)],['ملاحظات',c.notes]].filter(([,v])=>v!=null&&v!=='');
    return `<div class="ac full">${head(c)}<div class="kv">${kv.map(([k,v])=>`<div><span>${esc(k)}</span>${esc(v)}</div>`).join('')}</div><div class="ims i4">${fig(I.a,'الأصل في موقعه')}${fig(I.p,'لوحة البيانات','غير مرفقة (اختيارية)')}${qfig(c)}${fig(I.l,'الملصق بعد اللصق',c.label_printed_at?'لم تُرفع صورة اللصق':'لم يُطبع الملصق')}</div></div>`};
  const title=full?'التقرير الشامل لأصول المبنى':'تقرير أصول المبنى';
  const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — ${esc(s.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap">
<style>@page{size:A4;margin:11mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}body{font-family:Cairo,Tahoma,sans-serif;color:#0f172a;font-size:11.5px}
.pg{width:100%;max-width:200mm;margin:0 auto;padding:16px 12px}
.top{display:flex;align-items:center;gap:14px;border-bottom:3px solid transparent;border-image:linear-gradient(90deg,#0ea5e9,#2563eb,#7c3aed) 1;padding-bottom:8px;margin-bottom:10px}.top img{height:42px}.top h1{font-size:19px;margin:0}.top .sub{color:#64748b;font-size:11px}
h2{font-size:13.5px;margin:14px 0 6px;color:#1e3a8a}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 14px}.grid div{border-bottom:1px solid #eef2f7;padding:3px 0}.grid span,.kv span{color:#64748b;display:block;font-size:9.5px}
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.kpis div{border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px}.kpis span{color:#64748b;font-size:10px;display:block}.kpis b{font-size:16px}
table{width:100%;border-collapse:collapse;margin-top:2px}th,td{border-bottom:1px solid #e9eef5;padding:4px 6px;text-align:right;vertical-align:middle}th{background:#f1f5f9;font-size:10.5px;color:#334155}.num{font-variant-numeric:tabular-nums;direction:ltr;text-align:left;unicode-bidi:plaintext}
.bar{display:inline-block;width:110px;height:7px;background:#eef2f7;border-radius:4px;vertical-align:middle;overflow:hidden}.bar i{display:block;height:100%;border-radius:4px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.bimg{float:left;width:190px;height:125px;object-fit:cover;border-radius:8px;margin:0 12px 6px 0;border:1px solid #e2e8f0}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ac{border:1px solid #e2e8f0;border-radius:10px;padding:7px;break-inside:avoid;page-break-inside:avoid}.ac.full{margin-bottom:8px}
.ah{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;margin-bottom:5px}.ah .loc{margin-inline-start:auto;color:#64748b;font-size:10px}
.ims{display:grid;gap:6px}.ims.i3{grid-template-columns:repeat(3,1fr)}.ims.i4{grid-template-columns:repeat(4,1fr)}
figure{margin:0;border:1px solid #eef2f7;border-radius:7px;overflow:hidden;background:#fff}figure img{width:100%;height:105px;object-fit:cover;display:block;background:#f1f5f9}.ac.full figure img{height:118px}
figure.qr .qrb{height:105px;display:flex;align-items:center;justify-content:center;padding:4px}.ac.full figure.qr .qrb{height:118px}figure.qr svg{height:100%;width:auto;max-width:100%}
.noimg{height:105px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:9.5px;background:#f8fafc;text-align:center;padding:4px}.ac.full .noimg{height:118px}
figcaption{padding:2px 5px;font-size:9px;color:#475569;text-align:center;border-top:1px solid #eef2f7}.meta{margin-top:4px;font-size:9.5px;color:#475569}
.kv{display:grid;grid-template-columns:repeat(4,1fr);gap:3px 10px;margin-bottom:6px;font-size:10.5px}.kv div{border-bottom:1px dashed #eef2f7;padding-bottom:2px;overflow-wrap:anywhere}
.mut{color:#94a3b8;text-align:center}.tag{font-family:monospace;color:#1d4ed8}.crit{color:#b91c1c;font-weight:700}.foot{margin-top:14px;color:#94a3b8;font-size:9.5px;border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between}
.brk{break-before:page;page-break-before:always}
.no-print{position:fixed;top:10px;left:10px;z-index:5}.no-print button{font-family:inherit;padding:6px 14px;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}@media print{.no-print{display:none}.pg{padding:0;max-width:none}}section{break-inside:avoid}</style></head><body>
<div class="no-print"><button onclick="print()">طباعة / حفظ PDF</button></div><div class="pg">
<div class="top"><img src="${esc(S.settings.logo||NV_LOGO)}" alt=""><div><h1>${title}</h1><div class="sub">${esc(s.name)} · ${esc(appName())} · ${new Date().toLocaleDateString('ar-SA-u-ca-gregory',{year:'numeric',month:'long',day:'numeric'})}</div></div></div>
<section><h2>بيانات المبنى</h2>${bU?`<img class="bimg" src="${bU}" alt="صورة المبنى">`:''}<div class="grid">${[['اسم المبنى',s.name],...data].map(([l,v])=>`<div><span>${esc(l)}</span>${esc(v||'—')}</div>`).join('')}</div><div style="clear:both"></div></section>
<section><h2>ملخص الأصول</h2><div class="kpis">${[['سجلات الجرد المرسلة',nf(sub.length)],['إجمالي الوحدات',nf(Q(sub))],['القيمة التقديرية (ريال)',sar(V(sub))],['أصول حرجة',nf(Q(crit))],['تحتاج صيانة',nf(Q(weak))],['ملصقات مؤكدة',nf(sub.filter(c=>c.label_at).length)+' / '+nf(sub.length)]].map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div></section>
<div class="two"><section><h2>حسب الحالة الفنية</h2>${tbl(['الحالة','الكمية','النسبة',''],byCond.map(x=>`<tr><td>${esc(x.n)}</td><td class="num">${nf(x.q)}</td><td class="num">${pct(x.q)}%</td><td>${bar(pct(x.q),x.c)}</td></tr>`))}</section>
<section><h2>حسب الفئة الرئيسية</h2>${tbl(['الفئة','الكمية','القيمة (ريال)'],byCat.slice(0,12).map(x=>`<tr><td>${esc(x.n)}</td><td class="num">${nf(x.q)}</td><td class="num">${sar(x.v)}</td></tr>`))}</section></div>
<section><h2>أصول تحتاج صيانة${attn.length<weak.length?` (أهم ${attn.length} من ${weak.length})`:''}</h2>${tbl(['رقم الأصل','الأصل','الموقع','الحالة','الكمية','الأهمية'],attn.map(c=>`<tr><td class="tag">${esc(assetLabel(c)||'—')}</td><td>${esc(T(c).ar||'—')}</td><td>${esc(room(c)||'—')}</td><td>${esc(cond(c)||'—')}</td><td class="num">${nf(num(c.quantity))}</td><td class="${T(c).critical?'crit':''}">${T(c).critical?'حرج':'عادي'}</td></tr>`))}</section>
${!full&&pick.length?`<section style="break-inside:auto"><h2>صور الأصول والملصقات${pick.length<sub.length?` (أهم ${pick.length} — للكل اطبع التقرير الشامل)`:''}</h2><div class="cards">${pick.map(pcard).join('')}</div></section>`:''}
${full?`<h2 class="brk">سجل الأصول الكامل (${nf(list.length)})</h2><p class="mut" style="text-align:right">مرتبة حسب الدور ثم رقم الغرفة. QR كما يُطبع على الملصق.</p>${list.map(fcard).join('')||'<p class="mut">لا توجد أصول مرسلة.</p>'}`:''}
<div class="foot"><span>أُعد من ${esc(appName())} — بيانات الأصول المرسلة حتى ${ymdhms(new Date().toISOString())}</span><span>${esc(s.ident)}</span></div></div>
<script>window.onload=()=>Promise.race([document.fonts?document.fonts.ready:null,new Promise(r=>setTimeout(r,2500))]).then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
  w.document.open();w.document.write(html);w.document.close()}

/* ---- asset tables: thumbnail size (none / small / large) and row density, per user and browser */
const NV48V=()=>Object.assign({d:'normal',p:'s'},lsGet('nv48_view',{}));
function nv48ViewBar(){const v=NV48V();return `<span class="nv48-view" data-nv48-view><label>الصور<select data-nv48="p" aria-label="حجم صور الأصول">${[['0','بدون'],['s','صغيرة'],['l','كبيرة']].map(([k,l])=>`<option value="${k}" ${v.p===k?'selected':''}>${l}</option>`).join('')}</select></label><label>العرض<select data-nv48="d" aria-label="كثافة العرض">${[['normal','مريح'],['dense','مضغوط']].map(([k,l])=>`<option value="${k}" ${v.d===k?'selected':''}>${l}</option>`).join('')}</select></label></span>`}
function nv48Apply(sec){if(!sec)return;const v=NV48V();sec.classList.toggle('nv48-dense',v.d==='dense');sec.classList.toggle('nv48-p-l',v.p==='l');sec.classList.toggle('nv48-p-0',v.p==='0')}
function nv48Mount(again){const sec=$('section.i42');if(!sec)return;const head=sec.querySelector('.i42-head .i42-group');if(head&&!head.querySelector('[data-nv48-view]'))head.insertAdjacentHTML('afterbegin',nv48ViewBar());nv48Apply(sec);
  sec.querySelectorAll('[data-nv48]').forEach(el=>el.onchange=()=>{const v=NV48V();v[el.dataset.nv48]=el.value;lsSet('nv48_view',v);nv48Apply(sec);if(again)again()})}
{const _vc=vCollections;vCollections=function(){const r=_vc.apply(this,arguments);nv48Mount();return r}}
/* building page: a thumbnail in each asset row + the PDF report button */
{const _vb=vBuilding43;vBuilding43=function(sid){const r=_vb.apply(this,arguments);Promise.resolve(r).then(()=>{const sec=$('section.b43');if(!sec)return;
  const g=sec.querySelector('.b43-top .i42-group');if(g&&!g.querySelector('#b48-pdf'))g.insertAdjacentHTML('beforeend','<button id="b48-pdf"><i class="bi bi-file-earmark-pdf"></i> تقرير PDF للمبنى</button><button id="b48-full"><i class="bi bi-journal-richtext"></i> التقرير الشامل بكل الأصول</button>');
  const bp=$('#b48-pdf');if(bp)bp.onclick=()=>buildingReport48(sid);const bf=$('#b48-full');if(bf)bf.onclick=()=>buildingReport48(sid,true);
  const byId=new Map(S.collections.map(c=>[c.id,c]));sec.querySelectorAll('[data-b43-expand]').forEach(b=>{const c=byId.get(b.dataset.b43Expand);const cell=b.closest('td');if(!c||!c.asset_image||!cell||cell.querySelector('.b48-th'))return;
    b.insertAdjacentHTML('afterend',`<img class="i42-photo b48-th" data-photo="${esc(c.asset_image)}" alt="صورة الأصل" loading="lazy">`)});
  nv48Mount();hydratePhotos(sec)});return r}}
</script>
