-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_user_id ON template_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_template_id ON tasks(source_template_id) WHERE source_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_source_template_task_id ON tasks(source_template_task_id) WHERE source_template_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_task_source ON tasks(task_source) WHERE task_source = 'template';
