-- Step 5: Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates table
DROP POLICY IF EXISTS "Users can view own templates" ON templates;
CREATE POLICY "Users can view own templates"
  ON templates FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON templates;
CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON templates;
CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for template_tasks table
DROP POLICY IF EXISTS "Users can view own template tasks" ON template_tasks;
CREATE POLICY "Users can view own template tasks"
  ON template_tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own template tasks" ON template_tasks;
CREATE POLICY "Users can insert own template tasks"
  ON template_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own template tasks" ON template_tasks;
CREATE POLICY "Users can update own template tasks"
  ON template_tasks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own template tasks" ON template_tasks;
CREATE POLICY "Users can delete own template tasks"
  ON template_tasks FOR DELETE
  USING (auth.uid() = user_id);
