import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, BookOpen, User, FileText, Download, Upload, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import QuizTaker from './QuizTaker';

interface AssignmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: {
    id: string;
    title: string;
    description?: string;
    instructions?: string;
    due_date?: string;
    total_marks: number;
    type: string;
    subject_name?: string;
    class_name?: string;
    teacher_name?: string;
    status?: 'pending' | 'submitted' | 'graded';
    marks_obtained?: number;
    submitted_at?: string;
    submission_path?: string;
  };
  onSubmitClick?: () => void;
  onRefresh?: () => void;
}

export function AssignmentDetailsDialog({
  open,
  onOpenChange,
  assignment,
  onSubmitClick,
  onRefresh
}: AssignmentDetailsDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const getStatusBadge = () => {
    if (assignment.status === 'graded') {
      return <Badge className="bg-info text-info-foreground">Graded</Badge>;
    }
    if (assignment.status === 'submitted') {
      return <Badge className="bg-success text-success-foreground">Submitted</Badge>;
    }
    
    if (assignment.due_date) {
      const isOverdue = new Date(assignment.due_date) < new Date();
      return (
        <Badge variant={isOverdue ? "destructive" : "secondary"}>
          {isOverdue ? "Overdue" : "Pending"}
        </Badge>
      );
    }
    
    return <Badge variant="secondary">Pending</Badge>;
  };

  const handleDownloadSubmission = async () => {
    if (!assignment.submission_path) return;
    
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('submissions')
        .download(assignment.submission_path);

      if (error) throw error;

      // Create a download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = assignment.submission_path.split('/').pop() || 'submission';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: "Your submission is being downloaded."
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{assignment.title}</DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {assignment.subject_name} • {assignment.class_name}
              </DialogDescription>
            </div>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="outline">{assignment.type}</Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total Marks:</span>
              <span className="font-medium">{assignment.total_marks}</span>
            </div>
            
            {assignment.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium">
                  {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            )}
            
            {assignment.teacher_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Teacher:</span>
                <span className="font-medium">{assignment.teacher_name}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Tabs for Details and Questions (learner only, quiz/assignment types) */}
          {profile?.role === 'learner' && (assignment.type === 'quiz' || assignment.type === 'assignment') && (!assignment.status || assignment.status === 'pending') ? (
            <Tabs defaultValue="questions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">
                  <FileText className="h-4 w-4 mr-1" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="questions">
                  <ListChecks className="h-4 w-4 mr-1" />
                  Questions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {assignment.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {assignment.description}
                    </p>
                  </div>
                )}
                {assignment.instructions && (
                  <div>
                    <h4 className="font-semibold mb-2">Instructions</h4>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p>
                    </div>
                  </div>
                )}
                {onSubmitClick && (
                  <Button onClick={onSubmitClick} className="w-full btn-gradient">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File Submission
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="questions">
                <QuizTaker
                  assessmentId={assignment.id}
                  assessmentTitle={assignment.title}
                  totalMarks={assignment.total_marks}
                  onSubmitted={() => {
                    onRefresh?.();
                  }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {/* Description */}
              {assignment.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {assignment.description}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {assignment.instructions && (
                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {assignment.instructions}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Submission Status */}
              {assignment.status === 'submitted' && (
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-success" />
                    <h4 className="font-semibold text-success">Submitted</h4>
                  </div>
                  {assignment.submitted_at && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Submitted on {format(new Date(assignment.submitted_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                  {assignment.submission_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSubmission}
                      disabled={downloading}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading ? 'Downloading...' : 'Download Submission'}
                    </Button>
                  )}
                </div>
              )}

              {/* Graded Status */}
              {assignment.status === 'graded' && assignment.marks_obtained !== undefined && (
                <div className="p-4 bg-info/10 rounded-lg border border-info/20">
                  <h4 className="font-semibold text-info mb-2">Graded</h4>
                  <div className="text-2xl font-bold mb-2">
                    {assignment.marks_obtained}/{assignment.total_marks}
                    <span className="text-lg text-muted-foreground ml-2">
                      ({Math.round((assignment.marks_obtained / assignment.total_marks) * 100)}%)
                    </span>
                  </div>
                  {assignment.submission_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSubmission}
                      disabled={downloading}
                      className="w-full mt-2"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading ? 'Downloading...' : 'Download Submission'}
                    </Button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Close
                </Button>
                {assignment.status === 'pending' && onSubmitClick && (
                  <Button onClick={onSubmitClick} className="flex-1 btn-gradient">
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Work
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
