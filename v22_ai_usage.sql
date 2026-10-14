-- =====================================================================
-- FriendTrip Go 2.2.0 · AI Travel Assistant · ตัวนับการใช้งานต่อวัน (ไม่บังคับ · เพิ่มอย่างเดียว · รันซ้ำได้)
--   ใช้จำกัดจำนวนครั้งต่อผู้ใช้ต่อวัน และโควตารวมทั้งระบบต่อวัน เพื่อไม่ให้เกินแพ็กเกจฟรีของผู้ให้บริการ AI
--   ถ้าไม่รันไฟล์นี้: ผู้ช่วย AI ยังใช้งานได้ แต่จะใช้ตัวนับในหน่วยความจำของ Edge Function แทน (แม่นยำน้อยกว่า)
--   ไม่แก้/ไม่ลบ/ไม่เปลี่ยนชื่อตารางหรือข้อมูลเดิมใดๆ · ไม่เก็บข้อความแชต
-- =====================================================================
create table if not exists public.ai_usage_daily (
  day      date not null,
  user_id  uuid not null references auth.users(id) on delete cascade,
  requests integer not null default 0 check (requests >= 0),
  primary key (day, user_id)
);
alter table public.ai_usage_daily enable row level security;
drop policy if exists ai_usage_select_own on public.ai_usage_daily;
create policy ai_usage_select_own on public.ai_usage_daily for select to authenticated using (user_id = auth.uid());
-- ไม่มี policy insert/update/delete: ผู้ใช้เขียนตรงๆ ไม่ได้ เขียนผ่านฟังก์ชันด้านล่างเท่านั้น

create or replace function public.te_ai_usage_hit(p_user_limit integer, p_global_limit integer default 0)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Bangkok')::date;
  v_uid uuid := auth.uid();
  v_user integer;
  v_global bigint;
begin
  if v_uid is null then return 'unauthenticated'; end if;
  if p_user_limit is null or p_user_limit < 1 or p_user_limit > 1000 then p_user_limit := 10; end if;
  insert into public.ai_usage_daily(day, user_id, requests) values (v_day, v_uid, 0) on conflict (day, user_id) do nothing;
  select requests into v_user from public.ai_usage_daily where day = v_day and user_id = v_uid for update;
  if v_user >= p_user_limit then return 'user'; end if;
  if coalesce(p_global_limit, 0) > 0 then
    select coalesce(sum(requests), 0) into v_global from public.ai_usage_daily where day = v_day;
    if v_global >= p_global_limit then return 'global'; end if;
  end if;
  update public.ai_usage_daily set requests = requests + 1 where day = v_day and user_id = v_uid;
  return 'ok';
end $$;
revoke all on function public.te_ai_usage_hit(integer, integer) from public;
grant execute on function public.te_ai_usage_hit(integer, integer) to authenticated;

select 'ตาราง ai_usage_daily (ควรเป็น 1)' as check_name, count(*)::text as result
from information_schema.tables where table_schema = 'public' and table_name = 'ai_usage_daily';
