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
create or replace function public.nv_first_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email,'')) not like '%@novaro.local' and not exists(select 1 from public.nv_staff) then
    insert into public.nv_staff(user_id, email, name, role) values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'sysadmin')
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
update public.nv_staff set role = 'sysadmin'
 where not exists(select 1 from public.nv_staff where role = 'sysadmin')
   and user_id = (select s.user_id from public.nv_staff s join auth.users u on u.id = s.user_id where s.role in ('owner','admin') and s.active order by u.created_at, s.created_at limit 1);
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

-- =====================================================================
-- NV34 — customers (multi-tenant): every customer has its own data (management accounts, field supervisors, buildings, assets,
-- change log, settings), its own subscription and limits. The system Admin keeps the list of customers and works inside one of them
-- at a time (nv_staff.cur_tenant). The asset catalog, conditions and room names are shared (tenant_id null, edited by the system Admin);
-- a customer may add its own (tenant_id = that customer). The existing data becomes the first customer 't1'.
-- =====================================================================
create table if not exists public.nv_tenants(id text primary key, name text not null, plan text not null default 'trial',
  starts_at timestamptz, ends_at timestamptz, grace_days int not null default 7 check(grace_days between 0 and 90),
  max_schools int, max_field int, max_staff int, max_assets int, notes text not null default '',
  contact_name text not null default '', contact_email text not null default '', contact_phone text not null default '',
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by text);
alter table public.nv_tenants add column if not exists cc_emails text not null default ''; -- extra recipients (CC) of the customer's mails
alter table public.nv_tenants enable row level security;
revoke all on public.nv_tenants from anon, authenticated;
insert into public.nv_tenants(id, name, plan, starts_at, ends_at, grace_days, max_schools, max_field, max_staff, max_assets, notes, created_at)
  select 't1', coalesce(nullif(trim(s.customer),''), 'العميل الأول'), s.plan, s.starts_at, s.ends_at, s.grace_days, s.max_schools, s.max_field, s.max_staff, s.max_assets, s.notes, '2000-01-01'
  from public.nv_subscription s where s.id = 1
on conflict (id) do nothing;
insert into public.nv_tenants(id, name, created_at) values ('t1', 'العميل الأول', '2000-01-01') on conflict (id) do nothing;
alter table public.nv_staff add column if not exists tenant_id text references public.nv_tenants(id) on delete cascade;
alter table public.nv_staff add column if not exists cur_tenant text references public.nv_tenants(id) on delete set null;
update public.nv_staff set tenant_id = 't1' where tenant_id is null and role <> 'sysadmin';
do $t$ declare t text; begin
  foreach t in array array['nv_employees','nv_schools','nv_collections','nv_log','nv_settings','nv_sub_log','nv_categories','nv_types','nv_conditions','nv_rooms'] loop
    execute format('alter table public.%I add column if not exists tenant_id text references public.nv_tenants(id) on delete cascade', t);
  end loop;
end $t$;
-- the customer of the caller: his own, or (system Admin) the one he works in now, else the first one
create or replace function public.nv_tenant() returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when s.role = 'sysadmin' then coalesce(s.cur_tenant, (select t.id from public.nv_tenants t order by t.created_at, t.id limit 1)) else s.tenant_id end
       from public.nv_staff s where s.user_id = auth.uid() and s.active),
    (select e.tenant_id from public.nv_employees e where e.user_id = auth.uid() and auth.uid() is not null)) $$;
-- the shared catalog: what the system Admin adds is shared, what a customer adds is his own
create or replace function public.nv_cat_tenant() returns text language sql stable security definer set search_path = public as $$
  select case when public.nv_is_sys() then null else public.nv_tenant() end $$;
do $t$ declare t text; begin
  foreach t in array array['nv_employees','nv_schools','nv_collections','nv_log'] loop
    execute format('update public.%I set tenant_id = ''t1'' where tenant_id is null', t);
    execute format('alter table public.%I alter column tenant_id set default public.nv_tenant()', t);
    execute format('alter table public.%I alter column tenant_id set not null', t);
    execute format('create index if not exists %I on public.%I(tenant_id)', t || '_tenant', t);
  end loop;
  foreach t in array array['nv_categories','nv_types','nv_conditions','nv_rooms'] loop
    execute format('alter table public.%I alter column tenant_id set default public.nv_cat_tenant()', t);
  end loop;
