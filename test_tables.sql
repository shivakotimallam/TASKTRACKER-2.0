-- Test if basic table creation works
CREATE TABLE IF NOT EXISTS test_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

-- If this works, the migration should work too
-- Drop the test table
DROP TABLE IF EXISTS test_table;
