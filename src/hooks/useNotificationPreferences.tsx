import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  profile_visible: boolean;
  activity_status: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  push_enabled: true,
  email_enabled: true,
  profile_visible: true,
  activity_status: true,
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setPreferences({
          push_enabled: data.push_enabled,
          email_enabled: data.email_enabled,
          profile_visible: data.profile_visible,
          activity_status: data.activity_status,
        });
      }
      // If no row exists, defaults are used
      setLoading(false);
    };

    fetchPreferences();
  }, [user?.id]);

  const updatePreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!user?.id) return;

      setPreferences(prev => ({ ...prev, [key]: value }));

      // Upsert the preference row
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: user.id, [key]: value },
          { onConflict: 'user_id' }
        );

      if (error) {
        // Revert on error
        setPreferences(prev => ({ ...prev, [key]: !value }));
        console.error('Failed to update preference:', error);
      }
    },
    [user?.id]
  );

  return { preferences, loading, updatePreference };
};
