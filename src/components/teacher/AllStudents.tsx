import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';

interface StudentRecord {
  id: string;
  user_id: string;
  student_number: string | null;
  status: string | null;
  enrollment_date: string;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  class: {
    name: string;
    grade_level: number;
  } | null;
}

const AllStudents = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllStudents();
  }, []);

  const fetchAllStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('learners')
        .select(`
          id, user_id, student_number, status, enrollment_date,
          profile:profiles!fk_learners_user_id(full_name, email, phone),
          class:classes(name, grade_level)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents((data as unknown as StudentRecord[]) || []);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.profile?.full_name?.toLowerCase().includes(q) ||
      s.profile?.email?.toLowerCase().includes(q) ||
      s.student_number?.toLowerCase().includes(q) ||
      s.class?.name?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Students ({students.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, class..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Number</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.student_number || '—'}</TableCell>
                    <TableCell>{student.profile?.full_name || 'Not set'}</TableCell>
                    <TableCell>{student.profile?.email || '—'}</TableCell>
                    <TableCell>{student.profile?.phone || '—'}</TableCell>
                    <TableCell>{student.class?.name || '—'}</TableCell>
                    <TableCell>{student.class?.grade_level ? `Grade ${student.class.grade_level}` : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                        {student.status || 'active'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {search ? 'No students match your search.' : 'No students found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllStudents;
