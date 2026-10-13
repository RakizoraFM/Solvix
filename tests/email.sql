-- NV17: field supervisors sign in with their e-mail (run after roles.sql)
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into nv_employees(id,number,name) values ('em1','55001','Old login');
select 'old style login', public.nv_emp_set_login('em1','12345678');
update nv_employees set email = 'Sup.One@Example.com' where id = 'em1';
select 'move to e-mail', public.nv_emp_sync_email('em1');
reset role; select 'auth email now', email from auth.users where id = (select user_id from nv_employees where id='em1');
select 'identity email', identity_data->>'email' from auth.identities where user_id = (select user_id from nv_employees where id='em1');
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into nv_employees(id,number,name,email) values ('em2','55002','New','sup.two@example.com');
select 'new with e-mail', public.nv_emp_set_login('em2','12345678');
select 'staff e-mail refused (expect error)'; update nv_employees set email='owner@x.com' where id='em2'; select public.nv_emp_set_login('em2','12345678');
update nv_employees set email='sup.two@example.com' where id='em2';
select 'duplicate e-mail (expect error)'; update nv_employees set email='sup.one@example.com' where id='em2';
reset role; select 'employees', string_agg(number||'='||coalesce(email,'-'),', ' order by number) from nv_employees where id in ('em1','em2');
