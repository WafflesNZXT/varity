-- Run this in Supabase SQL Editor
-- It creates profiles, conversations, and messages tables with RLS policies.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_id_created_at_idx
  on public.conversations(user_id, created_at desc);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages(conversation_id, created_at asc);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Profiles policies
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Conversations policies
create policy "conversations_select_own"
  on public.conversations
  for select
  using (auth.uid() = user_id);

create policy "conversations_insert_own"
  on public.conversations
  for insert
  with check (auth.uid() = user_id);

create policy "conversations_update_own"
  on public.conversations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "conversations_delete_own"
  on public.conversations
  for delete
  using (auth.uid() = user_id);

-- Messages policies
create policy "messages_select_own"
  on public.messages
  for select
  using (auth.uid() = user_id);

create policy "messages_insert_own"
  on public.messages
  for insert
  with check (auth.uid() = user_id);

create policy "messages_delete_own"
  on public.messages
  for delete
  using (auth.uid() = user_id);

-- Optional trigger to keep updated_at fresh on conversations
create or replace function public.set_conversation_updated_at()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_messages_touch_conversation on public.messages;
create trigger trg_messages_touch_conversation
after insert on public.messages
for each row execute procedure public.set_conversation_updated_at();
