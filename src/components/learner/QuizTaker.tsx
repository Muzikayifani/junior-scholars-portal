import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Send, RotateCcw } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  order_index: number;
}

interface QuizTakerProps {
  assessmentId: string;
  assessmentTitle: string;
  totalMarks: number;
  onSubmitted?: () => void;
}

const QuizTaker = ({ assessmentId, assessmentTitle, totalMarks, onSubmitted }: QuizTakerProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('order_index');

      if (error) {
        console.error('Error fetching questions:', error);
        toast({ title: 'Error', description: 'Failed to load questions', variant: 'destructive' });
      } else {
        setQuestions(data || []);
      }
      setLoading(false);
    };

    fetchQuestions();
  }, [assessmentId, toast]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!profile) return;

    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      toast({
        title: 'Incomplete',
        description: `Please answer all ${unanswered.length} remaining question(s).`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Calculate score
      let correct = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) correct++;
      });

      const marksObtained = Math.round((correct / questions.length) * totalMarks);

      // Get learner record
      const { data: learner, error: learnerErr } = await supabase
        .from('learners')
        .select('id')
        .eq('user_id', profile.user_id)
        .single();

      if (learnerErr || !learner) throw new Error('No learner record found');

      // Upsert result
      const { error: resultErr } = await supabase
        .from('results')
        .upsert({
          assessment_id: assessmentId,
          learner_id: learner.id,
          marks_obtained: marksObtained,
          status: 'graded',
          submitted_at: new Date().toISOString(),
          graded_at: new Date().toISOString(),
          feedback: `Auto-graded: ${correct}/${questions.length} correct answers.`,
        }, { onConflict: 'assessment_id,learner_id' });

      if (resultErr) throw resultErr;

      setScore({ correct, total: questions.length });
      setSubmitted(true);
      toast({
        title: 'Quiz Submitted!',
        description: `You scored ${correct}/${questions.length} (${Math.round((correct / questions.length) * 100)}%)`,
      });
      onSubmitted?.();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading questions...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No questions available for this assessment yet.</p>
      </div>
    );
  }

  if (submitted && score) {
    const percentage = Math.round((score.correct / score.total) * 100);
    return (
      <div className="space-y-4">
        <Card className={`border-2 ${percentage >= 50 ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20' : 'border-red-500/30 bg-red-50 dark:bg-red-950/20'}`}>
          <CardContent className="pt-6 text-center space-y-3">
            {percentage >= 50 ? (
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            ) : (
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            )}
            <h3 className="text-2xl font-bold">{percentage}%</h3>
            <p className="text-muted-foreground">
              You got {score.correct} out of {score.total} questions correct
            </p>
            <p className="text-sm font-medium">
              Marks: {Math.round((score.correct / score.total) * totalMarks)}/{totalMarks}
            </p>
          </CardContent>
        </Card>

        {/* Show answers review */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Review Answers</h4>
          {questions.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct_answer;
            return (
              <div key={q.id} className={`rounded-lg border p-3 ${isCorrect ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20'}`}>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground mt-0.5">Q{i + 1}.</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">{q.question_text}</p>
                    <div className="flex flex-col gap-1 text-xs">
                      <span>Your answer: <strong>{userAnswer}</strong> {isCorrect ? '✓' : '✗'}</span>
                      {!isCorrect && <span className="text-green-600 dark:text-green-400">Correct answer: <strong>{q.correct_answer}</strong></span>}
                    </div>
                  </div>
                  {isCorrect ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </p>
        <Badge variant="outline">{questions.length} questions</Badge>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {questions.map((q, i) => (
          <Card key={q.id} className={answers[q.id] ? 'border-primary/30' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Q{i + 1}
                </Badge>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {q.question_type === 'multiple_choice' ? 'MCQ' : 'T/F'}
                </Badge>
              </div>
              <CardTitle className="text-sm font-medium mt-2">{q.question_text}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[q.id] || ''}
                onValueChange={(val) => handleAnswerChange(q.id, val)}
              >
                {(q.options as string[]).map((opt, oi) => (
                  <div key={oi} className="flex items-center space-x-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={opt} id={`${q.id}-${oi}`} />
                    <Label htmlFor={`${q.id}-${oi}`} className="text-sm cursor-pointer flex-1">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full"
        variant="gradient"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Quiz ({answeredCount}/{questions.length} answered)
          </>
        )}
      </Button>
    </div>
  );
};

export default QuizTaker;
