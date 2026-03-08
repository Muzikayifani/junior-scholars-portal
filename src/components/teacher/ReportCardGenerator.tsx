import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Users, Printer } from 'lucide-react';
import jsPDF from 'jspdf';

const ReportCardGenerator = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [teacherComment, setTeacherComment] = useState('');

  useEffect(() => {
    if (profile) loadClasses();
  }, [profile]);

  useEffect(() => {
    if (selectedClass) loadStudents();
  }, [selectedClass]);

  useEffect(() => {
    if (selectedStudent && selectedClass) loadReportData();
  }, [selectedStudent]);

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', profile!.user_id)
      .order('name');
    setClasses(data || []);
  };

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('learners')
      .select('id, user_id, student_number, profile:profiles(first_name, last_name, full_name)')
      .eq('class_id', selectedClass)
      .order('student_number');
    setStudents(data || []);
    setSelectedStudent('');
    setReportData(null);
    setLoading(false);
  };

  const loadReportData = async () => {
    setLoading(true);
    const student = students.find(s => s.id === selectedStudent);
    if (!student) { setLoading(false); return; }

    // Load all results for this student with assessment + subject info
    const { data: results } = await supabase
      .from('results')
      .select(`
        marks_obtained, status, feedback,
        assessment:assessments(title, total_marks, type, subject:subjects(name, code))
      `)
      .eq('learner_id', selectedStudent)
      .eq('status', 'graded');

    // Load attendance
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status, date')
      .eq('learner_id', selectedStudent)
      .eq('class_id', selectedClass);

    // Group results by subject
    const subjectMap: Record<string, { name: string; assessments: any[]; total: number; obtained: number }> = {};
    (results || []).forEach((r: any) => {
      const subjectName = r.assessment?.subject?.name || 'Unknown';
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { name: subjectName, assessments: [], total: 0, obtained: 0 };
      }
      subjectMap[subjectName].assessments.push(r);
      subjectMap[subjectName].total += r.assessment?.total_marks || 0;
      subjectMap[subjectName].obtained += r.marks_obtained || 0;
    });

    // Attendance summary
    const totalDays = (attendance || []).length;
    const present = (attendance || []).filter((a: any) => a.status === 'present').length;
    const absent = (attendance || []).filter((a: any) => a.status === 'absent').length;
    const late = (attendance || []).filter((a: any) => a.status === 'late').length;
    const excused = (attendance || []).filter((a: any) => a.status === 'excused').length;

    const classData = classes.find(c => c.id === selectedClass);

    setReportData({
      student,
      className: classData?.name || '',
      gradeLevel: classData?.grade_level || '',
      schoolYear: classData?.school_year || '',
      subjects: Object.values(subjectMap),
      attendance: { totalDays, present, absent, late, excused },
      overallAverage: Object.values(subjectMap).length > 0
        ? Math.round(
            Object.values(subjectMap).reduce((sum, s) => sum + (s.obtained / s.total) * 100, 0) /
            Object.values(subjectMap).length
          )
        : 0,
    });
    setLoading(false);
  };

  const getGradeSymbol = (percentage: number) => {
    if (percentage >= 80) return { symbol: 'A', color: '#22c55e' };
    if (percentage >= 70) return { symbol: 'B', color: '#3b82f6' };
    if (percentage >= 60) return { symbol: 'C', color: '#f59e0b' };
    if (percentage >= 50) return { symbol: 'D', color: '#f97316' };
    return { symbol: 'F', color: '#ef4444' };
  };

  const generatePDF = async () => {
    if (!reportData) return;
    setGenerating(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const w = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, w, 35, 'F');
      doc.setTextColor(255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Report Card', w / 2, 16, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`${reportData.className} — Grade ${reportData.gradeLevel} — ${reportData.schoolYear}`, w / 2, 26, { align: 'center' });

      y = 45;
      doc.setTextColor(0);

      // Student Info
      const studentName = reportData.student.profile?.full_name ||
        `${reportData.student.profile?.first_name || ''} ${reportData.student.profile?.last_name || ''}`.trim();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Student:', 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(studentName, 45, y);
      doc.setFont('helvetica', 'bold');
      doc.text('Number:', 120, y);
      doc.setFont('helvetica', 'normal');
      doc.text(reportData.student.student_number || 'N/A', 148, y);

      y += 12;

      // Academic Performance Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Academic Performance', 15, y);
      y += 8;

      // Table header
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y - 5, w - 30, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject', 18, y);
      doc.text('Marks', 90, y);
      doc.text('Percentage', 120, y);
      doc.text('Grade', 160, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      reportData.subjects.forEach((subject: any) => {
        const pct = Math.round((subject.obtained / subject.total) * 100);
        const grade = getGradeSymbol(pct);

        doc.setFontSize(10);
        doc.text(subject.name, 18, y);
        doc.text(`${subject.obtained}/${subject.total}`, 90, y);
        doc.text(`${pct}%`, 120, y);

        doc.setTextColor(
          parseInt(grade.color.slice(1, 3), 16),
          parseInt(grade.color.slice(3, 5), 16),
          parseInt(grade.color.slice(5, 7), 16)
        );
        doc.setFont('helvetica', 'bold');
        doc.text(grade.symbol, 165, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);

        y += 7;
      });

      // Overall average
      y += 3;
      doc.setFillColor(37, 99, 235);
      doc.rect(15, y - 5, w - 30, 9, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Overall Average', 18, y);
      doc.text(`${reportData.overallAverage}%`, 120, y);
      const overallGrade = getGradeSymbol(reportData.overallAverage);
      doc.text(overallGrade.symbol, 165, y);
      doc.setTextColor(0);

      y += 16;

      // Attendance Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Attendance Summary', 15, y);
      y += 8;

      const att = reportData.attendance;
      const attRate = att.totalDays > 0 ? Math.round((att.present / att.totalDays) * 100) : 0;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const attItems = [
        ['Total Days', att.totalDays.toString()],
        ['Present', att.present.toString()],
        ['Absent', att.absent.toString()],
        ['Late', att.late.toString()],
        ['Excused', att.excused.toString()],
        ['Attendance Rate', `${attRate}%`],
      ];

      attItems.forEach(([label, val], i) => {
        const xBase = i < 3 ? 18 : 100;
        const yOff = i < 3 ? i * 7 : (i - 3) * 7;
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, xBase, y + yOff);
        doc.setFont('helvetica', 'normal');
        doc.text(val, xBase + 40, y + yOff);
      });

      y += 25;

      // Teacher Comment
      if (teacherComment.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text("Teacher's Comment", 15, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(teacherComment, w - 30);
        doc.text(lines, 15, y);
        y += lines.length * 5 + 5;
      }

      // Footer
      y += 10;
      doc.setDrawColor(200);
      doc.line(15, y, 80, y);
      doc.line(120, y, w - 15, y);
      y += 5;
      doc.setFontSize(9);
      doc.text("Teacher's Signature", 15, y);
      doc.text("Date", 120, y);

      doc.save(`report-card-${studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast({ title: 'Report card generated', description: 'PDF downloaded successfully.' });
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Report Card Generator
        </h2>
        <p className="text-muted-foreground">Generate downloadable PDF report cards for your students</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Select Student</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Choose class..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} (Grade {c.grade_level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder="Choose student..." /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.profile?.full_name || `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.trim()} ({s.student_number || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card className="glass-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Report Card Preview</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {reportData.student.profile?.full_name || `${reportData.student.profile?.first_name} ${reportData.student.profile?.last_name}`} —
                {reportData.className} — Overall: {reportData.overallAverage}%
              </p>
            </div>
            <Button onClick={generatePDF} disabled={generating} className="btn-gradient w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Download PDF'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Academic Performance */}
            <div>
              <h4 className="font-semibold mb-3">Academic Performance</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.subjects.map((s: any, i: number) => {
                      const pct = Math.round((s.obtained / s.total) * 100);
                      const grade = getGradeSymbol(pct);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.obtained}/{s.total}</TableCell>
                          <TableCell>{pct}%</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: grade.color, color: '#fff' }}>{grade.symbol}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold bg-primary/5">
                      <TableCell>Overall Average</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>{reportData.overallAverage}%</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: getGradeSymbol(reportData.overallAverage).color, color: '#fff' }}>
                          {getGradeSymbol(reportData.overallAverage).symbol}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Attendance */}
            <div>
              <h4 className="font-semibold mb-3">Attendance Summary</h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Total Days', value: reportData.attendance.totalDays },
                  { label: 'Present', value: reportData.attendance.present },
                  { label: 'Absent', value: reportData.attendance.absent },
                  { label: 'Late', value: reportData.attendance.late },
                  { label: 'Excused', value: reportData.attendance.excused },
                  {
                    label: 'Rate',
                    value: reportData.attendance.totalDays > 0
                      ? `${Math.round((reportData.attendance.present / reportData.attendance.totalDays) * 100)}%`
                      : 'N/A',
                  },
                ].map((item, i) => (
                  <Card key={i} className="text-center p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-bold">{item.value}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Teacher Comment */}
            <div className="space-y-2">
              <Label>Teacher's Comment (included in PDF)</Label>
              <Textarea
                value={teacherComment}
                onChange={e => setTeacherComment(e.target.value)}
                placeholder="Write a comment for this student's report card..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading report data...</p>
        </div>
      )}
    </div>
  );
};

export default ReportCardGenerator;
