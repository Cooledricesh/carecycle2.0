-- Migration: {{migration_name}}
-- Created at: {{timestamp}}

BEGIN;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.{{table_name}} (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  -- Add columns here
);

-- Enable Row Level Security
ALTER TABLE public.{{table_name}} ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_{{table_name}}_updated_at
  BEFORE UPDATE ON public.{{table_name}}
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create RLS policies
-- Example: Allow authenticated users to view their own data
CREATE POLICY "Users can view own {{table_name}}"
  ON public.{{table_name}}
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for better performance
-- CREATE INDEX idx_{{table_name}}_user_id ON public.{{table_name}}(user_id);

COMMIT;