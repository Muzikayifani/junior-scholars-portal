import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Edit, Trash2, Plus, Users, GraduationCap, UserPlus } from 'lucide-react';

interface ClassData {
  id: string;
  name: string;
  grade_level: number;
  school_year: string;
  teacher?: { full_name: string; };
  learners?: any[];
  class_subjects?: { subjects: { id: string; name: string; } }[];
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  user_id: string;
}

const ManageClasses = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [editForm, setEditForm] = useState({
    name: '',
    grade_level: '',
    school_year: '2024-2025'
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    
    await Promise.all([
      loadClasses(),
      loadSubjects(),
      loadAvailableStudents()
    ]);
  };

  const loadClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        teacher:profiles!classes_teacher_id_fkey(full_name),
        learners(id),
        class_subjects(
          subjects(id, name)
        )
      `)
      .eq('teacher_id', profile.user_id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setClasses(data || []);
    }
    setLoading(false);
  };

  const loadSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');

    if (!error && data) {
      setSubjects(data);
    }
  };

  const loadAvailableStudents = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email')
      .eq('role', 'learner');

    if (!error && data) {
      // Filter out students already enrolled in classes
      const { data: enrolledStudents } = await supabase
        .from('learners')
        .select('user_id');
      
      const enrolledUserIds = enrolledStudents?.map(s => s.user_id) || [];
      const available = data.filter(student => !enrolledUserIds.includes(student.user_id));
      setAvailableStudents(available);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    
    const classData = {
      name: editForm.name,
      grade_level: parseInt(editForm.grade_level),
      teacher_id: profile.user_id,
      school_year: editForm.school_year
    };

    let result;
    if (editingClass) {
      result = await supabase
        .from('classes')
        .update(classData)
        .eq('id', editingClass.id);
    } else {
      result = await supabase
        .from('classes')
        .insert(classData);
    }

    if (result.error) {
      toast({
        title: "Error",
        description: result.error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: editingClass ? "Class updated successfully!" : "Class created successfully!",
      });
      resetForm();
      loadData();
    }
    setLoading(false);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Class deleted successfully!",
      });
      loadData();
    }
    setLoading(false);
  };

  const handleAssignSubjects = async () => {
    if (!selectedClass || selectedSubjects.length === 0) return;

    setLoading(true);
    
    // Remove existing subjects
    await supabase
      .from('class_subjects')
      .delete()
      .eq('class_id', selectedClass.id);

    // Add new subjects
    const subjectAssignments = selectedSubjects.map(subjectId => ({
      class_id: selectedClass.id,
      subject_id: subjectId
    }));

    const { error } = await supabase
      .from('class_subjects')
      .insert(subjectAssignments);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Subjects assigned successfully!",
      });
      setShowSubjectDialog(false);
      setSelectedSubjects([]);
      loadData();
    }
    setLoading(false);
  };

  const handleEnrollStudent = async () => {
    if (!selectedClass || !selectedStudent) return;

    setLoading(true);
    
    const { error } = await supabase
      .from('learners')
      .insert({
        user_id: selectedStudent,
        class_id: selectedClass.id
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Student enrolled successfully!",
      });
      setShowStudentDialog(false);
      setSelectedStudent('');
      loadData();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingClass(null);
    setShowCreateForm(false);
    setEditForm({ name: '', grade_level: '', school_year: '2024-2025' });
  };

  const openSubjectDialog = (classData: ClassData) => {
    setSelectedClass(classData);
    const currentSubjects = classData.class_subjects?.map(cs => cs.subjects.id) || [];
    setSelectedSubjects(currentSubjects);
    setShowSubjectDialog(true);
  };

  const openStudentDialog = (classData: ClassData) => {
    setSelectedClass(classData);
    setShowStudentDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Manage Classes
          </h2>
          <p className="text-muted-foreground">Create classes, assign subjects, and enroll students</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create New Class
        </Button>
      </div>

      <Tabs defaultValue="classes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="subjects">Subject Management</TabsTrigger>
          <TabsTrigger value="enrollment">Student Enrollment</TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>School Year</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead className="w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((classItem) => (
                      <TableRow key={classItem.id}>
                        <TableCell className="font-medium">{classItem.name}</TableCell>
                        <TableCell>Grade {classItem.grade_level}</TableCell>
                        <TableCell>{classItem.school_year}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {classItem.learners?.length || 0} students
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {classItem.class_subjects?.length || 0} subjects
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingClass(classItem);
                                setEditForm({
                                  name: classItem.name,
                                  grade_level: classItem.grade_level.toString(),
                                  school_year: classItem.school_year
                                });
                                setShowCreateForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSubjectDialog(classItem)}
                            >
                              <GraduationCap className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openStudentDialog(classItem)}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClass(classItem.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {classes.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No classes found. Create your first class to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subject Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((classItem) => (
                  <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Grade {classItem.grade_level}</p>
                        <div className="flex flex-wrap gap-1">
                          {classItem.class_subjects?.map((cs) => (
                            <Badge key={cs.subjects.id} variant="secondary" className="text-xs">
                              {cs.subjects.name}
                            </Badge>
                          ))}
                          {(!classItem.class_subjects || classItem.class_subjects.length === 0) && (
                            <span className="text-xs text-muted-foreground">No subjects assigned</span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSubjectDialog(classItem)}
                          className="w-full mt-2"
                        >
                          Manage Subjects
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollment">
          <Card>
            <CardHeader>
              <CardTitle>Student Enrollment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((classItem) => (
                  <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Grade {classItem.grade_level}</p>
                        <Badge variant="secondary">
                          {classItem.learners?.length || 0} students enrolled
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStudentDialog(classItem)}
                          className="w-full mt-2"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Enroll Student
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Class Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
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
                value={editForm.grade_level}
                onChange={(e) => setEditForm({...editForm, grade_level: e.target.value})}
                placeholder="e.g., 10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_year">School Year</Label>
              <Input
                id="school_year"
                value={editForm.school_year}
                onChange={(e) => setEditForm({...editForm, school_year: e.target.value})}
                placeholder="e.g., 2024-2025"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingClass ? "Update Class" : "Create Class"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Subjects Dialog */}
      <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Subjects to {selectedClass?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Select Subjects</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={subject.id}
                    checked={selectedSubjects.includes(subject.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubjects([...selectedSubjects, subject.id]);
                      } else {
                        setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id));
                      }
                    }}
                    className="rounded"
                  />
                  <Label htmlFor={subject.id} className="text-sm">
                    {subject.name} ({subject.code})
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAssignSubjects} disabled={loading}>
                {loading ? "Assigning..." : "Assign Subjects"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSubjectDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Student Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Student in {selectedClass?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((student) => (
                    <SelectItem key={student.user_id} value={student.user_id}>
                      {student.full_name} ({student.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEnrollStudent} disabled={loading || !selectedStudent}>
                {loading ? "Enrolling..." : "Enroll Student"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowStudentDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageClasses;