-- Run ONLY in an isolated test database after supabase_stub.sql and solvix_setup.sql.
-- psql -v ON_ERROR_STOP=1 -f tests/nv34_security.sql
-- The transaction rolls fixtures back. This does NOT test concurrent connections.
begin;
insert into auth.users(id,email,created_at) values
 ('34000000-0000-0000-0000-000000000001','nv34-admin@test.invalid',now()),
 ('34000000-0000-0000-0000-000000000002','nv34-field1@test.invalid',now()),
 ('34000000-0000-0000-0000-000000000003','nv34-field2@test.invalid',now()),
 ('34000000-0000-0000-0000-000000000004','nv34-editor@test.invalid',now());
do $$ begin
 if exists(select 1 from nv_staff where user_id='34000000-0000-0000-0000-000000000001') then raise exception 'automatic administrator promotion still active'; end if;
end $$;
insert into nv_staff(user_id,email,role,perms) values
 ('34000000-0000-0000-0000-000000000001','nv34-admin@test.invalid','sysadmin',null),
 ('34000000-0000-0000-0000-000000000004','nv34-editor@test.invalid','coordinator','{"users":false,"edit":true}');
insert into nv_employees(id,number,name,user_id) values
 ('nv34-e1','nv34-1','Test 1','34000000-0000-0000-0000-000000000002'),
 ('nv34-e2','nv34-2','Test 2','34000000-0000-0000-0000-000000000003');
insert into nv_schools(id,ident,name) values('nv34-s1','nv34-s1','Test school 1'),('nv34-s2','nv34-s2','Test school 2');
insert into nv_collections(id,employee_id,school_id,quantity,asset_image) values
 ('nv34-c1','nv34-e1','nv34-s1',1,'nv34-photo1'),('nv34-c2','nv34-e2','nv34-s2',1,'nv34-photo2');
set local role authenticated;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000004',true);
do $$ begin
 begin
  update nv_employees set user_id='34000000-0000-0000-0000-000000000004' where id='nv34-e1';
  raise exception 'identity rebinding was allowed';
 exception when insufficient_privilege then null; end;
 begin
  update nv_employees set perms='{"collect":true}' where id='nv34-e1';
  raise exception 'direct permission change was allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000002',true);
do $$ begin
 if not nv_photo_read('nv34-photo1.jpg') or nv_photo_read('nv34-photo2.jpg') then raise exception 'photo isolation failed'; end if;
 perform nv_sync_mutate('nv_collections','nv34-c1','{"id":"nv34-c1","quantity":1}', '{"quantity":2}',false);
 begin
  perform nv_sync_mutate('nv_collections','nv34-c1','{"id":"nv34-c1","quantity":1}', '{"quantity":9}',false);
  raise exception 'stale update was allowed';
 exception when raise_exception then if sqlerrm not like 'SOLVIX_CONFLICT:%' then raise; end if; end;
 begin
  update nv_collections set school_id='nv34-s2' where id='nv34-c1';
  raise exception 'occupied school reassignment was allowed';
 exception when raise_exception then if sqlerrm<>'school assigned to another supervisor' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000001',true);
do $$ begin
 begin delete from nv_schools where id='nv34-s1';raise exception 'cascading school deletion was allowed';exception when foreign_key_violation then null;end;
 begin update nv_collections set no=no+1 where id='nv34-c1';raise exception 'asset number change was allowed';exception when others then if sqlstate<>'428C9' and sqlerrm<>'asset number is immutable' then raise;end if;end;
 if not exists(select 1 from nv_audit where table_name='nv_collections' and row_id='nv34-c1' and operation='UPDATE' and actor='34000000-0000-0000-0000-000000000002') then raise exception 'audit actor missing';end if;
end $$;
reset role;
set local role anon;
do $$ declare j jsonb;begin
 begin perform data from nv_settings;raise exception 'anonymous settings read was allowed';exception when insufficient_privilege then null;end;
 select nv_public_settings() into j;
 if (j->'data') ? 'admin_email' or (j->>'schema_version')<>'38' then raise exception 'public branding contract failed';end if;
end $$;
reset role;
rollback;
select 'NV34 security regression checks passed' as result;
