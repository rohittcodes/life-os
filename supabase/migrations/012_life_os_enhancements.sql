-- Goal → Todo linking
ALTER TABLE todos ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES goals(id) ON DELETE SET NULL;

-- Recurring todos
ALTER TABLE todos ADD COLUMN IF NOT EXISTS recurrence text DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly'));

-- Finance budget targets
CREATE TABLE IF NOT EXISTS finance_budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  category text NOT NULL,
  monthly_limit numeric NOT NULL CHECK (monthly_limit > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own budgets" ON finance_budgets FOR ALL USING (auth.uid() = user_id);
