-- 0008 에서 추가했던 진단용 RPC `debug_auth_info()` 제거. /api/diag 라우트가
-- E-2 에서 함께 제거됐고, 더 이상 호출하는 곳이 없다. 운영에는 불필요한
-- attack surface 이므로 정리한다.

revoke execute on function public.debug_auth_info() from authenticated, anon;
drop function if exists public.debug_auth_info();

notify pgrst, 'reload schema';
