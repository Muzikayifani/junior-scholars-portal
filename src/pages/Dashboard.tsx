import { useAuth } from '@/hooks/useAuth';
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
  CheckCircle
} from 'lucide-react';

const LearnerDashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Welcome Back!</h1>
        <p className="text-muted-foreground">Here's what's happening in your learning journey</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-scale-in">
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">6</div>
            <p className="text-xs text-muted-foreground">Subjects this term</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">4</div>
            <p className="text-xs text-muted-foreground">Due this week</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">85%</div>
            <p className="text-xs text-muted-foreground">+2% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Class</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">2:30 PM</div>
            <p className="text-xs text-muted-foreground">Mathematics</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 animate-bounce-in">
        <Card className="glass-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Recent Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <div>
                <p className="font-medium">Math Homework - Chapter 5</p>
                <p className="text-sm text-muted-foreground">Due tomorrow</p>
              </div>
              <Badge variant="destructive">Pending</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <div>
                <p className="font-medium">Science Project</p>
                <p className="text-sm text-muted-foreground">Due Friday</p>
              </div>
              <Badge variant="secondary">In Progress</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <div>
                <p className="font-medium">English Essay</p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </div>
              <Badge className="bg-success text-success-foreground">Completed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <div>
                <p className="font-medium">Mathematics Test</p>
                <p className="text-sm text-muted-foreground">Last week</p>
              </div>
              <Badge className="bg-success text-success-foreground">92%</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <div>
                <p className="font-medium">Science Quiz</p>
                <p className="text-sm text-muted-foreground">2 weeks ago</p>
              </div>
              <Badge className="bg-info text-info-foreground">88%</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <div>
                <p className="font-medium">English Assignment</p>
                <p className="text-sm text-muted-foreground">3 weeks ago</p>
              </div>
              <Badge className="bg-success text-success-foreground">95%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ParentDashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Parent Dashboard</h1>
        <p className="text-muted-foreground">Track your children's academic progress</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-scale-in">
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">2</div>
            <p className="text-xs text-muted-foreground">Active learners</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">7</div>
            <p className="text-xs text-muted-foreground">Across all children</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">87%</div>
            <p className="text-xs text-muted-foreground">Family average</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift hover-glow glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">3</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 animate-bounce-in">
        <Card className="glass-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Children Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <div>
                <p className="font-medium">Emma Johnson</p>
                <p className="text-sm text-muted-foreground">Grade 5 • Class 5A</p>
              </div>
              <Badge className="bg-info text-info-foreground">89% Avg</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <div>
                <p className="font-medium">James Johnson</p>
                <p className="text-sm text-muted-foreground">Grade 3 • Class 3B</p>
              </div>
              <Badge className="bg-success text-success-foreground">91% Avg</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <CheckCircle className="h-4 w-4 text-success" />
              <div className="flex-1">
                <p className="font-medium">Emma completed Math assignment</p>
                <p className="text-sm text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
              <Award className="h-4 w-4 text-info" />
              <div className="flex-1">
                <p className="font-medium">James received Science quiz result</p>
                <p className="text-sm text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
    case 'parent':
      return <ParentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    default:
      return <LearnerDashboard />;
  }
};

export default Dashboard;