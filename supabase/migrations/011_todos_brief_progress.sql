-- Add brief (rich description) and progress (0–100) to todos
ALTER TABLE todos ADD COLUMN IF NOT EXISTS brief text;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
