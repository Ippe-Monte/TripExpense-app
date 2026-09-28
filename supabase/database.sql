-- TripExpense V7 — Supabase schema
-- Run this entire script in a NEW Supabase project, or use migration.sql for an existing V6 project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict(id) do update set full_name = excluded.full_name;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_no text not null unique,
  group_id uuid not null references public.groups(id) on delete cascade,
  parent_trip_id uuid references public.trips(id) on delete set null,
  name text not null,
  start_date date,
  end_date date,
  destination text,
  note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_no_counters (
  year int primary key,
  next_no bigint not null default 1
);

create or replace function public.next_trip_no()
returns text language plpgsql security definer set search_path=public as $$
declare y int := extract(year from current_date)::int; n bigint;
begin
  insert into public.trip_no_counters(year,next_no) values(y,2)
  on conflict(year) do update set next_no=public.trip_no_counters.next_no+1
  returning next_no-1 into n;
  return 'TRIP-'||y||'-'||lpad(n::text,4,'0');
end; $$;

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('owner','editor','member')),
  joined_at timestamptz not null default now(),
  primary key(trip_id,user_id)
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  schedule_date date not null,
  schedule_time time,
  activity text not null default '',
  from_place text,
  to_place text,
  detail text,
  hotel_name text,
  hotel_price numeric(12,2) not null default 0 check(hotel_price >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null,
  expense_date date not null,
  expense_time time,
  category text not null default 'other' check(category in ('food','hotel','transport','car','activity','other')),
  detail text not null,
  amount numeric(12,2) not null check(amount >= 0),
  payer_id uuid not null references auth.users(id) on delete restrict,
  receipt_path text,
  receipt_name text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_trip_members_user on public.trip_members(user_id);
create index if not exists idx_trips_group on public.trips(group_id);
create index if not exists idx_schedule_trip_date on public.schedules(trip_id,schedule_date);
create index if not exists idx_expenses_trip_date on public.expenses(trip_id,expense_date);

create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.group_members where group_id=gid and user_id=auth.uid()); $$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.group_members where group_id=gid and user_id=auth.uid() and role in('owner','admin')); $$;

create or replace function public.is_trip_member(tid uuid)
returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.trip_members where trip_id=tid and user_id=auth.uid()); $$;

create or replace function public.is_trip_editor(tid uuid)
returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.trip_members where trip_id=tid and user_id=auth.uid() and role in('owner','editor')); $$;

create or replace function public.create_group(p_name text)
returns public.groups
language plpgsql security definer set search_path=public as $$
declare g public.groups; c text; tries int := 0;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'GROUP_NAME_REQUIRED'; end if;
  loop
    tries := tries + 1;
    c := upper(substr(encode(gen_random_bytes(5),'hex'),1,8));
    begin
      insert into public.groups(name,code,owner_id) values(trim(p_name),c,auth.uid()) returning * into g;
      exit;
    exception when unique_violation then
      if tries > 10 then raise exception 'GROUP_CODE_GENERATION_FAILED'; end if;
    end;
  end loop;
  insert into public.group_members(group_id,user_id,role) values(g.id,auth.uid(),'owner');
  return g;
end; $$;

grant execute on function public.create_group(text) to authenticated;


create or replace function public.join_group_by_code(p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select id into gid from public.groups where upper(code)=upper(trim(p_code)) limit 1;
  if gid is null then raise exception 'GROUP_NOT_FOUND'; end if;
  insert into public.group_members(group_id,user_id,role) values(gid,auth.uid(),'member') on conflict do nothing;
  return gid;
end; $$;
grant execute on function public.join_group_by_code(text) to authenticated;

create or replace function public.create_trip(
  p_group_id uuid, p_name text, p_parent_trip_id uuid default null,
  p_start_date date default null, p_end_date date default null,
  p_destination text default null, p_note text default null
)
returns public.trips language plpgsql security definer set search_path=public as $$
declare t public.trips;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'NOT_GROUP_MEMBER'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'TRIP_NAME_REQUIRED'; end if;
  if p_parent_trip_id is not null and not exists(select 1 from public.trips where id=p_parent_trip_id and group_id=p_group_id) then
    raise exception 'PARENT_TRIP_INVALID';
  end if;
  insert into public.trips(trip_no,group_id,parent_trip_id,name,start_date,end_date,destination,note,created_by)
  values(public.next_trip_no(),p_group_id,p_parent_trip_id,trim(p_name),p_start_date,p_end_date,nullif(trim(coalesce(p_destination,'')),''),p_note,auth.uid())
  returning * into t;
  insert into public.trip_members(trip_id,user_id,role) values(t.id,auth.uid(),'owner');
  return t;
end; $$;
grant execute on function public.create_trip(uuid,text,uuid,date,date,text,text) to authenticated;

create or replace function public.add_trip_member(p_trip_id uuid,p_user_id uuid,p_role text default 'member')
returns void language plpgsql security definer set search_path=public as $$
declare gid uuid;
begin
  if not public.is_trip_editor(p_trip_id) then raise exception 'NOT_TRIP_EDITOR'; end if;
  select group_id into gid from public.trips where id=p_trip_id;
  if gid is null or not exists(select 1 from public.group_members where group_id=gid and user_id=p_user_id) then raise exception 'USER_NOT_IN_GROUP'; end if;
  if p_role not in('member','editor') then raise exception 'INVALID_ROLE'; end if;
  insert into public.trip_members(trip_id,user_id,role) values(p_trip_id,p_user_id,p_role)
  on conflict(trip_id,user_id) do update set role=excluded.role;
end; $$;
grant execute on function public.add_trip_member(uuid,uuid,text) to authenticated;

create or replace function public.remove_trip_member(p_trip_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_trip_editor(p_trip_id) then raise exception 'NOT_TRIP_EDITOR'; end if;
  delete from public.trip_members where trip_id=p_trip_id and user_id=p_user_id and role<>'owner';
end; $$;
grant execute on function public.remove_trip_member(uuid,uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.schedules enable row level security;
alter table public.expenses enable row level security;

-- Policies. RPCs above handle the initial owner inserts atomically.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using(
  id=auth.uid() or exists(select 1 from public.group_members gm1 join public.group_members gm2 on gm1.group_id=gm2.group_id where gm1.user_id=auth.uid() and gm2.user_id=profiles.id)
);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated using(public.is_group_member(id));
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated using(public.is_group_admin(id)) with check(public.is_group_admin(id));
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete to authenticated using(public.is_group_admin(id));

drop policy if exists gm_select on public.group_members;
create policy gm_select on public.group_members for select to authenticated using(public.is_group_member(group_id));
drop policy if exists gm_delete on public.group_members;
create policy gm_delete on public.group_members for delete to authenticated using(public.is_group_admin(group_id) or user_id=auth.uid());

drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips for select to authenticated using(public.is_group_member(group_id));
drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips for update to authenticated using(public.is_trip_editor(id)) with check(public.is_trip_editor(id));
drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips for delete to authenticated using(public.is_trip_editor(id));

drop policy if exists tm_select on public.trip_members;
create policy tm_select on public.trip_members for select to authenticated using(public.is_trip_member(trip_id));
drop policy if exists tm_delete on public.trip_members;
create policy tm_delete on public.trip_members for delete to authenticated using(public.is_trip_editor(trip_id) and role<>'owner');

drop policy if exists sch_select on public.schedules;
create policy sch_select on public.schedules for select to authenticated using(public.is_trip_member(trip_id));
drop policy if exists sch_insert on public.schedules;
create policy sch_insert on public.schedules for insert to authenticated with check(public.is_trip_editor(trip_id) and created_by=auth.uid());
drop policy if exists sch_update on public.schedules;
create policy sch_update on public.schedules for update to authenticated using(public.is_trip_editor(trip_id));
drop policy if exists sch_delete on public.schedules;
create policy sch_delete on public.schedules for delete to authenticated using(public.is_trip_editor(trip_id));

drop policy if exists exp_select on public.expenses;
create policy exp_select on public.expenses for select to authenticated using(public.is_trip_member(trip_id));
drop policy if exists exp_insert on public.expenses;
create policy exp_insert on public.expenses for insert to authenticated with check(public.is_trip_editor(trip_id) and created_by=auth.uid());
drop policy if exists exp_update on public.expenses;
create policy exp_update on public.expenses for update to authenticated using(public.is_trip_editor(trip_id));
drop policy if exists exp_delete on public.expenses;
create policy exp_delete on public.expenses for delete to authenticated using(public.is_trip_editor(trip_id));

-- Private receipt bucket. File path format: <trip_id>/<user_id>/<timestamp>-filename
insert into storage.buckets(id,name,public) values('receipts','receipts',false) on conflict(id) do update set public=false;

drop policy if exists receipts_select on storage.objects;
create policy receipts_select on storage.objects for select to authenticated using(
  bucket_id='receipts' and public.is_trip_member(split_part(name,'/',1)::uuid)
);
drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects for insert to authenticated with check(
  bucket_id='receipts' and public.is_trip_editor(split_part(name,'/',1)::uuid) and split_part(name,'/',2)=auth.uid()::text
);
drop policy if exists receipts_update on storage.objects;
create policy receipts_update on storage.objects for update to authenticated using(
  bucket_id='receipts' and public.is_trip_editor(split_part(name,'/',1)::uuid) and split_part(name,'/',2)=auth.uid()::text
);
drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for delete to authenticated using(
  bucket_id='receipts' and public.is_trip_editor(split_part(name,'/',1)::uuid)
);

-- Helpful grants
revoke all on function public.next_trip_no() from public;

-- V8: expense participants / shared expenses
create table if not exists public.expense_participants (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  share_amount numeric(12,2) not null check(share_amount >= 0),
  created_at timestamptz not null default now(),
  primary key(expense_id,user_id)
);
create index if not exists idx_expense_participants_user on public.expense_participants(user_id);
create index if not exists idx_expense_participants_expense on public.expense_participants(expense_id);
alter table public.expense_participants enable row level security;
drop policy if exists ep_select on public.expense_participants;
create policy ep_select on public.expense_participants for select to authenticated using(public.is_trip_member((select trip_id from public.expenses where id=expense_id)));
drop policy if exists ep_insert on public.expense_participants;
create policy ep_insert on public.expense_participants for insert to authenticated with check(public.is_trip_editor((select trip_id from public.expenses where id=expense_id)));
drop policy if exists ep_update on public.expense_participants;
create policy ep_update on public.expense_participants for update to authenticated using(public.is_trip_editor((select trip_id from public.expenses where id=expense_id)));
drop policy if exists ep_delete on public.expense_participants;
create policy ep_delete on public.expense_participants for delete to authenticated using(public.is_trip_editor((select trip_id from public.expenses where id=expense_id)));
-- TripExpense V9 migration: Settlement Calculation
-- Run this after migration_v8.sql on an existing V8 database.
-- The frontend calculates settlements from expenses + expense_participants.
-- This migration adds a reusable database RPC for future clients/reports.

create or replace function public.calculate_trip_settlement(p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  member_count int;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_trip_member(p_trip_id) then raise exception 'NOT_TRIP_MEMBER'; end if;

  select count(*) into member_count from public.trip_members where trip_id=p_trip_id;

  with members as (
    select tm.user_id, coalesce(p.full_name, left(tm.user_id::text,8)) as name
    from public.trip_members tm
    left join public.profiles p on p.id=tm.user_id
    where tm.trip_id=p_trip_id
  ),
  paid as (
    select e.payer_id as user_id, coalesce(sum(e.amount),0)::numeric as paid
    from public.expenses e where e.trip_id=p_trip_id group by e.payer_id
  ),
  owed_explicit as (
    select ep.user_id, coalesce(sum(ep.share_amount),0)::numeric as owed
    from public.expense_participants ep
    join public.expenses e on e.id=ep.expense_id
    where e.trip_id=p_trip_id group by ep.user_id
  ),
  owed_fallback as (
    select m.user_id, coalesce(sum(e.amount)/nullif(member_count,0),0)::numeric as owed
    from members m cross join public.expenses e
    where e.trip_id=p_trip_id
      and not exists(select 1 from public.expense_participants ep where ep.expense_id=e.id)
    group by m.user_id
  ),
  balances as (
    select m.user_id,m.name,
           coalesce(p.paid,0)::numeric as paid,
           (coalesce(oe.owed,0)+coalesce(ofb.owed,0))::numeric as owed,
           (coalesce(p.paid,0)-coalesce(oe.owed,0)-coalesce(ofb.owed,0))::numeric as net
    from members m
    left join paid p on p.user_id=m.user_id
    left join owed_explicit oe on oe.user_id=m.user_id
    left join owed_fallback ofb on ofb.user_id=m.user_id
  )
  select jsonb_build_object(
    'trip_id',p_trip_id,
    'total',coalesce((select sum(amount) from public.expenses where trip_id=p_trip_id),0),
    'balances',coalesce((select jsonb_agg(to_jsonb(b) order by b.name) from balances b),'[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.calculate_trip_settlement(uuid) to authenticated;

-- =========================================================
-- V10 Budget & Financial Control
-- =========================================================
create table if not exists public.trip_budgets (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  budget_amount numeric(12,2) not null check (budget_amount > 0),
  alert_percent numeric(5,2) not null default 80 check (alert_percent > 0 and alert_percent <= 100),
  note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_trip_budgets_created_by on public.trip_budgets(created_by);
alter table public.trip_budgets enable row level security;
drop policy if exists tb_select on public.trip_budgets;
create policy tb_select on public.trip_budgets for select to authenticated using(public.is_trip_member(trip_id));
drop policy if exists tb_insert on public.trip_budgets;
create policy tb_insert on public.trip_budgets for insert to authenticated with check(public.is_trip_editor(trip_id) and created_by=auth.uid());
drop policy if exists tb_update on public.trip_budgets;
create policy tb_update on public.trip_budgets for update to authenticated using(public.is_trip_editor(trip_id)) with check(public.is_trip_editor(trip_id));
drop policy if exists tb_delete on public.trip_budgets;
create policy tb_delete on public.trip_budgets for delete to authenticated using(public.is_trip_editor(trip_id));

create or replace function public.get_trip_budget_status(p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  b public.trip_budgets;
  t public.trips;
  spent numeric := 0;
  days_total int := 0;
  days_elapsed int := 0;
  forecast numeric := 0;
  now_date date := current_date;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_trip_member(p_trip_id) then raise exception 'NOT_TRIP_MEMBER'; end if;
  select * into t from public.trips where id=p_trip_id;
  select * into b from public.trip_budgets where trip_id=p_trip_id;
  select coalesce(sum(amount),0) into spent from public.expenses where trip_id=p_trip_id;
  if t.start_date is not null and t.end_date is not null then
    days_total := greatest(1,(t.end_date-t.start_date)+1);
    days_elapsed := greatest(1,least(days_total,(greatest(now_date,t.start_date)-t.start_date)+1));
    forecast := case when days_elapsed > 0 then spent/days_elapsed*days_total else spent end;
  else
    forecast := spent;
  end if;
  return jsonb_build_object(
    'trip_id',p_trip_id,
    'budget',coalesce(b.budget_amount,0),
    'spent',spent,
    'remaining',coalesce(b.budget_amount,0)-spent,
    'percent',case when coalesce(b.budget_amount,0)>0 then round((spent/b.budget_amount)*100,2) else 0 end,
    'alert_percent',coalesce(b.alert_percent,80),
    'days_total',days_total,
    'days_elapsed',days_elapsed,
    'forecast',round(forecast,2),
    'status',case when b.trip_id is null then 'notset' when spent>=b.budget_amount then 'over' when spent>=b.budget_amount*(b.alert_percent/100) then 'alert' else 'ok' end
  );
end;
$$;
grant execute on function public.get_trip_budget_status(uuid) to authenticated;
