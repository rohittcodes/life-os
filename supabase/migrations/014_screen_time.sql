-- Screen time entries — aggregated daily per app, per source device
CREATE TABLE IF NOT EXISTS screen_time_entries (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  log_date    date NOT NULL,
  source      text NOT NULL DEFAULT 'desktop', -- 'desktop' | 'android'
  app_name    text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  category    text NOT NULL DEFAULT 'other',
  synced_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, log_date, source, app_name)
);

ALTER TABLE screen_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own screen time" ON screen_time_entries
  FOR ALL USING (auth.uid() = user_id);

-- Personal API token for automated (non-browser) syncs e.g. Android Termux
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activity_sync_token text;
