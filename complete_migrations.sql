-- =============================================================================
-- COMPLETE MIGRATIONS AND DATABASE ADMINISTRATION SETUP
-- CareCycle PostgreSQL Database - Supabase
-- =============================================================================

-- =============================================================================
-- MIGRATION 0008: Complete Care Items Setup
-- =============================================================================

-- 1. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_care_items_type ON care_items(type);
CREATE INDEX IF NOT EXISTS idx_care_items_active ON care_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_care_items_interval ON care_items(interval_weeks);
CREATE INDEX IF NOT EXISTS idx_care_items_name_search ON care_items USING gin (to_tsvector('english', name));

-- 2. Add updated_at trigger
CREATE TRIGGER update_care_items_updated_at 
    BEFORE UPDATE ON care_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Enable Row Level Security
ALTER TABLE care_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Care items are viewable by everyone" 
    ON care_items FOR SELECT 
    USING (true);

CREATE POLICY "Care items can be inserted by authenticated users" 
    ON care_items FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Care items can be updated by authenticated users" 
    ON care_items FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Care items can be deleted by authenticated users" 
    ON care_items FOR DELETE 
    USING (auth.role() = 'authenticated');

-- 5. Insert default care items data
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

-- 6. Create helper function to get care items by type
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

-- 7. Create helper function to convert interval_weeks to human readable format
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

-- 8. Create view for easier querying with formatted intervals
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

-- 9. Grant necessary permissions
GRANT SELECT ON care_items TO authenticated;
GRANT SELECT ON care_items_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_care_items_by_type TO authenticated;
GRANT EXECUTE ON FUNCTION format_care_item_interval TO authenticated;

-- =============================================================================
-- MIGRATION 0007: Dashboard Performance Optimization
-- =============================================================================

-- 1. Create optimized dashboard statistics function
CREATE OR REPLACE FUNCTION get_dashboard_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
    stats JSON;
    total_patients_count INT;
    today_scheduled_count INT;
    overdue_count INT;
    today_completion_rate NUMERIC;
    week_completion_rate NUMERIC;
    month_completion_rate NUMERIC;
