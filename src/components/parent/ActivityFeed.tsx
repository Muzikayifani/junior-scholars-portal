import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, BookOpen, Calendar, CheckCircle, ClipboardList, Clock, FileText } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ActivityItem {
  id: string;
  type: 'grade' | 'attendance' | 'assessment' | 'announcement';
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  color: string;
}

interface ChildInfo {
  user_id: string;
  full_name: string;
}

const ActivityFeed = () => {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState('');

  const fetchChildren = useCallback(async () => {
    if (!profile?.user_id) return;
    const { data: rels } = await supabase
      .from('parent_child_relationships')
      .select('child_user_id, child:profiles!parent_child_relationships_child_user_id_fkey(user_id, full_name)')
      .eq('parent_user_id', profile.user_id);

    if (rels && rels.length > 0) {
      const kids = rels.map((r: any) => r.child as ChildInfo);
      setChildren(kids);
      setSelectedChild(kids[0].user_id);
    }
  }, [profile?.user_id]);

  const fetchActivities = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    const items: ActivityItem[] = [];

    try {
      // Get learner records
      const { data: learners } = await supabase
        .from('learners')
        .select('id, class_id')
        .eq('user_id', selectedChild);

      if (!learners || learners.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const learnerIds = learners.map(l => l.id);
      const classIds = learners.map(l => l.class_id);

      // Recent grades
      const { data: results } = await supabase
        .from('results')
        .select('id, marks_obtained, graded_at, status, assessment:assessments(title, total_marks)')
        .in('learner_id', learnerIds)
        .eq('status', 'graded')
        .order('graded_at', { ascending: false })
        .limit(10);

      results?.forEach(r => {
        const a = r.assessment as any;
        const pct = Math.round((r.marks_obtained / a.total_marks) * 100);
        items.push({
          id: `grade-${r.id}`,
          type: 'grade',
          title: `${a.title} graded`,
          description: `Scored ${r.marks_obtained}/${a.total_marks} (${pct}%)`,
          timestamp: r.graded_at!,
          icon: Award,
          color: pct >= 70 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive',
        });
      });

      // Recent attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('id, date, status, notes')
        .in('learner_id', learnerIds)
        .order('date', { ascending: false })
        .limit(10);

      attendance?.forEach(a => {
        items.push({
          id: `att-${a.id}`,
          type: 'attendance',
          title: `Attendance: ${a.status}`,
          description: a.notes || `Marked ${a.status} on ${format(new Date(a.date), 'MMM d')}`,
          timestamp: a.date,
          icon: a.status === 'present' ? CheckCircle : Clock,
          color: a.status === 'present' ? 'text-success' : a.status === 'absent' ? 'text-destructive' : 'text-warning',
        });
      });

      // Recent announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, content, created_at, priority')
        .or(`class_id.is.null,class_id.in.(${classIds.join(',')})`)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      announcements?.forEach(ann => {
        items.push({
          id: `ann-${ann.id}`,
          type: 'announcement',
          title: ann.title,
          description: ann.content.substring(0, 100) + (ann.content.length > 100 ? '...' : ''),
          timestamp: ann.created_at,
          icon: FileText,
          color: ann.priority === 'urgent' ? 'text-destructive' : 'text-primary',
        });
      });

      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  if (children.length === 0 && !loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Activity</h3>
          <p className="text-muted-foreground">No children linked to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Daily Activity Feed</h2>
          <p className="text-muted-foreground">Recent activities for your child</p>
        </div>
        {children.length > 1 && (
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map(c => (
                <SelectItem key={c.user_id} value={c.user_id}>{c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading activities..." />
      ) : activities.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Recent Activity</h3>
            <p className="text-muted-foreground">No recent activities found for this child.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {activities.map(activity => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="relative flex gap-4 pl-2">
                  <div className={`z-10 flex-shrink-0 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <Card className="flex-1 glass-card hover-lift">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
