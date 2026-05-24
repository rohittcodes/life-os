-- BYOK: AI provider keys stored in user_profiles (RLS-protected)
alter table user_profiles
  add column if not exists ai_provider text not null default 'anthropic',
  add column if not exists ai_anthropic_key text,
  add column if not exists ai_openai_key text,
  add column if not exists ai_gemini_key text,
  add column if not exists ai_groq_key text;
