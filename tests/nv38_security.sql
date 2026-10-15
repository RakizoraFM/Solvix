-- Isolated PostgreSQL test database only, after supabase_stub.sql + solvix_setup.sql.
-- NOT executed in the authoring environment. Does not test concurrent sessions.
begin;
insert into auth.users(id,email,created_at) values
 ('38000000-0000-0000-0000-000000000001','sys38@test.invalid',now()),
 ('38000000-0000-0000-0000-000000000002','field38@test.invalid',now());
insert into nv_staff(user_id,email,name,role) values('38000000-0000-0000-0000-000000000001','sys38@test.invalid','Admin38','sysadmin');
insert into nv_employees(id,number,name,user_id) values('e38','n38','Field38','38000000-0000-0000-0000-000000000002');
insert into nv_schools(id,ident,name) values('b38','B38','Building38');
insert into nv_categories(id,ar) values('cat38','Category38');
insert into nv_types(id,cat,ar) values('t38','cat38','Type38');
insert into nv_collections(id,employee_id,school_id,type_id,serial,tag,submitted_at,asset_image,review_status)
 values('a38','e38','b38','t38','S-١','EXT-1',now(),'photo38','ok');
update nv_approval_runs set status='returned',last_note='Correct38' where asset_id='a38';
set local role authenticated;
select set_config('request.jwt.claim.sub','38000000-0000-0000-0000-000000000002',true);
do $$ declare j jsonb;begin
 j:=nv_my_tasks();if not exists(select 1 from jsonb_array_elements(j->'items') x where x->>'asset_id'='a38' and x->>'kind'='returned') then raise exception 'own returned task missing';end if;
 begin perform nv_trash_page();raise exception 'field read trash';exception when insufficient_privilege then null;end;
 begin perform nv_asset_restore(gen_random_uuid());raise exception 'field restored asset';exception when insufficient_privilege then null;end;
 begin perform 1 from nv_asset_trash;raise exception 'raw trash exposed';exception when insufficient_privilege then null;end;
 j:=nv_duplicate_check('[{"id":"another","serial":"s1"}]');
 if (j->'items'->0->>'serial_count')::int<>1 then raise exception 'normalized serial check failed';end if;
end $$;
select set_config('request.jwt.claim.sub','38000000-0000-0000-0000-000000000001',true);
do $$ declare expected jsonb;j jsonb;begin
 select to_jsonb(c) into expected from nv_collections c where id='a38';
 begin perform nv_asset_delete('a38',expected,' ');raise exception 'missing reason accepted';exception when raise_exception then
 if sqlerrm not like 'DELETE_REASON_REQUIRED:%' then raise;end if;end;
 begin insert into nv_collections(id,employee_id,school_id,tag) values('dup38','e38','b38','ext 1');raise exception 'duplicate tag accepted';exception when raise_exception then
 if sqlerrm not like 'DUPLICATE_ASSET_NUMBER:%' then raise;end if;end;
 j:=nv_asset_delete('a38',expected,'Duplicate record cleanup');
 if exists(select 1 from nv_collections where id='a38') then raise exception 'deleted asset remains active';end if;
 if nv_photo_unreferenced('photo38.jpg') then raise exception 'trash photo not protected';end if;
 j:=nv_trash_page();if not exists(select 1 from jsonb_array_elements(j->'items') x where x->>'asset_id'='a38' and x->>'deleted_by_label'='Admin38' and x->>'reason'='Duplicate record cleanup') then raise exception 'deletion evidence missing';end if;
 perform nv_asset_restore((select (x->>'id')::uuid from jsonb_array_elements(j->'items') x where x->>'asset_id'='a38'));
 if not exists(select 1 from nv_collections where id='a38' and review_status is null) then raise exception 'review not reset';end if;
 if not exists(select 1 from nv_approval_runs where asset_id='a38' and status='pending' and stage_index=0) then raise exception 'approval not restarted';end if;
 select to_jsonb(c) into expected from nv_collections c where id='a38';
 perform nv_asset_delete('a38',expected,'Expiry test');
end $$;
reset role;
update nv_asset_trash set expires_at=now()-interval '1 second' where asset_id='a38' and restored_at is null;
set local role authenticated;
select set_config('request.jwt.claim.sub','38000000-0000-0000-0000-000000000001',true);
do $$ declare target uuid;begin
 -- Raw trash is intentionally not accessible; obtain the expired fixture through a fixed test setting below.
 if exists(select 1 from jsonb_array_elements(nv_trash_page()->'items') x where x->>'asset_id'='a38') then raise exception 'expired asset visible for restore';end if;
end $$;
reset role;
do $$ declare target uuid;begin
 select id into target from nv_asset_trash where asset_id='a38' and restored_at is null;
 begin perform nv_asset_restore(target);raise exception 'expired asset restored';exception when raise_exception then
 if sqlerrm not like 'TRASH_EXPIRED:%' then raise;end if;end;
 if not exists(select 1 from nv_asset_trash where asset_id='a38' and restored_at is not null and restored_by='38000000-0000-0000-0000-000000000001') then raise exception 'restore history missing';end if;
end $$;
rollback;
select 'NV38 access, identity, task and restoration checks passed' as result;
