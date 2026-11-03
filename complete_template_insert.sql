-- Complete Daily Routine Template Insert for user 0228657a-80bb-4829-87ce-90491f4cc581
-- Run this entire query in Supabase SQL Editor - it creates the template and all tasks in one go
-- Tasks repeat on Monday, Wednesday, Thursday, Saturday, Sunday (NOT Tuesday and Friday)

WITH new_template AS (
  INSERT INTO templates (user_id, name, icon)
  VALUES (
    '0228657a-80bb-4829-87ce-90491f4cc581',
    'Daily Routine',
    '🌙'
  )
  RETURNING id
)
INSERT INTO template_tasks (template_id, user_id, task_name, start_time, end_time, selected_days)
SELECT
  (SELECT id FROM new_template),
  '0228657a-80bb-4829-87ce-90491f4cc581',
  task_name,
  start_time,
  end_time,
  selected_days
FROM (VALUES
  ('Fresh Up', '04:30', '05:00', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Pre Workout', '05:00', '05:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Meditation (Silence)', '05:30', '05:40', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Go to Gym', '05:40', '06:00', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Gym Workout', '06:00', '07:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Return to Hostel', '07:30', '07:45', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Bath & Breakfast', '07:45', '09:00', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Break', '09:00', '09:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Study Session 1', '09:30', '11:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Study Session 2', '11:30', '12:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Lunch', '12:30', '14:00', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Break', '14:00', '14:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Study Session 3', '14:30', '16:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Study Session 4', '16:30', '17:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Break (Little Food)', '17:30', '18:00', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Study Session 5', '18:00', '20:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Dinner', '20:30', '21:30', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Plan Next Day', '21:30', '22:00', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']),
  ('Night Sleep', '22:00', '23:59', ARRAY['Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'])
) AS t(task_name, start_time, end_time, selected_days);
