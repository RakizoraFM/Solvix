-- NV51: field operations.
--  1) exceptions: an asset that could not be reached (exc_kind='access' + reason + photo, set by the supervisor with the record)
--     and a label that could not be stuck (label_check='fail' + label_note + label_photo, through nv_label_fail);
--  2) zone / department of the location (nv_collections.zone);
--  3) rooms marked complete by the supervisor (nv_room_done, written only through nv_room_mark);
--  4) settings key «ops» (daily target, zone field) in nv_settings_save;
--  5) quality page, approval photos and photo access know the exception photo.
begin;
alter table public.nv_collections add column if not exists zone text;
alter table public.nv_collections add column if not exists exc_kind text;
alter table public.nv_collections add column if not exists exc_reason text;
alter table public.nv_collections add column if not exists exc_photo text;
alter table public.nv_collections add column if not exists label_note text;
do $c$ begin alter table public.nv_collections add constraint nv_coll_exc_chk check (exc_kind is null or exc_kind in ('access')); exception when duplicate_object then null; end $c$;
do $c$ begin alter table public.nv_collections add constraint nv_coll_exc_len check (length(coalesce(exc_reason,''))<=500 and length(coalesce(label_note,''))<=500 and length(coalesce(zone,''))<=120); exception when duplicate_object then null; end $c$;
alter table public.nv_collections drop constraint if exists nv_coll_label_chk;
alter table public.nv_collections add constraint nv_coll_label_chk check (label_check is null or label_check in ('ok','unread','fail'));

-- the label fields (now with the note) are still «label only»: no change-log line, review kept
create or replace function public.nv_label_only(o public.nv_collections, n public.nv_collections) returns boolean language sql immutable as $$
  select (to_jsonb(o) - array['label_photo','label_at','label_by','label_check','label_printed_at','label_note','updated_at']) = (to_jsonb(n) - array['label_photo','label_at','label_by','label_check','label_printed_at','label_note','updated_at']) $$;

-- the change log also follows the zone and the access exception
create or replace function public.nv_coll_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare ch jsonb := '{}'; k text; o jsonb; n jsonb;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and public.nv_label_only(old, new) then return new; end if;
  if not public.nv_perm('review') then
    if tg_op = 'INSERT' then new.review_status := null; new.review_note := ''; new.reviewed_at := null; new.reviewed_by := null;
    elsif public.nv_my_emp() is not null and not public.nv_can_read() then new.review_status := null; new.review_note := old.review_note; new.reviewed_at := old.reviewed_at; new.reviewed_by := old.reviewed_by;
    else new.review_status := old.review_status; new.review_note := old.review_note; new.reviewed_at := old.reviewed_at; new.reviewed_by := old.reviewed_by; end if;
  end if;
  if new.exc_kind is null then new.exc_reason := null; new.exc_photo := null; end if;
  if tg_op = 'UPDATE' and old.submitted_at is not null then
    o := to_jsonb(old); n := to_jsonb(new);
    for k in select unnest(array['category_id','type_id','condition_id','quantity','price','status','manufacturer','brand','model','capacity','serial','agency',
               'warranty','install_date','asad_country','lat','lng','asset_image','asset_image2','extra_images','parent_child','tag','notes','floor','room_number','room_name_id','employee_id','school_id','school_image',
               'zone','exc_kind','exc_reason','exc_photo']) loop
      if (o->k) is distinct from (n->k) then ch := ch || jsonb_build_object(k, jsonb_build_object('old', o->k, 'new', n->k)); end if;
    end loop;
    if ch <> '{}' then
      insert into public.nv_log(by, coll, school, emp, changes) values (case when public.nv_is_admin() then 'admin' else 'emp:'||coalesce(public.nv_my_emp(),'?') end,
        new.id, new.school_id, new.employee_id, ch);
    end if;
  end if;
  return new;
end $$;

