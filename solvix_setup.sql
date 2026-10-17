-- =====================================================================
--  Solvix (formerly Novaro) — school asset collection — Supabase setup for its OWN project
--  Paste this whole file in Supabase → SQL Editor → New query → Run. Safe to run again.
--  First administrator: create an Auth user, then explicitly provision nv_staff (UPGRADE_NV34_AR.md).
--  Further administrators/readers are created from Solvix → Users. Technicians (nv<number>@novaro.local) get their password from Solvix → Employees → Login.
--  Never put the service_role / secret key in any page.
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- 1) staff: who may open the admin pages ----------
create table if not exists public.nv_staff(user_id uuid primary key references auth.users(id) on delete cascade, email text not null,
  name text not null default '', role text not null default 'owner' check(role in ('sysadmin','owner','manager','coordinator','admin','reader')), active boolean not null default true,
  created_at timestamptz not null default now());
alter table public.nv_staff enable row level security;
-- NV10 roles: owner (مالك المشروع), manager (مدير المشروع), coordinator (منسق المشروع); the field supervisors (مشرف ميدان) are nv_employees
-- with a sign-in. 'admin' (older installs, now owner) and 'reader' (read only) are still accepted.
alter table public.nv_staff alter column role set default 'owner';
alter table public.nv_staff drop constraint if exists nv_staff_role_check;
alter table public.nv_staff add constraint nv_staff_role_check check(role in ('sysadmin','owner','manager','coordinator','admin','reader'));
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
-- NV34: administrators are provisioned explicitly by a trusted database operator.
drop trigger if exists nv_first_admin_t on auth.users;
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
  if p_role not in ('sysadmin','owner','manager','coordinator','reader') then raise exception 'invalid role'; end if;
  if p_role = 'sysadmin' and not public.nv_is_sys() then raise exception 'only the system Admin can add an Admin' using errcode = '42501'; end if;
  if p_role = 'owner' and not public.nv_is_owner() then raise exception 'only an owner can add an owner' using errcode = '42501'; end if;
  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is not null and exists(select 1 from public.nv_staff where user_id = v_id and role = 'sysadmin') and not public.nv_is_sys() then
    raise exception 'only the system Admin can change an Admin' using errcode = '42501'; end if;
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
  if p_role not in ('sysadmin','owner','manager','coordinator','reader') then raise exception 'invalid role'; end if;
  if p_user = auth.uid() then raise exception 'you cannot change your own role or access'; end if;
  if not public.nv_is_sys() and (p_role = 'sysadmin' or exists(select 1 from public.nv_staff where user_id = p_user and role = 'sysadmin')) then
    raise exception 'only the system Admin can change an Admin' using errcode = '42501'; end if;
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
  if p_user <> auth.uid() and not public.nv_is_sys() and exists(select 1 from public.nv_staff where user_id = p_user and role = 'sysadmin') then
    raise exception 'only the system Admin can change an Admin' using errcode = '42501'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
end $$;
revoke all on function public.nv_staff_create(text,text,text,text), public.nv_staff_set(uuid,text,boolean), public.nv_staff_set_password(uuid,text) from public, anon;
grant execute on function public.nv_staff_create(text,text,text,text), public.nv_staff_set(uuid,text,boolean), public.nv_staff_set_password(uuid,text) to authenticated;

-- ---------- 2) data ----------
create table if not exists public.nv_employees(id text primary key, number text not null unique, name text not null,
  user_id uuid unique references auth.users(id) on delete set null, created_at timestamptz not null default now());
-- NV17: field supervisors sign in with their own e-mail (the account is nv<number>@novaro.local until one is set)
alter table public.nv_employees add column if not exists email text;
create unique index if not exists nv_employees_email_u on public.nv_employees(lower(email)) where email is not null and email <> '';
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
alter table public.nv_collections add column if not exists asset_image2 text; -- NV25: second on-site photo (nameplate / serial)
-- NV26: school coordinates (reference for the location check), distance of the photos from the school, photo review by the management
alter table public.nv_schools add column if not exists lat numeric(10,8);
alter table public.nv_schools add column if not exists lng numeric(11,8);
alter table public.nv_collections add column if not exists geo_dist int;
alter table public.nv_collections add column if not exists extra_images text[] not null default '{}'; -- NV27: optional extra photos
alter table public.nv_collections add column if not exists review_status text;
alter table public.nv_collections add column if not exists review_note text not null default '';
alter table public.nv_collections add column if not exists reviewed_at timestamptz;
alter table public.nv_collections add column if not exists reviewed_by text;
do $c$ begin alter table public.nv_collections add constraint nv_coll_review_chk check (review_status is null or review_status in ('ok','returned')); exception when duplicate_object then null; end $c$;
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
  if tg_op = 'UPDATE' and public.nv_label_only(old, new) then return new; end if;
  -- NV26: only the management reviews photos. A supervisor's insert starts unreviewed; his edit sends the asset back to review
  -- (status cleared) and keeps the reviewer's note / name / time.
  if not public.nv_perm('review') then
    if tg_op = 'INSERT' then new.review_status := null; new.review_note := ''; new.reviewed_at := null; new.reviewed_by := null;
    elsif public.nv_my_emp() is not null and not public.nv_can_read() then new.review_status := null; new.review_note := old.review_note; new.reviewed_at := old.reviewed_at; new.reviewed_by := old.reviewed_by;
    else new.review_status := old.review_status; new.review_note := old.review_note; new.reviewed_at := old.reviewed_at; new.reviewed_by := old.reviewed_by; end if;
  end if;
  if tg_op = 'UPDATE' and old.submitted_at is not null then
    o := to_jsonb(old); n := to_jsonb(new);
    for k in select unnest(array['category_id','type_id','condition_id','quantity','price','status','manufacturer','brand','model','capacity','serial','agency',
               'warranty','install_date','asad_country','lat','lng','asset_image','asset_image2','extra_images','parent_child','tag','notes','floor','room_number','room_name_id','employee_id','school_id','school_image']) loop
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
  if me is null or not public.nv_emp_perm('finish') then raise exception 'not allowed' using errcode = '42501'; end if;
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
-- NV17: after an admin changes a supervisor's e-mail, move his existing sign-in to it (no password change)
create or replace function public.nv_emp_sync_email(p_emp text) returns text
language plpgsql security definer set search_path = public, auth as $$
declare e public.nv_employees; v_email text;
begin
  if not public.nv_is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into e from public.nv_employees where id = p_emp;
  if e.id is null or e.user_id is null or coalesce(trim(e.email),'') = '' then return null; end if;
  v_email := lower(trim(e.email));
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid email'; end if;
  if exists(select 1 from auth.users where lower(email) = v_email and id <> e.user_id) then raise exception 'this e-mail is used by another account'; end if;
  update auth.users set email = v_email, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = e.user_id;
  update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email)) where user_id = e.user_id and provider = 'email';
  return v_email;
end $$;
revoke all on function public.nv_emp_sync_email(text) from public, anon;
grant execute on function public.nv_emp_sync_email(text) to authenticated;
create or replace function public.nv_emp_logins() returns table(id text, has_login boolean) language sql stable security definer set search_path = public as $$
  select e.id, e.user_id is not null from public.nv_employees e where public.nv_can_read() $$;
revoke all on function public.nv_can_users(), public.nv_is_owner(), public.nv_my_role() from public, anon;
grant execute on function public.nv_can_users(), public.nv_is_owner(), public.nv_my_role() to authenticated;
revoke all on function public.nv_is_admin(), public.nv_can_read(), public.nv_my_emp(), public.nv_member(), public.nv_school_open_for_me(text), public.nv_me(),
  public.nv_busy_schools(), public.nv_complete_school(text), public.nv_emp_set_login(text,text), public.nv_emp_logins() from public, anon;
grant execute on function public.nv_is_admin(), public.nv_can_read(), public.nv_my_emp(), public.nv_member(), public.nv_school_open_for_me(text), public.nv_me(),
  public.nv_busy_schools(), public.nv_complete_school(text), public.nv_emp_set_login(text,text), public.nv_emp_logins() to authenticated;

-- =====================================================================
-- NV28 — system Admin (above the owner), permissions per person, subscription (read only after it ends) and limits
-- =====================================================================
alter table public.nv_staff add column if not exists perms jsonb;
alter table public.nv_employees add column if not exists perms jsonb;
-- the account that set Solvix up (the oldest owner) becomes the system Admin when there is none yet
create or replace function public.nv_is_sys() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.nv_staff s where s.user_id = auth.uid() and s.active and s.role = 'sysadmin') $$;
-- default permissions of each role (a person's own perms {key: true|false} override them)
create or replace function public.nv_role_perm(p_role text, p text) returns boolean language sql immutable as $$
  select case p_role
    when 'sysadmin' then true
    when 'owner' then p in ('view','edit','delete','users','settings','catalog','review','export','import','backup')
    when 'admin' then p in ('view','edit','delete','users','settings','catalog','review','export','import','backup')
    when 'manager' then p in ('view','edit','delete','users','settings','catalog','review','export','import','backup')
    when 'coordinator' then p in ('view','edit','delete','catalog','review','export','import')
    when 'reader' then p in ('view','export')
    when 'field' then p in ('collect','edit_sent','finish','gallery','extra')
    else false end $$;
create table if not exists public.nv_subscription(id int primary key default 1 check(id = 1), customer text not null default '', plan text not null default 'trial',
  starts_at timestamptz, ends_at timestamptz, grace_days int not null default 7 check(grace_days between 0 and 90),
  max_schools int, max_field int, max_staff int, max_assets int, notes text not null default '', updated_at timestamptz not null default now(), updated_by text);
insert into public.nv_subscription(id) values (1) on conflict (id) do nothing;
create table if not exists public.nv_sub_log(id bigserial primary key, at timestamptz not null default now(), by text, action text not null, data jsonb not null default '{}');
alter table public.nv_subscription enable row level security; alter table public.nv_sub_log enable row level security;
-- true while the subscription runs (no end date = no limit in time); after the end + grace days everything is read only, except for the system Admin
create or replace function public.nv_sub_ok() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select s.ends_at is null or now() < s.ends_at + make_interval(days => s.grace_days) from public.nv_subscription s where s.id = 1), true) $$;
create or replace function public.nv_perm(p text) returns boolean language sql stable security definer set search_path = public as $$
  select public.nv_is_sys() or (exists(select 1 from public.nv_staff s where s.user_id = auth.uid() and s.active and coalesce((s.perms->>p)::boolean, public.nv_role_perm(s.role, p)))
     and (p in ('view','export') or public.nv_sub_ok())) $$;
