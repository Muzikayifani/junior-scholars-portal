import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'message' | 'grade' | 'assignment' | 'announcement';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: any;
}

export const useRealtimeNotifications = () => {
  const { profile, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date(),
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);
    
    // Show toast notification
    toast(notification.title, {
      description: notification.message,
      duration: 5000,
    });

    // Try to show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
      });
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    // Listen for new messages
    const messagesChannel = supabase
      .channel('notifications-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Don't notify for own messages
          if (newMessage.sender_user_id === user.id) return;

          // Check if user is participant in this thread
          const { data: participant } = await supabase
            .from('thread_participants')
            .select('id')
            .eq('thread_id', newMessage.thread_id)
            .eq('user_id', user.id)
            .single();

          if (participant) {
            // Get sender name
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newMessage.sender_user_id)
              .single();

            addNotification({
              type: 'message',
              title: 'New Message',
              message: `${sender?.full_name || 'Someone'} sent you a message`,
              data: { threadId: newMessage.thread_id },
            });
          }
        }
      )
      .subscribe();

    // Listen for new grades (results)
    const gradesChannel = supabase
      .channel('notifications-grades')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'results',
        },
        async (payload) => {
          const updatedResult = payload.new as any;
          const oldResult = payload.old as any;

          // Only notify when status changes to 'graded'
          if (updatedResult.status === 'graded' && oldResult.status !== 'graded') {
            // Check if this result belongs to current user (learner)
            const { data: learner } = await supabase
              .from('learners')
              .select('user_id')
              .eq('id', updatedResult.learner_id)
              .single();

            if (learner?.user_id === user.id) {
              // Get assessment info
              const { data: assessment } = await supabase
                .from('assessments')
                .select('title, total_marks')
                .eq('id', updatedResult.assessment_id)
                .single();

              if (assessment) {
                const percentage = Math.round((updatedResult.marks_obtained / assessment.total_marks) * 100);
                addNotification({
                  type: 'grade',
                  title: 'New Grade',
                  message: `You scored ${percentage}% on "${assessment.title}"`,
                  data: { assessmentId: updatedResult.assessment_id, resultId: updatedResult.id },
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Listen for new assessments (assignments)
    const assessmentsChannel = supabase
      .channel('notifications-assessments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assessments',
        },
        async (payload) => {
          const newAssessment = payload.new as any;
          
          if (!newAssessment.is_published) return;

          // Check if learner is enrolled in this class
          const { data: learner } = await supabase
            .from('learners')
            .select('id')
            .eq('user_id', user.id)
            .eq('class_id', newAssessment.class_id)
            .single();

          if (learner) {
            addNotification({
              type: 'assignment',
              title: 'New Assignment',
              message: `"${newAssessment.title}" has been posted`,
              data: { assessmentId: newAssessment.id },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(gradesChannel);
      supabase.removeChannel(assessmentsChannel);
    };
  }, [user?.id, addNotification]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    addNotification,
  };
};