BEGIN
    -- Get total patients count
    SELECT COUNT(*) INTO total_patients_count FROM patients;
    
    -- Get today's scheduled items
    SELECT COUNT(*) INTO today_scheduled_count
    FROM patient_schedules 
    WHERE next_due_date = target_date AND is_active = true;
    
    -- Get overdue items count (more efficient query)
    SELECT COUNT(*) INTO overdue_count
    FROM patient_schedules ps
    WHERE ps.next_due_date < target_date 
        AND ps.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM schedule_history sh 
            WHERE sh.patient_schedule_id = ps.id 
                AND sh.scheduled_date = ps.next_due_date 
                AND sh.status = 'completed'
        );
    
    -- Calculate today's completion rate
    WITH today_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM schedule_history
        WHERE scheduled_date = target_date
    )
    SELECT COALESCE(
        CASE WHEN total > 0 THEN ROUND(completed * 100.0 / total, 1) ELSE 0 END, 0
    ) INTO today_completion_rate
    FROM today_stats;
    
    -- Calculate this week's completion rate
    WITH week_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM schedule_history
        WHERE scheduled_date >= target_date - EXTRACT(DOW FROM target_date)::int
            AND scheduled_date <= target_date
    )
    SELECT COALESCE(
        CASE WHEN total > 0 THEN ROUND(completed * 100.0 / total, 1) ELSE 0 END, 0
    ) INTO week_completion_rate
    FROM week_stats;
    
    -- Calculate this month's completion rate
    WITH month_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM schedule_history
        WHERE scheduled_date >= DATE_TRUNC('month', target_date)
            AND scheduled_date <= target_date
    )
    SELECT COALESCE(
        CASE WHEN total > 0 THEN ROUND(completed * 100.0 / total, 1) ELSE 0 END, 0
    ) INTO month_completion_rate
    FROM month_stats;
    
    -- Build final JSON response
    SELECT json_build_object(
        'totalPatients', total_patients_count,
        'todayScheduled', today_scheduled_count,
        'overdueItems', overdue_count,
        'completionRates', json_build_object(
            'today', today_completion_rate,
            'thisWeek', week_completion_rate,
            'thisMonth', month_completion_rate
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- 2. Create optimized recent activity function
CREATE OR REPLACE FUNCTION get_recent_dashboard_activity(activity_limit INT DEFAULT 10)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', sh.id,
                'patientName', p.name,
                'patientNumber', p.patient_number,
                'itemName', i.name,
                'itemType', i.type,
                'scheduledDate', sh.scheduled_date,
                'completedDate', sh.completed_date,
                'actualCompletionDate', sh.actual_completion_date,
                'status', sh.status,
                'notes', sh.notes
            ) ORDER BY COALESCE(sh.completed_date, sh.actual_completion_date) DESC
        ), '[]'::json)
        FROM schedule_history sh
        INNER JOIN patient_schedules ps ON sh.patient_schedule_id = ps.id
        INNER JOIN patients p ON ps.patient_id = p.id
        INNER JOIN items i ON ps.item_id = i.id
        WHERE sh.status = 'completed'
        ORDER BY COALESCE(sh.completed_date, sh.actual_completion_date) DESC
        LIMIT activity_limit
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Create optimized upcoming schedules function
CREATE OR REPLACE FUNCTION get_upcoming_dashboard_schedules(schedule_limit INT DEFAULT 10)
RETURNS JSON AS $$
DECLARE
    target_date DATE := CURRENT_DATE;
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', ps.id,
                'patientName', p.name,
                'patientNumber', p.patient_number,
                'itemName', i.name,
                'itemType', i.type,
                'dueDate', ps.next_due_date,
                'daysDue', (ps.next_due_date - target_date)
            ) ORDER BY ps.next_due_date
        ), '[]'::json)
        FROM patient_schedules ps
        INNER JOIN patients p ON ps.patient_id = p.id
        INNER JOIN items i ON ps.item_id = i.id
        WHERE ps.next_due_date >= target_date
            AND ps.is_active = true
            AND NOT EXISTS (
                SELECT 1 FROM schedule_history sh 
                WHERE sh.patient_schedule_id = ps.id 
                    AND sh.scheduled_date = ps.next_due_date 
                    AND sh.status = 'completed'
            )
        ORDER BY ps.next_due_date
        LIMIT schedule_limit
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Create dashboard trends function
CREATE OR REPLACE FUNCTION get_dashboard_trends()
RETURNS JSON AS $$
DECLARE
    weekly_rates JSON;
    item_distribution JSON;
