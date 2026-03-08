import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, ClipboardList, GraduationCap, Shield, Search, BarChart3 } from 'lucide-react';
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

interface SystemStats {
  totalUsers: number;
  teachers: number;
  learners: number;
  parents: number;
  classes: number;
  assessments: number;
  subjects: number;
}

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Only admin role can access
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all profiles (admin has access via RLS)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(profiles || []);

      // Calculate stats
      const all = profiles || [];
      const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
      const { count: assessmentCount } = await supabase.from('assessments').select('*', { count: 'exact', head: true });
      const { count: subjectCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: all.length,
        teachers: all.filter(u => u.role === 'teacher').length,
        learners: all.filter(u => u.role === 'learner').length,
        parents: all.filter(u => u.role === 'parent').length,
        classes: classCount || 0,
        assessments: assessmentCount || 0,
        subjects: subjectCount || 0,
      });
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

  if (loading) return <div className="flex items-center justify-center h-full"><LoadingSpinner text="Loading admin dashboard..." /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1">System overview and user management</p>
      </div>

      {/* System Stats */}
      {stats && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7 animate-scale-in">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Teachers', value: stats.teachers, icon: BookOpen, color: 'text-primary' },
            { label: 'Learners', value: stats.learners, icon: GraduationCap, color: 'text-success' },
            { label: 'Parents', value: stats.parents, icon: Users, color: 'text-info' },
            { label: 'Classes', value: stats.classes, icon: BookOpen, color: 'text-primary' },
            { label: 'Assessments', value: stats.assessments, icon: ClipboardList, color: 'text-destructive' },
            { label: 'Subjects', value: stats.subjects, icon: BarChart3, color: 'text-info' },
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
      )}

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="glass-card">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />Users
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                      <TableCell>
                        <Badge className={roleColors[user.role] || 'bg-muted text-muted-foreground'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">User Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats && [
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
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">System Health</CardTitle>
              </CardHeader>
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
