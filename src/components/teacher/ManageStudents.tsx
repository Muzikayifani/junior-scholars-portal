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
import { useToast } from '@/hooks/use-toast';
import { Users, Edit, Trash2, Filter, UserPlus, Link2 } from 'lucide-react';
import LinkParentDialog from './LinkParentDialog';

const ManageStudents = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [learners, setLearners] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [editingLearner, setEditingLearner] = useState<any>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [linkParentStudent, setLinkParentStudent] = useState<{ userId: string; name: string } | null>(null);
  const [editForm, setEditForm] = useState({
    student_number: '',
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    class_id: ''
  });
  const [addForm, setAddForm] = useState({
    student_number: '',
    full_name: '',
    email: '',
    first_name: '',
    last_name: '',
    emergency_contact: '',
    address: '',
    date_of_birth: '',
    class_id: ''
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      loadLearners();
    }
  }, [selectedClassId, profile]);

  const loadData = async () => {
    if (!profile) return;
    
    const [classesResult, subjectsResult] = await Promise.all([
      supabase.from('classes').select('*'),
      supabase.from('subjects').select('*')
    ]);
    
    if (classesResult.data) setClasses(classesResult.data);
    if (subjectsResult.data) setSubjects(subjectsResult.data);
  };

  const loadLearners = async () => {
    if (!profile) return;
    
    setLoading(true);
    let query = supabase
      .from('learners')
      .select(`
        *,
        profile:profiles!fk_learners_user_id(full_name, email, first_name, last_name),
        class:classes(name, grade_level)
      `);

    if (selectedClassId) {
      query = query.eq('class_id', selectedClassId);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setLearners(data || []);
    }
    setLoading(false);
  };

  const handleEditLearner = (learner: any) => {
    setEditingLearner(learner);
    setEditForm({
      student_number: learner.student_number || '',
      first_name: learner.profile?.first_name || '',
      last_name: learner.profile?.last_name || '',
      phone: learner.profile?.phone || '',
      date_of_birth: learner.profile?.date_of_birth || '',
      class_id: learner.class_id || ''
    });
  };

  const handleUpdateLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLearner) return;
    
    setLoading(true);
    
    // Update learner record
    const { error: learnerError } = await supabase
      .from('learners')
      .update({
        student_number: editForm.student_number,
        class_id: editForm.class_id
      })
      .eq('id', editingLearner.id);

    if (learnerError) {
      toast({
        title: "Error",
        description: learnerError.message,
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // Update profile record
    const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        full_name: fullName,
        phone: editForm.phone || null,
        date_of_birth: editForm.date_of_birth || null
      })
      .eq('user_id', editingLearner.user_id);

    if (profileError) {
      toast({
        title: "Warning",
        description: "Learner updated but profile update failed: " + profileError.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Student record updated successfully!",
      });
    }
    
    setEditingLearner(null);
    loadLearners();
    setLoading(false);
  };

  const handleDeleteLearner = async (learnerId: string) => {
    if (!confirm('Are you sure you want to delete this student record?')) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('learners')
      .delete()
      .eq('id', learnerId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Student record deleted successfully!",
      });
      loadLearners();
    }
    setLoading(false);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.class_id) {
      toast({
        title: "Error",
        description: "Please select a class for the student",
        variant: "destructive"
      });
      return;
    }

    // Verify teacher is authenticated
    if (!profile?.user_id) {
      toast({
        title: "Error",
        description: "You must be logged in as a teacher to add students",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const firstName = addForm.first_name.trim();
      const lastName = addForm.last_name.trim();

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      // Call the edge function to create the student with proper auth
      const response = await fetch(
        `https://zhduiylpsfdswfsoqdba.supabase.co/functions/v1/create-student`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email: addForm.email,
            classId: addForm.class_id,
            studentNumber: addForm.student_number || null
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create student');
      }

      toast({
        title: "Success",
        description: `Student added successfully! Temporary password: ${result.data.tempPassword} (Please save this and share with the student)`,
        duration: 15000, // Show for 15 seconds so teacher can copy it
      });
      
      setShowAddStudent(false);
      setAddForm({
        student_number: '',
        full_name: '',
        email: '',
        first_name: '',
        last_name: '',
        emergency_contact: '',
        address: '',
        date_of_birth: '',
        class_id: ''
      });
      loadLearners();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add student. Please try again.",
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Manage Students
          </h2>
          <p className="text-muted-foreground">View and edit student records by class</p>
        </div>
        
        <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add New Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add_first_name">First Name</Label>
                  <Input
                    id="add_first_name"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({...addForm, first_name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="add_last_name">Last Name</Label>
                  <Input
                    id="add_last_name"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({...addForm, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add_email">Email</Label>
                <Input
                  id="add_email"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add_student_number">Student Number</Label>
                <Input
                  id="add_student_number"
                  value={addForm.student_number}
                  onChange={(e) => setAddForm({...addForm, student_number: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add_full_name">Display Name (Optional)</Label>
                <Input
                  id="add_full_name"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({...addForm, full_name: e.target.value})}
                  placeholder="Will use First + Last name if empty"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add_class_id">Class</Label>
                <Select 
                  value={addForm.class_id} 
                  onValueChange={(value) => setAddForm({...addForm, class_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} (Grade {cls.grade_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add_emergency_contact">Emergency Contact</Label>
                <Input
                  id="add_emergency_contact"
                  value={addForm.emergency_contact}
                  onChange={(e) => setAddForm({...addForm, emergency_contact: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add_address">Address</Label>
                <Input
                  id="add_address"
                  value={addForm.address}
                  onChange={(e) => setAddForm({...addForm, address: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add_date_of_birth">Date of Birth</Label>
                <Input
                  id="add_date_of_birth"
                  type="date"
                  value={addForm.date_of_birth}
                  onChange={(e) => setAddForm({...addForm, date_of_birth: e.target.value})}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Student"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddStudent(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Class and Subject Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter by Class & Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class-filter">Select Class</Label>
              <Select value={selectedClassId || 'all'} onValueChange={(val) => setSelectedClassId(val === 'all' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class to view students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} (Grade {cls.grade_level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject-filter">Select Subject (Optional)</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      {(
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedClassId ? `Students in ${classes.find(c => c.id === selectedClassId)?.name}` : 'All Students'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Number</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Emergency Contact</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learners.map((learner) => (
                    <TableRow key={learner.id}>
                      <TableCell className="font-medium">{learner.student_number}</TableCell>
                      <TableCell>
                        {learner.profile?.full_name || 'Name not set'}
                      </TableCell>
                      <TableCell>{learner.profile?.email}</TableCell>
                      <TableCell>{learner.emergency_contact}</TableCell>
                      <TableCell>
                        {learner.date_of_birth ? 
                         new Date(learner.date_of_birth).toLocaleDateString() : 
                         'Not set'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditLearner(learner)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Student Record</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleUpdateLearner} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="student_number">Student Number</Label>
                                  <Input
                                    id="student_number"
                                    value={editForm.student_number}
                                    onChange={(e) => setEditForm({...editForm, student_number: e.target.value})}
                                    required
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                      id="first_name"
                                      value={editForm.first_name}
                                      onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                      id="last_name"
                                      value={editForm.last_name}
                                      onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="phone">Phone</Label>
                                  <Input
                                    id="phone"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                                  <Input
                                    id="date_of_birth"
                                    type="date"
                                    value={editForm.date_of_birth}
                                    onChange={(e) => setEditForm({...editForm, date_of_birth: e.target.value})}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="class_id">Class</Label>
                                  <Select 
                                    value={editForm.class_id} 
                                    onValueChange={(value) => setEditForm({...editForm, class_id: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                          {cls.name} (Grade {cls.grade_level})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button type="submit" disabled={loading}>
                                    {loading ? "Updating..." : "Update"}
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setEditingLearner(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLinkParentStudent({
                              userId: learner.user_id,
                              name: learner.profile?.full_name || 'Student'
                            })}
                            title="Link Parent"
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteLearner(learner.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {learners.length === 0 && !loading && selectedClassId && (
                <div className="text-center py-8 text-muted-foreground">
                  No students found in this class.
                </div>
              )}
              
              {!selectedClassId && (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a class to view students.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link Parent Dialog */}
      {linkParentStudent && (
        <LinkParentDialog
          open={!!linkParentStudent}
          onOpenChange={(open) => !open && setLinkParentStudent(null)}
          studentUserId={linkParentStudent.userId}
          studentName={linkParentStudent.name}
        />
      )}
    </div>
  );
};

export default ManageStudents;