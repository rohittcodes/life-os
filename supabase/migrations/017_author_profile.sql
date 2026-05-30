ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS author_bio text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS website_url text;
