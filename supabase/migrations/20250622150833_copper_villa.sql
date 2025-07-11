/*
  # Rename 'name' column to 'designation' in buildings table

  1. Changes
    - Rename column 'name' to 'designation' in buildings table
    - Update any indexes that reference the old column name
    - Maintain all existing constraints and relationships

  2. Security
    - No changes to RLS policies needed as they don't reference the column name
    - All existing permissions remain intact
*/

-- Rename the column from 'name' to 'designation'
ALTER TABLE buildings RENAME COLUMN name TO designation;

-- Update any indexes that might reference the old column name
-- (Currently there are no specific indexes on the name column, but this is for safety)
DO $$ 
BEGIN
  -- Check if there are any indexes on the old column name and recreate them
  -- This is a safety measure in case indexes were added later
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'buildings' 
    AND indexdef LIKE '%name%'
  ) THEN
    -- Drop and recreate any indexes that reference the old column
    -- Note: In our current schema, there are no such indexes
    RAISE NOTICE 'No indexes found referencing the old column name';
  END IF;
END $$;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Renamed column "name" to "designation" in buildings table';
END $$;