create function public.shares_group_with(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from group_members mine
    join group_members theirs on theirs.group_id = mine.group_id
    where mine.profile_id = auth.uid() and theirs.profile_id = other
  )
$$;

create policy "circle members can read each other's profiles" on profiles
  for select using (public.shares_group_with(id));

create function public.require_group_creator(target_group uuid)
returns groups
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  g groups;
begin
  select * into g from groups where id = target_group;
  if g.id is null then
    raise exception 'Circle not found';
  end if;
  if g.created_by <> auth.uid() then
    raise exception 'Only the organizer can do this';
  end if;
  return g;
end;
$$;

create function public.compact_payout_positions(target_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  pos int := 0;
begin
  update group_members set payout_position = -payout_position
  where group_id = target_group and payout_position is not null;

  for m in
    select id from group_members
    where group_id = target_group
    order by abs(coalesce(payout_position, 2147483647)), joined_at
  loop
    pos := pos + 1;
    update group_members set payout_position = pos where id = m.id;
  end loop;
end;
$$;

create function public.leave_group(target_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
begin
  select * into g from groups where id = target_group;
  if g.id is null then
    raise exception 'Circle not found';
  end if;
  if g.created_by = auth.uid() then
    raise exception 'The organizer can''t leave. Delete the circle instead.';
  end if;
  if g.status <> 'draft' then
    raise exception 'You can only leave a circle before it starts';
  end if;

  delete from group_members where group_id = target_group and profile_id = auth.uid();
  perform public.compact_payout_positions(target_group);
end;
$$;

create function public.remove_member(target_member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m group_members;
  g groups;
begin
  select * into m from group_members where id = target_member;
  if m.id is null then
    raise exception 'Member not found';
  end if;
  g := public.require_group_creator(m.group_id);
  if g.status <> 'draft' then
    raise exception 'Members can only be removed before the circle starts';
  end if;
  if m.profile_id = g.created_by then
    raise exception 'The organizer can''t be removed';
  end if;

  delete from group_members where id = target_member;
  perform public.compact_payout_positions(g.id);
end;
$$;

create function public.move_member(target_member uuid, direction int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m group_members;
  other group_members;
  g groups;
begin
  if direction not in (-1, 1) then
    raise exception 'direction must be -1 or 1';
  end if;
  select * into m from group_members where id = target_member;
  if m.id is null then
    raise exception 'Member not found';
  end if;
  g := public.require_group_creator(m.group_id);
  if g.status <> 'draft' then
    raise exception 'Payout order is locked once the circle starts';
  end if;

  select * into other from group_members
  where group_id = m.group_id and payout_position = m.payout_position + direction;
  if other.id is null then
    return;
  end if;

  update group_members set payout_position = null where id = m.id;
  update group_members set payout_position = m.payout_position where id = other.id;
  update group_members set payout_position = other.payout_position where id = m.id;
end;
$$;

create function public.start_circle(target_group uuid, start_date date, shuffle boolean default false)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
  roster_size int;
  step interval;
  m record;
  pos int := 0;
  new_cycle_id uuid;
begin
  g := public.require_group_creator(target_group);
  if g.status <> 'draft' then
    raise exception 'This circle has already started';
  end if;

  select count(*) into roster_size from group_members where group_id = target_group;
  if roster_size < 2 then
    raise exception 'A circle needs at least 2 members to start';
  end if;

  if shuffle then
    update group_members set payout_position = -payout_position
    where group_id = target_group;
    for m in select id from group_members where group_id = target_group order by random() loop
      pos := pos + 1;
      update group_members set payout_position = pos where id = m.id;
    end loop;
  else
    perform public.compact_payout_positions(target_group);
  end if;

  step := case g.frequency when 'weekly' then interval '1 week' else interval '1 month' end;

  for m in
    select id, payout_position from group_members
    where group_id = target_group
    order by payout_position
  loop
    insert into cycles (group_id, cycle_number, recipient_member_id, due_date)
    values (target_group, m.payout_position, m.id, (start_date + step * (m.payout_position - 1))::date)
    returning id into new_cycle_id;

    insert into contributions (cycle_id, member_id, amount_kobo)
    select new_cycle_id, gm.id, g.contribution_amount_kobo
    from group_members gm where gm.group_id = target_group;
  end loop;

  update groups
  set status = 'active',
      member_count = roster_size,
      current_cycle = 1,
      payout_order_locked = true
  where id = target_group
  returning * into g;

  return g;
end;
$$;

create function public.set_contribution_received(target_contribution uuid, received boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c contributions;
  cyc cycles;
begin
  select * into c from contributions where id = target_contribution;
  if c.id is null then
    raise exception 'Contribution not found';
  end if;
  select * into cyc from cycles where id = c.cycle_id;
  perform public.require_group_creator(cyc.group_id);
  if cyc.paid_out then
    raise exception 'This cycle is already closed';
  end if;

  update contributions
  set status = case when received then 'paid'::contribution_status else 'pending'::contribution_status end,
      paid_at = case when received then coalesce(paid_at, now()) else null end,
      method = case when received then method else null end
  where id = target_contribution;
end;
$$;

create function public.complete_current_cycle(target_group uuid)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
begin
  g := public.require_group_creator(target_group);
  if g.status <> 'active' then
    raise exception 'This circle isn''t active';
  end if;

  update cycles set paid_out = true
  where group_id = target_group and cycle_number = g.current_cycle;

  if g.current_cycle >= g.member_count then
    update groups set status = 'completed' where id = target_group returning * into g;
  else
    update groups set current_cycle = current_cycle + 1 where id = target_group returning * into g;
  end if;

  return g;
end;
$$;

create function public.guard_group_terms()
returns trigger
language plpgsql
as $$
declare
  roster_size int;
begin
  if current_user = 'authenticated' and old.status <> 'draft' and (
    new.contribution_amount_kobo <> old.contribution_amount_kobo
    or new.frequency <> old.frequency
    or new.member_count <> old.member_count
  ) then
    raise exception 'A circle''s terms can''t change after it starts';
  end if;

  if current_user = 'authenticated' and (
    new.status <> old.status
    or new.current_cycle <> old.current_cycle
    or new.payout_order_locked <> old.payout_order_locked
  ) then
    raise exception 'Use the circle controls to change its status';
  end if;

  if new.member_count <> old.member_count then
    select count(*) into roster_size from group_members where group_id = new.id;
    if new.member_count < roster_size then
      raise exception 'Circle size can''t be smaller than the % members already in it', roster_size;
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_group_terms
  before update on groups
  for each row execute function public.guard_group_terms();

grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.move_member(uuid, int) to authenticated;
grant execute on function public.start_circle(uuid, date, boolean) to authenticated;
grant execute on function public.set_contribution_received(uuid, boolean) to authenticated;
grant execute on function public.complete_current_cycle(uuid) to authenticated;
