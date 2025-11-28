import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Award, BookOpen, Calendar, Target } from 'lucide-react';
import { format } from 'date-fns';

interface Child {
  user_id: string;
  full_name: string;
  email: string;
}

interface PerformanceData {
  date: string;
  percentage: number;
  assessment: string;
}

interface SubjectPerformance {
  subject: string;
  average: number;
  count: number;
  trend: number;
}

interface RecentAssessment {
  id: string;
  title: string;
  subject: string;
  date: string;
  score: number;
  totalMarks: number;
  percentage: number;
  type: string;
}

interface Stats {
  totalAssessments: number;
  averageGrade: number;
  highestGrade: number;
  lowestGrade: number;
  improvementRate: number;
  completionRate: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export default function ProgressReports() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [performanceOverTime, setPerformanceOverTime] = useState<PerformanceData[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<RecentAssessment[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (profile?.role === 'parent') {
      fetchChildren();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedChild) {
      fetchChildData(selectedChild);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      const { data: relationships, error } = await supabase
        .from('parent_child_relationships')
        .select('child_user_id')
        .eq('parent_user_id', profile?.user_id);

      if (error) throw error;

      if (relationships && relationships.length > 0) {
        const childIds = relationships.map(r => r.child_user_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', childIds);

        if (profileError) throw profileError;

        setChildren(profiles || []);
        if (profiles && profiles.length > 0) {
          setSelectedChild(profiles[0].user_id);
        }
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async (childUserId: string) => {
    setLoading(true);
    try {
      // Fetch learner ID
      const { data: learnerData, error: learnerError } = await supabase
        .from('learners')
        .select('id, class_id')
        .eq('user_id', childUserId)
        .single();

      if (learnerError || !learnerData) {
        setLoading(false);
        return;
      }

      // Fetch results with assessment details
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select(`
          id,
          marks_obtained,
          submitted_at,
          graded_at,
          assessments (
            id,
            title,
            total_marks,
            type,
            subject_id,
            subjects (
              name
            )
          )
        `)
        .eq('learner_id', learnerData.id)
        .eq('status', 'graded')
        .order('graded_at', { ascending: false });

      if (resultsError) throw resultsError;

      if (results && results.length > 0) {
        calculateStats(results);
        calculatePerformanceOverTime(results);
        calculateSubjectPerformance(results);
        calculateGradeDistribution(results);
        prepareRecentAssessments(results);
      } else {
        resetData();
      }
    } catch (error) {
      console.error('Error fetching child data:', error);
      resetData();
    } finally {
      setLoading(false);
    }
  };

  const resetData = () => {
    setStats(null);
    setPerformanceOverTime([]);
    setSubjectPerformance([]);
    setRecentAssessments([]);
    setGradeDistribution([]);
  };

  const calculateStats = (results: any[]) => {
    const percentages = results.map(r => {
      const percentage = (r.marks_obtained / r.assessments.total_marks) * 100;
      return percentage;
    });

    const totalAssessments = results.length;
    const averageGrade = percentages.reduce((sum, p) => sum + p, 0) / totalAssessments;
    const highestGrade = Math.max(...percentages);
    const lowestGrade = Math.min(...percentages);

    // Calculate improvement rate (comparing first half to second half)
    const midPoint = Math.floor(results.length / 2);
    const recentAvg = percentages.slice(0, midPoint).reduce((sum, p) => sum + p, 0) / midPoint;
    const olderAvg = percentages.slice(midPoint).reduce((sum, p) => sum + p, 0) / (results.length - midPoint);
    const improvementRate = recentAvg - olderAvg;

    const completionRate = (results.filter(r => r.status === 'graded').length / totalAssessments) * 100;

    setStats({
      totalAssessments,
      averageGrade: Math.round(averageGrade),
      highestGrade: Math.round(highestGrade),
      lowestGrade: Math.round(lowestGrade),
      improvementRate: Math.round(improvementRate),
      completionRate: Math.round(completionRate)
    });
  };

  const calculatePerformanceOverTime = (results: any[]) => {
    const data = results
      .slice(0, 10)
      .reverse()
      .map(r => ({
        date: format(new Date(r.graded_at), 'MMM dd'),
        percentage: Math.round((r.marks_obtained / r.assessments.total_marks) * 100),
        assessment: r.assessments.title.substring(0, 20)
      }));

    setPerformanceOverTime(data);
  };

  const calculateSubjectPerformance = (results: any[]) => {
    const subjectMap = new Map<string, { total: number; count: number; scores: number[] }>();

    results.forEach(r => {
      const subjectName = r.assessments.subjects?.name || 'Unknown';
      const percentage = (r.marks_obtained / r.assessments.total_marks) * 100;

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, { total: 0, count: 0, scores: [] });
      }

      const subject = subjectMap.get(subjectName)!;
      subject.total += percentage;
      subject.count += 1;
      subject.scores.push(percentage);
    });

    const data = Array.from(subjectMap.entries()).map(([subject, data]) => {
      const average = data.total / data.count;
      // Calculate trend by comparing recent half to older half
      const midPoint = Math.floor(data.scores.length / 2);
      const recent = data.scores.slice(0, midPoint);
      const older = data.scores.slice(midPoint);
      const recentAvg = recent.reduce((sum, s) => sum + s, 0) / recent.length;
      const olderAvg = older.reduce((sum, s) => sum + s, 0) / older.length;
      const trend = recentAvg - olderAvg;

      return {
        subject,
        average: Math.round(average),
        count: data.count,
        trend: Math.round(trend)
      };
    });

    setSubjectPerformance(data);
  };

  const calculateGradeDistribution = (results: any[]) => {
    const distribution = {
      'A (90-100%)': 0,
      'B (80-89%)': 0,
      'C (70-79%)': 0,
      'D (60-69%)': 0,
      'F (0-59%)': 0
    };

    results.forEach(r => {
      const percentage = (r.marks_obtained / r.assessments.total_marks) * 100;
      if (percentage >= 90) distribution['A (90-100%)']++;
      else if (percentage >= 80) distribution['B (80-89%)']++;
      else if (percentage >= 70) distribution['C (70-79%)']++;
      else if (percentage >= 60) distribution['D (60-69%)']++;
      else distribution['F (0-59%)']++;
    });

    const data = Object.entries(distribution)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    setGradeDistribution(data);
  };

  const prepareRecentAssessments = (results: any[]) => {
    const data = results.slice(0, 10).map(r => ({
      id: r.id,
      title: r.assessments.title,
      subject: r.assessments.subjects?.name || 'Unknown',
      date: format(new Date(r.graded_at), 'MMM dd, yyyy'),
      score: r.marks_obtained,
      totalMarks: r.assessments.total_marks,
      percentage: Math.round((r.marks_obtained / r.assessments.total_marks) * 100),
      type: r.assessments.type
    }));

    setRecentAssessments(data);
  };

  const getGradeBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge className="bg-green-500">A</Badge>;
    if (percentage >= 80) return <Badge className="bg-blue-500">B</Badge>;
    if (percentage >= 70) return <Badge className="bg-yellow-500">C</Badge>;
    if (percentage >= 60) return <Badge className="bg-orange-500">D</Badge>;
    return <Badge variant="destructive">F</Badge>;
  };

  if (profile?.role !== 'parent') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">This page is only accessible to parents.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !selectedChild) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Progress Reports</CardTitle>
            <CardDescription>No children linked to your account yet.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Progress Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive analytics and performance trends</p>
        </div>
        <Select value={selectedChild} onValueChange={setSelectedChild}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((child) => (
              <SelectItem key={child.user_id} value={child.user_id}>
                {child.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : stats ? (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageGrade}%</div>
                <Progress value={stats.averageGrade} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAssessments}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.completionRate}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Improvement</CardTitle>
                {stats.improvementRate >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.improvementRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.improvementRate >= 0 ? '+' : ''}{stats.improvementRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  vs previous period
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best/Lowest</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.highestGrade}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Lowest: {stats.lowestGrade}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Over Time Chart */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>Last 10 graded assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Grade (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Subject Performance */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
                <CardDescription>Average scores by subject</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="average" fill="hsl(var(--primary))" name="Average (%)" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {subjectPerformance.map((subject) => (
                    <div key={subject.subject} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{subject.subject}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{subject.count} assessments</span>
                        {subject.trend !== 0 && (
                          <span className={subject.trend > 0 ? 'text-green-500' : 'text-red-500'}>
                            {subject.trend > 0 ? '+' : ''}{subject.trend}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Grade Distribution */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Breakdown of grades received</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gradeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Assessments Table */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>Detailed view of recent graded work</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.title}</TableCell>
                      <TableCell>{assessment.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assessment.type}</Badge>
                      </TableCell>
                      <TableCell>{assessment.date}</TableCell>
                      <TableCell>
                        {assessment.score}/{assessment.totalMarks}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getGradeBadge(assessment.percentage)}
                          <span className="text-sm text-muted-foreground">
                            {assessment.percentage}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No assessment data available for this child yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
