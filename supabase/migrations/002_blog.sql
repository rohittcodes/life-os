-- Blog posts — public readable, only owner can write
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  slug text not null,
  content text,
  excerpt text,
  published boolean not null default false,
  published_at timestamptz,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, slug)
);

alter table blog_posts enable row level security;

-- Owner can do everything
create policy "Owner full access" on blog_posts
  for all using (auth.uid() = user_id);

-- Anyone can read published posts
create policy "Public read published" on blog_posts
  for select using (published = true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute function update_updated_at();
