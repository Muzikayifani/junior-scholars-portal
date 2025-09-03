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
import { CalendarIcon, Plus } from 'lucide-react';

interface CreateAssessmentProps {
  onAssessmentCreated?: () => void;
}

const CreateAssessment = ({ onAssessmentCreated }: CreateAssessmentProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Load classes and subjects on component mount
  React.useEffect(() => {
    const loadData = async () => {
      if (!profile?.user_id) return;
      
      const [classesResult, subjectsResult] = await Promise.all([
        supabase.from('classes').select('*').eq('teacher_id', profile.user_id),
        supabase.from('subjects').select('*')
      ]);
      
      if (classesResult.data) setClasses(classesResult.data);
      if (subjectsResult.data) setSubjects(subjectsResult.data);
    };
    
    loadData();
  }, [profile]);

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
      teacher_id: profile.id,
    };

    const { error } = await supabase
      .from('assessments')
      .insert(data);

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
      
      // Reset form
      (e.target as HTMLFormElement).reset();
      onAssessmentCreated?.();
    }
    
    setLoading(false);
  };

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
              <Select name="class_id" required>
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
              <Label htmlFor="subject_id">Subject</Label>
              <Select name="subject_id" required>
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

          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            {loading ? "Creating..." : "Create Assessment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateAssessment;