import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, Calendar, Clock, GraduationCap, Plus } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ClassData {
  id: string;
  name: string;
  grade_level: number;
  school_year?: string;
  teacher?: {
    full_name: string;
  };
  student_count?: number;
  subjects?: string[];
  next_session?: string;
}

export default function MyClasses() {
  const { profile, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    grade_level: '',
    school_year: '2024-2025'
  });

  useEffect(() => {
    if (profile && user) {
      fetchClasses();
    }
  }, [profile, user]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      
      if (profile?.role === 'teacher') {
        // Teachers see classes they teach
        const { data, error } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            grade_level,
            school_year,
            capacity,
            created_at
          `)
          .eq('teacher_id', profile.user_id);

        if (error) throw error;
        setClasses(data || []);
      } else if (profile?.role === 'learner') {
        // Learners see their assigned class
        const { data: learnerData, error: learnerError } = await supabase
          .from('learners')
          .select(`
            class_id,
            classes (
              id,
              name,
              grade_level,
              school_year,
              teacher_id
            )
          `)
          .eq('user_id', profile.user_id)
          .single();

        if (learnerError) throw learnerError;
        
        if (learnerData?.classes) {
          // Get teacher info separately
          const { data: teacherData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', learnerData.classes.teacher_id)
            .single();
            
          setClasses([{
            ...learnerData.classes,
            teacher: teacherData ? { full_name: teacherData.full_name } : undefined
          }]);
        }
      } else if (profile?.role === 'parent') {
        // Parents see their children's classes
        const { data: childrenData, error: childrenError } = await supabase
          .from('learners')
          .select(`
            classes (
              id,
              name,
              grade_level,
              school_year,
              teacher_id
            )
          `)
          .eq('user_id', profile.user_id);

        if (childrenError) throw childrenError;
        
        const uniqueClasses = childrenData?.reduce((acc: ClassData[], item) => {
          if (item.classes && !acc.find(c => c.id === item.classes.id)) {
            acc.push(item.classes);
          }
          return acc;
        }, []) || [];
        
        setClasses(uniqueClasses);
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setCreateLoading(true);
    
    const classData = {
      name: createForm.name,
      grade_level: parseInt(createForm.grade_level),
      teacher_id: profile.user_id,
      school_year: createForm.school_year
    };

    const { error } = await supabase
      .from('classes')
      .insert(classData);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Class created successfully!",
      });
      setShowCreateForm(false);
      setCreateForm({ name: '', grade_level: '', school_year: '2024-2025' });
      fetchClasses(); // Refresh the classes list
    }
    setCreateLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const getStatusByRole = () => {
    switch (profile?.role) {
      case 'teacher':
        return { title: 'My Classes', description: 'Classes you are teaching', icon: GraduationCap };
      case 'learner':
        return { title: 'My Classes', description: 'Your enrolled classes', icon: BookOpen };
      case 'parent':
        return { title: 'Children\'s Classes', description: 'Classes your children are enrolled in', icon: Users };
      default:
        return { title: 'My Classes', description: 'Your classes', icon: BookOpen };
    }
  };

  const status = getStatusByRole();
  const StatusIcon = status.icon;

  return (
    <div className="animate-fade-in p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <StatusIcon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{status.title}</h1>
          <p className="text-muted-foreground">{status.description}</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Classes Found</h3>
            <p className="text-muted-foreground mb-4">
              {profile?.role === 'teacher' 
                ? "You haven't been assigned to any classes yet."
                : profile?.role === 'parent'
                ? "Your children are not enrolled in any classes yet."
                : "You are not enrolled in any classes yet."
              }
            </p>
            {profile?.role === 'teacher' && (
              <Button 
                className="btn-gradient"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Class
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="hover-lift">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    <CardDescription>Grade {classItem.grade_level}</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    Grade {classItem.grade_level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {classItem.teacher && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {classItem.teacher.full_name}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {classItem.student_count || 'Unknown'} students
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Next: {classItem.next_session || 'No upcoming sessions'}
                  </span>
                </div>
                
                {classItem.subjects && classItem.subjects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Subjects:</p>
                    <div className="flex flex-wrap gap-1">
                      {classItem.subjects.map((subject, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  {profile?.role === 'teacher' && (
                    <Button size="sm" className="flex-1 btn-gradient">
                      Manage Class
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Class Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                placeholder="e.g., Mathematics A"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grade_level">Grade Level</Label>
              <Input
                id="grade_level"
                type="number"
                min="1"
                max="12"
                value={createForm.grade_level}
                onChange={(e) => setCreateForm({...createForm, grade_level: e.target.value})}
                placeholder="e.g., 10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_year">School Year</Label>
              <Input
                id="school_year"
                value={createForm.school_year}
                onChange={(e) => setCreateForm({...createForm, school_year: e.target.value})}
                placeholder="e.g., 2024-2025"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Class"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateForm({ name: '', grade_level: '', school_year: '2024-2025' });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}