create or replace function public.nv_emp_perm(p text) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.nv_employees e where e.user_id = auth.uid() and coalesce((e.perms->>p)::boolean, public.nv_role_perm('field', p))) and public.nv_sub_ok() $$;
-- the older helpers now follow the permissions
create or replace function public.nv_is_admin() returns boolean language sql stable security definer set search_path = public as $$ select public.nv_perm('edit') $$;
create or replace function public.nv_can_users() returns boolean language sql stable security definer set search_path = public as $$ select public.nv_perm('users') $$;
create or replace function public.nv_is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select public.nv_is_sys() or exists(select 1 from public.nv_staff s where s.user_id = auth.uid() and s.active and s.role in ('owner','admin')) $$;
-- policies by permission
do $$ declare t text; begin
  foreach t in array array['nv_categories','nv_types','nv_conditions','nv_rooms'] loop
    execute format('drop policy if exists p_%1$s_write on public.%1$s', t);
    execute format('create policy p_%1$s_write on public.%1$s for all using (public.nv_perm(''catalog'')) with check (public.nv_perm(''catalog''))', t);
  end loop;
  foreach t in array array['nv_schools','nv_employees'] loop
    execute format('drop policy if exists p_%1$s_write on public.%1$s', t);
    execute format('drop policy if exists p_%1$s_ins on public.%1$s', t);execute format('drop policy if exists p_%1$s_upd on public.%1$s', t);execute format('drop policy if exists p_%1$s_del on public.%1$s', t);
    execute format('create policy p_%1$s_ins on public.%1$s for insert with check (public.nv_perm(''edit''))', t);
    execute format('create policy p_%1$s_upd on public.%1$s for update using (public.nv_perm(''edit'')) with check (public.nv_perm(''edit''))', t);
    execute format('create policy p_%1$s_del on public.%1$s for delete using (public.nv_perm(''delete''))', t);
  end loop;
end $$;
drop policy if exists p_nv_emp_write on public.nv_employees;
drop policy if exists p_nv_coll_ins on public.nv_collections;
create policy p_nv_coll_ins on public.nv_collections for insert with check (public.nv_perm('edit') or (employee_id = public.nv_my_emp() and public.nv_emp_perm('collect') and public.nv_school_open_for_me(school_id)));
drop policy if exists p_nv_coll_upd on public.nv_collections;
create policy p_nv_coll_upd on public.nv_collections for update using (public.nv_perm('edit') or public.nv_perm('review') or (employee_id = public.nv_my_emp() and public.nv_sub_ok() and (submitted_at is null or public.nv_emp_perm('edit_sent'))))
  with check (public.nv_perm('edit') or public.nv_perm('review') or (employee_id = public.nv_my_emp() and public.nv_sub_ok()));
drop policy if exists p_nv_coll_del on public.nv_collections;
create policy p_nv_coll_del on public.nv_collections for delete using (public.nv_perm('delete') or (employee_id = public.nv_my_emp() and submitted_at is null and public.nv_sub_ok()));
drop policy if exists p_nv_set_write on public.nv_settings;
create policy p_nv_set_write on public.nv_settings for update using (public.nv_perm('settings')) with check (public.nv_perm('settings'));
-- the owner and the others never see the Admin accounts
drop policy if exists p_nv_staff_read on public.nv_staff;
create policy p_nv_staff_read on public.nv_staff for select using ((public.nv_can_users() and (role <> 'sysadmin' or public.nv_is_sys())) or user_id = auth.uid());
-- a reviewer without «edit» may change only the review fields
create or replace function public.nv_review_only_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.nv_perm('review') and not public.nv_perm('edit') and public.nv_my_emp() is null then
    new := jsonb_populate_record(old, jsonb_build_object('review_status', new.review_status, 'review_note', new.review_note, 'reviewed_at', new.reviewed_at, 'reviewed_by', new.reviewed_by, 'updated_at', now()));
  end if;
  return new;
end $$;
drop trigger if exists nv_review_only_t on public.nv_collections;
create trigger nv_review_only_t before update on public.nv_collections for each row execute function public.nv_review_only_trg();
-- limits of the subscription (null = no limit; the system Admin is never limited)
create or replace function public.nv_limit_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare s public.nv_subscription; n int; lim int; what text;
begin
  if public.nv_is_sys() then return new; end if;
  select * into s from public.nv_subscription where id = 1;
  if tg_table_name = 'nv_schools' then lim := s.max_schools; what := 'schools'; select count(*) into n from public.nv_schools;
  elsif tg_table_name = 'nv_employees' then lim := s.max_field; what := 'field supervisors'; select count(*) into n from public.nv_employees;
  elsif tg_table_name = 'nv_staff' then if new.role = 'sysadmin' then return new; end if; lim := s.max_staff; what := 'management accounts';
    select count(*) into n from public.nv_staff where role <> 'sysadmin' and active and user_id <> new.user_id;
  else
    if new.type_id is null or (tg_op = 'UPDATE' and old.type_id is not null) then return new; end if;
    lim := s.max_assets; what := 'assets'; select count(*) into n from public.nv_collections where type_id is not null;
  end if;
  if lim is not null and n >= lim then raise exception 'subscription limit reached: % (%)', what, lim using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists nv_limit_t on public.nv_schools; create trigger nv_limit_t before insert on public.nv_schools for each row execute function public.nv_limit_trg();
drop trigger if exists nv_limit_t on public.nv_employees; create trigger nv_limit_t before insert on public.nv_employees for each row execute function public.nv_limit_trg();
drop trigger if exists nv_limit_t on public.nv_staff; create trigger nv_limit_t before insert on public.nv_staff for each row execute function public.nv_limit_trg();
drop trigger if exists nv_limit_t on public.nv_collections; create trigger nv_limit_t before insert or update of type_id on public.nv_collections for each row execute function public.nv_limit_trg();
-- subscription: everyone signed in reads its status; only the system Admin changes it (every change is logged)
create or replace function public.nv_sub_get() returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.nv_member() then to_jsonb(s) - 'updated_by' || jsonb_build_object('ok', public.nv_sub_ok(), 'now', now(),
    'usage', jsonb_build_object('schools', (select count(*) from public.nv_schools), 'field', (select count(*) from public.nv_employees),
      'staff', (select count(*) from public.nv_staff where role <> 'sysadmin' and active), 'assets', (select count(*) from public.nv_collections where type_id is not null)),
    'log', case when public.nv_is_sys() then coalesce((select jsonb_agg(l order by l.at desc) from (select * from public.nv_sub_log order by at desc limit 50) l), '[]') end) end
  from public.nv_subscription s where s.id = 1 $$;
create or replace function public.nv_sub_save(p jsonb, p_action text default 'edit') returns jsonb language plpgsql security definer set search_path = public as $$
declare who text := (select email from public.nv_staff where user_id = auth.uid());
begin
  if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode = '42501'; end if;
  update public.nv_subscription set customer = coalesce(p->>'customer', customer), plan = coalesce(p->>'plan', plan),
    starts_at = case when p ? 'starts_at' then nullif(p->>'starts_at','')::timestamptz else starts_at end,
    ends_at = case when p ? 'ends_at' then nullif(p->>'ends_at','')::timestamptz else ends_at end,
    grace_days = coalesce((p->>'grace_days')::int, grace_days),
    max_schools = case when p ? 'max_schools' then nullif(p->>'max_schools','')::int else max_schools end,
    max_field = case when p ? 'max_field' then nullif(p->>'max_field','')::int else max_field end,
    max_staff = case when p ? 'max_staff' then nullif(p->>'max_staff','')::int else max_staff end,
    max_assets = case when p ? 'max_assets' then nullif(p->>'max_assets','')::int else max_assets end,
    notes = coalesce(p->>'notes', notes), updated_at = now(), updated_by = who where id = 1;
  insert into public.nv_sub_log(by, action, data) values (who, coalesce(nullif(p_action,''),'edit'), p);
  return public.nv_sub_get();
