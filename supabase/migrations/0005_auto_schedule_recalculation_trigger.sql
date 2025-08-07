-- Function to calculate the next due date based on item period
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  p_item_id UUID,
  p_base_date DATE
) RETURNS DATE AS $$
DECLARE
  v_period_value INTEGER;
  v_period_unit VARCHAR(10);
  v_next_date DATE;
BEGIN
  -- Get the period information from the item
  SELECT period_value, period_unit 
  INTO v_period_value, v_period_unit
  FROM items 
  WHERE id = p_item_id;

  IF v_period_value IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate next date based on period unit
  IF v_period_unit = 'weeks' THEN
    v_next_date := p_base_date + (v_period_value || ' weeks')::INTERVAL;
  ELSIF v_period_unit = 'months' THEN
    v_next_date := p_base_date + (v_period_value || ' months')::INTERVAL;
  ELSE
    v_next_date := NULL;
  END IF;

  RETURN v_next_date::DATE;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically recalculate next schedule when a schedule is completed
CREATE OR REPLACE FUNCTION trigger_recalculate_next_schedule()
RETURNS TRIGGER AS $$
DECLARE
  v_next_date DATE;
  v_item_id UUID;
  v_actual_date DATE;
BEGIN
  -- Only proceed if the status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get the item_id from patient_schedules
    SELECT ps.item_id INTO v_item_id
    FROM patient_schedules ps
    WHERE ps.id = NEW.patient_schedule_id;

    -- Use actual_completion_date if available, otherwise use completed_date
    v_actual_date := COALESCE(NEW.actual_completion_date, NEW.completed_date);

    IF v_actual_date IS NOT NULL AND v_item_id IS NOT NULL THEN
      -- Calculate the next due date
      v_next_date := calculate_next_due_date(v_item_id, v_actual_date);

      IF v_next_date IS NOT NULL THEN
        -- Update the next_due_date in patient_schedules
        UPDATE patient_schedules
        SET 
          next_due_date = v_next_date,
          last_completed_date = v_actual_date,
          updated_at = NOW()
        WHERE id = NEW.patient_schedule_id;

        -- Optionally, create a new schedule_history entry for the future schedule
        -- This is commented out to avoid creating entries too far in advance
        -- INSERT INTO schedule_history (
        --   patient_schedule_id,
        --   scheduled_date,
        --   status,
        --   created_at,
        --   updated_at
        -- ) VALUES (
        --   NEW.patient_schedule_id,
        --   v_next_date,
        --   'pending',
        --   NOW(),
        --   NOW()
        -- );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on schedule_history table
DROP TRIGGER IF EXISTS auto_recalculate_schedule ON schedule_history;
CREATE TRIGGER auto_recalculate_schedule
  AFTER INSERT OR UPDATE ON schedule_history
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_next_schedule();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_next_due_date TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_recalculate_next_schedule TO authenticated;