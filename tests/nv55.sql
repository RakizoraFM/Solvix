-- NV55 (migration 050): AI assistant quota and the «ai» settings key.
\set ON_ERROR_STOP 1
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000055a1','own55@x.com'),('00000000-0000-0000-0000-0000000055a2','fe55@x.com'),('00000000-0000-0000-0000-0000000055a3','out55@x.com') on conflict do nothing;
insert into nv_staff(user_id,email,role) values ('00000000-0000-0000-0000-0000000055a1','own55@x.com','owner') on conflict do nothing;
insert into nv_employees(id,number,name,email,user_id) values ('e55','5501','فني 55','fe55@x.com','00000000-0000-0000-0000-0000000055a2') on conflict do nothing;
insert into nv_settings(id,data) values (1,'{}') on conflict do nothing;
update nv_settings set data=data-'ai' where id=1;
delete from nv_ai_usage;
create or replace function pg_temp.ok(c boolean,m text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FAIL %',m; end if; raise notice 'PASS %',m; end $$;
create or replace function pg_temp.fails(q text,pat text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then if sqlerrm ~ pat then return true; end if; raise notice 'other error: %',sqlerrm; return false; end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000055a2',false);
select pg_temp.ok(pg_temp.fails($q$select public.nv_ai_take('chat')$q$,'ai disabled'),'assistant off by default');
-- the owner switches it on with a limit of 2 per day
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000055a1',false);
select public.nv_settings_save((select jsonb_build_object('app_name',coalesce(nullif(data->>'app_name',''),'Solvix'),'admin_email',coalesce(data->>'admin_email',''),'logo',data->'logo','label',data->'label','geo',data->'geo','room_tpl',data->'room_tpl')
  ||case when jsonb_typeof(data->'site')='object' then jsonb_build_object('site',data->'site') else '{}'::jsonb end
  ||case when jsonb_typeof(data->'ops')='object' then jsonb_build_object('ops',data->'ops') else '{}'::jsonb end from nv_settings where id=1),'{"ai":{"on":true,"daily":2}}');
select pg_temp.ok(pg_temp.fails($q$select public.nv_settings_save('{}','{"ai":"yes"}')$q$,'invalid ai settings|SOLVIX_CONFLICT'),'ai must be an object');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000055a2',false);
select pg_temp.ok((public.nv_ai_take('chat')->>'used')::int=1,'first request counted');
select pg_temp.ok((public.nv_ai_take('asset')->>'limit')::int=2,'second request, limit 2');
select pg_temp.ok(pg_temp.fails($q$select public.nv_ai_take('chat')$q$,'ai limit reached'),'third request refused');
select pg_temp.ok(pg_temp.fails($q$select public.nv_ai_take('other')$q$,'invalid kind'),'unknown kind refused');
select pg_temp.ok(pg_temp.fails($q$select * from nv_ai_usage$q$,'permission denied'),'usage table not readable directly');
select pg_temp.ok(pg_temp.fails($q$select public.nv_ai_usage_report(30)$q$,'not allowed'),'a supervisor cannot read the usage report');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000055a3',false);
select pg_temp.ok(pg_temp.fails($q$select public.nv_ai_take('chat')$q$,'not allowed'),'a non-member is refused');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000055a1',false);
select pg_temp.ok((select (r->>'n')::int=2 and r->>'chat'='1' and r->>'asset'='1' and r->>'kind'='field' from jsonb_array_elements(public.nv_ai_usage_report(30)) r where r->>'name'='فني 55'),'usage report: 2 requests (1 chat, 1 asset), limit refusal not counted');
reset role;
