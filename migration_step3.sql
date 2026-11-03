-- Step 3: Add columns to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_source TEXT DEFAULT 'regular' CHECK (task_source IN ('regular', 'template')),
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_template_task_id UUID REFERENCES template_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_icon_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_start_time TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_end_time TEXT;
