-- NV34: customers — each customer sees and changes only its own data; the system Admin keeps the list and works inside one customer at a time.
-- Run after roles.sql, email.sql, review.sql, sys.sql.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
\set sys '''00000000-0000-0000-0000-0000000000a1'''
\set o9 '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='own9@x.com'"` ''''
\set ek '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_employees where id='ec'"` ''''
select 'existing data belongs to t1', (select count(*) from nv_schools where tenant_id <> 't1') + (select count(*) from nv_collections where tenant_id <> 't1') + (select count(*) from nv_employees where tenant_id <> 't1');
set role authenticated; select pg_temp.as_user(:sys);
select 'customers', jsonb_array_length(public.nv_tenant_list());
select 'new customer B with its owner', (public.nv_tenant_save('{"name":"Customer B","plan":"quarterly","ends_at":"2027-01-01","max_schools":2,"contact_email":"b@b.com","cc_emails":"cc1@b.com, cc2@b.com","owner_email":"ownb@b.com","owner_password":"12345678","owner_name":"Owner B"}'))->>'name';
select 'Admin still in t1', public.nv_tenant();
reset role;
\set tb '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select id from nv_tenants where name='Customer B'"` ''''
\set ob '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='ownb@b.com'"` ''''
select 'owner B belongs to B', tenant_id = :tb, role from nv_staff where email = 'ownb@b.com';
select 'B has its settings row', count(*) from nv_settings where tenant_id = :tb;
select 'cc saved', cc_emails from nv_tenants where id = :tb;
set role authenticated; select pg_temp.as_user(:ob);
select 'B sees schools of t1 (expect 0)', count(*) from nv_schools;
select 'B sees assets of t1 (expect 0)', count(*) from nv_collections;
select 'B sees supervisors of t1 (expect 0)', count(*) from nv_employees;
select 'B sees staff of t1 (expect 0)', count(*) from nv_staff where tenant_id = 't1';
select 'B sees the shared catalog', count(*) > 0 from nv_types;
select 'B settings rows', count(*) from nv_settings;
insert into nv_employees(id, number, name) values ('eb1','77001','Sup B');
insert into nv_schools(id, ident, name, extra) values ('sb1','ID-1','Tower 1','{"floors":"12"}');
insert into nv_schools(id, ident, name) values ('sb2','ID-1x','Tower 2');
select 'same number / ident as t1 allowed in B', count(*) from nv_employees where number = '77001';
select 'third building over the limit (expect error)'; insert into nv_schools(id, ident, name) values ('sb3','ID-3','Tower 3');
insert into nv_rooms(id, ar) values ('rb1','بهو');
select 'B own room', tenant_id = :tb from nv_rooms where id = 'rb1';
select 'B edits a shared type (expect 0)'; with u as (update nv_types set ar = 'x' where tenant_id is null returning 1) select count(*) from u;
select 'B writes into t1 (expect error)'; insert into nv_schools(id, ident, name, tenant_id) values ('sb9','X','X','t1');
select 'B edits t1 settings (expect 0)'; with u as (update nv_settings set data = '{}' where tenant_id = 't1' returning 1) select count(*) from u;
select 'B list customers (expect null)', public.nv_tenant_list() is null;
select 'B saves a customer (expect error)'; select public.nv_tenant_save('{"name":"X"}');
select 'B me', public.nv_me()->'tenant'->>'name', public.nv_me()->'sub'->>'plan';
select 'B usage', public.nv_sub_get()->'usage';
select 'B adds a manager', public.nv_staff_create('mgrb@b.com','12345678','Mgr B','manager') is not null;
select 'B takes over a t1 account (expect error)'; select public.nv_staff_create('own9@x.com','12345678','x','manager');
select 'B resets a t1 password (expect error)'; select public.nv_staff_set_password(:o9::uuid, '87654321');
select 'B gives a login to a t1 supervisor (expect error)'; select public.nv_emp_set_login('ec','12345678');
select 'B login without e-mail (expect error)'; select public.nv_emp_set_login('eb1','12345678');
update nv_employees set email = 'supb@b.com' where id = 'eb1';
select 'B login for its own supervisor', public.nv_emp_set_login('eb1','12345678');
reset role;
select 'manager B in B', tenant_id = :tb from nv_staff where email = 'mgrb@b.com';
\set eb '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_employees where id='eb1'"` ''''
-- B's supervisor: only B's buildings
set role authenticated; select pg_temp.as_user(:eb);
select 'B supervisor me', public.nv_me()->>'role', public.nv_me()->'tenant'->>'name';
select 'B supervisor buildings', string_agg(id, ',' order by id) from nv_schools;
insert into nv_collections(id, employee_id, school_id, type_id, submitted_at) values ('cb1','eb1','sb1',(select id from nv_types where tenant_id is null limit 1),now());
select 'B asset in B', tenant_id = :tb from nv_collections where id = 'cb1';
select 'B supervisor on a t1 school (expect error)'; insert into nv_collections(id, employee_id, school_id) values ('cb2','eb1','rs');
select 'B busy schools', count(*) from public.nv_busy_schools();
-- t1 does not see B
select pg_temp.as_user(:o9);
select 't1 owner sees B buildings (expect 0)', count(*) from nv_schools where id like 'sb%';
select 't1 owner sees B asset (expect 0)', count(*) from nv_collections where id = 'cb1';
select 't1 owner sees B room (expect 0)', count(*) from nv_rooms where id = 'rb1';
select 't1 serial dupes stay in t1', jsonb_array_length(public.nv_serial_dupes('ZZZZ'));
-- the Admin opens B, sees B's data only, then goes back
select pg_temp.as_user(:sys);
select public.nv_tenant_use(:tb);
select 'Admin in B: buildings', count(*) from nv_schools;
select 'Admin in B: staff list', (select count(*) from public.nv_staff_list() x where x->>'role' <> 'sysadmin');
select 'Admin in B edits B subscription', public.nv_sub_save('{"max_schools":5}')->>'max_schools';
insert into nv_types(id, cat, ar) values ('tshared', (select id from nv_categories where tenant_id is null limit 1), 'Shared new');
select 'Admin type is shared', tenant_id is null from nv_types where id = 'tshared';
select public.nv_tenant_use('t1');
select 'Admin back in t1: buildings of B (expect 0)', count(*) from nv_schools where id like 'sb%';
select 'customers with usage', string_agg((x->>'name') || '=' || (x->'usage'->>'schools'), ', ' order by x->>'created_at') from jsonb_array_elements(public.nv_tenant_list()) x;
-- a stopped customer is read only
select public.nv_tenant_save(jsonb_build_object('id', :tb, 'active', false)) is not null;
select pg_temp.as_user(:ob);
select 'stopped customer: sub ok', public.nv_sub_ok();
select 'stopped customer adds (expect error)'; insert into nv_schools(id, ident, name) values ('sb4','ID-4','Tower 4');
select 'stopped customer still reads', count(*) from nv_schools;
reset role;
select pg_temp.as_user(:sys); select public.nv_tenant_save(jsonb_build_object('id', :tb, 'active', true)) is not null;
-- reminders per customer, with the customer's CC
update nv_tenants set ends_at = now() + interval '5 days' where id = :tb;
set role service_role; select 'reminder for B', (select x->>'stage' || ' ' || (x->'cc')::text from jsonb_array_elements(public.nv_sub_reminder_due()) x where x->>'tenant' = :tb); reset role;
-- deleting a management account
set role authenticated; select pg_temp.as_user(:ob);
select 'B deletes itself (expect error)'; select public.nv_staff_delete(:ob::uuid);
select 'B deletes a t1 account (expect error)'; select public.nv_staff_delete(:o9::uuid);
select 'B deletes its manager'; select public.nv_staff_delete((select user_id from nv_staff where email = 'mgrb@b.com'));
reset role;
select 'manager B gone (staff, sign-in)', (select count(*) from nv_staff where email = 'mgrb@b.com'), (select count(*) from auth.users where email = 'mgrb@b.com');
