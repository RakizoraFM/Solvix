-- NV54: the system Admin always sees «دليل المنصة» and «الإصدارات والفحص»; other accounts keep their own grant (NV45).
create or replace function public.nv_document_access45() returns jsonb
language sql stable security definer set search_path=public as $$
 select case when public.nv_is_sys() then jsonb_build_object('guide',true,'releases',true)
  else jsonb_build_object('guide',coalesce(a.guide,false),'releases',coalesce(a.releases,false)) end
 from (select 1) x left join public.nv_document_access45 a
 on a.user_id=auth.uid() and public.nv_member()
$$;
revoke all on function public.nv_document_access45() from public,anon;
grant execute on function public.nv_document_access45() to authenticated;
