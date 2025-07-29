import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, TrendingUp, TrendingDown, Users, Target, Award, BookOpen } from 'lucide-react';

const TeacherReports = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classStats, setClassStats] = useState<any>(null);
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [assessmentOverview, setAssessmentOverview] = useState<any[]>([]);

  useEffect(() => {
    loadClasses();
  }, [profile]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassReports();
    }
  }, [selectedClassId]);

  const loadClasses = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name');
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setClasses(data || []);
    }
  };

  const loadClassReports = async () => {
    if (!selectedClassId) return;
    
    setLoading(true);
    
    try {
      // Get class statistics
      const { data: learners, error: learnersError } = await supabase
        .from('learners')
        .select('id')
        .eq('class_id', selectedClassId);

      if (learnersError) throw learnersError;

      // Get assessments for this class
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select(`
          *,
          subject:subjects(name, code),
          results(*)
        `)
        .eq('class_id', selectedClassId)
        .eq('teacher_id', profile?.id);

      if (assessmentsError) throw assessmentsError;

      // Calculate class statistics
      const totalStudents = learners?.length || 0;
      const totalAssessments = assessments?.length || 0;
      
      let totalSubmissions = 0;
      let gradedSubmissions = 0;
      let totalMarks = 0;
      let totalPossibleMarks = 0;

      assessments?.forEach(assessment => {
        assessment.results?.forEach((result: any) => {
          totalSubmissions++;
          if (result.status === 'graded' && result.marks_obtained !== null) {
            gradedSubmissions++;
            totalMarks += result.marks_obtained;
            totalPossibleMarks += assessment.total_marks;
          }
        });
      });

      const averagePerformance = totalPossibleMarks > 0 ? 
        Math.round((totalMarks / totalPossibleMarks) * 100) : 0;

      setClassStats({
        totalStudents,
        totalAssessments,
        totalSubmissions,
        gradedSubmissions,
        averagePerformance,
        pendingGrading: totalSubmissions - gradedSubmissions
      });

      // Calculate subject performance
      const subjectMap = new Map();
      assessments?.forEach(assessment => {
        const subjectName = assessment.subject?.name || 'Unknown';
        
        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, {
            name: subjectName,
            assessments: 0,
            totalMarks: 0,
            totalPossible: 0,
            submissions: 0
          });
        }
        
        const subject = subjectMap.get(subjectName);
        subject.assessments++;
        
        assessment.results?.forEach((result: any) => {
          if (result.status === 'graded' && result.marks_obtained !== null) {
            subject.totalMarks += result.marks_obtained;
            subject.totalPossible += assessment.total_marks;
            subject.submissions++;
          }
        });
      });

      const subjectPerf = Array.from(subjectMap.values()).map((subject: any) => ({
        ...subject,
        average: subject.totalPossible > 0 ? 
          Math.round((subject.totalMarks / subject.totalPossible) * 100) : 0
      }));

      setSubjectPerformance(subjectPerf);

      // Assessment overview
      const assessmentOverv = assessments?.map(assessment => {
        const results = assessment.results || [];
        const gradedResults = results.filter((r: any) => r.status === 'graded' && r.marks_obtained !== null);
        
        let averageScore = 0;
        if (gradedResults.length > 0) {
          const totalScore = gradedResults.reduce((sum: number, r: any) => sum + r.marks_obtained, 0);
          averageScore = Math.round((totalScore / (gradedResults.length * assessment.total_marks)) * 100);
        }

        return {
          id: assessment.id,
          title: assessment.title,
          type: assessment.type,
          subject: assessment.subject?.name,
          totalSubmissions: results.length,
          gradedSubmissions: gradedResults.length,
          averageScore,
          dueDate: assessment.due_date
        };
      }) || [];

      setAssessmentOverview(assessmentOverv);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Teacher Reports & Analytics
        </h2>
        <p className="text-muted-foreground">View class performance and assessment analytics</p>
      </div>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class for Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class to view reports" />
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
        </CardContent>
      </Card>

      {/* Class Overview Stats */}
      {selectedClassId && classStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">{classStats.totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-info">{classStats.totalAssessments}</p>
                  <p className="text-sm text-muted-foreground">Assessments</p>
                </div>
                <BookOpen className="h-8 w-8 text-info opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-success">{classStats.averagePerformance}%</p>
                  <p className="text-sm text-muted-foreground">Avg Performance</p>
                </div>
                <Award className="h-8 w-8 text-success opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-destructive">{classStats.pendingGrading}</p>
                  <p className="text-sm text-muted-foreground">Pending Grading</p>
                </div>
                <Target className="h-8 w-8 text-destructive opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subject Performance */}
      {selectedClassId && subjectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance Overview</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average performance by subject for {selectedClass?.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectPerformance.map((subject) => (
                <div key={subject.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {subject.assessments} assessment{subject.assessments !== 1 ? 's' : ''} • 
                        {subject.submissions} submission{subject.submissions !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{subject.average}%</span>
                        {subject.average >= 80 ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : subject.average >= 60 ? (
                          <Target className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  <Progress value={subject.average} className="w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Overview */}
      {selectedClassId && assessmentOverview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Overview</CardTitle>
            <p className="text-sm text-muted-foreground">
              Individual assessment performance for {selectedClass?.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assessmentOverview.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{assessment.title}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{assessment.type}</Badge>
                        <Badge variant="secondary">{assessment.subject}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{assessment.averageScore}%</div>
                      <p className="text-sm text-muted-foreground">Class Average</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Submissions</p>
                      <p className="font-medium">{assessment.totalSubmissions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Graded</p>
                      <p className="font-medium">{assessment.gradedSubmissions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium">{formatDate(assessment.dueDate)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <Progress value={assessment.averageScore} className="w-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClassId && loading && (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      )}
    </div>
  );
};

export default TeacherReports;