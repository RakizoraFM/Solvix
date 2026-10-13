-- NV10 roles (run after solvix_setup.sql on a database where user ...a1 is the first account = owner)
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select 'owner me', public.nv_me();
select 'create manager', public.nv_staff_create('mgr@x.com','12345678','Mgr','manager') is not null;
select 'create coordinator', public.nv_staff_create('co@x.com','12345678','Co','coordinator') is not null;
select 'create owner2', public.nv_staff_create('own2@x.com','12345678','Own2','owner') is not null;
select 'create bad role (expect error)'; select public.nv_staff_create('x@x.com','12345678','X','admin');
select 'self change (expect error)'; select public.nv_staff_set('00000000-0000-0000-0000-0000000000a1','manager',true);
reset role;
\set mg '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='mgr@x.com'"` ''''
\set co '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='co@x.com'"` ''''
\set o2 '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='own2@x.com'"` ''''
set role authenticated;
select pg_temp.as_user(:mg); select 'manager me', public.nv_me();
select 'manager staff list', count(*) from nv_staff;
select 'manager adds coordinator', public.nv_staff_create('co2@x.com','12345678','Co2','coordinator') is not null;
select 'manager adds owner (expect error)'; select public.nv_staff_create('o3@x.com','12345678','O3','owner');
select 'manager demotes owner (expect error)'; select public.nv_staff_set(:o2,'coordinator',true);
select 'manager resets owner pw (expect error)'; select public.nv_staff_set_password(:o2,'abcdefgh');
with x as (update nv_settings set data = data || '{"t":1}' where id = 1 returning 1) select 'manager edits settings', count(*) from x;
select pg_temp.as_user(:co); select 'coordinator me', public.nv_me();
insert into nv_schools(id,ident,name) values ('sc','IC','SC'); select 'coordinator wrote school', count(*) from nv_schools where id='sc';
select 'coordinator staff list (expect 1 own)', count(*) from nv_staff;
select 'coordinator adds user (expect error)'; select public.nv_staff_create('z@x.com','12345678','Z','coordinator');
with x as (update nv_settings set data = data || '{"t":2}' where id = 1 returning 1) select 'coordinator settings (expect 0)', count(*) from x;
insert into nv_employees(id,number,name) values ('ec','77001','Field'); select 'coordinator field login', public.nv_emp_set_login('ec','12345678');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select 'owner demotes owner2', public.nv_staff_set(:o2,'manager',true);
select 'owner deactivates manager', public.nv_staff_set(:mg,'manager',false);
select pg_temp.as_user(:mg); select 'inactive manager schools (expect 0)', count(*) from nv_schools;
reset role; select 'roles', string_agg(email||'='||role||(case when active then '' else '(off)' end), ', ' order by email) from nv_staff;
