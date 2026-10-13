-- =====================================================================
--  Solvix (formerly Novaro) — school asset collection — Supabase setup for its OWN project
--  Paste this whole file in Supabase → SQL Editor → New query → Run. Safe to run again.
--  First admin: Authentication → Users → «Add user» (tick «Auto Confirm User»); the first account that is not a
--  technician becomes the admin (also when it existed before this file was run). Further admins / readers are added
--  from Solvix → Users. Technicians (nv<number>@novaro.local) get their password from Solvix → Employees → Login.
--  Never put the service_role / secret key in any page.
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- 1) staff: who may open the admin pages ----------
create table if not exists public.nv_staff(user_id uuid primary key references auth.users(id) on delete cascade, email text not null,
  name text not null default '', role text not null default 'owner' check(role in ('owner','manager','coordinator','admin','reader')), active boolean not null default true,
  created_at timestamptz not null default now());
alter table public.nv_staff enable row level security;
-- NV10 roles: owner (مالك المشروع), manager (مدير المشروع), coordinator (منسق المشروع); the field supervisors (مشرف ميدان) are nv_employees
-- with a sign-in. 'admin' (older installs, now owner) and 'reader' (read only) are still accepted.
alter table public.nv_staff alter column role set default 'owner';
alter table public.nv_staff drop constraint if exists nv_staff_role_check;
alter table public.nv_staff add constraint nv_staff_role_check check(role in ('owner','manager','coordinator','admin','reader'));
update public.nv_staff set role = 'owner' where role = 'admin';
create or replace function public.nv_is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.nv_staff s where s.user_id = auth.uid() and s.active and s.role in ('owner','manager','coordinator','admin')) $$;
-- who may manage users and the general settings: owner and manager
create or replace function public.nv_can_users() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.nv_staff s where s.user_id = auth.uid() and s.active and s.role in ('owner','manager','admin')) $$;
create or replace function public.nv_is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.nv_staff s where s.user_id = auth.uid() and s.active and s.role in ('owner','admin')) $$;
create or replace function public.nv_my_role() returns text language sql stable security definer set search_path = public as $$
  select s.role from public.nv_staff s where s.user_id = auth.uid() and s.active $$;
create or replace function public.nv_can_read() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.nv_staff s where s.user_id = auth.uid() and s.active) $$;
-- the first account (not a technician) becomes the admin
create or replace function public.nv_first_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email,'')) not like '%@novaro.local' and not exists(select 1 from public.nv_staff) then
    insert into public.nv_staff(user_id, email, name, role) values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'owner')
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists nv_first_admin_t on auth.users;
create trigger nv_first_admin_t after insert on auth.users for each row execute function public.nv_first_admin();
insert into public.nv_staff(user_id, email, name, role)
  select u.id, lower(u.email), split_part(u.email,'@',1), 'owner' from auth.users u
   where lower(coalesce(u.email,'')) not like '%@novaro.local' and not exists(select 1 from public.nv_staff)
   order by u.created_at limit 1
on conflict (user_id) do nothing;
drop policy if exists p_nv_staff_read on public.nv_staff;
create policy p_nv_staff_read on public.nv_staff for select using (public.nv_can_users() or user_id = auth.uid());
revoke all on public.nv_staff from anon, authenticated;
grant select on public.nv_staff to authenticated;
-- the admin adds staff (creates the sign-in), changes role / active, and resets passwords
create or replace function public.nv_staff_create(p_email text, p_password text, p_name text, p_role text) returns uuid
language plpgsql security definer set search_path = public, extensions, auth as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if not public.nv_can_users() then raise exception 'not allowed' using errcode = '42501'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or v_email like '%@novaro.local' then raise exception 'invalid email'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'password too short'; end if;
  if p_role not in ('owner','manager','coordinator') then raise exception 'invalid role'; end if;
  if p_role = 'owner' and not public.nv_is_owner() then raise exception 'only an owner can add an owner' using errcode = '42501'; end if;
  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is not null and exists(select 1 from public.nv_staff where user_id = v_id and role in ('owner','admin')) and not public.nv_is_owner() then
    raise exception 'only an owner can change an owner' using errcode = '42501'; end if;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', coalesce(nullif(trim(p_name),''), split_part(v_email,'@',1))), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = v_id;
  end if;
  insert into public.nv_staff(user_id, email, name, role) values (v_id, v_email, coalesce(nullif(trim(p_name),''), split_part(v_email,'@',1)), p_role)
  on conflict (user_id) do update set name = excluded.name, role = excluded.role, active = true;
  return v_id;
