\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select 'me', public.nv_me();
select 'create reader', public.nv_staff_create('read@x.com','12345678','Reader','reader') is not null;
select 'create bad role'; select public.nv_staff_create('x@x.com','12345678','X','boss');
select 'self demote (expect error)'; select public.nv_staff_set('00000000-0000-0000-0000-0000000000a1','reader',true);
insert into nv_schools(id,ident,name) values ('s1','I1','S1'); insert into nv_employees(id,number,name) values ('e1','22912','T1');
select 'tech login', public.nv_emp_set_login('e1','12345678');
reset role;
select 'tech in staff (expect 0)', count(*) from nv_staff where email like '%novaro.local';
\set rd '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='read@x.com'"` ''''
\set tk '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select id from auth.users where email='nv22912@novaro.local'"` ''''
set role authenticated;
select pg_temp.as_user(:rd); select 'reader me', public.nv_me(); select 'reader schools', count(*) from nv_schools;
select 'reader write (expect error)'; insert into nv_schools(id,ident,name) values ('s2','I2','S2');
select 'reader staff list (expect 1 own)', count(*) from nv_staff;
select 'reader create staff (expect error)'; select public.nv_staff_create('y@x.com','12345678','Y','admin');
select pg_temp.as_user(:tk); select 'tech me', public.nv_me(); insert into nv_collections(id,employee_id,school_id) values ('c1','e1','s1'); select 'tech rows', count(*) from nv_collections;
select 'tech staff (expect 0)', count(*) from nv_staff;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select 'admin staff', count(*) from nv_staff; select 'deactivate reader', public.nv_staff_set(:rd,'reader',false);
select pg_temp.as_user(:rd); select 'inactive reader schools (expect 0)', count(*) from nv_schools;
