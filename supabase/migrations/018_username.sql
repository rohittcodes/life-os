ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