end $$;
create or replace function public.nv_staff_set(p_user uuid, p_role text, p_active boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.nv_can_users() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_role not in ('owner','manager','coordinator','reader') then raise exception 'invalid role'; end if;
  if p_user = auth.uid() then raise exception 'you cannot change your own role or access'; end if;
  if not public.nv_is_owner() and (p_role = 'owner' or exists(select 1 from public.nv_staff where user_id = p_user and role in ('owner','admin'))) then
    raise exception 'only an owner can change an owner' using errcode = '42501'; end if;
  update public.nv_staff set role = p_role, active = p_active where user_id = p_user;
  if not found then raise exception 'user not found'; end if;
end $$;
create or replace function public.nv_staff_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not public.nv_can_users() then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'password too short'; end if;
  if not exists(select 1 from public.nv_staff where user_id = p_user) then raise exception 'user not found'; end if;
  if p_user <> auth.uid() and not public.nv_is_owner() and exists(select 1 from public.nv_staff where user_id = p_user and role in ('owner','admin')) then
    raise exception 'only an owner can change an owner' using errcode = '42501'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
end $$;
revoke all on function public.nv_staff_create(text,text,text,text), public.nv_staff_set(uuid,text,boolean), public.nv_staff_set_password(uuid,text) from public, anon;
grant execute on function public.nv_staff_create(text,text,text,text), public.nv_staff_set(uuid,text,boolean), public.nv_staff_set_password(uuid,text) to authenticated;

-- ---------- 2) data ----------
create table if not exists public.nv_employees(id text primary key, number text not null unique, name text not null,
  user_id uuid unique references auth.users(id) on delete set null, created_at timestamptz not null default now());
create or replace function public.nv_my_emp() returns text language sql stable security definer set search_path = public as $$
  select e.id from public.nv_employees e where e.user_id = auth.uid() and auth.uid() is not null $$;
create or replace function public.nv_member() returns boolean language sql stable as $$
  select public.nv_can_read() or public.nv_my_emp() is not null $$;

create table if not exists public.nv_schools(id text primary key, moe text not null default '', ident text not null unique, site text not null default '',
  name text not null, district text not null default '', city text not null default '', description text not null default '',
  status text not null default 'active' check(status in ('active','inactive')), completed_at timestamptz,
  completed_by text references public.nv_employees(id) on delete set null, created_at timestamptz not null default now());
