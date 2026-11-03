-- Check profiles table structure
SELECT * FROM profiles LIMIT 5;

-- Check if user exists in profiles
SELECT id, full_name FROM profiles WHERE id = 'eb384afe-661e-4d5b-866c-84bbc6831ec0';

-- Check all profiles
SELECT id, full_name FROM profiles ORDER BY created_at DESC LIMIT 10;
