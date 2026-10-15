-- Isolated test database only, after tests/supabase_stub.sql + solvix_setup.sql.
-- Not executed in the authoring environment. All changes roll back.
begin;
insert into auth.users(id,email,created_at) values
 ('37000000-0000-0000-0000-000000000001','sys37@test.invalid',now()),
 ('37000000-0000-0000-0000-000000000002','owner37@test.invalid',now());
insert into nv_staff(user_id,email,name,role) values
 ('37000000-0000-0000-0000-000000000001','sys37@test.invalid','Admin37','sysadmin'),
 ('37000000-0000-0000-0000-000000000002','owner37@test.invalid','Owner37','owner');
update auth.users set last_sign_in_at='2026-10-14T10:00:00Z' where id='37000000-0000-0000-0000-000000000002';
update auth.users set last_sign_in_at=last_sign_in_at where id='37000000-0000-0000-0000-000000000002';
do $$ begin
 if (select count(*) from nv_login_history where actor='37000000-0000-0000-0000-000000000002')<>1
 then raise exception 'duplicate or missing login event';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','37000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin perform nv_usage_users();raise exception 'owner read account usage';exception when insufficient_privilege then null;end;
 begin perform nv_usage_page();raise exception 'owner read login history';exception when insufficient_privilege then null;end;
 begin perform 1 from nv_login_history;raise exception 'raw history readable';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','37000000-0000-0000-0000-000000000001',true);
do $$ declare j jsonb;u jsonb;begin
 select x into u from nv_usage_users() x where x->>'id'='37000000-0000-0000-0000-000000000002';
 if u is null or (u->>'recorded_logins')::int<>1 then raise exception 'account summary incorrect';end if;
 if u ? 'encrypted_password' or u ? 'raw_user_meta_data' then raise exception 'account secrets leaked';end if;
 j:=nv_usage_page('37000000-0000-0000-0000-000000000002','login','2026-10-14T00:00:00Z','2026-10-15T00:00:00Z',0,50);
 if (j->>'total')::int<>1 or jsonb_array_length(j->'items')<>1 then raise exception 'login filter incorrect';end if;
 if j->'items'->0 ? 'new_data' then raise exception 'audit payload leaked';end if;
 begin perform nv_usage_page(null,'all',null,null,-1,50);raise exception 'negative offset accepted';exception when raise_exception then
  if sqlerrm<>'invalid history filter' then raise;end if;end;
end $$;
reset role;
delete from auth.users where id='37000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','37000000-0000-0000-0000-000000000001',true);
do $$ declare j jsonb;begin
 j:=nv_usage_page('37000000-0000-0000-0000-000000000002','login',null,null,0,50);
 if (j->>'total')::int<>1 then raise exception 'deleted user login history lost';end if;
end $$;
reset role;
rollback;
select 'NV37 access and login history checks passed' as result;