BEGIN
    -- Get 4 weeks of completion rates
    WITH weekly_data AS (
        SELECT 
            generate_series::date as week_start,
            (generate_series::date + interval '6 days')::date as week_end
        FROM generate_series(
            CURRENT_DATE - interval '3 weeks' - (EXTRACT(DOW FROM CURRENT_DATE) || ' days')::interval,
            CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE) || ' days')::interval,
            interval '1 week'
        )
    ),
    completion_data AS (
        SELECT 
            wd.week_start,
            TO_CHAR(wd.week_start, 'Mon DD') || '-' || TO_CHAR(wd.week_end, 'DD') as week_label,
            COUNT(sh.id) as total_scheduled,
            COUNT(CASE WHEN sh.status = 'completed' THEN 1 END) as completed_count,
            CASE 
                WHEN COUNT(sh.id) > 0 
                THEN ROUND(COUNT(CASE WHEN sh.status = 'completed' THEN 1 END) * 100.0 / COUNT(sh.id))
                ELSE 0 
            END as completion_rate
        FROM weekly_data wd
        LEFT JOIN schedule_history sh ON sh.scheduled_date >= wd.week_start AND sh.scheduled_date <= wd.week_end
        GROUP BY wd.week_start, wd.week_end, week_label
        ORDER BY wd.week_start
    )
    SELECT json_agg(
        json_build_object(
            'week', week_start::text,
            'weekLabel', week_label,
            'completionRate', completion_rate,
            'completedCount', completed_count,
            'totalScheduled', total_scheduled
        ) ORDER BY week_start
    ) INTO weekly_rates
    FROM completion_data;
    
    -- Get item type distribution (last 30 days)
    WITH distribution_data AS (
        SELECT 
            i.type,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
        FROM schedule_history sh
        INNER JOIN patient_schedules ps ON sh.patient_schedule_id = ps.id
        INNER JOIN items i ON ps.item_id = i.id
        WHERE sh.scheduled_date >= CURRENT_DATE - interval '30 days'
        GROUP BY i.type
    )
    SELECT json_agg(
        json_build_object(
            'type', type,
            'count', count,
            'percentage', percentage
        )
    ) INTO item_distribution
    FROM distribution_data;
    
    RETURN json_build_object(
        'weeklyCompletionRates', COALESCE(weekly_rates, '[]'::json),
        'itemTypeDistribution', COALESCE(item_distribution, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Create real-time notification trigger
CREATE OR REPLACE FUNCTION notify_dashboard_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify connected clients about dashboard data changes
    PERFORM pg_notify('dashboard_update', json_build_object(
        'event', 'data_changed',
        'timestamp', EXTRACT(EPOCH FROM NOW()),
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id)
    )::text);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for real-time updates
DROP TRIGGER IF EXISTS dashboard_update_on_patients ON patients;
CREATE TRIGGER dashboard_update_on_patients
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

DROP TRIGGER IF EXISTS dashboard_update_on_schedules ON patient_schedules;
CREATE TRIGGER dashboard_update_on_schedules
    AFTER INSERT OR UPDATE OR DELETE ON patient_schedules
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

DROP TRIGGER IF EXISTS dashboard_update_on_history ON schedule_history;
CREATE TRIGGER dashboard_update_on_history
    AFTER INSERT OR UPDATE OR DELETE ON schedule_history
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

-- Add dashboard update trigger for care_items
DROP TRIGGER IF EXISTS dashboard_update_on_care_items ON care_items;
CREATE TRIGGER dashboard_update_on_care_items
    AFTER INSERT OR UPDATE OR DELETE ON care_items
    FOR EACH ROW 
    EXECUTE FUNCTION notify_dashboard_update();

-- 7. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_schedule_history_status_date ON schedule_history(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedule_history_completed_date ON schedule_history(completed_date) WHERE completed_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_schedules_active_due ON patient_schedules(is_active, next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_schedule_history_recent ON schedule_history(scheduled_date DESC, status) WHERE scheduled_date >= CURRENT_DATE - interval '30 days';

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_dashboard_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_dashboard_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_trends TO authenticated;

-- =============================================================================
-- DATABASE MONITORING AND MAINTENANCE SETUP
-- =============================================================================

-- Create monitoring views for database health
CREATE OR REPLACE VIEW db_connection_stats AS
SELECT 
    datname as database_name,
    numbackends as active_connections,
    xact_commit as transactions_committed,
    xact_rollback as transactions_rolled_back,
    blks_read as blocks_read,
    blks_hit as blocks_hit,
    ROUND(blks_hit * 100.0 / NULLIF(blks_hit + blks_read, 0), 2) as cache_hit_ratio
FROM pg_stat_database 
WHERE datname = current_database();

-- Create view for table sizes and bloat monitoring
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Create view for slow queries monitoring
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    ROUND(100.0 * total_time / SUM(total_time) OVER(), 2) AS percent_total_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_time DESC
LIMIT 10;

-- Grant permissions on monitoring views
GRANT SELECT ON db_connection_stats TO authenticated;
GRANT SELECT ON table_sizes TO authenticated;
GRANT SELECT ON slow_queries TO authenticated;

-- Add table comments for documentation
COMMENT ON TABLE care_items IS 'Table for storing care procedures (검사) and medications (주사) with their intervals';
COMMENT ON COLUMN care_items.name IS 'Name of the care item (procedure or medication)';
COMMENT ON COLUMN care_items.type IS 'Type of care item: procedure (검사) or medication (주사)';
COMMENT ON COLUMN care_items.interval_weeks IS 'Interval between care items in weeks';
COMMENT ON COLUMN care_items.description IS 'Optional description of the care item';
COMMENT ON COLUMN care_items.is_active IS 'Whether this care item is currently active/available';

-- Success message
SELECT 'Migration completed successfully! All functions, triggers, indexes, and monitoring views have been created.' as status;