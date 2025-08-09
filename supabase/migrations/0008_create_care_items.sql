-- Create care_items table for storing care procedures and medications
-- This table will store both procedures (검사) and medications (주사) with standardized intervals

-- 1. Create enum type for care item types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'care_item_type') THEN
        CREATE TYPE care_item_type AS ENUM ('procedure', 'medication');
    END IF;
END $$;

-- 2. Create care_items table
CREATE TABLE IF NOT EXISTS care_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type care_item_type NOT NULL,
    interval_weeks INTEGER NOT NULL CHECK (interval_weeks > 0),
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure unique names within the same type
    CONSTRAINT care_items_name_type_unique UNIQUE (name, type)
);

-- 3. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_care_items_type ON care_items(type);
CREATE INDEX IF NOT EXISTS idx_care_items_active ON care_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_care_items_interval ON care_items(interval_weeks);
CREATE INDEX IF NOT EXISTS idx_care_items_name_search ON care_items USING gin (to_tsvector('english', name));

-- 4. Add updated_at trigger
CREATE TRIGGER update_care_items_updated_at 
    BEFORE UPDATE ON care_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE care_items ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Public read access for all users to view care items
CREATE POLICY "Care items are viewable by everyone" 
    ON care_items FOR SELECT 
    USING (true);

-- Authenticated users can insert care items
CREATE POLICY "Care items can be inserted by authenticated users" 
    ON care_items FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update care items
CREATE POLICY "Care items can be updated by authenticated users" 
    ON care_items FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Authenticated users can delete care items (soft delete via is_active recommended)
CREATE POLICY "Care items can be deleted by authenticated users" 
    ON care_items FOR DELETE 
    USING (auth.role() = 'authenticated');

-- 7. Insert default care items data
INSERT INTO care_items (name, type, interval_weeks, description) VALUES
    -- Procedures (검사)
    ('혈액검사', 'procedure', 12, '정기적인 혈액 검사를 통한 건강 상태 확인'),
    ('소변검사', 'procedure', 24, '신장 기능 및 요로계 건강 상태 검사'),
    ('심전도검사', 'procedure', 52, '심장 기능 및 부정맥 확인을 위한 검사'),
    ('흉부 X-ray', 'procedure', 52, '폐 및 심장 건강 상태 확인을 위한 영상 검사'),
    ('혈압측정', 'procedure', 4, '혈압 모니터링을 통한 심혈관 건강 관리'),
    ('체중측정', 'procedure', 2, '정기적인 체중 변화 모니터링'),
    
    -- Medications (주사)
    ('인슐린 주사', 'medication', 1, '당뇨병 관리를 위한 주기적 인슐린 투여'),
    ('독감 백신', 'medication', 52, '연간 독감 예방을 위한 백신 접종'),
    ('COVID-19 백신', 'medication', 26, '코로나19 예방을 위한 추가 백신 접종'),
    ('폐렴구균 백신', 'medication', 260, '폐렴 예방을 위한 백신 접종 (5년 주기)'),
    ('B형간염 백신', 'medication', 520, 'B형간염 예방을 위한 백신 접종 (10년 주기)'),
    ('비타민 B12 주사', 'medication', 12, '비타민 B12 결핍 예방 및 치료')
ON CONFLICT (name, type) DO NOTHING;

-- 8. Create helper function to get care items by type
CREATE OR REPLACE FUNCTION get_care_items_by_type(item_type care_item_type)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type care_item_type,
    interval_weeks INTEGER,
    description TEXT,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.id,
        ci.name,
        ci.type,
        ci.interval_weeks,
        ci.description,
        ci.is_active
    FROM care_items ci
    WHERE ci.type = item_type 
        AND ci.is_active = true
    ORDER BY ci.name;
END;
$$ LANGUAGE plpgsql;

-- 9. Create helper function to convert interval_weeks to human readable format
CREATE OR REPLACE FUNCTION format_care_item_interval(weeks INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN weeks = 1 THEN '매주'
        WHEN weeks = 2 THEN '격주'
        WHEN weeks = 4 THEN '매월'
        WHEN weeks = 12 THEN '분기별'
        WHEN weeks = 26 THEN '반기별'
        WHEN weeks = 52 THEN '연간'
        WHEN weeks < 52 THEN weeks || '주마다'
        ELSE ROUND(weeks / 52.0, 1) || '년마다'
    END;
END;
$$ LANGUAGE plpgsql;

-- 10. Grant necessary permissions
GRANT SELECT ON care_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_care_items_by_type TO authenticated;
GRANT EXECUTE ON FUNCTION format_care_item_interval TO authenticated;

-- 11. Add dashboard update trigger for real-time notifications
CREATE TRIGGER dashboard_update_on_care_items
    AFTER INSERT OR UPDATE OR DELETE ON care_items
    FOR EACH ROW 
    EXECUTE FUNCTION notify_dashboard_update();

-- 12. Create view for easier querying with formatted intervals
CREATE OR REPLACE VIEW care_items_view AS
SELECT 
    id,
    name,
    type,
    interval_weeks,
    format_care_item_interval(interval_weeks) as interval_display,
    description,
    is_active,
    created_at,
    updated_at
FROM care_items;

-- Grant access to the view
GRANT SELECT ON care_items_view TO authenticated;

-- Create index on the view for performance
-- Note: Views can't have indexes directly, but underlying table indexes will be used

COMMENT ON TABLE care_items IS 'Table for storing care procedures (검사) and medications (주사) with their intervals';
COMMENT ON COLUMN care_items.name IS 'Name of the care item (procedure or medication)';
COMMENT ON COLUMN care_items.type IS 'Type of care item: procedure (검사) or medication (주사)';
COMMENT ON COLUMN care_items.interval_weeks IS 'Interval between care items in weeks';
COMMENT ON COLUMN care_items.description IS 'Optional description of the care item';
COMMENT ON COLUMN care_items.is_active IS 'Whether this care item is currently active/available';