import { useAuth } from '@/hooks/useAuth';
import AnnouncementsFeed from '@/components/AnnouncementsFeed';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TeacherPortal from '@/components/teacher/TeacherPortal';
import { 
  BookOpen, 
  ClipboardList, 
  Award, 
  Users, 
  Calendar,
  TrendingUp,
  Clock,
  Sparkles,
  GraduationCap,
  Heart,
  ArrowRight
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

interface WelcomeOnboardingProps {
  role: 'learner' | 'parent' | 'teacher';
  firstName?: string | null;
}

const WelcomeOnboarding = ({ role, firstName }: WelcomeOnboardingProps) => {
  const navigate = useNavigate();
  const name = firstName || 'there';

  const config = {
    learner: {
      icon: GraduationCap,
      title: `Welcome, ${name}! 🎓`,
      subtitle: "You're all set up — now let's get you into a class!",
      steps: [
        { text: 'Your teacher will enroll you in a class', done: false },
        { text: 'Once enrolled, your assignments and schedule will appear here', done: false },
        { text: 'Check back soon or ask your teacher for help', done: false },
      ],
      cta: { label: 'View My Classes', path: '/my-classes' },
      gradient: 'from-primary/10 to-accent/10',
    },
    parent: {
      icon: Heart,
      title: `Welcome, ${name}! 💛`,
      subtitle: "Let's connect you with your child's learning journey.",
      steps: [
        { text: 'Ask your child\'s teacher to link your account', done: false },
        { text: 'Once linked, you\'ll see grades, assignments, and progress here', done: false },
        { text: 'You can also message teachers directly', done: false },
      ],
      cta: { label: 'View Children', path: '/children' },
      gradient: 'from-primary/10 to-info/10',
    },
    teacher: {
      icon: BookOpen,
      title: `Welcome, ${name}! 📚`,
      subtitle: 'Set up your first class to get started.',
      steps: [
        { text: 'Create a class and add subjects', done: false },
        { text: 'Enroll your students', done: false },
        { text: 'Create assessments and start grading', done: false },
      ],
      cta: { label: 'Go to Teacher Portal', path: '/assessments' },
      gradient: 'from-primary/10 to-success/10',
    },
  };

  const c = config[role];
  const Icon = c.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">{c.title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">{c.subtitle}</p>
      </div>

      <Card className={`glass-card border-dashed border-2 border-primary/20 bg-gradient-to-br ${c.gradient} animate-scale-in`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Getting Started
          </CardTitle>
          <CardDescription>Here's what happens next:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {c.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/60 backdrop-blur-sm">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm">{step.text}</p>
            </div>
          ))}

          <button
            onClick={() => navigate(c.cta.path)}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-3 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {c.cta.label}
            <ArrowRight className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

