-- Isolated PostgreSQL test database ONLY, after supabase_stub.sql + solvix_setup.sql.
-- psql -v ON_ERROR_STOP=1 -f tests/nv35_security.sql
begin;
insert into auth.users(id,email,created_at) values
 ('35000000-0000-0000-0000-000000000001','admin35@test.invalid',now()),
 ('35000000-0000-0000-0000-000000000002','field35@test.invalid',now()),
 ('35000000-0000-0000-0000-000000000003','owner35@test.invalid',now());
insert into nv_staff(user_id,email,name,role) values
 ('35000000-0000-0000-0000-000000000001','admin35@test.invalid','Admin','sysadmin'),
 ('35000000-0000-0000-0000-000000000003','owner35@test.invalid','Owner','owner');
insert into nv_employees(id,number,name,user_id) values('e35','n35','Field','35000000-0000-0000-0000-000000000002');
insert into nv_schools(id,ident,name) values('b35','b35','Building');
insert into nv_collections(id,employee_id,school_id) values('a35','e35','b35');
set local role authenticated;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000003',true);
do $$ begin
 begin perform nv_delete_user('35000000-0000-0000-0000-000000000001',null);raise exception 'owner deleted administrator';exception when insufficient_privilege then null;end;
 begin perform nv_clients_list();raise exception 'owner read provider registry';exception when insufficient_privilege then null;end;
 begin perform nv_all_users();raise exception 'owner read all Auth accounts';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000001',true);
select nv_delete_user(null,'e35');
do $$ begin
 if not exists(select 1 from nv_collections where id='a35' and employee_id='e35') then raise exception 'asset history lost';end if;
 if not exists(select 1 from nv_employees where id='e35' and archived and user_id is null) then raise exception 'employee login reference not archived';end if;
end $$;
select nv_delete_user('35000000-0000-0000-0000-000000000003',null);
do $$ begin
 if exists(select 1 from nv_staff where user_id='35000000-0000-0000-0000-000000000003') then raise exception 'owner staff entry remains';end if;
end $$;
-- Explicitly verifies that self-deletion of the final administrator is not blocked.
select nv_delete_user('35000000-0000-0000-0000-000000000001',null);
reset role;
do $$ begin
 if exists(select 1 from auth.users where id in ('35000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000002','35000000-0000-0000-0000-000000000003')) then raise exception 'Auth account remains after deletion';end if;
 if (select count(*) from nv_audit where operation='DELETE_ACCOUNT' and actor='35000000-0000-0000-0000-000000000001')<>3 then raise exception 'deletion audit missing';end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform credential_cipher from nv_clients;raise exception 'registry secret ciphertext directly readable';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'NV35 deletion and provider access checks passed' as result;
