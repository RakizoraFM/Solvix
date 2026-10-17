-- NV44. Run after NV38 in each client's own database. No cross-client registry access.
begin;
create table if not exists public.nv_inventory_plans(
 id uuid primary key default gen_random_uuid(),building_id text not null,owner_id text not null,name text not null,
 due_date date not null,rooms jsonb not null default '[]',asset_ids jsonb not null default '[]',revision int not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),actor uuid);
create table if not exists public.nv_inventory_cycles(
 id uuid primary key default gen_random_uuid(),plan_id uuid not null references public.nv_inventory_plans(id),building_id text not null,
 owner_id text not null,name text not null,due_date date not null,rooms jsonb not null,asset_ids jsonb not null,
 expected jsonb not null,previous jsonb not null default '[]',previous_id uuid,status text not null default 'open' check(status in('open','closed')),
 snapshot jsonb,opened_at timestamptz not null default now(),closed_at timestamptz,actor uuid);
create unique index if not exists nv_one_open_cycle44 on public.nv_inventory_cycles(plan_id) where status='open';
create table if not exists public.nv_inventory_observations(
 cycle_id uuid not null references public.nv_inventory_cycles(id),asset_id text not null,snapshot jsonb not null,
 actual jsonb not null,seen_at timestamptz not null default now(),actor uuid,revision int not null default 1,
 primary key(cycle_id,asset_id));
create table if not exists public.nv_inventory_events(
 id bigint generated always as identity primary key,cycle_id uuid,action text not null,asset_id text,
 before_data jsonb,after_data jsonb,reason text not null default '',at timestamptz not null default now(),actor uuid);
create table if not exists public.nv_asset_movements(
 id uuid primary key,asset_id text not null,from_data jsonb not null,to_data jsonb not null,
 reason text not null,at timestamptz not null default now(),actor uuid);
create table if not exists public.nv_asset_splits(
 id uuid primary key,source_id text not null,before_data jsonb not null,asset_ids jsonb not null,
 reason text not null,at timestamptz not null default now(),actor uuid);
-- Identity persists through trash/restore. Do not cascade it on asset deletion.
create table if not exists public.nv_piece_identity(asset_id text primary key,event_id uuid,created_at timestamptz not null default now(),actor uuid);
do $$declare t text;begin
 foreach t in array array['nv_inventory_plans','nv_inventory_cycles','nv_inventory_observations','nv_inventory_events','nv_asset_movements','nv_asset_splits','nv_piece_identity'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
create or replace function public.nv_inventory_access44(p_owner text,p_write boolean default false) returns boolean
language sql stable security definer set search_path=public as $$
 select public.nv_member() and case when p_write then public.nv_sub_ok() and
 (public.nv_perm('edit') or (p_owner=public.nv_my_emp() and public.nv_emp_perm('collect')))
 else public.nv_can_read() or p_owner=public.nv_my_emp() end
$$;
create or replace function public.nv_inventory_asset44(c public.nv_collections) returns jsonb
language sql stable set search_path=public as $$
 select jsonb_build_object('id',c.id,'no',c.no,'type_id',c.type_id,'school_id',c.school_id,
 'floor',c.floor,'room_number',c.room_number,'room_name_id',c.room_name_id,'condition_id',c.condition_id,
 'quantity',c.quantity,'serial',c.serial,'brand',c.brand,'model',c.model)
$$;
create or replace function public.nv_inventory_scope44(c public.nv_collections,p_building text,p_rooms jsonb,p_ids jsonb) returns boolean
language sql immutable as $$ select c.school_id=p_building and c.type_id is not null and c.submitted_at is not null
 and (jsonb_array_length(p_ids)=0 or p_ids ? c.id)
 and (jsonb_array_length(p_rooms)=0 or exists(select 1 from jsonb_array_elements(p_rooms) r
 where coalesce(c.floor,'')=r->>'floor' and coalesce(c.room_number,'')=r->>'room_number'
 and (coalesce(r->>'room_name_id','')='' or c.room_name_id=r->>'room_name_id'))) $$;
create or replace function public.nv_inventory_actor44(p_user uuid) returns text
language sql stable security definer set search_path=public,auth as $$
 select coalesce(nullif(s.name,''),e.name,u.email,p_user::text) from auth.users u
 left join public.nv_staff s on s.user_id=u.id left join public.nv_employees e on e.user_id=u.id where u.id=p_user
$$;
create or replace function public.nv_inventory_stamp_actor44() returns trigger language plpgsql security definer set search_path=public as $$begin
 if tg_op='INSERT' then new.actor_label:=public.nv_inventory_actor44(new.actor);
 elsif tg_table_name in('nv_inventory_plans','nv_inventory_observations') or new.actor is distinct from old.actor then new.actor_label:=public.nv_inventory_actor44(new.actor);
 else new.actor_label:=coalesce(old.actor_label,public.nv_inventory_actor44(new.actor));end if;return new;
end $$;
do $$declare t text;begin
 foreach t in array array['nv_inventory_plans','nv_inventory_cycles','nv_inventory_observations','nv_inventory_events','nv_asset_movements','nv_asset_splits','nv_piece_identity'] loop
 execute format('alter table public.%I add column if not exists actor_label text',t);
 execute format('update public.%I set actor_label=public.nv_inventory_actor44(actor) where actor_label is null',t);
 execute format('drop trigger if exists nv_stamp_actor44 on public.%I',t);
 execute format('create trigger nv_stamp_actor44 before insert or update on public.%I for each row execute function public.nv_inventory_stamp_actor44()',t);
 end loop;
end $$;
create or replace function public.nv_inventory_list44() returns jsonb
language plpgsql stable security definer set search_path=public as $$begin
 if not public.nv_member() then raise exception 'not permitted' using errcode='42501';end if;
 return jsonb_build_object('plans',coalesce((select jsonb_agg(to_jsonb(x)) from
 (select * from public.nv_inventory_plans p where public.nv_inventory_access44(p.owner_id) order by updated_at desc limit 200) x),'[]'),
 'cycles',coalesce((select jsonb_agg(to_jsonb(x)-'rooms'-'asset_ids') from
 (select id,plan_id,building_id,owner_id,name,due_date,status,opened_at,closed_at,previous_id,
 jsonb_array_length(expected) target_count,(select count(*) from public.nv_inventory_observations o where o.cycle_id=c.id and exists(select 1 from jsonb_array_elements(c.expected) e where e->>'id'=o.asset_id)) seen_count
 from public.nv_inventory_cycles c where public.nv_inventory_access44(c.owner_id) order by opened_at desc limit 200) x),'[]'),
 'moves',case when public.nv_can_read() then coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('actor_label',coalesce(x.actor_label,public.nv_inventory_actor44(x.actor)))) from (select * from public.nv_asset_movements order by at desc limit 200) x),'[]') else '[]'::jsonb end,
 'splits',case when public.nv_can_read() then coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('actor_label',coalesce(x.actor_label,public.nv_inventory_actor44(x.actor)))) from (select * from public.nv_asset_splits order by at desc limit 100) x),'[]') else '[]'::jsonb end,
 'pieces',coalesce((select jsonb_agg(p.asset_id) from public.nv_piece_identity p join public.nv_collections c on c.id=p.asset_id where public.nv_can_read() or c.employee_id=public.nv_my_emp()),'[]'));