end $$;
-- permissions of a person (only the system Admin); null = back to the role's defaults
create or replace function public.nv_staff_perms(p_user uuid, p_perms jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode = '42501'; end if;
  update public.nv_staff set perms = p_perms where user_id = p_user and role <> 'sysadmin'; if not found then raise exception 'user not found'; end if;
end $$;
create or replace function public.nv_emp_perms(p_emp text, p_perms jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode = '42501'; end if;
  update public.nv_employees set perms = p_perms where id = p_emp; if not found then raise exception 'employee not found'; end if;
end $$;
-- the list of management accounts with their permissions, for the system Admin
create or replace function public.nv_staff_list() returns setof jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(s) from public.nv_staff s where public.nv_is_sys() order by s.role = 'sysadmin' desc, s.created_at $$;
-- who am I (NV28): + sys, the effective permissions and the subscription status
create or replace function public.nv_me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'role', case when public.nv_perm('edit') or public.nv_perm('catalog') or public.nv_perm('users') or public.nv_perm('settings') or public.nv_perm('review') then 'admin'
                 when public.nv_can_read() then 'reader' when public.nv_my_emp() is not null then 'tech' end,
    'staff_role', (select case when s.role = 'admin' then 'owner' else s.role end from public.nv_staff s where s.user_id = auth.uid() and s.active),
    'sys', public.nv_is_sys(),
    'perms', case when public.nv_can_read() then (select coalesce(jsonb_agg(k), '[]') from unnest(array['view','edit','delete','users','settings','catalog','review','export','import','backup']) k where public.nv_perm(k))
                  when public.nv_my_emp() is not null then (select coalesce(jsonb_agg(k), '[]') from unnest(array['collect','edit_sent','finish','gallery','extra']) k where public.nv_emp_perm(k)) end,
    'sub', (select jsonb_build_object('ends_at', s.ends_at, 'grace_days', s.grace_days, 'ok', public.nv_sub_ok(), 'plan', s.plan) from public.nv_subscription s where s.id = 1),
    'emp', (select to_jsonb(e) - 'user_id' from public.nv_employees e where e.user_id = auth.uid())) $$;
revoke all on public.nv_subscription, public.nv_sub_log from anon, authenticated;
revoke all on function public.nv_is_sys(), public.nv_sub_ok(), public.nv_perm(text), public.nv_emp_perm(text), public.nv_sub_get(), public.nv_sub_save(jsonb,text),
  public.nv_staff_perms(uuid,jsonb), public.nv_emp_perms(text,jsonb), public.nv_staff_list() from public, anon;
grant execute on function public.nv_is_sys(), public.nv_sub_ok(), public.nv_perm(text), public.nv_emp_perm(text), public.nv_sub_get(), public.nv_sub_save(jsonb,text),
  public.nv_staff_perms(uuid,jsonb), public.nv_emp_perms(text,jsonb), public.nv_staff_list() to authenticated;

-- =====================================================================
-- NV29 — subscription e-mails: reminders 14 / 7 / 1 days before the end (+ once when it ends) and «طلب تجديد» from the owner.
-- The Edge Function solvix-mail sends them; these functions decide WHO and WHEN. The reminder helpers run only with the
-- service role (inside the Edge Function), never from a page.
-- =====================================================================
create or replace function public.nv_sub_reminder_due() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.nv_subscription; d int; st int;
begin
  select * into s from public.nv_subscription where id = 1;
  if s.ends_at is null then return null; end if;
  d := ceil(extract(epoch from (s.ends_at - now())) / 86400)::int;
  st := case when d <= 0 and now() < s.ends_at + make_interval(days => greatest(s.grace_days, 1)) then 0 when d between 1 and 1 then 1 when d between 2 and 7 then 7 when d between 8 and 14 then 14 end;
  if st is null then return null; end if;
  if exists(select 1 from public.nv_sub_log where action = 'reminder' and data->>'stage' = st::text and data->>'ends_at' = s.ends_at::text) then return null; end if;
  return jsonb_build_object('stage', st, 'days', d, 'ends_at', s.ends_at, 'grace_days', s.grace_days, 'customer', s.customer, 'plan', s.plan,
    'to', (select coalesce(jsonb_agg(distinct lower(email)), '[]') from public.nv_staff where active and role in ('owner','admin')),
    'cc', (select coalesce(jsonb_agg(distinct lower(email)), '[]') from public.nv_staff where active and role = 'sysadmin'));
end $$;
create or replace function public.nv_sub_reminder_mark(p_stage int, p_ends_at timestamptz, p_to jsonb) returns void language sql security definer set search_path = public as $$
  insert into public.nv_sub_log(by, action, data) values ('system', 'reminder', jsonb_build_object('stage', p_stage, 'ends_at', p_ends_at::text, 'to', p_to)) $$;
create or replace function public.nv_sys_emails() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(distinct lower(email)), '[]') from public.nv_staff where active and role = 'sysadmin' $$;
revoke all on function public.nv_sub_reminder_due(), public.nv_sub_reminder_mark(int,timestamptz,jsonb), public.nv_sys_emails() from public, anon, authenticated;
do $g$ begin execute 'grant execute on function public.nv_sub_reminder_due(), public.nv_sub_reminder_mark(int,timestamptz,jsonb), public.nv_sys_emails() to service_role'; exception when undefined_object then null; end $g$;
-- the owner (or anyone in the management except the Admin) asks for a renewal: logged, at most once every 12 hours per person
create or replace function public.nv_renew_request(p_note text default '') returns jsonb language plpgsql security definer set search_path = public as $$
declare me public.nv_staff; s public.nv_subscription;
begin
  select * into me from public.nv_staff where user_id = auth.uid() and active;
  if me.user_id is null or me.role = 'sysadmin' then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists(select 1 from public.nv_sub_log where action = 'renew_request' and by = me.email and at > now() - interval '12 hours') then
    raise exception 'a renewal request was already sent in the last 12 hours'; end if;
  select * into s from public.nv_subscription where id = 1;
  insert into public.nv_sub_log(by, action, data) values (me.email, 'renew_request', jsonb_build_object('note', left(coalesce(p_note,''), 1000), 'ends_at', s.ends_at::text));
  return jsonb_build_object('by', me.email, 'name', me.name, 'role', me.role, 'note', left(coalesce(p_note,''), 1000), 'customer', s.customer, 'plan', s.plan, 'ends_at', s.ends_at,
    'ok', public.nv_sub_ok(), 'max_schools', s.max_schools, 'max_field', s.max_field, 'max_staff', s.max_staff, 'max_assets', s.max_assets,
    'usage', jsonb_build_object('schools', (select count(*) from public.nv_schools), 'field', (select count(*) from public.nv_employees),
      'staff', (select count(*) from public.nv_staff where role <> 'sysadmin' and active), 'assets', (select count(*) from public.nv_collections where type_id is not null)));
end $$;
revoke all on function public.nv_renew_request(text) from public, anon;
grant execute on function public.nv_renew_request(text) to authenticated;

-- =====================================================================
-- NV30 — the same serial number on another asset (a supervisor reads only his own records, so the check runs here)
-- =====================================================================
create or replace function public.nv_serial_dupes(p_serial text, p_id text default null) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('label', '101' || lpad(c.no::text, 8, '0'), 'school', s.name, 'mine', c.employee_id = public.nv_my_emp()) order by c.no), '[]')
  from (select * from public.nv_collections c0
         where public.nv_member() and length(regexp_replace(upper(coalesce(p_serial,'')), '[^A-Z0-9]', '', 'g')) >= 4 and c0.id is distinct from p_id and c0.type_id is not null
           and regexp_replace(upper(c0.serial), '[^A-Z0-9]', '', 'g') = regexp_replace(upper(p_serial), '[^A-Z0-9]', '', 'g') limit 5) c
  left join public.nv_schools s on s.id = c.school_id $$;
revoke all on function public.nv_serial_dupes(text,text) from public, anon;
grant execute on function public.nv_serial_dupes(text,text) to authenticated;

-- =====================================================================
-- NV32 — the supervisor confirms the label is stuck on the asset, with a photo of it (QR read from the photo: ok / unread)
-- =====================================================================
alter table public.nv_collections add column if not exists label_photo text;
alter table public.nv_collections add column if not exists label_at timestamptz;
alter table public.nv_collections add column if not exists label_by text;
alter table public.nv_collections add column if not exists label_check text;
alter table public.nv_collections add column if not exists label_printed_at timestamptz;
do $c$ begin alter table public.nv_collections add constraint nv_coll_label_chk check (label_check is null or label_check in ('ok','unread')); exception when duplicate_object then null; end $c$;
-- only the label fields changed → not an edit of the asset: no change-log line and the photo review stays as it was
create or replace function public.nv_label_only(o public.nv_collections, n public.nv_collections) returns boolean language sql immutable as $$
  select (to_jsonb(o) - array['label_photo','label_at','label_by','label_check','label_printed_at','updated_at']) = (to_jsonb(n) - array['label_photo','label_at','label_by','label_check','label_printed_at','updated_at']) $$;
