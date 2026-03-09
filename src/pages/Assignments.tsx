import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Calendar, Clock, CheckCircle, AlertCircle, BookOpen, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AssignmentDetailsDialog } from '@/components/learner/AssignmentDetailsDialog';
import { FileUploadDialog } from '@/components/learner/FileUploadDialog';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useIsMobile } from '@/hooks/use-mobile';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  total_marks: number;
  type: string;
  subject_name?: string;
  class_name?: string;
  teacher_name?: string;
  status?: 'pending' | 'submitted' | 'graded';
  marks_obtained?: number;
  submitted_at?: string;
}

export default function Assignments() {
  const { profile, user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const childUserId = searchParams.get('child');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [childName, setChildName] = useState<string>('');

  const fetchAssignments = useCallback(async () => {
    if (!profile || !user) return;
    try {
      setLoading(true);
      
      // If parent is viewing a specific child's assignments
      if (profile?.role === 'parent' && childUserId) {
        // Get child's name
        const { data: childProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', childUserId)
          .single();
        
        if (childProfile) setChildName(childProfile.full_name || 'Child');

        // Get child's learner record
        const { data: learnerData, error: learnerError } = await supabase
          .from('learners')
          .select('id, class_id')
          .eq('user_id', childUserId)
          .maybeSingle();

        if (learnerError) throw learnerError;
        if (!learnerData?.class_id) {
          setAssignments([]);
          return;
        }
        
        const { data, error } = await supabase
          .from('assessments')
          .select(`
            id,
            title,
            description,
            due_date,
            total_marks,
            type,
            subjects (name),
            classes (name),
            results!results_assessment_id_fkey (
              status,
              marks_obtained,
              submitted_at,
              learner_id
            )
          `)
          .eq('class_id', learnerData.class_id)
          .eq('is_published', true)
          .order('due_date', { ascending: true });

        if (error) throw error;
        
        const formattedData = data?.map(item => {
          const childResult = (item.results as any[])?.find(r => r.learner_id === learnerData.id);
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            due_date: item.due_date,
            total_marks: item.total_marks,
            type: item.type,
            subject_name: item.subjects?.name,
            class_name: item.classes?.name,
            status: (childResult?.status as 'pending' | 'submitted' | 'graded') || 'pending',
            marks_obtained: childResult?.marks_obtained,
            submitted_at: childResult?.submitted_at
          };
        }) || [];
        
        setAssignments(formattedData);
        return;
      }
      
      if (profile?.role === 'teacher') {
        // Teachers see all assessments they've created
        const { data, error } = await supabase
          .from('assessments')
          .select(`
            id,
            title,
            description,
            due_date,
            total_marks,
            type,
            subjects (name),
            classes (name)
          `)
          .eq('teacher_id', profile.user_id)
          .order('due_date', { ascending: true });

        if (error) throw error;
        
        const formattedData = data?.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          due_date: item.due_date,
          total_marks: item.total_marks,
          type: item.type,
          subject_name: item.subjects?.name,
          class_name: item.classes?.name
        })) || [];
        
        setAssignments(formattedData);
      } else if (profile?.role === 'learner') {
        // Learners see assessments for their class with their results
        const { data: learnerData, error: learnerError } = await supabase
          .from('learners')
          .select('id, class_id')
          .eq('user_id', profile.user_id)
          .single();

        if (learnerError) throw learnerError;
        
        if (learnerData?.class_id) {
          const { data, error } = await supabase
            .from('assessments')
            .select(`
              id,
              title,
              description,
              due_date,
              total_marks,
              type,
              is_published,
              subjects (name),
              classes (name),
              results!results_assessment_id_fkey (
                status,
                marks_obtained,
                submitted_at
              )
            `)
            .eq('class_id', learnerData.class_id)
            .eq('is_published', true)
            .order('due_date', { ascending: true });

          if (error) throw error;
          
          const formattedData = data?.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            due_date: item.due_date,
            total_marks: item.total_marks,
            type: item.type,
            subject_name: item.subjects?.name,
            class_name: item.classes?.name,
            status: (item.results?.[0]?.status as 'pending' | 'submitted' | 'graded') || 'pending',
            marks_obtained: item.results?.[0]?.marks_obtained,
            submitted_at: item.results?.[0]?.submitted_at
          })) || [];
          
          setAssignments(formattedData);
        }
      } else if (profile?.role === 'parent') {
        // Parents see their children's assignments - simplified query
        const { data, error } = await supabase
          .from('assessments')
          .select(`
            id,
            title,
            description,
            due_date,
            total_marks,
            type,
            subjects (name),
            classes (name)
          `)
          .order('due_date', { ascending: true });

          if (error) throw error;
          
          const formattedData = data?.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            due_date: item.due_date,
            total_marks: item.total_marks,
            type: item.type,
            subject_name: item.subjects?.name,
            class_name: item.classes?.name
          })) || [];
          
          setAssignments(formattedData);
      }
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, user, childUserId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleRefresh = useCallback(async () => {
    await fetchAssignments();
    toast({ title: 'Refreshed', description: 'Assignments updated' });
  }, [fetchAssignments, toast]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'graded':
        return <CheckCircle className="h-4 w-4 text-info" />;
      default:
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status?: string, dueDate?: string) => {
    if (status === 'graded') return <Badge className="bg-info text-info-foreground">Graded</Badge>;
    if (status === 'submitted') return <Badge className="bg-success text-success-foreground">Submitted</Badge>;
    
    if (dueDate) {
      const isOverdue = new Date(dueDate) < new Date();
      return (
        <Badge variant={isOverdue ? "destructive" : "secondary"}>
          {isOverdue ? "Overdue" : "Pending"}
        </Badge>
      );
    }
    
    return <Badge variant="secondary">Pending</Badge>;
  };

  const pendingAssignments = assignments.filter(a => a.status === 'pending' || !a.status);
  const submittedAssignments = assignments.filter(a => a.status === 'submitted');
  const gradedAssignments = assignments.filter(a => a.status === 'graded');

  const renderAssignmentCard = (assignment: Assignment) => (
    <Card key={assignment.id} className="hover-lift">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{assignment.title}</CardTitle>
            <CardDescription className="mt-1">
              {assignment.subject_name} • {assignment.class_name}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getStatusBadge(assignment.status, assignment.due_date)}
            <Badge variant="outline" className="text-xs">
              {assignment.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignment.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {assignment.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {assignment.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{assignment.total_marks} marks</span>
          </div>
        </div>
        
        {assignment.status === 'graded' && assignment.marks_obtained !== undefined && (
          <div className="flex items-center gap-2 p-3 bg-info/10 rounded-lg">
            <CheckCircle className="h-4 w-4 text-info" />
            <span className="text-sm font-medium">
              Score: {assignment.marks_obtained}/{assignment.total_marks} 
              ({Math.round((assignment.marks_obtained / assignment.total_marks) * 100)}%)
            </span>
          </div>
        )}
        
        {assignment.submitted_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Submitted: {format(new Date(assignment.submitted_at), 'MMM d, yyyy h:mm a')}</span>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => handleViewDetails(assignment)}
          >
            View Details
          </Button>
          {profile?.role === 'learner' && (!assignment.status || assignment.status === 'pending') && (
            <Button 
              size="sm" 
              className="flex-1 btn-gradient" 
              onClick={() => handleSubmitClick(assignment)}
            >
              Submit Work
            </Button>
          )}
          {profile?.role === 'teacher' && (
            <Button size="sm" className="flex-1 btn-gradient">
              Manage
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const handleUpload = async (file: File) => {
    if (!user || !profile || !selectedAssignment) return;
    
    setIsUploading(true);
    try {
      // Get learner id for current user
      const { data: learner, error: learnerErr } = await supabase
        .from('learners')
        .select('id')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      
      if (learnerErr) throw learnerErr;
      if (!learner) throw new Error('No learner record found for your profile');

      // Create file path with user ID and assignment ID
      const path = `${user.id}/${selectedAssignment.id}/${Date.now()}_${file.name}`;
      
      // Upload file to storage
      const { error: uploadErr } = await supabase.storage
        .from('submissions')
        .upload(path, file, {
          upsert: false,
          cacheControl: '3600',
        });
      
      if (uploadErr) throw uploadErr;

      // Update or create result record
      const payload = {
        assessment_id: selectedAssignment.id,
        learner_id: learner.id,
        status: 'submitted' as any,
        submitted_at: new Date().toISOString(),
        submission_path: path,
      };

      const { error: upsertErr } = await supabase
        .from('results')
        .upsert(payload, { onConflict: 'assessment_id,learner_id' });
      
      if (upsertErr) throw upsertErr;

      toast({ 
        title: 'Submitted successfully',
        description: 'Your assignment has been submitted.'
      });
      
      setUploadOpen(false);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (e: any) {
      console.error('Upload error:', e);
      toast({ 
        title: 'Submission failed', 
        description: e.message, 
        variant: 'destructive' 
      });
      throw e; // Re-throw to be handled by FileUploadDialog
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDetails = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setDetailsOpen(true);
  };

  const handleSubmitClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setUploadOpen(true);
  };

  const handleSubmitFromDetails = () => {
    setDetailsOpen(false);
    setUploadOpen(true);
  };

  const content = (
    <div className="animate-fade-in p-3 sm:p-6 space-y-6">
      {childUserId && profile?.role === 'parent' && (
        <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Children
        </Button>
      )}

      <div className="flex items-center gap-2 mb-6">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {profile?.role === 'teacher' ? 'My Assessments' : childUserId && childName ? `${childName}'s Assignments` : 'Assignments'}
          </h1>
          <p className="text-muted-foreground">
            {profile?.role === 'teacher' 
              ? 'Manage and track your assessments'
              : profile?.role === 'parent'
              ? childUserId ? 'Track assignments and submissions' : 'Track your children\'s assignments'
              : 'Your assignments and submissions'
            }
          </p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Assignments Found</h3>
            <p className="text-muted-foreground mb-4">
              {profile?.role === 'teacher' 
                ? "You haven't created any assessments yet."
                : "No assignments have been assigned yet."
              }
            </p>
            {profile?.role === 'teacher' && (
              <Button className="btn-gradient">
                Create Assessment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : profile?.role === 'learner' ? (
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending ({pendingAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({submittedAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded ({gradedAssignments.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingAssignments.map(renderAssignmentCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="submitted" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {submittedAssignments.map(renderAssignmentCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="graded" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gradedAssignments.map(renderAssignmentCard)}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map(renderAssignmentCard)}
        </div>
      )}

      {/* File Upload Dialog */}
      {selectedAssignment && (
        <FileUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUpload={handleUpload}
          assignmentTitle={selectedAssignment.title}
          isUploading={isUploading}
        />
      )}

      {/* Assignment Details Dialog */}
      {selectedAssignment && (
        <AssignmentDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          assignment={selectedAssignment}
          onSubmitClick={handleSubmitFromDetails}
          onRefresh={fetchAssignments}
        />
      )}
    </div>
  );

  if (isMobile) {
    return <PullToRefresh onRefresh={handleRefresh}>{content}</PullToRefresh>;
  }

  return content;
}