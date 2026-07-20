-- Let a group's creator delete it. group_members/cycles/contributions all
-- cascade from groups (and cycles), so this cleans up everything.
create policy "group creator can delete group" on groups
  for delete using (auth.uid() = created_by);
