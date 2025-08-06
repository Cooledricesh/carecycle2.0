-- Create RPC function for patient registration with schedules
CREATE OR REPLACE FUNCTION register_patient_with_schedules(
  p_patient_number VARCHAR(50),
  p_name VARCHAR(100),
  p_schedules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_patient_id UUID;
  v_schedule JSONB;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Check if patient already exists
    SELECT id INTO v_patient_id
    FROM patients
    WHERE patient_number = p_patient_number;
    
    IF v_patient_id IS NOT NULL THEN
      RAISE EXCEPTION 'Patient with number % already exists', p_patient_number;
    END IF;
    
    -- Insert patient
    INSERT INTO patients (patient_number, name)
    VALUES (p_patient_number, p_name)
    RETURNING id INTO v_patient_id;
    
    -- Insert schedules
    FOR v_schedule IN SELECT * FROM jsonb_array_elements(p_schedules)
    LOOP
      INSERT INTO patient_schedules (
        patient_id,
        item_id,
        first_date,
        next_due_date
      )
      VALUES (
        v_patient_id,
        (v_schedule->>'item_id')::UUID,
        (v_schedule->>'first_date')::DATE,
        (v_schedule->>'next_due_date')::DATE
      );
      
      -- Insert initial schedule history entry
      INSERT INTO schedule_history (
        patient_schedule_id,
        scheduled_date,
        status
      )
      SELECT 
        id,
        (v_schedule->>'first_date')::DATE,
        'pending'
      FROM patient_schedules
      WHERE patient_id = v_patient_id 
        AND item_id = (v_schedule->>'item_id')::UUID;
    END LOOP;
    
    -- Prepare success result
    v_result := jsonb_build_object(
      'success', true,
      'patient_id', v_patient_id,
      'message', 'Patient registered successfully'
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Patient with number % already exists', p_patient_number;
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Invalid item_id provided in schedules';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error registering patient: %', SQLERRM;
  END;
END;
$$;

-- Create RPC function to get available items
CREATE OR REPLACE FUNCTION get_available_items()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'type', type,
      'period_value', period_value,
      'period_unit', period_unit
    )
  )
  FROM items
  WHERE is_active = true
  ORDER BY type, name;
END;
$$;