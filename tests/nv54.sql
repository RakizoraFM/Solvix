-- NV54 (migration 049): the system Admin always gets the guide and releases pages; other accounts keep their own grant.
\set ON_ERROR_STOP 1
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000054a1','sys54@x.com'),('00000000-0000-0000-0000-0000000054a2','own54@x.com') on conflict do nothing;
insert into nv_staff(user_id,email,role) values ('00000000-0000-0000-0000-0000000054a1','sys54@x.com','sysadmin'),('00000000-0000-0000-0000-0000000054a2','own54@x.com','owner') on conflict do nothing;
create or replace function pg_temp.ok(c boolean,m text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FAIL %',m; end if; raise notice 'PASS %',m; end $$;
delete from nv_document_access45 where user_id in ('00000000-0000-0000-0000-0000000054a1','00000000-0000-0000-0000-0000000054a2');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000054a1',false);
select pg_temp.ok(public.nv_document_access45()='{"guide":true,"releases":true}'::jsonb,'system Admin without a grant row sees both pages');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000054a2',false);
select pg_temp.ok(public.nv_document_access45()='{"guide":false,"releases":false}'::jsonb,'owner without a grant sees neither');
reset role;
insert into nv_document_access45(user_id,guide,releases) values ('00000000-0000-0000-0000-0000000054a2',true,false);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000054a2',false);
select pg_temp.ok(public.nv_document_access45()='{"guide":true,"releases":false}'::jsonb,'owner with the guide grant only');
reset role;
