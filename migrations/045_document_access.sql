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
