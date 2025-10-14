import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, Edit, Trash2, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AssessmentManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadAssessments();
    if (profile?.role === 'teacher') {
      loadClassesAndSubjects();
    }
  }, [profile]);

  const loadClassesAndSubjects = async () => {
    if (!profile?.user_id) return;
    
    try {
      const [classesResult, subjectsResult] = await Promise.all([
        supabase.from('classes').select('*').eq('teacher_id', profile.user_id),
        supabase.from('subjects').select('*')
      ]);
      
      if (classesResult.error) throw classesResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      
      setClasses(classesResult.data || []);
      setSubjects(subjectsResult.data || []);
    } catch (error: any) {
      console.error('Error loading classes and subjects:', error);
    }
  };

  const loadAssessments = async () => {
    if (!profile) return;
    
    setLoading(true);
    
    try {
      if (profile.role === 'teacher') {
        // Teachers see assessments they created
        const { data, error } = await supabase
          .from('assessments')
          .select(`
            *,
            class:classes(name, grade_level),
            subject:subjects(name, code)
          `)
          .eq('teacher_id', profile.user_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAssessments(data || []);

      } else if (profile.role === 'learner') {
        // First get the learner's class_id
        const { data: learnerData, error: learnerError } = await supabase
          .from('learners')
          .select('class_id')
          .eq('user_id', profile.user_id)
          .single();

        if (learnerError) throw learnerError;
        
        if (learnerData?.class_id) {
          // Then get assessments for that class
          const { data, error } = await supabase
            .from('assessments')
            .select(`
              *,
              class:classes(name, grade_level),
              subject:subjects(name, code),
              results(status, marks_obtained, submitted_at)
            `)
            .eq('class_id', learnerData.class_id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setAssessments(data || []);
        }

      } else if (profile.role === 'parent') {
        // First get children's class_ids
        const { data: childrenData, error: childrenError } = await supabase
          .from('learners')
          .select('class_id')
          .eq('user_id', profile.user_id);

        if (childrenError) throw childrenError;
        
        if (childrenData && childrenData.length > 0) {
          const classIds = childrenData.map(child => child.class_id);
          
          // Then get assessments for those classes
          const { data, error } = await supabase
            .from('assessments')
            .select(`
              *,
              class:classes(name, grade_level),
              subject:subjects(name, code),
              results(status, marks_obtained, submitted_at)
            `)
            .in('class_id', classIds)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setAssessments(data || []);
        }
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', assessmentId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Assessment deleted successfully!",
      });
      loadAssessments();
    }
    setLoading(false);
  };

  const getStatusBadge = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    
    if (due < now) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (due.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return <Badge variant="secondary">Due Soon</Badge>;
    } else {
      return <Badge variant="outline">Active</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = (assessment: any) => {
    setSelectedAssessment(assessment);
    setViewDialogOpen(true);
  };

  const handleEditAssessment = (assessment: any) => {
    setSelectedAssessment(assessment);
    setEditDialogOpen(true);
  };

  const handleUpdateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment || !profile) return;
    
    setEditLoading(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as string,
      class_id: formData.get('class_id') as string,
      subject_id: formData.get('subject_id') as string,
      total_marks: parseInt(formData.get('total_marks') as string) || 100,
      due_date: formData.get('due_date') as string,
    };

    const { error } = await supabase
      .from('assessments')
      .update(data)
      .eq('id', selectedAssessment.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Assessment updated successfully!",
      });
      setEditDialogOpen(false);
      loadAssessments();
    }
    
    setEditLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Assessment Management
          </h2>
          <p className="text-muted-foreground">View assessments {profile?.role === 'teacher' ? 'you created' : 'assigned to you'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{profile?.role === 'teacher' ? 'Created Assessments' : 'Your Assessments'}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading assessments...</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assessments created yet.</p>
              <p className="text-sm">Create your first assessment in the "Create" tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assessment.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {assessment.class?.name} (Grade {assessment.class?.grade_level})
                      </TableCell>
                      <TableCell>{assessment.subject?.name}</TableCell>
                      <TableCell className="text-center">{assessment.total_marks}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(assessment.due_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {assessment.due_date && getStatusBadge(assessment.due_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            title="View Details"
                            onClick={() => handleViewDetails(assessment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {profile?.role === 'teacher' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Edit Assessment"
                                onClick={() => handleEditAssessment(assessment)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteAssessment(assessment.id)}
                                title="Delete Assessment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Assessment Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this assessment
            </DialogDescription>
          </DialogHeader>
          
          {selectedAssessment && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{selectedAssessment.title}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Type</Label>
                  <div>
                    <Badge variant="outline">{selectedAssessment.type}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Class</Label>
                  <p className="font-medium">
                    {selectedAssessment.class?.name} (Grade {selectedAssessment.class?.grade_level})
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Subject</Label>
                  <p className="font-medium">{selectedAssessment.subject?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Total Marks</Label>
                  <p className="font-medium">{selectedAssessment.total_marks}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Due Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {selectedAssessment.due_date ? formatDateTime(selectedAssessment.due_date) : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <div>
                  {selectedAssessment.due_date && getStatusBadge(selectedAssessment.due_date)}
                </div>
              </div>

              {selectedAssessment.description && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                    {selectedAssessment.description}
                  </p>
                </div>
              )}

              {selectedAssessment.instructions && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Instructions</Label>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                    {selectedAssessment.instructions}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="text-sm">{formatDateTime(selectedAssessment.created_at)}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p className="text-sm">{formatDateTime(selectedAssessment.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Assessment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Assessment
            </DialogTitle>
            <DialogDescription>
              Update the assessment details below
            </DialogDescription>
          </DialogHeader>
          
          {selectedAssessment && (
            <form onSubmit={handleUpdateAssessment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={selectedAssessment.title}
                    placeholder="Assessment title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select name="type" defaultValue={selectedAssessment.type} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-class">Class</Label>
                  <Select name="class_id" defaultValue={selectedAssessment.class_id} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} (Grade {cls.grade_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-subject">Subject</Label>
                  <Select name="subject_id" defaultValue={selectedAssessment.subject_id} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-total-marks">Total Marks</Label>
                  <Input
                    id="edit-total-marks"
                    name="total_marks"
                    type="number"
                    defaultValue={selectedAssessment.total_marks}
                    min="1"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-due-date">Due Date</Label>
                  <Input
                    id="edit-due-date"
                    name="due_date"
                    type="datetime-local"
                    defaultValue={selectedAssessment.due_date ? new Date(selectedAssessment.due_date).toISOString().slice(0, 16) : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={selectedAssessment.description || ''}
                  placeholder="Assessment description and instructions"
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? "Updating..." : "Update Assessment"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentManagement;