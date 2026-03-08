import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertCircle, Users, Calendar } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface StudentAttendance {
  learnerId: string;
  userId: string;
  fullName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
}

export default function AttendanceMarking() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingRecords, setExistingRecords] = useState(false);

  useEffect(() => {
    if (!profile?.user_id) return;
    const fetchClasses = async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name, grade_level')
        .eq('teacher_id', profile.user_id)
        .order('name');
      setClasses(data || []);
    };
    fetchClasses();
  }, [profile]);

  const loadStudents = useCallback(async () => {
    if (!selectedClass || !profile?.user_id) return;
    setLoading(true);
    try {
      // Get learners in class with profiles
      const { data: learners, error } = await supabase
        .from('learners')
        .select('id, user_id, profiles!fk_learners_user_id(full_name, first_name, last_name)')
        .eq('class_id', selectedClass)
        .eq('status', 'active');

      if (error) throw error;

      // Check existing attendance for date
      const { data: existing } = await supabase
        .from('attendance')
        .select('learner_id, status, notes')
        .eq('class_id', selectedClass)
        .eq('date', selectedDate);

      const existingMap = new Map(existing?.map(e => [e.learner_id, e]) || []);
      setExistingRecords((existing?.length || 0) > 0);

      const studentList: StudentAttendance[] = (learners || []).map((l: any) => {
        const ex = existingMap.get(l.id);
        const p = l.profiles;
        return {
          learnerId: l.id,
          userId: l.user_id,
          fullName: p?.full_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Unknown',
          status: (ex?.status as any) || 'present',
          notes: ex?.notes || '',
        };
      });

      setStudents(studentList.sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err: any) {
      toast.error('Failed to load students');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedDate, profile]);

  useEffect(() => {
    if (selectedClass) loadStudents();
  }, [selectedClass, selectedDate, loadStudents]);

  const setAllStatus = (status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const updateStudent = (learnerId: string, field: 'status' | 'notes', value: string) => {
    setStudents(prev => prev.map(s => s.learnerId === learnerId ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    if (!profile?.user_id || !selectedClass) return;
    setSaving(true);
    try {
      const records = students.map(s => ({
        class_id: selectedClass,
        learner_id: s.learnerId,
        date: selectedDate,
        status: s.status,
        notes: s.notes || null,
        marked_by: profile.user_id,
      }));

      // Upsert all records
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'class_id,learner_id,date' });

      if (error) throw error;
      toast.success('Attendance saved successfully');
      setExistingRecords(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'absent': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'late': return <Clock className="h-4 w-4 text-warning" />;
      case 'excused': return <AlertCircle className="h-4 w-4 text-info" />;
      default: return null;
    }
  };

  const summary = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    excused: students.filter(s => s.status === 'excused').length,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Mark Attendance
          </CardTitle>
          <CardDescription>Select a class and date to mark attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="sm:w-[180px]"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : selectedClass && students.length > 0 ? (
        <>
          {/* Summary & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3 text-success" />{summary.present} Present</Badge>
            <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3 text-destructive" />{summary.absent} Absent</Badge>
            <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3 text-warning" />{summary.late} Late</Badge>
            <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3 text-info" />{summary.excused} Excused</Badge>
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setAllStatus('present')}>All Present</Button>
              <Button size="sm" variant="outline" onClick={() => setAllStatus('absent')}>All Absent</Button>
            </div>
          </div>

          {/* Student List */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              {students.map(student => (
                <div key={student.learnerId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  {statusIcon(student.status)}
                  <span className="font-medium text-sm flex-1 min-w-0 truncate">{student.fullName}</span>
                  <Select value={student.status} onValueChange={v => updateStudent(student.learnerId, 'status', v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="excused">Excused</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Notes..."
                    value={student.notes}
                    onChange={e => updateStudent(student.learnerId, 'notes', e.target.value)}
                    className="w-[140px] h-8 text-xs hidden sm:block"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {existingRecords && (
              <p className="text-sm text-muted-foreground self-center mr-auto">
                <Calendar className="h-3 w-3 inline mr-1" />
                Attendance already recorded for this date — saving will update it.
              </p>
            )}
            <Button onClick={handleSave} disabled={saving} className="btn-gradient">
              {saving ? 'Saving...' : existingRecords ? 'Update Attendance' : 'Save Attendance'}
            </Button>
          </div>
        </>
      ) : selectedClass ? (
        <Card className="text-center py-8">
          <CardContent>
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No students enrolled in this class</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}