-- a confirmed label clears an earlier «could not stick» note
create or replace function public.nv_label_confirm(p_id text, p_photo text, p_check text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.nv_collections; me text := public.nv_my_emp(); who text;
begin
  select * into c from public.nv_collections where id = p_id;
  if c.id is null then raise exception 'asset not found'; end if;
  if not (public.nv_perm('edit') or (me is not null and c.employee_id = me and public.nv_sub_ok())) then raise exception 'not allowed' using errcode = '42501'; end if;
  if c.submitted_at is null or c.type_id is null then raise exception 'asset not submitted'; end if;
  if coalesce(p_photo,'') = '' then raise exception 'label photo required'; end if;
  who := case when me is not null then 'emp:' || me else coalesce((select email from public.nv_staff where user_id = auth.uid()), 'admin') end;
  update public.nv_collections set label_photo = p_photo, label_at = now(), label_by = who, label_printed_at = coalesce(label_printed_at, now()), label_note = null,
    label_check = case when p_check = 'ok' then 'ok' else 'unread' end where id = p_id;
  return (select jsonb_build_object('label_at', label_at, 'label_by', label_by, 'label_check', label_check) from public.nv_collections where id = p_id);
end $$;
-- the label could not be stuck: a reason and a photo of the place, same rights as the confirmation
create or replace function public.nv_label_fail(p_id text, p_photo text, p_reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.nv_collections; me text := public.nv_my_emp(); who text;
begin
  select * into c from public.nv_collections where id = p_id;
  if c.id is null then raise exception 'asset not found'; end if;
  if not (public.nv_perm('edit') or (me is not null and c.employee_id = me and public.nv_sub_ok())) then raise exception 'not allowed' using errcode = '42501'; end if;
  if c.submitted_at is null or c.type_id is null then raise exception 'asset not submitted'; end if;
  if coalesce(p_photo,'') = '' then raise exception 'exception photo required'; end if;
  if length(trim(coalesce(p_reason,''))) = 0 or length(p_reason) > 500 then raise exception 'exception reason required'; end if;
  who := case when me is not null then 'emp:' || me else coalesce((select email from public.nv_staff where user_id = auth.uid()), 'admin') end;
  update public.nv_collections set label_photo = p_photo, label_at = now(), label_by = who, label_check = 'fail', label_note = trim(p_reason) where id = p_id;
  return (select jsonb_build_object('label_at', label_at, 'label_by', label_by, 'label_check', label_check) from public.nv_collections where id = p_id);
end $$;
revoke all on function public.nv_label_confirm(text,text,text), public.nv_label_fail(text,text,text), public.nv_label_only(public.nv_collections, public.nv_collections) from public, anon;
grant execute on function public.nv_label_confirm(text,text,text), public.nv_label_fail(text,text,text) to authenticated;

-- rooms marked complete
create table if not exists public.nv_room_done(
  id text primary key, school_id text not null references public.nv_schools(id) on delete cascade,
  floor text not null default '', room_number text not null default '', room_name_id text not null default '',
  employee_id text, done_at timestamptz not null default now(), done_by text not null default '');
create index if not exists nv_room_done_school on public.nv_room_done(school_id);
alter table public.nv_room_done enable row level security;
drop policy if exists p_nv_room_done_read on public.nv_room_done;
create policy p_nv_room_done_read on public.nv_room_done for select using (public.nv_can_read() or (employee_id is not null and employee_id = public.nv_my_emp()));
create or replace function public.nv_room_mark(p_school text, p_floor text, p_room text, p_name text, p_done boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare me text := public.nv_my_emp(); k text; who text;
begin
  if not (public.nv_perm('edit') or (me is not null and public.nv_emp_perm('collect') and public.nv_sub_ok()
          and exists(select 1 from public.nv_collections c where c.school_id = p_school and c.employee_id = me))) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists(select 1 from public.nv_schools where id = p_school) then raise exception 'building not found'; end if;
  k := p_school || '|' || coalesce(p_floor,'') || '|' || coalesce(p_room,'') || '|' || coalesce(p_name,'');
  if not coalesce(p_done,false) then delete from public.nv_room_done where id = k and (public.nv_perm('edit') or employee_id = me); return jsonb_build_object('id', k, 'done', false); end if;
  who := case when me is not null then 'emp:' || me else coalesce((select email from public.nv_staff where user_id = auth.uid()), 'admin') end;
  insert into public.nv_room_done(id, school_id, floor, room_number, room_name_id, employee_id, done_at, done_by)
    values (k, p_school, coalesce(p_floor,''), coalesce(p_room,''), coalesce(p_name,''), me, now(), who)
    on conflict (id) do update set done_at = now(), done_by = excluded.done_by, employee_id = coalesce(excluded.employee_id, public.nv_room_done.employee_id);
  return jsonb_build_object('id', k, 'done', true, 'done_at', now());
end $$;
revoke all on function public.nv_room_mark(text,text,text,text,boolean) from public, anon;
grant execute on function public.nv_room_mark(text,text,text,text,boolean) to authenticated;
grant select on public.nv_room_done to authenticated;

-- the exception photo is readable / protected like the other photos
create or replace function public.nv_photo_read(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select public.nv_member() and exists(select 1 from public.nv_collections c where
   (public.nv_can_read() or c.employee_id=public.nv_my_emp()) and
   p_name=any(array[c.school_image||'.jpg',c.asset_image||'.jpg',c.asset_image2||'.jpg',c.label_photo||'.jpg',c.exc_photo||'.jpg']||
     array(select x||'.jpg' from unnest(c.extra_images) x)))
$$;
create or replace function public.nv_photo_unreferenced(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select not exists(select 1 from public.nv_collections c where p_name=any(array[c.school_image||'.jpg',c.asset_image||'.jpg',c.asset_image2||'.jpg',c.label_photo||'.jpg',c.exc_photo||'.jpg']||array(select x||'.jpg' from unnest(c.extra_images) x)))
 and not exists(select 1 from public.nv_asset_trash t where t.restored_at is null and t.expires_at>now() and p_name=any(array[(t.snapshot->>'school_image')||'.jpg',(t.snapshot->>'asset_image')||'.jpg',(t.snapshot->>'asset_image2')||'.jpg',(t.snapshot->>'label_photo')||'.jpg',(t.snapshot->>'exc_photo')||'.jpg']||array(select x||'.jpg' from jsonb_array_elements_text(coalesce(t.snapshot->'extra_images','[]')) x)))
 and not exists(select 1 from (select from_data snapshot from public.nv_asset_movements union all select before_data from public.nv_asset_splits) h
 where p_name=any(array[(h.snapshot->>'school_image')||'.jpg',(h.snapshot->>'asset_image')||'.jpg',(h.snapshot->>'asset_image2')||'.jpg',(h.snapshot->>'label_photo')||'.jpg',(h.snapshot->>'exc_photo')||'.jpg']||array(select x||'.jpg' from jsonb_array_elements_text(coalesce(h.snapshot->'extra_images','[]')) x)))
$$;

-- the serial check also returns the record number, so the page formats the label with the customer's own format
create or replace function public.nv_serial_dupes(p_serial text, p_id text default null) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('label', '101' || lpad(c.no::text, 8, '0'), 'no', c.no, 'school', s.name, 'mine', c.employee_id = public.nv_my_emp()) order by c.no), '[]')
  from (select * from public.nv_collections c0
         where public.nv_member() and length(regexp_replace(upper(coalesce(p_serial,'')), '[^A-Z0-9]', '', 'g')) >= 4 and c0.id is distinct from p_id and c0.type_id is not null
           and regexp_replace(upper(c0.serial), '[^A-Z0-9]', '', 'g') = regexp_replace(upper(p_serial), '[^A-Z0-9]', '', 'g') limit 5) c
  left join public.nv_schools s on s.id = c.school_id $$;
revoke all on function public.nv_serial_dupes(text,text) from public, anon;
grant execute on function public.nv_serial_dupes(text,text) to authenticated;

-- an approval path that requires photos accepts the exception photo of an unreachable asset
create or replace function public.nv_approval_act(p_asset text,p_revision bigint,p_action text,p_note text default '',p_request uuid default gen_random_uuid())
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.nv_collections; r public.nv_approval_runs; p public.nv_approval_paths; who text; final_stage boolean;
begin
 if not public.nv_perm('review') then raise exception 'review permission required' using errcode='42501';end if;
 select * into c from public.nv_collections where id=p_asset for update;
 if c.id is null then raise exception 'asset not found';end if;
 select * into r from public.nv_approval_runs where asset_id=p_asset for update;
 if r.asset_id is null then raise exception 'inventory has not been submitted';end if;
 if exists(select 1 from public.nv_approval_events where request_id=p_request and asset_id=p_asset and actor=auth.uid()) then return to_jsonb(r);end if;
 if r.revision is distinct from p_revision then raise exception 'APPROVAL_CONFLICT: reload the latest approval state';end if;
 select * into p from public.nv_approval_paths where id=r.path_id;
 if r.status<>'pending' then raise exception 'inventory is not waiting for approval';end if;
 if not coalesce(public.nv_approval_stage_allowed(p.stages->r.stage_index),false) then raise exception 'this stage is assigned to another approver' using errcode='42501';end if;
 if p_action not in('approve','return') or p_action is null then raise exception 'invalid approval action';end if;
 if length(coalesce(p_note,''))>2000 or (p_action='return' and length(trim(coalesce(p_note,'')))=0) then raise exception 'return reason is required (maximum 2000 characters)';end if;
 final_stage:=r.stage_index+1>=jsonb_array_length(p.stages);
 if p_action='approve' and final_stage then
  if coalesce((p.requirements->>'photos')::boolean,false) and (not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=case when c.exc_kind='access' then c.exc_photo else c.asset_image end||'.jpg')) then raise exception 'required asset photos are missing';end if;
  if coalesce((p.requirements->>'serial')::boolean,false) and lower(trim(coalesce(c.serial,''))) in('','n/a','na','none','unknown','غير متوفر','لا يوجد','بدون') then raise exception 'serial number required';end if;
  if coalesce((p.requirements->>'review')::boolean,false) and c.review_status is distinct from 'ok' then raise exception 'photo review must be completed';end if;
 end if;
 who:=coalesce((select email from public.nv_staff where user_id=auth.uid()),'admin');
 insert into public.nv_approval_events(asset_id,actor,actor_label,action,path_id,stage_index,note,revision,request_id)
 values(p_asset,auth.uid(),who,p_action,r.path_id,r.stage_index,trim(coalesce(p_note,'')),r.revision+1,p_request);
 update public.nv_approval_runs set
  status=case when p_action='return' then 'returned' when final_stage then 'approved' else 'pending' end,
  stage_index=case when p_action='approve' and not final_stage then stage_index+1 else stage_index end,
  last_note=trim(coalesce(p_note,'')),revision=revision+1,updated_at=now() where asset_id=p_asset returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.nv_approval_act(text,bigint,text,text,uuid) from public,anon;
grant execute on function public.nv_approval_act(text,bigint,text,text,uuid) to authenticated;

-- «جودة البيانات»: exceptions are counted and filtered (issue 'exceptions'); an unreachable asset is judged by its exception photo
create or replace function public.nv_quality_page(p_school text default null,p_employee text default null,p_issue text default 'all',p_query text default '',p_offset int default 0,p_limit int default 50)
returns jsonb language sql stable security definer set search_path=public as $$
 with visible as (
  select c.*,s.name as building_name,e.name as employee_name,t.ar as type_name,r.status as approval_status
  from public.nv_collections c left join public.nv_schools s on s.id=c.school_id
  left join public.nv_employees e on e.id=c.employee_id left join public.nv_types t on t.id=c.type_id
  left join public.nv_approval_runs r on r.asset_id=c.id
  where c.submitted_at is not null and c.type_id is not null and (public.nv_can_read() or c.employee_id=public.nv_my_emp())
   and (p_school is null or c.school_id=p_school) and (p_employee is null or c.employee_id=p_employee)
   and (coalesce(p_query,'')='' or strpos(lower(concat_ws(' ',c.no::text,c.serial,c.brand,c.model,s.name,t.ar)),lower(p_query))>0)
 ), flags as (
  select v.*,not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=case when v.exc_kind='access' then v.exc_photo else v.asset_image end||'.jpg') as missing_photo,
   (v.exc_kind is not null or v.label_check='fail') as has_exception,
   not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=v.asset_image2||'.jpg') as missing_nameplate,
   lower(trim(coalesce(v.serial,''))) in('','n/a','na','none','unknown','غير متوفر','لا يوجد','بدون') as missing_serial,
   v.review_status is distinct from 'ok' as missing_review from visible v
 ), chosen as (
  select * from flags where case p_issue
   when 'photos' then missing_photo when 'serial' then missing_serial when 'review' then missing_review
   when 'approval' then approval_status is distinct from 'approved' when 'returned' then review_status='returned' or approval_status='returned'
   when 'exceptions' then has_exception when 'complete' then not(missing_photo or missing_serial or missing_review)
   when 'all_assets' then true else missing_photo or missing_serial or missing_review end
 ), paged as (select * from chosen order by no,id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),200))
 select jsonb_build_object('checked_at',now(),'source','server','scope_total',(select count(*) from flags),
  'with_issues',(select count(*) from flags where missing_photo or missing_serial or missing_review),
  'photos',(select count(*) from flags where missing_photo),'serial',(select count(*) from flags where missing_serial),
  'review',(select count(*) from flags where missing_review),'approval',(select count(*) from flags where approval_status is distinct from 'approved'),
  'exceptions',(select count(*) from flags where has_exception),
  'filtered_total',(select count(*) from chosen),'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.no,p.id) from paged p),'[]'))
$$;
revoke all on function public.nv_quality_page(text,text,text,text,int,int) from public,anon;
grant execute on function public.nv_quality_page(text,text,text,text,int,int) to authenticated;

-- settings key «ops» (sent only once set, like «site»)
create or replace function public.nv_settings_save(p_expected jsonb,p_data jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare d jsonb; projection jsonb;
begin
  if not public.nv_perm('settings') then raise exception 'not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_expected) is distinct from 'object' or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid settings'; end if;
  if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('app_name','admin_email','logo','label','geo','room_tpl','site','ops')) then raise exception 'unknown setting'; end if;
  -- the building form: {fields:{key:{on,l}}, extra:[{k,l,t,opts,req}]}, at most 40 own fields
  if p_data ? 'site' and (jsonb_typeof(p_data->'site') is distinct from 'object' or pg_column_size(p_data->'site')>20000
     or (p_data->'site' ? 'extra' and (jsonb_typeof(p_data->'site'->'extra') is distinct from 'array' or jsonb_array_length(p_data->'site'->'extra')>40))) then
    raise exception 'invalid building form'; end if;
  -- NV51 «ops»: {target: assets per supervisor per day, zone: {on, l}}
  if p_data ? 'ops' and (jsonb_typeof(p_data->'ops') is distinct from 'object' or pg_column_size(p_data->'ops')>4000) then raise exception 'invalid ops settings'; end if;
  select data into d from public.nv_settings where id=1 for update;
  projection:=jsonb_build_object('app_name',coalesce(nullif(d->>'app_name',''),'Solvix'),'admin_email',coalesce(d->>'admin_email',''),
     'logo',d->'logo','label',d->'label','geo',d->'geo','room_tpl',d->'room_tpl')
     -- «site» takes part only once it is set, like the client (Cloud.settingsOf)
     ||case when jsonb_typeof(d->'site')='object' then jsonb_build_object('site',d->'site') else '{}'::jsonb end
     ||case when jsonb_typeof(d->'ops')='object' then jsonb_build_object('ops',d->'ops') else '{}'::jsonb end;
  if projection is distinct from p_expected then raise exception 'SOLVIX_CONFLICT:nv_settings:1'; end if;
  update public.nv_settings set data=d||p_data,updated_at=now() where id=1;
end $$;
revoke all on function public.nv_settings_save(jsonb,jsonb) from public,anon;
grant execute on function public.nv_settings_save(jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
