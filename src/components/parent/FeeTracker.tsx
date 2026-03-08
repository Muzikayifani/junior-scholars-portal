import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DollarSign, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Fee {
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
}

interface StudentInfo {
  user_id: string;
  full_name: string;
}

const FeeTracker = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'teacher';
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const fetchFees = useCallback(async () => {
    if (!profile?.user_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .order('due_date', { ascending: false });
      if (error) throw error;
      setFees(data || []);
    } catch (error) {
      console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id]);

  const fetchStudents = useCallback(async () => {
    if (!profile?.user_id || !isAdmin) return;
    // Admins can see all learners
    const { data: learners } = await supabase
      .from('learners')
      .select('user_id, profiles:profiles!fk_learners_user_id(full_name)');

    if (learners) {
      const unique = new Map<string, StudentInfo>();
      learners.forEach((l: any) => {
        if (!unique.has(l.user_id)) {
          unique.set(l.user_id, { user_id: l.user_id, full_name: l.profiles?.full_name || 'Unknown' });
        }
      });
      setStudents(Array.from(unique.values()));
    }
  }, [profile?.user_id, isAdmin]);

  useEffect(() => {
    fetchFees();
    fetchStudents();
  }, [fetchFees, fetchStudents]);

  const handleCreateFee = async () => {
    if (!title || !amount || !dueDate || !selectedStudent) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('fees').insert({
        learner_user_id: selectedStudent,
        title,
        description: description || null,
        amount: parseFloat(amount),
        due_date: dueDate,
        created_by: profile!.user_id,
      });
      if (error) throw error;
      toast.success('Fee created');
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setAmount('');
      setDueDate('');
      setSelectedStudent('');
      fetchFees();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create fee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (feeId: string) => {
    try {
      const { error } = await supabase
        .from('fees')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', feeId);
      if (error) throw error;
      toast.success('Fee marked as paid');
      fetchFees();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  const statusConfig: Record<string, { icon: any; color: string }> = {
    unpaid: { icon: AlertTriangle, color: 'bg-destructive text-destructive-foreground' },
    paid: { icon: CheckCircle, color: 'bg-success text-success-foreground' },
    overdue: { icon: Clock, color: 'bg-warning text-warning-foreground' },
  };

  const totalOwed = fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + Number(f.amount), 0);
  const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + Number(f.amount), 0);

  if (loading) return <LoadingSpinner text="Loading fees..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fee Tracking</h2>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage student fees and payments' : isTeacher ? 'View fees for your students' : 'View your children\'s fee status'}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Fee</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Fee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fee Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Term 1 Fees" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount (R)</Label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleCreateFee} disabled={submitting} className="w-full">
                  {submitting ? 'Creating...' : 'Create Fee'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">R{totalOwed.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">R{totalPaid.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fees.length}</p>
                <p className="text-sm text-muted-foreground">Total Fees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fees table */}
      {fees.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Fees</h3>
            <p className="text-muted-foreground">No fee records found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  {isTeacher && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map(fee => {
                  const sc = statusConfig[fee.status] || statusConfig.unpaid;
                  return (
                    <TableRow key={fee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fee.title}</p>
                          {fee.description && <p className="text-xs text-muted-foreground">{fee.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">R{Number(fee.amount).toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(fee.due_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={sc.color}>{fee.status}</Badge>
                      </TableCell>
                      {isTeacher && (
                        <TableCell>
                          {fee.status !== 'paid' && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkPaid(fee.id)}>
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeeTracker;
