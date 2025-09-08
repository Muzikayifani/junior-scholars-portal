import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, TrendingUp, Edit, Save, X, Plus, BarChart3 } from 'lucide-react';

interface GradeBookEntry {
  id: string;
  student_name: string;
  student_id: string;
  class_name: string;
  assessments: {
    [assessmentId: string]: {
      title: string;
      type: string;
      total_marks: number;
      marks_obtained: number | null;
      status: string;
      percentage: number | null;
      feedback?: string;
      resultId?: string;
    };
  };
  average: number;
  total_points: number;
  possible_points: number;
}

interface Assessment {
  id: string;
  title: string;
  type: string;
  total_marks: number;
  class_id: string;
  class_name: string;
}

const GradeBook = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gradeData, setGradeData] = useState<GradeBookEntry[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<any[]>([]);
  const [editingGrade, setEditingGrade] = useState<{
    studentId: string;
    assessmentId: string;
    resultId?: string;
  } | null>(null);
  const [editMarks, setEditMarks] = useState<string>('');
  const [editFeedback, setEditFeedback] = useState<string>('');

  useEffect(() => {
    loadClasses();
    loadGradeBookData();
  }, [profile, selectedClass]);

  const loadClasses = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('classes')
      .select('id, name, grade_level')
      .order('name');

    if (!error && data) {
      setClasses(data);
    }
  };

  const loadGradeBookData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Get assessments created by teacher
      let assessmentQuery = supabase
        .from('assessments')
        .select(`
          id, title, type, total_marks, class_id,
          class:classes(name)
        `)
        .eq('teacher_id', profile.user_id);

      if (selectedClass !== 'all') {
        assessmentQuery = assessmentQuery.eq('class_id', selectedClass);
      }

      const { data: assessmentData, error: assessmentError } = await assessmentQuery;
      if (assessmentError) throw assessmentError;

      setAssessments(assessmentData?.map(a => ({
        ...a,
        class_name: a.class?.name || ''
      })) || []);

      if (!assessmentData || assessmentData.length === 0) {
        setGradeData([]);
        setLoading(false);
        return;
      }

      // Get all students in the classes that have assessments
      const classIds = [...new Set(assessmentData.map(a => a.class_id))];
      const { data: studentData, error: studentError } = await supabase
        .from('learners')
        .select(`
          id,
          class_id,
          profile_data:profiles!fk_learners_user_id(full_name),
          class:classes(name)
        `)
        .in('class_id', classIds);

      if (studentError) throw studentError;

      // Get all results for these assessments
      const assessmentIds = assessmentData.map(a => a.id);
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (resultError) throw resultError;

      // Process the data into gradebook format
      const gradeBookEntries: GradeBookEntry[] = studentData?.map(student => {
        const studentAssessments: any = {};
        let totalPoints = 0;
        let possiblePoints = 0;
        let gradedAssessments = 0;

        assessmentData.forEach(assessment => {
          if (assessment.class_id === student.class_id) {
            const result = resultData?.find(r => 
              r.learner_id === student.id && r.assessment_id === assessment.id
            );

            const marksObtained = result?.marks_obtained;
            const percentage = marksObtained !== null && marksObtained !== undefined 
              ? Math.round((marksObtained / assessment.total_marks) * 100) 
              : null;

            studentAssessments[assessment.id] = {
              title: assessment.title,
              type: assessment.type,
              total_marks: assessment.total_marks,
              marks_obtained: marksObtained,
              status: result?.status || 'pending',
              percentage,
              feedback: result?.feedback || '',
              resultId: result?.id
            };

            possiblePoints += assessment.total_marks;
            if (marksObtained !== null && marksObtained !== undefined) {
              totalPoints += marksObtained;
              gradedAssessments++;
            }
          }
        });

        const average = gradedAssessments > 0 ? Math.round((totalPoints / possiblePoints) * 100) : 0;

        return {
          id: student.id,
          student_name: 'Unknown Student',
          student_id: student.id,
          class_name: student.class?.name || '',
          assessments: studentAssessments,
          average,
          total_points: totalPoints,
          possible_points: possiblePoints
        };
      }) || [];

      setGradeData(gradeBookEntries);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleGradeEdit = async (studentId: string, assessmentId: string, resultId?: string) => {
    const student = gradeData.find(s => s.student_id === studentId);
    const assessment = student?.assessments[assessmentId];
    
    if (assessment) {
      setEditMarks(assessment.marks_obtained?.toString() || '');
      setEditFeedback(assessment.feedback || '');
      setEditingGrade({ studentId, assessmentId, resultId });
    }
  };

  const saveGrade = async () => {
    if (!editingGrade) return;

    try {
      const marks = editMarks ? parseInt(editMarks) : null;
      const assessment = assessments.find(a => a.id === editingGrade.assessmentId);
      
      if (marks !== null && assessment && marks > assessment.total_marks) {
        toast({
          title: "Error",
          description: `Marks cannot exceed ${assessment.total_marks}`,
          variant: "destructive"
        });
        return;
      }

      if (editingGrade.resultId) {
        // Update existing result
        const { error } = await supabase
          .from('results')
          .update({
            marks_obtained: marks,
            feedback: editFeedback,
            status: marks !== null ? 'graded' : 'pending',
            graded_at: marks !== null ? new Date().toISOString() : null
          })
          .eq('id', editingGrade.resultId);

        if (error) throw error;
      } else {
        // Create new result
        const { error } = await supabase
          .from('results')
          .insert({
            learner_id: editingGrade.studentId,
            assessment_id: editingGrade.assessmentId,
            marks_obtained: marks,
            feedback: editFeedback,
            status: marks !== null ? 'graded' : 'pending',
            graded_at: marks !== null ? new Date().toISOString() : null
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Grade saved successfully!"
      });

      setEditingGrade(null);
      loadGradeBookData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return "text-muted-foreground";
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getClassAverage = () => {
    const validAverages = gradeData.filter(entry => entry.average > 0);
    if (validAverages.length === 0) return 0;
    return Math.round(validAverages.reduce((sum, entry) => sum + entry.average, 0) / validAverages.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Grade Book
          </h2>
          <p className="text-muted-foreground">Manage and track student grades</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{gradeData.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Class Average</p>
                <p className="text-2xl font-bold">{getClassAverage()}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                <p className="text-2xl font-bold">{assessments.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading grades...</p>
            </div>
          ) : gradeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students or assessments found.</p>
              <p className="text-sm">Create assessments and enroll students to start grading.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Student</TableHead>
                    <TableHead className="sticky left-[200px] bg-background">Class</TableHead>
                    {assessments.map(assessment => (
                      <TableHead key={assessment.id} className="text-center min-w-[120px]">
                        <div>
                          <div className="font-medium">{assessment.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {assessment.type} ({assessment.total_marks} pts)
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center bg-muted/50">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradeData.map(student => (
                    <TableRow key={student.student_id}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        {student.student_name}
                      </TableCell>
                      <TableCell className="sticky left-[200px] bg-background">
                        {student.class_name}
                      </TableCell>
                      {assessments.map(assessment => {
                        const grade = student.assessments[assessment.id];
                        return (
                          <TableCell key={assessment.id} className="text-center">
                            {grade ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-2 flex flex-col"
                                    onClick={() => handleGradeEdit(
                                      student.student_id,
                                      assessment.id,
                                      grade.resultId
                                    )}
                                  >
                                    <div className={`font-medium ${getGradeColor(grade.percentage)}`}>
                                      {grade.marks_obtained !== null ? (
                                        <>
                                          {grade.marks_obtained}/{grade.total_marks}
                                          <div className="text-xs">({grade.percentage}%)</div>
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground">Not graded</span>
                                      )}
                                    </div>
                                    <Badge
                                      variant={
                                        grade.status === 'graded' ? 'default' :
                                        grade.status === 'submitted' ? 'secondary' : 'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {grade.status}
                                    </Badge>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Grade: {student.student_name} - {assessment.title}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">
                                        Marks (out of {assessment.total_marks})
                                      </label>
                                      <Input
                                        type="number"
                                        max={assessment.total_marks}
                                        min="0"
                                        value={editMarks}
                                        onChange={(e) => setEditMarks(e.target.value)}
                                        placeholder="Enter marks"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Feedback</label>
                                      <Textarea
                                        value={editFeedback}
                                        onChange={(e) => setEditFeedback(e.target.value)}
                                        placeholder="Enter feedback for the student"
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button onClick={saveGrade}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Grade
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => setEditingGrade(null)}
                                      >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center bg-muted/50">
                        <div className={`font-bold ${getGradeColor(student.average)}`}>
                          {student.average}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.total_points}/{student.possible_points}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeBook;