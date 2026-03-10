import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Plus, Send, Loader2 } from 'lucide-react';
import AIQuestionGenerator from './AIQuestionGenerator';

interface CreateAssessmentProps {
  onAssessmentCreated?: () => void;
}

const CreateAssessment = ({ onAssessmentCreated }: CreateAssessmentProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createdAssessment, setCreatedAssessment] = useState<{
    id: string;
    type: string;
    subjectName: string;
    totalMarks: number;
  } | null>(null);

  // Load classes and subjects on component mount
  React.useEffect(() => {
    const loadData = async () => {
      if (!profile?.user_id) {
        console.log('CreateAssessment: No profile user_id available', { profile });
        return;
      }
      
      console.log('CreateAssessment: Starting to load data for user:', profile.user_id);
      setDataLoading(true);
      setLoadError(null);
      
      try {
        const [classesResult, subjectsResult] = await Promise.all([
          supabase.from('classes').select('*').eq('teacher_id', profile.user_id),
          supabase.from('subjects').select('*')
        ]);
        
        console.log('CreateAssessment: Classes result:', classesResult);
        console.log('CreateAssessment: Subjects result:', subjectsResult);
        
        if (classesResult.error) {
          console.error('CreateAssessment: Classes fetch error:', classesResult.error);
          throw new Error(`Failed to load classes: ${classesResult.error.message}`);
        }
        
        if (subjectsResult.error) {
          console.error('CreateAssessment: Subjects fetch error:', subjectsResult.error);
          throw new Error(`Failed to load subjects: ${subjectsResult.error.message}`);
        }
        
        setClasses(classesResult.data || []);
        setSubjects(subjectsResult.data || []);
        
        console.log('CreateAssessment: Data loaded successfully', {
          classesCount: classesResult.data?.length || 0,
          subjectsCount: subjectsResult.data?.length || 0
        });
        
        if (!classesResult.data?.length) {
          console.warn('CreateAssessment: No classes found for teacher');
        }
        
      } catch (error) {
        console.error('CreateAssessment: Load data error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        setLoadError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [profile?.user_id, toast]);

  const retryLoadData = () => {
    console.log('CreateAssessment: Retrying data load');
    // Trigger useEffect by updating a dependency
    if (profile?.user_id) {
      setDataLoading(true);
      setLoadError(null);
      // Re-run the effect by changing the dependency array trigger
      React.startTransition(() => {
        setClasses([]);
        setSubjects([]);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as 'quiz' | 'test' | 'assignment' | 'exam',
      class_id: formData.get('class_id') as string,
      subject_id: formData.get('subject_id') as string,
      total_marks: parseInt(formData.get('total_marks') as string) || 100,
      due_date: formData.get('due_date') as string,
      teacher_id: profile.user_id,
    };

    const { data: insertedData, error } = await supabase
      .from('assessments')
      .insert(data)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Assessment created successfully!",
      });
      
      // Show AI question generator for quiz/assignment types
      const assessmentType = data.type;
      if ((assessmentType === 'quiz' || assessmentType === 'assignment') && insertedData) {
        const subjectName = subjects.find(s => s.id === data.subject_id)?.name || 'Unknown';
        setCreatedAssessment({
          id: insertedData.id,
          type: assessmentType,
          subjectName,
          totalMarks: data.total_marks,
        });
      }
      
      // Reset form
      (e.target as HTMLFormElement).reset();
      onAssessmentCreated?.();
    }
    
    setLoading(false);
  };

  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!createdAssessment) return;
    setPublishing(true);
    const { error } = await supabase
      .from('assessments')
      .update({ is_published: true })
      .eq('id', createdAssessment.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Published!', description: 'Assessment is now visible to learners.' });
      setCreatedAssessment(null);
      onAssessmentCreated?.();
    }
    setPublishing(false);
  };

  if (createdAssessment) {
    return (
      <div className="space-y-4">
        <AIQuestionGenerator
          assessmentId={createdAssessment.id}
          subjectName={createdAssessment.subjectName}
          assessmentType={createdAssessment.type}
          totalMarks={createdAssessment.totalMarks}
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {publishing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Publishing...</>
            ) : (
              <><Send className="h-4 w-4 mr-1" /> Publish Assessment</>
            )}
          </Button>
          <Button variant="outline" onClick={() => setCreatedAssessment(null)}>
            Create Another Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Assessment title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" required>
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
              <Label htmlFor="class_id">Class</Label>
              <Select name="class_id" required disabled={dataLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    dataLoading 
                      ? "Loading classes..." 
                      : classes.length === 0 
                        ? "No classes found" 
                        : "Select class"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} (Grade {cls.grade_level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classes.length === 0 && !dataLoading && (
                <p className="text-sm text-muted-foreground">
                  No classes found. Create a class first to add assessments.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject_id">Subject</Label>
              <Select name="subject_id" required disabled={dataLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    dataLoading 
                      ? "Loading subjects..." 
                      : subjects.length === 0 
                        ? "No subjects found" 
                        : "Select subject"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subjects.length === 0 && !dataLoading && (
                <p className="text-sm text-muted-foreground">
                  No subjects available.
                </p>
              )}
            </div>
          </div>

          {loadError && (
            <div className="rounded-md bg-destructive/15 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-destructive">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={retryLoadData}
                  disabled={dataLoading}
                >
                  {dataLoading ? "Loading..." : "Retry"}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_marks">Total Marks</Label>
              <Input
                id="total_marks"
                name="total_marks"
                type="number"
                defaultValue="100"
                min="1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="datetime-local"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Assessment description and instructions"
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || dataLoading || classes.length === 0} 
            className="w-full md:w-auto"
          >
            {loading ? "Creating..." : dataLoading ? "Loading data..." : "Create Assessment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateAssessment;