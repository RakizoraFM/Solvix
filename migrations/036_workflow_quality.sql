-- Apply after NV35 in the provider and every independent client project.
begin;
create table if not exists public.nv_approval_paths(
 id uuid primary key default gen_random_uuid(),version bigint generated always as identity unique,name text not null,
 stages jsonb not null,requirements jsonb not null default '{"photos":false,"serial":false,"review":false}',active boolean not null default false,
 created_at timestamptz not null default now(),created_by uuid);
create unique index if not exists nv_approval_one_active on public.nv_approval_paths(active) where active;
insert into public.nv_approval_paths(name,stages,active)
 select 'الاعتماد الافتراضي','[{"id":"review","name":"اعتماد الجرد","roles":["owner","manager","coordinator","sysadmin"],"users":[]}]',true
 where not exists(select 1 from public.nv_approval_paths where active);
create table if not exists public.nv_approval_runs(
 asset_id text primary key references public.nv_collections(id) on delete cascade,path_id uuid not null references public.nv_approval_paths(id),
 stage_index int not null default 0 check(stage_index>=0),status text not null default 'pending' check(status in('pending','returned','approved')),
 revision bigint not null default 1,last_note text not null default '',updated_at timestamptz not null default now());
create index if not exists nv_approval_queue on public.nv_approval_runs(status,path_id,stage_index);
create table if not exists public.nv_approval_events(
 id bigint generated always as identity primary key,asset_id text not null,at timestamptz not null default now(),actor uuid,actor_label text,
 action text not null,path_id uuid,stage_index int,note text not null default '',revision bigint not null,request_id uuid unique);
create index if not exists nv_approval_history on public.nv_approval_events(asset_id,id desc);
alter table public.nv_approval_paths enable row level security;
alter table public.nv_approval_runs enable row level security;
alter table public.nv_approval_events enable row level security;
revoke all on public.nv_approval_paths,public.nv_approval_runs,public.nv_approval_events from public,anon,authenticated;
grant select on public.nv_approval_paths,public.nv_approval_runs,public.nv_approval_events to authenticated;
grant all on public.nv_approval_paths,public.nv_approval_runs,public.nv_approval_events to service_role;
grant usage,select on sequence public.nv_approval_paths_version_seq,public.nv_approval_events_id_seq to service_role;
drop policy if exists approval_paths_read on public.nv_approval_paths;
create policy approval_paths_read on public.nv_approval_paths for select to authenticated using(public.nv_member());
drop policy if exists approval_runs_read on public.nv_approval_runs;
create policy approval_runs_read on public.nv_approval_runs for select to authenticated using(exists(
 select 1 from public.nv_collections c where c.id=asset_id and (public.nv_can_read() or c.employee_id=public.nv_my_emp())));
drop policy if exists approval_events_read on public.nv_approval_events;
create policy approval_events_read on public.nv_approval_events for select to authenticated using(public.nv_can_read() or exists(
 select 1 from public.nv_collections c where c.id=asset_id and c.employee_id=public.nv_my_emp()));

create or replace function public.nv_approval_stage_allowed(p_stage jsonb) returns boolean
language sql stable security definer set search_path=public as $$
 select public.nv_perm('review') and (public.nv_is_sys() or
  coalesce(p_stage->'users','[]') ? auth.uid()::text or coalesce(p_stage->'roles','[]') ? public.nv_my_role())
$$;
revoke all on function public.nv_approval_stage_allowed(jsonb) from public,anon;
grant execute on function public.nv_approval_stage_allowed(jsonb) to authenticated;

-- Runs are managed only by the server. Asset edits restart their existing route;
-- photo-review and label metadata are independent and do not restart it.
create or replace function public.nv_approval_track() returns trigger
language plpgsql security definer set search_path=public as $$
declare r public.nv_approval_runs; pid uuid; ignored text[]:=array['updated_at','review_status','review_note','reviewed_at','reviewed_by',
 'label_photo','label_at','label_by','label_check','label_printed_at','no'];
begin
 if new.submitted_at is null or new.type_id is null then
  if tg_op='UPDATE' and exists(select 1 from public.nv_approval_runs where asset_id=new.id) then
   raise exception 'submitted inventory cannot be reverted to a draft; return it for correction';
  end if;
  return null;
 end if;
 select * into r from public.nv_approval_runs where asset_id=new.id for update;
 if r.asset_id is null then
  select id into pid from public.nv_approval_paths where active;
  insert into public.nv_approval_runs(asset_id,path_id) values(new.id,pid) returning * into r;
  insert into public.nv_approval_events(asset_id,actor,actor_label,action,path_id,stage_index,revision)
   values(new.id,auth.uid(),coalesce(public.nv_my_role(),'field'),'submitted',pid,0,r.revision);
 elsif tg_op='UPDATE' and ((to_jsonb(old)-ignored) is distinct from (to_jsonb(new)-ignored) or (old.review_status='ok' and new.review_status is distinct from 'ok' and exists(select 1 from public.nv_approval_paths where id=r.path_id and coalesce((requirements->>'review')::boolean,false)))) then
  update public.nv_approval_runs set status='pending',stage_index=0,revision=revision+1,last_note='',updated_at=now() where asset_id=new.id returning * into r;
  insert into public.nv_approval_events(asset_id,actor,actor_label,action,path_id,stage_index,note,revision)
   values(new.id,auth.uid(),coalesce(public.nv_my_role(),'field'),'data_changed',r.path_id,0,'تغيرت بيانات الأصل؛ أعيد الاعتماد من المرحلة الأولى',r.revision);
 end if;
 return null;
end $$;
drop trigger if exists nv_approval_track_t on public.nv_collections;
create trigger nv_approval_track_t after insert or update on public.nv_collections for each row execute function public.nv_approval_track();
insert into public.nv_approval_runs(asset_id,path_id)
 select c.id,p.id from public.nv_collections c cross join public.nv_approval_paths p
 where c.submitted_at is not null and c.type_id is not null and p.active on conflict(asset_id) do nothing;
insert into public.nv_approval_events(asset_id,actor_label,action,path_id,stage_index,note,revision)
 select r.asset_id,'النظام','migration',r.path_id,0,'أدرج الجرد السابق في مسار الاعتماد دون تغيير مراجعة صوره',r.revision
 from public.nv_approval_runs r where not exists(select 1 from public.nv_approval_events e where e.asset_id=r.asset_id);

