-- Step 6: Create function and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_tasks_updated_at ON template_tasks;
CREATE TRIGGER update_template_tasks_updated_at
  BEFORE UPDATE ON template_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