end $t$;
update public.nv_sub_log set tenant_id = 't1' where tenant_id is null;
-- one settings row per customer (row 1 = the first customer; the sign-in pages read its name and logo)
alter table public.nv_settings drop constraint if exists nv_settings_id_check;
create sequence if not exists public.nv_settings_id_seq start 2;
alter table public.nv_settings alter column id set default nextval('public.nv_settings_id_seq');
update public.nv_settings set tenant_id = 't1' where id = 1 and tenant_id is null;
create unique index if not exists nv_settings_tenant_u on public.nv_settings(tenant_id);
insert into public.nv_settings(tenant_id, data) select t.id, jsonb_build_object('app_name', 'Solvix') from public.nv_tenants t
  where not exists(select 1 from public.nv_settings s where s.tenant_id = t.id);
-- numbers / identifiers are unique inside a customer, not across customers
alter table public.nv_employees drop constraint if exists nv_employees_number_key;
create unique index if not exists nv_employees_tenant_number_u on public.nv_employees(tenant_id, number);
alter table public.nv_schools drop constraint if exists nv_schools_ident_key;
create unique index if not exists nv_schools_tenant_ident_u on public.nv_schools(tenant_id, ident);
drop index if exists public.nv_types_code_u;
create unique index if not exists nv_types_code_u2 on public.nv_types(coalesce(tenant_id,'*'), code) where code is not null and code <> '';
-- custom building fields of the customer (NV34 «نموذج بيانات المباني»)
alter table public.nv_schools add column if not exists extra jsonb not null default '{}';

-- subscription and limits now belong to the customer
create or replace function public.nv_sub_ok() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select t.active and (t.ends_at is null or now() < t.ends_at + make_interval(days => t.grace_days)) from public.nv_tenants t where t.id = public.nv_tenant()), true) $$;
create or replace function public.nv_usage(p_tenant text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('schools', (select count(*) from public.nv_schools where tenant_id = p_tenant), 'field', (select count(*) from public.nv_employees where tenant_id = p_tenant),
    'staff', (select count(*) from public.nv_staff where tenant_id = p_tenant and role <> 'sysadmin' and active),
    'assets', (select count(*) from public.nv_collections where tenant_id = p_tenant and type_id is not null)) $$;
create or replace function public.nv_limit_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare s public.nv_tenants; n int; lim int; what text;
begin
  if public.nv_is_sys() and tg_table_name <> 'nv_staff' then return new; end if;
  if tg_table_name = 'nv_staff' then if new.role = 'sysadmin' or new.tenant_id is null then return new; end if; end if;
  select * into s from public.nv_tenants where id = new.tenant_id;
  if s.id is null then return new; end if;
  if tg_table_name = 'nv_schools' then lim := s.max_schools; what := 'schools'; select count(*) into n from public.nv_schools where tenant_id = new.tenant_id;
  elsif tg_table_name = 'nv_employees' then lim := s.max_field; what := 'field supervisors'; select count(*) into n from public.nv_employees where tenant_id = new.tenant_id;
  elsif tg_table_name = 'nv_staff' then if public.nv_is_sys() then return new; end if; lim := s.max_staff; what := 'management accounts';
    select count(*) into n from public.nv_staff where tenant_id = new.tenant_id and role <> 'sysadmin' and active and user_id <> new.user_id;
  else
    if new.type_id is null or (tg_op = 'UPDATE' and old.type_id is not null) then return new; end if;
    lim := s.max_assets; what := 'assets'; select count(*) into n from public.nv_collections where tenant_id = new.tenant_id and type_id is not null;
  end if;
  if lim is not null and n >= lim then raise exception 'subscription limit reached: % (%)', what, lim using errcode = 'P0001'; end if;
  return new;
end $$;
create or replace function public.nv_sub_get() returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.nv_member() then to_jsonb(t) - 'updated_by' || jsonb_build_object('customer', t.name, 'ok', public.nv_sub_ok(), 'now', now(), 'usage', public.nv_usage(t.id),
    'log', case when public.nv_is_sys() then coalesce((select jsonb_agg(l order by l.at desc) from (select * from public.nv_sub_log where tenant_id = t.id order by at desc limit 50) l), '[]') end) end
  from public.nv_tenants t where t.id = public.nv_tenant() $$;
create or replace function public.nv_tenant_upd(p_id text, p jsonb) returns void language sql security definer set search_path = public as $$
  update public.nv_tenants set name = coalesce(nullif(trim(coalesce(p->>'name', p->>'customer')),''), name), plan = coalesce(p->>'plan', plan),
    starts_at = case when p ? 'starts_at' then nullif(p->>'starts_at','')::timestamptz else starts_at end,
    ends_at = case when p ? 'ends_at' then nullif(p->>'ends_at','')::timestamptz else ends_at end,
    grace_days = coalesce(nullif(p->>'grace_days','')::int, grace_days),
    max_schools = case when p ? 'max_schools' then nullif(p->>'max_schools','')::int else max_schools end,
    max_field = case when p ? 'max_field' then nullif(p->>'max_field','')::int else max_field end,
    max_staff = case when p ? 'max_staff' then nullif(p->>'max_staff','')::int else max_staff end,
    max_assets = case when p ? 'max_assets' then nullif(p->>'max_assets','')::int else max_assets end,
    notes = coalesce(p->>'notes', notes), contact_name = coalesce(p->>'contact_name', contact_name), contact_email = coalesce(lower(trim(p->>'contact_email')), contact_email),
    contact_phone = coalesce(p->>'contact_phone', contact_phone), cc_emails = coalesce(lower(regexp_replace(p->>'cc_emails', '\s+', '', 'g')), cc_emails), active = coalesce((p->>'active')::boolean, active),
    updated_at = now(), updated_by = (select email from public.nv_staff where user_id = auth.uid()) where id = p_id $$;
revoke all on function public.nv_tenant_upd(text,jsonb) from public, anon, authenticated;
create or replace function public.nv_sub_save(p jsonb, p_action text default 'edit') returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode = '42501'; end if;
  perform public.nv_tenant_upd(public.nv_tenant(), p);
  insert into public.nv_sub_log(tenant_id, by, action, data) values (public.nv_tenant(), (select email from public.nv_staff where user_id = auth.uid()), coalesce(nullif(p_action,''),'edit'), p);
  return public.nv_sub_get();
end $$;
-- the list of customers with their usage (system Admin)
create or replace function public.nv_tenant_list() returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.nv_is_sys() then coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('usage', public.nv_usage(t.id),
      'ok', t.active and (t.ends_at is null or now() < t.ends_at + make_interval(days => t.grace_days)),
      'owners', (select coalesce(jsonb_agg(jsonb_build_object('email', s.email, 'name', s.name) order by s.created_at), '[]') from public.nv_staff s where s.tenant_id = t.id and s.active and s.role in ('owner','admin')),
      'current', t.id = public.nv_tenant()) order by t.created_at, t.id), '[]') end
  from public.nv_tenants t $$;
