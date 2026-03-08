import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';

const DAYS = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
];

const TIME_SLOTS = [
  '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
];

const TimetableBuilder = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDay, setDialogDay] = useState(1);
  const [form, setForm] = useState({
    class_id: '',
    subject_id: '',
    start_time: '',
    end_time: '',
    room: '',
  });

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    const [classesRes, subjectsRes, scheduleRes] = await Promise.all([
      supabase.from('classes').select('*').eq('teacher_id', profile.user_id).order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('class_schedule').select(`
        id, day_of_week, start_time, end_time, room,
        class:classes(id, name, grade_level),
        subject:subjects(id, name, code)
      `).eq('teacher_id', profile.user_id).order('start_time'),
    ]);
    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setSchedule(scheduleRes.data || []);
    setLoading(false);
  };

  const filteredSchedule = selectedClass
    ? schedule.filter(s => s.class?.id === selectedClass)
    : schedule;

  const getEntriesForDay = (day: number) =>
    filteredSchedule
      .filter(s => s.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const openAddDialog = (day: number) => {
    setDialogDay(day);
    setForm({ class_id: selectedClass || '', subject_id: '', start_time: '', end_time: '', room: '' });
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!profile || !form.class_id || !form.subject_id || !form.start_time || !form.end_time) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('class_schedule').insert({
      teacher_id: profile.user_id,
      class_id: form.class_id,
      subject_id: form.subject_id,
      day_of_week: dialogDay,
      start_time: form.start_time,
      end_time: form.end_time,
      room: form.room || null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Period added' });
      setDialogOpen(false);
      loadData();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('class_schedule').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Period removed' });
      loadData();
    }
  };

  const getSubjectColor = (subjectName: string) => {
    const colors = [
      'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
      'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300',
      'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300',
      'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300',
      'bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-300',
      'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300',
      'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300',
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Timetable Builder
          </h2>
          <p className="text-muted-foreground">Visual weekly schedule for your classes</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} (Grade {c.grade_level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading timetable...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAYS.map(day => {
            const entries = getEntriesForDay(day.value);
            return (
              <Card key={day.value} className="glass-card">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    {day.label}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openAddDialog(day.value)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No periods</p>
                  ) : (
                    entries.map(entry => (
                      <div
                        key={entry.id}
                        className={`p-2.5 rounded-lg border text-xs group relative ${getSubjectColor(entry.subject?.name || '')}`}
                      >
                        <div className="font-semibold truncate">{entry.subject?.name}</div>
                        <div className="flex items-center gap-1 mt-1 opacity-80">
                          <Clock className="h-3 w-3" />
                          {entry.start_time?.slice(0, 5)} - {entry.end_time?.slice(0, 5)}
                        </div>
                        {!selectedClass && (
                          <div className="mt-1 opacity-70 truncate">{entry.class?.name}</div>
                        )}
                        {entry.room && <div className="mt-0.5 opacity-60">Room: {entry.room}</div>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Period Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Period — {DAYS.find(d => d.value === dialogDay)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={form.class_id} onValueChange={v => setForm({ ...form, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} (Grade {c.grade_level})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={form.subject_id} onValueChange={v => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Select value={form.start_time} onValueChange={v => setForm({ ...form, start_time: v })}>
                  <SelectTrigger><SelectValue placeholder="Start" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Select value={form.end_time} onValueChange={v => setForm({ ...form, end_time: v })}>
                  <SelectTrigger><SelectValue placeholder="End" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Room (optional)</Label>
              <Input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 201" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={loading} className="flex-1 btn-gradient">
                {loading ? 'Adding...' : 'Add Period'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimetableBuilder;