const LearnerDashboard = () => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({
    activeClasses: 0,
    pendingAssignments: 0,
    averageGrade: 0,
    nextClass: null as { time: string; subject: string } | null
  });
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNoData, setHasNoData] = useState(false);

  const fetchLearnerData = useCallback(async () => {
    if (!profile?.user_id) return;
      setLoading(true);
      try {
        // Fetch enrolled classes
        const { data: enrolledClasses, error: classesError } = await supabase
          .from('learners')
          .select('class_id, class:classes(name)')
          .eq('user_id', profile.user_id)
          .eq('status', 'active');

        if (classesError) throw classesError;

        const classIds = enrolledClasses?.map(e => e.class_id) || [];
        const activeClasses = classIds.length;

        if (classIds.length === 0) {
          setStats({ activeClasses: 0, pendingAssignments: 0, averageGrade: 0, nextClass: null });
          setHasNoData(true);
          setLoading(false);
          return;
        }

        // Fetch pending assignments (assessments not yet submitted)
        const { data: pendingAssessments, error: assessmentsError } = await supabase
          .from('assessments')
          .select(`
            id, title, due_date, type, 
            results!left(id, status, learner_id)
          `)
          .in('class_id', classIds)
          .eq('is_published', true);

        if (assessmentsError) throw assessmentsError;

        // Get learner record IDs
        const learnerRecords = enrolledClasses?.map(e => e.class_id) || [];
        const { data: learnerIds, error: learnerError } = await supabase
          .from('learners')
          .select('id')
          .eq('user_id', profile.user_id);

        if (learnerError) throw learnerError;
        const learnerIdsList = learnerIds?.map(l => l.id) || [];

        if (learnerIdsList.length === 0) {
          setStats({ activeClasses, pendingAssignments: 0, averageGrade: 0, nextClass: null });
          setLoading(false);
          return;
        }

        // Filter pending (no result or status is pending)
        const pending = pendingAssessments?.filter(a => {
          const results = a.results as any[];
          return !results || results.length === 0 || results.every(r => r.status === 'pending');
        }) || [];

        // Fetch recent results for average and display
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select(`
            id, marks_obtained, status, graded_at, feedback,
            assessment:assessments(id, title, total_marks, type),
            learner:learners!inner(user_id)
          `)
          .in('learner_id', learnerIdsList)
          .eq('status', 'graded')
          .order('graded_at', { ascending: false })
          .limit(5);

        if (resultsError) throw resultsError;

        let averageGrade = 0;
        if (resultsData && resultsData.length > 0) {
          const validResults = resultsData.filter(r => r.assessment && (r.assessment as any).total_marks);
          if (validResults.length > 0) {
            const totalPercentage = validResults.reduce((sum, result) => {
              const assessment = result.assessment as any;
              const percentage = (result.marks_obtained / assessment.total_marks) * 100;
              return sum + percentage;
            }, 0);
            averageGrade = Math.round(totalPercentage / validResults.length);
          }
        }

        // Get next class from schedule
        const today = new Date().getDay();
        const currentTime = format(new Date(), 'HH:mm:ss');
        
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('class_schedule')
          .select(`
            day_of_week, start_time, end_time,
            subject:subjects(name)
          `)
          .in('class_id', classIds)
          .gte('day_of_week', today)
          .order('day_of_week')
          .order('start_time')
          .limit(1);

        if (scheduleError) throw scheduleError;

        let nextClass = null;
        if (scheduleData && scheduleData.length > 0) {
          const schedule = scheduleData[0];
          const subject = schedule.subject as any;
          nextClass = {
            time: format(new Date(`2000-01-01T${schedule.start_time}`), 'h:mm a'),
            subject: subject.name
          };
        }

        setStats({
          activeClasses,
          pendingAssignments: pending.length,
          averageGrade,
          nextClass
        });

        // Set recent assignments
        setRecentAssignments(pending.slice(0, 3).map((a: any) => ({
          id: a.id,
          title: a.title,
          dueDate: a.due_date,
          type: a.type,
          status: 'pending'
        })));

        // Set recent grades
        setRecentGrades(resultsData?.filter((r: any) => r.assessment != null).slice(0, 3).map((r: any) => ({
          id: r.id,
          title: r.assessment.title,
          percentage: Math.round((r.marks_obtained / r.assessment.total_marks) * 100),
          gradedAt: r.graded_at
        })) || []);

      } catch (error) {
        console.error('Error fetching learner data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
      setLoading(false);
    }
  }, [profile?.user_id]);

  useEffect(() => {
    fetchLearnerData();
  }, [fetchLearnerData]);

  const handleRefresh = useCallback(async () => {
    await fetchLearnerData();
    toast.success('Dashboard refreshed');
  }, [fetchLearnerData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner text="Loading your dashboard..." />
      </div>
    );
  }

  if (hasNoData) {
    return <WelcomeOnboarding role="learner" firstName={profile?.first_name} />;
  }

  const content = (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Welcome Back!</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Here's what's happening in your learning journey</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 animate-scale-in">
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{stats.activeClasses}</div>
            <p className="text-xs text-muted-foreground">Enrolled classes</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">To be completed</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.averageGrade}%</div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Class</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-info" />
          </CardHeader>
          <CardContent>
            {stats.nextClass ? (
              <>
                <div className="text-2xl font-bold text-info">{stats.nextClass.time}</div>
                <p className="text-xs text-muted-foreground">{stats.nextClass.subject}</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                <p className="text-xs text-muted-foreground">No upcoming classes</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 animate-bounce-in">
        <Card className="glass-card hover-lift">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Recent Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
            {recentAssignments.length > 0 ? (
              recentAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{assignment.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {assignment.dueDate ? `Due ${format(new Date(assignment.dueDate), 'MMM d')}` : 'No due date'}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0">Pending</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No pending assignments</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
            {recentGrades.length > 0 ? (
              recentGrades.map((grade) => (
                <div key={grade.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{grade.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {grade.gradedAt ? format(new Date(grade.gradedAt), 'MMM d') : 'Recently graded'}
                    </p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${grade.percentage >= 80 ? "bg-success text-success-foreground" : grade.percentage >= 60 ? "bg-info text-info-foreground" : "bg-destructive text-destructive-foreground"}`}>
                    {grade.percentage}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No graded assignments yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <AnnouncementsFeed />
    </div>
  );

  if (isMobile) {
    return <PullToRefresh onRefresh={handleRefresh}>{content}</PullToRefresh>;
  }

  return content;
};

const ParentDashboard = () => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [hasNoData, setHasNoData] = useState(false);
  const [stats, setStats] = useState({
    childrenCount: 0,
    totalPendingTasks: 0,
    averagePerformance: 0,
    upcomingEvents: 0
  });
  const [childrenData, setChildrenData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchParentData = useCallback(async () => {
    if (!profile?.user_id) return;
    setLoading(true);
      try {
        // Fetch children relationships
        const { data: relationships, error: relationshipsError } = await supabase
          .from('parent_child_relationships')
          .select('child_user_id')
          .eq('parent_user_id', profile.user_id);

        if (relationshipsError) throw relationshipsError;

        const childUserIds = relationships?.map(r => r.child_user_id) || [];
        const childrenCount = childUserIds.length;

        if (childUserIds.length === 0) {
          setStats({ childrenCount: 0, totalPendingTasks: 0, averagePerformance: 0, upcomingEvents: 0 });
          setHasNoData(true);
          setLoading(false);
          return;
        }

        // Fetch children profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, first_name, last_name')
          .in('user_id', childUserIds);

        if (profilesError) throw profilesError;

        // Fetch learner records for each child
        const { data: learnerRecords, error: learnerError } = await supabase
          .from('learners')
          .select('id, user_id, class_id, class:classes(name, grade_level)')
          .in('user_id', childUserIds)
          .eq('status', 'active');

        if (learnerError) throw learnerError;

        const learnerIds = learnerRecords?.map(l => l.id) || [];
        const classIds = learnerRecords?.map(l => l.class_id) || [];

        if (learnerIds.length === 0 || classIds.length === 0) {
          setStats({ childrenCount, totalPendingTasks: 0, averagePerformance: 0, upcomingEvents: 0 });
          setChildrenData([]);
          setRecentActivity([]);
          setLoading(false);
          return;
        }

        // Fetch pending assessments
        const { data: assessments, error: assessmentsError } = await supabase
          .from('assessments')
          .select('id, title, class_id, results!left(id, status, learner_id)')
          .in('class_id', classIds)
          .eq('is_published', true);

        if (assessmentsError) throw assessmentsError;

        // Count pending tasks (assessments without results or with pending status)
        let totalPendingTasks = 0;
        assessments?.forEach(assessment => {
          const results = assessment.results as any[];
          learnerIds.forEach(learnerId => {
            const hasResult = results?.some(r => r.learner_id === learnerId && r.status !== 'pending');
            if (!hasResult) {
              totalPendingTasks++;
            }
          });
        });

        // Fetch grades for all children
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select(`
            id, marks_obtained, status, graded_at, feedback,
            assessment:assessments(id, title, total_marks, type),
            learner:learners!inner(user_id, id)
          `)
          .in('learner_id', learnerIds)
          .eq('status', 'graded')
          .order('graded_at', { ascending: false })
          .limit(20);

        if (resultsError) throw resultsError;

        // Calculate average performance across all children
        let averagePerformance = 0;
        if (resultsData && resultsData.length > 0) {
          const validResults = resultsData.filter(r => r.assessment && (r.assessment as any).total_marks);
          if (validResults.length > 0) {
            const totalPercentage = validResults.reduce((sum, result) => {
              const assessment = result.assessment as any;
              const percentage = (result.marks_obtained / assessment.total_marks) * 100;
              return sum + percentage;
            }, 0);
            averagePerformance = Math.round(totalPercentage / validResults.length);
          }
        }

        // Get upcoming schedule events
        const today = new Date().getDay();
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('class_schedule')
          .select('id, day_of_week, start_time')
          .in('class_id', classIds)
          .gte('day_of_week', today)
          .order('day_of_week')
          .order('start_time')
          .limit(10);

        if (scheduleError) throw scheduleError;

        const upcomingEvents = scheduleData?.length || 0;

        // Prepare children data with their stats
        const childrenWithStats = await Promise.all(
          profiles?.map(async (child) => {
            const childLearnerRecords = learnerRecords?.filter(l => l.user_id === child.user_id) || [];
            const childLearnerIds = childLearnerRecords.map(l => l.id);
            
            const childResults = resultsData?.filter(r => {
              const learner = r.learner as any;
              return learner.user_id === child.user_id;
            }) || [];

            let avgGrade = 0;
            const validChildResults = childResults.filter(r => r.assessment && (r.assessment as any).total_marks);
            if (validChildResults.length > 0) {
              const total = validChildResults.reduce((sum, r) => {
                const assessment = r.assessment as any;
                return sum + (r.marks_obtained / assessment.total_marks) * 100;
              }, 0);
              avgGrade = Math.round(total / validChildResults.length);
            }

            const primaryClass = childLearnerRecords[0]?.class as any;

            return {
              userId: child.user_id,
              name: child.full_name || `${child.first_name || ''} ${child.last_name || ''}`.trim(),
              className: primaryClass?.name || 'N/A',
              gradeLevel: primaryClass?.grade_level || 0,
              averageGrade: avgGrade
            };
          }) || []
        );

        // Get recent activity (last 5 graded results)
        const recentResults = resultsData?.filter((r: any) => r.assessment != null && r.learner != null).slice(0, 5).map((r: any) => {
          const learner = r.learner as any;
          const childProfile = profiles?.find(p => p.user_id === learner.user_id);
          const assessment = r.assessment as any;
          
          return {
            id: r.id,
            childName: childProfile?.full_name || 'Unknown',
            activity: `${assessment.title}`,
            type: assessment.type,
            gradedAt: r.graded_at,
            percentage: Math.round((r.marks_obtained / assessment.total_marks) * 100)
          };
        }) || [];

        setStats({
          childrenCount,
          totalPendingTasks,
          averagePerformance,
          upcomingEvents
        });
        setChildrenData(childrenWithStats);
        setRecentActivity(recentResults);

      } catch (error) {
        console.error('Error fetching parent data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
  }, [profile?.user_id]);

  useEffect(() => {
    fetchParentData();
  }, [fetchParentData]);

  const handleRefresh = useCallback(async () => {
    await fetchParentData();
    toast.success('Dashboard refreshed');
  }, [fetchParentData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner text="Loading dashboard..." />
      </div>
    );
  }

  if (hasNoData) {
    return <WelcomeOnboarding role="parent" firstName={profile?.first_name} />;
  }

  const content = (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Parent Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Track your children's academic progress</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 animate-scale-in">
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{stats.childrenCount}</div>
            <p className="text-xs text-muted-foreground">Active learners</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.totalPendingTasks}</div>
            <p className="text-xs text-muted-foreground">Across all children</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.averagePerformance}%</div>
            <p className="text-xs text-muted-foreground">Family average</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 animate-bounce-in">
        <Card className="glass-card hover-lift">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Children Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
            {childrenData.length > 0 ? (
              childrenData.map((child) => (
                <div key={child.userId} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{child.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Grade {child.gradeLevel} • {child.className}
                    </p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${child.averageGrade >= 80 ? "bg-success text-success-foreground" : child.averageGrade >= 60 ? "bg-info text-info-foreground" : "bg-muted text-muted-foreground"}`}>
                    {child.averageGrade > 0 ? `${child.averageGrade}%` : 'N/A'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No children linked yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
                  <Award className={`h-4 w-4 shrink-0 ${activity.percentage >= 80 ? "text-success" : activity.percentage >= 60 ? "text-info" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{activity.childName} - {activity.activity}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {activity.gradedAt ? format(new Date(activity.gradedAt), 'MMM d') : 'Recently graded'} • {activity.percentage}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <AnnouncementsFeed />
    </div>
  );

  if (isMobile) {
    return <PullToRefresh onRefresh={handleRefresh}>{content}</PullToRefresh>;
  }

  return content;
};

const TeacherDashboard = () => {
  return <TeacherPortal />;
};

const Dashboard = () => {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  switch (profile.role) {
    case 'admin':
      return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="animate-slide-up">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage users, classes, and system settings</p>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="hover-lift hover-glow glass-card cursor-pointer" onClick={() => window.location.href = '/admin'}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Manage Users</p>
                  <p className="text-xs text-muted-foreground">View and edit user accounts & roles</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-lift hover-glow glass-card cursor-pointer" onClick={() => window.location.href = '/admin'}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/50">
                  <BookOpen className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Manage Classes</p>
                  <p className="text-xs text-muted-foreground">Create and organize classes</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-lift hover-glow glass-card cursor-pointer" onClick={() => window.location.href = '/settings'}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-muted">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">System Settings</p>
                  <p className="text-xs text-muted-foreground">Configure platform settings</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <AnnouncementsFeed />
        </div>
      );
    case 'parent':
      return <ParentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    default:
      return <LearnerDashboard />;
  }
};

export default Dashboard;