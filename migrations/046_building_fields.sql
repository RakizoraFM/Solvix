-- NV46: each customer shapes its own building data («نموذج بيانات المباني»).
-- The form lives in nv_settings.data.site; the values of the customer's own fields live in nv_schools.extra.
begin;
alter table public.nv_schools add column if not exists extra jsonb not null default '{}'::jsonb;
do $do$ begin
 if not exists(select 1 from pg_constraint where conname='nv_school_extra_v46' and conrelid='public.nv_schools'::regclass) then
  alter table public.nv_schools add constraint nv_school_extra_v46 check(jsonb_typeof(extra)='object' and pg_column_size(extra)<=16000);
 end if;
end $do$;
create or replace function public.nv_settings_save(p_expected jsonb,p_data jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare d jsonb; projection jsonb;
begin
  if not public.nv_perm('settings') then raise exception 'not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_expected) is distinct from 'object' or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid settings'; end if;
  if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('app_name','admin_email','logo','label','geo','room_tpl','site')) then raise exception 'unknown setting'; end if;
  -- the building form: {fields:{key:{on,l}}, extra:[{k,l,t,opts,req}]}, at most 40 own fields
  if p_data ? 'site' and (jsonb_typeof(p_data->'site') is distinct from 'object' or pg_column_size(p_data->'site')>20000
     or (p_data->'site' ? 'extra' and (jsonb_typeof(p_data->'site'->'extra') is distinct from 'array' or jsonb_array_length(p_data->'site'->'extra')>40))) then
    raise exception 'invalid building form'; end if;
  select data into d from public.nv_settings where id=1 for update;
  projection:=jsonb_build_object('app_name',coalesce(nullif(d->>'app_name',''),'Solvix'),'admin_email',coalesce(d->>'admin_email',''),
     'logo',d->'logo','label',d->'label','geo',d->'geo','room_tpl',d->'room_tpl')
     -- «site» takes part only once it is set, like the client (Cloud.settingsOf)
     ||case when jsonb_typeof(d->'site')='object' then jsonb_build_object('site',d->'site') else '{}'::jsonb end;
  if projection is distinct from p_expected then raise exception 'SOLVIX_CONFLICT:nv_settings:1'; end if;
  update public.nv_settings set data=d||p_data,updated_at=now() where id=1;
end $$;
revoke all on function public.nv_settings_save(jsonb,jsonb) from public,anon;
grant execute on function public.nv_settings_save(jsonb,jsonb) to authenticated;
commit;
