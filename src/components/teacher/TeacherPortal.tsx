import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CreateAssessment from './CreateAssessment';
import ClassSchedule from './ClassSchedule';
import ManageStudents from './ManageStudents';
import ManageClasses from './ManageClasses';
import AssessmentManagement from './AssessmentManagement';
import GradeBook from './GradeBook';
import GradeAnalytics from './GradeAnalytics';
import TeacherReports from './TeacherReports';
import StudentProgressTracking from './StudentProgressTracking';
import AllStudents from './AllStudents';
import AttendanceMarking from './AttendanceMarking';
import AnnouncementCompose from './AnnouncementCompose';
import BulkGrading from './BulkGrading';
import ReportCardGenerator from './ReportCardGenerator';
import TimetableBuilder from './TimetableBuilder';
import { BookOpen, Calendar, ClipboardList, Users, Award, TrendingUp, BarChart3, FileText, GraduationCap, Sparkles, CheckSquare, Megaphone, ListChecks, Printer, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';

const TAB_ITEMS = [
  { value: 'assessments', icon: ClipboardList, label: 'Create' },
  { value: 'manage-assessments', icon: FileText, label: 'Tests' },
  { value: 'gradebook', icon: BookOpen, label: 'Grades' },
  { value: 'bulk-grading', icon: ListChecks, label: 'Bulk Grade' },
  { value: 'analytics', icon: BarChart3, label: 'Stats' },
  { value: 'timetable', icon: LayoutGrid, label: 'Timetable' },
  { value: 'schedule', icon: Calendar, label: 'Schedule' },
  { value: 'students', icon: Users, label: 'Students' },
  { value: 'all-students', icon: GraduationCap, label: 'All Students' },
  { value: 'progress', icon: TrendingUp, label: 'Progress' },
  { value: 'reports', icon: TrendingUp, label: 'Reports' },
  { value: 'report-cards', icon: Printer, label: 'Report Cards' },
  { value: 'attendance', icon: CheckSquare, label: 'Attendance' },
  { value: 'announcements', icon: Megaphone, label: 'Announce' },
];

const TeacherPortal = () => {
  const { profile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('assessments');
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    classesCount: 0,
    studentsCount: 0,
    pendingGrading: 0,
    averagePerformance: 0
  });
  const [loading, setLoading] = useState(true);

  const handleAssessmentCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const currentIndex = TAB_ITEMS.findIndex(t => t.value === activeTab);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < TAB_ITEMS.length - 1;

  const goToTab = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < TAB_ITEMS.length) {
      setActiveTab(TAB_ITEMS[newIndex].value);
      // Scroll the tab into view
      setTimeout(() => {
        const tabEl = tabsListRef.current?.querySelector(`[data-state="active"]`);
        tabEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 50);
    }
  };

  useEffect(() => {
    if (!profile?.user_id) return;
    
    const fetchTeacherStats = async () => {
      setLoading(true);
      try {
        const { count: classesCount, error: classesError } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', profile.user_id);
        if (classesError) throw classesError;

        const { data: studentsData, error: studentsError } = await supabase
          .from('learners')
          .select('user_id, class_id!inner(teacher_id)')
          .eq('class_id.teacher_id', profile.user_id);
        if (studentsError) throw studentsError;

        const uniqueStudents = new Set(studentsData?.map(s => s.user_id) || []);

        const { count: pendingCount, error: pendingError } = await supabase
          .from('results')
          .select('assessment_id!inner(teacher_id)', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('assessment_id.teacher_id', profile.user_id);
        if (pendingError) throw pendingError;

        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select('marks_obtained, assessment_id!inner(total_marks, teacher_id)')
          .eq('status', 'graded')
          .eq('assessment_id.teacher_id', profile.user_id);
        if (resultsError) throw resultsError;

        let averagePerformance = 0;
        if (resultsData && resultsData.length > 0) {
          const totalPercentage = resultsData.reduce((sum, result) => {
            const assessment = result.assessment_id as any;
            return sum + (result.marks_obtained / assessment.total_marks) * 100;
          }, 0);
          averagePerformance = Math.round(totalPercentage / resultsData.length);
        }

        setStats({
          classesCount: classesCount || 0,
          studentsCount: uniqueStudents.size,
          pendingGrading: pendingCount || 0,
          averagePerformance
        });
      } catch (error) {
        console.error('Error fetching teacher stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherStats();
  }, [profile]);

  if (!loading && stats.classesCount === 0 && stats.studentsCount === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Welcome, {profile?.first_name || 'Teacher'}! 📚</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Set up your first class to get started.</p>
        </div>
        <Card className="glass-card border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-success/10 animate-scale-in">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Create a class and add subjects', 'Enroll your students', 'Create assessments and start grading'].map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-sm">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Tabs defaultValue="students" className="w-full animate-bounce-in">
          <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0">
            <TabsList className="inline-flex w-max min-w-full md:w-full md:grid md:grid-cols-3 glass-card gap-1">
              <TabsTrigger value="students" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /><span>Students</span>
              </TabsTrigger>
              <TabsTrigger value="assessments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /><span>Create Assessment</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /><span>Schedule</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="students" className="space-y-4 animate-fade-in"><ManageStudents /></TabsContent>
          <TabsContent value="assessments" className="space-y-4 animate-fade-in"><CreateAssessment onAssessmentCreated={handleAssessmentCreated} /></TabsContent>
          <TabsContent value="schedule" className="space-y-4 animate-fade-in"><ClassSchedule /></TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Teacher Portal</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your classes, assessments, and schedule</p>
      </div>

      {/* Quick Stats */}
      {loading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="glass-card"><CardContent className="pt-6"><LoadingSpinner size="sm" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 animate-scale-in">
          <Card className="hover-lift hover-glow glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{stats.classesCount}</div>
              <p className="text-xs text-muted-foreground">Active classes</p>
            </CardContent>
          </Card>
          <Card className="hover-lift hover-glow glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats.studentsCount}</div>
              <p className="text-xs text-muted-foreground">Across all classes</p>
            </CardContent>
          </Card>
          <Card className="hover-lift hover-glow glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.pendingGrading}</div>
              <p className="text-xs text-muted-foreground">Assignments to grade</p>
            </CardContent>
          </Card>
          <Card className="hover-lift hover-glow glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.averagePerformance}%</div>
              <p className="text-xs text-muted-foreground">Class average</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full animate-bounce-in">
        {/* Tab navigation with prev/next buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-full"
            onClick={() => goToTab('prev')}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 overflow-x-auto scrollbar-hide" ref={tabsListRef}>
            <TabsList className="inline-flex w-max glass-card gap-1 p-1">
              {TAB_ITEMS.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-1 sm:gap-2 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-full"
            onClick={() => goToTab('next')}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab indicator */}
        <div className="flex items-center justify-center gap-1 py-2">
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {TAB_ITEMS.length}
          </span>
        </div>
        
        <TabsContent value="assessments" className="space-y-4 animate-fade-in"><CreateAssessment onAssessmentCreated={handleAssessmentCreated} /></TabsContent>
        <TabsContent value="manage-assessments" className="space-y-4 animate-fade-in"><AssessmentManagement key={refreshKey} /></TabsContent>
        <TabsContent value="gradebook" className="space-y-4 animate-fade-in"><GradeBook /></TabsContent>
        <TabsContent value="bulk-grading" className="space-y-4 animate-fade-in"><BulkGrading /></TabsContent>
        <TabsContent value="analytics" className="space-y-4 animate-fade-in"><GradeAnalytics /></TabsContent>
        <TabsContent value="timetable" className="space-y-4 animate-fade-in"><TimetableBuilder /></TabsContent>
        <TabsContent value="schedule" className="space-y-4 animate-fade-in"><ClassSchedule /></TabsContent>
        <TabsContent value="students" className="space-y-4 animate-fade-in"><ManageStudents /></TabsContent>
        <TabsContent value="all-students" className="space-y-4 animate-fade-in"><AllStudents /></TabsContent>
        <TabsContent value="progress" className="space-y-4 animate-fade-in"><StudentProgressTracking /></TabsContent>
        <TabsContent value="reports" className="space-y-4 animate-fade-in"><TeacherReports /></TabsContent>
        <TabsContent value="report-cards" className="space-y-4 animate-fade-in"><ReportCardGenerator /></TabsContent>
        <TabsContent value="attendance" className="space-y-4 animate-fade-in"><AttendanceMarking /></TabsContent>
        <TabsContent value="announcements" className="space-y-4 animate-fade-in"><AnnouncementCompose /></TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherPortal;
