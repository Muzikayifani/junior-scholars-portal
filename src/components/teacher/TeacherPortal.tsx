import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
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
      setTimeout(() => {
        const container = tabsListRef.current;
        const tabEl = container?.querySelector(`[data-state="active"]`) as HTMLElement;
        if (tabEl && container) {
          const containerRect = container.getBoundingClientRect();
          const tabRect = tabEl.getBoundingClientRect();
          const scrollLeft = container.scrollLeft + (tabRect.left - containerRect.left) - (containerRect.width / 2) + (tabRect.width / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
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

      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        setTimeout(() => {
          const container = tabsListRef.current;
          const tabEl = container?.querySelector(`[data-state="active"]`) as HTMLElement;
          if (tabEl && container) {
            const containerRect = container.getBoundingClientRect();
            const tabRect = tabEl.getBoundingClientRect();
            const scrollLeft = container.scrollLeft + (tabRect.left - containerRect.left) - (containerRect.width / 2) + (tabRect.width / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          }
        }, 50);
      }} className="w-full animate-fade-in">
        {/* Tab navigation with nav buttons before tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all duration-300 disabled:opacity-30 disabled:bg-muted"
              onClick={() => goToTab('prev')}
              disabled={!canGoPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 border border-accent-foreground/10 transition-all duration-300 disabled:opacity-30 disabled:bg-muted"
              onClick={() => goToTab('next')}
              disabled={!canGoNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div
            className="flex-1 overflow-x-auto scrollbar-hide scroll-smooth"
            ref={tabsListRef}
          >
            <TabsList className="inline-flex w-max bg-muted/50 backdrop-blur-sm gap-0.5 p-1 rounded-lg border border-border/30">
              {TAB_ITEMS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-300 ease-out",
                      "hover:bg-background/60",
                      "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:scale-[1.02]"
                    )}
                  >
                    <Icon className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-all duration-300",
                      isActive && "text-primary"
                    )} />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        {/* Tab position indicator */}
        <div className="flex items-center justify-center gap-1.5 py-1.5">
          <div className="flex gap-0.5">
            {TAB_ITEMS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-300 ease-out",
                  i === currentIndex
                    ? "w-4 bg-primary"
                    : "w-1 bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
        </div>
        
        <div key={activeTab} className="animate-fade-in">
          <TabsContent value="assessments" className="space-y-4"><CreateAssessment onAssessmentCreated={handleAssessmentCreated} /></TabsContent>
          <TabsContent value="manage-assessments" className="space-y-4"><AssessmentManagement key={refreshKey} /></TabsContent>
          <TabsContent value="gradebook" className="space-y-4"><GradeBook /></TabsContent>
          <TabsContent value="bulk-grading" className="space-y-4"><BulkGrading /></TabsContent>
          <TabsContent value="analytics" className="space-y-4"><GradeAnalytics /></TabsContent>
          <TabsContent value="timetable" className="space-y-4"><TimetableBuilder /></TabsContent>
          <TabsContent value="schedule" className="space-y-4"><ClassSchedule /></TabsContent>
          <TabsContent value="students" className="space-y-4"><ManageStudents /></TabsContent>
          <TabsContent value="all-students" className="space-y-4"><AllStudents /></TabsContent>
          <TabsContent value="progress" className="space-y-4"><StudentProgressTracking /></TabsContent>
          <TabsContent value="reports" className="space-y-4"><TeacherReports /></TabsContent>
          <TabsContent value="report-cards" className="space-y-4"><ReportCardGenerator /></TabsContent>
          <TabsContent value="attendance" className="space-y-4"><AttendanceMarking /></TabsContent>
          <TabsContent value="announcements" className="space-y-4"><AnnouncementCompose /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TeacherPortal;
