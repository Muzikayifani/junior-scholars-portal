import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, User, Calendar, Target } from 'lucide-react';

const StudentProgressTracking = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  useEffect(() => {
    loadClasses();
  }, [profile]);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents();
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentProgress();
    }
  }, [selectedStudentId]);

  const loadClasses = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('classes')
      .select('*');
    
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

  const loadStudents = async () => {
    if (!selectedClassId) return;
    
    const { data, error } = await supabase
      .from('learners')
      .select(`
        *,
        profile:profiles(first_name, last_name, email)
      `)
      .eq('class_id', selectedClassId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setStudents(data || []);
    }
  };

  const loadStudentProgress = async () => {
    if (!selectedStudentId) return;
    
    setLoading(true);
    
    // Get student info
    const studentData = students.find(s => s.id === selectedStudentId);
    setStudentInfo(studentData);

    // Get all results for this student
    const { data: results, error } = await supabase
      .from('results')
      .select(`
        *,
        assessment:assessments(
          title,
          type,
          total_marks,
          due_date,
          subject:subjects(name, code)
        )
      `)
      .eq('learner_id', selectedStudentId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setProgressData(results || []);
    }
    
    setLoading(false);
  };

  const calculateOverallPerformance = () => {
    if (progressData.length === 0) return 0;
    
    const gradedResults = progressData.filter(r => r.marks_obtained !== null);
    if (gradedResults.length === 0) return 0;
    
    const totalPercentage = gradedResults.reduce((sum, result) => {
      const percentage = (result.marks_obtained / result.assessment.total_marks) * 100;
      return sum + percentage;
    }, 0);
    
    return Math.round(totalPercentage / gradedResults.length);
  };

  const getSubjectPerformance = () => {
    const subjectMap = new Map();
    
    progressData.forEach(result => {
      if (result.marks_obtained === null) return;
      
      const subjectName = result.assessment.subject.name;
      const percentage = (result.marks_obtained / result.assessment.total_marks) * 100;
      
      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, { total: 0, count: 0, marks: [] });
      }
      
      const subject = subjectMap.get(subjectName);
      subject.total += percentage;
      subject.count += 1;
      subject.marks.push(percentage);
    });
    
    return Array.from(subjectMap.entries()).map(([name, data]) => ({
      subject: name,
      average: Math.round(data.total / data.count),
      assessments: data.count,
      trend: data.marks.length > 1 ? 
        (data.marks[data.marks.length - 1] > data.marks[data.marks.length - 2] ? 'up' : 'down') : 
        'stable'
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500';
      case 'graded': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const overallPerformance = calculateOverallPerformance();
  const subjectPerformance = getSubjectPerformance();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Student Progress Tracking
        </h2>
        <p className="text-muted-foreground">Monitor individual student performance and progress</p>
      </div>

      {/* Class and Student Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
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
              <Label>Student</Label>
              <Select 
                value={selectedStudentId} 
                onValueChange={setSelectedStudentId}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student['Student FullName'] || 
                       `${student.profile?.first_name} ${student.profile?.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Progress Overview */}
      {selectedStudentId && studentInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">
                  {studentInfo['Student FullName'] || 
                   `${studentInfo.profile?.first_name} ${studentInfo.profile?.last_name}`}
                </p>
                <p className="text-sm text-muted-foreground">{studentInfo.student_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm">{studentInfo.profile?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emergency Contact</p>
                <p className="text-sm">{studentInfo.emergency_contact || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Overall Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{overallPerformance}%</div>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
              <Progress value={overallPerformance} className="w-full" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Based on {progressData.filter(r => r.marks_obtained !== null).length} graded assessments
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {progressData.slice(-3).reverse().map((result) => (
                  <div key={result.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{result.assessment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.assessment.subject.name}
                      </p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                ))}
                {progressData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    No assessments yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subject Performance */}
      {selectedStudentId && subjectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectPerformance.map((subject) => (
                <Card key={subject.subject}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{subject.subject}</h4>
                      {subject.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : subject.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Average</span>
                        <span className="font-medium">{subject.average}%</span>
                      </div>
                      <Progress value={subject.average} className="w-full" />
                      <p className="text-xs text-muted-foreground">
                        {subject.assessments} assessment{subject.assessments !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment History */}
      {selectedStudentId && progressData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressData.map((result) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{result.assessment.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {result.assessment.subject.name} • {result.assessment.type}
                      </p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  
                  {result.marks_obtained !== null ? (
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm">Score</span>
                      <span className="font-medium">
                        {result.marks_obtained}/{result.assessment.total_marks} 
                        ({Math.round((result.marks_obtained / result.assessment.total_marks) * 100)}%)
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-3">
                      {result.status === 'pending' ? 'Not submitted yet' : 'Awaiting grading'}
                    </p>
                  )}
                  
                  {result.feedback && (
                    <div className="mt-3 p-3 bg-muted rounded">
                      <p className="text-sm text-muted-foreground mb-1">Feedback</p>
                      <p className="text-sm">{result.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentProgressTracking;