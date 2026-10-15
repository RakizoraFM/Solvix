-- NV34. Apply AFTER the existing solvix_setup.sql on an existing installation.
-- On new installations this migration is already appended to solvix_setup.sql.
begin;

-- Only trusted database operators provision the initial system administrator.
drop trigger if exists nv_first_admin_t on auth.users;

-- A data editor must never rebind an authentication identity or grant permissions.
revoke insert, update on public.nv_employees from authenticated;
grant insert(id,number,name,email,created_at), update(number,name,email) on public.nv_employees to authenticated;

-- Anonymous clients receive only the branding, never the settings document.
revoke select on public.nv_settings from anon;
revoke update on public.nv_settings from authenticated;
drop policy if exists p_nv_set_read on public.nv_settings;
create policy p_nv_set_read on public.nv_settings for select to authenticated using(public.nv_can_read());
create or replace function public.nv_public_settings() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object('schema_version',34,'data',jsonb_build_object('app_name',data->>'app_name','logo',data->'logo')) from public.nv_settings where id=1
$$;
create or replace function public.nv_client_settings() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object('data',case when public.nv_can_read() then data else data-'admin_email' end)
  from public.nv_settings where id=1 and public.nv_member()
$$;
revoke all on function public.nv_public_settings(), public.nv_client_settings() from public,anon;
grant execute on function public.nv_public_settings() to anon,authenticated;
grant execute on function public.nv_client_settings() to authenticated;

