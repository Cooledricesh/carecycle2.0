-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create items table for tests and injections
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('test', 'injection')),
  period_value INTEGER NOT NULL,
  period_unit VARCHAR(10) NOT NULL CHECK (period_unit IN ('weeks', 'months')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create patient_schedules table
CREATE TABLE IF NOT EXISTS patient_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  first_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  last_completed_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(patient_id, item_id)
);

-- Create schedule_history table for tracking completed schedules
CREATE TABLE IF NOT EXISTS schedule_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_schedule_id UUID NOT NULL REFERENCES patient_schedules(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'skipped')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_schedules_patient_id ON patient_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_schedules_item_id ON patient_schedules(item_id);
CREATE INDEX IF NOT EXISTS idx_patient_schedules_next_due_date ON patient_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_schedule_history_patient_schedule_id ON schedule_history(patient_schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_history_scheduled_date ON schedule_history(scheduled_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_schedules_updated_at BEFORE UPDATE ON patient_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_history_updated_at BEFORE UPDATE ON schedule_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default items (tests and injections)
INSERT INTO items (name, type, period_value, period_unit) VALUES
  ('심리검사', 'test', 3, 'months'),
  ('뇌파검사', 'test', 6, 'months'),
  ('4주 주사', 'injection', 4, 'weeks'),
  ('12주 주사', 'injection', 12, 'weeks'),
  ('24주 주사', 'injection', 24, 'weeks')
ON CONFLICT DO NOTHING;