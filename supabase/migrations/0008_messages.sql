-- Chat add-ons. The conversations + messages tables already exist
-- (id / participant_a / participant_b / last_message_at and
--  id / conversation_id / sender_id / body / read_at / created_at).
-- This migration:
--   1. adds an UPDATE policy on messages so the recipient can flip read_at
--   2. installs a trigger that bumps conversations.last_message_at every
--      time a new message is inserted (so the chat list sorts cleanly)
--   3. enables realtime on both tables so the chat UI gets live pushes
-- Safe to re-run.

drop policy if exists "messages_update_mark_read" on public.messages;
create policy "messages_update_mark_read" on public.messages
  for update to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
    and sender_id <> auth.uid()
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
    and sender_id <> auth.uid()
  );

create or replace function public.bump_conversation_last_message()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id
     and (last_message_at is null or last_message_at < new.created_at);
  return new;
end;
$$;

drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- Enable realtime — wrapped so re-runs don't fail when already added.
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;
end $$;
