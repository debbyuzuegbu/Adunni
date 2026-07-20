-- Creators must be able to read a group immediately after creating it,
-- before their group_members row exists (insert-then-select-back flow).
create policy "creators can read their own groups" on groups
  for select using (auth.uid() = created_by);
