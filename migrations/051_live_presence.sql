-- NV56: live monitoring of the field supervisors («المتابعة المباشرة»).
--  The field app sends a short heartbeat (nv_presence_ping) when the page changes and every 2 minutes while open:
--  the building / floor / room it is on, the page, how many changes wait on the phone, the app version.
--  nv_presence_list() (perm view) returns every active supervisor with his last heartbeat, today's assets and his last asset time.
begin;
create table if not exists public.nv_presence(
  emp_id text primary key references public.nv_employees(id) on delete cascade,
  user_id uuid,
  at timestamptz not null default now(),
  school_id text,
  floor text,
  room text,
  page text,
  pending int not null default 0,
  version text,
  updated_at timestamptz not null default now()
);
alter table public.nv_presence enable row level security;
revoke all on public.nv_presence from public,anon,authenticated;

create or replace function public.nv_presence_ping(p jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare e text:=public.nv_my_emp();
begin
  if e is null then raise exception 'not allowed' using errcode='42501'; end if;
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'invalid presence'; end if;
  insert into public.nv_presence(emp_id,user_id,at,school_id,floor,room,page,pending,version,updated_at)
  values(e,auth.uid(),now(),left(nullif(p->>'school',''),80),left(nullif(p->>'floor',''),60),left(nullif(p->>'room',''),80),left(nullif(p->>'page',''),40),
    greatest(0,least(100000,coalesce(nullif(p->>'pending','')::int,0))),left(nullif(p->>'version',''),20),now())
  on conflict(emp_id) do update set user_id=excluded.user_id,at=now(),school_id=excluded.school_id,floor=excluded.floor,room=excluded.room,page=excluded.page,
    pending=excluded.pending,version=excluded.version,updated_at=now();
end $$;
revoke all on function public.nv_presence_ping(jsonb) from public,anon;
grant execute on function public.nv_presence_ping(jsonb) to authenticated;

create or replace function public.nv_presence_list() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare today date:=(now() at time zone 'Asia/Riyadh')::date;
begin
  if not public.nv_perm('view') then raise exception 'not allowed' using errcode='42501'; end if;
  return jsonb_build_object('now',now(),'items',coalesce((select jsonb_agg(jsonb_build_object(
      'emp',e.id,'name',e.name,'number',e.number,'login',e.user_id is not null,
      'at',p.at,'school_id',p.school_id,'school',s.name,'floor',p.floor,'room',p.room,'page',p.page,'pending',coalesce(p.pending,0),'version',p.version,
      'today',coalesce(t.n,0),'last_asset',t.last,'last_school',ls.name) order by p.at desc nulls last,e.name)
    from public.nv_employees e
    left join public.nv_presence p on p.emp_id=e.id
    left join public.nv_schools s on s.id=p.school_id
    left join lateral (select count(*) filter (where (c.submitted_at at time zone 'Asia/Riyadh')::date=today and c.type_id is not null) n,max(c.submitted_at) last
      from public.nv_collections c where c.employee_id=e.id) t on true
    left join lateral (select s2.name from public.nv_collections c2 join public.nv_schools s2 on s2.id=c2.school_id where c2.employee_id=e.id and c2.submitted_at is not null order by c2.submitted_at desc limit 1) ls on true
    where coalesce(e.archived,false)=false and (e.user_id is not null or p.emp_id is not null)),'[]'::jsonb));
end $$;
revoke all on function public.nv_presence_list() from public,anon;
grant execute on function public.nv_presence_list() to authenticated;

-- the database status card knows this upgrade
create or replace function public.nv_schema_level() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare q text:=''; docs text:='';
begin
  if not (public.nv_is_sys() or public.nv_perm('settings')) then raise exception 'not allowed' using errcode='42501'; end if;
  select coalesce(string_agg(p.prosrc,' '),'') into q from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='nv_quality_page';
  select coalesce(string_agg(p.prosrc,' '),'') into docs from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='nv_document_access45';
  return jsonb_build_object('latest','051','items',jsonb_build_array(
    jsonb_build_object('m','044','name','دورات الجرد ونقل الأصول','ok',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='nv_asset_move44')),
    jsonb_build_object('m','045','name','صلاحيات الدليل والإصدارات','ok',docs<>''),
    jsonb_build_object('m','046','name','نموذج بيانات المباني','ok',exists(select 1 from information_schema.columns where table_schema='public' and table_name='nv_schools' and column_name='extra')),
    jsonb_build_object('m','047','name','صورة لوحة البيانات اختيارية','ok',q<>'' and position('missing_photo or missing_nameplate' in q)=0 and position('or missing_nameplate' in q)=0),
    jsonb_build_object('m','048','name','الاستثناءات والغرف والمنطقة','ok',exists(select 1 from information_schema.tables where table_schema='public' and table_name='nv_room_done') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='nv_collections' and column_name='zone')),
    jsonb_build_object('m','049','name','الدليل والإصدارات لمدير النظام','ok',position('nv_is_sys' in docs)>0),
    jsonb_build_object('m','050','name','مساعدك الذكي','ok',exists(select 1 from information_schema.tables where table_schema='public' and table_name='nv_ai_usage')),
    jsonb_build_object('m','051','name','المتابعة المباشرة للمشرفين','ok',true)));
end $$;
revoke all on function public.nv_schema_level() from public,anon;
grant execute on function public.nv_schema_level() to authenticated;
notify pgrst,'reload schema';
commit;
