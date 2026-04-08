-- Check what columns the votes table actually has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'votes'
ORDER BY ordinal_position;