-- Compare the previous snapshot while holding a row lock. Invoker privileges and
-- RLS still govern every SELECT, UPDATE and DELETE; never use SECURITY DEFINER here.
create or replace function public.nv_sync_mutate(p_table text,p_id text,p_expected jsonb,p_patch jsonb,p_delete boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare cur jsonb; expected_typed jsonb; k text; assignments text; affected int;
begin
  if p_table not in ('nv_categories','nv_conditions','nv_rooms','nv_types','nv_employees','nv_schools','nv_collections')
     or p_table is null then raise exception 'invalid table'; end if;
  if jsonb_typeof(p_expected) is distinct from 'object' or jsonb_typeof(p_patch) is distinct from 'object'
     or p_expected->>'id' is distinct from p_id then raise exception 'invalid snapshot'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_table) into cur using p_id;
  if cur is null then raise exception 'SOLVIX_CONFLICT:%:%',p_table,p_id; end if;
  execute format('select to_jsonb(jsonb_populate_record(null::public.%I,$1))',p_table) into expected_typed using p_expected;
  for k in select jsonb_object_keys(p_expected) loop
    if not cur ? k then raise exception 'unknown snapshot column: %',k; end if;
    if cur->k is distinct from expected_typed->k then raise exception 'SOLVIX_CONFLICT:%:%',p_table,p_id; end if;
  end loop;
  if p_delete then
    execute format('delete from public.%I where id=$1',p_table) using p_id;
  else
    for k in select jsonb_object_keys(p_patch) loop
      if not cur ? k or k in ('id','no','user_id','perms','created_at','updated_at','assigned_employee_id') then
        raise exception 'protected or unknown column: %',k using errcode='42501';
      end if;
    end loop;
    select string_agg(format('%I = v.%I',x,x),',') into assignments from jsonb_object_keys(p_patch) x;
    if assignments is null then return cur; end if;
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$2) v where t.id=$1',p_table,assignments,p_table)
      using p_id,p_patch;
  end if;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'mutation not permitted' using errcode='42501'; end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.nv_sync_mutate(text,text,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.nv_sync_mutate(text,text,jsonb,jsonb,boolean) to authenticated;

create or replace function public.nv_settings_save(p_expected jsonb,p_data jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare d jsonb; projection jsonb;
begin
  if not public.nv_perm('settings') then raise exception 'not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_expected) is distinct from 'object' or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid settings'; end if;
  if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('app_name','admin_email','logo','label','geo','room_tpl')) then raise exception 'unknown setting'; end if;
  select data into d from public.nv_settings where id=1 for update;
  projection:=jsonb_build_object('app_name',coalesce(nullif(d->>'app_name',''),'Solvix'),'admin_email',coalesce(d->>'admin_email',''),
     'logo',d->'logo','label',d->'label','geo',d->'geo','room_tpl',d->'room_tpl');
  if projection is distinct from p_expected then raise exception 'SOLVIX_CONFLICT:nv_settings:1'; end if;
  update public.nv_settings set data=d||p_data,updated_at=now() where id=1;
end $$;
revoke all on function public.nv_settings_save(jsonb,jsonb) from public,anon;
grant execute on function public.nv_settings_save(jsonb,jsonb) to authenticated;

-- Rate limit costly mail sends in the database so parallel Edge invocations share it.
create table if not exists public.nv_mail_rate(actor uuid not null,kind text not null,scope text not null,last_at timestamptz not null,
 primary key(actor,kind,scope));
alter table public.nv_mail_rate enable row level security;
revoke all on public.nv_mail_rate from public,anon,authenticated;
create or replace function public.nv_mail_claim(p_kind text,p_school text default '') returns boolean
language plpgsql security definer set search_path=public as $$
declare n int; scope_key text:=coalesce(p_school,'');
begin
 if p_kind='test' then
   if not public.nv_perm('settings') then raise exception 'not allowed' using errcode='42501'; end if;
 elsif p_kind='school' then
   if not exists(select 1 from public.nv_schools s where s.id=scope_key and s.completed_at is not null and
     (public.nv_can_read() or (public.nv_my_emp() is not null and s.completed_by=public.nv_my_emp()))) then
     raise exception 'not allowed' using errcode='42501';
   end if;
 else raise exception 'invalid mail kind'; end if;
 insert into public.nv_mail_rate(actor,kind,scope,last_at) values(auth.uid(),p_kind,scope_key,now())
 on conflict(actor,kind,scope) do update set last_at=excluded.last_at where nv_mail_rate.last_at<now()-interval '10 minutes';
 get diagnostics n=row_count;
 return n=1;
end $$;
revoke all on function public.nv_mail_claim(text,text) from public,anon;
grant execute on function public.nv_mail_claim(text,text) to authenticated;

create or replace function public.nv_school_report_totals(p_school text) returns jsonb
language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('count',count(*),'qty',coalesce(sum(quantity),0)) from public.nv_collections
 where school_id=p_school and submitted_at is not null and type_id is not null
$$;
revoke all on function public.nv_school_report_totals(text) from public,anon;
grant execute on function public.nv_school_report_totals(text) to authenticated;

-- Serialize collection writes against the school row, including school changes.
create or replace function public.nv_school_guard() returns trigger
language plpgsql security definer set search_path=public as $$
declare s public.nv_schools; me text:=public.nv_my_emp();
begin
  if public.nv_perm('edit') or me is null then return new; end if;
  if tg_op='UPDATE' and new.school_id is not distinct from old.school_id then return new; end if;
  select * into s from public.nv_schools where id=new.school_id for update;
  if s.id is null or s.status<>'active' or s.completed_at is not null then raise exception 'school is not open'; end if;
  if exists(select 1 from public.nv_collections where school_id=new.school_id and employee_id<>me) then raise exception 'school assigned to another supervisor'; end if;
  return new;
end $$;
drop trigger if exists nv_school_guard_t on public.nv_collections;
create trigger nv_school_guard_t before insert or update of school_id on public.nv_collections for each row execute function public.nv_school_guard();

-- Preserve inventory instead of cascading it away when a parent is deleted.
alter table public.nv_collections drop constraint if exists nv_collections_employee_id_fkey;
alter table public.nv_collections add constraint nv_collections_employee_id_fkey foreign key(employee_id) references public.nv_employees(id) on delete restrict;
alter table public.nv_collections drop constraint if exists nv_collections_school_id_fkey;
alter table public.nv_collections add constraint nv_collections_school_id_fkey foreign key(school_id) references public.nv_schools(id) on delete restrict;

-- Full audit of data mutations, including deletes and the actual actor identity.
create table if not exists public.nv_audit(id bigint generated always as identity primary key,at timestamptz not null default now(),
 actor uuid,table_name text not null,operation text not null,row_id text,old_data jsonb,new_data jsonb);
alter table public.nv_audit enable row level security;
revoke all on public.nv_audit from public,anon,authenticated;
grant select on public.nv_audit to authenticated;
drop policy if exists nv_audit_read on public.nv_audit;
create policy nv_audit_read on public.nv_audit for select to authenticated using(public.nv_can_read());
create or replace function public.nv_audit_write() returns trigger language plpgsql security definer set search_path=public as $$
declare o jsonb; n jsonb;
begin
  if tg_op<>'INSERT' then o:=to_jsonb(old); end if;
  if tg_op<>'DELETE' then n:=to_jsonb(new); end if;
  insert into public.nv_audit(actor,table_name,operation,row_id,old_data,new_data)
    values(auth.uid(),tg_table_name,tg_op,coalesce(n->>'id',o->>'id',n->>'user_id',o->>'user_id'),o,n);
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['nv_collections','nv_schools','nv_employees','nv_staff','nv_settings'] loop
    execute format('drop trigger if exists nv_audit_t on public.%I',t);
    execute format('create trigger nv_audit_t after insert or update or delete on public.%I for each row execute function public.nv_audit_write()',t);
  end loop;
end $$;

-- Published labels retain a stable database identity.
alter table public.nv_collections alter column no set generated always;
do $$ begin
 if exists(select 1 from public.nv_collections group by no having count(*)>1) then
  raise exception 'NV34: duplicate asset numbers found; reconcile historical labels before migrating';
 end if;
end $$;
create unique index if not exists nv_collections_no_unique on public.nv_collections(no);
create or replace function public.nv_protect_asset_no() returns trigger language plpgsql set search_path=public as $$
begin
 if new.no is distinct from old.no then raise exception 'asset number is immutable'; end if;
 return new;
end $$;

do $$ begin
 if not exists(select 1 from pg_constraint where conname='nv_school_coordinates_v34' and conrelid='public.nv_schools'::regclass) then
  alter table public.nv_schools add constraint nv_school_coordinates_v34 check((lat is null or lat between -90 and 90) and (lng is null or lng between -180 and 180)) not valid;
 end if;
end $$;
drop trigger if exists nv_asset_no_t on public.nv_collections;
create trigger nv_asset_no_t before update of no on public.nv_collections for each row execute function public.nv_protect_asset_no();
-- NOT VALID enforces new writes without rejecting a migration because of legacy data.
do $$ begin
 if not exists(select 1 from pg_constraint where conname='nv_asset_values_v34' and conrelid='public.nv_collections'::regclass) then
  alter table public.nv_collections add constraint nv_asset_values_v34 check((price is null or price>=0) and (lat is null or lat between -90 and 90) and (lng is null or lng between -180 and 180)) not valid;
 end if;
end $$;

create or replace function public.nv_photo_read(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select public.nv_member() and exists(select 1 from public.nv_collections c where
   (public.nv_can_read() or c.employee_id=public.nv_my_emp()) and
   p_name=any(array[c.school_image||'.jpg',c.asset_image||'.jpg',c.asset_image2||'.jpg',c.label_photo||'.jpg']||
     array(select x||'.jpg' from unnest(c.extra_images) x)))
$$;
revoke all on function public.nv_photo_read(text) from public,anon;
grant execute on function public.nv_photo_read(text) to authenticated;
-- Fail closed if the operator cannot change storage policies: do not mask errors.
update storage.buckets set public=false where id='nv-photos';
drop policy if exists p_nv_obj_read on storage.objects;
drop policy if exists p_nv_obj_insert on storage.objects;
drop policy if exists p_nv_obj_update on storage.objects;
drop policy if exists p_nv_obj_delete on storage.objects;
create policy p_nv_obj_read on storage.objects for select to authenticated using(bucket_id='nv-photos' and
 (public.nv_photo_read(name) or (owner=auth.uid() and public.nv_member())));
create policy p_nv_obj_insert on storage.objects for insert to authenticated with check(bucket_id='nv-photos' and
 (public.nv_perm('edit') or public.nv_emp_perm('collect')));
create policy p_nv_obj_update on storage.objects for update to authenticated using(bucket_id='nv-photos' and
 (public.nv_perm('edit') or (owner=auth.uid() and public.nv_emp_perm('collect')))) with check(bucket_id='nv-photos' and
 (public.nv_perm('edit') or (owner=auth.uid() and public.nv_emp_perm('collect'))));
create policy p_nv_obj_delete on storage.objects for delete to authenticated using(bucket_id='nv-photos' and public.nv_perm('delete'));
notify pgrst,'reload schema';
commit;
