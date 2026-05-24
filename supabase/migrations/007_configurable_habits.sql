-- Configurable habits system
-- Users can define their own habits (in addition to the legacy gym/english/diet columns)

create table if not exists habit_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text not null default 'circle',
  color text not null default '#6366f1',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table habit_definitions enable row level security;
create policy "Users see own habit definitions" on habit_definitions for all using (auth.uid() = user_id);

-- Add completions jsonb to habit_logs for custom habit tracking
-- custom_done: { [habit_definition_id]: boolean }
alter table habit_logs add column if not exists custom_done jsonb default '{}';
