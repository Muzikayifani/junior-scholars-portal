import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Target, Award, AlertTriangle } from 'lucide-react';

interface GradeDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface AssessmentAnalytics {
  id: string;
  title: string;
  type: string;
  average: number;
  total_students: number;
  graded_count: number;
  distribution: GradeDistribution[];
}

interface ClassPerformance {
  class_name: string;
  average: number;
  student_count: number;
}

const GradeAnalytics = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<any[]>([]);
  const [assessmentAnalytics, setAssessmentAnalytics] = useState<AssessmentAnalytics[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalAssessments: 0,
    averageGrade: 0,
    gradingCompletion: 0
  });

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  useEffect(() => {
    loadClasses();
    loadAnalyticsData();
  }, [profile, selectedClass]);

  const loadClasses = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('classes')
      .select('id, name, grade_level')
      .order('name');

    if (data) {
      setClasses(data);
    }
  };

  const loadAnalyticsData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Get assessments with results
      let assessmentQuery = supabase
        .from('assessments')
        .select(`
          id, title, type, total_marks, class_id,
          class:classes(name),
          results(marks_obtained, status, learner_id)
        `)
        .eq('teacher_id', profile.user_id);

      if (selectedClass !== 'all') {
        assessmentQuery = assessmentQuery.eq('class_id', selectedClass);
      }

      const { data: assessmentData, error } = await assessmentQuery;
      if (error) throw error;

      // Process assessment analytics
      const analytics: AssessmentAnalytics[] = assessmentData?.map(assessment => {
        const results = assessment.results || [];
        const gradedResults = results.filter(r => r.status === 'graded' && r.marks_obtained !== null);
        
        const total = gradedResults.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);
        const average = gradedResults.length > 0 ? Math.round((total / gradedResults.length / assessment.total_marks) * 100) : 0;

        // Grade distribution
        const distribution = [
          { range: '90-100%', count: 0, percentage: 0 },
          { range: '80-89%', count: 0, percentage: 0 },
          { range: '70-79%', count: 0, percentage: 0 },
          { range: '60-69%', count: 0, percentage: 0 },
          { range: 'Below 60%', count: 0, percentage: 0 }
        ];

        gradedResults.forEach(result => {
          const percentage = (result.marks_obtained / assessment.total_marks) * 100;
          if (percentage >= 90) distribution[0].count++;
          else if (percentage >= 80) distribution[1].count++;
          else if (percentage >= 70) distribution[2].count++;
          else if (percentage >= 60) distribution[3].count++;
          else distribution[4].count++;
        });

        distribution.forEach(d => {
          d.percentage = gradedResults.length > 0 ? Math.round((d.count / gradedResults.length) * 100) : 0;
        });

        return {
          id: assessment.id,
          title: assessment.title,
          type: assessment.type,
          average,
          total_students: results.length,
          graded_count: gradedResults.length,
          distribution
        };
      }) || [];

      setAssessmentAnalytics(analytics);

      // Get class performance
      const classStats: { [key: string]: { total: number; count: number; students: Set<string> } } = {};
      
      assessmentData?.forEach(assessment => {
        const className = assessment.class?.name || 'Unknown';
        if (!classStats[className]) {
          classStats[className] = { total: 0, count: 0, students: new Set() };
        }

        assessment.results?.forEach(result => {
          if (result.status === 'graded' && result.marks_obtained !== null) {
            const percentage = (result.marks_obtained / assessment.total_marks) * 100;
            classStats[className].total += percentage;
            classStats[className].count++;
            classStats[className].students.add(result.learner_id);
          }
        });
      });

      const classPerf: ClassPerformance[] = Object.entries(classStats).map(([className, stats]) => ({
        class_name: className,
        average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
        student_count: stats.students.size
      }));

      setClassPerformance(classPerf);

      // Calculate overall stats
      const totalStudents = new Set(assessmentData?.flatMap(a => a.results?.map(r => r.learner_id) || [])).size;
      const totalAssessments = assessmentData?.length || 0;
      const allGradedResults = assessmentData?.flatMap(a => 
        a.results?.filter(r => r.status === 'graded' && r.marks_obtained !== null) || []
      ) || [];
      const totalPossibleGrades = assessmentData?.reduce((sum, a) => sum + (a.results?.length || 0), 0) || 0;
      
      const averageGrade = allGradedResults.length > 0 
        ? Math.round(allGradedResults.reduce((sum, result, index) => {
            const assessment = assessmentData?.find(a => a.results?.includes(result));
            const percentage = assessment ? (result.marks_obtained / assessment.total_marks) * 100 : 0;
            return sum + percentage;
          }, 0) / allGradedResults.length)
        : 0;

      const gradingCompletion = totalPossibleGrades > 0 
        ? Math.round((allGradedResults.length / totalPossibleGrades) * 100)
        : 0;

      setOverallStats({
        totalStudents,
        totalAssessments,
        averageGrade,
        gradingCompletion
      });

    } catch (error: any) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  };

  const getPerformanceColor = (average: number) => {
    if (average >= 90) return "text-green-600";
    if (average >= 80) return "text-blue-600";
    if (average >= 70) return "text-yellow-600";
    if (average >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getPerformanceBadge = (average: number) => {
    if (average >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (average >= 80) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (average >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Average</Badge>;
    if (average >= 60) return <Badge className="bg-orange-100 text-orange-800">Below Average</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Grade Analytics
          </h2>
          <p className="text-muted-foreground">Analyze student performance and grade trends</p>
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} (Grade {cls.grade_level})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{overallStats.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                <p className="text-2xl font-bold">{overallStats.totalAssessments}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Grade</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(overallStats.averageGrade)}`}>
                  {overallStats.averageGrade}%
                </p>
              </div>
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Grading Progress</p>
                <p className="text-2xl font-bold">{overallStats.gradingCompletion}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={assessmentAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="title" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'average' ? `${value}%` : value,
                    name === 'average' ? 'Average Score' : 'Graded Students'
                  ]}
                />
                <Bar dataKey="average" fill="#8884d8" name="average" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Class Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Class Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class_name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Average Score']} />
                <Bar dataKey="average" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {assessmentAnalytics.map(assessment => (
              <div key={assessment.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-medium">{assessment.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {assessment.type} • {assessment.graded_count}/{assessment.total_students} graded
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getPerformanceColor(assessment.average)}`}>
                      {assessment.average}%
                    </p>
                    {getPerformanceBadge(assessment.average)}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {assessment.distribution.map((dist, index) => (
                    <div key={index} className="text-center">
                      <div 
                        className="h-20 flex items-end justify-center rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] + '20' }}
                      >
                        <div 
                          className="w-full rounded"
                          style={{ 
                            height: `${Math.max(dist.percentage, 5)}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                      <p className="text-xs font-medium mt-1">{dist.range}</p>
                      <p className="text-xs text-muted-foreground">{dist.count} ({dist.percentage}%)</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeAnalytics;