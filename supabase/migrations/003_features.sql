-- API Keys
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  last_used_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz default now()
);
alter table api_keys enable row level security;
create policy "Users manage own api keys" on api_keys for all using (auth.uid() = user_id);

-- Daily notes (one per day)
create table if not exists daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  note_date date not null default current_date,
  content jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, note_date)
);
alter table daily_notes enable row level security;
create policy "Users manage own notes" on daily_notes for all using (auth.uid() = user_id);

-- Goals
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null default 'personal'
    check (category in ('health','career','finance','personal','learning','relationships')),
  timeframe text,
  status text not null default 'active'
    check (status in ('active','completed','abandoned')),
  progress int not null default 0 check (progress between 0 and 100),
  due_date date,
  created_at timestamptz default now()
);
alter table goals enable row level security;
create policy "Users manage own goals" on goals for all using (auth.uid() = user_id);

-- Goal milestones
create table if not exists goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete cascade not null,
  title text not null,
  completed boolean not null default false,
  due_date date,
  created_at timestamptz default now()
);
alter table goal_milestones enable row level security;
create policy "Users manage own milestones" on goal_milestones for all using (auth.uid() = user_id);

-- Bookmarks
create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  description text,
  tags text[] default '{}',
  created_at timestamptz default now()
);
alter table bookmarks enable row level security;
create policy "Users manage own bookmarks" on bookmarks for all using (auth.uid() = user_id);

-- Reading list
create table if not exists reading_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  author text,
  type text not null default 'book'
    check (type in ('book','article','course','podcast','video')),
  url text,
  status text not null default 'want_to_read'
    check (status in ('want_to_read','reading','done','dropped')),
  rating int check (rating between 1 and 5),
  notes text,
  finished_at date,
  created_at timestamptz default now()
);
alter table reading_list enable row level security;
create policy "Users manage own reading list" on reading_list for all using (auth.uid() = user_id);

-- Contacts / mini-CRM
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  company text,
  role text,
  relationship text not null default 'professional'
    check (relationship in ('friend','colleague','mentor','client','recruiter','professional','other')),
  warmth int not null default 3 check (warmth between 1 and 5),
  last_contacted_at date,
  next_follow_up date,
  notes text,
  created_at timestamptz default now()
);
alter table contacts enable row level security;
create policy "Users manage own contacts" on contacts for all using (auth.uid() = user_id);

-- Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount decimal(10,2) not null,
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('weekly','monthly','quarterly','yearly')),
  category text not null default 'misc'
    check (category in ('streaming','productivity','cloud','learning','health','finance','misc')),
  next_billing_date date,
  active boolean not null default true,
  url text,
  notes text,
  created_at timestamptz default now()
);
alter table subscriptions enable row level security;
create policy "Users manage own subscriptions" on subscriptions for all using (auth.uid() = user_id);

-- Trigger for daily_notes updated_at
create trigger daily_notes_updated_at
  before update on daily_notes
  for each row execute function update_updated_at();
