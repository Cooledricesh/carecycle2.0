'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Switch } from '@heroui/switch';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Bell, Mail, Smartphone, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    user_email: '',
    notification_enabled: true,
    email_notifications: true,
    push_notifications: false,
    notification_time: '09:00',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .single();

      if (data) {
        setSettings({
          user_email: data.user_email || '',
          notification_enabled: data.notification_enabled ?? true,
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? false,
          notification_time: data.notification_time?.substring(0, 5) || '09:00',
        });
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_email: settings.user_email,
          notification_enabled: settings.notification_enabled,
          email_notifications: settings.email_notifications,
          push_notifications: settings.push_notifications,
          notification_time: settings.notification_time + ':00',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_email',
        });

      if (error) throw error;
      
      toast.success('알림 설정이 저장되었습니다');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">설정을 불러오는 중...</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="text-lg font-semibold">알림 설정</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          검사 및 주사 일정에 대한 알림을 설정합니다
        </p>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">알림 활성화</label>
              </div>
              <p className="text-sm text-muted-foreground">
                모든 알림을 켜거나 끕니다
              </p>
            </div>
            <Switch
              checked={settings.notification_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notification_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">이메일 알림</label>
              </div>
              <p className="text-sm text-muted-foreground">
                이메일로 알림을 받습니다
              </p>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, email_notifications: checked })
              }
              disabled={!settings.notification_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">푸시 알림</label>
              </div>
              <p className="text-sm text-muted-foreground">
                모바일 푸시 알림을 받습니다
              </p>
            </div>
            <Switch
              checked={settings.push_notifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, push_notifications: checked })
              }
              disabled={!settings.notification_enabled}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">알림 받을 이메일</label>
            <Input
              type="email"
              placeholder="example@email.com"
              value={settings.user_email}
              onChange={(e) =>
                setSettings({ ...settings, user_email: e.target.value })
              }
              disabled={!settings.notification_enabled || !settings.email_notifications}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">알림 시간</label>
            </div>
            <Input
              type="time"
              value={settings.notification_time}
              onChange={(e) =>
                setSettings({ ...settings, notification_time: e.target.value })
              }
              disabled={!settings.notification_enabled}
            />
            <p className="text-xs text-muted-foreground">
              매일 이 시간에 예정된 일정을 알려드립니다
            </p>
          </div>
        </div>

        <Button
          onClick={saveSettings}
          disabled={saving || !settings.user_email}
          className="w-full"
        >
          {saving ? (
            '저장 중...'
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              설정 저장
            </>
          )}
        </Button>
      </CardBody>
    </Card>
  );
}