create table if not exists public.nv_categories(id text primary key, ar text not null, en text not null default '');
create table if not exists public.nv_types(id text primary key, cat text not null references public.nv_categories(id) on delete cascade, ar text not null, en text not null default '');
-- NV14: the approved asset catalog has 4 levels: category (level 1) → l2 → l3 → type (level 4, «وصف الأصل الموحد») with its 12-digit code and criticality
alter table public.nv_types add column if not exists l2 text not null default '';
alter table public.nv_types add column if not exists l3 text not null default '';
alter table public.nv_types add column if not exists code text;
alter table public.nv_types add column if not exists critical boolean not null default false;
create unique index if not exists nv_types_code_u on public.nv_types(code) where code is not null and code <> '';
create table if not exists public.nv_conditions(id text primary key, ar text not null, en text not null default '');
create table if not exists public.nv_rooms(id text primary key, en text not null default '', ar text not null);
create table if not exists public.nv_collections(id text primary key, no bigint generated by default as identity,
  employee_id text not null references public.nv_employees(id) on delete cascade,
  school_id text not null references public.nv_schools(id) on delete cascade,
  school_image text, floor text, room_number text, room_name_id text references public.nv_rooms(id) on delete set null, notes text not null default '',
  category_id text references public.nv_categories(id) on delete set null, type_id text references public.nv_types(id) on delete set null,
  condition_id text references public.nv_conditions(id) on delete set null, quantity int not null default 1 check(quantity >= 0), price numeric(15,2),
  status text, manufacturer text not null default '', brand text not null default '', model text not null default '', capacity text not null default '',
  serial text not null default '', agency text not null default '', warranty text not null default '', install_date text not null default '',
  asad_country text not null default '', lat numeric(10,8), lng numeric(11,8), asset_image text, parent_child text, tag text not null default '',
  submitted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists nv_collections_school on public.nv_collections(school_id);
create index if not exists nv_collections_emp on public.nv_collections(employee_id);
create table if not exists public.nv_log(id text primary key default gen_random_uuid()::text, at timestamptz not null default now(), by text not null,
  coll text, school text, emp text, changes jsonb not null default '{}');
create index if not exists nv_log_at on public.nv_log(at desc);
create table if not exists public.nv_settings(id int primary key default 1 check(id = 1), data jsonb not null default '{}', updated_at timestamptz not null default now());
insert into public.nv_settings(id) values (1) on conflict (id) do nothing;

-- every edit of a record that was already submitted goes to the change log (the Laravel app e-mailed the admin)
create or replace function public.nv_coll_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare ch jsonb := '{}'; k text; o jsonb; n jsonb;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and old.submitted_at is not null then
    o := to_jsonb(old); n := to_jsonb(new);
    for k in select unnest(array['category_id','type_id','condition_id','quantity','price','status','manufacturer','brand','model','capacity','serial','agency',
               'warranty','install_date','asad_country','lat','lng','asset_image','parent_child','tag','notes','floor','room_number','room_name_id','employee_id','school_id','school_image']) loop
      if (o->k) is distinct from (n->k) then ch := ch || jsonb_build_object(k, jsonb_build_object('old', o->k, 'new', n->k)); end if;
    end loop;
    if ch <> '{}' then
      insert into public.nv_log(by, coll, school, emp, changes) values (case when public.nv_is_admin() then 'admin' else 'emp:'||coalesce(public.nv_my_emp(),'?') end,
        new.id, new.school_id, new.employee_id, ch);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists nv_coll_t on public.nv_collections;
create trigger nv_coll_t before insert or update on public.nv_collections for each row execute function public.nv_coll_trg();

alter table public.nv_employees enable row level security; alter table public.nv_schools enable row level security;
alter table public.nv_categories enable row level security; alter table public.nv_types enable row level security;
alter table public.nv_conditions enable row level security; alter table public.nv_rooms enable row level security;
alter table public.nv_collections enable row level security; alter table public.nv_log enable row level security;
alter table public.nv_settings enable row level security;
do $$ declare t text; begin
  foreach t in array array['nv_schools','nv_categories','nv_types','nv_conditions','nv_rooms'] loop
    execute format('drop policy if exists p_%1$s_read on public.%1$s', t);
    execute format('create policy p_%1$s_read on public.%1$s for select using (public.nv_member())', t);
    execute format('drop policy if exists p_%1$s_write on public.%1$s', t);
    execute format('create policy p_%1$s_write on public.%1$s for all using (public.nv_is_admin()) with check (public.nv_is_admin())', t);
  end loop;
end $$;
drop policy if exists p_nv_emp_read on public.nv_employees;
create policy p_nv_emp_read on public.nv_employees for select using (public.nv_can_read() or user_id = auth.uid());
drop policy if exists p_nv_emp_write on public.nv_employees;
create policy p_nv_emp_write on public.nv_employees for all using (public.nv_is_admin()) with check (public.nv_is_admin());
-- a technician's own records; a new record only on an active, unfinished school nobody else is working on
create or replace function public.nv_school_open_for_me(p_school text) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.nv_schools s where s.id = p_school and s.status = 'active' and s.completed_at is null)
     and not exists(select 1 from public.nv_collections c where c.school_id = p_school and c.employee_id <> public.nv_my_emp()) $$;
drop policy if exists p_nv_coll_read on public.nv_collections;
create policy p_nv_coll_read on public.nv_collections for select using (public.nv_can_read() or employee_id = public.nv_my_emp());
drop policy if exists p_nv_coll_ins on public.nv_collections;
create policy p_nv_coll_ins on public.nv_collections for insert with check (public.nv_is_admin() or (employee_id = public.nv_my_emp() and public.nv_school_open_for_me(school_id)));
drop policy if exists p_nv_coll_upd on public.nv_collections;
create policy p_nv_coll_upd on public.nv_collections for update using (public.nv_is_admin() or employee_id = public.nv_my_emp())
  with check (public.nv_is_admin() or employee_id = public.nv_my_emp());
drop policy if exists p_nv_coll_del on public.nv_collections;
create policy p_nv_coll_del on public.nv_collections for delete using (public.nv_is_admin() or (employee_id = public.nv_my_emp() and submitted_at is null));
drop policy if exists p_nv_log_read on public.nv_log;
create policy p_nv_log_read on public.nv_log for select using (public.nv_can_read());
drop policy if exists p_nv_set_read on public.nv_settings;
create policy p_nv_set_read on public.nv_settings for select using (true);
drop policy if exists p_nv_set_write on public.nv_settings;
create policy p_nv_set_write on public.nv_settings for update using (public.nv_can_users()) with check (public.nv_can_users());
revoke all on public.nv_employees, public.nv_schools, public.nv_categories, public.nv_types, public.nv_conditions, public.nv_rooms,
  public.nv_collections, public.nv_log, public.nv_settings from anon, authenticated;
grant select, insert, update, delete on public.nv_employees, public.nv_schools, public.nv_categories, public.nv_types, public.nv_conditions,
  public.nv_rooms, public.nv_collections to authenticated;
grant select on public.nv_log to authenticated;
grant select, update on public.nv_settings to authenticated;
grant select on public.nv_settings to anon;   -- the login pages show the application name and logo

