<style id="nv51-css">
.nv-exc{margin-top:14px;border:1px dashed #f59e0b;border-radius:14px;padding:10px 12px;background:#fffbeb}
.nv-exc-t{display:flex;align-items:center;gap:8px;font-weight:700;color:#92400e;cursor:pointer;font-size:14px}.nv-exc-t input{width:18px;height:18px}
.nv-exc-b{display:none;margin-top:8px}.nv-exc.on .nv-exc-b{display:block}.nv-exc-b p{font-size:12px;color:#78350f;margin:0 0 8px}
.nv-src input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.nv-lf{margin-top:10px;font-size:13px}.nv-lf summary{cursor:pointer;color:#b45309;font-weight:700}.nv-lf small{display:block;color:#64748b;margin-top:4px}
.nv-room{margin:14px 0;text-align:right;border:1px solid #dbe3ef;border-radius:14px;padding:12px 14px;background:#f8fafc}
.nv-room-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.nv-room-h b{font-size:15px}.nv-room-pct{font-weight:800;color:#1d4ed8;font-size:18px}
.nv-room-bar{height:8px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin:6px 0}.nv-room-bar i{display:block;height:100%;background:linear-gradient(90deg,#0ea5e9,#2563eb);border-radius:6px}
.nv-room small{color:#475569;font-size:12px;display:block}.nv-room-done{margin-top:8px;color:#15803d;font-weight:700;font-size:13px}
.nv-room-btn{margin-top:10px;width:100%;border:0;border-radius:12px;padding:11px;background:#16a34a;color:#fff;font-weight:700;cursor:pointer}.nv-room a{font-size:12px;color:#64748b;text-decoration:underline;cursor:pointer}
.p51-bar{display:inline-block;width:90px;height:8px;background:var(--bs-secondary-bg,#eef2f7);border-radius:5px;overflow:hidden;vertical-align:middle;margin-inline-start:6px}.p51-bar i{display:block;height:100%;border-radius:5px}
.p51-tabs{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.75rem}.p51-tabs a{padding:.35rem .9rem;border-radius:999px;border:1px solid var(--bs-border-color,#dbe3ef);text-decoration:none;color:inherit;font-size:.9rem}.p51-tabs a.on{background:#2563eb;border-color:#2563eb;color:#fff}
.p51-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem;margin-bottom:.8rem}.p51-k div{border:1px solid var(--bs-border-color,#e2e8f0);border-radius:12px;padding:.55rem .8rem;background:var(--bs-body-bg,#fff)}.p51-k span{display:block;font-size:.78rem;color:var(--bs-secondary-color,#64748b)}.p51-k b{font-size:1.35rem}
.p51 table td,.p51 table th{vertical-align:middle;white-space:nowrap}.p51 .num{font-variant-numeric:tabular-nums}.p51 .ok{color:#15803d;font-weight:700}.p51 .bad{color:#b91c1c;font-weight:700}
.x51-th{width:56px;height:56px;object-fit:cover;border-radius:8px;cursor:zoom-in;background:var(--bs-secondary-bg,#f1f5f9)}
</style>
<script id="nv51">
/* NV51 — field operations: exceptions log, daily production, room completion, zone field, barcode on the label */

/* ---- Code 128 barcode as SVG (set C for digit pairs, set B for the rest) */
const C128='212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
function code128Codes(text){text=String(text).replace(/[^\x20-\x7e]/g,'');const out=[];let i=0,set=null;
  const digits=k=>{let n=0;while(k+n<text.length&&/\d/.test(text[k+n]))n++;return n};
  while(i<text.length){const d=digits(i);
    if(d>=4||(d>=2&&d===text.length-i&&d%2===0)){const pairs=Math.floor(d/2);if(set!=='C'){out.push(set?99:105);set='C'}for(let p=0;p<pairs;p++){out.push(+text.substr(i,2));i+=2}}
    else{if(set!=='B'){out.push(set?100:104);set='B'}out.push(text.charCodeAt(i)-32);i++}}
  let sum=out[0];for(let k=1;k<out.length;k++)sum+=out[k]*k;out.push(sum%103,106);return out}
function code128Svg(text){const codes=code128Codes(text);const q=10;let x=q,bars='';
  for(const v of codes){const w=C128[v];for(let k=0;k<w.length;k++){const n=+w[k];if(k%2===0)bars+=`<rect x="${x}" y="0" width="${n}" height="40"/>`;x+=n}}
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x+q} 40" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="${esc(text)}"><rect width="${x+q}" height="40" fill="#fff"/><g fill="#000">${bars}</g></svg>`}

/* ---- zone / department of a location (field location form) */
function zoneField51(c){const O=opsCfg();if(!O.zone.on&&!c.zone)return '';
  const used=[...new Set(S.collections.filter(x=>x.school_id===c.school_id&&x.zone).map(x=>x.zone))].sort((a,b)=>a.localeCompare(b,'ar'));
  return `<div><label for="zone" class="block text-sm font-medium text-gray-700 mb-1">${esc(O.zone.l)} <span class="text-gray-500 font-normal">(${tx('اختياري','optional')})</span></label>
   <input id="zone" list="zoneL" maxlength="120" class="${INPUT}" value="${esc(c.zone||'')}" placeholder="${esc(tx('مثال: الجناح الشرقي / قسم الإدارة','e.g. East wing / Admin department'))}"><datalist id="zoneL">${used.map(z=>`<option value="${esc(z)}">`).join('')}</datalist></div>`}

/* ---- exceptions */
const EXC_ACCESS=['مقفل / لا يوجد مفتاح','مرتفع — يحتاج سلّماً أو رافعة','منطقة خطرة أو قيد التشغيل','رفض إدارة الموقع','الأصل خلف عائق أو مغطّى'];
const EXC_LABEL=['السطح غير مناسب (خشن / رطب / ساخن)','لا يمكن الوصول لمكان اللصق','رفض إدارة الموقع','الملصق تالف أو غير متوفر'];
const excReason51=c=>[c.exc_kind?c.exc_reason:'',c.label_check==='fail'?c.label_note:''].filter(Boolean).join(' / ');
function excSel51(id,list,cur){const other=!!cur&&!list.includes(cur);
  return `<select id="${id}" class="${INPUT}"><option value="">${tx('اختر السبب…','Choose the reason…')}</option>${list.map(r=>`<option ${cur===r?'selected':''}>${esc(r)}</option>`).join('')}<option value="_o" ${other?'selected':''}>${tx('سبب آخر…','Other reason…')}</option></select>
   <input id="${id}_o" maxlength="300" class="${INPUT} mt-2" placeholder="${esc(tx('اكتب السبب','Write the reason'))}" value="${other?esc(cur):''}" ${other?'':'hidden'}>`}
const excSelVal51=id=>{const r=$('#'+id);if(!r)return '';return r.value==='_o'?($('#'+id+'_o').value||'').trim():r.value};
function excBox51(c){const on=c.exc_kind==='access';
  return `<div class="nv-exc ${on?'on':''}" id="excBox"><label class="nv-exc-t"><input type="checkbox" id="exc_on" ${on?'checked':''}> ⚠️ ${tx('تعذّر الوصول إلى الأصل — تسجيل استثناء','The asset could not be reached — record an exception')}</label>
   <div class="nv-exc-b"><p>${tx('عندما لا يمكن تصوير الأصل كاملاً أو الوصول إليه (مقفل، مرتفع، منطقة خطرة…): تصبح صورة الأصل والحالة الفنية غير إلزامية، ويلزم السبب وصورة توضّح المكان أو العائق. يظهر الأصل في «سجل الاستثناءات» وفي تقرير التسليم.','When the asset cannot be photographed or reached: the asset photo and the condition become optional; a reason and a photo of the place are required. It appears in the exceptions log and the handover report.')}</p>
    ${excSel51('exc_r',EXC_ACCESS,c.exc_reason)}
    <div class="nv-shots mt-3"><div class="nv-shot ${c.exc_photo?'ok':''}" id="excShot"><div class="nv-shot-pv">${c.exc_photo?img(c.exc_photo,'',''):CAM}</div><b>${tx('صورة الاستثناء','Exception photo')} <span class="text-red-500">*</span></b><small>${c.exc_photo?tx('✓ موجودة — يمكنك تغييرها','✓ Saved — you can change it'):tx('صوّر المكان أو العائق','Photograph the place or the obstacle')}</small>
     <div class="nv-src"><label>📷 ${tx('كاميرا','Camera')}<input type="file" id="exc_cam" accept="image/*" capture="environment"></label>${can('gallery')?`<label>🖼️ ${tx('المعرض','Gallery')}<input type="file" id="exc_gal" accept="image/*"></label>`:''}</div></div></div>
    <p id="exc_e" class="text-red-500 text-xs mt-1"></p></div></div>`}
function excBind51(c){const box=$('#excBox');if(!box)return {on:()=>false,check:()=>'',vals:async()=>({})};
  const cb=$('#exc_on'),cond=$('#a_condition_id'),r=$('#exc_r'),ro=$('#exc_r_o');let file=null,at=null;
  const sync=()=>{box.classList.toggle('on',cb.checked);if(cond)cond.required=!cb.checked;$('#exc_e').textContent=''};cb.onchange=sync;sync();
  r.onchange=()=>{ro.hidden=r.value!=='_o';if(!ro.hidden)ro.focus()};
  $$('#exc_cam,#exc_gal').forEach(inp=>inp.onchange=()=>{const f=inp.files[0];inp.value='';if(!f||!/^image\//.test(f.type||'image/'))return;file=f;at=f.lastModified;const t=$('#excShot');t.classList.add('ok');
    t.querySelector('.nv-shot-pv').innerHTML=`<img src="${URL.createObjectURL(f)}" alt="">`;t.querySelector('small').textContent=tx('✓ تمت الإضافة — يمكنك تغييرها','✓ Added — you can change it');$('#exc_e').textContent=''});
  return {on:()=>cb.checked,
    check(){if(!cb.checked)return '';if(!excSelVal51('exc_r'))return tx('اختر سبب تعذّر الوصول إلى الأصل.','Choose why the asset could not be reached.');if(!file&&!c.exc_photo)return tx('أضف صورة الاستثناء (توضّح المكان أو العائق).','Add the exception photo (the place or the obstacle).');return ''},
    async vals(lines,oldImg){if(!cb.checked){if(c.exc_photo)oldImg.push(c.exc_photo);return {exc_kind:null,exc_reason:null,exc_photo:null}}
      let k=c.exc_photo;if(file){if(k)oldImg.push(k);k=await storePhoto(file,[`${ymdhms(new Date(at||Date.now()).toISOString())} · ${tx('استثناء: تعذّر الوصول','Exception: not reachable')}`,...lines])}
      return {exc_kind:'access',exc_reason:excSelVal51('exc_r').slice(0,500),exc_photo:k}}}}
/* the label could not be stuck: reason + photo, saved at once (queued for the server like the confirmation) */
function lfLink51(c){return `<details class="nv-lf" id="lfBox"><summary>⚠️ ${tx('تعذّر لصق الملصق؟ سجّل استثناء','Could not stick the label? Record an exception')}</summary><div class="mt-2">${excSel51('lf_r',EXC_LABEL,'')}</div>
  <div class="nv-src mt-2"><label>📷 ${tx('صورة المكان','Photo of the place')}<input type="file" id="lfCam" accept="image/*" capture="environment"></label>${can('gallery')?`<label>🖼️ ${tx('المعرض','Gallery')}<input type="file" id="lfGal" accept="image/*"></label>`:''}</div>
  <small>${tx('اختر السبب ثم صوّر مكان اللصق أو الأصل؛ يُحفظ مباشرة ويظهر للإدارة في «سجل الاستثناءات».','Choose the reason, then photograph the place; it is saved at once and shown in the exceptions log.')}</small></details>`}
function lfDone51(c,L){return `<div class="nv-lblok warn" id="lcDone">${img(L.photo,'','')}<span>⚠️ ${tx('تعذّر اللصق — استثناء مسجّل','Label not stuck — exception recorded')}: ${esc(L.note||'')}${L.pending?` <small>(${tx('بانتظار الرفع','waiting to upload')})</small>`:''}</span></div>
  <div class="nv-lblconf" id="lcBox"><small>${tx('إذا ألصقته لاحقاً فصوّره هنا للتأكيد (يحل محل الاستثناء):','If you stick it later, photograph it here (replaces the exception):')}</small><div class="nv-src"><label>📷 ${tx('كاميرا','Camera')}<input type="file" id="lcCam" accept="image/*" capture="environment"></label>${can('gallery')?`<label>🖼️ ${tx('المعرض','Gallery')}<input type="file" id="lcGal" accept="image/*"></label>`:''}</div><p id="lcMsg" class="text-xs text-blue-700 mt-1"></p></div>`}
async function failLabel51(c,reason,f){if(!c||!f)return;if(!reason){alert(tx('اختر سبب تعذّر اللصق أولاً.','Choose the reason first.'));return}reason=reason.slice(0,500);
  const s=get('schools',c.school_id)||{},at=now();const key=await storePhoto(f,[`${ymdhms(at)} · ${tx('استثناء: تعذّر لصق الملصق','Exception: label not stuck')} · Tag ${assetLabel(c)}`,[s.name,s.moe].filter(Boolean).join(' · '),[c.floor,roomName(c),c.room_number].filter(Boolean).join(' · ')]);
  if(Cloud.on&&Cloud.role==='tech'){const q=labelQ().filter(x=>!(x.id===c.id&&(x.op==='confirm'||x.op==='fail')));q.push({id:c.id,op:'fail',key,reason,at});labelQSet(q);if(!c.label_printed_at)c.label_printed_at=at;await saveNow('collections');flushLabels()}
  else{Object.assign(c,{label_photo:key,label_at:at,label_check:'fail',label_note:reason,label_by:'emp:'+(sess().emp||''),label_printed_at:c.label_printed_at||at});save('collections')}
  toast(tx('سُجّل الاستثناء: تعذّر اللصق.','Exception recorded: label not stuck.'),3500);route()}
document.addEventListener('change',e=>{const t=e.target;if(!t)return;if(t.id==='lf_r'){const o=$('#lf_r_o');if(o){o.hidden=t.value!=='_o';if(!o.hidden)o.focus()}return}
  if((t.id==='lfCam'||t.id==='lfGal')&&t.files[0]){const f=t.files[0];t.value='';failLabel51(curColl(),excSelVal51('lf_r'),f)}});
/* the asset page (admin): the access exception with its photo */
function excPanel51(c){if(!c||!c.exc_kind)return '';return `<div class="card mt-3 border-warning"><div class="card-header"><h3 class="card-title text-warning-emphasis"><i class="bi bi-exclamation-octagon me-1"></i>استثناء: تعذّر الوصول إلى الأصل</h3></div><div class="card-body"><div class="row g-2 align-items-center"><div class="col-5">${c.exc_photo?`<img data-photo="${esc(c.exc_photo)}" alt="صورة الاستثناء" class="img-fluid rounded shadow-sm" style="cursor:zoom-in">`:'<span class="text-muted small">لا توجد صورة</span>'}</div><div class="col-7 small"><div>السبب: <b>${esc(c.exc_reason||'—')}</b></div><div class="text-muted mt-1">صورة الأصل والحالة الفنية غير إلزامية لهذا الأصل.</div></div></div></div></div>`}

/* ---- rooms marked complete: nv_room_done through nv_room_mark (queued while offline); without the cloud, on this device */
const RD={
  key:c=>[c.school_id,c.floor||'',c.room_number==null?'':String(c.room_number),c.room_name_id||''].join('|'),
  sk(){return Cloud.on?'nv51_rooms_'+Cloud.scope():'nv51_rooms_local'},qk(){return Cloud.on?'nv51_roomq_'+Cloud.scope()+'_'+(Cloud.user&&Cloud.user.id||'signed-out'):'nv51_roomq_local'},
  map(){return lsGet(this.sk(),{})},q(){return lsGet(this.qk(),[])},
  get(k){const q=this.q().filter(x=>x.id===k).pop();if(q)return q.done?Object.assign({pending:1},q):null;return this.map()[k]||null},
  mark(c,done){const k=this.key(c),emp=sess().emp||null;const it={id:k,school_id:c.school_id,floor:c.floor||'',room_number:c.room_number==null?'':String(c.room_number),room_name_id:c.room_name_id||'',employee_id:emp,done_at:now(),done_by:emp?'emp:'+emp:((Cloud.user&&Cloud.user.email)||'admin'),done:!!done};
    if(Cloud.on){lsSet(this.qk(),this.q().filter(x=>x.id!==k).concat(it));return this.flush()}const m=this.map();if(done)m[k]=it;else delete m[k];lsSet(this.sk(),m)},
  async flush(){if(this._f||!Cloud.on||navigator.onLine===false||this.old)return;const q=this.q();if(!q.length)return;this._f=1;
    try{const cl=await Cloud.sb();for(const it of q){const {error}=await cl.rpc('nv_room_mark',{p_school:it.school_id,p_floor:it.floor,p_room:it.room_number,p_name:it.room_name_id,p_done:it.done});
        if(error){if(/nv_room_mark|schema cache|does not exist/i.test(error.message)){this.old=1;break}console.warn('room',error.message);continue}
        const m=this.map();if(it.done)m[it.id]=it;else delete m[it.id];lsSet(this.sk(),m);lsSet(this.qk(),this.q().filter(x=>!(x.id===it.id&&x.done_at===it.done_at)))}}
    catch(e){console.warn('room',e)}finally{this._f=0}},
  async pull(force){if(!Cloud.on||(!force&&this.at&&Date.now()-this.at<60000))return false;this.at=Date.now();
    try{const rows=await Cloud.fetchAll('nv_room_done');const m={};for(const r of rows)m[r.id]=r;lsSet(this.sk(),m);this.old=0;return true}catch(e){if(/does not exist|schema cache/i.test(e.message))this.old=1;return false}}
};window.RD=RD;
window.addEventListener('online',()=>setTimeout(()=>RD.flush(),3000));
/* completion per room: an asset is complete when it has its photo (or an access exception with its photo) and its label (confirmed or an exception) */
function lbl51(c){return window.labelOf?labelOf(c):(c.label_at?{check:c.label_check}:null)}
function rooms51(list){const m=new Map();
  for(const c of list){if(!c.submitted_at||!c.floor)continue;const k=RD.key(c);let r=m.get(k);
    if(!r){r={k,school_id:c.school_id,floor:c.floor,room_number:c.room_number,room_name_id:c.room_name_id,zone:'',n:0,ok:0,photo:0,label:0,exc:0,missing:0,emp:new Set(),closed:false,last:''};m.set(k,r)}
    if(c.zone)r.zone=c.zone;if(c.employee_id)r.emp.add(c.employee_id);if((c.submitted_at||'')>r.last)r.last=c.submitted_at;
    if(!c.type_id){if(isClosedRoom(c.room_name_id))r.closed=true;continue}
    r.n++;const ph=c.exc_kind==='access'?!!c.exc_photo:!!c.asset_image,lb=!!lbl51(c);if(ph)r.photo++;if(lb)r.label++;if(hasExc(c))r.exc++;if(ph&&lb)r.ok++;else r.missing++}
  for(const r of m.values()){const d=RD.get(r.k);r.mark=d;r.done=!!d||r.closed;r.pct=r.n?Math.round(r.ok/r.n*100):r.closed?100:0}
  return [...m.values()]}
const roomName51=r=>[(get('rooms',r.room_name_id)||{}).ar,r.room_number?'('+r.room_number+')':''].filter(Boolean).join(' ');
function roomCard51(c,list){if(!c||!c.floor||!c.submitted_at)return '';if(Cloud.on&&!RD.at)RD.pull().then(ch=>{if(ch&&$('#rmCard'))route()});const r=rooms51(list.filter(x=>RD.key(x)===RD.key(c)))[0];if(!r||r.closed)return '';
  return `<div class="nv-room" id="rmCard" data-pct="${r.pct}"><div class="nv-room-h"><b>🚪 ${esc([r.zone,r.floor,roomName51(r)].filter(Boolean).join(' · '))}</b><span class="nv-room-pct">${r.pct}%</span></div><div class="nv-room-bar"><i style="width:${r.pct}%"></i></div>
   <small>${tx('إنجاز الغرفة','Room progress')}: ${num(r.n)} ${tx('أصل','assets')} · ${tx('الصور','photos')} ${r.photo}/${r.n} · ${tx('الملصقات','labels')} ${r.label}/${r.n}${r.exc?` · ${tx('استثناءات','exceptions')} ${r.exc}`:''}</small>
   ${r.mark?`<div class="nv-room-done">✅ ${tx('الغرفة مكتملة','Room complete')} · ${ymd(r.mark.done_at)} ${hiA(r.mark.done_at)}${r.mark.pending?` <small style="display:inline">(${tx('بانتظار الرفع','waiting to upload')})</small>`:''}</div><a data-rd="0">${tx('إعادة فتح الغرفة','Reopen the room')}</a>`
     :`<button type="button" class="nv-room-btn" data-rd="1">✅ ${tx('تعليم الغرفة مكتملة','Mark the room complete')}</button>`}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rd]');if(!b||!$('#rmCard'))return;e.preventDefault();const c=curColl();if(!c)return;
  if(b.dataset.rd==='1'){const p=+$('#rmCard').dataset.pct;if(p<100&&!confirm(tx(`إنجاز الغرفة ${p}%: بعض الأصول بلا صورة أو بلا ملصق مؤكد.\nتعليمها مكتملة رغم ذلك؟`,`Room progress ${p}%: some assets have no photo or confirmed label.\nMark it complete anyway?`)))return;RD.mark(c,true);toast(tx('✓ عُلّمت الغرفة مكتملة.','✓ Room marked complete.'))}
  else{RD.mark(c,false)}setTimeout(route,50)});

/* ---- admin: «الإنتاج اليومي والغرف» (#admin/production) */
PAGE_META.production=['bi-bar-chart-steps','إنتاج كل مشرف ميدان في كل يوم مقابل الهدف اليومي، ونسبة إنجاز كل غرفة'];
PAGE_META.exceptions=['bi-exclamation-octagon','الأصول التي تعذّر الوصول إليها أو تعذّر لصق ملصقها، مع السبب والصورة'];
const P51={tab:'daily',from:'',to:'',emp:'',school:'',zone:'',st:''};
const day51=iso=>{if(!iso)return '';const d=new Date(iso);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const pctBar51=(p,col)=>`<span class="p51-bar"><i style="width:${Math.max(0,Math.min(100,p))}%;background:${col||(p>=100?'#16a34a':p>=60?'#2563eb':'#f59e0b')}"></i></span>`;
function prodRows51(){const T=opsCfg().target,F=P51;const m=new Map(),get2=(d,e)=>{const k=d+'|'+e;let r=m.get(k);if(!r){r={day:d,emp:e,assets:0,units:0,labels:0,photos:0,rooms:new Set(),missing:0,exc:0,mp:0,ms:0,ml:0};m.set(k,r)}return r};
  const inR=d=>d&&(!F.from||d>=F.from)&&(!F.to||d<=F.to);
  for(const c of S.collections){if(F.emp&&c.employee_id!==F.emp)continue;if(F.school&&c.school_id!==F.school)continue;
    const d=day51(c.submitted_at);if(c.type_id&&c.submitted_at&&inR(d)){const r=get2(d,c.employee_id);r.assets++;r.units+=num(c.quantity);r.rooms.add(RD.key(c));
      r.photos+=[c.asset_image,c.asset_image2,c.exc_photo].filter(Boolean).length+(Array.isArray(c.extra_images)?c.extra_images.filter(Boolean).length:0);if(hasExc(c))r.exc++;
      const mp=c.exc_kind==='access'?!c.exc_photo:!c.asset_image,ms=NV36.serialMissing(c.serial),ml=!lbl51(c);if(mp)r.mp++;if(ms)r.ms++;if(ml)r.ml++;if(mp||ms||ml)r.missing++}
    else if(!c.type_id&&c.submitted_at&&isClosedRoom(c.room_name_id)&&inR(d))get2(d,c.employee_id).rooms.add(RD.key(c));
    const ld=day51(c.label_at);if(c.label_at&&c.type_id&&inR(ld)){const r=get2(ld,c.employee_id);if(c.label_check!=='fail')r.labels++;if(c.label_photo)r.photos++}}
  return [...m.values()].map(r=>Object.assign(r,{rooms:r.rooms.size,pct:Math.round(r.assets/T*100)})).sort((a,b)=>a.day<b.day?1:a.day>b.day?-1:empName(a.emp).localeCompare(empName(b.emp),'ar'))}
async function vProd51(){if(Cloud.on&&!can('view'))return go('#admin');const F=P51,q=qp();if(q.get('tab'))F.tab=q.get('tab')==='rooms'?'rooms':'daily';
  if(!F.from&&!F.to){const t=new Date();F.to=day51(t.toISOString());F.from=day51(new Date(t.getTime()-13*864e5).toISOString())}
  const emps=S.employees.filter(e=>!e.archived||S.collections.some(c=>c.employee_id===e.id)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  const schools=S.schools.filter(s=>S.collections.some(c=>c.school_id===s.id)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
  const tabs=`<div class="p51-tabs" role="tablist"><a href="#admin/production?tab=daily" class="${F.tab==='daily'?'on':''}" role="tab" aria-selected="${F.tab==='daily'}">📈 الإنتاج اليومي</a><a href="#admin/production?tab=rooms" class="${F.tab==='rooms'?'on':''}" role="tab" aria-selected="${F.tab==='rooms'}">🚪 اكتمال الغرف</a></div>`;
  const selE=`<select class="form-select form-select-sm" style="width:auto" id="p51Emp" aria-label="مشرف الميدان"><option value="">كل مشرفي الميدان</option>${emps.map(e=>`<option value="${esc(e.id)}" ${F.emp===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select>`;
  const selS=`<select class="form-select form-select-sm" style="width:auto" id="p51Sch" aria-label="المبنى"><option value="">كل المباني</option>${schools.map(s=>`<option value="${esc(s.id)}" ${F.school===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`;
  if(F.tab==='rooms')return vRooms51(tabs,selE,selS);
  const T=opsCfg().target,rows=prodRows51(),tot=k=>rows.reduce((a,r)=>a+r[k],0),hit=rows.filter(r=>r.assets>=T).length;
  const per=new Map();for(const r of rows){const p=per.get(r.emp)||{emp:r.emp,days:0,assets:0,labels:0,missing:0,best:0,hit:0,exc:0};p.days++;p.assets+=r.assets;p.labels+=r.labels;p.missing+=r.missing;p.exc+=r.exc;p.best=Math.max(p.best,r.assets);if(r.assets>=T)p.hit++;per.set(r.emp,p)}
  const pers=[...per.values()].sort((a,b)=>b.assets-a.assets);
  adminShell('production','الإنتاج اليومي والغرف',`<div class="p51">${tabs}<div class="card"><div class="card-body">
   <div class="d-flex flex-wrap gap-2 align-items-center mb-3"><label class="small">من <input type="date" class="form-control form-control-sm d-inline-block" style="width:auto" id="p51From" value="${esc(F.from)}"></label><label class="small">إلى <input type="date" class="form-control form-control-sm d-inline-block" style="width:auto" id="p51To" value="${esc(F.to)}"></label>${selE}${selS}
    <span class="ms-auto small">الهدف اليومي: ${can('settings')?`<input type="number" min="1" max="2000" id="p51T" class="form-control form-control-sm d-inline-block" style="width:80px" value="${T}"> <button class="btn btn-sm btn-outline-primary" id="p51TS">حفظ الهدف</button>`:`<b>${T}</b>`} أصل / مشرف</span><button class="btn btn-sm btn-outline-success" id="p51X"><i class="bi bi-file-earmark-excel"></i> Excel</button></div>
   <div class="p51-k" data-kpi="prod" data-val="${tot('assets')},${tot('labels')},${tot('photos')},${tot('rooms')},${tot('missing')}">${[['الأصول المسجلة',nf(tot('assets'))],['الملصقات المؤكدة',nf(tot('labels'))],['الصور',nf(tot('photos'))],['الغرف',nf(tot('rooms'))],['أصول بها نواقص',nf(tot('missing'))],['أيام حققت الهدف',rows.length?`${nf(hit)} / ${nf(rows.length)}`:'—'],['متوسط المشرف في اليوم',rows.length?nf(Math.round(tot('assets')/rows.length)):'—']].map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>
   <div class="table-responsive"><table class="table table-sm table-hover align-middle" id="p51Tbl"><thead><tr><th>اليوم</th><th>مشرف الميدان</th><th>الأصول مقابل الهدف</th><th>الوحدات</th><th>الملصقات</th><th>الصور</th><th>الغرف</th><th title="أصول ينقصها صورة أو رقم تسلسلي أو ملصق مؤكد">النواقص</th><th>الاستثناءات</th></tr></thead>
    <tbody>${rows.map(r=>`<tr data-p51="${esc(r.day)}|${esc(r.emp)}"><td class="num">${esc(r.day)}</td><td>${esc(empName(r.emp)||'—')}</td><td class="num"><b class="${r.assets>=T?'ok':''}">${nf(r.assets)}</b> / ${nf(T)}${pctBar51(r.pct)} <small>${r.pct}%</small></td><td class="num">${nf(r.units)}</td><td class="num">${nf(r.labels)}</td><td class="num">${nf(r.photos)}</td><td class="num">${nf(r.rooms)}</td>
     <td class="num ${r.missing?'bad':''}" title="صورة ${r.mp} · تسلسلي ${r.ms} · ملصق ${r.ml}">${nf(r.missing)}</td><td class="num">${r.exc?`<a href="#admin/exceptions?emp=${encodeURIComponent(r.emp)}">${nf(r.exc)}</a>`:'0'}</td></tr>`).join('')||'<tr><td colspan="9" class="text-center text-muted py-4">لا يوجد إنتاج في هذه الفترة.</td></tr>'}</tbody></table></div>
   ${pers.length?`<h6 class="fw-bold mt-3">ملخص المشرفين في الفترة</h6><div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>مشرف الميدان</th><th>أيام العمل</th><th>الأصول</th><th>المتوسط اليومي</th><th>أفضل يوم</th><th>أيام حققت الهدف</th><th>الملصقات</th><th>النواقص</th><th>الاستثناءات</th></tr></thead><tbody>
    ${pers.map(p=>{const av=Math.round(p.assets/p.days);return `<tr><td>${esc(empName(p.emp)||'—')}</td><td class="num">${nf(p.days)}</td><td class="num">${nf(p.assets)}</td><td class="num"><b class="${av>=T?'ok':''}">${nf(av)}</b>${pctBar51(Math.round(av/T*100))}</td><td class="num">${nf(p.best)}</td><td class="num">${nf(p.hit)} / ${nf(p.days)}</td><td class="num">${nf(p.labels)}</td><td class="num ${p.missing?'bad':''}">${nf(p.missing)}</td><td class="num">${nf(p.exc)}</td></tr>`}).join('')}</tbody></table></div>`:''}
   <p class="small text-muted mb-0">اليوم = تاريخ إرسال الأصل (والملصق بتاريخ تأكيد لصقه). النواقص محسوبة على حالة الأصل الآن: صورة الأصل (أو صورة الاستثناء)، الرقم التسلسلي، الملصق المؤكد أو المستثنى.</p></div></div></div>`);
  const re=()=>vProd51();$('#p51From').onchange=e=>{F.from=e.target.value;re()};$('#p51To').onchange=e=>{F.to=e.target.value;re()};$('#p51Emp').onchange=e=>{F.emp=e.target.value;re()};$('#p51Sch').onchange=e=>{F.school=e.target.value;re()};
  if($('#p51TS'))$('#p51TS').onclick=async()=>{const v=Math.round(+$('#p51T').value);if(!(v>=1&&v<=2000))return alert('الهدف من 1 إلى 2000 أصل.');S.settings.ops=Object.assign({},S.settings.ops||{},{target:v});await saveNow('settings');
    if(Cloud.on){await Cloud.sync();if(Cloud.err){setAFlash('لم يُحفظ الهدف في قاعدة البيانات: '+Cloud.err.message,'danger');return re()}}setAFlash('تم حفظ الهدف اليومي.');re()};
  $('#p51X').onclick=()=>writeXlsx([['الإنتاج اليومي',[['اليوم','مشرف الميدان','الأصول','الهدف','النسبة %','الوحدات','الملصقات','الصور','الغرف','النواقص','نقص الصورة','نقص التسلسلي','نقص الملصق','الاستثناءات'],...rows.map(r=>[r.day,empName(r.emp),r.assets,T,r.pct,r.units,r.labels,r.photos,r.rooms,r.missing,r.mp,r.ms,r.ml,r.exc])]],
    ['ملخص المشرفين',[['مشرف الميدان','أيام العمل','الأصول','المتوسط اليومي','أفضل يوم','أيام حققت الهدف','الملصقات','النواقص','الاستثناءات'],...pers.map(p=>[empName(p.emp),p.days,p.assets,Math.round(p.assets/p.days),p.best,p.hit,p.labels,p.missing,p.exc])]]],'solvix-production-'+stamp()+'.xlsx')}
async function vRooms51(tabs,selE,selS){const F=P51;if(Cloud.on&&!RD._busy){RD._busy=1;RD.pull().then(ch=>{RD._busy=0;if(ch&&location.hash.startsWith('#admin/production')&&P51.tab==='rooms')vProd51()})}
  let rs=rooms51(S.collections.filter(c=>(!F.school||c.school_id===F.school)&&(!F.emp||c.employee_id===F.emp)));const zones=[...new Set(rs.map(r=>r.zone).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  if(F.zone)rs=rs.filter(r=>r.zone===F.zone);const all=rs.length,done=rs.filter(r=>r.done).length;if(F.st)rs=rs.filter(r=>F.st==='done'?r.done:F.st==='full'?!r.done&&r.pct===100:!r.done);
  rs.sort((a,b)=>String((get('schools',a.school_id)||{}).name||'').localeCompare(String((get('schools',b.school_id)||{}).name||''),'ar')||String(a.zone).localeCompare(String(b.zone),'ar')||String(a.floor).localeCompare(String(b.floor),'ar',{numeric:true})||String(a.room_number).localeCompare(String(b.room_number),'ar',{numeric:true}));
  const avg=all?Math.round(rooms51(S.collections.filter(c=>(!F.school||c.school_id===F.school)&&(!F.emp||c.employee_id===F.emp))).filter(r=>!F.zone||r.zone===F.zone).reduce((a,r)=>a+r.pct,0)/all):0;const edit=can('edit')&&!(Cloud.on&&RD.old);
  const st=r=>r.closed?'<span class="badge text-bg-secondary">🔒 غرفة مغلقة</span>':r.mark?`<span class="badge text-bg-success">✅ مكتملة</span><small class="d-block text-muted">${esc(ymdhms(r.mark.done_at))}${r.mark.done_by?' · '+esc(String(r.mark.done_by).startsWith('emp:')?empName(String(r.mark.done_by).slice(4)):r.mark.done_by):''}</small>`:r.pct===100?'<span class="badge text-bg-info">جاهزة للتعليم</span>':'<span class="badge text-bg-warning">⏳ جارية</span>';
  adminShell('production','الإنتاج اليومي والغرف',`<div class="p51">${tabs}<div class="card"><div class="card-body">
   <div class="d-flex flex-wrap gap-2 align-items-center mb-3">${selS}${selE}${zones.length?`<select class="form-select form-select-sm" style="width:auto" id="p51Zone" aria-label="${esc(opsCfg().zone.l)}"><option value="">كل ${esc(opsCfg().zone.l)}</option>${zones.map(z=>`<option ${F.zone===z?'selected':''}>${esc(z)}</option>`).join('')}</select>`:''}
    <select class="form-select form-select-sm" style="width:auto" id="p51St" aria-label="الحالة"><option value="">كل الغرف</option><option value="done" ${F.st==='done'?'selected':''}>المكتملة</option><option value="open" ${F.st==='open'?'selected':''}>غير المكتملة</option><option value="full" ${F.st==='full'?'selected':''}>إنجاز 100% ولم تُعلَّم</option></select>
    <button class="btn btn-sm btn-outline-success ms-auto" id="p51RX"><i class="bi bi-file-earmark-excel"></i> Excel</button></div>
   ${Cloud.on&&RD.old?'<div class="alert alert-warning py-2 small">تعليم اكتمال الغرف يحتاج تشغيل الترحيل 048 (solvix_setup.sql) في قاعدة هذا العميل.</div>':''}
   <div class="p51-k" data-kpi="rooms" data-val="${all},${done},${avg}">${[['الغرف',nf(all)],['مكتملة',nf(done)+(all?` (${Math.round(done/all*100)}%)`:'')],['متوسط إنجاز الغرفة',avg+'%'],['أصول في الغرف',nf(rs.reduce((a,r)=>a+r.n,0))]].map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>
   <div class="table-responsive"><table class="table table-sm table-hover align-middle"><thead><tr><th>المبنى</th>${zones.length?`<th>${esc(opsCfg().zone.l)}</th>`:''}<th>الدور</th><th>الغرفة</th><th>الأصول</th><th>الصور</th><th>الملصقات</th><th>إنجاز الغرفة</th><th>الحالة</th>${edit?'<th></th>':''}</tr></thead><tbody>
    ${rs.map(r=>`<tr data-room="${esc(r.k)}"><td>${esc((get('schools',r.school_id)||{}).name||'—')}</td>${zones.length?`<td>${esc(r.zone||'—')}</td>`:''}<td>${esc(r.floor||'')}</td><td>${esc(roomName51(r)||'—')}</td><td class="num">${nf(r.n)}${r.exc?` <small class="text-warning-emphasis" title="استثناءات">⚠️${r.exc}</small>`:''}</td><td class="num">${r.photo} / ${r.n}</td><td class="num">${r.label} / ${r.n}</td><td class="num"><b>${r.pct}%</b>${pctBar51(r.pct)}</td><td>${st(r)}</td>${edit?`<td>${r.closed?'':r.mark?`<button class="btn btn-xs btn-outline-secondary" data-rm51="0">إعادة فتح</button>`:`<button class="btn btn-xs btn-outline-success" data-rm51="1">تعليم مكتملة</button>`}</td>`:''}</tr>`).join('')||`<tr><td colspan="10" class="text-center text-muted py-4">لا توجد غرف مسجلة بعد.</td></tr>`}</tbody></table></div>
   <p class="small text-muted mb-0">إنجاز الغرفة = الأصول التي لها صورة (أو صورة استثناء) وملصق مؤكد (أو استثناء لصق) ÷ أصول الغرفة. يعلّم مشرف الميدان الغرفة مكتملة من شاشة «تم الحفظ» بعد آخر أصل فيها.</p></div></div></div>`);
  const re=()=>vProd51();$('#p51Emp').onchange=e=>{F.emp=e.target.value;re()};$('#p51Sch').onchange=e=>{F.school=e.target.value;re()};if($('#p51Zone'))$('#p51Zone').onchange=e=>{F.zone=e.target.value;re()};$('#p51St').onchange=e=>{F.st=e.target.value;re()};
  $$('[data-rm51]').forEach(b=>b.onclick=async()=>{const k=b.closest('tr').dataset.room;const r=rs.find(x=>x.k===k);if(!r)return;b.disabled=true;await RD.mark(r,b.dataset.rm51==='1');if(Cloud.on)await RD.pull(true);re()});
  $('#p51RX').onclick=()=>writeXlsx([['اكتمال الغرف',[['المبنى',opsCfg().zone.l,'الدور','الغرفة','الأصول','بها صورة','بها ملصق','الاستثناءات','إنجاز الغرفة %','الحالة','تاريخ التعليم'],...rs.map(r=>[(get('schools',r.school_id)||{}).name||'',r.zone,r.floor,roomName51(r),r.n,r.photo,r.label,r.exc,r.pct,r.closed?'مغلقة':r.mark?'مكتملة':'جارية',r.mark?ymdhms(r.mark.done_at):''])]]],'solvix-rooms-'+stamp()+'.xlsx')}

/* ---- admin: «سجل الاستثناءات» (#admin/exceptions) */
const X51={k:'',emp:'',school:''};
function vExc51(){if(Cloud.on&&!can('view'))return go('#admin');const F=X51,q=qp();if(q.has('k'))F.k=q.get('k');if(q.has('emp'))F.emp=q.get('emp');
  const base=S.collections.filter(c=>c.type_id&&c.submitted_at&&hasExc(c));
  const list=base.filter(c=>(!F.k||(F.k==='access'?c.exc_kind==='access':c.label_check==='fail'))&&(!F.emp||c.employee_id===F.emp)&&(!F.school||c.school_id===F.school)).sort((a,b)=>((b.label_check==='fail'&&b.label_at)||b.submitted_at||'')<((a.label_check==='fail'&&a.label_at)||a.submitted_at||'')?-1:1);
  const na=base.filter(c=>c.exc_kind==='access').length,nl=base.filter(c=>c.label_check==='fail').length;
  const emps=[...new Set(base.map(c=>c.employee_id))].map(id=>get('employees',id)).filter(Boolean),schools=[...new Set(base.map(c=>c.school_id))].map(id=>get('schools',id)).filter(Boolean);
  const loc=c=>[c.zone,c.floor,(get('rooms',c.room_name_id)||{}).ar,c.room_number].filter(Boolean).join(' · ');
  adminShell('exceptions','سجل الاستثناءات',`<div class="p51"><div class="card"><div class="card-body">
   <div class="p51-k" data-kpi="exc" data-val="${base.length},${na},${nl}">${[['كل الاستثناءات',nf(base.length)],['تعذّر الوصول إلى الأصل',nf(na)],['تعذّر لصق الملصق',nf(nl)],['مبانٍ بها استثناءات',nf(schools.length)]].map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>
   <div class="d-flex flex-wrap gap-2 align-items-center mb-3"><select class="form-select form-select-sm" style="width:auto" id="x51K" aria-label="نوع الاستثناء"><option value="">كل الأنواع</option><option value="access" ${F.k==='access'?'selected':''}>تعذّر الوصول</option><option value="label" ${F.k==='label'?'selected':''}>تعذّر اللصق</option></select>
    <select class="form-select form-select-sm" style="width:auto" id="x51S" aria-label="المبنى"><option value="">كل المباني</option>${schools.map(s=>`<option value="${esc(s.id)}" ${F.school===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
    <select class="form-select form-select-sm" style="width:auto" id="x51E" aria-label="مشرف الميدان"><option value="">كل مشرفي الميدان</option>${emps.map(e=>`<option value="${esc(e.id)}" ${F.emp===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select>
    <span class="ms-auto"></span><button class="btn btn-sm btn-outline-success" id="x51X"><i class="bi bi-file-earmark-excel"></i> Excel</button>${can('export')||!Cloud.on?`<button class="btn btn-sm btn-outline-primary" id="x51F"><i class="bi bi-images"></i> Excel بالصور</button>`:''}</div>
   <div class="table-responsive"><table class="table table-sm table-hover align-middle"><thead><tr><th>الصورة</th><th>رقم الأصل</th><th>الأصل</th><th>الاستثناء</th><th>السبب</th><th>المبنى / الموقع</th><th>مشرف الميدان</th><th>التاريخ</th></tr></thead><tbody>
    ${list.map(c=>{const ph=c.exc_photo||(c.label_check==='fail'?c.label_photo:null);return `<tr data-x51="${esc(c.id)}"><td>${ph?`<img class="x51-th" data-photo="${esc(ph)}" alt="صورة الاستثناء" loading="lazy">`:'—'}</td><td class="num"><a href="#admin/collections/${encodeURIComponent(c.id)}">${esc(assetLabel(c)||'—')}</a></td><td>${esc((get('types',c.type_id)||{}).ar||'')}</td><td><span class="badge ${c.exc_kind?'text-bg-warning':'text-bg-danger'}">${esc(excText(c))}</span></td><td>${esc(excReason51(c))}</td><td>${esc((get('schools',c.school_id)||{}).name||'')}<small class="d-block text-muted">${esc(loc(c))}</small></td><td>${esc(empName(c.employee_id)||'—')}</td><td class="num small">${esc(ymdhms((c.label_check==='fail'&&c.label_at)||c.submitted_at))}</td></tr>`}).join('')||'<tr><td colspan="8" class="text-center text-muted py-4">لا توجد استثناءات.</td></tr>'}</tbody></table></div>
   <p class="small text-muted mb-0">يسجّل مشرف الميدان «تعذّر الوصول» من نموذج الأصل، و«تعذّر اللصق» من مربع تأكيد الملصق. تظهر الاستثناءات في «جودة البيانات» وتقرير المبنى وملف Excel الكامل (ورقة «الاستثناءات»).</p></div></div></div>`);
  hydratePhotos(document);const re=()=>{history.replaceState(null,'','#admin/exceptions');vExc51()};
  $('#x51K').onchange=e=>{F.k=e.target.value;re()};$('#x51S').onchange=e=>{F.school=e.target.value;re()};$('#x51E').onchange=e=>{F.emp=e.target.value;re()};
  $('#x51X').onclick=()=>writeXlsx([['الاستثناءات',[['رقم الأصل','الأصل','الاستثناء','السبب','المبنى','الموقع','مشرف الميدان','التاريخ','الصورة'],...list.map(c=>[assetLabel(c),(get('types',c.type_id)||{}).ar||'',excText(c),excReason51(c),(get('schools',c.school_id)||{}).name||'',loc(c),empName(c.employee_id),ymdhms((c.label_check==='fail'&&c.label_at)||c.submitted_at),(c.exc_photo||(c.label_check==='fail'?c.label_photo:''))?(c.exc_photo||c.label_photo)+'.jpg':''])]]],'solvix-exceptions-'+stamp()+'.xlsx');
  if($('#x51F'))$('#x51F').onclick=()=>exportFull(list,'solvix-exceptions-'+stamp())}

/* ---- building report: rooms and exceptions sections */
async function report51(s,all,sub){const rs=rooms51(all).sort((a,b)=>String(a.zone).localeCompare(String(b.zone),'ar')||String(a.floor).localeCompare(String(b.floor),'ar',{numeric:true})||String(a.room_number).localeCompare(String(b.room_number),'ar',{numeric:true}));
  const ex=sub.filter(hasExc);let out='';
  if(rs.length){const done=rs.filter(r=>r.done).length,avg=Math.round(rs.reduce((a,r)=>a+r.pct,0)/rs.length);
    out+=`<section style="break-inside:auto"><h2>اكتمال الغرف — ${done} / ${rs.length} مكتملة · متوسط الإنجاز ${avg}%</h2><table><thead><tr>${rs.some(r=>r.zone)?'<th>المنطقة / القسم</th>':''}<th>الدور</th><th>الغرفة</th><th>الأصول</th><th>الصور</th><th>الملصقات</th><th>الإنجاز</th><th>الحالة</th></tr></thead><tbody>${rs.map(r=>`<tr>${rs.some(x=>x.zone)?`<td>${esc(r.zone||'—')}</td>`:''}<td>${esc(r.floor||'')}</td><td>${esc(roomName51(r)||'—')}</td><td class="num">${r.n}</td><td class="num">${r.photo}/${r.n}</td><td class="num">${r.label}/${r.n}</td><td class="num">${r.pct}%</td><td>${r.closed?'مغلقة':r.mark?'✅ مكتملة':'جارية'}</td></tr>`).join('')}</tbody></table></section>`}
  if(ex.length){const rows=[];for(const c of ex){const ph=await thumb48(c.exc_photo||(c.label_check==='fail'?c.label_photo:null),360);
      rows.push(`<tr><td>${ph?`<img src="${ph}" alt="" style="width:70px;height:52px;object-fit:cover;border-radius:5px">`:'—'}</td><td class="tag">${esc(assetLabel(c)||'—')}</td><td>${esc((get('types',c.type_id)||{}).ar||'')}</td><td>${esc([c.zone,c.floor,(get('rooms',c.room_name_id)||{}).ar,c.room_number].filter(Boolean).join(' / '))}</td><td class="crit">${esc(excText(c))}</td><td>${esc(excReason51(c))}</td></tr>`)}
    out+=`<section style="break-inside:auto"><h2>سجل الاستثناءات (${ex.length})</h2><table><thead><tr><th>الصورة</th><th>رقم الأصل</th><th>الأصل</th><th>الموقع</th><th>الاستثناء</th><th>السبب</th></tr></thead><tbody>${rows.join('')}</tbody></table></section>`}
  return out}
</script>
