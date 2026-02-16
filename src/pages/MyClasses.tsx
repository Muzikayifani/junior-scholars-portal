import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, Calendar, Clock, GraduationCap, Plus, UserPlus, UserMinus, Eye, Search } from 'lucide-react';
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

  // Enrollment state
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
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

  const openManageDialog = async (classItem: ClassData) => {
    setSelectedClass(classItem);
    setStudentSearch('');
    setSelectedStudent('');
    setShowManageDialog(true);

    // Load enrolled students
    const { data: enrolled } = await supabase
      .from('learners')
      .select('id, user_id, enrollment_date, status, student_number, profiles:profiles!fk_learners_user_id(full_name, email)')
      .eq('class_id', classItem.id);
    setEnrolledStudents(enrolled || []);

    // Load all learner profiles
    const { data: allStudents } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email')
      .eq('role', 'learner');
    
    const enrolledUserIds = (enrolled || []).map((e: any) => e.user_id);
    setAvailableStudents((allStudents || []).filter((s: any) => !enrolledUserIds.includes(s.user_id)));
  };

  const handleEnrollStudent = async () => {
    if (!selectedClass || !selectedStudent) return;
    setEnrollLoading(true);
    const { error } = await supabase
      .from('learners')
      .insert({ user_id: selectedStudent, class_id: selectedClass.id });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Student enrolled successfully!" });
      // Refresh dialog data
      await openManageDialog(selectedClass);
      fetchClasses();
    }
    setEnrollLoading(false);
  };

  const handleRemoveStudent = async (learnerId: string, name: string) => {
    if (!confirm(`Remove ${name} from this class?`)) return;
    setEnrollLoading(true);
    const { error } = await supabase.from('learners').delete().eq('id', learnerId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${name} removed.` });
      if (selectedClass) await openManageDialog(selectedClass);
      fetchClasses();
    }
    setEnrollLoading(false);
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
                    <Button size="sm" className="flex-1 btn-gradient" onClick={() => openManageDialog(classItem)}>
                      <UserPlus className="h-4 w-4 mr-1" />
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

      {/* Manage Class / Enrollment Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Students in {selectedClass?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {enrolledStudents.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Enrolled Students ({enrolledStudents.length})
                </Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {enrolledStudents.map((learner: any) => (
                    <div key={learner.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="text-sm flex-1">
                        <p className="font-medium">{learner.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-muted-foreground text-xs">{learner.profiles?.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(learner.id, learner.profiles?.full_name || 'this student')}
                        disabled={enrollLoading}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enrolledStudents.length > 0 && <Separator />}

            <div className="space-y-2">
              <Label>Add Student</Label>
              {availableStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">All students are already enrolled.</p>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students by name or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-md bg-background">
                    {availableStudents
                      .filter(s => {
                        const q = studentSearch.toLowerCase();
                        return !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
                      })
                      .map((student: any) => (
                        <button
                          key={student.user_id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer ${
                            selectedStudent === student.user_id ? 'bg-accent font-medium' : ''
                          }`}
                          onClick={() => setSelectedStudent(student.user_id)}
                        >
                          <p className="font-medium">{student.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </button>
                      ))}
                    {availableStudents.filter(s => {
                      const q = studentSearch.toLowerCase();
                      return !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
                    }).length === 0 && (
                      <p className="text-sm text-muted-foreground p-3">No students match your search.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEnrollStudent} disabled={enrollLoading || !selectedStudent}>
                {enrollLoading ? "Adding..." : "Add Student"}
              </Button>
              <Button variant="outline" onClick={() => setShowManageDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}