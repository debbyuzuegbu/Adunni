-- The original "members can read their group's membership" policy queried
-- group_members from within a policy on group_members itself, which made
-- Postgres re-evaluate the same RLS policy recursively (error 42P17).
-- A security definer function bypasses RLS for its internal query, breaking
-- the recursion while still only returning groups the user belongs to.

create function public.my_group_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select group_id from group_members where profile_id = auth.uid()
$$;
 
drop policy "members can read their group's membership" on group_members;

create policy "members can read their group's membership" on group_members
  for select using (
    group_id in (select public.my_group_ids())
  );
