<style id="nv52-css">
body.nv52{padding-bottom:0}
body.nv52>#app>header,body.nv52 header.nv52-h{position:sticky;top:0;z-index:40;gap:10px}
.nv52-burger{display:none;border:1px solid #dbe3ef;background:#fff;border-radius:10px;width:42px;height:42px;font-size:20px;line-height:1;color:#1e3a8a;cursor:pointer;flex:none}
.nv52-wrap{display:flex;flex:1 0 auto;align-items:stretch;min-width:0}
.nv52-side{width:250px;flex:none;background:#fff;border-inline-end:1px solid #e2e8f0;padding:14px 10px 24px;position:sticky;top:80px;align-self:flex-start;max-height:calc(100vh - 80px);overflow:auto}
.nv52-col{flex:1;min-width:0;display:flex;flex-direction:column}
.nv52-col>main{flex:1 0 auto}
.nv52-me{display:flex;align-items:center;gap:10px;padding:8px 10px 14px;border-bottom:1px solid #eef2f7;margin-bottom:10px}
.nv52-me i{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;flex:none}
.nv52-me b{display:block;font-size:14px;color:#0f172a;line-height:1.3}.nv52-me small{color:#64748b;font-size:12px}
.nv52-side a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;color:#334155;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:2px;cursor:pointer}
.nv52-side a:hover{background:#f1f5f9}.nv52-side a.on{background:#eff6ff;color:#1d4ed8}
.nv52-side a .ic{width:24px;text-align:center;font-size:17px;flex:none}
.nv52-side a .bd{margin-inline-start:auto;background:#ef4444;color:#fff;border-radius:999px;font-size:11px;padding:1px 7px;min-width:20px;text-align:center}
.nv52-side .sep{height:1px;background:#eef2f7;margin:10px 6px}
.nv52-side .grp{font-size:11px;color:#94a3b8;font-weight:700;padding:6px 12px 4px}
.nv52-bot{display:none}
.nv52-ov{display:none}
.nv52-warn{background:#fef2f2;color:#991b1b;border-bottom:1px solid #fecaca;padding:.5rem 1rem;font-size:.85rem;font-weight:700;text-align:center}
@media (max-width:1023px){
 .nv52-burger{display:inline-flex;align-items:center;justify-content:center}
 .nv52-side{position:fixed;top:0;bottom:0;inset-inline-start:0;max-height:none;height:100vh;z-index:70;transform:translateX(105%);transition:transform .2s ease;box-shadow:0 0 40px rgba(15,23,42,.25);width:280px}
 [dir=ltr] .nv52-side{transform:translateX(-105%)}
 body.nv52-open .nv52-side{transform:none}
 body.nv52-open .nv52-ov{display:block;position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:65}
 .nv52-bot{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:50;background:#fff;border-top:1px solid #e2e8f0;padding:4px 4px calc(4px + env(safe-area-inset-bottom));box-shadow:0 -6px 20px rgba(15,23,42,.06)}
 .nv52-bot a{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 2px;font-size:11px;font-weight:700;color:#475569;text-decoration:none;position:relative;cursor:pointer;border-radius:10px}
 .nv52-bot a .ic{font-size:19px;line-height:1.2}.nv52-bot a.on{color:#1d4ed8;background:#eff6ff}
 .nv52-bot a .bd{position:absolute;top:2px;inset-inline-end:18%;background:#ef4444;color:#fff;border-radius:999px;font-size:10px;padding:0 5px}
 body.nv52 .nv52-col>footer{padding-bottom:84px}
 body.nv52>#app>header{padding:10px 12px!important}
 body.nv52>#app>header h1{font-size:1rem}
 body.nv52>#app>header img{height:36px}
}
/* home + pages */
.h52{width:100%;max-width:960px;display:flex;flex-direction:column;gap:16px;text-align:right}
[dir=ltr] .h52{text-align:left}
.h52-card{background:#fff;border:1px solid #e8edf5;border-radius:18px;padding:16px 18px;box-shadow:0 8px 28px rgba(15,23,42,.05);position:relative}
.h52-card>h3{font-size:16px;font-weight:800;color:#0f172a;margin:0 0 10px;display:flex;align-items:center;gap:8px}
.h52-card>h3 a{margin-inline-start:auto;font-size:12px;color:#2563eb;font-weight:700;text-decoration:none}
.h52-hello{background:linear-gradient(135deg,#0f172a,#1e3a8a 60%,#4c1d95);color:#fff;border:0}
.h52-hello h2{font-size:20px;font-weight:800;margin:0}.h52-hello p{margin:4px 0 0;color:#cbd5e1;font-size:13px}
.h52-hello .st{display:inline-flex;align-items:center;gap:6px;margin-top:10px;background:rgba(255,255,255,.12);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700}
.h52-hello .st i{width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block}.h52-hello .st.off i{background:#f59e0b}
.h52-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.h52-btn{display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;text-decoration:none;background:#eff6ff;color:#1d4ed8;text-align:center}
.h52-btn.main{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 10px 24px rgba(37,99,235,.25)}
.h52-btn.go{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.h52-btn small{display:block;font-weight:600;font-size:11px;opacity:.85}
.h52-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.h52-kpi{background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:10px 12px}
.h52-kpi span{display:block;font-size:12px;color:#64748b;font-weight:700}.h52-kpi b{font-size:22px;color:#0f172a;font-weight:800}
.h52-bar{height:10px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin:10px 0 4px}.h52-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#0ea5e9,#2563eb)}
.h52-bar.done i{background:linear-gradient(90deg,#10b981,#16a34a)}
.h52-muted{color:#64748b;font-size:12px}
.h52-list{display:flex;flex-direction:column;gap:8px}
.h52-it{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #eef2f7;border-radius:14px;background:#fff;text-decoration:none;color:#0f172a;cursor:pointer;width:100%;text-align:inherit}
.h52-it:hover{border-color:#bfdbfe;background:#f8fbff}
.h52-it .ic{width:36px;height:36px;border-radius:10px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:17px;flex:none}
.h52-it .tx{flex:1;min-width:0}.h52-it .tx b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.h52-it .tx small{color:#64748b;font-size:12px;display:block}
.h52-it .n{font-weight:800;font-size:16px;color:#1d4ed8;flex:none}.h52-it .n.r{color:#dc2626}.h52-it .n.g{color:#16a34a}
.h52-it img{width:40px;height:40px;object-fit:cover;border-radius:10px;flex:none}
.h52-week{display:flex;align-items:flex-end;gap:8px;height:120px;padding-top:6px}
.h52-week div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px}
.h52-week i{display:block;width:100%;max-width:38px;background:linear-gradient(180deg,#60a5fa,#2563eb);border-radius:6px 6px 0 0;min-height:2px}
.h52-week div.t i{background:linear-gradient(180deg,#34d399,#059669)}
.h52-week b{font-size:12px;color:#0f172a}.h52-week small{font-size:11px;color:#64748b}
.h52-tabs{display:flex;gap:6px;flex-wrap:wrap}
.h52-tabs a{padding:8px 12px;border-radius:999px;background:#f1f5f9;color:#334155;font-weight:700;font-size:13px;text-decoration:none;cursor:pointer}
.h52-tabs a.on{background:#1d4ed8;color:#fff}
.h52-tabs a span{opacity:.8;margin-inline-start:4px}
.h52-row{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid #f1f5f9}
.h52-row:last-child{border-bottom:0}
.h52-row .tx{flex:1;min-width:0}.h52-row .tx b{font-size:14px;display:block}.h52-row .tx small{display:block;color:#64748b;font-size:12px}
.h52-row .mono{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#1e3a8a}
.h52-row button,.h52-row a.b{border:1px solid #dbe3ef;background:#fff;border-radius:10px;padding:6px 10px;font-weight:700;font-size:13px;cursor:pointer;color:#1d4ed8;text-decoration:none;white-space:nowrap}
.h52-row input[type=checkbox]{width:18px;height:18px;flex:none}
.h52-grp{font-weight:800;font-size:13px;color:#475569;background:#f8fafc;border-radius:10px;padding:6px 10px;margin-top:8px}
.h52-floor{margin-top:12px}.h52-floor>b{display:block;font-size:14px;margin-bottom:6px;color:#334155}
.h52-rooms{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.h52-room{border-radius:14px;padding:10px;border:2px solid #fde68a;background:#fffbeb;cursor:pointer;text-align:inherit;font:inherit}
.h52-room.done{border-color:#86efac;background:#f0fdf4}.h52-room.ready{border-color:#93c5fd;background:#eff6ff}.h52-room.sel{box-shadow:0 0 0 3px #1d4ed8}
.h52-room b{display:block;font-size:13px;color:#0f172a}.h52-room small{display:block;font-size:11px;color:#64748b}.h52-room em{font-style:normal;font-weight:800;font-size:15px}
.h52-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#475569}.h52-legend i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-inline-end:4px;vertical-align:-2px;border:2px solid}
.h52-q{width:100%;padding:11px 14px;border-radius:12px;border:1px solid #cbd5e1;font:inherit;outline:none}.h52-q:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.h52-empty{text-align:center;color:#64748b;padding:22px 10px;font-size:14px}
.h52-tbl{width:100%;border-collapse:collapse;font-size:13px}.h52-tbl th,.h52-tbl td{padding:8px 6px;border-bottom:1px solid #f1f5f9;text-align:inherit}.h52-tbl th{color:#64748b;font-size:12px}
</style>
<script id="nv-nv52">
/* NV52 — the field supervisor app gets a sidebar (bottom bar + drawer on phones), a Home page (#employee-data) and new pages:
   #buildings (my buildings), #bmap/<school> (floors → rooms map), #labels, #todo («needs action»), #account; history search; a warning
   when data stays un-uploaded for more than an hour. The layout of the existing pages is kept: fieldLayout is wrapped and the sidebar is
   placed around what it renders. */
const E52=()=>curEmp();
const mine52=()=>{const e=E52();return e?S.collections.filter(c=>c.employee_id===e.id):[]};
const sent52=()=>mine52().filter(c=>c.submitted_at&&c.type_id);
const tod52=()=>day51(new Date().toISOString());
const pct52=(a,b)=>b?Math.round(a/b*100):0;
const sName52=id=>(get('schools',id)||{}).name||id||'';
const tyName52=c=>{const t=get('types',c.type_id)||{};return lang()==='ar'?(t.ar||t.en||''):(t.en||t.ar||'')};
const loc52=c=>[c.zone,c.floor,roomName(c),c.room_number?'('+c.room_number+')':''].filter(Boolean).join(' · ');
const photoOk52=c=>c.exc_kind==='access'?!!c.exc_photo:!!c.asset_image;
/* things the supervisor should act on */
function todo52(){const e=E52();if(!e)return {ret:[],nophoto:[],draft:[],printed:[],fail:[],rready:[],rpart:[],pend:0,total:0};const M=mine52(),pr=printedSet();
  const ret=M.filter(c=>c.review_status==='returned');
  const nophoto=M.filter(c=>c.submitted_at&&c.type_id&&!photoOk52(c)&&c.review_status!=='returned');
  const draft=M.filter(c=>!c.submitted_at&&c.type_id&&!(get('schools',c.school_id)||{}).completed_at);
  const printed=M.filter(c=>c.submitted_at&&c.type_id&&pr.has(c.id)&&!labelOf(c));
  const fail=M.filter(c=>c.submitted_at&&c.type_id&&labelOf(c)&&labelOf(c).check==='fail');
  const rooms=rooms51(M).filter(r=>!r.done&&r.n>0&&!(get('schools',r.school_id)||{}).completed_at);
  const rready=rooms.filter(r=>r.pct>=100),rpart=rooms.filter(r=>r.pct<100);
  const pend=window.Cloud&&Cloud.on?Cloud.pendingCount():0;
  return {ret,nophoto,draft,printed,fail,rready,rpart,pend,total:ret.length+nophoto.length+draft.length+printed.length+rready.length+(pend?1:0)}}
/* buildings the supervisor works in */
function blds52(){const e=E52();if(!e)return [];const ids=new Set(mine52().map(c=>c.school_id));if(sess().school)ids.add(sess().school);
  return [...ids].map(id=>{const s=get('schools',id);if(!s)return null;const all=S.collections.filter(c=>c.school_id===id);const R=rooms51(all),A=all.filter(c=>c.submitted_at&&c.type_id);
    const ok=A.filter(c=>photoOk52(c)&&lbl51(c)).length,last=all.reduce((m,c)=>(c.updated_at||c.submitted_at||'')>m?(c.updated_at||c.submitted_at):m,'');
    return {s,id,n:A.length,mine:A.filter(c=>c.employee_id===e.id).length,rooms:R.length,done:R.filter(r=>r.done).length,ok,pct:pct52(ok,A.length),rpct:pct52(R.filter(r=>r.done).length,R.length),last,completed:!!s.completed_at}}).filter(Boolean)
    .sort((a,b)=>(a.completed-b.completed)||(a.last<b.last?1:-1))}
function resume52(){const e=E52();if(!e)return null;const M=mine52().filter(c=>!c.submitted_at&&!(get('schools',c.school_id)||{}).completed_at&&(get('schools',c.school_id)||{}).status!=='inactive');
  const cur=curColl();const d=cur&&!cur.submitted_at&&cur.employee_id===e.id?cur:M.sort((a,b)=>(a.updated_at||'')<(b.updated_at||'')?1:-1)[0];if(!d)return null;return d}
function goEdit52(c){setSess({school:c.school_id,coll:c.id});setFlash(t('You are now editing an existing collection.'));go('#location')}
function goResume52(d){setSess({school:d.school_id,coll:d.id});go(d.floor&&d.room_name_id?'#asset':'#location')}
/* a new asset in a given room of a building */
function addInRoom52(sid,r){const e=E52(),sc=get('schools',sid);if(!e||!sc)return;const blk=schoolBlock(sc,e.id);if(blk)return toast(blk,4500);
  const img=(S.collections.find(x=>x.school_id===sid&&x.employee_id===e.id&&x.school_image)||{}).school_image;if(!img){setSess({school:sid,coll:null});setFlash(tx('صوّر المبنى أولاً ثم تابع.','Photograph the building first.'));return go('#school')}
  const loc={floor:r.floor,room_number:r.room_number,room_name_id:r.room_name_id||null,zone:r.zone||null};
  let d=S.collections.find(x=>x.employee_id===e.id&&x.school_id===sid&&!x.submitted_at);
  if(d)Object.assign(d,blankAsset(),loc,{updated_at:now()});else{d=newCollection(e.id,sid,img,loc);S.collections.push(d)}
  save('collections');setSess({school:sid,coll:d.id,tq:[]});setFlash(t('New asset created in the same room.'));go('#asset')}

/* ---------- shell: sidebar + bottom bar ---------- */
const NAV52=()=>{const T=todo52().total;return [
  {h:'#employee-data',i:'🏠',l:tx('الرئيسية','Home'),m:/^#?(employee-data)?$/},
  {h:'#buildings',i:'🏫',l:tx('مبانيّ ومتابعة الجرد','My buildings'),m:/^#(buildings|bmap)/},
  {h:'#school',i:'➕',l:tx('جرد أصل جديد','Collect an asset'),m:/^#(school|location|asset|success)/,hide:Cloud.on&&!can('collect')},
  {scan:1,i:'📷',l:tx('مسح ملصق','Scan a label')},
  {h:'#todo',i:'⚠️',l:tx('ما يحتاج إجراء','Needs action'),m:/^#todo/,bd:T},
  {h:'#labels',i:'🏷️',l:tx('الملصقات','Labels'),m:/^#labels/},
  {h:'#history',i:'📋',l:tx('سجل أصولي','My assets'),m:/^#history/},
  {sep:1},
  {h:'#tasks',i:'✓',l:tx('مهامي','My tasks'),m:/^#tasks/},
  {h:'#inventory44',i:'▣',l:tx('دورات الجرد','Inventory cycles'),m:/^#inventory44/},
  {h:'#guide',i:'📖',l:tx('دليل المنصة','Platform guide'),m:/^#guide/,hide:!(window.docAllowed45&&docAllowed45('guide'))},
  {h:'#releases',i:'🧾',l:tx('الإصدارات والفحص','Releases'),m:/^#releases/,hide:!(window.docAllowed45&&docAllowed45('releases'))},
  {sep:1},
  {h:'#account',i:'⚙️',l:tx('حسابي','My account'),m:/^#account/},
  {out:1,i:'🚪',l:tx('تسجيل الخروج','Sign out')}]};
function side52(){const e=E52()||{},h=location.hash||'#';
  return `<aside class="nv52-side" id="nv52Side" aria-label="${tx('القائمة','Menu')}"><div class="nv52-me"><i>${esc(String(e.name||'?').trim().charAt(0))}</i><div><b>${esc(e.name)}</b><small>${tx('مشرف ميدان','Field supervisor')} · ${esc(e.number||'')}</small></div></div>
   ${NAV52().filter(x=>!x.hide).map(x=>x.sep?'<div class="sep"></div>':x.scan?`<a id="scanQR" data-scan52="1" title="${tx('مسح ملصق أصل','Scan an asset label')}"><span class="ic">${x.i}</span>${x.l}</a>`:x.out?`<a data-out52="1"><span class="ic">${x.i}</span>${x.l}</a>`
     :`<a href="${x.h}" data-nav52="${x.h}" class="${x.m&&x.m.test(h)?'on':''}"><span class="ic">${x.i}</span>${x.l}${x.bd?`<span class="bd" data-bd52>${x.bd}</span>`:''}</a>`).join('')}</aside>`}
function bot52(){const h=location.hash||'#',T=todo52().total;const it=(href,i,l,m,bd)=>`<a href="${href}" class="${m&&m.test(h)?'on':''}"><span class="ic">${i}</span>${l}${bd?`<span class="bd">${bd}</span>`:''}</a>`;
  return `<nav class="nv52-bot" aria-label="${tx('التنقل','Navigation')}">${it('#employee-data','🏠',tx('الرئيسية','Home'),/^#?(employee-data)?$/)}${Cloud.on&&!can('collect')?it('#buildings','🏫',tx('مبانيّ','Buildings'),/^#(buildings|bmap)/):it('#school','➕',tx('جرد','Collect'),/^#(school|location|asset|success)/)}<a data-scan52="1"><span class="ic">📷</span>${tx('مسح','Scan')}</a>${it('#todo','⚠️',tx('إجراءات','Actions'),/^#todo/,T)}<a data-menu52="1"><span class="ic">☰</span>${tx('المزيد','More')}</a></nav><div class="nv52-ov" data-menu52="0"></div>`}
function shell52(){const a=app();const hd=a&&a.querySelector(':scope>header');if(!hd||!E52()||document.body.classList.contains('nv-auth'))return;
  hd.classList.add('nv52-h');hd.querySelectorAll('.nv-scanbtn').forEach(x=>x.remove());
  hd.insertAdjacentHTML('afterbegin',`<button type="button" class="nv52-burger" data-menu52="1" aria-label="${tx('القائمة','Menu')}">☰</button>`);
  const wrap=document.createElement('div');wrap.className='nv52-wrap';wrap.innerHTML=side52();const col=document.createElement('div');col.className='nv52-col';
  [...a.children].filter(n=>n!==hd&&n.id!=='lb').forEach(n=>col.appendChild(n));wrap.appendChild(col);hd.after(wrap);
  if(warn52())col.insertAdjacentHTML('afterbegin',`<div class="nv52-warn" id="nv52Warn">${warn52()}</div>`);
  a.insertAdjacentHTML('beforeend',bot52());document.body.classList.add('nv52');document.body.classList.remove('nv52-open');doc52()}
/* the guide / releases links follow the NV45 grants: load them right after sign-in (not 30 s later) and redraw only the sidebar */
let doc52at='';
function doc52(){if(!Cloud.on||!Cloud.role||typeof refreshDocumentAccess45!=='function'||navigator.onLine===false)return;const k=Cloud.scope()+'|'+(Cloud.user&&Cloud.user.id||'');if(doc52at===k)return;doc52at=k;
  const before=JSON.stringify(Cloud.docAccess||{});refreshDocumentAccess45().then(()=>{if(JSON.stringify(Cloud.docAccess||{})===before)return;const sd=document.getElementById('nv52Side');if(sd)sd.outerHTML=side52()}).catch(()=>{doc52at=''})}
const _fieldLayout52=fieldLayout;
fieldLayout=function(inner){_fieldLayout52(inner);try{shell52()}catch(e){console.warn('nv52 shell',e)}};
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-menu52],[data-scan52],[data-out52],[data-nav52]');if(!t)return;
  if(t.dataset.menu52!=null){e.preventDefault();document.body.classList.toggle('nv52-open',t.dataset.menu52==='1'&&!document.body.classList.contains('nv52-open'));return}
  document.body.classList.remove('nv52-open');
  if(t.dataset.scan52){e.preventDefault();scanQR();return}
  if(t.dataset.out52){e.preventDefault();(async()=>{if(!await cloudLogoutOk())return;clearSess();go('#login')})()}});

/* ---------- un-uploaded data warning (more than an hour) ---------- */
const PK52=()=>'nv52_pend_since_'+(window.Cloud&&Cloud.on?Cloud.scope():'local');
function warn52(){if(!window.Cloud||!Cloud.on||Cloud.role!=='tech')return '';const s=+lsGet(PK52(),0);if(!s||Date.now()-s<36e5)return '';
  const h=Math.floor((Date.now()-s)/36e5);return `⚠️ ${tx(`توجد بيانات لم تُرفع منذ أكثر من ${h} ساعة. افتح الإنترنت ثم اضغط «إرسال الآن»، ولا تمسح بيانات المتصفح.`,`Some data has not been uploaded for more than ${h} h. Connect and press «Send now»; do not clear the browser data.`)}`}
if(typeof nvPendUI==='function'){const _pend52=nvPendUI;nvPendUI=async function(){await _pend52();const el=document.getElementById('nvPend');if(!el)return;
  const n=(+el.dataset.recs||0)+(+el.dataset.ph||0)+(window.labelQ?labelQ().length:0)+(window.RD?RD.q().length:0);
  if(n){if(!lsGet(PK52(),0))lsSet(PK52(),Date.now())}else lsSet(PK52(),0);
  const w=warn52(),box=document.getElementById('nv52Warn');if(w&&!box){const col=document.querySelector('.nv52-col');if(col)col.insertAdjacentHTML('afterbegin',`<div class="nv52-warn" id="nv52Warn">${w}</div>`);
    if(!window.__nv52Warned){window.__nv52Warned=1;toast(w,7000)}}else if(!w&&box)box.remove()}}

/* ---------- Home (#employee-data) ---------- */
function vEmployee(){
  if(!needEmp())return;const e=curEmp(),T=todo52(),day=tod52(),tgt=opsCfg().target,M=mine52(),A=sent52(),f0=takeFlash();
  const today=A.filter(c=>day51(c.submitted_at)===day),ph=today.reduce((n,c)=>n+[c.asset_image,c.asset_image2,c.exc_photo].filter(Boolean).length+(Array.isArray(c.extra_images)?c.extra_images.filter(Boolean).length:0),0);
  const lbT=A.filter(c=>{const L=labelOf(c);return L&&L.check!=='fail'&&day51(L.at)===day}).length;
  const rd=Object.values(RD.map()).concat(RD.q().filter(x=>x.done)).filter(x=>x.employee_id===e.id&&day51(x.done_at)===day);const rT=new Set(rd.map(x=>x.id)).size;
  const p=pct52(today.length,tgt),res=resume52(),B=blds52().filter(b=>!b.completed).slice(0,4),last=A.slice().sort((a,b)=>a.submitted_at<b.submitted_at?1:-1).slice(0,5);
  const week=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5);const k=day51(d.toISOString());return {k,n:A.filter(c=>day51(c.submitted_at)===k).length,l:d.toLocaleDateString(lang()==='ar'?'ar-SA-u-ca-gregory':'en-GB',{weekday:'short'})}});const wmax=Math.max(tgt,...week.map(w=>w.n),1);
  const on=navigator.onLine!==false,canC=!(Cloud.on&&(!can('collect')||(Cloud.sub&&Cloud.sub.ok===false)));
  const item=(ic,b,s,n,attr,cls)=>`<a class="h52-it" ${attr}><span class="ic">${ic}</span><span class="tx"><b>${b}</b>${s?`<small>${s}</small>`:''}</span>${n!=null?`<span class="n ${cls||''}">${n}</span>`:''}</a>`;
  const acts=[T.ret.length&&item('↩️',tx('أصول أعادتها الإدارة','Returned by the management'),tx('صحّحها وأعد إرسالها','Fix and resend'),T.ret.length,'href="#todo"','r'),
    T.nophoto.length&&item('📷',tx('أصول بلا صورة','Assets without a photo'),'',T.nophoto.length,'href="#todo"','r'),
    T.printed.length&&item('🏷️',tx('ملصقات طُبعت ولم يُؤكَّد لصقها','Printed labels not confirmed'),tx('صوّر الملصق على الأصل','Photograph the label on the asset'),T.printed.length,'href="#labels?t=printed"'),
    T.rready.length&&item('🚪',tx('غرف جاهزة لتعليمها مكتملة','Rooms ready to mark complete'),'',T.rready.length,'href="#todo"'),
    T.pend&&item('⏫',tx('بيانات بانتظار الرفع','Data waiting to upload'),'',T.pend,'href="#todo"')].filter(Boolean);
  fieldLayout(`<section id="screen-data" class="h52">
   <div class="h52-card h52-hello"><h2>${tx('أهلاً','Hello')}، ${esc(e.name)} 👋</h2><p>${tx('الرقم الوظيفي','Employee ID')} ${esc(e.number)} · ${new Date().toLocaleDateString(lang()==='ar'?'ar-SA-u-ca-gregory':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
    <span class="st ${on?'':'off'}"><i></i>${!Cloud.on?tx('يعمل على هذا الجهاز','Working on this device'):on?tx('متصل','Online'):tx('غير متصل — تُحفظ البيانات على الجوال','Offline — data is kept on the phone')}</span></div>
   ${f0?`<div class="nv-ret" id="empMsg"><b>${esc(f0.t)}</b></div>`:''}
   ${T.ret.length?`<div class="nv-ret" id="retBox"><b>↩️ ${tx('أصول أعادتها الإدارة للتعديل','Assets returned by the management')} (${T.ret.length})</b>${T.ret.map(x=>`<a href="javascript:void 0" data-ret="${esc(x.id)}"><span>${esc(tyName52(x))} — ${esc(sName52(x.school_id))} · ${esc(x.floor||'')} ${esc(roomName(x)||'')}</span><small>${esc(x.review_note||'')}</small></a>`).join('')}</div>`:''}
   <div class="h52-acts">${res?`<a href="javascript:void 0" id="homeResume" class="h52-btn go">▶ ${tx('متابعة من حيث توقفت','Continue where you stopped')}<small>${esc(sName52(res.school_id))}${loc52(res)?' · '+esc(loc52(res)):''}</small></a>`:''}
    ${canC?`<a href="#school" id="homeStart" class="h52-btn main">🏫 ${tx('بدء / متابعة جرد مبنى','Start / continue a building')}</a>`:`<span class="h52-btn" id="homeStart" style="opacity:.6;cursor:not-allowed">🔒 ${Cloud.sub&&Cloud.sub.ok===false?tx('انتهى الاشتراك','Subscription ended'):tx('لا توجد صلاحية جرد','No collect permission')}</span>`}
    <a href="javascript:void 0" data-scan52="1" class="h52-btn">📷 ${tx('مسح ملصق أصل','Scan an asset label')}</a></div>
   <div class="h52-card" id="h52Today" data-kpi="today" data-val="${today.length},${tgt},${ph},${lbT},${rT}"><h3>📊 ${tx('إنتاج اليوم','Today')}<a href="#account">${tx('ملخص الشهر','Month summary')} ›</a></h3>
    <div class="h52-kpis"><div class="h52-kpi"><span>${tx('الأصول / الهدف','Assets / target')}</span><b>${today.length}</b> <small class="h52-muted">/ ${tgt}</small></div><div class="h52-kpi"><span>${tx('الصور','Photos')}</span><b>${ph}</b></div><div class="h52-kpi"><span>${tx('ملصقات مؤكدة','Labels confirmed')}</span><b>${lbT}</b></div><div class="h52-kpi"><span>${tx('غرف مكتملة','Rooms complete')}</span><b>${rT}</b></div></div>
    <div class="h52-bar ${p>=100?'done':''}"><i style="width:${Math.min(100,p)}%"></i></div><div class="h52-muted">${p>=100?tx('🎉 بلغت الهدف اليومي','🎉 Daily target reached'):tx(`${p}% من الهدف اليومي — متبقٍ ${Math.max(0,tgt-today.length)} أصل`,`${p}% of the daily target — ${Math.max(0,tgt-today.length)} to go`)}</div></div>
   <div class="h52-card" id="h52Todo" data-kpi="todo" data-val="${T.total}"><h3>⚠️ ${tx('ما يحتاج إجراء','Needs action')}<a href="#todo">${tx('عرض الكل','View all')} ›</a></h3>
    ${acts.length?`<div class="h52-list">${acts.join('')}</div>`:`<div class="h52-empty">✅ ${tx('لا يوجد ما يحتاج إجراء الآن.','Nothing needs action now.')}</div>`}</div>
   <div class="h52-card" id="h52Blds"><h3>🏫 ${tx('مبانيّ','My buildings')}<a href="#buildings">${tx('عرض الكل','View all')} ›</a></h3>
    ${B.length?`<div class="h52-list">${B.map(b=>item('🏫',esc(b.s.name),`${b.n} ${tx('أصل','assets')} · ${tx('الغرف المكتملة','rooms complete')} ${b.done}/${b.rooms}`,b.rpct+'%',`href="#bmap/${encodeURIComponent(b.id)}"`)).join('')}</div>`:`<div class="h52-empty">${tx('لم تبدأ جرد أي مبنى بعد.','You have not started a building yet.')}</div>`}</div>
   <div class="h52-card"><h3>📈 ${tx('أداء آخر 7 أيام','Last 7 days')}</h3><div class="h52-week" data-kpi="week" data-val="${week.map(w=>w.n).join(',')}">${week.map(w=>`<div class="${w.k===day?'t':''}" title="${w.k}: ${w.n}"><b>${w.n}</b><i style="height:${Math.round(w.n/wmax*80)}%"></i><small>${esc(w.l)}</small></div>`).join('')}</div><div class="h52-muted">${tx('الهدف اليومي','Daily target')}: ${tgt}</div></div>
   <div class="h52-card"><h3>🕘 ${tx('آخر الأصول المسجلة','Latest assets')}<a href="#history">${tx('السجل','History')} ›</a></h3>
    ${last.length?`<div class="h52-list">${last.map(c=>`<a class="h52-it" data-ed52="${esc(c.id)}">${c.asset_image?img(c.asset_image,'',''):'<span class="ic">📦</span>'}<span class="tx"><b>${esc(tyName52(c))}</b><small>${esc(sName52(c.school_id))} · ${esc(loc52(c))} · ${ymd(c.submitted_at)} ${hiA(c.submitted_at)}</small></span><span class="n" style="font-size:12px">${lblReady(c)?esc(assetLabel(c)):'⏳'}</span></a>`).join('')}</div>`:`<div class="h52-empty">${t('No history found.')}</div>`}</div>
   ${Cloud.on?'':`<div class="h52-card"><h3>📤 ${tx('إرسال بياناتي','Send my data')}</h3><p class="h52-muted">${tx('ملف بكل ما سجلته على هذا الجهاز مع الصور، يرسل للمشرف ليدمجه','A file with everything you recorded on this device, for the admin to merge')}</p><a href="javascript:void 0" id="send" class="h52-btn" style="margin-top:8px">${tx('تنزيل الملف','Download file')}</a></div>`}
  </section>`);
  if($('#send'))$('#send').onclick=()=>exportPackage({kind:'employee',by:e.id});
  if($('#homeResume'))$('#homeResume').onclick=()=>goResume52(res);
  $$('[data-ret]').forEach(b=>b.onclick=()=>{const c=S.collections.find(x=>x.id===b.dataset.ret);if(c)goEdit52(c)});
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ed52]');if(!b)return;e.preventDefault();const c=S.collections.find(x=>x.id===b.dataset.ed52);if(!c)return;
  if(c.submitted_at&&(!can('edit_sent')||(Cloud.sub&&Cloud.sub.ok===false))&&c.review_status!=='returned')return toast(tx('لا تملك صلاحية تعديل أصل بعد إرساله.','You may not edit a sent asset.'),4000);goEdit52(c)});
const page52=(id,title,sub,body)=>fieldLayout(`<section id="${id}" class="h52"><div class="h52-card"><h3 style="font-size:19px;margin:0">${title}</h3>${sub?`<p class="h52-muted" style="margin:4px 0 0">${sub}</p>`:''}</div>${body}</section>`);

/* ---------- my buildings (#buildings) ---------- */
function vBuildings52(){if(!needEmp())return;const B=blds52();
  page52('screen-buildings',`🏫 ${tx('مبانيّ ومتابعة الجرد','My buildings')}`,tx('كل مبنى عملت فيه: نسبة الأصول المكتملة (صورة + ملصق) والغرف المكتملة. اضغط المبنى لفتح خريطة الطوابق والغرف.','Every building you worked in: complete assets (photo + label) and complete rooms. Open a building for its floors and rooms.'),
   `<div class="h52-card">${B.length?`<div class="h52-list" data-kpi="buildings" data-val="${B.length}">${B.map(b=>`<a class="h52-it" href="#bmap/${encodeURIComponent(b.id)}"><span class="ic">${b.completed?'✅':'🏫'}</span><span class="tx"><b>${esc(b.s.name)}</b><small>${esc(b.s.moe||b.s.ident||'')} · ${esc(b.s.city||'')} · ${b.n} ${tx('أصل','assets')} (${tx('منها لي','mine')} ${b.mine}) · ${tx('الغرف','rooms')} ${b.done}/${b.rooms} · ${tx('أصول مكتملة','complete assets')} ${b.pct}%${b.completed?' · '+tx('أُنهي الجرد','finished'):''}</small><span class="h52-bar ${b.rpct>=100?'done':''}" style="display:block;margin:6px 0 0"><i style="width:${b.rpct}%"></i></span></span><span class="n ${b.completed?'g':''}">${b.rpct}%</span></a>`).join('')}</div>`
     :`<div class="h52-empty">${tx('لم تبدأ جرد أي مبنى بعد.','You have not started a building yet.')}<br><a href="#school" class="h52-btn main" style="display:inline-flex;margin-top:12px">🏫 ${tx('ابدأ الآن','Start now')}</a></div>`}</div>`)}

/* ---------- building map: floors → rooms (#bmap/<id>) ---------- */
const BM52={sel:''};
function vBMap52(sid){if(!needEmp())return;const s=get('schools',sid);if(!s)return go('#buildings');const e=E52();
  if(Cloud.on&&!RD.at)RD.pull().then(ch=>{if(ch&&location.hash.startsWith('#bmap'))route()});
  const all=S.collections.filter(c=>c.school_id===sid),R=rooms51(all),open=!s.completed_at&&!schoolBlock(s,e.id);
  const floors=[];for(const r of R){let f=floors.find(x=>x.f===r.floor);if(!f){f={f:r.floor,rooms:[]};floors.push(f)}f.rooms.push(r)}
  floors.forEach(f=>f.rooms.sort((a,b)=>String(a.room_number||'').localeCompare(String(b.room_number||''),'ar',{numeric:true})));
  const st=r=>r.done?'done':r.pct>=100?'ready':'';const sel=R.find(r=>r.k===BM52.sel);
  const assets=sel?all.filter(c=>c.submitted_at&&c.type_id&&RD.key(c)===sel.k):[];
  const done=R.filter(r=>r.done).length;
  page52('screen-bmap',`🗺️ ${esc(s.name)}`,`${esc(s.moe||s.ident||'')} · ${esc(s.city||'')} ${esc(s.district||'')} · ${tx('الغرف المكتملة','complete rooms')} ${done}/${R.length}${s.completed_at?' · ✅ '+tx('أُنهي جرد المبنى','building finished'):''}`,
   `<div class="h52-card" data-kpi="bmap" data-val="${R.length},${done},${R.filter(r=>!r.done&&r.pct>=100).length}"><div class="h52-legend"><span><i style="border-color:#86efac;background:#f0fdf4"></i>${tx('مكتملة','Complete')}</span><span><i style="border-color:#93c5fd;background:#eff6ff"></i>${tx('جاهزة للتعليم (100%)','Ready to mark (100%)')}</span><span><i style="border-color:#fde68a;background:#fffbeb"></i>${tx('جارية','In progress')}</span></div>
    ${floors.length?floors.map(f=>`<div class="h52-floor"><b>🏢 ${esc(f.f)} <small class="h52-muted">(${f.rooms.length} ${tx('غرفة','rooms')})</small></b><div class="h52-rooms">${f.rooms.map(r=>`<button type="button" class="h52-room ${st(r)} ${r.k===BM52.sel?'sel':''}" data-room52="${esc(r.k)}"><b>${esc(roomName51(r)||tx('غرفة','Room'))}</b>${r.zone?`<small>${esc(r.zone)}</small>`:''}<em>${r.closed?tx('مغلقة','Closed'):r.pct+'%'}</em><small>${r.n} ${tx('أصل','assets')}${r.done?' · ✅':''}</small></button>`).join('')}</div></div>`).join('')
      :`<div class="h52-empty">${tx('لا توجد غرف مسجلة في هذا المبنى بعد.','No rooms recorded in this building yet.')}</div>`}
    ${open?`<div class="h52-acts" style="margin-top:14px"><a href="javascript:void 0" id="bmNew" class="h52-btn main">➕ ${tx('غرفة جديدة في هذا المبنى','A new room in this building')}</a></div>`:''}</div>
   ${sel?`<div class="h52-card" id="bmRoom"><h3>🚪 ${esc([sel.zone,sel.floor,roomName51(sel)].filter(Boolean).join(' · '))}<span class="n" style="margin-inline-start:auto;color:#1d4ed8">${sel.pct}%</span></h3>
     <div class="h52-muted">${tx('الصور','Photos')} ${sel.photo}/${sel.n} · ${tx('الملصقات','Labels')} ${sel.label}/${sel.n}${sel.exc?' · '+tx('استثناءات','exceptions')+' '+sel.exc:''}${sel.mark?' · ✅ '+tx('مكتملة','complete')+' '+ymd(sel.mark.done_at):''}</div>
     <div style="margin-top:8px">${assets.map(c=>{const L=labelOf(c);return `<div class="h52-row">${c.asset_image?img(c.asset_image,'','').replace('<img','<img style="width:40px;height:40px;object-fit:cover;border-radius:8px"'):'<span>📦</span>'}<span class="tx"><b>${esc(tyName52(c))}${c.quantity>1?' ×'+esc(c.quantity):''}</b><small><span class="mono">${lblReady(c)?esc(assetLabel(c)):'⏳'}</span> · ${photoOk52(c)?'📷✓':'📷✗'} · ${L?(L.check==='fail'?'🏷️⚠️':'🏷️✓'):'🏷️✗'}${hasExc(c)?' · ⚠️ '+esc(excText(c)):''}</small></span>${c.employee_id===e.id?`<a class="b" data-ed52="${esc(c.id)}">${t('Edit')}</a>`:''}${lblReady(c)?`<button type="button" data-pl52="${esc(c.id)}" title="${tx('طباعة الملصق','Print the label')}">🖨️</button>${L?'':`<button type="button" data-lc="${esc(c.id)}" title="${tx('تأكيد اللصق','Confirm the label')}">📸</button>`}`:''}</div>`}).join('')||`<div class="h52-empty">${tx('لا أصول في هذه الغرفة.','No assets in this room.')}</div>`}</div>
     <div class="h52-acts" style="margin-top:12px">${open&&!sel.closed?`<a href="javascript:void 0" id="bmAdd" class="h52-btn main">➕ ${tx('أصل في هذه الغرفة','An asset in this room')}</a>`:''}${sel.closed?'':sel.mark?`<a href="javascript:void 0" data-mark52="0" class="h52-btn">↩️ ${tx('إعادة فتح الغرفة','Reopen the room')}</a>`:`<a href="javascript:void 0" data-mark52="1" class="h52-btn go">✅ ${tx('تعليم الغرفة مكتملة','Mark the room complete')}</a>`}</div></div>`:''}`);
  $$('[data-room52]').forEach(b=>b.onclick=()=>{BM52.sel=BM52.sel===b.dataset.room52?'':b.dataset.room52;route();setTimeout(()=>{const x=$('#bmRoom');if(x)x.scrollIntoView({behavior:'smooth',block:'start'})},60)});
  if($('#bmNew'))$('#bmNew').onclick=()=>{setSess({school:sid,coll:null,tq:[]});go('#school')};
  if($('#bmAdd'))$('#bmAdd').onclick=()=>addInRoom52(sid,sel);
  $$('[data-mark52]').forEach(b=>b.onclick=()=>{const c=all.find(x=>RD.key(x)===sel.k);if(!c)return;if(b.dataset.mark52==='1'&&sel.pct<100&&!confirm(tx(`إنجاز الغرفة ${sel.pct}%: بعض الأصول بلا صورة أو بلا ملصق مؤكد.\nتعليمها مكتملة رغم ذلك؟`,`Room progress ${sel.pct}%. Mark it complete anyway?`)))return;
    RD.mark(c,b.dataset.mark52==='1');toast(b.dataset.mark52==='1'?tx('✓ عُلّمت الغرفة مكتملة.','✓ Room marked complete.'):tx('أُعيد فتح الغرفة.','Room reopened.'));setTimeout(route,50)});
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pl52]');if(!b)return;e.preventDefault();const c=S.collections.find(x=>x.id===b.dataset.pl52);if(c)fieldPrint([c],assetLabel(c)).then(()=>setTimeout(()=>{if(!/^#(success|history)/.test(location.hash))route()},700))});

/* ---------- labels (#labels?t=todo|printed|fail|ok) ---------- */
function vLabels52(){if(!needEmp())return;const q=qp(),tab=['todo','printed','fail','ok'].includes(q.get('t'))?q.get('t'):'todo';const A=sent52(),pr=printedSet();
  const G={todo:A.filter(c=>lblReady(c)&&!pr.has(c.id)),printed:A.filter(c=>pr.has(c.id)&&!labelOf(c)),fail:A.filter(c=>labelOf(c)&&labelOf(c).check==='fail'),ok:A.filter(c=>labelOf(c)&&labelOf(c).check!=='fail')};
  const wait=A.filter(c=>!lblReady(c)).length,L=G[tab].slice().sort((a,b)=>(sName52(a.school_id)+a.floor+RD.key(a)).localeCompare(sName52(b.school_id)+b.floor+RD.key(b),'ar'));
  const names={todo:tx('لم تُطبع','Not printed'),printed:tx('طُبعت ولم تُؤكَّد','Printed, not confirmed'),fail:tx('تعذّر اللصق','Could not stick'),ok:tx('مؤكدة','Confirmed')};
  let grp='';const rows=L.map(c=>{const g=sName52(c.school_id)+' — '+[c.floor,roomName(c)].filter(Boolean).join(' · ');const h=g!==grp?`<div class="h52-grp">${esc(g)}</div>`:'';grp=g;const Lb=labelOf(c);
    return h+`<div class="h52-row">${tab==='todo'?`<input type="checkbox" data-sel52="${esc(c.id)}" checked>`:''}<span class="tx"><b>${esc(tyName52(c))}</b><small><span class="mono">${esc(assetLabel(c))}</span>${c.serial?' · '+esc(c.serial):''}${tab==='fail'&&Lb?' · '+esc(Lb.note||''):''}</small></span><button type="button" data-pl52="${esc(c.id)}" title="${tx('طباعة','Print')}">🖨️</button>${tab==='printed'||tab==='fail'?`<button type="button" data-lc="${esc(c.id)}">📸 ${tx('تأكيد','Confirm')}</button>`:''}</div>`}).join('');
  page52('screen-labels',`🏷️ ${tx('الملصقات','Labels')}`,tx('اطبع ملصقات أصولك، ثم صوّر كل ملصق على أصله لتأكيد لصقه.','Print your asset labels, then photograph each label on its asset to confirm it.'),
   `<div class="h52-card"><div class="h52-tabs" data-kpi="labels52" data-val="${G.todo.length},${G.printed.length},${G.fail.length},${G.ok.length}">${Object.keys(G).map(k=>`<a href="#labels?t=${k}" class="${k===tab?'on':''}">${names[k]}<span>(${G[k].length})</span></a>`).join('')}</div>
    ${wait?`<p class="h52-muted" style="margin:10px 0 0">⏳ ${tx(`${wait} أصل ينتظر الرفع ليأخذ رقمه، ثم يظهر هنا.`,`${wait} assets wait for the upload to get their number.`)}</p>`:''}
    ${tab==='todo'&&L.length?`<div class="h52-acts" style="margin-top:12px"><a href="javascript:void 0" id="lbAll" class="h52-btn main">🖨️ ${tx('طباعة المحدد','Print selected')} (<span id="lbN">${L.length}</span>)</a></div>`:''}
    ${tab==='printed'&&L.length?`<p class="h52-muted" style="margin:10px 0 0">📸 ${tx('اضغط «تأكيد» والتقط صورة للملصق على الأصل؛ يُقرأ رمز QR ويُطابق مع رقم الأصل.','Press «Confirm» and photograph the label on the asset; the QR is read and matched.')}</p>`:''}
    <div style="margin-top:8px">${rows||`<div class="h52-empty">${tab==='todo'?tx('✅ لا توجد ملصقات تنتظر الطباعة.','✅ No labels waiting to print.'):tx('لا شيء هنا.','Nothing here.')}</div>`}</div></div>`);
  const upd=()=>{const n=$$('[data-sel52]').filter(x=>x.checked).length;if($('#lbN'))$('#lbN').textContent=n};$$('[data-sel52]').forEach(x=>x.onchange=upd);
  if($('#lbAll'))$('#lbAll').onclick=()=>{const ids=new Set($$('[data-sel52]').filter(x=>x.checked).map(x=>x.dataset.sel52));const P=L.filter(c=>ids.has(c.id));if(!P.length)return toast(tx('اختر ملصقاً واحداً على الأقل.','Pick at least one label.'));fieldPrint(P,'').then(()=>setTimeout(route,700))}}

/* ---------- needs action (#todo) ---------- */
function vTodo52(){if(!needEmp())return;const T=todo52();
  const sec=(id,ic,title,list,row)=>list.length?`<div class="h52-card" data-todo52="${id}" data-val="${list.length}"><h3>${ic} ${title} <span class="h52-muted">(${list.length})</span></h3><div>${list.map(row).join('')}</div></div>`:'';
  const aRow=(btn)=>c=>`<div class="h52-row">${c.asset_image?img(c.asset_image,'','').replace('<img','<img style="width:40px;height:40px;object-fit:cover;border-radius:8px"'):'<span>📦</span>'}<span class="tx"><b>${esc(tyName52(c))}</b><small>${esc(sName52(c.school_id))} · ${esc(loc52(c))}${c.review_note&&c.review_status==='returned'?' · 📝 '+esc(c.review_note):''}</small></span>${btn(c)}</div>`;
  const edit=c=>`<a class="b" data-ed52="${esc(c.id)}">${t('Edit')}</a>`;
  const rRow=r=>`<div class="h52-row"><span class="tx"><b>🚪 ${esc([r.zone,r.floor,roomName51(r)].filter(Boolean).join(' · '))}</b><small>${esc(sName52(r.school_id))} · ${r.n} ${tx('أصل','assets')} · ${tx('الصور','photos')} ${r.photo}/${r.n} · ${tx('الملصقات','labels')} ${r.label}/${r.n}</small></span><b style="color:#1d4ed8">${r.pct}%</b>${r.pct>=100?`<button type="button" data-rk52="${esc(r.k)}">✅ ${tx('تعليمها مكتملة','Mark complete')}</button>`:''}<a class="b" href="#bmap/${encodeURIComponent(r.school_id)}" data-room-open="${esc(r.k)}">${tx('فتح','Open')}</a></div>`;
  const body=[T.pend?`<div class="h52-card" data-todo52="pend" data-val="${T.pend}"><h3>⏫ ${tx('بيانات بانتظار الرفع','Data waiting to upload')} <span class="h52-muted">(${T.pend})</span></h3><p class="h52-muted">${tx('لا تمسح بيانات المتصفح قبل اكتمال الرفع.','Do not clear the browser data before the upload finishes.')}</p><div class="h52-acts" style="margin-top:8px"><a href="javascript:void 0" id="tdSend" class="h52-btn main">⏫ ${tx('إرسال الآن','Send now')}</a></div></div>`:'',
    sec('ret','↩️',tx('أصول أعادتها الإدارة','Returned by the management'),T.ret,aRow(edit)),
    sec('draft','📝',tx('أصل بدأته ولم تحفظه','An asset started but not saved'),T.draft,aRow(c=>`<a class="b" data-res52="${esc(c.id)}">${tx('متابعة','Continue')}</a>`)),
    sec('nophoto','📷',tx('أصول بلا صورة','Assets without a photo'),T.nophoto,aRow(edit)),
    sec('printed','🏷️',tx('ملصقات طُبعت ولم يُؤكَّد لصقها','Printed labels not confirmed'),T.printed,aRow(c=>`<button type="button" data-lc="${esc(c.id)}">📸 ${tx('تأكيد','Confirm')}</button>`)),
    sec('rready','✅',tx('غرف جاهزة لتعليمها مكتملة','Rooms ready to mark complete'),T.rready,rRow),
    sec('rpart','🚪',tx('غرف غير مكتملة','Rooms not complete'),T.rpart,rRow),
    sec('fail','⚠️',tx('ملصقات تعذّر لصقها (استثناء مسجل)','Labels that could not be stuck (exception recorded)'),T.fail,aRow(c=>`<button type="button" data-lc="${esc(c.id)}">📸 ${tx('لصقته الآن','Stuck now')}</button>`))].join('');
  page52('screen-todo',`⚠️ ${tx('ما يحتاج إجراء','Needs action')}`,tx('كل ما ينقص عملك في قائمة واحدة؛ كل بند يفتح مكانه مباشرة.','Everything your work is missing in one list; each item opens its place.'),
   body||`<div class="h52-card"><div class="h52-empty" data-todo52="none">✅ ${tx('لا يوجد ما يحتاج إجراء الآن. عمل ممتاز!','Nothing needs action now. Well done!')}</div></div>`);
  if($('#tdSend'))$('#tdSend').onclick=async()=>{toast(tx('جارٍ الرفع…','Uploading…'));try{await Cloud.sync();if(window.flushLabels)await flushLabels();await RD.flush()}catch(e){toast(e.message,5000)}route()};
  $$('[data-res52]').forEach(b=>b.onclick=()=>{const c=S.collections.find(x=>x.id===b.dataset.res52);if(c)goResume52(c)});
  $$('[data-room-open]').forEach(b=>b.onclick=()=>{BM52.sel=b.dataset.roomOpen});
  $$('[data-rk52]').forEach(b=>b.onclick=()=>{const c=mine52().find(x=>RD.key(x)===b.dataset.rk52);if(!c)return;RD.mark(c,true);toast(tx('✓ عُلّمت الغرفة مكتملة.','✓ Room marked complete.'));setTimeout(route,50)})}

/* ---------- account (#account) ---------- */
async function vAccount52(){if(!needEmp())return;const e=E52(),A=sent52();
  const months=[...Array(6)].map((_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')});
  const mo=k=>{const L=A.filter(c=>(c.submitted_at||'').slice(0,7)===k);const rd=Object.values(RD.map()).filter(x=>x.employee_id===e.id&&(x.done_at||'').slice(0,7)===k).length;
    return {k,n:L.length,u:L.reduce((s,c)=>s+(+c.quantity||1),0),b:new Set(L.map(c=>c.school_id)).size,l:A.filter(c=>{const x=labelOf(c);return x&&x.check!=='fail'&&(x.at||'').slice(0,7)===k}).length,x:L.filter(hasExc).length,r:rd,fin:S.schools.filter(s=>s.completed_by===e.id&&(s.completed_at||'').slice(0,7)===k).length}};
  const R=months.map(mo),email=Cloud.user&&Cloud.user.email&&!/novaro\.local$/.test(Cloud.user.email)?Cloud.user.email:(e.email||'');
  let ph=0,phAll=0;try{const k=await IDB.keys('photos');phAll=k.length;ph=Cloud.on?k.filter(x=>!Cloud.uploaded.has(x)).length:k.length}catch(er){}
  const pend=(Cloud.on?Cloud.pendingCount():0)+(Cloud.on?ph:0)+labelQ().length+RD.q().length;
  const P=[['collect',tx('جرد أصول جديدة','Collect new assets')],['edit_sent',tx('تعديل أصل بعد إرساله','Edit a sent asset')],['finish',tx('إنهاء جرد مبنى','Finish a building')],['gallery',tx('الصور من المعرض','Photos from the gallery')],['extra',tx('صور إضافية','Extra photos')]];
  page52('screen-account',`⚙️ ${tx('حسابي','My account')}`,'',
   `<div class="h52-card"><h3>👤 ${tx('بياناتي','My details')}</h3><table class="h52-tbl"><tr><th>${t('Full Name')}</th><td>${esc(e.name)}</td></tr><tr><th>${t('Employee ID')}</th><td>${esc(e.number)}</td></tr>${email?`<tr><th>${tx('البريد','E-mail')}</th><td dir="ltr">${esc(email)}</td></tr>`:''}<tr><th>${tx('الصلاحيات','Permissions')}</th><td>${P.map(([k,l])=>`${can(k)?'✅':'⛔'} ${l}`).join('<br>')}</td></tr></table></div>
   <div class="h52-card"><h3>📅 ${tx('ملخص إنتاجي الشهري','My monthly summary')}</h3><div style="overflow-x:auto"><table class="h52-tbl" data-kpi="months" data-val="${R.map(r=>r.n).join(',')}"><thead><tr><th>${tx('الشهر','Month')}</th><th>${tx('الأصول','Assets')}</th><th>${tx('الكمية','Qty')}</th><th>${tx('المباني','Buildings')}</th><th>${tx('مبانٍ أنهيتها','Finished')}</th><th>${tx('ملصقات مؤكدة','Labels')}</th><th>${tx('غرف مكتملة','Rooms')}</th><th>${tx('استثناءات','Exceptions')}</th></tr></thead><tbody>${R.map(r=>`<tr><td>${r.k}</td><td><b>${r.n}</b></td><td>${r.u}</td><td>${r.b}</td><td>${r.fin}</td><td>${r.l}</td><td>${r.r}</td><td>${r.x}</td></tr>`).join('')}</tbody></table></div></div>
   <div class="h52-card"><h3>🌐 ${tx('اللغة وكلمة المرور','Language and password')}</h3><div class="h52-acts"><a href="javascript:void 0" id="acLang" class="h52-btn">${lang()==='ar'?'English':'العربية'}</a>${Cloud.on?`<a href="#reset-password" class="h52-btn">🔑 ${tx('تغيير كلمة المرور','Change password')}</a>`:''}</div></div>
   <div class="h52-card" id="acDev" data-pend="${pend}"><h3>📱 ${tx('بيانات هذا الجهاز','This device')}</h3><p class="h52-muted">${tx('الصور المحفوظة على الجهاز','Photos kept on this device')}: <b>${phAll}</b>${Cloud.on?` · ${tx('غير مرفوعة','not uploaded')}: <b>${ph}</b> · ${tx('سجلات وعمليات بانتظار الرفع','records and actions waiting')}: <b>${pend-ph}</b>`:''}</p>
    ${!Cloud.on?`<p class="h52-muted">${tx('هذا الجهاز هو مكان حفظ بياناتك الوحيد؛ أرسل الملف من الرئيسية قبل أي مسح.','This device is the only copy of your data; send the file from Home before clearing anything.')}</p>`
      :pend?`<p class="h52-muted" style="color:#b45309">⏫ ${tx('لا يمكن تفريغ الجهاز قبل رفع كل شيء.','The device cannot be cleared before everything is uploaded.')}</p><div class="h52-acts" style="margin-top:8px"><a href="javascript:void 0" id="acSend" class="h52-btn main">⏫ ${tx('إرسال الآن','Send now')}</a></div>`
      :`<p class="h52-muted">✅ ${tx('كل بياناتك وصورك مرفوعة. يمكنك حذف نسخ الصور من الجهاز لتوفير المساحة، وتبقى محفوظة على الخادم.','Everything is uploaded. You can delete the photo copies on this device to free space; they stay on the server.')}</p><div class="h52-acts" style="margin-top:8px"><a href="javascript:void 0" id="acClear" class="h52-btn">🧹 ${tx('تفريغ الصور من الجهاز وتسجيل الخروج','Clear photos and sign out')}</a></div>`}</div>
   <div class="h52-acts"><a href="javascript:void 0" data-out52="1" class="h52-btn">🚪 ${tx('تسجيل الخروج','Sign out')}</a></div>`);
  $('#acLang').onclick=()=>{lsSet('nv_lang',lang()==='ar'?'en':'ar');route()};
  if($('#acSend'))$('#acSend').onclick=async()=>{toast(tx('جارٍ الرفع…','Uploading…'));try{await Cloud.sync();if(window.flushLabels)await flushLabels();await RD.flush()}catch(er){toast(er.message,5000)}route()};
  if($('#acClear'))$('#acClear').onclick=async()=>{try{await Cloud.sync()}catch(er){}if(Cloud.pendingCount()||labelQ().length||RD.q().length)return toast(tx('ما زالت هناك بيانات بانتظار الرفع.','Data is still waiting to upload.'),4000);
    const k=await IDB.keys('photos');if(k.some(x=>!Cloud.uploaded.has(x)))return toast(tx('بعض الصور لم تُرفع بعد.','Some photos are not uploaded yet.'),4000);
    if(!confirm(tx(`حذف ${k.length} صورة من هذا الجهاز ثم تسجيل الخروج؟ تبقى الصور على الخادم.`,`Delete ${k.length} photos from this device and sign out? They stay on the server.`)))return;
    if(!await cloudLogoutOk())return;try{await IDB.clear('photos')}catch(er){}clearSess();toast(tx('تم تفريغ الجهاز.','Device cleared.'));go('#login')}}

/* ---------- history: quick search ---------- */
const _vHistory52=vHistory;
vHistory=function(){_vHistory52();const tb=document.querySelector('#screen-history tbody');if(!tb)return;
  for(const tr of tb.querySelectorAll('tr')){const id=(tr.querySelector('[data-ed],[data-pl],[data-lc]')||{dataset:{}}).dataset;const c=S.collections.find(x=>x.id===(id.ed||id.pl||id.lc));
    tr.dataset.s=norm([tr.textContent,c&&lblReady(c)?assetLabel(c):'',c&&c.serial,c&&c.brand,c&&c.model,c&&c.zone].filter(Boolean).join(' '))}
  const box=document.querySelector('#screen-history .flex.flex-col');if(box)box.insertAdjacentHTML('afterend',`<input type="search" id="hq52" class="h52-q" style="margin-bottom:14px" placeholder="${tx('ابحث برقم الأصل أو الرقم التسلسلي أو النوع أو المبنى…','Search by Tag Number, serial, type or building…')}"><p id="hq52n" class="h52-muted" style="margin:-8px 0 10px"></p>`);
  const q=$('#hq52');if(q)q.oninput=()=>{const v=norm(q.value.trim());let n=0;for(const tr of tb.querySelectorAll('tr')){const ok=!v||tr.dataset.s.includes(v);tr.style.display=ok?'':'none';if(ok)n++}$('#hq52n').textContent=v?tx(`${n} نتيجة`,`${n} results`):''}};
</script>
