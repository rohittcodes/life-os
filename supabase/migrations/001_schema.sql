-- Job applications
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  company text not null,
  role text not null,
  salary_lpa int,
  status text not null default 'applied' check (status in ('applied','screen','interview','offer','rejected','ghosted')),
  applied_at date not null default current_date,
  next_action_date date,
  notes text,
  created_at timestamptz default now()
);

alter table job_applications enable row level security;
create policy "Users see own jobs" on job_applications for all using (auth.uid() = user_id);

-- Freelance clients
create table if not exists freelance_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_name text not null,
  project text not null,
  rate decimal(10,2),
  rate_type text check (rate_type in ('hourly','fixed')),
  status text not null default 'negotiating' check (status in ('negotiating','active','delivered','paid','on_hold')),
  deadline date,
  amount_agreed decimal(10,2),
  amount_paid decimal(10,2) default 0,
  notes text,
  created_at timestamptz default now()
);

alter table freelance_clients enable row level security;
create policy "Users see own clients" on freelance_clients for all using (auth.uid() = user_id);

-- Product tasks
create table if not exists product_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  milestone text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  priority int not null default 2 check (priority in (1,2,3)),
  due_date date,
  notes text,
  created_at timestamptz default now()
);

alter table product_tasks enable row level security;
create policy "Users see own tasks" on product_tasks for all using (auth.uid() = user_id);

-- Habit logs (one per day per user)
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null default current_date,
  gym_done boolean not null default false,
  english_done boolean not null default false,
  sleep_hrs numeric(3,1),
  diet_clean boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

alter table habit_logs enable row level security;
create policy "Users see own habits" on habit_logs for all using (auth.uid() = user_id);

-- Finance entries
create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income','expense')),
  source text,
  category text not null,
  amount decimal(12,2) not null,
  entry_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table finance_entries enable row level security;
create policy "Users see own finance" on finance_entries for all using (auth.uid() = user_id);

-- Weekly reviews
create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  wins text,
  blockers text,
  next_week_focus text,
  energy_score int check (energy_score between 1 and 10),
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

alter table weekly_reviews enable row level security;
create policy "Users see own reviews" on weekly_reviews for all using (auth.uid() = user_id);