-- who am I: role 'admin' (may edit data) | 'reader' | 'tech' (field supervisor) | null; staff_role = owner / manager / coordinator / reader
create or replace function public.nv_me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('role', case when public.nv_is_admin() then 'admin' when public.nv_can_read() then 'reader' when public.nv_my_emp() is not null then 'tech' end,
    'staff_role', (select case when s.role = 'admin' then 'owner' else s.role end from public.nv_staff s where s.user_id = auth.uid() and s.active),
    'emp', (select to_jsonb(e) - 'user_id' from public.nv_employees e where e.user_id = auth.uid())) $$;
-- schools another technician is already working on (a technician cannot read other people's records)
create or replace function public.nv_busy_schools() returns setof text language sql stable security definer set search_path = public as $$
  select distinct c.school_id from public.nv_collections c where public.nv_member() and c.employee_id is distinct from public.nv_my_emp() $$;
-- «Complete and Finish Job»: only the technician working on the school, after at least one submitted record
create or replace function public.nv_complete_school(p_school text) returns void language plpgsql security definer set search_path = public as $$
declare me text := public.nv_my_emp();
begin
  if me is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists(select 1 from public.nv_collections where school_id = p_school and employee_id = me and submitted_at is not null) then raise exception 'no submitted assets'; end if;
  delete from public.nv_collections where school_id = p_school and employee_id = me and submitted_at is null;
  update public.nv_schools set completed_at = coalesce(completed_at, now()), completed_by = coalesce(completed_by, me), status = 'inactive' where id = p_school;
end $$;
-- the admin gives a technician a sign-in (creates nv<number>@novaro.local or resets its password)
create or replace function public.nv_emp_set_login(p_emp text, p_password text) returns text
language plpgsql security definer set search_path = public, extensions, auth as $$
declare e public.nv_employees; v_email text; v_id uuid;
begin
  if not public.nv_is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'password too short'; end if;
  select * into e from public.nv_employees where id = p_emp;
  if e.id is null then raise exception 'employee not found'; end if;
  v_email := 'nv' || lower(regexp_replace(e.number, '[^A-Za-z0-9]', '', 'g')) || '@novaro.local';
  select id into v_id from auth.users where lower(email) = v_email;
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
create or replace function public.nv_emp_logins() returns table(id text, has_login boolean) language sql stable security definer set search_path = public as $$
  select e.id, e.user_id is not null from public.nv_employees e where public.nv_can_read() $$;
revoke all on function public.nv_can_users(), public.nv_is_owner(), public.nv_my_role() from public, anon;
grant execute on function public.nv_can_users(), public.nv_is_owner(), public.nv_my_role() to authenticated;
revoke all on function public.nv_is_admin(), public.nv_can_read(), public.nv_my_emp(), public.nv_member(), public.nv_school_open_for_me(text), public.nv_me(),
  public.nv_busy_schools(), public.nv_complete_school(text), public.nv_emp_set_login(text,text), public.nv_emp_logins() from public, anon;
grant execute on function public.nv_is_admin(), public.nv_can_read(), public.nv_my_emp(), public.nv_member(), public.nv_school_open_for_me(text), public.nv_me(),
  public.nv_busy_schools(), public.nv_complete_school(text), public.nv_emp_set_login(text,text), public.nv_emp_logins() to authenticated;

-- photos: private bucket nv-photos, flat names <random key>.jpg; members upload and read, admins delete
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('nv-photos','nv-photos',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
do $do$ begin
  execute $q$drop policy if exists p_nv_obj_read on storage.objects$q$;
  execute $q$drop policy if exists p_nv_obj_insert on storage.objects$q$;
  execute $q$drop policy if exists p_nv_obj_update on storage.objects$q$;
  execute $q$drop policy if exists p_nv_obj_delete on storage.objects$q$;
  execute $q$create policy p_nv_obj_read on storage.objects for select using (bucket_id = 'nv-photos' and public.nv_member())$q$;
  execute $q$create policy p_nv_obj_insert on storage.objects for insert with check (bucket_id = 'nv-photos' and (public.nv_is_admin() or public.nv_my_emp() is not null))$q$;
  execute $q$create policy p_nv_obj_update on storage.objects for update using (bucket_id = 'nv-photos' and (public.nv_is_admin() or owner = auth.uid()))$q$;
  execute $q$create policy p_nv_obj_delete on storage.objects for delete using (bucket_id = 'nv-photos' and public.nv_is_admin())$q$;
exception when insufficient_privilege then
  raise notice 'nv-photos: لم تُحدَّث سياسات التخزين (لا صلاحية على storage.objects) — أضفها من Storage ← Policies إن لزم';
end $do$;

-- done. Next: open Solvix → #admin, sign in with the first account, then Dashboard → «Load the built-in lists».
