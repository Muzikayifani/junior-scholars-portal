import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, Edit, Trash2, Calendar } from 'lucide-react';

const AssessmentManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);

  useEffect(() => {
    loadAssessments();
  }, [profile]);

  const loadAssessments = async () => {
    if (!profile) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        class:classes(name, grade_level),
        subject:subjects(name, code)
      `)
      .eq('teacher_id', profile.id)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Assessment Management
          </h2>
          <p className="text-muted-foreground">View and manage your created assessments</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Assessments</CardTitle>
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Edit Assessment"
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
    </div>
  );
};

export default AssessmentManagement;