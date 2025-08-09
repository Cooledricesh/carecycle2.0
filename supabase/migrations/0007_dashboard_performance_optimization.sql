-- Dashboard Performance Optimization Migration
-- Creates optimized functions and triggers for real-time dashboard updates

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

-- 7. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_schedule_history_status_date ON schedule_history(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedule_history_completed_date ON schedule_history(completed_date) WHERE completed_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_schedules_active_due ON patient_schedules(is_active, next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_schedule_history_recent ON schedule_history(scheduled_date DESC, status) WHERE scheduled_date >= CURRENT_DATE - interval '30 days';

-- 8. Grant necessary permissions
-- Note: Adjust permissions based on your RLS policies and user roles
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_dashboard_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_dashboard_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_trends TO authenticated;