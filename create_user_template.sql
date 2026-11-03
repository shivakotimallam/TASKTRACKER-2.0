-- Create Daily Routine Template for user 0228657a-80bb-4829-87ce-90491f4cc581

-- Step 1: Create the template
INSERT INTO templates (user_id, name, icon)
VALUES (
  '0228657a-80bb-4829-87ce-90491f4cc581',
  'Daily Routine',
  '🌙'
)
RETURNING id;

-- Note: Copy the returned ID from the result above and replace YOUR_TEMPLATE_ID below with that value
-- For example, if the returned ID is 'abc123-def456-...', replace YOUR_TEMPLATE_ID with that value

-- Step 2: Create template tasks (replace YOUR_TEMPLATE_ID with the actual ID from step 1)
-- All tasks are set for all 7 days (Monday through Sunday)

INSERT INTO template_tasks (template_id, user_id, task_name, start_time, end_time, selected_days) VALUES
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Fresh Up', '04:30', '05:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Pre Workout', '05:00', '05:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Meditation (Silence)', '05:30', '05:40', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Go to Gym', '05:40', '06:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Gym Workout', '06:00', '07:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Return to Hostel', '07:30', '07:45', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Bath & Breakfast', '07:45', '09:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Break', '09:00', '09:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Study Session 1', '09:30', '11:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Study Session 2', '11:30', '12:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Lunch', '12:30', '14:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Break', '14:00', '14:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Study Session 3', '14:30', '16:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Study Session 4', '16:30', '17:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Break (Little Food)', '17:30', '18:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Study Session 5', '18:00', '20:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Dinner', '20:30', '21:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Plan Next Day', '21:30', '22:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  ('YOUR_TEMPLATE_ID', '0228657a-80bb-4829-87ce-90491f4cc581', 'Night Sleep', '22:00', '23:59', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

