-- NV48b: the nameplate / serial-number photo (asset_image2) is optional.
-- It is still stored and shown, but no longer counts as missing data in «جودة البيانات»
-- and is not required by an approval path that requires photos (only the whole-asset photo is).
begin;
create or replace function public.nv_approval_act(p_asset text,p_revision bigint,p_action text,p_note text default '',p_request uuid default gen_random_uuid())
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.nv_collections; r public.nv_approval_runs; p public.nv_approval_paths; who text; final_stage boolean;
begin
 if not public.nv_perm('review') then raise exception 'review permission required' using errcode='42501';end if;
 select * into c from public.nv_collections where id=p_asset for update;
 if c.id is null then raise exception 'asset not found';end if;
 select * into r from public.nv_approval_runs where asset_id=p_asset for update;
 if r.asset_id is null then raise exception 'inventory has not been submitted';end if;
 if exists(select 1 from public.nv_approval_events where request_id=p_request and asset_id=p_asset and actor=auth.uid()) then return to_jsonb(r);end if;
 if r.revision is distinct from p_revision then raise exception 'APPROVAL_CONFLICT: reload the latest approval state';end if;
 select * into p from public.nv_approval_paths where id=r.path_id;
 if r.status<>'pending' then raise exception 'inventory is not waiting for approval';end if;
 if not coalesce(public.nv_approval_stage_allowed(p.stages->r.stage_index),false) then raise exception 'this stage is assigned to another approver' using errcode='42501';end if;
 if p_action not in('approve','return') or p_action is null then raise exception 'invalid approval action';end if;
 if length(coalesce(p_note,''))>2000 or (p_action='return' and length(trim(coalesce(p_note,'')))=0) then raise exception 'return reason is required (maximum 2000 characters)';end if;
 final_stage:=r.stage_index+1>=jsonb_array_length(p.stages);
 if p_action='approve' and final_stage then
  if coalesce((p.requirements->>'photos')::boolean,false) and (not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=c.asset_image||'.jpg')) then raise exception 'required asset photos are missing';end if;
  if coalesce((p.requirements->>'serial')::boolean,false) and lower(trim(coalesce(c.serial,''))) in('','n/a','na','none','unknown','غير متوفر','لا يوجد','بدون') then raise exception 'serial number required';end if;
  if coalesce((p.requirements->>'review')::boolean,false) and c.review_status is distinct from 'ok' then raise exception 'photo review must be completed';end if;
 end if;
 who:=coalesce((select email from public.nv_staff where user_id=auth.uid()),'admin');
 insert into public.nv_approval_events(asset_id,actor,actor_label,action,path_id,stage_index,note,revision,request_id)
 values(p_asset,auth.uid(),who,p_action,r.path_id,r.stage_index,trim(coalesce(p_note,'')),r.revision+1,p_request);
 update public.nv_approval_runs set
  status=case when p_action='return' then 'returned' when final_stage then 'approved' else 'pending' end,
  stage_index=case when p_action='approve' and not final_stage then stage_index+1 else stage_index end,
  last_note=trim(coalesce(p_note,'')),revision=revision+1,updated_at=now() where asset_id=p_asset returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.nv_approval_act(text,bigint,text,text,uuid) from public,anon;
grant execute on function public.nv_approval_act(text,bigint,text,text,uuid) to authenticated;
create or replace function public.nv_quality_page(p_school text default null,p_employee text default null,p_issue text default 'all',p_query text default '',p_offset int default 0,p_limit int default 50)
returns jsonb language sql stable security definer set search_path=public as $$
 with visible as (
  select c.*,s.name as building_name,e.name as employee_name,t.ar as type_name,r.status as approval_status
  from public.nv_collections c left join public.nv_schools s on s.id=c.school_id
  left join public.nv_employees e on e.id=c.employee_id left join public.nv_types t on t.id=c.type_id
  left join public.nv_approval_runs r on r.asset_id=c.id
  where c.submitted_at is not null and c.type_id is not null and (public.nv_can_read() or c.employee_id=public.nv_my_emp())
   and (p_school is null or c.school_id=p_school) and (p_employee is null or c.employee_id=p_employee)
   and (coalesce(p_query,'')='' or strpos(lower(concat_ws(' ',c.no::text,c.serial,c.brand,c.model,s.name,t.ar)),lower(p_query))>0)
 ), flags as (
  select v.*,not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=v.asset_image||'.jpg') as missing_photo,
   not exists(select 1 from storage.objects where bucket_id='nv-photos' and name=v.asset_image2||'.jpg') as missing_nameplate,
   lower(trim(coalesce(v.serial,''))) in('','n/a','na','none','unknown','غير متوفر','لا يوجد','بدون') as missing_serial,
   v.review_status is distinct from 'ok' as missing_review from visible v
 ), chosen as (
  select * from flags where case p_issue
   when 'photos' then missing_photo when 'serial' then missing_serial when 'review' then missing_review
   when 'approval' then approval_status is distinct from 'approved' when 'returned' then review_status='returned' or approval_status='returned'
   when 'complete' then not(missing_photo or missing_serial or missing_review)
   when 'all_assets' then true else missing_photo or missing_serial or missing_review end
 ), paged as (select * from chosen order by no,id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),200))
 select jsonb_build_object('checked_at',now(),'source','server','scope_total',(select count(*) from flags),
  'with_issues',(select count(*) from flags where missing_photo or missing_serial or missing_review),
  'photos',(select count(*) from flags where missing_photo),'serial',(select count(*) from flags where missing_serial),
  'review',(select count(*) from flags where missing_review),'approval',(select count(*) from flags where approval_status is distinct from 'approved'),
  'filtered_total',(select count(*) from chosen),'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.no,p.id) from paged p),'[]'))
$$;
revoke all on function public.nv_quality_page(text,text,text,text,int,int) from public,anon;
grant execute on function public.nv_quality_page(text,text,text,text,int,int) to authenticated;
commit;
