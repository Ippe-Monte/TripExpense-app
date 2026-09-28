-- TripExpense V6 -> V7 migration
-- BACK UP YOUR DATABASE FIRST.
-- This migration adds the V7 RPCs/policies and the per-year trip number counter.
-- Existing data is preserved. Existing old receipt paths are not automatically moved.

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

create or replace function public.create_group(p_name text)
returns public.groups language plpgsql security definer set search_path=public as $$
declare g public.groups; c text; tries int:=0;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'GROUP_NAME_REQUIRED'; end if;
  loop
    tries:=tries+1; c:=upper(substr(encode(gen_random_bytes(5),'hex'),1,8));
    begin
      insert into public.groups(name,code,owner_id) values(trim(p_name),c,auth.uid()) returning * into g; exit;
    exception when unique_violation then if tries>10 then raise exception 'GROUP_CODE_GENERATION_FAILED'; end if; end;
  end loop;
  insert into public.group_members(group_id,user_id,role) values(g.id,auth.uid(),'owner') on conflict do nothing;
  return g;
end; $$;
grant execute on function public.create_group(text) to authenticated;

create or replace function public.create_trip(p_group_id uuid,p_name text,p_parent_trip_id uuid default null,p_start_date date default null,p_end_date date default null,p_destination text default null,p_note text default null)
returns public.trips language plpgsql security definer set search_path=public as $$
declare t public.trips;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'NOT_GROUP_MEMBER'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'TRIP_NAME_REQUIRED'; end if;
  if p_parent_trip_id is not null and not exists(select 1 from public.trips where id=p_parent_trip_id and group_id=p_group_id) then raise exception 'PARENT_TRIP_INVALID'; end if;
  insert into public.trips(trip_no,group_id,parent_trip_id,name,start_date,end_date,destination,note,created_by)
  values(public.next_trip_no(),p_group_id,p_parent_trip_id,trim(p_name),p_start_date,p_end_date,nullif(trim(coalesce(p_destination,'')),''),p_note,auth.uid()) returning * into t;
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
  insert into public.trip_members(trip_id,user_id,role) values(p_trip_id,p_user_id,p_role) on conflict(trip_id,user_id) do update set role=excluded.role;
end; $$;
grant execute on function public.add_trip_member(uuid,uuid,text) to authenticated;

create or replace function public.remove_trip_member(p_trip_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_trip_editor(p_trip_id) then raise exception 'NOT_TRIP_EDITOR'; end if;
  delete from public.trip_members where trip_id=p_trip_id and user_id=p_user_id and role<>'owner';
end; $$;
grant execute on function public.remove_trip_member(uuid,uuid) to authenticated;

-- Initial-owner insert policies are no longer needed because create_group/create_trip are security-definer RPCs.
drop policy if exists groups_insert on public.groups;
drop policy if exists gm_insert on public.group_members;
drop policy if exists trips_insert on public.trips;
drop policy if exists tm_insert on public.trip_members;

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips for update to authenticated using(public.is_trip_editor(id)) with check(public.is_trip_editor(id));
drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips for delete to authenticated using(public.is_trip_editor(id));

drop policy if exists sch_update on public.schedules;
create policy sch_update on public.schedules for update to authenticated using(public.is_trip_editor(trip_id));
drop policy if exists sch_delete on public.schedules;
create policy sch_delete on public.schedules for delete to authenticated using(public.is_trip_editor(trip_id));

drop policy if exists exp_update on public.expenses;
create policy exp_update on public.expenses for update to authenticated using(public.is_trip_editor(trip_id));
drop policy if exists exp_delete on public.expenses;
create policy exp_delete on public.expenses for delete to authenticated using(public.is_trip_editor(trip_id));

insert into storage.buckets(id,name,public) values('receipts','receipts',false) on conflict(id) do update set public=false;
drop policy if exists receipts_select on storage.objects;
create policy receipts_select on storage.objects for select to authenticated using(bucket_id='receipts' and public.is_trip_member(split_part(name,'/',1)::uuid));
drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects for insert to authenticated with check(bucket_id='receipts' and public.is_trip_editor(split_part(name,'/',1)::uuid) and split_part(name,'/',2)=auth.uid()::text);
drop policy if exists receipts_update on storage.objects;
create policy receipts_update on storage.objects for update to authenticated using(bucket_id='receipts' and public.is_trip_editor(split_part(name,'/',1)::uuid) and split_part(name,'/',2)=auth.uid()::text);
drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for delete to authenticated using(bucket_id='receipts' and public.is_trip_editor(split_part(name,'/',1)::uuid));

-- Optional: existing V6 trip numbers can remain as-is. New trips will use TRIP-YYYY-0001 style.