create or replace function public.nv_approval_path_save(p_name text,p_stages jsonb,p_requirements jsonb,p_migrate boolean default false,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare s jsonb; x text; p public.nv_approval_paths; r public.nv_approval_runs; c record; count_moved int:=0;
begin
 if not public.nv_perm('settings') then raise exception 'not allowed' using errcode='42501';end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 120 or jsonb_typeof(p_stages) is distinct from 'array' then raise exception 'invalid approval path';end if;
 if jsonb_array_length(p_stages) not between 1 and 8 then raise exception 'approval path needs 1 to 8 stages';end if;
 if jsonb_typeof(p_requirements) is distinct from 'object' or exists(select 1 from jsonb_each(p_requirements) e where e.key not in('photos','serial','review') or jsonb_typeof(e.value)<>'boolean') then raise exception 'invalid approval requirements';end if;
 for s in select * from jsonb_array_elements(p_stages) loop
  if jsonb_typeof(s) is distinct from 'object' or length(trim(coalesce(s->>'name',''))) not between 1 and 120 or length(coalesce(s->>'id','')) not between 1 and 80 then raise exception 'invalid stage';end if;
  if jsonb_typeof(s->'roles') is distinct from 'array' or jsonb_typeof(s->'users') is distinct from 'array' then raise exception 'invalid stage assignees';end if;
  if jsonb_array_length(s->'roles')+jsonb_array_length(s->'users')=0 then raise exception 'stage requires an assignee';end if;
  for x in select jsonb_array_elements_text(s->'roles') loop
   if x not in('sysadmin','owner','manager','coordinator','reader') then raise exception 'invalid stage role';end if;
  end loop;
  for x in select jsonb_array_elements_text(s->'users') loop
   if not exists(select 1 from public.nv_staff where user_id::text=x and active) then raise exception 'stage user is not active';end if;
  end loop;
  if not exists(select 1 from public.nv_staff u where u.active and
   (u.role='sysadmin' or coalesce((u.perms->>'review')::boolean,public.nv_role_perm(u.role,'review'))) and
   ((s->'roles') ? u.role or (s->'users') ? u.user_id::text)) then raise exception 'stage has no active reviewer';end if;
 end loop;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_stages))<>jsonb_array_length(p_stages) then raise exception 'duplicate stage identifiers';end if;
 if p_migrate and length(trim(coalesce(p_reason,''))) not between 1 and 2000 then raise exception 'reason required for rerouting existing inventory';end if;
 -- Every path editor locks the same row. Existing asset runs retain immutable path versions.
 perform 1 from public.nv_settings where id=1 for update;
 update public.nv_approval_paths set active=false where active;
 insert into public.nv_approval_paths(name,stages,requirements,active,created_by)
 values(trim(p_name),p_stages,p_requirements,true,auth.uid()) returning * into p;
 if p_migrate then
  -- Use the same asset -> run lock order as edit and decision operations.
  for c in select a.id from public.nv_collections a join public.nv_approval_runs w on w.asset_id=a.id where w.status<>'approved' order by a.id loop
   perform 1 from public.nv_collections where id=c.id for update;
   select * into r from public.nv_approval_runs where asset_id=c.id for update;
   if r.asset_id is not null and r.status<>'approved' then
    update public.nv_approval_runs set path_id=p.id,stage_index=0,status='pending',last_note=trim(p_reason),revision=revision+1,updated_at=now() where asset_id=c.id returning * into r;
    insert into public.nv_approval_events(asset_id,actor,actor_label,action,path_id,stage_index,note,revision)
    values(r.asset_id,auth.uid(),coalesce((select email from public.nv_staff where user_id=auth.uid()),'admin'),'rerouted',p.id,0,trim(p_reason),r.revision);
    count_moved:=count_moved+1;
   end if;
  end loop;
 end if;
 insert into public.nv_audit(actor,table_name,operation,row_id,new_data) values(auth.uid(),'nv_approval_paths','PATH_CREATED',p.id::text,to_jsonb(p)||jsonb_build_object('migrated',count_moved));
 return to_jsonb(p)||jsonb_build_object('migrated',count_moved);
end $$;
revoke all on function public.nv_approval_path_save(text,jsonb,jsonb,boolean,text) from public,anon;
grant execute on function public.nv_approval_path_save(text,jsonb,jsonb,boolean,text) to authenticated;

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
  if coalesce((p.requirements->>'photos')::boolean,false) and (not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=c.asset_image||'.jpg') or not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=c.asset_image2||'.jpg')) then raise exception 'required asset photos are missing';end if;
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