create or replace function public.nv_label_confirm(p_id text, p_photo text, p_check text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.nv_collections; me text := public.nv_my_emp(); who text;
begin
  select * into c from public.nv_collections where id = p_id;
  if c.id is null then raise exception 'asset not found'; end if;
  if not (public.nv_perm('edit') or (me is not null and c.employee_id = me and public.nv_sub_ok())) then raise exception 'not allowed' using errcode = '42501'; end if;
  if c.submitted_at is null or c.type_id is null then raise exception 'asset not submitted'; end if;
  if coalesce(p_photo,'') = '' then raise exception 'label photo required'; end if;
  who := case when me is not null then 'emp:' || me else coalesce((select email from public.nv_staff where user_id = auth.uid()), 'admin') end;
  update public.nv_collections set label_photo = p_photo, label_at = now(), label_by = who, label_printed_at = coalesce(label_printed_at, now()), label_check = case when p_check = 'ok' then 'ok' else 'unread' end where id = p_id;
  return (select jsonb_build_object('label_at', label_at, 'label_by', label_by, 'label_check', label_check) from public.nv_collections where id = p_id);
end $$;
-- the label was printed (first print time kept); the supervisor's own assets, or anyone with «edit»
create or replace function public.nv_label_printed(p_ids text[]) returns int language plpgsql security definer set search_path = public as $$
declare me text := public.nv_my_emp(); n int;
begin
  if not (public.nv_perm('edit') or (me is not null and public.nv_sub_ok())) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.nv_collections set label_printed_at = coalesce(label_printed_at, now())
   where id = any(p_ids) and submitted_at is not null and type_id is not null and (public.nv_perm('edit') or employee_id = me);
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.nv_label_printed(text[]) from public, anon;
grant execute on function public.nv_label_printed(text[]) to authenticated;
revoke all on function public.nv_label_confirm(text,text,text), public.nv_label_only(public.nv_collections, public.nv_collections) from public, anon;
grant execute on function public.nv_label_confirm(text,text,text) to authenticated;

-- photos: private bucket nv-photos, flat names <random key>.jpg; members upload and read, admins delete
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('nv-photos','nv-photos',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
do $do$ begin
  execute $q$drop policy if exists p_nv_obj_read on storage.objects$q$;
  execute $q$drop policy if exists p_nv_obj_insert on storage.objects$q$;
  execute $q$drop policy if exists p_nv_obj_update on storage.objects$q$;
  execute $q$drop policy if exists p_nv_obj_delete on storage.objects$q$;
  execute $q$create policy p_nv_obj_read on storage.objects for select using (bucket_id = 'nv-photos' and public.nv_member())$q$;
  execute $q$create policy p_nv_obj_insert on storage.objects for insert with check (bucket_id = 'nv-photos' and (public.nv_is_admin() or (public.nv_my_emp() is not null and public.nv_sub_ok())))$q$;
  execute $q$create policy p_nv_obj_update on storage.objects for update using (bucket_id = 'nv-photos' and (public.nv_is_admin() or owner = auth.uid()))$q$;
  execute $q$create policy p_nv_obj_delete on storage.objects for delete using (bucket_id = 'nv-photos' and public.nv_is_admin())$q$;
exception when insufficient_privilege then
  raise notice 'nv-photos: لم تُحدَّث سياسات التخزين (لا صلاحية على storage.objects) — أضفها من Storage ← Policies إن لزم';
end $do$;

-- done. Next: open Solvix → #admin, sign in with the first account, then Dashboard → «Load the built-in lists».



-- NV34 bundled migration
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




-- NV35 bundled migration
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

-- NV36 bundled migration
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

-- NV37 bundled migration
-- NV37: administrator-only usage history. Apply after NV36 in each isolated project.
begin;
create table if not exists public.nv_login_history(
 id bigint generated always as identity primary key,at timestamptz not null,
 actor uuid not null,email text,name text,source text not null default 'auth_timestamp');
create index if not exists nv_login_history_actor_at on public.nv_login_history(actor,at desc);
create index if not exists nv_login_history_at on public.nv_login_history(at desc);
create index if not exists nv_audit_actor_at on public.nv_audit(actor,at desc);
create index if not exists nv_approval_events_actor_at on public.nv_approval_events(actor,at desc);
alter table public.nv_login_history enable row level security;
revoke all on public.nv_login_history from public,anon,authenticated;
-- A fixed installation timestamp, not a backfilled or inferred login history.
create table if not exists public.nv_system_history_start(id int primary key check(id=1),at timestamptz not null default now());
alter table public.nv_system_history_start enable row level security;
revoke all on public.nv_system_history_start from public,anon,authenticated;
insert into public.nv_system_history_start(id) values(1) on conflict do nothing;
create or replace function public.nv_capture_login() returns trigger
language plpgsql security definer set search_path=public,auth as $$
begin
 if new.last_sign_in_at is null then return new;end if;
 if tg_op='UPDATE' then
  if new.last_sign_in_at is not distinct from old.last_sign_in_at then return new;end if;
 end if;
 insert into public.nv_login_history(at,actor,email,name)
 values(new.last_sign_in_at,new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''));
 return new;
end $$;
revoke all on function public.nv_capture_login() from public,anon,authenticated;
drop trigger if exists nv_capture_login_insert on auth.users;
drop trigger if exists nv_capture_login_update on auth.users;
create trigger nv_capture_login_insert after insert on auth.users for each row execute function public.nv_capture_login();
create trigger nv_capture_login_update after update of last_sign_in_at on auth.users for each row execute function public.nv_capture_login();

create or replace function public.nv_usage_users() returns setof jsonb
language plpgsql stable security definer set search_path=public,auth as $$
begin
 if not public.nv_is_sys() then raise exception 'only the system administrator' using errcode='42501';end if;
 return query select jsonb_build_object('id',u.id,'email',u.email,
 'name',coalesce(s.name,e.name,u.raw_user_meta_data->>'full_name',''),
 'role',coalesce(s.role,case when e.id is not null then 'field' else 'unassigned' end),
 'active',case when s.user_id is not null then s.active when e.id is not null then not e.archived else false end,
 'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,
 'recorded_logins',(select count(*) from public.nv_login_history h where h.actor=u.id),
 'last_change_at',(select max(a.at) from public.nv_audit a where a.actor=u.id))
 from auth.users u left join public.nv_staff s on s.user_id=u.id
 left join public.nv_employees e on e.user_id=u.id order by u.created_at;
end $$;

create or replace function public.nv_usage_page(p_actor uuid default null,p_kind text default 'all',
 p_from timestamptz default null,p_to timestamptz default null,p_offset int default 0,p_limit int default 50) returns jsonb
language plpgsql stable security definer set search_path=public,auth as $$
declare result jsonb;
begin
 if not public.nv_is_sys() then raise exception 'only the system administrator' using errcode='42501';end if;
 if p_kind not in('all','login','change','approval') or p_offset is null or p_offset<0
 or p_limit is null or p_limit<1 or p_limit>100 or (p_from is not null and p_to is not null and p_to<=p_from)
 then raise exception 'invalid history filter';end if;
 with events as (
 select 'login:'||h.id as id,h.at,h.actor,h.email,h.name,'login'::text as kind,'SIGN_IN'::text as action,
 'account'::text as entity,null::text as row_id from public.nv_login_history h
 union all
 select 'change:'||a.id,a.at,a.actor,u.email,coalesce(s.name,e.name,u.raw_user_meta_data->>'full_name',''),
 'change',a.operation,a.table_name,a.row_id
 from public.nv_audit a left join auth.users u on u.id=a.actor
 left join public.nv_staff s on s.user_id=a.actor left join public.nv_employees e on e.user_id=a.actor
 union all
 select 'approval:'||a.id,a.at,a.actor,u.email,coalesce(a.actor_label,''),'approval',a.action,'asset',a.asset_id
 from public.nv_approval_events a left join auth.users u on u.id=a.actor
 ), filtered as (select * from events where (p_actor is null or actor=p_actor) and
 (p_kind='all' or kind=p_kind) and (p_from is null or at>=p_from) and (p_to is null or at<p_to)),
 page as (select * from filtered order by at desc,id desc offset p_offset limit p_limit)
 select jsonb_build_object('total',(select count(*) from filtered),
 'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.at desc,p.id desc) from page p),'[]'::jsonb),
 'checked_at',now(),'login_history_since',(select min(at) from public.nv_system_history_start where id=1)) into result;
 return result;
end $$;

revoke all on function public.nv_usage_users(),public.nv_usage_page(uuid,text,timestamptz,timestamptz,int,int) from public,anon;
grant execute on function public.nv_usage_users(),public.nv_usage_page(uuid,text,timestamptz,timestamptz,int,int) to authenticated;
create or replace function public.nv_public_settings() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('schema_version',37,'data',jsonb_build_object('app_name',data->>'app_name','logo',data->'logo')) from public.nv_settings where id=1
$$;
notify pgrst,'reload schema';
commit;

-- NV38 bundled migration
-- Apply after NV37 in each independent project.
begin;
create or replace function public.nv_identity_norm(v text) returns text language sql immutable as $$
 select lower(regexp_replace(translate(coalesce(v,''),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[[:space:]_.:/\\-]+','','g'))
$$;
create index if not exists nv_collections_serial_norm on public.nv_collections(public.nv_identity_norm(serial));
create index if not exists nv_collections_tag_norm on public.nv_collections(public.nv_identity_norm(tag));
create index if not exists nv_collections_number_check on public.nv_collections(no);
create or replace function public.nv_duplicate_check(p_rows jsonb) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.nv_member() then raise exception 'not permitted' using errcode='42501';end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>2000 then raise exception 'invalid duplicate batch';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where length(coalesce(r->>'serial',''))>256 or length(coalesce(r->>'tag',''))>256) then raise exception 'identifier too long';end if;
 select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('id',r->>'id',
 'serial_count',(select count(*) from public.nv_collections c where c.id is distinct from r->>'id' and public.nv_identity_norm(c.serial)=public.nv_identity_norm(r->>'serial') and public.nv_identity_norm(r->>'serial') not in('','na','none','unknown','غيرمتوفر','لايوجد','بدون','0')),
 'tag_count',(select count(*) from public.nv_collections c where c.id is distinct from r->>'id' and public.nv_identity_norm(c.tag)=public.nv_identity_norm(r->>'tag') and public.nv_identity_norm(r->>'tag')<>''),
 'no_count',(select count(*) from public.nv_collections c where c.id is distinct from r->>'id' and c.no::text=r->>'no'))),'[]'::jsonb),'checked_at',now())
 into result from jsonb_array_elements(p_rows) r;
 return result;
end $$;
create or replace function public.nv_identity_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare changed boolean:=tg_op='INSERT';
begin
 if tg_op='UPDATE' then changed:=new.no is distinct from old.no or public.nv_identity_norm(new.tag) is distinct from public.nv_identity_norm(old.tag);end if;
 if changed then
  perform pg_advisory_xact_lock(380038);
  if exists(select 1 from public.nv_collections c where c.id<>new.id and ((new.no is not null and c.no=new.no) or
   (public.nv_identity_norm(new.tag)<>'' and public.nv_identity_norm(c.tag)=public.nv_identity_norm(new.tag))))
  then raise exception 'DUPLICATE_ASSET_NUMBER: رقم الأصل أو الرقم الخارجي مكرر';end if;
 end if;
 return new;
end $$;
revoke all on function public.nv_identity_guard() from public,anon,authenticated;
drop trigger if exists nv_identity_guard on public.nv_collections;
create trigger nv_identity_guard before insert or update on public.nv_collections for each row execute function public.nv_identity_guard();

create table if not exists public.nv_asset_trash(
 id uuid primary key default gen_random_uuid(),asset_id text not null,snapshot jsonb not null,
 deleted_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 days',
 deleted_by uuid,deleted_by_label text,reason text not null,restored_at timestamptz,restored_by uuid);
create index if not exists nv_asset_trash_expiry on public.nv_asset_trash(expires_at) where restored_at is null;
alter table public.nv_asset_trash enable row level security;
revoke all on public.nv_asset_trash from public,anon,authenticated;
create or replace function public.nv_trash_capture() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare why text:=nullif(btrim(current_setting('solvix.delete_reason',true)),'');actor_name text;
begin
 if old.type_id is not null and old.submitted_at is not null and why is null and auth.uid() is not null
 then raise exception 'DELETE_REASON_REQUIRED: اكتب سبب حذف الأصل';end if;
 select coalesce(s.name,e.name,u.email) into actor_name from auth.users u left join public.nv_staff s on s.user_id=u.id left join public.nv_employees e on e.user_id=u.id where u.id=auth.uid();
 insert into public.nv_asset_trash(asset_id,snapshot,deleted_by,deleted_by_label,reason)
 values(old.id,to_jsonb(old),auth.uid(),coalesce(actor_name,'خدمة النظام'),coalesce(why,'إزالة مسودة غير مرسلة / إجراء صيانة بالخادم'));
 return old;
