-- Let somebody create their own profile row.
--
-- profiles had policies for select and update but none for insert, so the
-- only thing that could ever create a row was the service role, in the
-- profile sync that runs at sign-in. That sync is wrapped in a try/catch
-- which warns and carries on, and the row can also be removed later — and
-- either way the person was left holding a form that could not save.
--
-- Their own row only: the check pins the id to the caller, so this grants
-- nothing beyond the row they already own through profiles_update_own.

drop policy if exists profiles_insert_self on public.profiles;

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
