-- NV51 (migration 048): exceptions, label «could not stick», rooms marked complete, «ops» settings, quality page.
-- Run on a database built with tests/supabase_stub.sql + solvix_setup.sql (or an NV50 database + migrations/048).
\set ON_ERROR_STOP 1
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000051a1','own51@x.com'),('00000000-0000-0000-0000-0000000051a2','rd51@x.com'),('00000000-0000-0000-0000-0000000051a3','fe51@x.com'),('00000000-0000-0000-0000-0000000051a4','fo51@x.com') on conflict do nothing;
insert into nv_staff(user_id,email,role) values ('00000000-0000-0000-0000-0000000051a1','own51@x.com','owner'),('00000000-0000-0000-0000-0000000051a2','rd51@x.com','reader') on conflict do nothing;
insert into nv_employees(id,number,name,email,user_id) values ('e51','5101','فني 51','fe51@x.com','00000000-0000-0000-0000-0000000051a3'),('e51b','5102','فني آخر','fo51@x.com','00000000-0000-0000-0000-0000000051a4') on conflict do nothing;
insert into nv_settings(id,data) values (1,'{}') on conflict do nothing;
insert into nv_schools(id,ident,name) values ('s51','B51','مبنى 51') on conflict do nothing;
insert into nv_categories(id,ar,en) values ('k51','فئة','Cat') on conflict do nothing;
insert into nv_types(id,cat,ar,en) values ('t51','k51','نوع','Type') on conflict do nothing;
insert into nv_collections(id,employee_id,school_id,floor,room_number,room_name_id,type_id,category_id,quantity,submitted_at,asset_image)
 values ('c51a','e51','s51','الأرضي','1',null,'t51','k51',1,now(),'p51a'),('c51b','e51','s51','الأرضي','1',null,'t51','k51',1,now(),null) on conflict do nothing;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
create or replace function pg_temp.fails(q text,pat text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then if sqlerrm ~ pat then return true; end if; raise notice 'unexpected: %',sqlerrm; return false; end $$;
create or replace function pg_temp.ok(c boolean,m text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FAIL %',m; end if; raise notice 'PASS %',m; end $$;
select pg_temp.ok((select count(*) from information_schema.columns where table_name='nv_collections' and column_name in ('zone','exc_kind','exc_reason','exc_photo','label_note'))=5,'new collection columns');
select pg_temp.ok(pg_temp.fails($q$update nv_collections set exc_kind='other' where id='c51a'$q$,'nv_coll_exc_chk'),'exc_kind limited to access');
-- the supervisor records an access exception on his asset (normal sync path)
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000051a3');
select pg_temp.ok((public.nv_sync_mutate('nv_collections','c51b',jsonb_build_object('id','c51b','exc_kind',null),'{"exc_kind":"access","exc_reason":"مقفل","exc_photo":"p51x","zone":"الجناح"}'::jsonb))->>'ok'='true','supervisor writes exception + zone through nv_sync_mutate');
reset role;
select pg_temp.ok((select exc_photo from nv_collections where id='c51b')='p51x','exception stored');
select pg_temp.ok(exists(select 1 from nv_log where coll='c51b' and changes ? 'exc_kind' and changes ? 'zone'),'change log follows exception and zone');
update nv_collections set exc_kind=null where id='c51b';
select pg_temp.ok((select exc_reason is null and exc_photo is null from nv_collections where id='c51b'),'clearing the kind clears reason and photo');
update nv_collections set exc_kind='access',exc_reason='مقفل',exc_photo='p51x' where id='c51b';
-- label could not be stuck
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000051a3');
select pg_temp.ok(pg_temp.fails($q$select public.nv_label_fail('c51a','p51l','')$q$,'reason required'),'label fail needs a reason');
select pg_temp.ok(pg_temp.fails($q$select public.nv_label_fail('c51a','','سطح')$q$,'photo required'),'label fail needs a photo');
select pg_temp.ok((public.nv_label_fail('c51a','p51l','سطح رطب'))->>'label_check'='fail','supervisor records «could not stick»');
select pg_temp.as_user('00000000-0000-0000-0000-0000000051a4');
select pg_temp.ok(pg_temp.fails($q$select public.nv_label_fail('c51a','p51m','x')$q$,'not allowed'),'another supervisor cannot');
select pg_temp.as_user('00000000-0000-0000-0000-0000000051a2');
select pg_temp.ok(pg_temp.fails($q$select public.nv_label_fail('c51a','p51m','x')$q$,'not allowed'),'reader cannot');
reset role;
select pg_temp.ok((select label_note='سطح رطب' and label_photo='p51l' from nv_collections where id='c51a'),'note and photo stored');
select pg_temp.ok(not exists(select 1 from nv_log where coll='c51a' and changes ? 'label_note'),'label exception is not an edit (no change-log line)');
set role authenticated;select pg_temp.as_user('00000000-0000-0000-0000-0000000051a3');
select pg_temp.ok((public.nv_label_confirm('c51a','p51k','ok'))->>'label_check'='ok','a later confirmation replaces it');
reset role;
select pg_temp.ok((select label_note is null from nv_collections where id='c51a'),'confirmation clears the note');
select pg_temp.ok(public.nv_photo_unreferenced('p51x.jpg') is false,'exception photo protected from storage cleanup');
-- rooms
set role authenticated;select pg_temp.as_user('00000000-0000-0000-0000-0000000051a3');
select pg_temp.ok((public.nv_room_mark('s51','الأرضي','1','',true))->>'done'='true','supervisor marks his room complete');
select pg_temp.ok((select count(*) from nv_room_done where school_id='s51')=1,'supervisor reads his room mark');
select pg_temp.as_user('00000000-0000-0000-0000-0000000051a4');
select pg_temp.ok(pg_temp.fails($q$select public.nv_room_mark('s51','الأرضي','1','',true)$q$,'not allowed'),'a supervisor without assets in the building cannot');
select pg_temp.ok((select count(*) from nv_room_done)=0,'and does not see other marks');
select pg_temp.as_user('00000000-0000-0000-0000-0000000051a2');
select pg_temp.ok((select count(*) from nv_room_done where school_id='s51')=1,'reader sees room marks');
select pg_temp.ok(pg_temp.fails($q$insert into nv_room_done(id,school_id) values ('x','s51')$q$,'permission|policy'),'no direct writes');
select pg_temp.as_user('00000000-0000-0000-0000-0000000051a1');
select pg_temp.ok((public.nv_room_mark('s51','الأرضي','1','',false))->>'done'='false','owner reopens the room');
-- settings «ops»
do $$ declare e jsonb:=jsonb_build_object('app_name',coalesce(nullif((select data->>'app_name' from nv_settings where id=1),''),'Solvix'),'admin_email',coalesce((select data->>'admin_email' from nv_settings where id=1),''),'logo',(select data->'logo' from nv_settings where id=1),'label',(select data->'label' from nv_settings where id=1),'geo',(select data->'geo' from nv_settings where id=1),'room_tpl',(select data->'room_tpl' from nv_settings where id=1))
   ||case when jsonb_typeof((select data->'site' from nv_settings where id=1))='object' then jsonb_build_object('site',(select data->'site' from nv_settings where id=1)) else '{}' end;
 begin perform public.nv_settings_save(e,'{"ops":{"target":30,"zone":{"on":true,"l":"القسم"}}}'::jsonb); end $$;
select pg_temp.ok((select data->'ops'->>'target' from nv_settings where id=1)='30','owner saves «ops»');
select pg_temp.ok(pg_temp.fails($q$select public.nv_settings_save('{}','{"ops":[1]}')$q$,'invalid ops|CONFLICT'),'ops must be an object');
-- quality page
select pg_temp.ok((public.nv_quality_page('s51'))->>'exceptions'='1','quality page counts exceptions');
select pg_temp.ok(jsonb_array_length((public.nv_quality_page('s51',null,'exceptions'))->'items')=1,'quality filter «exceptions»');
reset role;
