-- Add actual_completion_date column to schedule_history table
-- This migration adds the missing actual_completion_date column to properly track
-- when scheduled items were actually completed vs when they were marked as complete

-- Add the column if it doesn't exist
ALTER TABLE schedule_history 
ADD COLUMN IF NOT EXISTS actual_completion_date DATE;

-- Update existing completed records to have actual_completion_date same as completed_date
-- This ensures data consistency for records created before this column was added
UPDATE schedule_history 
SET actual_completion_date = completed_date 
WHERE status = 'completed' 
  AND actual_completion_date IS NULL 
  AND completed_date IS NOT NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN schedule_history.actual_completion_date IS 'The actual date when the scheduled item was completed (may differ from scheduled_date)';