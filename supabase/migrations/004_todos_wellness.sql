-- Todos: simple personal task list
CREATE TABLE todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  done boolean default false,
  priority text default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  category text,
  created_at timestamptz default now()
);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own todos" ON todos FOR ALL USING (auth.uid() = user_id);

-- Wellness: daily mood, sleep, water, energy
CREATE TABLE wellness_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  log_date date not null,
  mood int check (mood between 1 and 5),
  energy int check (energy between 1 and 5),
  sleep_hours numeric(3,1),
  water_glasses int default 0,
  steps int,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, log_date)
);
ALTER TABLE wellness_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own wellness_logs" ON wellness_logs FOR ALL USING (auth.uid() = user_id);
