-- Add actual_completion_date to schedule_history if not exists
ALTER TABLE schedule_history 
ADD COLUMN IF NOT EXISTS actual_completion_date DATE;

-- Create a function to handle schedule completion
CREATE OR REPLACE FUNCTION handle_schedule_completion(
  p_schedule_id UUID,
  p_is_completed BOOLEAN,
  p_notes TEXT DEFAULT NULL,
  p_actual_date DATE DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_patient_schedule_id UUID;
  v_scheduled_date DATE;
  v_history_id UUID;
BEGIN
  -- Wrap main logic in BEGIN...EXCEPTION...END block for error handling
  BEGIN
    -- Get patient_schedule_id and next_due_date
    SELECT id, next_due_date INTO v_patient_schedule_id, v_scheduled_date
    FROM patient_schedules
    WHERE id = p_schedule_id;

    IF v_patient_schedule_id IS NULL THEN
      RAISE EXCEPTION 'Schedule not found';
    END IF;

    -- Check if history entry exists for today
    SELECT id INTO v_history_id
    FROM schedule_history
    WHERE patient_schedule_id = v_patient_schedule_id
      AND scheduled_date = v_scheduled_date;

    IF v_history_id IS NULL THEN
      -- Create new history entry
      INSERT INTO schedule_history (
        patient_schedule_id,
        scheduled_date,
        completed_date,
        actual_completion_date,
        status,
        notes
      ) VALUES (
        v_patient_schedule_id,
        v_scheduled_date,
        CASE WHEN p_is_completed THEN CURRENT_DATE ELSE NULL END,
        CASE WHEN p_is_completed THEN COALESCE(p_actual_date, CURRENT_DATE) ELSE NULL END,
        CASE WHEN p_is_completed THEN 'completed' ELSE 'pending' END,
        p_notes
      );
    ELSE
      -- Update existing history entry
      UPDATE schedule_history
      SET 
        completed_date = CASE WHEN p_is_completed THEN CURRENT_DATE ELSE NULL END,
        actual_completion_date = CASE WHEN p_is_completed THEN COALESCE(p_actual_date, CURRENT_DATE) ELSE NULL END,
        status = CASE WHEN p_is_completed THEN 'completed' ELSE 'pending' END,
        notes = p_notes,
        updated_at = NOW()
      WHERE id = v_history_id;
    END IF;

    -- Update last_completed_date in patient_schedules if completed
    IF p_is_completed THEN
      UPDATE patient_schedules
      SET last_completed_date = COALESCE(p_actual_date, CURRENT_DATE)
      WHERE id = v_patient_schedule_id;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error and re-raise it with context
      RAISE EXCEPTION 'Error in handle_schedule_completion: % - %', SQLERRM, SQLSTATE;
  END;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION handle_schedule_completion TO authenticated;

-- Create index on last_completed_date for query optimization
CREATE INDEX IF NOT EXISTS idx_patient_schedules_last_completed_date 
ON patient_schedules(last_completed_date);