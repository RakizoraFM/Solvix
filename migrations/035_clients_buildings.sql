-- Apply after NV34. A separate Supabase project is used for each client.
begin;
alter table public.nv_employees add column if not exists archived boolean not null default false;
alter table public.nv_employees add column if not exists deleted_at timestamptz;
alter table public.nv_employees add column if not exists previous_number text;
alter table public.nv_subscription add column if not exists contact_email text;
alter table public.nv_subscription add column if not exists contact_name text;
alter table public.nv_subscription add column if not exists mail_cc text[] not null default '{}';
alter table public.nv_subscription add column if not exists portal_url text;
alter table public.nv_subscription add column if not exists provider_email text;

create table if not exists public.nv_clients(
 id uuid primary key default gen_random_uuid(),name text not null,contact_name text not null,email text not null,cc text[] not null default '{}',
 project_url text not null unique,publishable_key text not null,credential_cipher jsonb not null,portal_url text not null,
 plan text not null default 'yearly',starts_at timestamptz,ends_at timestamptz,grace_days int not null default 7 check(grace_days between 0 and 90),
 max_schools int check(max_schools>=0),max_field int check(max_field>=0),max_staff int check(max_staff>=0),max_assets int check(max_assets>=0),
 status text not null default 'provisioning',mail_status text not null default 'pending',remote_user_id uuid,last_error text,
 provisioned_at timestamptz,busy_until timestamptz,lock_token uuid,last_reminder_check timestamptz,reminder_error text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.nv_clients enable row level security;
revoke all on public.nv_clients from public,anon,authenticated;
grant all on public.nv_clients to service_role;
grant insert on public.nv_audit to service_role;
grant usage,select on sequence public.nv_audit_id_seq to service_role;
create or replace function public.nv_client_lock(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c public.nv_clients;
begin
 update public.nv_clients set busy_until=now()+interval '10 minutes',lock_token=p_token
 where id=p_id and (busy_until is null or busy_until<now()) returning * into c;
 return case when c.id is not null then to_jsonb(c) end;
end $$;
revoke all on function public.nv_client_lock(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nv_client_lock(uuid,uuid) to service_role;
create or replace function public.nv_clients_list() returns setof jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.nv_is_sys() then raise exception 'only the system administrator' using errcode='42501';end if;
 return query select to_jsonb(c)-array['credential_cipher','lock_token'] from public.nv_clients c order by c.created_at desc;
end $$;
revoke all on function public.nv_clients_list() from public,anon;
grant execute on function public.nv_clients_list() to authenticated;

create or replace function public.nv_all_users() returns setof jsonb
language plpgsql stable security definer set search_path=public,auth as $$
begin
 if not public.nv_is_sys() then raise exception 'only the system administrator' using errcode='42501';end if;
 return query select jsonb_build_object('id',u.id,'email',u.email,'name',coalesce(s.name,e.name,u.raw_user_meta_data->>'full_name',''),
  'role',coalesce(s.role,case when e.id is not null then 'field' else 'unassigned' end),'created_at',u.created_at)
 from auth.users u left join public.nv_staff s on s.user_id=u.id left join public.nv_employees e on e.user_id=u.id order by u.created_at;
end $$;
revoke all on function public.nv_all_users() from public,anon;
grant execute on function public.nv_all_users() to authenticated;

-- Removes the AUTH account for every role, including self and the last sysadmin.
-- Historical asset rows retain an archived employee reference, never a working login.
create or replace function public.nv_delete_user(p_user uuid default null,p_emp text default null) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare target uuid:=p_user; e public.nv_employees; actor uuid:=auth.uid(); deleted_email text;
begin
 if not coalesce(public.nv_is_sys() or auth.role()='service_role',false) then raise exception 'only the system administrator' using errcode='42501';end if;
 if p_emp is not null then
  select * into e from public.nv_employees where id=p_emp for update;
  if e.id is null then raise exception 'user not found';end if;
  if target is not null and target is distinct from e.user_id then raise exception 'identity mismatch';end if;
  target:=e.user_id;
 end if;
 if target is null and p_emp is null then raise exception 'user required';end if;
 select email into deleted_email from auth.users where id=target;
 if target is not null and deleted_email is null then raise exception 'user not found';end if;
 update public.nv_employees set user_id=null,email=null,archived=true,deleted_at=now(),name='مستخدم محذوف',
  previous_number=number,number='deleted-'||gen_random_uuid()::text
  where (target is not null and user_id=target) or (p_emp is not null and id=p_emp);
 insert into public.nv_audit(actor,table_name,operation,row_id,old_data,new_data)
  values(actor,'auth.users','DELETE_ACCOUNT',coalesce(target::text,p_emp),jsonb_build_object('email',deleted_email),'{}');
 -- Standard Supabase Auth cascades invalidate identities and refresh sessions.
 if target is not null then delete from auth.users where id=target;end if;
 return jsonb_build_object('ok',true,'self',target=actor,'user_id',target,'employee_id',p_emp);
end $$;
revoke all on function public.nv_delete_user(uuid,text) from public,anon;
grant execute on function public.nv_delete_user(uuid,text) to authenticated,service_role;

-- Exclude archived historical references from subscription usage.
create or replace function public.nv_sub_get() returns jsonb language sql stable security definer set search_path=public as $$
 select case when public.nv_member() then to_jsonb(s)-'updated_by'||jsonb_build_object('ok',public.nv_sub_ok(),'now',now(),
 'usage',jsonb_build_object('schools',(select count(*) from public.nv_schools),'field',(select count(*) from public.nv_employees where not archived),
 'staff',(select count(*) from public.nv_staff where role<>'sysadmin' and active),'assets',(select count(*) from public.nv_collections where type_id is not null)),
 'log',case when public.nv_is_sys() then coalesce((select jsonb_agg(l order by l.at desc) from (select * from public.nv_sub_log order by at desc limit 50) l),'[]') end) end
 from public.nv_subscription s where id=1
$$;

-- Used on either the provider or an isolated client backend.
create or replace function public.nv_public_settings() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('schema_version',35,'data',jsonb_build_object('app_name',data->>'app_name','logo',data->'logo')) from public.nv_settings where id=1
$$;

-- Central and per-client schedulers share the same reminder claim and delivery log.
create table if not exists public.nv_reminder_claims(key text primary key,until_at timestamptz not null);
alter table public.nv_reminder_claims enable row level security;
revoke all on public.nv_reminder_claims from public,anon,authenticated;
create or replace function public.nv_sub_reminder_claim(p_stage int,p_ends_at timestamptz) returns boolean
language plpgsql security definer set search_path=public as $$
declare n int;
begin
 insert into public.nv_reminder_claims(key,until_at) values(p_ends_at::text||':'||p_stage::text,now()+interval '10 minutes')
 on conflict(key) do update set until_at=excluded.until_at where nv_reminder_claims.until_at<now();
 get diagnostics n=row_count;return n=1;
end $$;
revoke all on function public.nv_sub_reminder_claim(int,timestamptz) from public,anon,authenticated;
grant execute on function public.nv_sub_reminder_claim(int,timestamptz) to service_role;

create or replace function public.nv_sub_reminder_due() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s public.nv_subscription; d int; st int; recipients jsonb; copies jsonb;
begin
 select * into s from public.nv_subscription where id=1;
 if s.ends_at is null then return null;end if;
 d:=ceil(extract(epoch from (s.ends_at-now()))/86400)::int;
 st:=case when d<=0 and now()<s.ends_at+make_interval(days=>greatest(s.grace_days,1)) then 0 when d=1 then 1 when d between 2 and 7 then 7 when d between 8 and 14 then 14 end;
 if st is null or exists(select 1 from public.nv_sub_log where action='reminder' and data->>'stage'=st::text and (data->>'ends_at')::timestamptz=s.ends_at) then return null;end if;
 select coalesce(jsonb_agg(distinct email),'[]') into recipients from (
  select email from public.nv_staff where active and role in ('owner','admin') union select s.contact_email
 ) x where email is not null and email<>'';
 select coalesce(jsonb_agg(distinct email),'[]') into copies from (
  select email from public.nv_staff where active and role='sysadmin' union select unnest(s.mail_cc) union select s.provider_email
 ) x where email is not null and email<>'';
 return jsonb_build_object('stage',st,'days',d,'ends_at',s.ends_at,'grace_days',s.grace_days,'customer',s.customer,'to',recipients,'cc',copies,'portal_url',s.portal_url);
end $$;
revoke all on function public.nv_sub_reminder_due() from public,anon,authenticated;
grant execute on function public.nv_sub_reminder_due() to service_role;
create or replace function public.nv_sys_emails() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(distinct email),'[]') from (
  select email from public.nv_staff where active and role='sysadmin'
  union select provider_email from public.nv_subscription where id=1
 ) x where email is not null and email<>''
$$;
revoke all on function public.nv_sys_emails() from public,anon,authenticated;
grant execute on function public.nv_sys_emails() to service_role;
create or replace function public.nv_emp_set_login(p_emp text, p_password text) returns text
language plpgsql security definer set search_path = public, extensions, auth as $$
declare e public.nv_employees; v_email text; v_id uuid;
begin
  if not public.nv_is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'password too short'; end if;
  select * into e from public.nv_employees where id = p_emp;
  if e.id is null or e.archived then raise exception 'employee not found'; end if;
  if coalesce(trim(e.email),'') <> '' then
    v_email := lower(trim(e.email));
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid email'; end if;
    if exists(select 1 from public.nv_staff s join auth.users u on u.id = s.user_id where lower(u.email) = v_email) then raise exception 'this e-mail belongs to a management account'; end if;
    -- the supervisor already has a sign-in (old nv<number>@novaro.local or another e-mail): move it to the new e-mail, same account
    if e.user_id is not null and not exists(select 1 from auth.users where lower(email) = v_email) then
      update auth.users set email = v_email, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = e.user_id;
      update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email)) where user_id = e.user_id and provider = 'email';
    end if;
  else
    v_email := 'nv' || lower(regexp_replace(e.number, '[^A-Za-z0-9]', '', 'g')) || '@novaro.local';
  end if;
  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is not null and exists(select 1 from public.nv_employees x where x.user_id = v_id and x.id <> e.id) then raise exception 'this e-mail is used by another field supervisor'; end if;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', e.name, 'novaro', true), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = v_id;
  end if;
  update public.nv_employees set user_id = v_id where id = p_emp;
  return v_email;
end $$;
create or replace function public.nv_limit_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare s public.nv_subscription; n int; lim int; what text;
begin
  if public.nv_is_sys() then return new; end if;
  select * into s from public.nv_subscription where id = 1 for update;
  if tg_table_name = 'nv_schools' then lim := s.max_schools; what := 'schools'; select count(*) into n from public.nv_schools;
  elsif tg_table_name = 'nv_employees' then lim := s.max_field; what := 'field supervisors'; select count(*) into n from public.nv_employees where not archived;
  elsif tg_table_name = 'nv_staff' then if new.role = 'sysadmin' then return new; end if; lim := s.max_staff; what := 'management accounts';
    select count(*) into n from public.nv_staff where role <> 'sysadmin' and active and user_id <> new.user_id;
  else
    if new.type_id is null or (tg_op = 'UPDATE' and old.type_id is not null) then return new; end if;
    lim := s.max_assets; what := 'assets'; select count(*) into n from public.nv_collections where type_id is not null;
  end if;
  if lim is not null and n >= lim then raise exception 'subscription limit reached: % (%)', what, lim using errcode = 'P0001'; end if;
  return new;
end $$;
notify pgrst,'reload schema';
commit;
