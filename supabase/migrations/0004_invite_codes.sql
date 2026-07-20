-- Shareable invite codes so people can join a circle without exposing
-- other groups' data. Groups stay members-only for direct reads; joining
-- goes through a security definer RPC that validates the code internally.

alter table groups add column invite_code text unique;

create function public.generate_invite_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(gen_random_uuid()::text), 1, 6))
$$;

create function public.set_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.invite_code is null then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end;
$$;

create trigger on_group_created_set_invite_code
  before insert on groups
  for each row execute function public.set_invite_code();

-- Looks up a group by invite code and adds the caller as a member.
-- security definer lets it read `groups` (to validate the code and check
-- capacity) without granting the caller general read access to all groups.
create function public.join_group_by_invite_code(code text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target groups;
  next_position int;
  member_total int;
begin
  select * into target from groups where invite_code = upper(code);
  if target.id is null then
    raise exception 'Invalid invite code';
  end if;

  select count(*) into member_total from group_members where group_id = target.id;
  if member_total >= target.member_count then
    raise exception 'This circle is already full';
  end if;

  if exists (select 1 from group_members where group_id = target.id and profile_id = auth.uid()) then
    raise exception 'You are already a member of this circle';
  end if;

  select coalesce(max(payout_position), 0) + 1 into next_position
  from group_members where group_id = target.id;

  insert into group_members (group_id, profile_id, payout_position)
  values (target.id, auth.uid(), next_position);

  return target;
end;
$$;

grant execute on function public.join_group_by_invite_code(text) to authenticated;
