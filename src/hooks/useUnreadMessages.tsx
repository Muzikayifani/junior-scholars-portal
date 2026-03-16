import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    // Get threads user participates in
    const { data: threads } = await supabase
      .from('thread_participants')
      .select('thread_id')
      .eq('user_id', user.id);

    if (!threads || threads.length === 0) {
      setUnreadCount(0);
      return;
    }

    const threadIds = threads.map(t => t.thread_id);

    // Count unread messages (messages from others that are not read)
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('thread_id', threadIds)
      .neq('sender_user_id', user.id)
      .is('read_at', null);

    setUnreadCount(count || 0);
  }, [user?.id]);

  useEffect(() => {
    fetchUnreadCount();

    if (!user?.id) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.sender_user_id !== user.id) {
            const { data } = await supabase
              .from('thread_participants')
              .select('id')
              .eq('thread_id', newMessage.thread_id)
              .eq('user_id', user.id)
              .single();

            if (data) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Re-fetch count when messages are updated (read_at changed)
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUnreadCount]);

  const markThreadAsRead = useCallback(async (threadId: string) => {
    if (!user?.id) return;

    // Update read_at in the database for unread messages from others
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .neq('sender_user_id', user.id)
      .is('read_at', null);

    // Re-fetch the accurate count
    fetchUnreadCount();
  }, [user?.id, fetchUnreadCount]);

  return { unreadCount, markThreadAsRead };
};
