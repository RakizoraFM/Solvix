<script id="nv-cloud">
/* NV5 — Solvix's own Supabase project (solvix_setup.sql). The connection comes from SOLVIX_CFG below, or from this
   device (localStorage solvix_cloud_cfg, set from Data & Backup or by a link #cfg=<base64 {url,key}>). Its own session
   (storageKey solvix-auth), so it never mixes with other apps on the same site. Only the public (anon / publishable) key.
   The pages keep working on S; save(table) marks the table and Cloud.sync() pushes the rows that differ from the last
   copy received from the server (snapshot), so edits made offline are kept on the device and sent later. */
const SOLVIX_CFG={url:'https://izheuautphutjlxnfckb.supabase.co',key:'sb_publishable_frdKmjDLcXpv-sN8A4Rs3Q_QO8DuzEX'};   /* the Solvix project: Project URL + publishable / anon key */
const NV_CFG_KEY='solvix_cloud_cfg';
const cfgOk=o=>{try{if(!o||new URL(o.url).protocol!=='https:'||String(o.key||'').length<30)return false;const key=String(o.key);if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon'}catch(e){return false}};
(function(){try{const m=location.hash.match(/[#&]cfg=([^&]+)/);if(m){const o=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));if(cfgOk(o))localStorage.setItem(NV_CFG_KEY,JSON.stringify({url:o.url.replace(/\/+$/,''),key:o.key}));history.replaceState(null,'',location.pathname+location.search+location.hash.replace(/[#&]?cfg=[^&]+/,''))}}catch(e){}})();
const NV_LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const NV_T={categories:'nv_categories',conditions:'nv_conditions',rooms:'nv_rooms',types:'nv_types',employees:'nv_employees',schools:'nv_schools',collections:'nv_collections'};
const NV_ORDER=['categories','conditions','rooms','types','employees','schools','collections'];
const NV_COLS={categories:['id','ar','en'],conditions:['id','ar','en'],rooms:['id','en','ar'],types:['id','cat','ar','en','l2','l3','code','critical'],employees:['id','number','name','email','created_at'],
  schools:['id','moe','ident','site','name','district','city','description','status','completed_at','completed_by','created_at','lat','lng','extra'],
  collections:['id','employee_id','school_id','school_image','floor','room_number','room_name_id','notes','category_id','type_id','condition_id','quantity','price','status',
    'manufacturer','brand','model','capacity','serial','agency','warranty','install_date','asad_country','lat','lng','asset_image','asset_image2','extra_images','parent_child','tag','submitted_at','created_at','geo_dist','review_status','review_note','reviewed_at','reviewed_by','label_photo','label_at','label_by','label_check','label_printed_at','zone','exc_kind','exc_reason','exc_photo','label_note']};
/* NV51: columns of migration 048, synced only once this project's database has them (Cloud.c51Ok) */
const NV51C=new Set(['zone','exc_kind','exc_reason','exc_photo','label_note']);
const NV_TEXT0=new Set(['l2','l3','moe','site','district','city','description','en','notes','manufacturer','brand','model','capacity','serial','agency','warranty','install_date','asad_country','tag','review_note']);
const tsNorm=v=>{if(v==null||v==='')return null;const d=new Date(v);return isNaN(d)?v:d.toISOString()};
const Cloud={conflicts:{},skip:new Set(),on:false,client:null,role:null,emp:null,user:null,busy:new Set(),snap:{},uploaded:new Set(),dirty:new Set(),err:null,syncing:false,again:false,lastPull:0,tablesMissing:false,
  cfg(){if(this._cfg)return this._cfg;try{const project=new URLSearchParams(location.search||'').get('project');if(project){const p=JSON.parse(decodeURIComponent(escape(atob(project))));if(!cfgOk(p))throw new Error('رابط العميل غير صالح');return this._cfg={url:p.url.replace(/\/+$/,''),key:p.key}}}catch(e){throw new Error('رابط إعداد العميل غير صالح.')}try{const o=JSON.parse(localStorage.getItem(NV_CFG_KEY)||'null');if(cfgOk(o))return this._cfg={url:String(o.url).replace(/\/+$/,''),key:o.key}}catch(e){}return cfgOk(SOLVIX_CFG)?(this._cfg={...SOLVIX_CFG}):null},
  scope(){return new URL(this.cfg().url).hostname},
  setCfg(o){if(!cfgOk(o))throw new Error('تحقق من رابط المشروع والمفتاح العام (لا تستخدم مفتاح service_role / secret أبداً).');localStorage.setItem(NV_CFG_KEY,JSON.stringify({url:o.url.trim().replace(/\/+$/,''),key:o.key.trim()}))},
  link(){const c=this.cfg();return c?location.origin+location.pathname+'?project='+encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(c)))))+'#login':''},
  async sb(){if(this.client)return this.client;if(!(window.supabase&&window.supabase.createClient))await loadScript(NV_LIB);const c=this.cfg();
    this.client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,storageKey:c.url===SOLVIX_CFG.url?'solvix-auth':'solvix-auth-'+new URL(c.url).hostname}});return this.client},
  chk({data,error}){if(error)throw new Error(error.message||String(error));return data},
  canon(t,r){const o={};for(const k of NV_COLS[t]){if(this.skip.has(t+'.'+k))continue;if(k==='extra'&&!this.extraOk())continue;if(t==='collections'&&NV51C.has(k)&&!this.c51Ok())continue;if(t==='collections'&&this.role==='tech'&&/^label_/.test(k))continue;let v=r[k];if(v===undefined||v==='')v=NV_TEXT0.has(k)?'':null;if(v!=null&&/(_at)$/.test(k))v=tsNorm(v);if(v!=null&&(k==='lat'||k==='lng'||k==='price'))v=Number(v);if(k==='quantity')v=Math.max(0,Math.round(Number(v)||0));if(k==='room_number'&&v!=null)v=String(v);if(k==='critical')v=!!v;if(k==='extra')v=r.extra&&typeof r.extra==='object'&&!Array.isArray(r.extra)?r.extra:{};if(k==='extra_images')v=Array.isArray(v)?v.filter(Boolean):[];if(k==='geo_dist'&&v!=null)v=Math.round(Number(v));o[k]=v}return o},
  key(t,r){return JSON.stringify(this.canon(t,r))},
  /* NV46: nv_schools.extra (custom building fields) is synced only once this project's database has the column (migration 046).
     The flag is kept per project, so a device never compares rows with and without the column. Old snapshots get extra:{} added
     (the server default), so turning it on does not resend every building. */
  extraOk(){try{return localStorage.getItem('nv_extra_ok_'+this.scope())==='1'}catch(e){return false}},
  async detectExtra(rows){let has;if(rows&&rows.length)has='extra' in rows[0];else{try{const {error}=await (await this.sb()).from('nv_schools').select('extra').limit(1);has=!error}catch(e){has=false}}
    try{localStorage.setItem('nv_extra_ok_'+this.scope(),has?'1':'0')}catch(e){}this.dbOld=(this.dbOld||[]).filter(x=>x!=='nv_schools.extra');if(!has)this.dbOld.push('nv_schools.extra');
    if(has){const snap=this.snap.schools||{};for(const id in snap)if(snap[id].indexOf('"extra":')<0){const o=JSON.parse(snap[id]);o.extra={};snap[id]=JSON.stringify(o)}}},
  /* NV51: the same for the collection columns of migration 048 (zone, exceptions, label note); old snapshots get the server default (null) */
  c51Ok(){try{return localStorage.getItem('nv51_ok_'+this.scope())==='1'}catch(e){return false}},
  async detect51(rows){let has;if(rows&&rows.length)has='exc_kind' in rows[0];else{try{const {error}=await (await this.sb()).from('nv_collections').select('exc_kind').limit(1);has=!error}catch(e){has=false}}
    try{localStorage.setItem('nv51_ok_'+this.scope(),has?'1':'0')}catch(e){}this.dbOld=(this.dbOld||[]).filter(x=>x!=='nv_collections.exc_kind');if(!has)this.dbOld.push('nv_collections.exc_kind');
    if(has){const snap=this.snap.collections||{},keys=[...NV51C].filter(k=>!(this.role==='tech'&&/^label_/.test(k)));for(const id in snap){const o=JSON.parse(snap[id]);let ch=0;for(const k of keys)if(!(k in o)){o[k]=null;ch=1}if(ch)snap[id]=JSON.stringify(o)}}},
  /* ---- start-up: who is signed in, and which role he has in Novaro ---- */
  async init(){
    const cached=await IDB.get('kv','cloud_me').catch(()=>null);this.conflicts=await IDB.get('kv','sync_conflicts').catch(()=>null)||{};this.snap=await IDB.get('kv','snap').catch(()=>null)||{};this.uploaded=new Set(await IDB.get('kv','uploaded').catch(()=>null)||[]);
    for(const t of NV_ORDER.concat(['settings']))if(!this.snap[t])this.snap[t]={};
    try{const c=await this.sb();const {data}=await c.auth.getSession();const u=data&&data.session&&data.session.user;
      if(!u){await this.setMe(null);return}
      this.user=u;const me=this.chk(await c.rpc('nv_me'));await this.setMe(me,u.id)}
    catch(e){if(/nv_me|schema cache|does not exist/i.test(e.message))this.tablesMissing=true;else if(cached){Object.assign(this,{role:cached.role,emp:cached.emp,staffRole:cached.staff_role||null,sys:!!cached.sys,perms:cached.perms||null,sub:cached.sub||null,user:{id:cached.uid}});this.err=e}}
  },
  async setMe(me,uid){const oldRole=this.role||(await IDB.get('kv','cloud_me').catch(()=>null)||{}).role;this.role=oldRole;const oldPending=Object.keys(this.conflicts).length||(oldRole?this.pendingCount():this.orphanPending());this.docAccess=me&&me.doc_access||{};this.role=me&&me.role||null;this.emp=me&&me.emp||null;this.staffRole=me&&me.staff_role||null;this.sys=!!(me&&me.sys);this.perms=me&&Array.isArray(me.perms)?me.perms:null;this.sub=me&&me.sub||null;
    const prev=await IDB.get('kv','cloud_owner').catch(()=>null);
    if(uid&&prev&&prev!==uid&&(oldPending||lsGet('nv_label_q_'+this.scope()+'_'+prev,[]).length+lsGet('nv_label_q_'+prev,[]).length||lsGet('nv_label_q',[]).length)){throw new Error('توجد بيانات محلية غير مرسلة للحساب السابق. ادخل بالحساب السابق وزامنها أو صدّر نسخة احتياطية أولاً.')}
    if(uid&&prev&&prev!==uid){/* another account on this device: drop the previous account's cache */for(const t of TABLES)S[t]=t==='settings'?S.settings:[];this.snap={};for(const t of NV_ORDER.concat(['settings']))this.snap[t]={};await IDB.clear('photos');urlCache.clear();this.uploaded=new Set();await saveAll();await this.persistSnap()}
    if(uid&&prev===uid&&this.cfg().url===SOLVIX_CFG.url){const legacy=lsGet('nv_label_q',[]).concat(lsGet('nv_label_q_'+uid,[]));if(legacy.length){const key='nv_label_q_'+this.scope()+'_'+uid;lsSet(key,lsGet(key,[]).concat(legacy));localStorage.removeItem('nv_label_q');localStorage.removeItem('nv_label_q_'+uid)}const mq=lsGet('nv_mail_queue',[]);if(mq.length){lsSet('nv_mail_queue_'+this.scope()+'_'+uid,mq);localStorage.removeItem('nv_mail_queue')}}if(uid)await IDB.put('kv','cloud_owner',uid);await IDB.put('kv','cloud_me',this.role?{role:this.role,emp:this.emp,staff_role:this.staffRole,sys:this.sys,perms:this.perms,sub:this.sub,uid}:null)},
  async signIn(email,pw){const c=await this.sb();const r=this.chk(await c.auth.signInWithPassword({email,password:pw}));this.user=r.user;const me=this.chk(await c.rpc('nv_me'));try{await this.setMe(me,r.user.id)}catch(e){await c.auth.signOut();this.role=null;this.user=null;throw e}return me},
  async signOut(){await this.sync().catch(()=>{});if(window.flushLabels)await flushLabels();if(this.pendingCount()){toast('توجد تعديلات غير مرسلة. زامنها أو صدّر نسخة احتياطية قبل تسجيل الخروج.',7000);return false}try{const c=await this.sb();await c.auth.signOut()}catch(e){}await this.wipeLocal();return true},
  async wipeLocal(){this.conflicts={};clearTimeout(this._t);clearTimeout(this._r);if(this.user)localStorage.removeItem('nv_label_q_'+this.scope()+'_'+this.user.id);for(const t of TABLES){clearTimeout(saveTimer[t]);S[t]=t==='settings'?{app_name:S.settings.app_name,logo:S.settings.logo}:[]}for(const u of urlCache.values())URL.revokeObjectURL(u);urlCache.clear();await IDB.clear('photos');await IDB.clear('kv');this.snap={};for(const t of NV_ORDER.concat(['settings']))this.snap[t]={};this.uploaded.clear();clearSess();reindex();await saveAll();await IDB.put('kv','cloud_me',null);this.role=null;this.emp=null;this.staffRole=null;this.sys=false;this.docAccess={};this.perms=null;this.sub=null;this.user=null;},
  pendingCount(){let n=0;for(const t of this.pushTables())for(const r of S[t]){const s=this.snap[t][r.id];if(s===undefined||s!==this.key(t,r))n++}
    for(const t of this.pushTables())for(const id in this.snap[t])if(!S[t].some(r=>r.id===id))n++;if(this.role==='admin'&&this.snap.settings.data&&this.snap.settings.data!==JSON.stringify(this.settingsRow()))n++;if(this.role==='tech'&&window.labelQ)n+=labelQ().length;return n||Object.keys(this.conflicts).length},
  pushTables(){return this.role==='admin'?NV_ORDER:this.role==='tech'?['collections','schools']:[]},
  orphanPending(){let n=0;for(const t of NV_ORDER){const snap=this.snap[t]||{};for(const row of S[t]||[]){const raw=snap[row.id];if(raw===undefined){n++;continue}const before=JSON.parse(raw),after=this.canon(t,row);if(Object.keys(before).some(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])))n++}for(const id of Object.keys(snap))if(!(S[t]||[]).some(r=>r.id===id))n++}return n},
  /* NV46: «site» (the building form of this customer) is sent only when set, so a database without migration 046 keeps syncing the rest */
  settingsOf(d){d=d||{};const o={app_name:d.app_name||'Solvix',admin_email:d.admin_email||'',logo:d.logo||null,label:d.label||null,geo:d.geo||null,room_tpl:d.room_tpl||null};if(d.site)o.site=d.site;if(d.ops)o.ops=d.ops;if(d.ai)o.ai=d.ai;return o},
  settingsRow(){return this.settingsOf(S.settings)},
  persistConflicts(){return IDB.put('kv','sync_conflicts',this.conflicts)},
  async rememberConflict(table,id,base){const key=table+':'+id;if(!this.conflicts[key])this.conflicts[key]={table,id,base:JSON.parse(JSON.stringify(base)),local:table==='settings'?this.settingsRow():(S[table].find(r=>r.id===id)?this.canon(table,S[table].find(r=>r.id===id)):null),at:new Date().toISOString()};await saveNow(table);await this.persistConflicts()},
  async mutate(table,id,expected,patch,del){try{return this.chk(await (await this.sb()).rpc('nv_sync_mutate',{p_table:NV_T[table],p_id:id,p_expected:expected,p_patch:patch,p_delete:del}))}catch(e){if(/SOLVIX_CONFLICT/.test(e.message))await this.rememberConflict(table,id,expected);throw e}},
  async writeSettings(expected,data){try{return this.chk(await (await this.sb()).rpc('nv_settings_save',{p_expected:expected,p_data:data}))}catch(e){if(/SOLVIX_CONFLICT/.test(e.message))await this.rememberConflict('settings','1',expected);throw e}},
  persistSnap(){return IDB.put('kv','snap',this.snap)},
  touch(t){if(t==='log')return;if(this.role==='reader'||(this.role==='tech'&&this.sub&&this.sub.ok===false)){toast(this.sub&&this.sub.ok===false?'انتهى الاشتراك — النظام للقراءة فقط، ولم يُحفظ هذا التعديل.':'حساب قراءة فقط — لم يُحفظ هذا التعديل.',5000);this.pull(true).then(()=>route());return}this.dirty.add(t);clearTimeout(this._t);this._t=setTimeout(()=>this.sync(),400)},
  /* ---- push ---- */
  async uploadPhoto(k){if(!k||this.uploaded.has(k))return;const b=await IDB.get('photos',k).catch(()=>null);if(!b){this.uploaded.add(k);return}
    const c=await this.sb();const {error}=await c.storage.from('nv-photos').upload(k+'.jpg',b,{contentType:'image/jpeg',upsert:false});if(error&&!/exists|Duplicate/i.test(error.message))throw new Error(error.message);
    this.uploaded.add(k);await IDB.put('kv','uploaded',[...this.uploaded])},
  async fetchPhoto(k){try{const c=await this.sb();const {data,error}=await c.storage.from('nv-photos').download(k+'.jpg');if(error||!data)return null;await IDB.put('photos',k,data);this.uploaded.add(k);return data}catch(e){return null}},
  async sync(){
    if(!this.on||!this.role||this.role==='reader')return;if(this.syncing){this.again=true;return}this.syncing=true;
    try{const c=await this.sb();
      for(const t of NV_ORDER){if(!this.pushTables().includes(t))continue;const snap=this.snap[t];const ins=[],upd=[];
        for(const r of S[t]){const row=this.canon(t,r),js=JSON.stringify(row);if(snap[r.id]===undefined)ins.push([r,row,js]);else if(snap[r.id]!==js)upd.push([r,row,js])}
        const del=Object.keys(snap).filter(id=>!S[t].some(r=>r.id===id));
        if(t==='schools'&&this.role==='tech'){/* a technician only finishes a building, through the server function */
          for(const [r,row,js] of upd){const was=JSON.parse(snap[r.id]);if(row.completed_at&&!was.completed_at){this.chk(await c.rpc('nv_complete_school',{p_school:r.id}))}snap[r.id]=js}
          await this.persistSnap();continue}
        if(t==='collections')for(const [r] of ins.concat(upd)){await this.uploadPhoto(r.school_image);await this.uploadPhoto(r.asset_image);await this.uploadPhoto(r.asset_image2);await this.uploadPhoto(r.label_photo);await this.uploadPhoto(r.exc_photo);for(const x of r.extra_images||[])await this.uploadPhoto(x)}
        for(let i=0;i<ins.length;i+=300){const part=ins.slice(i,i+300);const back=this.chk(await c.from(NV_T[t]).insert(part.map(x=>x[1])).select(t==='collections'?'id,no':'id'));
          for(const [r,,js] of part){snap[r.id]=js}if(t==='collections')for(const b of back||[]){const r=S.collections.find(x=>x.id===b.id);if(r)r.no=b.no}await this.persistSnap()}
        for(const [r,row,js] of upd){const before=JSON.parse(snap[r.id]);const patch={};for(const k of Object.keys(row))if(k!=='id'&&JSON.stringify(row[k])!==JSON.stringify(before[k]))patch[k]=row[k];
          if(this.conflicts[t+':'+r.id])continue;try{await this.mutate(t,r.id,before,patch,false);snap[r.id]=js;await this.persistSnap()}catch(e){if(!/SOLVIX_CONFLICT/.test(e.message))throw e}}
        for(const id of del){if(this.conflicts[t+':'+id])continue;try{await this.mutate(t,id,JSON.parse(snap[id]),{},true);delete snap[id];await this.persistSnap()}catch(e){if(t==='collections'&&/DELETE_REASON_REQUIRED/.test(e.message)){await this.rememberConflict(t,id,JSON.parse(snap[id]));continue}if(!/SOLVIX_CONFLICT/.test(e.message))throw e}}
      }
      if(this.role==='admin'&&(window.can?can('settings'):['owner','manager','sysadmin'].includes(this.staffRole||'owner'))){const st=this.settingsRow();const js=JSON.stringify(st);
        if(this.snap.settings.data!==js&&!this.conflicts['settings:1']){if(!this.snap.settings.data)throw new Error('اسحب الإعدادات من الخادم قبل تعديلها.');await this.writeSettings(JSON.parse(this.snap.settings.data),st);this.snap.settings.data=js;await this.persistSnap()}}
      await saveNow('collections');this.err=Object.keys(this.conflicts).length?new Error('SOLVIX_CONFLICT: توجد تعارضات محفوظة تحتاج مراجعة شاشة المقارنة.'):null;
    }catch(e){
      this.err=e;console.warn('Novaro sync:',e.message);clearTimeout(this._r);if(!/SOLVIX_CONFLICT/.test(e.message))this._r=setTimeout(()=>this.sync(),30000);if(!this._shown){this._shown=1;toast((/SOLVIX_CONFLICT/.test(e.message)?'تعارض بيانات؛ اضغط مؤشر المزامنة لمراجعة نسخة الخادم. ':'لم تُرسل بعض البيانات بعد: ')+(window.limitMsg?limitMsg(e.message):e.message),7000)}}
    finally{this.syncing=false;this.badge();if(this.again){this.again=false;this.sync()}}
  },
  /* ---- pull: the server copy, keeping rows changed on this device that are not sent yet ---- */
  async fetchAll(table,q){const c=await this.sb();const out=[];for(let from=0;;from+=1000){let r=c.from(table).select('*').range(from,from+999);if(!q)r=r.order('id');if(q)r=q(r);const d=this.chk(await r);out.push(...d);if(d.length<1000)break}return out},
  async pull(discard){
    if(!this.on||!this.role)return;
    const tabs=this.role==='tech'?['categories','conditions','rooms','types','employees','schools','collections']:NV_ORDER;
    for(const t of tabs){let rows=await this.fetchAll(NV_T[t],t==='collections'?r=>r.order('no'):null);
      if(t==='employees')rows=rows.map(r=>{const o=Object.assign({},r);delete o.user_id;return o});if(t==='schools')await this.detectExtra(rows);if(t==='collections')await this.detect51(rows);
      const snap=this.snap[t],local=new Map(S[t].map(r=>[r.id,r])),cloudIds=new Set(rows.map(r=>r.id)),next=[],ns={};
      for(const r of rows){if(!discard&&!local.has(r.id)&&snap[r.id]!==undefined){ns[r.id]=snap[r.id];continue}const l=local.get(r.id);const pending=!discard&&l&&snap[r.id]!==undefined&&snap[r.id]!==this.key(t,l);
        ns[r.id]=pending?snap[r.id]:this.key(t,r);if(pending){if(t==='collections')l.no=r.no;next.push(l)}else{const o=Object.assign({},r);for(const k of ['lat','lng','price'])if(o[k]!=null)o[k]=Number(o[k]);next.push(o)}}
      if(!discard)for(const l of S[t])if(!cloudIds.has(l.id)){if(snap[l.id]===undefined)next.push(l);else if(snap[l.id]!==this.key(t,l)){next.push(l);ns[l.id]=snap[l.id]}}
      
      S[t]=next;this.snap[t]=ns}
    if(this.role!=='tech'){S.log=(await this.fetchAll('nv_log',r=>r.order('at',{ascending:false}).limit(3000))).slice(0,3000)}else S.log=[];
    const st=this.chk(await (await this.sb()).rpc('nv_client_settings'));if(st&&st.data&&!(this.snap.settings.data&&!discard&&this.snap.settings.data!==JSON.stringify(this.settingsRow()))){const d=st.data;Object.assign(S.settings,this.settingsOf(d),{site:d.site||null,ops:d.ops||null,ai:d.ai||null});this.snap.settings.data=JSON.stringify(this.settingsRow())}
    if(this.role==='tech'){try{this.busy=new Set(this.chk(await (await this.sb()).rpc('nv_busy_schools'))||[])}catch(e){}}
    reindex();await saveAll();await this.persistSnap();this.lastPull=Date.now();this.badge();
  },
  async loadPublicSettings(){try{const c=await this.sb();const st=this.chk(await c.rpc('nv_public_settings'));if(st&&st.data){Object.assign(S.settings,{app_name:st.data.app_name||S.settings.app_name,logo:st.data.logo||S.settings.logo});await saveNow('settings')}}catch(e){}},
  async resolveConflict(){const hash=this.role==='tech'?'#conflicts':'#admin/conflicts';if(location.hash===hash)route();else location.hash=hash},
  badge(){if(window.nvPendUI)nvPendUI();if(window.flushLabels&&!this.syncing)setTimeout(flushLabels,0);if(window.RD&&!this.syncing)setTimeout(()=>RD.flush(),0);if(window.nvLabelRefresh)setTimeout(nvLabelRefresh,0);const n=this.on&&this.role?this.pendingCount():0;const txt=!this.on?'':this.err&&n?`⚠️ ${n}`:n?`⏳ ${n}`:'☁️';
    $$('[data-nv-sync]').forEach(el=>{el.textContent=txt;el.onclick=Object.keys(this.conflicts).length||this.err&&/SOLVIX_CONFLICT/.test(this.err.message)?()=>this.resolveConflict().catch(e=>toast(e.message,7000)):null;el.style.cursor=el.onclick?'pointer':'';el.title=n?(this.err?('لم يُرسل: '+this.err.message):'بانتظار المزامنة'):'متزامن مع قاعدة Solvix'})}
};
window.Cloud=Cloud;
window.addEventListener('online',()=>Cloud.sync());
</script>
