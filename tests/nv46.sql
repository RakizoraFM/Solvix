-- NV46: building form per customer (nv_settings.data.site) + nv_schools.extra. Run on a database built with tests/supabase_stub.sql + solvix_setup.sql (or NV45 + migrations/046).
\set ON_ERROR_STOP 1
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000046a1','own46@x.com'),('00000000-0000-0000-0000-0000000046a2','rd46@x.com'),('00000000-0000-0000-0000-0000000046a3','fe46@x.com') on conflict do nothing;
insert into nv_staff(user_id,email,role) values ('00000000-0000-0000-0000-0000000046a1','own46@x.com','owner'),('00000000-0000-0000-0000-0000000046a2','rd46@x.com','reader') on conflict do nothing;
insert into nv_employees(id,number,name,email,user_id) values ('e46','4601','فني','fe46@x.com','00000000-0000-0000-0000-0000000046a3') on conflict do nothing;
insert into nv_settings(id,data) values (1,'{}') on conflict do nothing;
update nv_settings set data=data-'site' where id=1;
insert into nv_schools(id,ident,name) values ('s46','B46','مبنى 46') on conflict do nothing;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
create or replace function pg_temp.proj() returns jsonb language sql as $$ select jsonb_build_object('app_name',coalesce(nullif(data->>'app_name',''),'Solvix'),'admin_email',coalesce(data->>'admin_email',''),'logo',data->'logo','label',data->'label','geo',data->'geo','room_tpl',data->'room_tpl') from nv_settings where id=1 $$;
create or replace function pg_temp.fails(q text,pat text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then if sqlerrm ~ pat then return true; end if; raise notice 'unexpected: %',sqlerrm; return false; end $$;
create or replace function pg_temp.ok(c boolean,m text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FAIL %',m; end if; raise notice 'PASS %',m; end $$;
select pg_temp.ok((select data_type from information_schema.columns where table_name='nv_schools' and column_name='extra')='jsonb','nv_schools.extra exists (jsonb)');
select pg_temp.ok((select extra from nv_schools where id='s46')='{}'::jsonb,'existing buildings default to {}');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000046a1');
-- the first save: expected has no «site» (the client sends it only when set)
do $$ declare e jsonb:=pg_temp.proj(); begin perform public.nv_settings_save(e,jsonb_build_object('site','{"fields":{"moe":{"on":false,"l":""}},"extra":[{"k":"f1","l":"نوع المبنى","t":"select","opts":"إداري, سكني","req":true}]}'::jsonb)); end $$;
select pg_temp.ok((select data->'site'->'extra'->0->>'l' from nv_settings where id=1)='نوع المبنى','owner saves the building form');
select pg_temp.ok(pg_temp.fails($q$select public.nv_settings_save(pg_temp.proj(),'{"app_name":"X"}')$q$,'SOLVIX_CONFLICT'),'once set, an expected copy without site is a conflict');
do $$ declare e jsonb:=pg_temp.proj()||jsonb_build_object('site',(select data->'site' from nv_settings where id=1)); begin perform public.nv_settings_save(e,jsonb_build_object('app_name','عميل 46','site','{"fields":{},"extra":[]}'::jsonb)); end $$;
select pg_temp.ok((select data->'site' from nv_settings where id=1)='{"fields":{},"extra":[]}'::jsonb and (select data->>'app_name' from nv_settings where id=1)='عميل 46','reset (empty form) replaces the stored form');
select pg_temp.ok(pg_temp.fails($q$select public.nv_settings_save(pg_temp.proj()||jsonb_build_object('site',(select data->'site' from nv_settings where id=1)),'{"site":[1,2]}')$q$,'invalid building form'),'site must be an object');
select pg_temp.ok(pg_temp.fails($q$select public.nv_settings_save(pg_temp.proj()||jsonb_build_object('site',(select data->'site' from nv_settings where id=1)),jsonb_build_object('site',jsonb_build_object('extra',(select jsonb_agg(jsonb_build_object('k','f'||g,'l','x'||g)) from generate_series(1,41) g))))$q$,'invalid building form'),'at most 40 own fields');
select pg_temp.ok(pg_temp.fails($q$select public.nv_settings_save(pg_temp.proj(),'{"evil":1}')$q$,'unknown setting'),'unknown keys still refused');
-- building values
select pg_temp.ok((public.nv_sync_mutate('nv_schools','s46',jsonb_build_object('id','s46','extra','{}'::jsonb),'{"extra":{"f1":"سكني","f2":"7"}}'::jsonb))->>'ok'='true','owner writes extra through nv_sync_mutate');
select pg_temp.ok((select extra->>'f1' from nv_schools where id='s46')='سكني','value stored');
select pg_temp.ok(pg_temp.fails($q$select public.nv_sync_mutate('nv_schools','s46',jsonb_build_object('id','s46','extra','{}'::jsonb),'{"extra":{"f1":"x"}}'::jsonb)$q$,'SOLVIX_CONFLICT'),'stale extra = conflict');
select pg_temp.ok(pg_temp.fails($q$update nv_schools set extra='[1]' where id='s46'$q$,'nv_school_extra_v46'),'extra must be an object');
select pg_temp.ok(pg_temp.fails($q$update nv_schools set extra=jsonb_build_object('big',repeat('x',20000)) where id='s46'$q$,'nv_school_extra_v46'),'extra size limited');
insert into nv_schools(id,ident,name,extra) values ('s46b','B46B','مبنى ب','{"f1":"إداري"}');
select pg_temp.ok((select extra->>'f1' from nv_schools where id='s46b')='إداري','insert with extra');
-- others
select pg_temp.as_user('00000000-0000-0000-0000-0000000046a2');
select pg_temp.ok(pg_temp.fails($q$select public.nv_settings_save(pg_temp.proj()||jsonb_build_object('site',(select data->'site' from nv_settings where id=1)),'{"site":{}}')$q$,'not allowed'),'reader cannot change the form');
select pg_temp.ok((public.nv_client_settings()->'data'->'site') is not null,'reader receives the form');
with u as (update nv_schools set extra='{"f1":"z"}' where id='s46' returning 1) select pg_temp.ok((select count(*) from u)=0,'reader cannot write extra');
select pg_temp.as_user('00000000-0000-0000-0000-0000000046a3');
select pg_temp.ok((public.nv_client_settings()->'data'->'site') is not null,'field supervisor receives the form');
with u as (update nv_schools set extra='{"f1":"z"}' where id='s46' returning 1) select pg_temp.ok((select count(*) from u)=0,'field supervisor cannot write extra');
reset role;
select pg_temp.ok((select extra->>'f1' from nv_schools where id='s46')='سكني','value unchanged by others');
