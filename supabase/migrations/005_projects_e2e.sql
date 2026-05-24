-- User profiles (encryption settings, preferences)
CREATE TABLE user_profiles (
  id uuid primary key references auth.users,
  encryption_salt text,
  encryption_enabled boolean default false,
  encryption_hint text,
  routine_items jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own profiles" ON user_profiles FOR ALL USING (auth.uid() = id);

-- Projects: multi-project sprint tracking
CREATE TABLE projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  color text default '#6366f1',
  emoji text default '📁',
  status text default 'active' check (status in ('active', 'on_hold', 'completed', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE INDEX projects_user_id_idx ON projects(user_id);

-- Link existing tasks to projects
ALTER TABLE product_tasks ADD COLUMN project_id uuid references projects ON DELETE SET NULL;

-- Change daily_notes.content from jsonb to text (supports both JSON strings and encrypted strings)
ALTER TABLE daily_notes ALTER COLUMN content TYPE text USING content::text;

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
