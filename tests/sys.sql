-- NV28: system Admin, permissions per person, subscription (read only after it ends) and limits. Run after roles.sql, email.sql, review.sql.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
\set sys '''00000000-0000-0000-0000-0000000000a1'''
\set co '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='co@x.com'"` ''''
\set ek '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_employees where id='ec'"` ''''
set role authenticated;
select pg_temp.as_user(:sys);
select 'sys creates an owner', public.nv_staff_create('own9@x.com','12345678','Own9','owner') is not null;
select 'sys creates a 2nd Admin', public.nv_staff_create('adm2@x.com','12345678','Adm2','sysadmin') is not null;
select 'reviewer (reader + review)', public.nv_staff_create('rev@x.com','12345678','Rev','reader') is not null;
reset role;
\set o9 '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='own9@x.com'"` ''''
\set rv '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='rev@x.com'"` ''''
set role authenticated;
-- the owner does not see or touch Admins and the subscription
select pg_temp.as_user(:o9);
select 'owner sees Admins (expect 0)', count(*) from nv_staff where role = 'sysadmin';
select 'owner adds Admin (expect error)'; select public.nv_staff_create('x9@x.com','12345678','X','sysadmin');
select 'owner edits subscription (expect error)'; select public.nv_sub_save('{"plan":"free"}');
select 'owner sets perms (expect error)'; select public.nv_staff_perms(:co, '{"delete":false}');
select 'owner reads subscription', (public.nv_sub_get()->>'plan'), (public.nv_sub_get()->'log') is null;
-- permissions per person
select pg_temp.as_user(:sys);
select 'sys removes delete from coordinator', public.nv_staff_perms(:co, '{"delete":false}');
select 'sys gives review to the reader', public.nv_staff_perms(:rv, '{"review":true}');
select pg_temp.as_user(:co);
select 'coordinator perms', public.nv_me()->'perms';
insert into nv_schools(id,ident,name) values ('sx1','ISX1','SX1');
with d as (delete from nv_schools where id='sx1' returning 1) select 'coordinator delete without perm (expect 0)', count(*) from d;
select pg_temp.as_user(:rv);
select 'reviewer me', public.nv_me()->>'role', public.nv_me()->'perms';
update nv_collections set serial='HACK', review_status='ok', review_note='fine' where id='rc';
select 'reviewer: only the review changed', review_status, review_note, coalesce(serial,'') <> 'HACK' from nv_collections where id='rc';
-- limits
select pg_temp.as_user(:sys);
select 'sys sets limits', (public.nv_sub_save(jsonb_build_object('customer','Shalfa','max_schools',(select count(*)+1 from nv_schools),'max_field',(select count(*) from nv_employees)),'limits')->>'max_schools') is not null;
select pg_temp.as_user(:co);
insert into nv_schools(id,ident,name) values ('sx2','ISX2','SX2'); select 'school under the limit', count(*) from nv_schools where id='sx2';
select 'school over the limit (expect error)'; insert into nv_schools(id,ident,name) values ('sx3','ISX3','SX3');
select 'field over the limit (expect error)'; insert into nv_employees(id,number,name) values ('ex9','99009','X');
select pg_temp.as_user(:sys);
insert into nv_schools(id,ident,name) values ('sx4','ISX4','SX4'); select 'Admin is not limited', count(*) from nv_schools where id='sx4';
-- field permissions
select 'sys: no new collection for ec', public.nv_emp_perms('ec','{"collect":false}');
select pg_temp.as_user(:ek);
select 'tech perms', public.nv_me()->'perms';
select 'tech insert without collect (expect error)'; insert into nv_collections(id,employee_id,school_id) values ('cz','ec','rs');
select pg_temp.as_user(:sys); select public.nv_emp_perms('ec', null);
-- the subscription ends: read only
select 'sys ends the subscription', (public.nv_sub_save(jsonb_build_object('ends_at',(now()-interval '10 days')::text,'grace_days',7,'max_schools',null,'max_field',null),'end')->>'ok');
select pg_temp.as_user(:co);
select 'coordinator after the end', public.nv_me()->>'role', public.nv_me()->'perms', public.nv_me()->'sub'->>'ok';
select 'write after the end (expect error)'; insert into nv_schools(id,ident,name) values ('sx5','ISX5','SX5');
select 'still reads', count(*) > 0 from nv_schools;
select pg_temp.as_user(:ek);
select 'tech after the end (expect error)'; insert into nv_collections(id,employee_id,school_id) values ('cy','ec','rs');
with u as (update nv_collections set notes='x' where id='rc' returning 1) select 'tech edit after the end (expect 0)', count(*) from u;
select pg_temp.as_user(:sys);
insert into nv_schools(id,ident,name) values ('sx6','ISX6','SX6'); select 'Admin still writes', count(*) from nv_schools where id='sx6';
select 'grace: ended 3 days ago, 7 days grace → ok', (public.nv_sub_save(jsonb_build_object('ends_at',(now()-interval '3 days')::text),'renew')->>'ok');
select 'renewed +3 months', (public.nv_sub_save(jsonb_build_object('ends_at',(now()+interval '3 months')::text),'renew')->>'ok');
select pg_temp.as_user(:co); insert into nv_schools(id,ident,name) values ('sx7','ISX7','SX7'); select 'coordinator writes again', count(*) from nv_schools where id='sx7';
select pg_temp.as_user(:sys); select 'log entries', jsonb_array_length(public.nv_sub_get()->'log'), 'staff list', (select count(*) from public.nv_staff_list());
reset role;
-- NV29: reminders (service role only, once per stage) and «طلب تجديد»
\set o9 '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_staff where email='own9@x.com'"` ''''
update nv_subscription set ends_at = now() + interval '6 days 2 hours';
set role service_role; select 'due (7)', public.nv_sub_reminder_due()->>'stage', public.nv_sub_reminder_due()->'to'; select public.nv_sub_reminder_mark((public.nv_sub_reminder_due()->>'stage')::int,(public.nv_sub_reminder_due()->>'ends_at')::timestamptz,'[]');
select 'after mark (null)', public.nv_sub_reminder_due() is null; reset role;
update nv_subscription set ends_at = now() + interval '20 hours'; set role service_role; select 'due (1)', public.nv_sub_reminder_due()->>'stage'; reset role;
update nv_subscription set ends_at = now() - interval '1 day', grace_days = 7; set role service_role; select 'ended (0)', public.nv_sub_reminder_due()->>'stage'; reset role;
set role authenticated; select pg_temp.as_user(:o9);
select 'owner calls reminder helper (expect error)'; select public.nv_sub_reminder_due();
select 'owner renew request', public.nv_renew_request('نرجو التجديد سنة')->>'customer';
select 'second request (expect error)'; select public.nv_renew_request('x');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1'); select 'Admin renew request (expect error)'; select public.nv_renew_request('x');
reset role; update nv_subscription set ends_at = now() + interval '3 months', grace_days = 7;

-- NV30: the same serial number on another asset (normalised: «sn 1234x» = «SN-1234X»)
insert into nv_categories(id,ar) values ('gz','cat') on conflict do nothing; insert into nv_types(id,cat,ar) values ('tz','gz','t') on conflict do nothing;
update nv_collections set type_id='tz', serial='SN-1234X' where id='rc';
set role authenticated; select pg_temp.as_user(:ek);
select 'serial dupes', jsonb_array_length(public.nv_serial_dupes('sn 1234x')), jsonb_array_length(public.nv_serial_dupes('sn 1234x','rc')), jsonb_array_length(public.nv_serial_dupes('ab'));
reset role;
-- NV32: the supervisor confirms the label with a photo (no edit_sent needed, no change-log line, the review stays)
select pg_temp.as_user(:sys); select public.nv_emp_perms('ec','{"edit_sent":false}');
update nv_collections set review_status='ok', review_note='' where id='rc';
set role authenticated; select pg_temp.as_user(:ek);
select 'tech confirms (no edit_sent)', public.nv_label_confirm('rc','p_lbl1','ok')->>'label_check';
select 'label stored, review kept', label_photo, label_check, review_status, label_by like 'emp:%' from nv_collections where id='rc';
with u as (update nv_collections set serial='X9' where id='rc' returning 1) select 'tech edit without edit_sent (expect 0)', count(*) from u;
select 'unread check', public.nv_label_confirm('rc','p_lbl2','maybe')->>'label_check';
reset role; select 'no change-log line for the label (expect 0)', count(*) from nv_log where changes ?| array['label_photo','label_at','label_check'];
set role authenticated; select pg_temp.as_user(:co); insert into nv_collections(id,employee_id,school_id,type_id,submitted_at) values ('rz','ec','rs','tz',now());
select pg_temp.as_user(:o9); select 'another account can (edit perm)', public.nv_label_confirm('rz','p_x','ok')->>'label_check';
reset role; update nv_subscription set ends_at = now() - interval '30 days', grace_days = 0;
set role authenticated; select pg_temp.as_user(:ek); select 'after the end (expect error)'; select public.nv_label_confirm('rc','p_lbl3','ok');
reset role; update nv_subscription set ends_at = now() + interval '3 months', grace_days = 7;
set role authenticated; select pg_temp.as_user(:ek); select 'printed (own rc, own rz)', public.nv_label_printed(array['rc']), public.nv_label_printed(array['rz']);
select 'printed kept + confirm implies printed', label_printed_at is not null from nv_collections where id='rc';
reset role; select pg_temp.as_user(:sys); select public.nv_emp_perms('ec', null); reset role;
