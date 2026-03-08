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
import { Users, BookOpen, ClipboardList, GraduationCap, Shield, Search, BarChart3, Plus, Link2, DollarSign, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Navigate } from 'react-router-dom';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
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

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [parentRelations, setParentRelations] = useState<ParentRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [assignClassDialog, setAssignClassDialog] = useState(false);
  const [linkParentDialog, setLinkParentDialog] = useState(false);
  const [feeDialog, setFeeDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Assign to class form
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [assignRole, setAssignRole] = useState<'teacher' | 'learner'>('learner');

  // Link parent form
  const [selectedParent, setSelectedParent] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [relationshipType, setRelationshipType] = useState('parent');

  // Fee form
  const [feeStudent, setFeeStudent] = useState('');
  const [feeTitle, setFeeTitle] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDueDate, setFeeDueDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, classesRes, learnersRes, relationsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, role, created_at').order('created_at', { ascending: false }),
        supabase.from('classes').select('id, name, grade_level, teacher_id, school_year').order('grade_level'),
        supabase.from('learners').select('id, user_id, class_id, student_number, status'),
        supabase.from('parent_child_relationships').select('id, parent_user_id, child_user_id, relationship_type'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      setUsers(profilesRes.data || []);
      setClasses(classesRes.data || []);
      setLearners(learnersRes.data || []);
      setParentRelations(relationsRes.data || []);
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
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Badge variant="outline">{filteredUsers.length} users</Badge>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.full_name || 'No name'}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email || '—'}</TableCell>
                      <TableCell><Badge className={roleColors[user.role] || 'bg-muted text-muted-foreground'}>{user.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== CLASSES TAB ========== */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Class Assignments</h2>
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
