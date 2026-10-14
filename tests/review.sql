-- NV26 photo review: a field supervisor cannot approve; his edit sends a reviewed asset back to review (run after roles.sql: 'ec' has a login)
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
\set ek '''' `psql -h /tmp/nvpg -p 5544 -U postgres -d sx -Atc "select user_id from nv_employees where id='ec'"` ''''
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into nv_schools(id,ident,name,lat,lng) values ('rs','IRS','Review school',26.3301,43.9712);
select pg_temp.as_user(:ek);
insert into nv_collections(id,employee_id,school_id,review_status,review_note,geo_dist,asset_image2,submitted_at) values ('rc','ec','rs','ok','self',840,'p_x',now());
select 'tech insert: status / note / dist', coalesce(review_status,'null'), review_note, geo_dist from nv_collections where id='rc';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update nv_collections set review_status='returned', review_note='retake nameplate', reviewed_at=now(), reviewed_by='owner' where id='rc';
select pg_temp.as_user(:ek);
select 'tech sees returned', review_status, review_note from nv_collections where id='rc';
update nv_collections set review_status='ok', review_note='hack', serial='SN1' where id='rc';
select 'tech edit -> back to review, note kept', coalesce(review_status,'null'), review_note, reviewed_by from nv_collections where id='rc';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update nv_collections set review_status='ok', reviewed_at=now() where id='rc';
select 'owner approved', review_status from nv_collections where id='rc';
update nv_collections set review_status='bad' where id='rc';
select 'bad status (expect error above), still', review_status from nv_collections where id='rc';
select 'review changes are not in the change log', count(*) from nv_log where coll='rc' and changes ? 'review_status';
reset role;
