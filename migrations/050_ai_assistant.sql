-- NV55: «مساعدك الذكي» (AI assistant).
--  1) settings key «ai» {on, daily} in nv_settings_save (sent only once set, like «site» / «ops»);
--  2) nv_ai_usage + nv_ai_take(kind): the Edge Function «solvix-ai» calls it (as the signed-in user) before every request:
--     the assistant must be switched on, the subscription running (the system Admin is exempt) and the user under his daily limit.
--  The Anthropic API key lives only in the Edge Function secrets (ANTHROPIC_API_KEY), never in the database or a page.
begin;
create table if not exists public.nv_ai_usage(
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  n int not null default 0,
  chat int not null default 0,
  asset int not null default 0,
  primary key(user_id,day)
);
alter table public.nv_ai_usage enable row level security;
revoke all on public.nv_ai_usage from public,anon,authenticated;

create or replace function public.nv_ai_take(p_kind text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare cfg jsonb; lim int; v_n int; today date:=(now() at time zone 'Asia/Riyadh')::date;
begin
  if auth.uid() is null or not public.nv_member() then raise exception 'not allowed' using errcode='42501'; end if;
  if p_kind is null or p_kind not in ('chat','asset') then raise exception 'invalid kind'; end if;
  select data->'ai' into cfg from public.nv_settings where id=1;
  if cfg is null or jsonb_typeof(cfg)<>'object' or coalesce((cfg->>'on')::boolean,false) is false then raise exception 'ai disabled' using errcode='42501'; end if;
  if not public.nv_sub_ok() and not public.nv_is_sys() then raise exception 'subscription ended' using errcode='42501'; end if;
  lim:=greatest(1,least(1000,coalesce(nullif(cfg->>'daily','')::int,50)));
  insert into public.nv_ai_usage(user_id,day,n,chat,asset) values(auth.uid(),today,1,(p_kind='chat')::int,(p_kind='asset')::int)
  on conflict(user_id,day) do update set n=nv_ai_usage.n+1,chat=nv_ai_usage.chat+(p_kind='chat')::int,asset=nv_ai_usage.asset+(p_kind='asset')::int
  returning n into v_n;
  -- over the limit: the exception rolls the increment back
  if v_n>lim then raise exception 'ai limit reached' using errcode='42501'; end if;
  return jsonb_build_object('used',v_n,'limit',lim);
end $$;
revoke all on function public.nv_ai_take(text) from public,anon;
grant execute on function public.nv_ai_take(text) to authenticated;

-- usage for the management (perm view): per user and day, the last N days
create or replace function public.nv_ai_usage_report(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.nv_perm('view') then raise exception 'not allowed' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('day',u.day,'n',u.n,'chat',u.chat,'asset',u.asset,
      'name',coalesce(e.name,s.email,''),'kind',case when e.id is not null then 'field' else 'staff' end) order by u.day desc,u.n desc)
    from public.nv_ai_usage u left join public.nv_employees e on e.user_id=u.user_id left join public.nv_staff s on s.user_id=u.user_id
    where u.day>=(now() at time zone 'Asia/Riyadh')::date-greatest(1,least(366,coalesce(p_days,30)))),'[]'::jsonb);
end $$;
revoke all on function public.nv_ai_usage_report(int) from public,anon;
grant execute on function public.nv_ai_usage_report(int) to authenticated;

-- settings key «ai» (sent only once set)
create or replace function public.nv_settings_save(p_expected jsonb,p_data jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare d jsonb; projection jsonb;
begin
  if not public.nv_perm('settings') then raise exception 'not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p_expected) is distinct from 'object' or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid settings'; end if;
  if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('app_name','admin_email','logo','label','geo','room_tpl','site','ops','ai')) then raise exception 'unknown setting'; end if;
  if p_data ? 'site' and (jsonb_typeof(p_data->'site') is distinct from 'object' or pg_column_size(p_data->'site')>20000
     or (p_data->'site' ? 'extra' and (jsonb_typeof(p_data->'site'->'extra') is distinct from 'array' or jsonb_array_length(p_data->'site'->'extra')>40))) then
    raise exception 'invalid building form'; end if;
  if p_data ? 'ops' and (jsonb_typeof(p_data->'ops') is distinct from 'object' or pg_column_size(p_data->'ops')>4000) then raise exception 'invalid ops settings'; end if;
  -- NV55 «ai»: {on: boolean, daily: requests per user per day}
  if p_data ? 'ai' and (jsonb_typeof(p_data->'ai') is distinct from 'object' or pg_column_size(p_data->'ai')>1000) then raise exception 'invalid ai settings'; end if;
  select data into d from public.nv_settings where id=1 for update;
  projection:=jsonb_build_object('app_name',coalesce(nullif(d->>'app_name',''),'Solvix'),'admin_email',coalesce(d->>'admin_email',''),
     'logo',d->'logo','label',d->'label','geo',d->'geo','room_tpl',d->'room_tpl')
     ||case when jsonb_typeof(d->'site')='object' then jsonb_build_object('site',d->'site') else '{}'::jsonb end
     ||case when jsonb_typeof(d->'ops')='object' then jsonb_build_object('ops',d->'ops') else '{}'::jsonb end
     ||case when jsonb_typeof(d->'ai')='object' then jsonb_build_object('ai',d->'ai') else '{}'::jsonb end;
  if projection is distinct from p_expected then raise exception 'SOLVIX_CONFLICT:nv_settings:1'; end if;
  update public.nv_settings set data=d||p_data,updated_at=now() where id=1;
end $$;
revoke all on function public.nv_settings_save(jsonb,jsonb) from public,anon;
grant execute on function public.nv_settings_save(jsonb,jsonb) to authenticated;
-- NV55: which upgrades this database has (the «حالة قاعدة البيانات» card in «إدارة النظام»). Each item checks the object the upgrade adds.
create or replace function public.nv_schema_level() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare fn text:=''; q text:=''; docs text:='';
begin
  if not (public.nv_is_sys() or public.nv_perm('settings')) then raise exception 'not allowed' using errcode='42501'; end if;
  select coalesce(string_agg(p.prosrc,' '),'') into q from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='nv_quality_page';
  select coalesce(string_agg(p.prosrc,' '),'') into docs from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='nv_document_access45';
  return jsonb_build_object('latest','050','items',jsonb_build_array(
    jsonb_build_object('m','044','name','دورات الجرد ونقل الأصول','ok',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='nv_asset_move44')),
    jsonb_build_object('m','045','name','صلاحيات الدليل والإصدارات','ok',docs<>''),
    jsonb_build_object('m','046','name','نموذج بيانات المباني','ok',exists(select 1 from information_schema.columns where table_schema='public' and table_name='nv_schools' and column_name='extra')),
    jsonb_build_object('m','047','name','صورة لوحة البيانات اختيارية','ok',q<>'' and position('missing_photo or missing_nameplate' in q)=0 and position('or missing_nameplate' in q)=0),
    jsonb_build_object('m','048','name','الاستثناءات والغرف والمنطقة','ok',exists(select 1 from information_schema.tables where table_schema='public' and table_name='nv_room_done') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='nv_collections' and column_name='zone')),
    jsonb_build_object('m','049','name','الدليل والإصدارات لمدير النظام','ok',position('nv_is_sys' in docs)>0),
    jsonb_build_object('m','050','name','مساعدك الذكي','ok',true)));
end $$;
revoke all on function public.nv_schema_level() from public,anon;
grant execute on function public.nv_schema_level() to authenticated;

notify pgrst,'reload schema';
commit;