end $$;
revoke all on function public.nv_trash_capture() from public,anon,authenticated;
drop trigger if exists nv_trash_capture on public.nv_collections;
create trigger nv_trash_capture before delete on public.nv_collections for each row execute function public.nv_trash_capture();
create or replace function public.nv_asset_delete(p_id text,p_expected jsonb,p_reason text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare result jsonb;begin
 if not public.nv_perm('delete') then raise exception 'not permitted' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'DELETE_REASON_REQUIRED: اكتب سبب الحذف من 3 إلى 1000 حرف';end if;
 perform set_config('solvix.delete_reason',btrim(p_reason),true);
 result:=public.nv_sync_mutate('nv_collections',p_id,p_expected,'{}',true);
 perform set_config('solvix.delete_reason','',true);
 return result;
end $$;
create or replace function public.nv_trash_page(p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;begin
 if not public.nv_perm('delete') then raise exception 'not permitted' using errcode='42501';end if;
 if p_offset<0 or p_offset is null then raise exception 'invalid offset';end if;
 select jsonb_build_object('total',(select count(*) from public.nv_asset_trash where restored_at is null and expires_at>now()),
 'items',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,asset_id,deleted_at,expires_at,deleted_by_label,reason,
 snapshot->>'no' as no,snapshot->>'serial' as serial,snapshot->>'tag' as tag
 from public.nv_asset_trash where restored_at is null and expires_at>now() order by deleted_at desc,id offset p_offset limit 50) x),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.nv_asset_restore(p_trash uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t public.nv_asset_trash; restored text;begin
 if not public.nv_perm('delete') or not public.nv_perm('edit') then raise exception 'not permitted' using errcode='42501';end if;
 select * into t from public.nv_asset_trash where id=p_trash for update;
 if not found or t.restored_at is not null or t.expires_at<=now() then raise exception 'TRASH_EXPIRED: انتهت مهلة الاستعادة أو تمت الاستعادة بالفعل';end if;
 if exists(select 1 from public.nv_collections where id=t.asset_id) then raise exception 'الأصل موجود بالفعل؛ حدّث القائمة';end if;
 -- Foreign keys, subscription limits and identity checks still run. Old approvals never silently return.
 insert into public.nv_collections select (jsonb_populate_record(null::public.nv_collections,t.snapshot||
 jsonb_build_object('updated_at',now(),'review_status',null,'review_note','','reviewed_at',null,'reviewed_by',null))).* returning id into restored;
 update public.nv_asset_trash set restored_at=now(),restored_by=auth.uid() where id=t.id;
 insert into public.nv_audit(actor,table_name,operation,row_id,new_data) values(auth.uid(),'nv_collections','RESTORE',restored,jsonb_build_object('trash_id',t.id));
 return jsonb_build_object('id',restored);
end $$;
-- Preserve referenced photos throughout the restoration window, including cached clients.
create or replace function public.nv_photo_unreferenced(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select not exists(select 1 from public.nv_collections c where p_name=any(array[c.school_image||'.jpg',c.asset_image||'.jpg',c.asset_image2||'.jpg',c.label_photo||'.jpg']||array(select x||'.jpg' from unnest(c.extra_images) x)))
 and not exists(select 1 from public.nv_asset_trash t where t.restored_at is null and t.expires_at>now() and
 p_name=any(array[(t.snapshot->>'school_image')||'.jpg',(t.snapshot->>'asset_image')||'.jpg',(t.snapshot->>'asset_image2')||'.jpg',(t.snapshot->>'label_photo')||'.jpg']||array(select x||'.jpg' from jsonb_array_elements_text(coalesce(t.snapshot->'extra_images','[]'::jsonb)) x)))
$$;
create or replace function public.nv_my_tasks(p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;begin
 if not public.nv_member() then raise exception 'not permitted' using errcode='42501';end if;
 if p_offset<0 or p_offset is null then raise exception 'invalid offset';end if;
 with tasks as (
 select 'approval:'||c.id as id,'approval'::text as kind,c.id as asset_id,c.no,c.serial,c.school_id,r.updated_at as at,
 coalesce(p.stages->r.stage_index->>'name','') as note
 from public.nv_approval_runs r join public.nv_approval_paths p on p.id=r.path_id join public.nv_collections c on c.id=r.asset_id
 where r.status='pending' and public.nv_approval_stage_allowed(p.stages->r.stage_index)
 union all
 select 'returned:'||c.id,'returned',c.id,c.no,c.serial,c.school_id,r.updated_at,r.last_note
 from public.nv_approval_runs r join public.nv_approval_paths p on p.id=r.path_id join public.nv_collections c on c.id=r.asset_id
 where r.status='returned' and (c.employee_id=public.nv_my_emp() or public.nv_approval_stage_allowed(p.stages->r.stage_index))
 union all
 select 'photo:'||c.id,'photo',c.id,c.no,c.serial,c.school_id,coalesce(c.reviewed_at,c.updated_at,c.created_at),c.review_note
 from public.nv_collections c where c.review_status='returned' and (c.employee_id=public.nv_my_emp() or public.nv_perm('review'))
 ), page as (select * from tasks order by at desc nulls last,id offset p_offset limit 50)
 select jsonb_build_object('total',(select count(*) from tasks),'approval',(select count(*) from tasks where kind='approval'),
 'returned',(select count(*) from tasks where kind in('returned','photo')),
 'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.at desc nulls last,x.id) from page x),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.nv_duplicate_check(jsonb),public.nv_asset_delete(text,jsonb,text),public.nv_trash_page(int),public.nv_asset_restore(uuid),public.nv_my_tasks(int) from public,anon;
grant execute on function public.nv_duplicate_check(jsonb),public.nv_asset_delete(text,jsonb,text),public.nv_trash_page(int),public.nv_asset_restore(uuid),public.nv_my_tasks(int) to authenticated;
create or replace function public.nv_public_settings() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('schema_version',38,'data',jsonb_build_object('app_name',data->>'app_name','logo',data->'logo')) from public.nv_settings where id=1
$$;
notify pgrst,'reload schema';
commit;


-- NV44 lifecycle extension
-- NV44. Run after NV38 in each client's own database. No cross-client registry access.
begin;
create table if not exists public.nv_inventory_plans(
 id uuid primary key default gen_random_uuid(),building_id text not null,owner_id text not null,name text not null,
 due_date date not null,rooms jsonb not null default '[]',asset_ids jsonb not null default '[]',revision int not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),actor uuid);
create table if not exists public.nv_inventory_cycles(
 id uuid primary key default gen_random_uuid(),plan_id uuid not null references public.nv_inventory_plans(id),building_id text not null,
 owner_id text not null,name text not null,due_date date not null,rooms jsonb not null,asset_ids jsonb not null,
 expected jsonb not null,previous jsonb not null default '[]',previous_id uuid,status text not null default 'open' check(status in('open','closed')),
 snapshot jsonb,opened_at timestamptz not null default now(),closed_at timestamptz,actor uuid);
create unique index if not exists nv_one_open_cycle44 on public.nv_inventory_cycles(plan_id) where status='open';
create table if not exists public.nv_inventory_observations(
 cycle_id uuid not null references public.nv_inventory_cycles(id),asset_id text not null,snapshot jsonb not null,
 actual jsonb not null,seen_at timestamptz not null default now(),actor uuid,revision int not null default 1,
 primary key(cycle_id,asset_id));
create table if not exists public.nv_inventory_events(
 id bigint generated always as identity primary key,cycle_id uuid,action text not null,asset_id text,
 before_data jsonb,after_data jsonb,reason text not null default '',at timestamptz not null default now(),actor uuid);
create table if not exists public.nv_asset_movements(
 id uuid primary key,asset_id text not null,from_data jsonb not null,to_data jsonb not null,
 reason text not null,at timestamptz not null default now(),actor uuid);
create table if not exists public.nv_asset_splits(
 id uuid primary key,source_id text not null,before_data jsonb not null,asset_ids jsonb not null,
 reason text not null,at timestamptz not null default now(),actor uuid);
-- Identity persists through trash/restore. Do not cascade it on asset deletion.
create table if not exists public.nv_piece_identity(asset_id text primary key,event_id uuid,created_at timestamptz not null default now(),actor uuid);
do $$declare t text;begin
 foreach t in array array['nv_inventory_plans','nv_inventory_cycles','nv_inventory_observations','nv_inventory_events','nv_asset_movements','nv_asset_splits','nv_piece_identity'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
create or replace function public.nv_inventory_access44(p_owner text,p_write boolean default false) returns boolean
language sql stable security definer set search_path=public as $$
 select public.nv_member() and case when p_write then public.nv_sub_ok() and
 (public.nv_perm('edit') or (p_owner=public.nv_my_emp() and public.nv_emp_perm('collect')))
 else public.nv_can_read() or p_owner=public.nv_my_emp() end
$$;
create or replace function public.nv_inventory_asset44(c public.nv_collections) returns jsonb
language sql stable set search_path=public as $$
 select jsonb_build_object('id',c.id,'no',c.no,'type_id',c.type_id,'school_id',c.school_id,
 'floor',c.floor,'room_number',c.room_number,'room_name_id',c.room_name_id,'condition_id',c.condition_id,
 'quantity',c.quantity,'serial',c.serial,'brand',c.brand,'model',c.model)
$$;
create or replace function public.nv_inventory_scope44(c public.nv_collections,p_building text,p_rooms jsonb,p_ids jsonb) returns boolean
language sql immutable as $$ select c.school_id=p_building and c.type_id is not null and c.submitted_at is not null
 and (jsonb_array_length(p_ids)=0 or p_ids ? c.id)
 and (jsonb_array_length(p_rooms)=0 or exists(select 1 from jsonb_array_elements(p_rooms) r
 where coalesce(c.floor,'')=r->>'floor' and coalesce(c.room_number,'')=r->>'room_number'
 and (coalesce(r->>'room_name_id','')='' or c.room_name_id=r->>'room_name_id'))) $$;
create or replace function public.nv_inventory_actor44(p_user uuid) returns text
language sql stable security definer set search_path=public,auth as $$
 select coalesce(nullif(s.name,''),e.name,u.email,p_user::text) from auth.users u
 left join public.nv_staff s on s.user_id=u.id left join public.nv_employees e on e.user_id=u.id where u.id=p_user
$$;
create or replace function public.nv_inventory_stamp_actor44() returns trigger language plpgsql security definer set search_path=public as $$begin
 if tg_op='INSERT' then new.actor_label:=public.nv_inventory_actor44(new.actor);
 elsif tg_table_name in('nv_inventory_plans','nv_inventory_observations') or new.actor is distinct from old.actor then new.actor_label:=public.nv_inventory_actor44(new.actor);
 else new.actor_label:=coalesce(old.actor_label,public.nv_inventory_actor44(new.actor));end if;return new;
end $$;
do $$declare t text;begin
 foreach t in array array['nv_inventory_plans','nv_inventory_cycles','nv_inventory_observations','nv_inventory_events','nv_asset_movements','nv_asset_splits','nv_piece_identity'] loop
 execute format('alter table public.%I add column if not exists actor_label text',t);
 execute format('update public.%I set actor_label=public.nv_inventory_actor44(actor) where actor_label is null',t);
 execute format('drop trigger if exists nv_stamp_actor44 on public.%I',t);
 execute format('create trigger nv_stamp_actor44 before insert or update on public.%I for each row execute function public.nv_inventory_stamp_actor44()',t);
 end loop;
end $$;
create or replace function public.nv_inventory_list44() returns jsonb
language plpgsql stable security definer set search_path=public as $$begin
 if not public.nv_member() then raise exception 'not permitted' using errcode='42501';end if;
 return jsonb_build_object('plans',coalesce((select jsonb_agg(to_jsonb(x)) from
 (select * from public.nv_inventory_plans p where public.nv_inventory_access44(p.owner_id) order by updated_at desc limit 200) x),'[]'),
 'cycles',coalesce((select jsonb_agg(to_jsonb(x)-'rooms'-'asset_ids') from
 (select id,plan_id,building_id,owner_id,name,due_date,status,opened_at,closed_at,previous_id,
 jsonb_array_length(expected) target_count,(select count(*) from public.nv_inventory_observations o where o.cycle_id=c.id and exists(select 1 from jsonb_array_elements(c.expected) e where e->>'id'=o.asset_id)) seen_count
 from public.nv_inventory_cycles c where public.nv_inventory_access44(c.owner_id) order by opened_at desc limit 200) x),'[]'),
 'moves',case when public.nv_can_read() then coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('actor_label',coalesce(x.actor_label,public.nv_inventory_actor44(x.actor)))) from (select * from public.nv_asset_movements order by at desc limit 200) x),'[]') else '[]'::jsonb end,
 'splits',case when public.nv_can_read() then coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('actor_label',coalesce(x.actor_label,public.nv_inventory_actor44(x.actor)))) from (select * from public.nv_asset_splits order by at desc limit 100) x),'[]') else '[]'::jsonb end,
 'pieces',coalesce((select jsonb_agg(p.asset_id) from public.nv_piece_identity p join public.nv_collections c on c.id=p.asset_id where public.nv_can_read() or c.employee_id=public.nv_my_emp()),'[]'));
