-- NV56 (migration 051): supervisor heartbeat and the live list.
\set ON_ERROR_STOP 1
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000056a1','own56@x.com'),('00000000-0000-0000-0000-0000000056a2','fe56@x.com'),('00000000-0000-0000-0000-0000000056a3','fo56@x.com') on conflict do nothing;
insert into nv_staff(user_id,email,role) values ('00000000-0000-0000-0000-0000000056a1','own56@x.com','owner') on conflict do nothing;
insert into nv_employees(id,number,name,email,user_id) values ('e56','5601','فني 56','fe56@x.com','00000000-0000-0000-0000-0000000056a2'),('e56b','5602','فني آخر 56','fo56@x.com','00000000-0000-0000-0000-0000000056a3') on conflict do nothing;
insert into nv_schools(id,ident,name) values ('s56','B56','مبنى 56') on conflict do nothing;
insert into nv_categories(id,ar,en) values ('k56','فئة','Cat') on conflict do nothing;
insert into nv_types(id,cat,ar,en) values ('t56','k56','نوع','Type') on conflict do nothing;
insert into nv_collections(id,employee_id,school_id,floor,room_number,type_id,category_id,quantity,submitted_at)
 values ('c56a','e56','s56','الأرضي','1','t56','k56',1,now()),('c56b','e56','s56','الأرضي','1','t56','k56',1,now()-interval '3 days') on conflict do nothing;
create or replace function pg_temp.ok(c boolean,m text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FAIL %',m; end if; raise notice 'PASS %',m; end $$;
create or replace function pg_temp.fails(q text,pat text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then if sqlerrm ~ pat then return true; end if; raise notice 'other error: %',sqlerrm; return false; end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000056a2',false);
select public.nv_presence_ping('{"school":"s56","floor":"الأرضي","room":"فصل (1)","page":"asset","pending":3,"version":"NV56"}');
select public.nv_presence_ping('{"school":"s56","floor":"الأرضي","room":"فصل (2)","page":"success","pending":0,"version":"NV56"}');
select pg_temp.ok(pg_temp.fails($q$select public.nv_presence_list()$q$,'not allowed'),'a supervisor cannot read the live list');
select pg_temp.ok(pg_temp.fails($q$select * from nv_presence$q$,'permission denied'),'presence table not readable directly');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000056a1',false);
select pg_temp.ok(pg_temp.fails($q$select public.nv_presence_ping('{}')$q$,'not allowed'),'a management account cannot send a heartbeat');
select pg_temp.ok((select x->>'room'='فصل (2)' and (x->>'pending')::int=0 and x->>'school'='مبنى 56' and (x->>'today')::int=1 and x->>'version'='NV56' from jsonb_array_elements(public.nv_presence_list()->'items') x where x->>'emp'='e56'),'live list: last heartbeat (one row per supervisor), today''s assets = 1');
select pg_temp.ok((select x->>'at' is null and (x->>'today')::int=0 from jsonb_array_elements(public.nv_presence_list()->'items') x where x->>'emp'='e56b'),'a supervisor with a sign-in but no heartbeat is listed');
select pg_temp.ok((select x->>'version'='051' or (x->>'m')='051' from jsonb_array_elements(public.nv_schema_level()->'items') x where x->>'m'='051'),'schema level knows 051');
reset role;
