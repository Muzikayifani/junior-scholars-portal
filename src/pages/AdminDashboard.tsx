import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, BookOpen, ClipboardList, GraduationCap, Shield, Search, BarChart3, Plus, Link2, DollarSign, UserPlus, X, Pencil, Trash2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Navigate } from 'react-router-dom';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

interface ClassInfo {
  id: string;
  name: string;
  grade_level: number;
  teacher_id: string | null;
  school_year: string;
}

interface LearnerRecord {
  id: string;
  user_id: string;
  class_id: string;
  student_number: string | null;
  status: string | null;
  profile?: { full_name: string | null; email: string | null };
  class?: { name: string };
}

interface ParentRelation {
  id: string;
  parent_user_id: string;
  child_user_id: string;
  relationship_type: string;
  parent?: { full_name: string | null; email: string | null };
  child?: { full_name: string | null; email: string | null };
}

interface FeeRecord {
  id: string;
  learner_user_id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
  created_by: string;
}

const AdminDashboard = () => {
  const { profile, session } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [parentRelations, setParentRelations] = useState<ParentRelation[]>([]);
  const [allFees, setAllFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [assignClassDialog, setAssignClassDialog] = useState(false);
  const [linkParentDialog, setLinkParentDialog] = useState(false);
  const [feeDialog, setFeeDialog] = useState(false);
  const [editFeeDialog, setEditFeeDialog] = useState(false);
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [createClassDialog, setCreateClassDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Assign to class form
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [assignRole, setAssignRole] = useState<'teacher' | 'learner'>('learner');

  // Link parent form
  const [selectedParent, setSelectedParent] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [relationshipType, setRelationshipType] = useState('parent');

  // Fee form (create)
  const [feeStudent, setFeeStudent] = useState('');
  const [feeTitle, setFeeTitle] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDueDate, setFeeDueDate] = useState('');

  // Fee form (edit)
  const [editFeeId, setEditFeeId] = useState('');
  const [editFeeStudent, setEditFeeStudent] = useState('');
  const [editFeeTitle, setEditFeeTitle] = useState('');
  const [editFeeDescription, setEditFeeDescription] = useState('');
  const [editFeeAmount, setEditFeeAmount] = useState('');
  const [editFeeDueDate, setEditFeeDueDate] = useState('');
  const [editFeeStatus, setEditFeeStatus] = useState('');

  // Create user form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState<string>('learner');

  // Create class form
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('');
  const [newClassYear, setNewClassYear] = useState('2025-2026');
  const [newClassCapacity, setNewClassCapacity] = useState('30');
  const [newClassTeacher, setNewClassTeacher] = useState('');

  // Edit user form
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, classesRes, learnersRes, relationsRes, feesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, first_name, last_name, email, phone, role, created_at').order('created_at', { ascending: false }),
        supabase.from('classes').select('id, name, grade_level, teacher_id, school_year').order('grade_level'),
        supabase.from('learners').select('id, user_id, class_id, student_number, status'),
        supabase.from('parent_child_relationships').select('id, parent_user_id, child_user_id, relationship_type'),
        supabase.from('fees').select('*').order('due_date', { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      setUsers(profilesRes.data || []);
      setClasses(classesRes.data || []);
      setLearners(learnersRes.data || []);
      setParentRelations(relationsRes.data || []);
      setAllFees(feesRes.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const teachers = users.filter(u => u.role === 'teacher');
  const learnerUsers = users.filter(u => u.role === 'learner');
  const parents = users.filter(u => u.role === 'parent');
  const getUserName = (userId: string) => users.find(u => u.user_id === userId)?.full_name || 'Unknown';
  const getUserEmail = (userId: string) => users.find(u => u.user_id === userId)?.email || '';
  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'Unknown';

  const filteredUsers = users.filter(u =>
    (u.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive text-destructive-foreground',
    teacher: 'bg-primary text-primary-foreground',
    learner: 'bg-success text-success-foreground',
    parent: 'bg-info text-info-foreground',
  };

  // Assign teacher or learner to class
  const handleAssignToClass = async () => {
    if (!selectedUser || !selectedClass) {
      toast.error('Select a user and class');
      return;
    }
    setSubmitting(true);
    try {
      if (assignRole === 'teacher') {
        const { error } = await supabase
          .from('classes')
          .update({ teacher_id: selectedUser })
          .eq('id', selectedClass);
        if (error) throw error;
        toast.success('Teacher assigned to class');
      } else {
        // Check if already enrolled
        const existing = learners.find(l => l.user_id === selectedUser && l.class_id === selectedClass);
        if (existing) {
          toast.error('Learner already enrolled in this class');
          setSubmitting(false);
          return;
        }
        const { error } = await supabase.from('learners').insert({
          user_id: selectedUser,
          class_id: selectedClass,
        });
        if (error) throw error;
        toast.success('Learner enrolled in class');
      }
      setAssignClassDialog(false);
      setSelectedUser('');
      setSelectedClass('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove learner from class
  const handleRemoveLearner = async (learnerId: string) => {
    try {
      const { error } = await supabase.from('learners').delete().eq('id', learnerId);
      if (error) throw error;
      toast.success('Learner removed from class');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove');
    }
  };

  // Link parent to learner
  const handleLinkParent = async () => {
    if (!selectedParent || !selectedChild) {
      toast.error('Select a parent and child');
      return;
    }
    setSubmitting(true);
    try {
      const existing = parentRelations.find(r => r.parent_user_id === selectedParent && r.child_user_id === selectedChild);
      if (existing) {
        toast.error('This relationship already exists');
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from('parent_child_relationships').insert({
        parent_user_id: selectedParent,
        child_user_id: selectedChild,
        relationship_type: relationshipType,
      });
      if (error) throw error;
      toast.success('Parent linked to learner');
      setLinkParentDialog(false);
      setSelectedParent('');
      setSelectedChild('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove parent-child relationship
  const handleUnlinkParent = async (relationId: string) => {
    try {
      const { error } = await supabase.from('parent_child_relationships').delete().eq('id', relationId);
      if (error) throw error;
      toast.success('Relationship removed');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove');
    }
  };

  // Create fee
  const handleCreateFee = async () => {
    if (!feeStudent || !feeTitle || !feeAmount || !feeDueDate) {
      toast.error('Fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('fees').insert({
        learner_user_id: feeStudent,
        title: feeTitle,
        description: feeDescription || null,
        amount: parseFloat(feeAmount),
        due_date: feeDueDate,
        created_by: profile!.user_id,
      });
      if (error) throw error;
      toast.success('Fee created');
      setFeeDialog(false);
      setFeeStudent('');
      setFeeTitle('');
      setFeeDescription('');
      setFeeAmount('');
      setFeeDueDate('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create fee');
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit fee dialog
  const openEditFee = (fee: FeeRecord) => {
    setEditFeeId(fee.id);
    setEditFeeStudent(fee.learner_user_id);
    setEditFeeTitle(fee.title);
    setEditFeeDescription(fee.description || '');
    setEditFeeAmount(String(fee.amount));
    setEditFeeDueDate(fee.due_date);
    setEditFeeStatus(fee.status);
    setEditFeeDialog(true);
  };

  // Update fee
  const handleUpdateFee = async () => {
    if (!editFeeTitle || !editFeeAmount || !editFeeDueDate || !editFeeStudent) {
      toast.error('Fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const updateData: Record<string, any> = {
        learner_user_id: editFeeStudent,
        title: editFeeTitle,
        description: editFeeDescription || null,
        amount: parseFloat(editFeeAmount),
        due_date: editFeeDueDate,
        status: editFeeStatus,
      };
      if (editFeeStatus === 'paid') {
        const existingFee = allFees.find(f => f.id === editFeeId);
        if (!existingFee?.paid_at) {
          updateData.paid_at = new Date().toISOString();
        }
      } else {
        updateData.paid_at = null;
      }
      const { error } = await supabase.from('fees').update(updateData).eq('id', editFeeId);
      if (error) throw error;
      toast.success('Fee updated');
      setEditFeeDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update fee');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete fee
  const handleDeleteFee = async (feeId: string) => {
    try {
      const { error } = await supabase.from('fees').delete().eq('id', feeId);
      if (error) throw error;
      toast.success('Fee deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete fee');
    }
  };

  // Mark fee as paid
  const handleMarkFeePaid = async (feeId: string) => {
    try {
      const { error } = await supabase.from('fees').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', feeId);
      if (error) throw error;
      toast.success('Fee marked as paid');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };


  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFirstName || !newUserLastName || !newUserRole) {
      toast.error('Fill in all required fields');
      return;
    }
    if (newUserPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          first_name: newUserFirstName,
          last_name: newUserLastName,
          role: newUserRole,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${newUserRole} account created for ${newUserEmail}`);
      setCreateUserDialog(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserRole('learner');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // Change user role via edge function
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-user-role', {
        body: { user_id: userId, new_role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Role updated to ${newRole}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  // Open edit user dialog
  const openEditUser = (user: UserProfile) => {
    setEditUserId(user.user_id);
    setEditFirstName(user.first_name || '');
    setEditLastName(user.last_name || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditPassword('');
    setEditUserDialog(true);
  };

  // Update user details via edge function
  const handleUpdateUser = async () => {
    if (!editUserId) return;
    setSubmitting(true);
    try {
      const body: Record<string, any> = {
        user_id: editUserId,
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        phone: editPhone,
      };
      if (editPassword) body.password = editPassword;

      const { data, error } = await supabase.functions.invoke('update-user', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('User updated successfully');
      setEditUserDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // Create new class
  const handleCreateClass = async () => {
    if (!newClassName || !newClassGrade) {
      toast.error('Class name and grade level are required');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('classes').insert({
        name: newClassName,
        grade_level: parseInt(newClassGrade),
        school_year: newClassYear,
        capacity: parseInt(newClassCapacity) || 30,
        teacher_id: newClassTeacher || null,
      });
      if (error) throw error;
      toast.success('Class created successfully');
      setCreateClassDialog(false);
      setNewClassName('');
      setNewClassGrade('');
      setNewClassYear('2025-2026');
      setNewClassCapacity('30');
      setNewClassTeacher('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  // Unassign teacher from class
  const handleUnassignTeacher = async (classId: string) => {
    try {
      const { error } = await supabase.from('classes').update({ teacher_id: null }).eq('id', classId);
      if (error) throw error;
      toast.success('Teacher unassigned');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unassign');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><LoadingSpinner text="Loading admin dashboard..." /></div>;

  const stats = {
    totalUsers: users.length,
    teachers: teachers.length,
    learners: learnerUsers.length,
    parents: parents.length,
    classes: classes.length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1">System overview and user management</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5 animate-scale-in">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
          { label: 'Teachers', value: stats.teachers, icon: BookOpen, color: 'text-primary' },
          { label: 'Learners', value: stats.learners, icon: GraduationCap, color: 'text-success' },
          { label: 'Parents', value: stats.parents, icon: Users, color: 'text-info' },
          { label: 'Classes', value: stats.classes, icon: BookOpen, color: 'text-destructive' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="glass-card hover-lift">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="glass-card">
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Classes</TabsTrigger>
          <TabsTrigger value="parents" className="flex items-center gap-2"><Link2 className="h-4 w-4" />Parent Links</TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Fees</TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
        </TabsList>

        {/* ========== USERS TAB ========== */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Badge variant="outline">{filteredUsers.length} users</Badge>
            <Dialog open={createUserDialog} onOpenChange={setCreateUserDialog}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Create User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New User Account</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input value={newUserFirstName} onChange={e => setNewUserFirstName(e.target.value)} placeholder="John" />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input value={newUserLastName} onChange={e => setNewUserLastName(e.target.value)} placeholder="Doe" />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Min 8 characters" />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newUserRole} onValueChange={setNewUserRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="learner">Learner</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateUser} disabled={submitting} className="w-full">
                    {submitting ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Change Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.full_name || 'No name'}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email || '—'}</TableCell>
                      <TableCell><Badge className={roleColors[user.role] || 'bg-muted text-muted-foreground'}>{user.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {user.user_id !== profile?.user_id ? (
                          <Select value={user.role} onValueChange={(val) => handleChangeRole(user.user_id, val)}>
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="learner">Learner</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">Current user</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditUser(user)}>
                          <Pencil className="h-4 w-4 mr-1" />Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={editUserDialog} onOpenChange={setEditUserDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit User Details</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={editLastName} onChange={e => setEditLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label>New Password</Label>
                  <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Leave blank to keep current" />
                  <p className="text-xs text-muted-foreground mt-1">Min 8 characters. Leave empty to keep the current password.</p>
                </div>
                <Button onClick={handleUpdateUser} disabled={submitting} className="w-full">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ========== CLASSES TAB ========== */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Class Management</h2>
            <div className="flex gap-2">
              <Dialog open={createClassDialog} onOpenChange={setCreateClassDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Create Class</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create New Class</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Class Name</Label>
                      <Input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g., Grade 8A" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Grade Level</Label>
                        <Input type="number" min="1" max="12" value={newClassGrade} onChange={e => setNewClassGrade(e.target.value)} placeholder="e.g., 8" />
                      </div>
                      <div>
                        <Label>Capacity</Label>
                        <Input type="number" value={newClassCapacity} onChange={e => setNewClassCapacity(e.target.value)} placeholder="30" />
                      </div>
                    </div>
                    <div>
                      <Label>School Year</Label>
                      <Input value={newClassYear} onChange={e => setNewClassYear(e.target.value)} placeholder="2025-2026" />
                    </div>
                    <div>
                      <Label>Assign Teacher (optional)</Label>
                      <Select value={newClassTeacher} onValueChange={setNewClassTeacher}>
                        <SelectTrigger><SelectValue placeholder="No teacher assigned" /></SelectTrigger>
                        <SelectContent>
                          {teachers.map(t => (
                            <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || t.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateClass} disabled={submitting} className="w-full">
                      {submitting ? 'Creating...' : 'Create Class'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={assignClassDialog} onOpenChange={setAssignClassDialog}>
                <DialogTrigger asChild>
                  <Button><UserPlus className="h-4 w-4 mr-2" />Assign to Class</Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign User to Class</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Role</Label>
                    <Select value={assignRole} onValueChange={(v: 'teacher' | 'learner') => { setAssignRole(v); setSelectedUser(''); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="learner">Learner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{assignRole === 'teacher' ? 'Select Teacher' : 'Select Learner'}</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger><SelectValue placeholder="Choose user" /></SelectTrigger>
                      <SelectContent>
                        {(assignRole === 'teacher' ? teachers : learnerUsers).map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} (Grade {c.grade_level})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssignToClass} disabled={submitting} className="w-full">
                    {submitting ? 'Assigning...' : 'Assign'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Classes with teachers */}
          <div className="grid gap-4">
            {classes.map(cls => {
              const classLearners = learners.filter(l => l.class_id === cls.id);
              return (
                <Card key={cls.id} className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{cls.name} — Grade {cls.grade_level}</CardTitle>
                      <Badge variant="outline">{cls.school_year}</Badge>
                    </div>
                    <CardDescription>
                      Teacher: {cls.teacher_id ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium text-foreground">{getUserName(cls.teacher_id)}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleUnassignTeacher(cls.id)}>
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </span>
                      ) : <span className="text-destructive">Unassigned</span>}
                      {' · '}{classLearners.length} learners
                    </CardDescription>
                  </CardHeader>
                  {classLearners.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {classLearners.map(l => (
                          <Badge key={l.id} variant="secondary" className="flex items-center gap-1 pr-1">
                            {getUserName(l.user_id)}
                            <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-destructive/20" onClick={() => handleRemoveLearner(l.id)}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ========== PARENT LINKS TAB ========== */}
        <TabsContent value="parents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Parent-Learner Links</h2>
            <Dialog open={linkParentDialog} onOpenChange={setLinkParentDialog}>
              <DialogTrigger asChild>
                <Button><Link2 className="h-4 w-4 mr-2" />Link Parent</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Link Parent to Learner</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Parent</Label>
                    <Select value={selectedParent} onValueChange={setSelectedParent}>
                      <SelectTrigger><SelectValue placeholder="Choose parent" /></SelectTrigger>
                      <SelectContent>
                        {parents.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select Learner</Label>
                    <Select value={selectedChild} onValueChange={setSelectedChild}>
                      <SelectTrigger><SelectValue placeholder="Choose learner" /></SelectTrigger>
                      <SelectContent>
                        {learnerUsers.map(l => (
                          <SelectItem key={l.user_id} value={l.user_id}>{l.full_name || l.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Select value={relationshipType} onValueChange={setRelationshipType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleLinkParent} disabled={submitting} className="w-full">
                    {submitting ? 'Linking...' : 'Link Parent'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent</TableHead>
                    <TableHead>Learner</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parentRelations.map(rel => (
                    <TableRow key={rel.id}>
                      <TableCell className="font-medium">{getUserName(rel.parent_user_id)}</TableCell>
                      <TableCell>{getUserName(rel.child_user_id)}</TableCell>
                      <TableCell><Badge variant="outline">{rel.relationship_type}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleUnlinkParent(rel.id)}>
                          <X className="h-4 w-4 mr-1" />Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {parentRelations.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No parent-learner links</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== FEES TAB ========== */}
        <TabsContent value="fees" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fee Management</h2>
            <Dialog open={feeDialog} onOpenChange={setFeeDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Create Fee</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Fee</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Learner</Label>
                    <Select value={feeStudent} onValueChange={setFeeStudent}>
                      <SelectTrigger><SelectValue placeholder="Choose learner" /></SelectTrigger>
                      <SelectContent>
                        {learnerUsers.map(l => (
                          <SelectItem key={l.user_id} value={l.user_id}>{l.full_name || l.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fee Title</Label>
                    <Input value={feeTitle} onChange={e => setFeeTitle(e.target.value)} placeholder="e.g., Term 1 Fees" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={feeDescription} onChange={e => setFeeDescription(e.target.value)} placeholder="Details..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount (R)</Label>
                      <Input type="number" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input type="date" value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleCreateFee} disabled={submitting} className="w-full">
                    {submitting ? 'Creating...' : 'Create Fee'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Use the button above to create fees. Parents will see fees on their Fees page.</p>
              <p className="text-sm text-muted-foreground mt-1">Visit the <a href="/fees" className="text-primary underline">Fees page</a> to manage existing fees.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== OVERVIEW TAB ========== */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-lg">User Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Teachers', count: stats.teachers, total: stats.totalUsers, color: 'bg-primary' },
                  { label: 'Learners', count: stats.learners, total: stats.totalUsers, color: 'bg-success' },
                  { label: 'Parents', count: stats.parents, total: stats.totalUsers, color: 'bg-info' },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">{item.count} ({item.total > 0 ? Math.round((item.count / item.total) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-lg">System Health</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Database', status: 'Healthy', color: 'bg-success' },
                  { label: 'Authentication', status: 'Active', color: 'bg-success' },
                  { label: 'Storage', status: 'Available', color: 'bg-success' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="text-sm text-muted-foreground">{item.status}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
