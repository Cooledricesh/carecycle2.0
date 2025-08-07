-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_history ENABLE ROW LEVEL SECURITY;

-- Create policies for items table (public read access)
CREATE POLICY "Items are viewable by everyone" 
  ON items FOR SELECT 
  USING (true);

CREATE POLICY "Items can be inserted by authenticated users" 
  ON items FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Items can be updated by authenticated users" 
  ON items FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Items can be deleted by authenticated users" 
  ON items FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Create policies for patients table
CREATE POLICY "Patients are viewable by authenticated users" 
  ON patients FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Patients can be inserted by authenticated users" 
  ON patients FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Patients can be updated by authenticated users" 
  ON patients FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Patients can be deleted by authenticated users" 
  ON patients FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Create policies for patient_schedules table
CREATE POLICY "Patient schedules are viewable by authenticated users" 
  ON patient_schedules FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Patient schedules can be inserted by authenticated users" 
  ON patient_schedules FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Patient schedules can be updated by authenticated users" 
  ON patient_schedules FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Patient schedules can be deleted by authenticated users" 
  ON patient_schedules FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Create policies for schedule_history table
CREATE POLICY "Schedule history is viewable by authenticated users" 
  ON schedule_history FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Schedule history can be inserted by authenticated users" 
  ON schedule_history FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Schedule history can be updated by authenticated users" 
  ON schedule_history FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Schedule history can be deleted by authenticated users" 
  ON schedule_history FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Add unique constraint to items.name if not exists
ALTER TABLE items ADD CONSTRAINT items_name_unique UNIQUE (name);

-- Insert sample items data
INSERT INTO items (name, type, period_value, period_unit) VALUES
  ('COVID-19 백신', 'injection', 6, 'months'),
  ('독감 백신', 'injection', 12, 'months'),
  ('폐렴구균 백신', 'injection', 60, 'months'),
  ('혈액 검사', 'test', 3, 'months'),
  ('소변 검사', 'test', 6, 'months'),
  ('흉부 X-ray', 'test', 12, 'months')
ON CONFLICT (name) DO NOTHING;