import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Clock, CheckCircle, Edit, Filter, Download } from 'lucide-react';

const GradeManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [gradeForm, setGradeForm] = useState({
    marks_obtained: '',
    feedback: ''
  });

  useEffect(() => {
    loadAssessments();
  }, [profile]);

  useEffect(() => {
    if (selectedAssessment) {
      loadSubmissions();
    }
  }, [selectedAssessment]);

  const loadAssessments = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        class:classes(name, grade_level),
        subject:subjects(name, code)
      `)
      .eq('teacher_id', profile.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setAssessments(data || []);
    }
  };

  const loadSubmissions = async () => {
    if (!selectedAssessment) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        learner:learners(
          id,
          student_number,
          Student FullName,
          profile:profiles(first_name, last_name, email)
        )
      `)
      .eq('assessment_id', selectedAssessment)
      .order('submitted_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingResult) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('results')
      .update({
        marks_obtained: parseInt(gradeForm.marks_obtained),
        feedback: gradeForm.feedback,
        status: 'graded',
        graded_at: new Date().toISOString()
      })
      .eq('id', gradingResult.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Submission graded successfully!",
      });
      setGradingResult(null);
      setGradeForm({ marks_obtained: '', feedback: '' });
      loadSubmissions();
    }
    setLoading(false);
  };

  const openGradingDialog = (result: any) => {
    setGradingResult(result);
    setGradeForm({
      marks_obtained: result.marks_obtained?.toString() || '',
      feedback: result.feedback || ''
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'submitted':
        return <Badge variant="outline"><Edit className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'graded':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Graded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not submitted';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedAssessmentData = assessments.find(a => a.id === selectedAssessment);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Grade Management
          </h2>
          <p className="text-muted-foreground">Grade student submissions and provide feedback</p>
        </div>
      </div>

      {/* Assessment Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Select Assessment to Grade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assessment">Assessment</Label>
              <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an assessment to grade" />
                </SelectTrigger>
                <SelectContent>
                  {assessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id}>
                      {assessment.title} - {assessment.class?.name} ({assessment.subject?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      {selectedAssessment && (
        <Card>
          <CardHeader>
            <CardTitle>
              Submissions for: {selectedAssessmentData?.title}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedAssessmentData?.class?.name} • {selectedAssessmentData?.subject?.name} • 
              Total Marks: {selectedAssessmentData?.total_marks}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
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
                      <TableHead>Student Number</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.learner?.['Student FullName'] || 
                           `${submission.learner?.profile?.first_name} ${submission.learner?.profile?.last_name}`}
                        </TableCell>
                        <TableCell>{submission.learner?.student_number}</TableCell>
                        <TableCell>{formatDate(submission.submitted_at)}</TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>
                          {submission.marks_obtained !== null ? 
                            `${submission.marks_obtained}/${selectedAssessmentData?.total_marks}` : 
                            'Not graded'}
                        </TableCell>
                        <TableCell>
                          {submission.marks_obtained !== null ? 
                            `${Math.round((submission.marks_obtained / selectedAssessmentData?.total_marks) * 100)}%` : 
                            'N/A'}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant={submission.status === 'graded' ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => openGradingDialog(submission)}
                              >
                                {submission.status === 'graded' ? 'Edit Grade' : 'Grade'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>
                                  Grade Submission
                                </DialogTitle>
                                <div className="text-sm text-muted-foreground">
                                  Student: {submission.learner?.['Student FullName'] || 
                                    `${submission.learner?.profile?.first_name} ${submission.learner?.profile?.last_name}`}
                                </div>
                              </DialogHeader>
                              <form onSubmit={handleGradeSubmission} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="marks_obtained">
                                    Marks Obtained (out of {selectedAssessmentData?.total_marks})
                                  </Label>
                                  <Input
                                    id="marks_obtained"
                                    type="number"
                                    min="0"
                                    max={selectedAssessmentData?.total_marks}
                                    value={gradeForm.marks_obtained}
                                    onChange={(e) => setGradeForm({...gradeForm, marks_obtained: e.target.value})}
                                    required
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="feedback">Feedback (Optional)</Label>
                                  <Textarea
                                    id="feedback"
                                    value={gradeForm.feedback}
                                    onChange={(e) => setGradeForm({...gradeForm, feedback: e.target.value})}
                                    placeholder="Provide constructive feedback for the student..."
                                    rows={4}
                                  />
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button type="submit" disabled={loading}>
                                    {loading ? "Saving..." : "Save Grade"}
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setGradingResult(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
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

export default GradeManagement;