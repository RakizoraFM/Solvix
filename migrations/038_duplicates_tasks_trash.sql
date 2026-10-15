-- Apply after NV37 in each independent project.
begin;
create or replace function public.nv_identity_norm(v text) returns text language sql immutable as $$
 select lower(regexp_replace(translate(coalesce(v,''),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[[:space:]_.:/\\-]+','','g'))
$$;
create index if not exists nv_collections_serial_norm on public.nv_collections(public.nv_identity_norm(serial));
create index if not exists nv_collections_tag_norm on public.nv_collections(public.nv_identity_norm(tag));
create index if not exists nv_collections_number_check on public.nv_collections(no);
create or replace function public.nv_duplicate_check(p_rows jsonb) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.nv_member() then raise exception 'not permitted' using errcode='42501';end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>2000 then raise exception 'invalid duplicate batch';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where length(coalesce(r->>'serial',''))>256 or length(coalesce(r->>'tag',''))>256) then raise exception 'identifier too long';end if;
 select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('id',r->>'id',
 'serial_count',(select count(*) from public.nv_collections c where c.id is distinct from r->>'id' and public.nv_identity_norm(c.serial)=public.nv_identity_norm(r->>'serial') and public.nv_identity_norm(r->>'serial') not in('','na','none','unknown','غيرمتوفر','لايوجد','بدون','0')),
 'tag_count',(select count(*) from public.nv_collections c where c.id is distinct from r->>'id' and public.nv_identity_norm(c.tag)=public.nv_identity_norm(r->>'tag') and public.nv_identity_norm(r->>'tag')<>''),
 'no_count',(select count(*) from public.nv_collections c where c.id is distinct from r->>'id' and c.no::text=r->>'no'))),'[]'::jsonb),'checked_at',now())
 into result from jsonb_array_elements(p_rows) r;
 return result;
end $$;
create or replace function public.nv_identity_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare changed boolean:=tg_op='INSERT';
begin
 if tg_op='UPDATE' then changed:=new.no is distinct from old.no or public.nv_identity_norm(new.tag) is distinct from public.nv_identity_norm(old.tag);end if;
 if changed then
  perform pg_advisory_xact_lock(380038);
  if exists(select 1 from public.nv_collections c where c.id<>new.id and ((new.no is not null and c.no=new.no) or
   (public.nv_identity_norm(new.tag)<>'' and public.nv_identity_norm(c.tag)=public.nv_identity_norm(new.tag))))
  then raise exception 'DUPLICATE_ASSET_NUMBER: رقم الأصل أو الرقم الخارجي مكرر';end if;
 end if;
 return new;
end $$;
revoke all on function public.nv_identity_guard() from public,anon,authenticated;
drop trigger if exists nv_identity_guard on public.nv_collections;
create trigger nv_identity_guard before insert or update on public.nv_collections for each row execute function public.nv_identity_guard();

create table if not exists public.nv_asset_trash(
 id uuid primary key default gen_random_uuid(),asset_id text not null,snapshot jsonb not null,
 deleted_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 days',
 deleted_by uuid,deleted_by_label text,reason text not null,restored_at timestamptz,restored_by uuid);
create index if not exists nv_asset_trash_expiry on public.nv_asset_trash(expires_at) where restored_at is null;
alter table public.nv_asset_trash enable row level security;
revoke all on public.nv_asset_trash from public,anon,authenticated;
create or replace function public.nv_trash_capture() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare why text:=nullif(btrim(current_setting('solvix.delete_reason',true)),'');actor_name text;
begin
 if old.type_id is not null and old.submitted_at is not null and why is null and auth.uid() is not null
 then raise exception 'DELETE_REASON_REQUIRED: اكتب سبب حذف الأصل';end if;
 select coalesce(s.name,e.name,u.email) into actor_name from auth.users u left join public.nv_staff s on s.user_id=u.id left join public.nv_employees e on e.user_id=u.id where u.id=auth.uid();
 insert into public.nv_asset_trash(asset_id,snapshot,deleted_by,deleted_by_label,reason)
 values(old.id,to_jsonb(old),auth.uid(),coalesce(actor_name,'خدمة النظام'),coalesce(why,'إزالة مسودة غير مرسلة / إجراء صيانة بالخادم'));
 return old;
end $$;
revoke all on function public.nv_trash_capture() from public,anon,authenticated;
drop trigger if exists nv_trash_capture on public.nv_collections;
create trigger nv_trash_capture before delete on public.nv_collections for each row execute function public.nv_trash_capture();
create or replace function public.nv_asset_delete(p_id text,p_expected jsonb,p_reason text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare result jsonb;begin
 if not public.nv_perm('delete') then raise exception 'not permitted' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'DELETE_REASON_REQUIRED: اكتب سبب الحذف من 3 إلى 1000 حرف';end if;
 perform set_config('solvix.delete_reason',btrim(p_reason),true);
 result:=public.nv_sync_mutate('nv_collections',p_id,p_expected,'{}',true);
 perform set_config('solvix.delete_reason','',true);
 return result;
end $$;
create or replace function public.nv_trash_page(p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;begin
 if not public.nv_perm('delete') then raise exception 'not permitted' using errcode='42501';end if;
 if p_offset<0 or p_offset is null then raise exception 'invalid offset';end if;
 select jsonb_build_object('total',(select count(*) from public.nv_asset_trash where restored_at is null and expires_at>now()),
 'items',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,asset_id,deleted_at,expires_at,deleted_by_label,reason,
 snapshot->>'no' as no,snapshot->>'serial' as serial,snapshot->>'tag' as tag
 from public.nv_asset_trash where restored_at is null and expires_at>now() order by deleted_at desc,id offset p_offset limit 50) x),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.nv_asset_restore(p_trash uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t public.nv_asset_trash; restored text;begin
 if not public.nv_perm('delete') or not public.nv_perm('edit') then raise exception 'not permitted' using errcode='42501';end if;
 select * into t from public.nv_asset_trash where id=p_trash for update;
 if not found or t.restored_at is not null or t.expires_at<=now() then raise exception 'TRASH_EXPIRED: انتهت مهلة الاستعادة أو تمت الاستعادة بالفعل';end if;
 if exists(select 1 from public.nv_collections where id=t.asset_id) then raise exception 'الأصل موجود بالفعل؛ حدّث القائمة';end if;
 -- Foreign keys, subscription limits and identity checks still run. Old approvals never silently return.
 insert into public.nv_collections select (jsonb_populate_record(null::public.nv_collections,t.snapshot||
 jsonb_build_object('updated_at',now(),'review_status',null,'review_note','','reviewed_at',null,'reviewed_by',null))).* returning id into restored;
 update public.nv_asset_trash set restored_at=now(),restored_by=auth.uid() where id=t.id;
 insert into public.nv_audit(actor,table_name,operation,row_id,new_data) values(auth.uid(),'nv_collections','RESTORE',restored,jsonb_build_object('trash_id',t.id));
 return jsonb_build_object('id',restored);
end $$;
-- Preserve referenced photos throughout the restoration window, including cached clients.
create or replace function public.nv_photo_unreferenced(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select not exists(select 1 from public.nv_collections c where p_name=any(array[c.school_image||'.jpg',c.asset_image||'.jpg',c.asset_image2||'.jpg',c.label_photo||'.jpg']||array(select x||'.jpg' from unnest(c.extra_images) x)))
 and not exists(select 1 from public.nv_asset_trash t where t.restored_at is null and t.expires_at>now() and
 p_name=any(array[(t.snapshot->>'school_image')||'.jpg',(t.snapshot->>'asset_image')||'.jpg',(t.snapshot->>'asset_image2')||'.jpg',(t.snapshot->>'label_photo')||'.jpg']||array(select x||'.jpg' from jsonb_array_elements_text(coalesce(t.snapshot->'extra_images','[]'::jsonb)) x)))
$$;
create or replace function public.nv_my_tasks(p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;begin
 if not public.nv_member() then raise exception 'not permitted' using errcode='42501';end if;
 if p_offset<0 or p_offset is null then raise exception 'invalid offset';end if;
 with tasks as (
 select 'approval:'||c.id as id,'approval'::text as kind,c.id as asset_id,c.no,c.serial,c.school_id,r.updated_at as at,
 coalesce(p.stages->r.stage_index->>'name','') as note
 from public.nv_approval_runs r join public.nv_approval_paths p on p.id=r.path_id join public.nv_collections c on c.id=r.asset_id
 where r.status='pending' and public.nv_approval_stage_allowed(p.stages->r.stage_index)
 union all
 select 'returned:'||c.id,'returned',c.id,c.no,c.serial,c.school_id,r.updated_at,r.last_note
 from public.nv_approval_runs r join public.nv_approval_paths p on p.id=r.path_id join public.nv_collections c on c.id=r.asset_id
 where r.status='returned' and (c.employee_id=public.nv_my_emp() or public.nv_approval_stage_allowed(p.stages->r.stage_index))
 union all
 select 'photo:'||c.id,'photo',c.id,c.no,c.serial,c.school_id,coalesce(c.reviewed_at,c.updated_at,c.created_at),c.review_note
 from public.nv_collections c where c.review_status='returned' and (c.employee_id=public.nv_my_emp() or public.nv_perm('review'))
 ), page as (select * from tasks order by at desc nulls last,id offset p_offset limit 50)
 select jsonb_build_object('total',(select count(*) from tasks),'approval',(select count(*) from tasks where kind='approval'),
 'returned',(select count(*) from tasks where kind in('returned','photo')),
 'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.at desc nulls last,x.id) from page x),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.nv_duplicate_check(jsonb),public.nv_asset_delete(text,jsonb,text),public.nv_trash_page(int),public.nv_asset_restore(uuid),public.nv_my_tasks(int) from public,anon;
grant execute on function public.nv_duplicate_check(jsonb),public.nv_asset_delete(text,jsonb,text),public.nv_trash_page(int),public.nv_asset_restore(uuid),public.nv_my_tasks(int) to authenticated;
create or replace function public.nv_public_settings() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('schema_version',38,'data',jsonb_build_object('app_name',data->>'app_name','logo',data->'logo')) from public.nv_settings where id=1
$$;
notify pgrst,'reload schema';
commit;