-- add or change a customer; a new customer can get its owner account at once (owner_email / owner_password / owner_name)
create or replace function public.nv_tenant_save(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text := nullif(p->>'id',''); prev text; me text := (select email from public.nv_staff where user_id = auth.uid());
begin
  if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode = '42501'; end if;
  if v_id is null then
    if coalesce(trim(p->>'name'),'') = '' then raise exception 'customer name required'; end if;
    v_id := 't' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    insert into public.nv_tenants(id, name) values (v_id, trim(p->>'name'));
    insert into public.nv_settings(tenant_id, data) values (v_id, jsonb_build_object('app_name', 'Solvix'));
    insert into public.nv_sub_log(tenant_id, by, action, data) values (v_id, me, 'create', p - 'owner_password');
  elsif not exists(select 1 from public.nv_tenants where id = v_id) then raise exception 'customer not found';
  else insert into public.nv_sub_log(tenant_id, by, action, data) values (v_id, me, 'edit', p - 'owner_password'); end if;
  perform public.nv_tenant_upd(v_id, p);
  if coalesce(p->>'owner_email','') <> '' then
    select cur_tenant into prev from public.nv_staff where user_id = auth.uid();
    update public.nv_staff set cur_tenant = v_id where user_id = auth.uid();
    perform public.nv_staff_create(p->>'owner_email', p->>'owner_password', coalesce(p->>'owner_name',''), 'owner');
    update public.nv_staff set cur_tenant = prev where user_id = auth.uid();
  end if;
  return (select x from jsonb_array_elements(public.nv_tenant_list()) x where x->>'id' = v_id);
end $$;
-- the system Admin opens a customer's data
create or replace function public.nv_tenant_use(p_id text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode = '42501'; end if;
  if not exists(select 1 from public.nv_tenants where id = p_id) then raise exception 'customer not found'; end if;
  update public.nv_staff set cur_tenant = p_id where user_id = auth.uid();
end $$;
revoke all on function public.nv_tenant(), public.nv_cat_tenant(), public.nv_usage(text), public.nv_tenant_list(), public.nv_tenant_save(jsonb), public.nv_tenant_use(text) from public, anon;
grant execute on function public.nv_tenant(), public.nv_cat_tenant(), public.nv_tenant_list(), public.nv_tenant_save(jsonb), public.nv_tenant_use(text) to authenticated;
revoke all on function public.nv_usage(text) from authenticated;

-- policies: every row of a customer is seen and changed only inside that customer
do $$ declare t text; begin
  foreach t in array array['nv_categories','nv_types','nv_conditions','nv_rooms'] loop
    execute format('drop policy if exists p_%1$s_read on public.%1$s', t);
    execute format('create policy p_%1$s_read on public.%1$s for select using (public.nv_member() and (tenant_id is null or tenant_id = public.nv_tenant()))', t);
    execute format('drop policy if exists p_%1$s_write on public.%1$s', t);
    execute format('create policy p_%1$s_write on public.%1$s for all using ((tenant_id is null and public.nv_is_sys()) or (tenant_id = public.nv_tenant() and public.nv_perm(''catalog'')))
      with check ((tenant_id is null and public.nv_is_sys()) or (tenant_id = public.nv_tenant() and public.nv_perm(''catalog'')))', t);
  end loop;
  foreach t in array array['nv_schools','nv_employees'] loop
    execute format('drop policy if exists p_%1$s_ins on public.%1$s', t);execute format('drop policy if exists p_%1$s_upd on public.%1$s', t);execute format('drop policy if exists p_%1$s_del on public.%1$s', t);
    execute format('create policy p_%1$s_ins on public.%1$s for insert with check (tenant_id = public.nv_tenant() and public.nv_perm(''edit''))', t);
    execute format('create policy p_%1$s_upd on public.%1$s for update using (tenant_id = public.nv_tenant() and public.nv_perm(''edit'')) with check (tenant_id = public.nv_tenant() and public.nv_perm(''edit''))', t);
    execute format('create policy p_%1$s_del on public.%1$s for delete using (tenant_id = public.nv_tenant() and public.nv_perm(''delete''))', t);
  end loop;
end $$;
drop policy if exists p_nv_schools_read on public.nv_schools;
create policy p_nv_schools_read on public.nv_schools for select using (tenant_id = public.nv_tenant() and public.nv_member());
drop policy if exists p_nv_emp_read on public.nv_employees;
create policy p_nv_emp_read on public.nv_employees for select using (tenant_id = public.nv_tenant() and (public.nv_can_read() or user_id = auth.uid()));
create or replace function public.nv_school_open_for_me(p_school text) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.nv_schools s where s.id = p_school and s.tenant_id = public.nv_tenant() and s.status = 'active' and s.completed_at is null)
     and not exists(select 1 from public.nv_collections c where c.school_id = p_school and c.employee_id <> public.nv_my_emp()) $$;
drop policy if exists p_nv_coll_read on public.nv_collections;
create policy p_nv_coll_read on public.nv_collections for select using (tenant_id = public.nv_tenant() and (public.nv_can_read() or employee_id = public.nv_my_emp()));
drop policy if exists p_nv_coll_ins on public.nv_collections;
create policy p_nv_coll_ins on public.nv_collections for insert with check (tenant_id = public.nv_tenant() and (public.nv_perm('edit') or (employee_id = public.nv_my_emp() and public.nv_emp_perm('collect') and public.nv_school_open_for_me(school_id))));
drop policy if exists p_nv_coll_upd on public.nv_collections;
create policy p_nv_coll_upd on public.nv_collections for update using (tenant_id = public.nv_tenant() and (public.nv_perm('edit') or public.nv_perm('review') or (employee_id = public.nv_my_emp() and public.nv_sub_ok() and (submitted_at is null or public.nv_emp_perm('edit_sent')))))
  with check (tenant_id = public.nv_tenant() and (public.nv_perm('edit') or public.nv_perm('review') or (employee_id = public.nv_my_emp() and public.nv_sub_ok())));
drop policy if exists p_nv_coll_del on public.nv_collections;
create policy p_nv_coll_del on public.nv_collections for delete using (tenant_id = public.nv_tenant() and (public.nv_perm('delete') or (employee_id = public.nv_my_emp() and submitted_at is null and public.nv_sub_ok())));
drop policy if exists p_nv_log_read on public.nv_log;
create policy p_nv_log_read on public.nv_log for select using (tenant_id = public.nv_tenant() and public.nv_can_read());
drop policy if exists p_nv_set_read on public.nv_settings;
create policy p_nv_set_read on public.nv_settings for select using (tenant_id = public.nv_tenant() or (auth.uid() is null and id = 1));
drop policy if exists p_nv_set_write on public.nv_settings;
create policy p_nv_set_write on public.nv_settings for update using (tenant_id = public.nv_tenant() and public.nv_perm('settings')) with check (tenant_id = public.nv_tenant() and public.nv_perm('settings'));
drop policy if exists p_nv_staff_read on public.nv_staff;
create policy p_nv_staff_read on public.nv_staff for select using (user_id = auth.uid() or (public.nv_can_users() and (tenant_id = public.nv_tenant() or (role = 'sysadmin' and public.nv_is_sys()))));

-- the change log line carries the customer of the asset
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
  if tg_op = 'UPDATE' and old.submitted_at is not null then
    o := to_jsonb(old); n := to_jsonb(new);
    for k in select unnest(array['category_id','type_id','condition_id','quantity','price','status','manufacturer','brand','model','capacity','serial','agency',
               'warranty','install_date','asad_country','lat','lng','asset_image','asset_image2','extra_images','parent_child','tag','notes','floor','room_number','room_name_id','employee_id','school_id','school_image']) loop
      if (o->k) is distinct from (n->k) then ch := ch || jsonb_build_object(k, jsonb_build_object('old', o->k, 'new', n->k)); end if;
    end loop;
    if ch <> '{}' then
      insert into public.nv_log(tenant_id, by, coll, school, emp, changes) values (new.tenant_id, case when public.nv_is_admin() then 'admin' else 'emp:'||coalesce(public.nv_my_emp(),'?') end,
        new.id, new.school_id, new.employee_id, ch);
    end if;
  end if;
  return new;
end $$;
-- server functions stay inside the caller's customer
create or replace function public.nv_busy_schools() returns setof text language sql stable security definer set search_path = public as $$
  select distinct c.school_id from public.nv_collections c where public.nv_member() and c.tenant_id = public.nv_tenant() and c.employee_id is distinct from public.nv_my_emp() $$;
create or replace function public.nv_complete_school(p_school text) returns void language plpgsql security definer set search_path = public as $$
declare me text := public.nv_my_emp();
begin
  if me is null or not public.nv_emp_perm('finish') then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists(select 1 from public.nv_collections where school_id = p_school and employee_id = me and submitted_at is not null) then raise exception 'no submitted assets'; end if;
  delete from public.nv_collections where school_id = p_school and employee_id = me and submitted_at is null;
  update public.nv_schools set completed_at = coalesce(completed_at, now()), completed_by = coalesce(completed_by, me), status = 'inactive' where id = p_school and tenant_id = public.nv_tenant();
end $$;
create or replace function public.nv_emp_logins() returns table(id text, has_login boolean) language sql stable security definer set search_path = public as $$
  select e.id, e.user_id is not null from public.nv_employees e where public.nv_can_read() and e.tenant_id = public.nv_tenant() $$;
create or replace function public.nv_emp_perms(p_emp text, p_perms jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode = '42501'; end if;
  update public.nv_employees set perms = p_perms where id = p_emp and tenant_id = public.nv_tenant(); if not found then raise exception 'employee not found'; end if;
end $$;
create or replace function public.nv_staff_list() returns setof jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(s) from public.nv_staff s where public.nv_is_sys() and (s.role = 'sysadmin' or s.tenant_id = public.nv_tenant()) order by s.role = 'sysadmin' desc, s.created_at $$;
create or replace function public.nv_staff_perms(p_user uuid, p_perms jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.nv_is_sys() then raise exception 'only the system Admin' using errcode = '42501'; end if;
  update public.nv_staff set perms = p_perms where user_id = p_user and role <> 'sysadmin'; if not found then raise exception 'user not found'; end if;
end $$;
-- a supervisor's sign-in is created / moved only for the caller's own customer
-- (a sign-in without an e-mail is nv<number>@novaro.local, which is unique only for the first customer: the others need the supervisor's e-mail)
create or replace function public.nv_emp_in_tenant(p_emp text) returns void language plpgsql stable security definer set search_path = public as $$
declare e public.nv_employees;
begin
  select * into e from public.nv_employees where id = p_emp and tenant_id = public.nv_tenant();
  if e.id is null then raise exception 'employee not found'; end if;
  if e.tenant_id <> 't1' and coalesce(trim(e.email),'') = '' and e.user_id is null then raise exception 'e-mail required for the field supervisor sign-in'; end if;
end $$;
revoke all on function public.nv_emp_in_tenant(text) from public, anon, authenticated;
do $w$ declare f text; src text; begin
  -- wrap nv_emp_set_login / nv_emp_sync_email: the same bodies, plus the customer check first
  foreach f in array array['nv_emp_set_login(text,text)','nv_emp_sync_email(text)'] loop
    select pg_get_functiondef(f::regprocedure) into src;
    if src not like '%nv_emp_in_tenant%' then
      src := replace(src, 'if not public.nv_is_admin() then raise exception ''not allowed'' using errcode = ''42501''; end if;',
                          'if not public.nv_is_admin() then raise exception ''not allowed'' using errcode = ''42501''; end if; perform public.nv_emp_in_tenant(p_emp);');
      execute src;
    end if;
  end loop;
end $w$;
-- management accounts: created inside the caller's customer (an Admin account has none); never one of another customer's accounts
create or replace function public.nv_staff_in_tenant(p_user uuid) returns void language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is not null and not public.nv_is_sys() and exists(select 1 from public.nv_staff where user_id = p_user and tenant_id is distinct from public.nv_tenant()) then
    raise exception 'this account belongs to another customer' using errcode = '42501'; end if;
end $$;
revoke all on function public.nv_staff_in_tenant(uuid) from public, anon, authenticated;
do $w$ declare src text; begin
  select pg_get_functiondef('public.nv_staff_create(text,text,text,text)'::regprocedure) into src;
  if src not like '%nv_staff_in_tenant%' then
    src := replace(src, 'select id into v_id from auth.users where lower(email) = v_email;', 'select id into v_id from auth.users where lower(email) = v_email; perform public.nv_staff_in_tenant(v_id);');
    src := replace(src, 'insert into public.nv_staff(user_id, email, name, role) values (v_id, v_email, coalesce(nullif(trim(p_name),''''), split_part(v_email,''@'',1)), p_role)
  on conflict (user_id) do update set name = excluded.name, role = excluded.role, active = true;',
      'insert into public.nv_staff(user_id, email, name, role, tenant_id) values (v_id, v_email, coalesce(nullif(trim(p_name),''''), split_part(v_email,''@'',1)), p_role, case when p_role = ''sysadmin'' then null else public.nv_tenant() end)
  on conflict (user_id) do update set name = excluded.name, role = excluded.role, active = true, tenant_id = excluded.tenant_id;');
    execute src;
  end if;
  foreach src in array array['public.nv_staff_set(uuid,text,boolean)','public.nv_staff_set_password(uuid,text)'] loop
    select pg_get_functiondef(src::regprocedure) into src;
    if src not like '%nv_staff_in_tenant%' then
      src := replace(src, 'if not public.nv_can_users() then raise exception ''not allowed'' using errcode = ''42501''; end if;',
                          'if not public.nv_can_users() then raise exception ''not allowed'' using errcode = ''42501''; end if; perform public.nv_staff_in_tenant(p_user);');
      execute src;
    end if;
  end loop;
end $w$;
-- delete a management account (its sign-in too); the same rules as changing it, never yourself
create or replace function public.nv_staff_delete(p_user uuid) returns void language plpgsql security definer set search_path = public, auth as $$
declare r public.nv_staff;
begin
  if not public.nv_can_users() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'you cannot delete your own account'; end if;
  select * into r from public.nv_staff where user_id = p_user;
  if r.user_id is null then raise exception 'user not found'; end if;
  perform public.nv_staff_in_tenant(p_user);
  if r.role = 'sysadmin' and not public.nv_is_sys() then raise exception 'only the system Admin can change an Admin' using errcode = '42501'; end if;
  if r.role = 'sysadmin' and (select count(*) from public.nv_staff where role = 'sysadmin' and active) <= 1 then raise exception 'the last Admin cannot be deleted'; end if;
  if r.role in ('owner','admin') and not public.nv_is_owner() then raise exception 'only an owner can change an owner' using errcode = '42501'; end if;
  delete from public.nv_staff where user_id = p_user;
  -- the sign-in goes too, unless the same account is also a field supervisor
  if not exists(select 1 from public.nv_employees where user_id = p_user) then delete from auth.users where id = p_user; end if;
end $$;
revoke all on function public.nv_staff_delete(uuid) from public, anon;
grant execute on function public.nv_staff_delete(uuid) to authenticated;
-- serial duplicates and labels: inside the customer
create or replace function public.nv_serial_dupes(p_serial text, p_id text default null) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('label', '101' || lpad(c.no::text, 8, '0'), 'school', s.name, 'mine', c.employee_id = public.nv_my_emp()) order by c.no), '[]')
  from (select * from public.nv_collections c0
         where public.nv_member() and c0.tenant_id = public.nv_tenant() and length(regexp_replace(upper(coalesce(p_serial,'')), '[^A-Z0-9]', '', 'g')) >= 4 and c0.id is distinct from p_id and c0.type_id is not null
           and regexp_replace(upper(c0.serial), '[^A-Z0-9]', '', 'g') = regexp_replace(upper(p_serial), '[^A-Z0-9]', '', 'g') limit 5) c
  left join public.nv_schools s on s.id = c.school_id $$;
do $w$ declare f text; src text; begin
  foreach f in array array['public.nv_label_confirm(text,text,text)'] loop
    select pg_get_functiondef(f::regprocedure) into src;
    if src not like '%tenant_id = public.nv_tenant()%' then
      src := replace(src, 'select * into c from public.nv_collections where id = p_id;', 'select * into c from public.nv_collections where id = p_id and tenant_id = public.nv_tenant();');
      execute src;
    end if;
  end loop;
  select pg_get_functiondef('public.nv_label_printed(text[])'::regprocedure) into src;
  if src not like '%tenant_id = public.nv_tenant()%' then
    src := replace(src, 'where id = any(p_ids) and submitted_at', 'where id = any(p_ids) and tenant_id = public.nv_tenant() and submitted_at'); execute src;
  end if;
end $w$;
-- renewal request and reminders per customer
create or replace function public.nv_renew_request(p_note text default '') returns jsonb language plpgsql security definer set search_path = public as $$
declare me public.nv_staff; s public.nv_tenants;
begin
  select * into me from public.nv_staff where user_id = auth.uid() and active;
  if me.user_id is null or me.role = 'sysadmin' then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists(select 1 from public.nv_sub_log where action = 'renew_request' and by = me.email and at > now() - interval '12 hours') then
    raise exception 'a renewal request was already sent in the last 12 hours'; end if;
  select * into s from public.nv_tenants where id = me.tenant_id;
  insert into public.nv_sub_log(tenant_id, by, action, data) values (s.id, me.email, 'renew_request', jsonb_build_object('note', left(coalesce(p_note,''), 1000), 'ends_at', s.ends_at::text));
  return jsonb_build_object('by', me.email, 'name', me.name, 'role', me.role, 'note', left(coalesce(p_note,''), 1000), 'customer', s.name, 'plan', s.plan, 'ends_at', s.ends_at,
    'ok', public.nv_sub_ok(), 'max_schools', s.max_schools, 'max_field', s.max_field, 'max_staff', s.max_staff, 'max_assets', s.max_assets, 'usage', public.nv_usage(s.id));
end $$;
-- reminders due for every customer (a list; the Edge Function sends one mail each)
create or replace function public.nv_sub_reminder_due() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.nv_tenants; d int; st int; out jsonb := '[]';
begin
  for s in select * from public.nv_tenants where active and ends_at is not null loop
    d := ceil(extract(epoch from (s.ends_at - now())) / 86400)::int;
    st := case when d <= 0 and now() < s.ends_at + make_interval(days => greatest(s.grace_days, 1)) then 0 when d = 1 then 1 when d between 2 and 7 then 7 when d between 8 and 14 then 14 end;
    if st is null then continue; end if;
    if exists(select 1 from public.nv_sub_log where tenant_id = s.id and action = 'reminder' and data->>'stage' = st::text and data->>'ends_at' = s.ends_at::text) then continue; end if;
    out := out || jsonb_build_array(jsonb_build_object('tenant', s.id, 'stage', st, 'days', d, 'ends_at', s.ends_at, 'grace_days', s.grace_days, 'customer', s.name, 'plan', s.plan,
      'app_name', (select data->>'app_name' from public.nv_settings where tenant_id = s.id),
      'to', (select coalesce(jsonb_agg(distinct lower(email)), '[]') from public.nv_staff where tenant_id = s.id and active and role in ('owner','admin')),
      'cc', (select coalesce(jsonb_agg(distinct x), '[]') from (select lower(email) x from public.nv_staff where active and role = 'sysadmin'
              union select lower(trim(y)) from unnest(string_to_array(s.cc_emails, ',')) y where trim(y) <> '' union select lower(s.contact_email) where s.contact_email <> '') z)));
  end loop;
  return case when jsonb_array_length(out) = 0 then null else out end;
end $$;
drop function if exists public.nv_sub_reminder_mark(int,timestamptz,jsonb);
create or replace function public.nv_sub_reminder_mark(p_stage int, p_ends_at timestamptz, p_to jsonb, p_tenant text default 't1') returns void language sql security definer set search_path = public as $$
  insert into public.nv_sub_log(tenant_id, by, action, data) values (p_tenant, 'system', 'reminder', jsonb_build_object('stage', p_stage, 'ends_at', p_ends_at::text, 'to', p_to)) $$;
revoke all on function public.nv_sub_reminder_due(), public.nv_sub_reminder_mark(int,timestamptz,jsonb,text) from public, anon, authenticated;
do $g$ begin execute 'grant execute on function public.nv_sub_reminder_due(), public.nv_sub_reminder_mark(int,timestamptz,jsonb,text) to service_role'; exception when undefined_object then null; end $g$;
-- who am I (NV34): + the customer
create or replace function public.nv_me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'role', case when public.nv_perm('edit') or public.nv_perm('catalog') or public.nv_perm('users') or public.nv_perm('settings') or public.nv_perm('review') then 'admin'
                 when public.nv_can_read() then 'reader' when public.nv_my_emp() is not null then 'tech' end,
    'staff_role', (select case when s.role = 'admin' then 'owner' else s.role end from public.nv_staff s where s.user_id = auth.uid() and s.active),
    'sys', public.nv_is_sys(),
    'perms', case when public.nv_can_read() then (select coalesce(jsonb_agg(k), '[]') from unnest(array['view','edit','delete','users','settings','catalog','review','export','import','backup']) k where public.nv_perm(k))
                  when public.nv_my_emp() is not null then (select coalesce(jsonb_agg(k), '[]') from unnest(array['collect','edit_sent','finish','gallery','extra']) k where public.nv_emp_perm(k)) end,
    'sub', (select jsonb_build_object('ends_at', t.ends_at, 'grace_days', t.grace_days, 'ok', public.nv_sub_ok(), 'plan', t.plan, 'active', t.active) from public.nv_tenants t where t.id = public.nv_tenant()),
    'tenant', (select jsonb_build_object('id', t.id, 'name', t.name) from public.nv_tenants t where t.id = public.nv_tenant()),
    'emp', (select to_jsonb(e) - 'user_id' from public.nv_employees e where e.user_id = auth.uid())) $$;

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
