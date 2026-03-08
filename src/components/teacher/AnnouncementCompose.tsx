import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AnnouncementCompose() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    classId: 'all',
    priority: 'normal',
  });

  useEffect(() => {
    if (!profile?.user_id) return;
    const load = async () => {
      setLoading(true);
      const [classesRes, announcementsRes] = await Promise.all([
        supabase.from('classes').select('id, name').eq('teacher_id', profile.user_id).order('name'),
        supabase.from('announcements').select('*').eq('teacher_id', profile.user_id).order('created_at', { ascending: false }).limit(20),
      ]);
      setClasses(classesRes.data || []);
      setAnnouncements(announcementsRes.data || []);
      setLoading(false);
    };
    load();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.user_id || !form.title.trim() || !form.content.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.from('announcements').insert({
        title: form.title.trim(),
        content: form.content.trim(),
        class_id: form.classId === 'all' ? null : form.classId,
        teacher_id: profile.user_id,
        priority: form.priority,
      }).select().single();

      if (error) throw error;
      toast.success('Announcement published!');
      setAnnouncements(prev => [data, ...prev]);
      setForm({ title: '', content: '', classId: 'all', priority: 'normal' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish announcement');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast.success('Announcement deleted');
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            New Announcement
          </CardTitle>
          <CardDescription>Broadcast to your classes or all students</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Announcement title"
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-content">Message</Label>
              <Textarea
                id="ann-content"
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your announcement..."
                required
                rows={4}
                maxLength={2000}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="space-y-2 flex-1">
                <Label>Target</Label>
                <Select value={form.classId} onValueChange={v => setForm(prev => ({ ...prev, classId: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={sending} className="btn-gradient">
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Publishing...' : 'Publish Announcement'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Previous announcements */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Previous Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className="p-3 rounded-lg bg-muted/30 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{a.title}</p>
                      <Badge variant={priorityColor(a.priority) as any} className="text-xs">{a.priority}</Badge>
                      {a.class_id ? (
                        <Badge variant="outline" className="text-xs">{classes.find(c => c.id === a.class_id)?.name || 'Class'}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">All Classes</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}