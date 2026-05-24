-- Time tracker
CREATE TABLE time_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null default '',
  project_id uuid references projects ON DELETE SET NULL,
  tag text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes int,
  created_at timestamptz default now()
);
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own time_entries" ON time_entries FOR ALL USING (auth.uid() = user_id);
CREATE INDEX time_entries_user_date_idx ON time_entries(user_id, started_at);

-- Budget limits per category
CREATE TABLE budget_limits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  monthly_limit decimal(12,2) not null,
  created_at timestamptz default now(),
  unique(user_id, category)
);
ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own budget_limits" ON budget_limits FOR ALL USING (auth.uid() = user_id);

-- Knowledge base (personal wiki)
CREATE TABLE knowledge_articles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  content text,
  tags text[] default '{}',
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own knowledge_articles" ON knowledge_articles FOR ALL USING (auth.uid() = user_id);
CREATE INDEX knowledge_articles_user_id_idx ON knowledge_articles(user_id);
CREATE TRIGGER knowledge_articles_updated_at BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Morning routine: configurable checklist items
CREATE TABLE routine_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  icon text default '✅',
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now()
);
ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own routine_items" ON routine_items FOR ALL USING (auth.uid() = user_id);

-- Morning routine daily log
CREATE TABLE routine_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  log_date date not null,
  completed_item_ids text[] default '{}',
  notes text,
  mood_start int check (mood_start between 1 and 5),
  created_at timestamptz default now(),
  unique(user_id, log_date)
);
ALTER TABLE routine_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own routine_logs" ON routine_logs FOR ALL USING (auth.uid() = user_id);