create or replace function public.nv_approval_reroute(p_asset text,p_path uuid,p_revision bigint,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.nv_approval_runs;
begin
 if not public.nv_perm('settings') then raise exception 'not allowed' using errcode='42501';end if;
 if length(trim(coalesce(p_reason,''))) not between 1 and 2000 then raise exception 'reroute reason required';end if;
 if not exists(select 1 from public.nv_approval_paths where id=p_path) then raise exception 'path not found';end if;
 perform 1 from public.nv_collections where id=p_asset for update;
 select * into r from public.nv_approval_runs where asset_id=p_asset for update;
 if r.asset_id is null then raise exception 'inventory not submitted';end if;
 if r.revision is distinct from p_revision then raise exception 'APPROVAL_CONFLICT: reload the latest approval state';end if;
 update public.nv_approval_runs set path_id=p_path,stage_index=0,status='pending',revision=revision+1,last_note=trim(p_reason),updated_at=now() where asset_id=p_asset returning * into r;
 insert into public.nv_approval_events(asset_id,actor,actor_label,action,path_id,stage_index,note,revision)
 values(p_asset,auth.uid(),coalesce((select email from public.nv_staff where user_id=auth.uid()),'admin'),'rerouted',p_path,0,trim(p_reason),r.revision);
 return to_jsonb(r);
end $$;
revoke all on function public.nv_approval_reroute(text,uuid,bigint,text) from public,anon;
grant execute on function public.nv_approval_reroute(text,uuid,bigint,text) to authenticated;

-- Server-backed diagnostics. All aggregates and rows share one SQL snapshot and scope.
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
  select v.*,not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=v.asset_image||'.jpg') as missing_photo,
   not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=v.asset_image2||'.jpg') as missing_nameplate,
   lower(trim(coalesce(v.serial,''))) in('','n/a','na','none','unknown','غير متوفر','لا يوجد','بدون') as missing_serial,
   v.review_status is distinct from 'ok' as missing_review from visible v
 ), chosen as (
  select * from flags where case p_issue
   when 'photos' then missing_photo or missing_nameplate when 'serial' then missing_serial when 'review' then missing_review
   when 'approval' then approval_status is distinct from 'approved' when 'returned' then review_status='returned' or approval_status='returned'
   when 'complete' then not(missing_photo or missing_nameplate or missing_serial or missing_review)
   when 'all_assets' then true else missing_photo or missing_nameplate or missing_serial or missing_review end
 ), paged as (select * from chosen order by no,id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),200))
 select jsonb_build_object('checked_at',now(),'source','server','scope_total',(select count(*) from flags),
  'with_issues',(select count(*) from flags where missing_photo or missing_nameplate or missing_serial or missing_review),
  'photos',(select count(*) from flags where missing_photo or missing_nameplate),'serial',(select count(*) from flags where missing_serial),
  'review',(select count(*) from flags where missing_review),'approval',(select count(*) from flags where approval_status is distinct from 'approved'),
  'filtered_total',(select count(*) from chosen),'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.no,p.id) from paged p),'[]'))
$$;
revoke all on function public.nv_quality_page(text,text,text,text,int,int) from public,anon;
grant execute on function public.nv_quality_page(text,text,text,text,int,int) to authenticated;

-- Published evidence is immutable. Taking a new photo creates a new key and an
-- asset edit, which restarts the approval run. Service operators retain maintenance access.
create or replace function public.nv_photo_unreferenced(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select not exists(select 1 from public.nv_collections c where p_name=any(
  array[c.school_image||'.jpg',c.asset_image||'.jpg',c.asset_image2||'.jpg',c.label_photo||'.jpg']||array(select x||'.jpg' from unnest(c.extra_images) x)))
$$;
revoke all on function public.nv_photo_unreferenced(text) from public,anon;
grant execute on function public.nv_photo_unreferenced(text) to authenticated;
drop policy if exists p_nv_obj_update on storage.objects;
create policy p_nv_obj_update on storage.objects for update to authenticated using(bucket_id='nv-photos' and public.nv_photo_unreferenced(name) and
 (public.nv_perm('edit') or (owner=auth.uid() and public.nv_emp_perm('collect')))) with check(bucket_id='nv-photos' and public.nv_photo_unreferenced(name) and
 (public.nv_perm('edit') or (owner=auth.uid() and public.nv_emp_perm('collect'))));
drop policy if exists p_nv_obj_delete on storage.objects;
create policy p_nv_obj_delete on storage.objects for delete to authenticated using(bucket_id='nv-photos' and public.nv_perm('delete') and public.nv_photo_unreferenced(name));

create or replace function public.nv_public_settings() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('schema_version',36,'data',jsonb_build_object('app_name',data->>'app_name','logo',data->'logo')) from public.nv_settings where id=1
$$;
notify pgrst,'reload schema';
commit;
