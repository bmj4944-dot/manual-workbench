-- service_role 에 public 스키마 권한을 명시적으로 부여한다.
--
-- 배경: 이 프로젝트는 "Automatically expose new tables = OFF" 로 만들어졌다
-- (0009 주석 참고). 그 결과 service_role 도 anon/authenticated 와 마찬가지로
-- 새로 만든 테이블에 대한 GRANT 가 자동 부여되지 않았다.
--
-- service_role 은 RLS 를 BYPASS 하지만 테이블 GRANT 는 별개로 필요하다.
-- admin client (createAdminClient) 를 사용하는 모든 코드 — /admin/users 의
-- fetchAllUsers, 향후 admin 콘솔 전체 — 가 이 권한에 의존한다.
--
-- 첫 증상: /admin/users 진입 시 "permission denied for table profiles"
-- (PostgreSQL error code 42501).

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- 미래 생성될 테이블 / 시퀀스 / 함수에도 같은 디폴트 부여
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;

notify pgrst, 'reload schema';
