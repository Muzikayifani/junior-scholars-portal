import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Save, CheckCircle, Filter, Download } from 'lucide-react';

interface GradeEntry {
  resultId: string;
  learnerId: string;
  studentName: string;
  studentNumber: string;
  currentMarks: number | null;
  newMarks: string;
  feedback: string;
  status: string;
  submissionPath: string | null;
}

const BulkGrading = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [selectedAssessmentData, setSelectedAssessmentData] = useState<any>(null);

  useEffect(() => {
    if (profile) loadAssessments();
  }, [profile]);

  useEffect(() => {
    if (selectedAssessment) loadSubmissions();
  }, [selectedAssessment]);

  const loadAssessments = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('assessments')
      .select('*, class:classes(name, grade_level), subject:subjects(name, code)')
      .eq('teacher_id', profile.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setAssessments(data || []);
    }
  };

  const loadSubmissions = async () => {
    setLoading(true);
    const assessment = assessments.find(a => a.id === selectedAssessment);
    setSelectedAssessmentData(assessment);

    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        learner:learners(
          id, student_number,
          profile:profiles(first_name, last_name, full_name)
        )
      `)
      .eq('assessment_id', selectedAssessment)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setGradeEntries(
        (data || []).map((s: any) => ({
          resultId: s.id,
          learnerId: s.learner_id,
          studentName: s.learner?.profile?.full_name ||
            `${s.learner?.profile?.first_name || ''} ${s.learner?.profile?.last_name || ''}`.trim() ||
            'Unknown',
          studentNumber: s.learner?.student_number || '',
          currentMarks: s.marks_obtained,
          newMarks: s.status === 'graded' ? s.marks_obtained?.toString() || '' : '',
          feedback: s.feedback || '',
          status: s.status || 'pending',
          submissionPath: s.submission_path,
        }))
      );
    }
    setLoading(false);
  };

  const updateEntry = (index: number, field: 'newMarks' | 'feedback', value: string) => {
    setGradeEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveAll = async () => {
    const toGrade = gradeEntries.filter(e => e.newMarks !== '');
    if (toGrade.length === 0) {
      toast({ title: 'Nothing to save', description: 'Enter marks for at least one student.', variant: 'destructive' });
      return;
    }

    const totalMarks = selectedAssessmentData?.total_marks || 100;
    const invalid = toGrade.find(e => {
      const m = parseInt(e.newMarks);
      return isNaN(m) || m < 0 || m > totalMarks;
    });
    if (invalid) {
      toast({ title: 'Invalid marks', description: `Marks must be between 0 and ${totalMarks}.`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const entry of toGrade) {
      const { error } = await supabase
        .from('results')
        .update({
          marks_obtained: parseInt(entry.newMarks),
          feedback: entry.feedback || null,
          status: 'graded',
          graded_at: new Date().toISOString(),
        })
        .eq('id', entry.resultId);

      if (error) errorCount++;
      else successCount++;
    }

    setSaving(false);
    toast({
      title: errorCount === 0 ? 'All grades saved!' : 'Partially saved',
      description: `${successCount} graded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      variant: errorCount > 0 ? 'destructive' : 'default',
    });

    if (successCount > 0) loadSubmissions();
  };

  const handleDownload = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('submissions').download(path);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'submission';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
    }
  };

  const pendingCount = gradeEntries.filter(e => e.status !== 'graded').length;
  const gradedCount = gradeEntries.filter(e => e.status === 'graded').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Bulk Grading
        </h2>
        <p className="text-muted-foreground">Grade all students for an assessment at once</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Select Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Assessment</Label>
            <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an assessment..." />
              </SelectTrigger>
              <SelectContent>
                {assessments.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title} — {a.class?.name} ({a.subject?.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedAssessment && (
        <Card className="glass-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>{selectedAssessmentData?.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedAssessmentData?.class?.name} • {selectedAssessmentData?.subject?.name} •
                Total: {selectedAssessmentData?.total_marks} marks
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{pendingCount} pending</Badge>
                <Badge variant="default">{gradedCount} graded</Badge>
              </div>
            </div>
            <Button onClick={handleSaveAll} disabled={saving || loading} className="btn-gradient w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save All Grades'}
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading submissions...</p>
              </div>
            ) : gradeEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No submissions found for this assessment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead className="w-[120px]">Marks (/{selectedAssessmentData?.total_marks})</TableHead>
                      <TableHead className="w-[200px]">Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeEntries.map((entry, i) => (
                      <TableRow key={entry.resultId}>
                        <TableCell className="font-medium">{entry.studentName}</TableCell>
                        <TableCell>{entry.studentNumber}</TableCell>
                        <TableCell>
                          {entry.status === 'graded' ? (
                            <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Graded</Badge>
                          ) : (
                            <Badge variant="secondary">{entry.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.submissionPath ? (
                            <Button variant="ghost" size="sm" onClick={() => handleDownload(entry.submissionPath!)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={selectedAssessmentData?.total_marks}
                            value={entry.newMarks}
                            onChange={e => updateEntry(i, 'newMarks', e.target.value)}
                            placeholder="0"
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={entry.feedback}
                            onChange={e => updateEntry(i, 'feedback', e.target.value)}
                            placeholder="Optional feedback"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkGrading;
