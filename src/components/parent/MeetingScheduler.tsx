import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calendar, Clock, Plus, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Meeting {
  id: string;
  parent_user_id: string;
  teacher_user_id: string;
  child_user_id: string;
  subject: string | null;
  message: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  teacher_notes: string | null;
  created_at: string;
}

interface TeacherInfo {
  user_id: string;
  full_name: string;
}

interface ChildInfo {
  user_id: string;
  full_name: string;
}

const MeetingScheduler = () => {
  const { profile } = useAuth();
  const isTeacher = profile?.role === 'teacher';
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // For teacher: respond dialog
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [respondMeeting, setRespondMeeting] = useState<Meeting | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');

  const fetchMeetings = useCallback(async () => {
    if (!profile?.user_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id]);

  const fetchTeachersAndChildren = useCallback(async () => {
    if (!profile?.user_id || isTeacher) return;

    // Fetch children
    const { data: rels } = await supabase
      .from('parent_child_relationships')
      .select('child_user_id, child:profiles!parent_child_relationships_child_user_id_fkey(user_id, full_name)')
      .eq('parent_user_id', profile.user_id);

    if (rels) {
      setChildren(rels.map((r: any) => r.child as ChildInfo));

      // Get teachers from children's classes
      const childIds = rels.map((r: any) => r.child_user_id);
      if (childIds.length > 0) {
        const { data: learners } = await supabase
          .from('learners')
          .select('class_id')
          .in('user_id', childIds);

        if (learners && learners.length > 0) {
          const classIds = [...new Set(learners.map(l => l.class_id))];
          const { data: classes } = await supabase
            .from('classes')
            .select('teacher_id')
            .in('id', classIds);

          if (classes) {
            const teacherIds = [...new Set(classes.map(c => c.teacher_id).filter(Boolean))] as string[];
            const teacherProfiles: TeacherInfo[] = [];
            for (const tid of teacherIds) {
              const { data } = await supabase.rpc('get_basic_profile_info', { profile_user_id: tid });
              if (data && data.length > 0) {
                teacherProfiles.push({ user_id: data[0].user_id, full_name: data[0].full_name || 'Unknown' });
              }
            }
            setTeachers(teacherProfiles);
          }
        }
      }
    }
  }, [profile?.user_id, isTeacher]);

  useEffect(() => {
    fetchMeetings();
    fetchTeachersAndChildren();
  }, [fetchMeetings, fetchTeachersAndChildren]);

  const handleRequestMeeting = async () => {
    if (!selectedTeacher || !selectedChild) {
      toast.error('Please select a teacher and child');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('meetings').insert({
        parent_user_id: profile!.user_id,
        teacher_user_id: selectedTeacher,
        child_user_id: selectedChild,
        subject: subject || null,
        message: message || null,
      });
      if (error) throw error;
      toast.success('Meeting request sent!');
      setDialogOpen(false);
      setSelectedTeacher('');
      setSelectedChild('');
      setSubject('');
      setMessage('');
      fetchMeetings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (status: 'approved' | 'declined') => {
    if (!respondMeeting) return;
    setSubmitting(true);
    try {
      const updates: any = { status };
      if (status === 'approved') {
        if (!scheduledDate || !scheduledTime) {
          toast.error('Please set a date and time');
          setSubmitting(false);
          return;
        }
        updates.scheduled_date = scheduledDate;
        updates.scheduled_time = scheduledTime;
      }
      if (teacherNotes) updates.teacher_notes = teacherNotes;

      const { error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', respondMeeting.id);

      if (error) throw error;
      toast.success(`Meeting ${status}`);
      setRespondDialogOpen(false);
      setRespondMeeting(null);
      setScheduledDate('');
      setScheduledTime('');
      setTeacherNotes('');
      fetchMeetings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: AlertCircle, color: 'bg-warning text-warning-foreground', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'bg-success text-success-foreground', label: 'Approved' },
    declined: { icon: XCircle, color: 'bg-destructive text-destructive-foreground', label: 'Declined' },
  };

  if (loading) return <LoadingSpinner text="Loading meetings..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Parent-Teacher Meetings</h2>
          <p className="text-muted-foreground">
            {isTeacher ? 'Manage meeting requests from parents' : 'Request meetings with your children\'s teachers'}
          </p>
        </div>
        {!isTeacher && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Request Meeting</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Child</Label>
                  <Select value={selectedChild} onValueChange={setSelectedChild}>
                    <SelectTrigger><SelectValue placeholder="Choose child" /></SelectTrigger>
                    <SelectContent>
                      {children.map(c => (
                        <SelectItem key={c.user_id} value={c.user_id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Teacher</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger><SelectValue placeholder="Choose teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Academic progress" />
                </div>
                <div>
                  <Label>Message (optional)</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Any details..." />
                </div>
                <Button onClick={handleRequestMeeting} disabled={submitting} className="w-full">
                  {submitting ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {meetings.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Meetings</h3>
            <p className="text-muted-foreground text-center">
              {isTeacher ? 'No meeting requests yet.' : 'You haven\'t requested any meetings yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {meetings.map(meeting => {
            const sc = statusConfig[meeting.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <Card key={meeting.id} className="glass-card hover-lift">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{meeting.subject || 'Meeting Request'}</CardTitle>
                    <Badge className={sc.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {sc.label}
                    </Badge>
                  </div>
                  <CardDescription>
                    Requested {format(new Date(meeting.created_at), 'MMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {meeting.message && (
                    <p className="text-sm text-muted-foreground">{meeting.message}</p>
                  )}
                  {meeting.scheduled_date && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        {format(new Date(meeting.scheduled_date), 'EEEE, MMM d, yyyy')}
                      </div>
                      {meeting.scheduled_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-primary" />
                          {meeting.scheduled_time}
                        </div>
                      )}
                    </div>
                  )}
                  {meeting.teacher_notes && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Teacher's Notes</p>
                      <p className="text-sm">{meeting.teacher_notes}</p>
                    </div>
                  )}
                  {isTeacher && meeting.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setRespondMeeting(meeting);
                          setRespondDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />Approve & Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRespondMeeting(meeting);
                          handleRespond('declined');
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Teacher respond dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={teacherNotes} onChange={e => setTeacherNotes(e.target.value)} placeholder="Meeting location, preparation needed..." />
            </div>
            <Button onClick={() => handleRespond('approved')} disabled={submitting} className="w-full">
              {submitting ? 'Scheduling...' : 'Approve & Schedule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingScheduler;