end $$;
create or replace function public.nv_inventory_plan44(p_id uuid,p_revision int,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
#variable_conflict use_variable
declare p public.nv_inventory_plans;r jsonb;ids jsonb:=coalesce(p_data->'asset_ids','[]');rooms jsonb:=coalesce(p_data->'rooms','[]');begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 if length(btrim(coalesce(p_data->>'name',''))) not between 1 and 120 or jsonb_typeof(rooms)<>'array' or jsonb_array_length(rooms)>100 or jsonb_typeof(ids)<>'array' or jsonb_array_length(ids)>5000 then raise exception 'invalid plan';end if;
 if not exists(select 1 from public.nv_schools where id=p_data->>'building_id') or not exists(select 1 from public.nv_employees where id=p_data->>'owner_id') or nullif(p_data->>'due_date','') is null then raise exception 'building, owner and deadline required';end if;
 for r in select * from jsonb_array_elements(rooms) loop
 if jsonb_typeof(r)<>'object' or length(btrim(coalesce(r->>'floor',''))) not between 1 and 100 or length(btrim(coalesce(r->>'room_number',''))) not between 1 and 100 or (coalesce(r->>'room_name_id','')<>'' and not exists(select 1 from public.nv_rooms where id=r->>'room_name_id')) then raise exception 'invalid target room';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements_text(ids) x where not exists(select 1 from public.nv_collections c where c.id=x and public.nv_inventory_scope44(c,p_data->>'building_id',rooms,'[]'))) then raise exception 'target asset outside building/rooms or not submitted';end if;
 if p_id is null then
 insert into public.nv_inventory_plans(building_id,owner_id,name,due_date,rooms,asset_ids,actor) values(p_data->>'building_id',p_data->>'owner_id',btrim(p_data->>'name'),(p_data->>'due_date')::date,rooms,ids,auth.uid()) returning * into p;
 else
 select * into p from public.nv_inventory_plans where id=p_id for update;
 if not found or p.revision is distinct from p_revision then raise exception 'PLAN_CONFLICT: حدّث الخطة قبل تعديلها';end if;
 update public.nv_inventory_plans set building_id=p_data->>'building_id',owner_id=p_data->>'owner_id',name=btrim(p_data->>'name'),due_date=(p_data->>'due_date')::date,rooms=rooms,asset_ids=ids,revision=revision+1,updated_at=now(),actor=auth.uid() where id=p_id returning * into p;
 end if;
 insert into public.nv_inventory_events(action,after_data,actor) values('plan_saved',to_jsonb(p),auth.uid());return to_jsonb(p);
end $$;
create or replace function public.nv_inventory_start44(p_plan uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p public.nv_inventory_plans;c public.nv_inventory_cycles;prev public.nv_inventory_cycles;expected jsonb;begin
 select * into p from public.nv_inventory_plans where id=p_plan for update;
 if not found or not public.nv_inventory_access44(p.owner_id,true) then raise exception 'not permitted' using errcode='42501';end if;
 select * into c from public.nv_inventory_cycles where plan_id=p.id and status='open';if found then return to_jsonb(c);end if;
 select coalesce(jsonb_agg(public.nv_inventory_asset44(a) order by a.no),'[]') into expected from public.nv_collections a where public.nv_inventory_scope44(a,p.building_id,p.rooms,p.asset_ids);
 if jsonb_array_length(expected)>5000 then raise exception 'نطاق الدورة أكبر من 5000 سجل؛ قسّم الخطة إلى غرف أو مجموعات أصغر';end if;
 select * into prev from public.nv_inventory_cycles where plan_id=p.id and status='closed' order by closed_at desc,id desc limit 1;
 insert into public.nv_inventory_cycles(plan_id,building_id,owner_id,name,due_date,rooms,asset_ids,expected,previous,previous_id,actor)
 values(p.id,p.building_id,p.owner_id,p.name,p.due_date,p.rooms,p.asset_ids,expected,coalesce(prev.snapshot,'[]'),prev.id,auth.uid()) returning * into c;
 insert into public.nv_inventory_events(cycle_id,action,actor) values(c.id,'cycle_opened',auth.uid());return to_jsonb(c);
end $$;
create or replace function public.nv_inventory_cycle44(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$declare c public.nv_inventory_cycles;begin
 select * into c from public.nv_inventory_cycles where id=p_id;
 if not found or not public.nv_inventory_access44(c.owner_id) then raise exception 'not permitted' using errcode='42501';end if;
 return jsonb_build_object('cycle',to_jsonb(c),'observations',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('actor_label',coalesce(o.actor_label,public.nv_inventory_actor44(o.actor))) order by seen_at,asset_id) from public.nv_inventory_observations o where cycle_id=c.id),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('actor_label',coalesce(e.actor_label,public.nv_inventory_actor44(e.actor))) order by at,id) from public.nv_inventory_events e where cycle_id=c.id),'[]'));
