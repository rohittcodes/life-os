CREATE TABLE IF NOT EXISTS task_steps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES product_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  done boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own task steps" ON task_steps FOR ALL USING (auth.uid() = user_id);
