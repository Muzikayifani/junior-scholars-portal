import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Award, TrendingUp, Calendar, BarChart3, FileText, Target, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface Result {
  id: string;
  marks_obtained?: number;
  total_marks: number;
  percentage: number;
  graded_at?: string;
  feedback?: string;
  assessment_title: string;
  assessment_type: string;
  subject_name?: string;
  class_name?: string;
  student_name?: string;
}

export default function Results() {
  const { profile, user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const childUserId = searchParams.get('child');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState(0);
  const [childName, setChildName] = useState<string>('');

  const fetchResults = useCallback(async () => {
    if (!profile || !user) return;
    try {
      setLoading(true);
      
      // If parent is viewing a specific child's results
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
          .select('id')
          .eq('user_id', childUserId)
          .maybeSingle();

        if (learnerError) throw learnerError;
        if (!learnerData) {
          setResults([]);
          return;
        }
        
        const { data, error } = await supabase
          .from('results')
          .select(`
            id,
            marks_obtained,
            graded_at,
            feedback,
            assessments!results_assessment_id_fkey (
              title,
              type,
              total_marks,
              subjects (name),
              classes (name)
            )
          `)
          .eq('learner_id', learnerData.id)
          .eq('status', 'graded')
          .order('graded_at', { ascending: false });

        if (error) throw error;
        
        const formattedData = data?.filter(item => item.assessments).map(item => ({
          id: item.id,
          marks_obtained: item.marks_obtained,
          total_marks: item.assessments.total_marks,
          percentage: item.marks_obtained ? Math.round((item.marks_obtained / item.assessments.total_marks) * 100) : 0,
          graded_at: item.graded_at,
          feedback: item.feedback,
          assessment_title: item.assessments.title,
          assessment_type: item.assessments.type,
          subject_name: item.assessments.subjects?.name,
          class_name: item.assessments.classes?.name
        })) || [];
        
        setResults(formattedData);
        
        const validResults = formattedData.filter(r => r.marks_obtained !== null);
        if (validResults.length > 0) {
          const average = validResults.reduce((sum, r) => sum + r.percentage, 0) / validResults.length;
          setAverageScore(Math.round(average));
        }
        return;
      }
      
      if (profile?.role === 'learner') {
        // Learners see their own results
        const { data: learnerData, error: learnerError } = await supabase
          .from('learners')
          .select('id')
          .eq('user_id', profile.user_id)
          .single();

        if (learnerError) throw learnerError;
        
        const { data, error } = await supabase
          .from('results')
          .select(`
            id,
            marks_obtained,
            graded_at,
            feedback,
            assessments!results_assessment_id_fkey (
              title,
              type,
              total_marks,
              subjects (name),
              classes (name)
            )
          `)
          .eq('learner_id', learnerData.id)
          .eq('status', 'graded')
          .order('graded_at', { ascending: false });

        if (error) throw error;
        
        const formattedData = data?.map(item => ({
          id: item.id,
          marks_obtained: item.marks_obtained,
          total_marks: item.assessments.total_marks,
          percentage: item.marks_obtained ? Math.round((item.marks_obtained / item.assessments.total_marks) * 100) : 0,
          graded_at: item.graded_at,
          feedback: item.feedback,
          assessment_title: item.assessments.title,
          assessment_type: item.assessments.type,
          subject_name: item.assessments.subjects?.name,
          class_name: item.assessments.classes?.name
        })) || [];
        
        setResults(formattedData);
        
        // Calculate average score
        const validResults = formattedData.filter(r => r.marks_obtained !== null);
        if (validResults.length > 0) {
          const average = validResults.reduce((sum, r) => sum + r.percentage, 0) / validResults.length;
          setAverageScore(Math.round(average));
        }
      } else if (profile?.role === 'teacher') {
        // Teachers see all results for their assessments
        const { data, error } = await supabase
          .from('results')
          .select(`
            id,
            marks_obtained,
            graded_at,
            feedback,
            assessments!results_assessment_id_fkey (
              title,
              type,
              total_marks,
              teacher_id,
              subjects (name),
              classes (name)
            )
          `)
          .eq('assessments.teacher_id', profile.user_id)
          .eq('status', 'graded')
          .order('graded_at', { ascending: false });

        if (error) throw error;
        
        const formattedData = data?.map(item => ({
          id: item.id,
          marks_obtained: item.marks_obtained,
          total_marks: item.assessments.total_marks,
          percentage: item.marks_obtained ? Math.round((item.marks_obtained / item.assessments.total_marks) * 100) : 0,
          graded_at: item.graded_at,
          feedback: item.feedback,
          assessment_title: item.assessments.title,
          assessment_type: item.assessments.type,
          subject_name: item.assessments.subjects?.name,
          class_name: item.assessments.classes?.name,
          student_name: 'Student' // Simplified to avoid complex relations
        })) || [];
        
        setResults(formattedData);
      }
    } catch (error: any) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, user, childUserId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleRefresh = useCallback(async () => {
    await fetchResults();
    toast.success('Results refreshed');
  }, [fetchResults]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 70) return 'text-info';
    if (percentage >= 60) return 'text-orange-500';
    return 'text-destructive';
  };

  const getGradeBadge = (percentage: number) => {
    if (percentage >= 80) return <Badge className="bg-success text-success-foreground">A</Badge>;
    if (percentage >= 70) return <Badge className="bg-info text-info-foreground">B</Badge>;
    if (percentage >= 60) return <Badge className="bg-orange-500 text-white">C</Badge>;
    return <Badge variant="destructive">D</Badge>;
  };

  const recentResults = results.slice(0, 5);
  const subjectPerformance = results.reduce((acc, result) => {
    const subject = result.subject_name || 'Unknown';
    if (!acc[subject]) {
      acc[subject] = { total: 0, count: 0 };
    }
    acc[subject].total += result.percentage;
    acc[subject].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const renderResultCard = (result: Result) => (
    <Card key={result.id} className="hover-lift">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{result.assessment_title}</CardTitle>
            <CardDescription className="mt-1">
              {result.subject_name} • {result.class_name}
              {result.student_name && ` • ${result.student_name}`}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getGradeBadge(result.percentage)}
            <Badge variant="outline" className="text-xs">
              {result.assessment_type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Score</span>
            <span className={`text-lg font-bold ${getGradeColor(result.percentage)}`}>
              {result.marks_obtained || 0}/{result.total_marks} ({result.percentage}%)
            </span>
          </div>
          <Progress value={result.percentage} className="h-2" />
        </div>
        
        {result.graded_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Graded: {format(new Date(result.graded_at), 'MMM d, yyyy')}</span>
          </div>
        )}
        
        {result.feedback && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Feedback
            </h4>
            <p className="text-sm text-muted-foreground">{result.feedback}</p>
          </div>
        )}
        
        <Button variant="outline" size="sm" className="w-full">
          View Details
        </Button>
      </CardContent>
    </Card>
  );

  const content = (
    <div className="animate-fade-in p-3 sm:p-6 space-y-6">
      {childUserId && profile?.role === 'parent' && (
        <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Children
        </Button>
      )}

      <div className="flex items-center gap-2 mb-6">
        <Award className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {childUserId && childName ? `${childName}'s Results` : 'Results'}
          </h1>
          <p className="text-muted-foreground">
            {profile?.role === 'teacher' 
              ? 'View and manage assessment results'
              : childUserId 
              ? 'Academic performance and grades'
              : 'Your academic performance and grades'
            }
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground">
              {profile?.role === 'teacher' 
                ? "No assessment results to display yet."
                : "No graded assessments found."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards for Learners and Parent viewing child */}
          {(profile?.role === 'learner' || (profile?.role === 'parent' && childUserId)) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageScore}%</div>
                  <p className="text-xs text-muted-foreground">
                    Across all assessments
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{results.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Completed and graded
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Best Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {results.length > 0 ? Math.max(...results.map(r => r.percentage)) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Highest score achieved
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="recent" className="space-y-6">
            <TabsList>
              <TabsTrigger value="recent">Recent Results</TabsTrigger>
              <TabsTrigger value="all">All Results</TabsTrigger>
              {profile?.role === 'learner' && (
                <TabsTrigger value="subjects">By Subject</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="recent" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentResults.map(renderResultCard)}
              </div>
            </TabsContent>
            
            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map(renderResultCard)}
              </div>
            </TabsContent>
            
            {profile?.role === 'learner' && (
              <TabsContent value="subjects" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(subjectPerformance).map(([subject, data]) => {
                    const average = Math.round(data.total / data.count);
                    return (
                      <Card key={subject} className="hover-lift">
                        <CardHeader>
                          <CardTitle className="text-lg">{subject}</CardTitle>
                          <CardDescription>{data.count} assessments</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Average Score</span>
                              <span className={`text-lg font-bold ${getGradeColor(average)}`}>
                                {average}%
                              </span>
                            </div>
                            <Progress value={average} className="h-2" />
                          </div>
                          {getGradeBadge(average)}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return <PullToRefresh onRefresh={handleRefresh}>{content}</PullToRefresh>;
  }

  return content;
}