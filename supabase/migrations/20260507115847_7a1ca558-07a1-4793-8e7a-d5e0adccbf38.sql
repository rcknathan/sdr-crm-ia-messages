
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_funnel_stages() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_workspace_owner() FROM anon, authenticated;
