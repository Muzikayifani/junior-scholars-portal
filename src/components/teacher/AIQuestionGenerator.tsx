import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  order_index: number;
}

interface AIQuestionGeneratorProps {
  assessmentId: string;
  subjectName: string;
  assessmentType: string;
  totalMarks: number;
}

const AIQuestionGenerator = ({ assessmentId, subjectName, assessmentType, totalMarks }: AIQuestionGeneratorProps) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [numQuestions, setNumQuestions] = useState(10);

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          assessment_id: assessmentId,
          subject_name: subjectName,
          assessment_type: assessmentType,
          total_marks: totalMarks,
          num_questions: numQuestions,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setQuestions(data.questions || []);
      toast({
        title: "Questions Generated!",
        description: `${data.questions?.length || 0} AI-generated questions have been added to this assessment.`,
      });
    } catch (error: any) {
      console.error('Generate questions error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    const { error } = await supabase
      .from('assessment_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      toast({ title: "Question removed" });
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Question Generator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Automatically generate CAPS-aligned {assessmentType} questions for {subjectName}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.length === 0 ? (
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-2 w-full sm:w-auto">
              <Label htmlFor="num_questions">Number of Questions</Label>
              <Input
                id="num_questions"
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                min={1}
                max={20}
                className="w-full sm:w-32"
              />
            </div>
            <Button
              onClick={generateQuestions}
              disabled={generating}
              className="w-full sm:w-auto"
              variant="gradient"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{questions.length} questions generated</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuestions([]);
                  generateQuestions();
                }}
                disabled={generating}
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Regenerate
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-xs font-bold text-muted-foreground mt-0.5 shrink-0">Q{i + 1}.</span>
                      <p className="text-sm font-medium">{q.question_text}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={q.question_type === 'multiple_choice' ? 'default' : 'secondary'} className="text-xs">
                        {q.question_type === 'multiple_choice' ? 'MCQ' : 'T/F'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteQuestion(q.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 ml-6">
                    {(q.options as string[]).map((opt, oi) => (
                      <div
                        key={oi}
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                          opt === q.correct_answer
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {opt === q.correct_answer ? (
                          <CheckCircle className="h-3 w-3 shrink-0" />
                        ) : (
                          <XCircle className="h-3 w-3 shrink-0 opacity-40" />
                        )}
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIQuestionGenerator;