end $$;
create or replace function public.nv_inventory_scan44(p_cycle uuid,p_no bigint,p_actual jsonb,p_revision int default null,p_reason text default '') returns jsonb
language plpgsql security definer set search_path=public as $$
#variable_conflict use_variable
declare c public.nv_inventory_cycles;a public.nv_collections;o public.nv_inventory_observations;actual jsonb;qty int;begin
 select * into c from public.nv_inventory_cycles where id=p_cycle for update;
 if not found or not public.nv_inventory_access44(c.owner_id,true) then raise exception 'not permitted' using errcode='42501';end if;
 if c.status<>'open' then raise exception 'CYCLE_CLOSED: الدورة مغلقة ولا تقبل المسح';end if;
 select * into a from public.nv_collections where no=p_no and type_id is not null and submitted_at is not null;
 if not found then raise exception 'UNKNOWN_ASSET: الرقم لا يطابق أصلًا مُرسلًا؛ أضفه وزامنه أولًا';end if;
 if a.school_id<>c.building_id and not public.nv_perm('edit') and not exists(select 1 from jsonb_array_elements(c.expected||c.previous) e where e->>'id'=a.id) then raise exception 'FOREIGN_ASSET: الأصل مسجل بمبنى آخر؛ راجع المسؤول لتوثيق نقله';end if;
 select * into o from public.nv_inventory_observations where cycle_id=c.id and asset_id=a.id;
 if found and p_revision is null then return to_jsonb(o)||jsonb_build_object('duplicate',true);end if;
 if p_revision is not null and (o.asset_id is null or o.revision<>p_revision or length(btrim(coalesce(p_reason,''))) not between 3 and 1000) then raise exception 'SCAN_CONFLICT: حدّث النتيجة واكتب سبب التصحيح';end if;
 if length(btrim(coalesce(p_actual->>'floor',''))) not between 1 and 100 or length(btrim(coalesce(p_actual->>'room_number',''))) not between 1 and 100 then raise exception 'ACTUAL_LOCATION_REQUIRED: حدد الدور والغرفة الفعليين';end if;
 if jsonb_array_length(c.rooms)>0 and not exists(select 1 from jsonb_array_elements(c.rooms) r where r->>'floor'=btrim(p_actual->>'floor') and r->>'room_number'=btrim(p_actual->>'room_number')) then raise exception 'الموقع الفعلي خارج غرف نطاق الدورة';end if;
 if coalesce(p_actual->>'condition_id','')<>'' and not exists(select 1 from public.nv_conditions where id=p_actual->>'condition_id') then raise exception 'invalid condition';end if;
 if coalesce(p_actual->>'room_name_id','')<>'' and not exists(select 1 from public.nv_rooms where id=p_actual->>'room_name_id') then raise exception 'invalid room name';end if;
 qty:=nullif(p_actual->>'quantity','')::int;if qty is null then if a.quantity=1 then qty:=1;else raise exception 'ACTUAL_QUANTITY_REQUIRED: أكد الكمية الفعلية للسجل المجمّع';end if;end if;
 if qty<0 or qty>1000000 then raise exception 'invalid quantity';end if;
 if exists(select 1 from public.nv_piece_identity where asset_id=a.id) and qty<>1 then raise exception 'PIECE_QUANTITY_ONE: الأصل المستقل كميته واحدة';end if;
 actual:=jsonb_build_object('school_id',c.building_id,'floor',btrim(p_actual->>'floor'),'room_number',btrim(p_actual->>'room_number'),'room_name_id',nullif(p_actual->>'room_name_id',''),'condition_id',nullif(p_actual->>'condition_id',''),'quantity',qty,'note',left(coalesce(p_actual->>'note',''),1000));
 if o.asset_id is not null then
 insert into public.nv_inventory_events(cycle_id,action,asset_id,before_data,after_data,reason,actor) values(c.id,'observation_corrected',a.id,to_jsonb(o),actual,btrim(p_reason),auth.uid());
 update public.nv_inventory_observations set actual=actual,revision=revision+1,seen_at=now(),actor=auth.uid() where cycle_id=c.id and asset_id=a.id returning * into o;
 else
 insert into public.nv_inventory_observations(cycle_id,asset_id,snapshot,actual,actor) values(c.id,a.id,public.nv_inventory_asset44(a),actual,auth.uid()) returning * into o;
 insert into public.nv_inventory_events(cycle_id,action,asset_id,after_data,actor) values(c.id,'asset_seen',a.id,to_jsonb(o),auth.uid());
 end if;return to_jsonb(o)||jsonb_build_object('duplicate',false);
end $$;
create or replace function public.nv_inventory_close44(p_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_inventory_cycles;result jsonb;begin
 if not public.nv_perm('review') or not public.nv_sub_ok() then raise exception 'review permission required' using errcode='42501';end if;
 select * into c from public.nv_inventory_cycles where id=p_id for update;if not found then raise exception 'cycle not found';end if;
 if c.status='closed' then return to_jsonb(c);end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'سبب إغلاق الدورة مطلوب؛ غير المفحوص سيصنّف مفقودًا في هذه الدورة';end if;
 select coalesce(jsonb_agg(x),'[]') into result from(
 select e||coalesce(o.actual,'{}')||jsonb_build_object('verified',o.asset_id is not null) x from jsonb_array_elements(c.expected) e left join public.nv_inventory_observations o on o.cycle_id=c.id and o.asset_id=e->>'id'
 union all select o.snapshot||o.actual||jsonb_build_object('verified',true) from public.nv_inventory_observations o where o.cycle_id=c.id and not exists(select 1 from jsonb_array_elements(c.expected) e where e->>'id'=o.asset_id)) s;
 update public.nv_inventory_cycles set status='closed',closed_at=now(),snapshot=result where id=c.id returning * into c;
 insert into public.nv_inventory_events(cycle_id,action,reason,actor) values(c.id,'cycle_closed',btrim(p_reason),auth.uid());return to_jsonb(c);
end $$;
create or replace function public.nv_piece_location_guard44() returns trigger language plpgsql security definer set search_path=public as $$begin
 if current_setting('solvix.transfer44',true)='on' or current_setting('solvix.split44',true)='on' then new.review_status:=null;new.review_note:='';new.reviewed_at:=null;new.reviewed_by:=null;end if;
 if exists(select 1 from public.nv_piece_identity where asset_id=new.id) and new.quantity<>1 then raise exception 'PIECE_QUANTITY_ONE: استخدم سجلًا مستقلًا لكل قطعة';end if;
 if tg_op='UPDATE' and old.submitted_at is not null and auth.uid() is not null and current_setting('solvix.transfer44',true) is distinct from 'on'
 and (new.school_id,new.floor,new.room_number,new.room_name_id) is distinct from (old.school_id,old.floor,old.room_number,old.room_name_id)
 then raise exception 'DOCUMENTED_MOVE_REQUIRED: انقل الأصل من شاشة النقل الموثق';end if;return new;
end $$;
drop trigger if exists nv_piece_location_guard44 on public.nv_collections;
create trigger nv_piece_location_guard44 before insert or update on public.nv_collections for each row execute function public.nv_piece_location_guard44();
create or replace function public.nv_asset_move44(p_request uuid,p_id text,p_expected jsonb,p_to jsonb,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_collections;before_data jsonb;result public.nv_asset_movements;begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,44));select * into result from public.nv_asset_movements where id=p_request;if found then if result.asset_id<>p_id then raise exception 'request reused';end if;return to_jsonb(result);end if;
 select * into c from public.nv_collections where id=p_id for update;
 if not found or c.submitted_at is null then raise exception 'submitted asset required';end if;
 if to_jsonb(c) is distinct from to_jsonb(jsonb_populate_record(null::public.nv_collections,p_expected)) then raise exception 'ASSET_CONFLICT: تغير الأصل؛ حدّثه قبل النقل';end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 1000 or length(btrim(coalesce(p_to->>'floor',''))) not between 1 and 100 or length(btrim(coalesce(p_to->>'room_number',''))) not between 1 and 100 then raise exception 'destination and reason required';end if;
 if not exists(select 1 from public.nv_schools where id=p_to->>'school_id' and status='active' and completed_at is null) or not exists(select 1 from public.nv_employees where id=p_to->>'employee_id') or (coalesce(p_to->>'room_name_id','')<>'' and not exists(select 1 from public.nv_rooms where id=p_to->>'room_name_id')) then raise exception 'destination building must be open and references valid';end if;
 if (c.school_id,coalesce(c.floor,''),coalesce(c.room_number,''),coalesce(c.room_name_id,''))=(p_to->>'school_id',p_to->>'floor',p_to->>'room_number',coalesce(p_to->>'room_name_id','')) then raise exception 'الموقع الجديد مطابق للموقع الحالي';end if;
 before_data:=to_jsonb(c);perform set_config('solvix.transfer44','on',true);
 update public.nv_collections set school_id=p_to->>'school_id',employee_id=p_to->>'employee_id',floor=btrim(p_to->>'floor'),room_number=btrim(p_to->>'room_number'),room_name_id=nullif(p_to->>'room_name_id',''),
 review_status=null,review_note='',reviewed_by=null,reviewed_at=null,school_image=null,asset_image=null,asset_image2=null,extra_images='{}',label_photo=null,label_at=null,label_by=null,label_check=null,lat=null,lng=null,geo_dist=null where id=p_id returning * into c;
 perform set_config('solvix.transfer44','',true);
 insert into public.nv_asset_movements(id,asset_id,from_data,to_data,reason,actor) values(p_request,p_id,before_data,to_jsonb(c),btrim(p_reason),auth.uid()) returning * into result;return to_jsonb(result);
