-- AI advanced features: per-tool permissions + persistent agent memory
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS ai_tool_permissions JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_memory TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN user_profiles.ai_tool_permissions IS
  'Per-tool permission map: { toolName: "always" | "ask" | "never" }. Default is "ask" for write tools.';

COMMENT ON COLUMN user_profiles.ai_memory IS
  'Array of remembered facts the AI assistant should know about the user.';
