import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Megaphone } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AnnouncementsFeed() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      setLoading(true);
      // RLS handles filtering — just query all published
      const { data } = await supabase
        .from('announcements')
        .select('id, title, content, priority, created_at, class_id, classes(name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      setAnnouncements(data || []);
      setLoading(false);
    };
    fetch();
  }, [profile]);

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) return <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>;
  if (announcements.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Megaphone className="h-5 w-5 text-primary" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.map(a => (
          <div key={a.id} className={`p-3 rounded-lg border ${a.priority === 'urgent' ? 'border-destructive/30 bg-destructive/5' : a.priority === 'high' ? 'border-warning/30 bg-warning/5' : 'bg-muted/30'}`}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-medium text-sm">{a.title}</p>
              {a.priority !== 'normal' && (
                <Badge variant={priorityColor(a.priority) as any} className="text-xs">{a.priority}</Badge>
              )}
              {a.classes?.name && (
                <Badge variant="outline" className="text-xs">{a.classes.name}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{a.content}</p>
            <p className="text-xs text-muted-foreground mt-2">{format(new Date(a.created_at), 'MMM d, yyyy')}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}