end $$;
create or replace function public.nv_asset_split44(p_request uuid,p_id text,p_expected jsonb,p_serials jsonb,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_collections;original public.nv_collections;result public.nv_asset_splits;ids jsonb:='[]';i int;newid text;s text;begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,44));select * into result from public.nv_asset_splits where id=p_request;if found then if result.source_id<>p_id then raise exception 'request reused';end if;return to_jsonb(result);end if;
 select * into original from public.nv_collections where id=p_id for update;
 if not found or original.type_id is null or original.quantity not between 1 and 200 or exists(select 1 from public.nv_piece_identity where asset_id=p_id) then raise exception 'حدد سجلًا من 1 إلى 200 قطعة لم يفصل سابقًا';end if;
 if to_jsonb(original) is distinct from to_jsonb(jsonb_populate_record(null::public.nv_collections,p_expected)) then raise exception 'ASSET_CONFLICT: حدّث الأصل قبل الفصل';end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 1000 or jsonb_typeof(p_serials) is distinct from 'array' or jsonb_array_length(p_serials)<>original.quantity then raise exception 'serial row per piece and reason required';end if;
 perform pg_advisory_xact_lock(380038);
 if exists(select 1 from jsonb_array_elements_text(p_serials) v where length(v)>256) or exists(select 1 from jsonb_array_elements_text(p_serials) v where public.nv_identity_norm(v)<>'' group by public.nv_identity_norm(v) having count(*)>1) or exists(select 1 from public.nv_collections a,jsonb_array_elements_text(p_serials) v where a.id<>p_id and public.nv_identity_norm(v)<>'' and public.nv_identity_norm(a.serial)=public.nv_identity_norm(v)) then raise exception 'الرقم التسلسلي مكرر أو طويل؛ لكل قطعة رقم مختلف أو اتركه ناقصًا لاستكماله';end if;
 perform set_config('solvix.split44','on',true);
 for i in 0..original.quantity-1 loop
 s:=btrim(p_serials->>i);
 if i=0 then newid:=p_id;update public.nv_collections set quantity=1,serial=s,review_status=null,review_note='',reviewed_by=null,reviewed_at=null where id=p_id;
 else
 newid:=gen_random_uuid()::text;
 insert into public.nv_collections(id,employee_id,school_id,floor,room_number,room_name_id,category_id,type_id,condition_id,quantity,price,manufacturer,brand,model,capacity,serial,agency,warranty,install_date,parent_child,notes,asad_country)
 values(newid,original.employee_id,original.school_id,original.floor,original.room_number,original.room_name_id,original.category_id,original.type_id,original.condition_id,1,original.price,original.manufacturer,original.brand,original.model,original.capacity,s,original.agency,original.warranty,original.install_date,original.parent_child,original.notes,original.asad_country);
 end if;
 insert into public.nv_piece_identity(asset_id,event_id,actor) values(newid,p_request,auth.uid());ids:=ids||jsonb_build_array(newid);
 end loop;
 perform set_config('solvix.split44','',true);
 insert into public.nv_asset_splits(id,source_id,before_data,asset_ids,reason,actor) values(p_request,p_id,to_jsonb(original),ids,btrim(p_reason),auth.uid()) returning * into result;return to_jsonb(result);
end $$;
create or replace function public.nv_piece_create44(p_request uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_collections;begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,45));select * into c from public.nv_collections where id=p_request::text;if found then if not exists(select 1 from public.nv_piece_identity where asset_id=c.id) then raise exception 'request reused';end if;return to_jsonb(c);end if;
 if not exists(select 1 from public.nv_schools where id=p_data->>'school_id' and status='active' and completed_at is null) or not exists(select 1 from public.nv_employees where id=p_data->>'employee_id') or not exists(select 1 from public.nv_types where id=p_data->>'type_id') then raise exception 'valid open building, employee and type required';end if;
 if length(coalesce(p_data->>'serial',''))>256 then raise exception 'serial too long';end if;
 perform pg_advisory_xact_lock(380038);if public.nv_identity_norm(p_data->>'serial')<>'' and exists(select 1 from public.nv_collections where public.nv_identity_norm(serial)=public.nv_identity_norm(p_data->>'serial')) then raise exception 'الرقم التسلسلي مستخدم لأصل آخر';end if;
 insert into public.nv_collections(id,employee_id,school_id,type_id,category_id,quantity,floor,room_number,serial)
 values(p_request::text,p_data->>'employee_id',p_data->>'school_id',p_data->>'type_id',(select cat from public.nv_types where id=p_data->>'type_id'),1,left(p_data->>'floor',100),left(p_data->>'room_number',100),coalesce(p_data->>'serial','')) returning * into c;
 insert into public.nv_piece_identity(asset_id,actor) values(c.id,auth.uid());return to_jsonb(c);
end $$;
create or replace function public.nv_piece_finish44(p_id text,p_expected jsonb,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$declare c public.nv_collections;v public.nv_collections;k text;begin
 if not public.nv_perm('edit') or not public.nv_sub_ok() then raise exception 'edit permission required' using errcode='42501';end if;
 select * into c from public.nv_collections where id=p_id for update;
 if not found or not exists(select 1 from public.nv_piece_identity where asset_id=p_id) then raise exception 'حدد أصلًا مستقلًا أو حوّل السجل أولًا من قطعة / فصل القطع';end if;
 if c.submitted_at is not null then return to_jsonb(c);end if;
 if to_jsonb(c) is distinct from to_jsonb(jsonb_populate_record(null::public.nv_collections,p_expected)) then raise exception 'ASSET_CONFLICT: تغيرت المسودة؛ حدّثها قبل الإرسال';end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid fields';end if;
 for k in select jsonb_object_keys(p_data) loop
 if k not in('floor','room_number','room_name_id','condition_id','price','manufacturer','brand','model','capacity','serial','agency','warranty','install_date','asad_country','lat','lng','parent_child','tag','notes','school_image','asset_image','asset_image2') then raise exception 'protected field %',k;end if;
 end loop;
 v:=jsonb_populate_record(c,p_data);
 if v.type_id is null or length(btrim(coalesce(v.floor,'')))=0 or length(btrim(coalesce(v.room_number,'')))=0 or v.condition_id is null or v.price<0 then raise exception 'نوع الأصل والموقع والحالة الفنية مطلوبة والسعر لا يكون سالبًا';end if;
 foreach k in array array[v.school_image,v.asset_image,v.asset_image2] loop
 if k is null or not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=k||'.jpg') then raise exception 'ارفع صور المبنى والأصل ولوحة البيانات قبل الإرسال';end if;
 end loop;
 perform pg_advisory_xact_lock(380038);
 if public.nv_identity_norm(v.serial)<>'' and exists(select 1 from public.nv_collections where id<>p_id and public.nv_identity_norm(serial)=public.nv_identity_norm(v.serial)) then raise exception 'الرقم التسلسلي مكرر؛ راجع القطعة';end if;
 update public.nv_collections set floor=v.floor,room_number=v.room_number,room_name_id=v.room_name_id,condition_id=v.condition_id,price=v.price,manufacturer=v.manufacturer,brand=v.brand,model=v.model,capacity=v.capacity,serial=v.serial,agency=v.agency,warranty=v.warranty,install_date=v.install_date,asad_country=v.asad_country,lat=v.lat,lng=v.lng,parent_child=v.parent_child,tag=v.tag,notes=v.notes,school_image=v.school_image,asset_image=v.asset_image,asset_image2=v.asset_image2,submitted_at=now(),review_status=null,review_note='',reviewed_by=null,reviewed_at=null where id=p_id returning * into c;
 return to_jsonb(c);
