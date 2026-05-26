-- handle_new_user 트리거의 기본 role 을 'editor' → 'viewer' 로.
--
-- 배경: 0005 에서 default 를 editor 로 두면 신규 가입자가 즉시 본문 편집 권한을
-- 갖는다. 테스트 단계엔 편했지만 운영에선 위험 (가입만 하면 매뉴얼 수정 가능).
-- viewer 로 디폴트를 낮추고, admin 이 /admin/users 콘솔에서 명시적으로 승격하는
-- 흐름이 안전.
--
-- 기존 사용자(이미 editor) 는 그대로 둔다. 정리하려면 별도 SQL.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  initial_char text;
  random_hue   numeric;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    '신규 사용자'
  );
  initial_char := upper(substring(display_name from 1 for 1));
  random_hue   := floor(random() * 360);

  insert into public.profiles (auth_user_id, name, initials, color, role)
  values (
    new.id,
    display_name,
    initial_char,
    'oklch(0.55 0.14 ' || random_hue::text || ')',
    'viewer'  -- 신규 가입은 읽기만. admin 이 콘솔에서 명시 승격
  )
  on conflict (auth_user_id) do nothing;

  return new;
end $$;

-- 트리거 자체는 0005/0009 에서 이미 만들어 둔 것을 재사용 (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

notify pgrst, 'reload schema';
