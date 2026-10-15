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