end $$;
create or replace function public.nv_inventory_plan44(p_id uuid,p_revision int,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
#variable_conflict use_variable
declare p public.nv_inventory_plans;r jsonb;ids jsonb:=coalesce(p_data->'asset_ids','[]');rooms jsonb:=coalesce(p_data->'rooms','[]');begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 if length(btrim(coalesce(p_data->>'name',''))) not between 1 and 120 or jsonb_typeof(rooms)<>'array' or jsonb_array_length(rooms)>100 or jsonb_typeof(ids)<>'array' or jsonb_array_length(ids)>5000 then raise exception 'invalid plan';end if;
 if not exists(select 1 from public.nv_schools where id=p_data->>'building_id') or not exists(select 1 from public.nv_employees where id=p_data->>'owner_id') or nullif(p_data->>'due_date','') is null then raise exception 'building, owner and deadline required';end if;
 for r in select * from jsonb_array_elements(rooms) loop
 if jsonb_typeof(r)<>'object' or length(btrim(coalesce(r->>'floor',''))) not between 1 and 100 or length(btrim(coalesce(r->>'room_number',''))) not between 1 and 100 or (coalesce(r->>'room_name_id','')<>'' and not exists(select 1 from public.nv_rooms where id=r->>'room_name_id')) then raise exception 'invalid target room';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements_text(ids) x where not exists(select 1 from public.nv_collections c where c.id=x and public.nv_inventory_scope44(c,p_data->>'building_id',rooms,'[]'))) then raise exception 'target asset outside building/rooms or not submitted';end if;
 if p_id is null then
 insert into public.nv_inventory_plans(building_id,owner_id,name,due_date,rooms,asset_ids,actor) values(p_data->>'building_id',p_data->>'owner_id',btrim(p_data->>'name'),(p_data->>'due_date')::date,rooms,ids,auth.uid()) returning * into p;
 else
 select * into p from public.nv_inventory_plans where id=p_id for update;
 if not found or p.revision is distinct from p_revision then raise exception 'PLAN_CONFLICT: حدّث الخطة قبل تعديلها';end if;
 update public.nv_inventory_plans set building_id=p_data->>'building_id',owner_id=p_data->>'owner_id',name=btrim(p_data->>'name'),due_date=(p_data->>'due_date')::date,rooms=rooms,asset_ids=ids,revision=revision+1,updated_at=now(),actor=auth.uid() where id=p_id returning * into p;
 end if;
 insert into public.nv_inventory_events(action,after_data,actor) values('plan_saved',to_jsonb(p),auth.uid());return to_jsonb(p);
end $$;
create or replace function public.nv_inventory_start44(p_plan uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p public.nv_inventory_plans;c public.nv_inventory_cycles;prev public.nv_inventory_cycles;expected jsonb;begin
 select * into p from public.nv_inventory_plans where id=p_plan for update;
 if not found or not public.nv_inventory_access44(p.owner_id,true) then raise exception 'not permitted' using errcode='42501';end if;
 select * into c from public.nv_inventory_cycles where plan_id=p.id and status='open';if found then return to_jsonb(c);end if;
 select coalesce(jsonb_agg(public.nv_inventory_asset44(a) order by a.no),'[]') into expected from public.nv_collections a where public.nv_inventory_scope44(a,p.building_id,p.rooms,p.asset_ids);
 if jsonb_array_length(expected)>5000 then raise exception 'نطاق الدورة أكبر من 5000 سجل؛ قسّم الخطة إلى غرف أو مجموعات أصغر';end if;
 select * into prev from public.nv_inventory_cycles where plan_id=p.id and status='closed' order by closed_at desc,id desc limit 1;
 insert into public.nv_inventory_cycles(plan_id,building_id,owner_id,name,due_date,rooms,asset_ids,expected,previous,previous_id,actor)
 values(p.id,p.building_id,p.owner_id,p.name,p.due_date,p.rooms,p.asset_ids,expected,coalesce(prev.snapshot,'[]'),prev.id,auth.uid()) returning * into c;
 insert into public.nv_inventory_events(cycle_id,action,actor) values(c.id,'cycle_opened',auth.uid());return to_jsonb(c);
end $$;
create or replace function public.nv_inventory_cycle44(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$declare c public.nv_inventory_cycles;begin
 select * into c from public.nv_inventory_cycles where id=p_id;
 if not found or not public.nv_inventory_access44(c.owner_id) then raise exception 'not permitted' using errcode='42501';end if;
 return jsonb_build_object('cycle',to_jsonb(c),'observations',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('actor_label',coalesce(o.actor_label,public.nv_inventory_actor44(o.actor))) order by seen_at,asset_id) from public.nv_inventory_observations o where cycle_id=c.id),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('actor_label',coalesce(e.actor_label,public.nv_inventory_actor44(e.actor))) order by at,id) from public.nv_inventory_events e where cycle_id=c.id),'[]'));
end $$;
create or replace function public.nv_inventory_scan44(p_cycle uuid,p_no bigint,p_actual jsonb,p_revision int default null,p_reason text default '') returns jsonb
language plpgsql security definer set search_path=public as $$
#variable_conflict use_variable
declare c public.nv_inventory_cycles;a public.nv_collections;o public.nv_inventory_observations;actual jsonb;qty int;begin
 select * into c from public.nv_inventory_cycles where id=p_cycle for update;
 if not found or not public.nv_inventory_access44(c.owner_id,true) then raise exception 'not permitted' using errcode='42501';end if;
 if c.status<>'open' then raise exception 'CYCLE_CLOSED: الدورة مغلقة ولا تقبل المسح';end if;
 select * into a from public.nv_collections where no=p_no and type_id is not null and submitted_at is not null;
 if not found then raise exception 'UNKNOWN_ASSET: الرقم لا يطابق أصلًا مُرسلًا؛ أضفه وزامنه أولًا';end if;
 if a.school_id<>c.building_id and not public.nv_perm('edit') and not exists(select 1 from jsonb_array_elements(c.expected||c.previous) e where e->>'id'=a.id) then raise exception 'FOREIGN_ASSET: الأصل مسجل بمبنى آخر؛ راجع المسؤول لتوثيق نقله';end if;
 select * into o from public.nv_inventory_observations where cycle_id=c.id and asset_id=a.id;
 if found and p_revision is null then return to_jsonb(o)||jsonb_build_object('duplicate',true);end if;
 if p_revision is not null and (o.asset_id is null or o.revision<>p_revision or length(btrim(coalesce(p_reason,''))) not between 3 and 1000) then raise exception 'SCAN_CONFLICT: حدّث النتيجة واكتب سبب التصحيح';end if;
 if length(btrim(coalesce(p_actual->>'floor',''))) not between 1 and 100 or length(btrim(coalesce(p_actual->>'room_number',''))) not between 1 and 100 then raise exception 'ACTUAL_LOCATION_REQUIRED: حدد الدور والغرفة الفعليين';end if;
 if jsonb_array_length(c.rooms)>0 and not exists(select 1 from jsonb_array_elements(c.rooms) r where r->>'floor'=btrim(p_actual->>'floor') and r->>'room_number'=btrim(p_actual->>'room_number')) then raise exception 'الموقع الفعلي خارج غرف نطاق الدورة';end if;
 if coalesce(p_actual->>'condition_id','')<>'' and not exists(select 1 from public.nv_conditions where id=p_actual->>'condition_id') then raise exception 'invalid condition';end if;
 if coalesce(p_actual->>'room_name_id','')<>'' and not exists(select 1 from public.nv_rooms where id=p_actual->>'room_name_id') then raise exception 'invalid room name';end if;
 qty:=nullif(p_actual->>'quantity','')::int;if qty is null then if a.quantity=1 then qty:=1;else raise exception 'ACTUAL_QUANTITY_REQUIRED: أكد الكمية الفعلية للسجل المجمّع';end if;end if;
 if qty<0 or qty>1000000 then raise exception 'invalid quantity';end if;
 if exists(select 1 from public.nv_piece_identity where asset_id=a.id) and qty<>1 then raise exception 'PIECE_QUANTITY_ONE: الأصل المستقل كميته واحدة';end if;
 actual:=jsonb_build_object('school_id',c.building_id,'floor',btrim(p_actual->>'floor'),'room_number',btrim(p_actual->>'room_number'),'room_name_id',nullif(p_actual->>'room_name_id',''),'condition_id',nullif(p_actual->>'condition_id',''),'quantity',qty,'note',left(coalesce(p_actual->>'note',''),1000));
 if o.asset_id is not null then
 insert into public.nv_inventory_events(cycle_id,action,asset_id,before_data,after_data,reason,actor) values(c.id,'observation_corrected',a.id,to_jsonb(o),actual,btrim(p_reason),auth.uid());
 update public.nv_inventory_observations set actual=actual,revision=revision+1,seen_at=now(),actor=auth.uid() where cycle_id=c.id and asset_id=a.id returning * into o;
 else
 insert into public.nv_inventory_observations(cycle_id,asset_id,snapshot,actual,actor) values(c.id,a.id,public.nv_inventory_asset44(a),actual,auth.uid()) returning * into o;
 insert into public.nv_inventory_events(cycle_id,action,asset_id,after_data,actor) values(c.id,'asset_seen',a.id,to_jsonb(o),auth.uid());
 end if;return to_jsonb(o)||jsonb_build_object('duplicate',false);
