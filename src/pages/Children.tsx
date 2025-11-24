import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { 
  Users, 
  TrendingUp, 
  ClipboardList, 
  Award, 
  Calendar,
  BookOpen,
  Mail,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';

interface ChildProfile {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  relationship_type: string;
}

interface ChildStats {
  activeClasses: number;
  pendingAssignments: number;
  averageGrade: number;
  totalAssessments: number;
}

interface ChildData {
  profile: ChildProfile;
  stats: ChildStats;
  recentGrades: Array<{
    title: string;
    percentage: number;
    date: string;
  }>;
}

const Children = () => {
  const { profile } = useAuth();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.user_id) return;

    const fetchChildren = async () => {
      setLoading(true);
      try {
        // Fetch parent-child relationships with child profiles
        const { data: relationships, error: relError } = await supabase
          .from('parent_child_relationships')
          .select(`
            child_user_id,
            relationship_type,
            child:profiles!parent_child_relationships_child_user_id_fkey(
              user_id,
              full_name,
              email,
              avatar_url,
              phone,
              date_of_birth
            )
          `)
          .eq('parent_user_id', profile.user_id);

        if (relError) throw relError;

        if (!relationships || relationships.length === 0) {
          setChildren([]);
          setLoading(false);
          return;
        }

        // Fetch stats for each child
        const childrenData = await Promise.all(
          relationships.map(async (rel: any) => {
            const childProfile = rel.child as ChildProfile;
            childProfile.relationship_type = rel.relationship_type;

            // Get learner records for this child
            const { data: learnerRecords } = await supabase
              .from('learners')
              .select('id, class_id')
              .eq('user_id', rel.child_user_id)
              .eq('status', 'active');

            const learnerIds = learnerRecords?.map(l => l.id) || [];
            const classIds = learnerRecords?.map(l => l.class_id) || [];

            // Get pending assignments
            const { data: assessments } = await supabase
              .from('assessments')
              .select(`
                id, 
                results!left(id, status, learner_id)
              `)
              .in('class_id', classIds)
              .eq('is_published', true);

            const pendingCount = assessments?.filter(a => {
              const results = a.results as any[];
              return !results || results.length === 0 || 
                     results.every(r => !learnerIds.includes(r.learner_id));
            }).length || 0;

            // Get graded results
            const { data: results } = await supabase
              .from('results')
              .select(`
                marks_obtained,
                graded_at,
                assessment:assessments(title, total_marks)
              `)
              .in('learner_id', learnerIds)
              .eq('status', 'graded')
              .order('graded_at', { ascending: false })
              .limit(5);

            let averageGrade = 0;
            const recentGrades: any[] = [];

            if (results && results.length > 0) {
              const totalPercentage = results.reduce((sum, result) => {
                const assessment = result.assessment as any;
                const percentage = (result.marks_obtained / assessment.total_marks) * 100;
                return sum + percentage;
              }, 0);
              averageGrade = Math.round(totalPercentage / results.length);

              results.slice(0, 3).forEach(r => {
                const assessment = r.assessment as any;
                recentGrades.push({
                  title: assessment.title,
                  percentage: Math.round((r.marks_obtained / assessment.total_marks) * 100),
                  date: r.graded_at
                });
              });
            }

            return {
              profile: childProfile,
              stats: {
                activeClasses: classIds.length,
                pendingAssignments: pendingCount,
                averageGrade,
                totalAssessments: results?.length || 0
              },
              recentGrades
            };
          })
        );

        setChildren(childrenData);
      } catch (error) {
        console.error('Error fetching children:', error);
        toast.error('Failed to load children data');
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [profile]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-success text-success-foreground';
    if (percentage >= 60) return 'bg-info text-info-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner text="Loading children data..." />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">My Children</h1>
          <p className="text-muted-foreground">View and manage your children's academic progress</p>
        </div>

        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Children Linked</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              You don't have any children linked to your parent account yet. Please contact your school administrator to link your children's accounts.
            </p>
            <Button variant="outline" onClick={() => toast.info('Please contact your school administrator')}>
              <Mail className="h-4 w-4 mr-2" />
              Contact Administrator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">My Children</h1>
        <p className="text-muted-foreground">View and manage your children's academic progress</p>
      </div>

      <div className="grid gap-6">
        {children.map((child) => (
          <Card key={child.profile.user_id} className="glass-card hover-lift">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary">
                  <AvatarImage src={child.profile.avatar_url || ''} />
                  <AvatarFallback className="text-lg bg-primary/10">
                    {getInitials(child.profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{child.profile.full_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{child.profile.relationship_type}</Badge>
                        {child.profile.date_of_birth && (
                          <span className="text-sm">
                            Born: {format(new Date(child.profile.date_of_birth), 'MMM d, yyyy')}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    {child.profile.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{child.profile.email}</span>
                      </div>
                    )}
                    {child.profile.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{child.profile.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{child.stats.activeClasses}</p>
                    <p className="text-xs text-muted-foreground">Active Classes</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <ClipboardList className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold">{child.stats.pendingAssignments}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Award className="h-8 w-8 text-success" />
                  <div>
                    <p className="text-2xl font-bold">{child.stats.averageGrade}%</p>
                    <p className="text-xs text-muted-foreground">Average Grade</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <TrendingUp className="h-8 w-8 text-info" />
                  <div>
                    <p className="text-2xl font-bold">{child.stats.totalAssessments}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </div>

              {/* Performance Overview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Academic Performance</h4>
                  <span className="text-sm text-muted-foreground">{child.stats.averageGrade}%</span>
                </div>
                <Progress value={child.stats.averageGrade} className="h-2" />
              </div>

              {/* Recent Grades */}
              {child.recentGrades.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Recent Grades
                  </h4>
                  <div className="space-y-2">
                    {child.recentGrades.map((grade, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{grade.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(grade.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge className={getGradeColor(grade.percentage)}>
                          {grade.percentage}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
                <Button variant="outline" className="flex-1">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  View Assignments
                </Button>
                <Button variant="outline" className="flex-1">
                  <Award className="h-4 w-4 mr-2" />
                  View Results
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Children;