end $$;
revoke all on function public.nv_piece_finish44(text,jsonb,jsonb) from public,anon;
grant execute on function public.nv_piece_finish44(text,jsonb,jsonb) to authenticated;
-- No direct client mutations of histories, baselines, identities, observations or plans.
do $$declare n text;begin
 for n in select p.oid::regprocedure::text from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.proname in('nv_inventory_access44','nv_inventory_asset44','nv_inventory_scope44','nv_inventory_actor44','nv_inventory_stamp_actor44','nv_piece_location_guard44','nv_inventory_list44','nv_inventory_plan44','nv_inventory_start44','nv_inventory_cycle44','nv_inventory_scan44','nv_inventory_close44','nv_asset_move44','nv_asset_split44','nv_piece_create44') loop
 execute 'revoke all on function '||n||' from public,anon,authenticated';
 if n ~ '(nv_inventory_(list|plan|start|cycle|scan|close)44|nv_asset_(move|split)44|nv_piece_create44)\(' then execute 'grant execute on function '||n||' to authenticated';end if;
 end loop;
end $$;
-- Restore the original identity explicitly: NV34 made "no" GENERATED ALWAYS.
create or replace function public.nv_asset_restore(p_trash uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t public.nv_asset_trash;restored text;begin
 if not public.nv_perm('delete') or not public.nv_perm('edit') then raise exception 'not permitted' using errcode='42501';end if;
 select * into t from public.nv_asset_trash where id=p_trash for update;
 if not found or t.restored_at is not null or t.expires_at<=now() then raise exception 'TRASH_EXPIRED: انتهت مهلة الاستعادة أو تمت الاستعادة بالفعل';end if;
 if exists(select 1 from public.nv_collections where id=t.asset_id) then raise exception 'الأصل موجود بالفعل؛ حدّث القائمة';end if;
 insert into public.nv_collections overriding system value select (jsonb_populate_record(null::public.nv_collections,t.snapshot||
 jsonb_build_object('updated_at',now(),'review_status',null,'review_note','','reviewed_at',null,'reviewed_by',null))).* returning id into restored;
 update public.nv_asset_trash set restored_at=now(),restored_by=auth.uid() where id=t.id;
 insert into public.nv_audit(actor,table_name,operation,row_id,new_data) values(auth.uid(),'nv_collections','RESTORE',restored,jsonb_build_object('trash_id',t.id));
 return jsonb_build_object('id',restored);
end $$;
revoke all on function public.nv_asset_restore(uuid) from public,anon;
grant execute on function public.nv_asset_restore(uuid) to authenticated;
-- Evidence referenced by a documented movement/split remains protected from storage cleanup.
create or replace function public.nv_photo_unreferenced(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select not exists(select 1 from public.nv_collections c where p_name=any(array[c.school_image||'.jpg',c.asset_image||'.jpg',c.asset_image2||'.jpg',c.label_photo||'.jpg']||array(select x||'.jpg' from unnest(c.extra_images) x)))
 and not exists(select 1 from public.nv_asset_trash t where t.restored_at is null and t.expires_at>now() and p_name=any(array[(t.snapshot->>'school_image')||'.jpg',(t.snapshot->>'asset_image')||'.jpg',(t.snapshot->>'asset_image2')||'.jpg',(t.snapshot->>'label_photo')||'.jpg']||array(select x||'.jpg' from jsonb_array_elements_text(coalesce(t.snapshot->'extra_images','[]')) x)))
 and not exists(select 1 from (select from_data snapshot from public.nv_asset_movements union all select before_data from public.nv_asset_splits) h
 where p_name=any(array[(h.snapshot->>'school_image')||'.jpg',(h.snapshot->>'asset_image')||'.jpg',(h.snapshot->>'asset_image2')||'.jpg',(h.snapshot->>'label_photo')||'.jpg']||array(select x||'.jpg' from jsonb_array_elements_text(coalesce(h.snapshot->'extra_images','[]')) x)))
$$;
create or replace function public.nv_public_settings() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('schema_version',38,'lifecycle_version',44,'data',jsonb_build_object('app_name',data->>'app_name','logo',data->'logo')) from public.nv_settings where id=1
$$;
notify pgrst,'reload schema';
commit;