end $$;
create or replace function public.nv_inventory_close44(p_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_inventory_cycles;result jsonb;begin
 if not public.nv_perm('review') or not public.nv_sub_ok() then raise exception 'review permission required' using errcode='42501';end if;
 select * into c from public.nv_inventory_cycles where id=p_id for update;if not found then raise exception 'cycle not found';end if;
 if c.status='closed' then return to_jsonb(c);end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'سبب إغلاق الدورة مطلوب؛ غير المفحوص سيصنّف مفقودًا في هذه الدورة';end if;
 select coalesce(jsonb_agg(x),'[]') into result from(
 select e||coalesce(o.actual,'{}')||jsonb_build_object('verified',o.asset_id is not null) x from jsonb_array_elements(c.expected) e left join public.nv_inventory_observations o on o.cycle_id=c.id and o.asset_id=e->>'id'
 union all select o.snapshot||o.actual||jsonb_build_object('verified',true) from public.nv_inventory_observations o where o.cycle_id=c.id and not exists(select 1 from jsonb_array_elements(c.expected) e where e->>'id'=o.asset_id)) s;
 update public.nv_inventory_cycles set status='closed',closed_at=now(),snapshot=result where id=c.id returning * into c;
 insert into public.nv_inventory_events(cycle_id,action,reason,actor) values(c.id,'cycle_closed',btrim(p_reason),auth.uid());return to_jsonb(c);
end $$;
create or replace function public.nv_piece_location_guard44() returns trigger language plpgsql security definer set search_path=public as $$begin
 if current_setting('solvix.transfer44',true)='on' or current_setting('solvix.split44',true)='on' then new.review_status:=null;new.review_note:='';new.reviewed_at:=null;new.reviewed_by:=null;end if;
 if exists(select 1 from public.nv_piece_identity where asset_id=new.id) and new.quantity<>1 then raise exception 'PIECE_QUANTITY_ONE: استخدم سجلًا مستقلًا لكل قطعة';end if;
 if tg_op='UPDATE' and old.submitted_at is not null and auth.uid() is not null and current_setting('solvix.transfer44',true) is distinct from 'on'
 and (new.school_id,new.floor,new.room_number,new.room_name_id) is distinct from (old.school_id,old.floor,old.room_number,old.room_name_id)
 then raise exception 'DOCUMENTED_MOVE_REQUIRED: انقل الأصل من شاشة النقل الموثق';end if;return new;
end $$;
drop trigger if exists nv_piece_location_guard44 on public.nv_collections;
create trigger nv_piece_location_guard44 before insert or update on public.nv_collections for each row execute function public.nv_piece_location_guard44();
create or replace function public.nv_asset_move44(p_request uuid,p_id text,p_expected jsonb,p_to jsonb,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_collections;before_data jsonb;result public.nv_asset_movements;begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,44));select * into result from public.nv_asset_movements where id=p_request;if found then if result.asset_id<>p_id then raise exception 'request reused';end if;return to_jsonb(result);end if;
 select * into c from public.nv_collections where id=p_id for update;
 if not found or c.submitted_at is null then raise exception 'submitted asset required';end if;
 if to_jsonb(c) is distinct from to_jsonb(jsonb_populate_record(null::public.nv_collections,p_expected)) then raise exception 'ASSET_CONFLICT: تغير الأصل؛ حدّثه قبل النقل';end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 1000 or length(btrim(coalesce(p_to->>'floor',''))) not between 1 and 100 or length(btrim(coalesce(p_to->>'room_number',''))) not between 1 and 100 then raise exception 'destination and reason required';end if;
 if not exists(select 1 from public.nv_schools where id=p_to->>'school_id' and status='active' and completed_at is null) or not exists(select 1 from public.nv_employees where id=p_to->>'employee_id') or (coalesce(p_to->>'room_name_id','')<>'' and not exists(select 1 from public.nv_rooms where id=p_to->>'room_name_id')) then raise exception 'destination building must be open and references valid';end if;
 if (c.school_id,coalesce(c.floor,''),coalesce(c.room_number,''),coalesce(c.room_name_id,''))=(p_to->>'school_id',p_to->>'floor',p_to->>'room_number',coalesce(p_to->>'room_name_id','')) then raise exception 'الموقع الجديد مطابق للموقع الحالي';end if;
 before_data:=to_jsonb(c);perform set_config('solvix.transfer44','on',true);
 update public.nv_collections set school_id=p_to->>'school_id',employee_id=p_to->>'employee_id',floor=btrim(p_to->>'floor'),room_number=btrim(p_to->>'room_number'),room_name_id=nullif(p_to->>'room_name_id',''),
 review_status=null,review_note='',reviewed_by=null,reviewed_at=null,school_image=null,asset_image=null,asset_image2=null,extra_images='{}',label_photo=null,label_at=null,label_by=null,label_check=null,lat=null,lng=null,geo_dist=null where id=p_id returning * into c;
 perform set_config('solvix.transfer44','',true);
 insert into public.nv_asset_movements(id,asset_id,from_data,to_data,reason,actor) values(p_request,p_id,before_data,to_jsonb(c),btrim(p_reason),auth.uid()) returning * into result;return to_jsonb(result);
end $$;
create or replace function public.nv_asset_split44(p_request uuid,p_id text,p_expected jsonb,p_serials jsonb,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_collections;original public.nv_collections;result public.nv_asset_splits;ids jsonb:='[]';i int;newid text;s text;begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,44));select * into result from public.nv_asset_splits where id=p_request;if found then if result.source_id<>p_id then raise exception 'request reused';end if;return to_jsonb(result);end if;
 select * into original from public.nv_collections where id=p_id for update;
 if not found or original.type_id is null or original.quantity not between 1 and 200 or exists(select 1 from public.nv_piece_identity where asset_id=p_id) then raise exception 'حدد سجلًا من 1 إلى 200 قطعة لم يفصل سابقًا';end if;
 if to_jsonb(original) is distinct from to_jsonb(jsonb_populate_record(null::public.nv_collections,p_expected)) then raise exception 'ASSET_CONFLICT: حدّث الأصل قبل الفصل';end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 1000 or jsonb_typeof(p_serials) is distinct from 'array' or jsonb_array_length(p_serials)<>original.quantity then raise exception 'serial row per piece and reason required';end if;
 perform pg_advisory_xact_lock(380038);
 if exists(select 1 from jsonb_array_elements_text(p_serials) v where length(v)>256) or exists(select 1 from jsonb_array_elements_text(p_serials) v where public.nv_identity_norm(v)<>'' group by public.nv_identity_norm(v) having count(*)>1) or exists(select 1 from public.nv_collections a,jsonb_array_elements_text(p_serials) v where a.id<>p_id and public.nv_identity_norm(v)<>'' and public.nv_identity_norm(a.serial)=public.nv_identity_norm(v)) then raise exception 'الرقم التسلسلي مكرر أو طويل؛ لكل قطعة رقم مختلف أو اتركه ناقصًا لاستكماله';end if;
 perform set_config('solvix.split44','on',true);
 for i in 0..original.quantity-1 loop
 s:=btrim(p_serials->>i);
 if i=0 then newid:=p_id;update public.nv_collections set quantity=1,serial=s,review_status=null,review_note='',reviewed_by=null,reviewed_at=null where id=p_id;
 else
 newid:=gen_random_uuid()::text;
 insert into public.nv_collections(id,employee_id,school_id,floor,room_number,room_name_id,category_id,type_id,condition_id,quantity,price,manufacturer,brand,model,capacity,serial,agency,warranty,install_date,parent_child,notes,asad_country)
 values(newid,original.employee_id,original.school_id,original.floor,original.room_number,original.room_name_id,original.category_id,original.type_id,original.condition_id,1,original.price,original.manufacturer,original.brand,original.model,original.capacity,s,original.agency,original.warranty,original.install_date,original.parent_child,original.notes,original.asad_country);
 end if;
 insert into public.nv_piece_identity(asset_id,event_id,actor) values(newid,p_request,auth.uid());ids:=ids||jsonb_build_array(newid);
 end loop;
 perform set_config('solvix.split44','',true);
 insert into public.nv_asset_splits(id,source_id,before_data,asset_ids,reason,actor) values(p_request,p_id,to_jsonb(original),ids,btrim(p_reason),auth.uid()) returning * into result;return to_jsonb(result);
end $$;
create or replace function public.nv_piece_create44(p_request uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_collections;begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,45));select * into c from public.nv_collections where id=p_request::text;if found then if not exists(select 1 from public.nv_piece_identity where asset_id=c.id) then raise exception 'request reused';end if;return to_jsonb(c);end if;
 if not exists(select 1 from public.nv_schools where id=p_data->>'school_id' and status='active' and completed_at is null) or not exists(select 1 from public.nv_employees where id=p_data->>'employee_id') or not exists(select 1 from public.nv_types where id=p_data->>'type_id') then raise exception 'valid open building, employee and type required';end if;
 if length(coalesce(p_data->>'serial',''))>256 then raise exception 'serial too long';end if;
 perform pg_advisory_xact_lock(380038);if public.nv_identity_norm(p_data->>'serial')<>'' and exists(select 1 from public.nv_collections where public.nv_identity_norm(serial)=public.nv_identity_norm(p_data->>'serial')) then raise exception 'الرقم التسلسلي مستخدم لأصل آخر';end if;
 insert into public.nv_collections(id,employee_id,school_id,type_id,category_id,quantity,floor,room_number,serial)
 values(p_request::text,p_data->>'employee_id',p_data->>'school_id',p_data->>'type_id',(select cat from public.nv_types where id=p_data->>'type_id'),1,left(p_data->>'floor',100),left(p_data->>'room_number',100),coalesce(p_data->>'serial','')) returning * into c;
 insert into public.nv_piece_identity(asset_id,actor) values(c.id,auth.uid());return to_jsonb(c);
end $$;
create or replace function public.nv_piece_finish44(p_id text,p_expected jsonb,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_collections;v public.nv_collections;k text;begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 select * into c from public.nv_collections where id=p_id for update;
 if not found or not exists(select 1 from public.nv_piece_identity where asset_id=p_id) then raise exception 'حدد أصلًا مستقلًا أو حوّل السجل أولًا من قطعة / فصل القطع';end if;
 if c.submitted_at is not null then return to_jsonb(c);end if;
 if to_jsonb(c) is distinct from to_jsonb(jsonb_populate_record(null::public.nv_collections,p_expected)) then raise exception 'ASSET_CONFLICT: تغيرت المسودة؛ حدّثها قبل الإرسال';end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid fields';end if;
 for k in select jsonb_object_keys(p_data) loop
 if k not in('floor','room_number','room_name_id','condition_id','price','manufacturer','brand','model','capacity','serial','agency','warranty','install_date','asad_country','lat','lng','parent_child','tag','notes','school_image','asset_image','asset_image2') then raise exception 'protected field %',k;end if;
 end loop;
 v:=jsonb_populate_record(c,p_data);
 if v.type_id is null or length(btrim(coalesce(v.floor,'')))=0 or length(btrim(coalesce(v.room_number,'')))=0 or v.condition_id is null or v.price<0 then raise exception 'نوع الأصل والموقع والحالة الفنية مطلوبة والسعر لا يكون سالبًا';end if;
 foreach k in array array[v.school_image,v.asset_image,v.asset_image2] loop
 if k is null or not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=k||'.jpg') then raise exception 'ارفع صور المبنى والأصل ولوحة البيانات قبل الإرسال';end if;
 end loop;
 perform pg_advisory_xact_lock(380038);
 if public.nv_identity_norm(v.serial)<>'' and exists(select 1 from public.nv_collections where id<>p_id and public.nv_identity_norm(serial)=public.nv_identity_norm(v.serial)) then raise exception 'الرقم التسلسلي مكرر؛ راجع القطعة';end if;
 update public.nv_collections set floor=v.floor,room_number=v.room_number,room_name_id=v.room_name_id,condition_id=v.condition_id,price=v.price,manufacturer=v.manufacturer,brand=v.brand,model=v.model,capacity=v.capacity,serial=v.serial,agency=v.agency,warranty=v.warranty,install_date=v.install_date,asad_country=v.asad_country,lat=v.lat,lng=v.lng,parent_child=v.parent_child,tag=v.tag,notes=v.notes,school_image=v.school_image,asset_image=v.asset_image,asset_image2=v.asset_image2,submitted_at=now(),review_status=null,review_note='',reviewed_by=null,reviewed_at=null where id=p_id returning * into c;
 return to_jsonb(c);
end $$;
revoke all on function public.nv_piece_finish44(text,jsonb,jsonb) from public,anon;
grant execute on function public.nv_piece_finish44(text,jsonb,jsonb) to authenticated;
-- No direct client mutations of histories, baselines, identities, observations or plans.
do $$declare n text;begin
 for n in select p.oid::regprocedure::text from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.proname in('nv_inventory_access44','nv_inventory_asset44','nv_inventory_scope44','nv_inventory_actor44','nv_inventory_stamp_actor44','nv_piece_location_guard44','nv_inventory_list44','nv_inventory_plan44','nv_inventory_start44','nv_inventory_cycle44','nv_inventory_scan44','nv_inventory_close44','nv_asset_move44','nv_asset_split44','nv_piece_create44') loop
 execute 'revoke all on function '||n||' from public,anon,authenticated';
 if n ~ '(nv_inventory_(list|plan|start|cycle|scan|close)44|nv_asset_(move|split)44|nv_piece_create44)\(' then execute 'grant execute on function '||n||' to authenticated';end if;
 end loop;
end $$;
-- Restore the original identity explicitly: NV34 made "no" GENERATED ALWAYS.
create or replace function public.nv_asset_restore(p_trash uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t public.nv_asset_trash;restored text;begin
 if not public.nv_perm('delete') or not public.nv_perm('edit') then raise exception 'not permitted' using errcode='42501';end if;
 select * into t from public.nv_asset_trash where id=p_trash for update;
 if not found or t.restored_at is not null or t.expires_at<=now() then raise exception 'TRASH_EXPIRED: انتهت مهلة الاستعادة أو تمت الاستعادة بالفعل';end if;
 if exists(select 1 from public.nv_collections where id=t.asset_id) then raise exception 'الأصل موجود بالفعل؛ حدّث القائمة';end if;
 insert into public.nv_collections overriding system value select (jsonb_populate_record(null::public.nv_collections,t.snapshot||
 jsonb_build_object('updated_at',now(),'review_status',null,'review_note','','reviewed_at',null,'reviewed_by',null))).* returning id into restored;
 update public.nv_asset_trash set restored_at=now(),restored_by=auth.uid() where id=t.id;
 insert into public.nv_audit(actor,table_name,operation,row_id,new_data) values(auth.uid(),'nv_collections','RESTORE',restored,jsonb_build_object('trash_id',t.id));
 return jsonb_build_object('id',restored);
end $$;
revoke all on function public.nv_asset_restore(uuid) from public,anon;
grant execute on function public.nv_asset_restore(uuid) to authenticated;
-- Evidence referenced by a documented movement/split remains protected from storage cleanup.
create or replace function public.nv_photo_unreferenced(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select not exists(select 1 from public.nv_collections c where p_name=any(array[c.school_image||'.jpg',c.asset_image||'.jpg',c.asset_image2||'.jpg',c.label_photo||'.jpg']||array(select x||'.jpg' from unnest(c.extra_images) x)))
 and not exists(select 1 from public.nv_asset_trash t where t.restored_at is null and t.expires_at>now() and p_name=any(array[(t.snapshot->>'school_image')||'.jpg',(t.snapshot->>'asset_image')||'.jpg',(t.snapshot->>'asset_image2')||'.jpg',(t.snapshot->>'label_photo')||'.jpg']||array(select x||'.jpg' from jsonb_array_elements_text(coalesce(t.snapshot->'extra_images','[]')) x)))
 and not exists(select 1 from (select from_data snapshot from public.nv_asset_movements union all select before_data from public.nv_asset_splits) h
 where p_name=any(array[(h.snapshot->>'school_image')||'.jpg',(h.snapshot->>'asset_image')||'.jpg',(h.snapshot->>'asset_image2')||'.jpg',(h.snapshot->>'label_photo')||'.jpg']||array(select x||'.jpg' from jsonb_array_elements_text(coalesce(h.snapshot->'extra_images','[]')) x)))
$$;
create or replace function public.nv_public_settings() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('schema_version',38,'lifecycle_version',44,'data',jsonb_build_object('app_name',data->>'app_name','logo',data->'logo')) from public.nv_settings where id=1
$$;
notify pgrst,'reload schema';
commit;

-- NV45: explicit, independent documentation visibility. No role bypass.
begin;
create table if not exists public.nv_document_access45(
 user_id uuid primary key references auth.users(id) on delete cascade,
 guide boolean not null default false, releases boolean not null default false,
 updated_at timestamptz not null default now(), updated_by uuid
);
alter table public.nv_document_access45 enable row level security;
revoke all on public.nv_document_access45 from public, anon, authenticated;
create or replace function public.nv_document_access45() returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('guide',coalesce(a.guide,false),'releases',coalesce(a.releases,false))
 from (select 1) x left join public.nv_document_access45 a
 on a.user_id=auth.uid() and public.nv_member()
$$;
create or replace function public.nv_document_set45(p_user uuid,p_guide boolean,p_releases boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode='42501'; end if;
 if p_guide is null or p_releases is null then raise exception 'boolean selection required'; end if;
 if not exists(select 1 from public.nv_staff where user_id=p_user) and not exists(select 1 from public.nv_employees where user_id=p_user) then raise exception 'user not found'; end if;
 insert into public.nv_document_access45(user_id,guide,releases,updated_by) values(p_user,p_guide,p_releases,auth.uid())
 on conflict(user_id) do update set guide=excluded.guide,releases=excluded.releases,updated_at=now(),updated_by=auth.uid();
end $$;
create or replace function public.nv_document_users45() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(u)||jsonb_build_object('guide',coalesce(a.guide,false),'releases',coalesce(a.releases,false)) order by u.name,u.id)
 from (select user_id id,name,email,role from public.nv_staff
 union all select user_id,name,coalesce(email,''),'field' from public.nv_employees where user_id is not null and user_id not in(select user_id from public.nv_staff)) u
 left join public.nv_document_access45 a on a.user_id=u.id),'[]'::jsonb);
end $$;
create or replace function public.nv_staff_create45(p_email text,p_password text,p_name text,p_role text,p_guide boolean,p_releases boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare id uuid;
begin
 if (coalesce(p_guide,false) or coalesce(p_releases,false)) and not public.nv_is_sys() then raise exception 'only the system Admin' using errcode='42501'; end if;
 id:=public.nv_staff_create(p_email,p_password,p_name,p_role);
 if public.nv_is_sys() then perform public.nv_document_set45(id,coalesce(p_guide,false),coalesce(p_releases,false)); end if;
 return id;
end $$;
create or replace function public.nv_emp_login45(p_emp text,p_password text,p_guide boolean,p_releases boolean) returns text
language plpgsql security definer set search_path=public as $$
declare result text; id uuid;
begin
 if (coalesce(p_guide,false) or coalesce(p_releases,false)) and not public.nv_is_sys() then raise exception 'only the system Admin' using errcode='42501'; end if;
 result:=public.nv_emp_set_login(p_emp,p_password);
 select user_id into id from public.nv_employees where public.nv_employees.id=p_emp;
 if public.nv_is_sys() then perform public.nv_document_set45(id,coalesce(p_guide,false),coalesce(p_releases,false)); end if;
 return result;
end $$;
revoke all on function public.nv_document_access45(),public.nv_document_set45(uuid,boolean,boolean),public.nv_document_users45(),public.nv_staff_create45(text,text,text,text,boolean,boolean),public.nv_emp_login45(text,text,boolean,boolean) from public,anon;
grant execute on function public.nv_document_access45(),public.nv_document_set45(uuid,boolean,boolean),public.nv_document_users45(),public.nv_staff_create45(text,text,text,text,boolean,boolean),public.nv_emp_login45(text,text,boolean,boolean) to authenticated;
create or replace function public.nv_me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'role', case when public.nv_perm('edit') or public.nv_perm('catalog') or public.nv_perm('users') or public.nv_perm('settings') or public.nv_perm('review') then 'admin'
                 when public.nv_can_read() then 'reader' when public.nv_my_emp() is not null then 'tech' end,
    'staff_role', (select case when s.role = 'admin' then 'owner' else s.role end from public.nv_staff s where s.user_id = auth.uid() and s.active),
    'sys', public.nv_is_sys(),
    'doc_access',public.nv_document_access45(),
    'perms', case when public.nv_can_read() then (select coalesce(jsonb_agg(k), '[]') from unnest(array['view','edit','delete','users','settings','catalog','review','export','import','backup']) k where public.nv_perm(k))
                  when public.nv_my_emp() is not null then (select coalesce(jsonb_agg(k), '[]') from unnest(array['collect','edit_sent','finish','gallery','extra']) k where public.nv_emp_perm(k)) end,
    'sub', (select jsonb_build_object('ends_at', s.ends_at, 'grace_days', s.grace_days, 'ok', public.nv_sub_ok(), 'plan', s.plan) from public.nv_subscription s where s.id = 1),
    'emp', (select to_jsonb(e) - 'user_id' from public.nv_employees e where e.user_id = auth.uid())) $$;
commit;
