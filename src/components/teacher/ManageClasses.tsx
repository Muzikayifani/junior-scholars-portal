import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Edit, Trash2, Plus } from 'lucide-react';

const ManageClasses = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    grade_level: ''
  });

  useEffect(() => {
    loadClasses();
  }, [profile]);

  const loadClasses = async () => {
    if (!profile) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        teacher:profiles(first_name, last_name),
        learners(id)
      `);

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

  const handleEditClass = (classData: any) => {
    setEditingClass(classData);
    setEditForm({
      name: classData.name || '',
      grade_level: classData.grade_level?.toString() || ''
    });
  };

  const handleCreateClass = () => {
    setShowCreateForm(true);
    setEditForm({
      name: '',
      grade_level: ''
    });
  };

  const handleSubmitClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    
    const classData = {
      name: editForm.name,
      grade_level: parseInt(editForm.grade_level),
      teacher_id: profile.id
    };

    let result;
    if (editingClass) {
      // Update existing class
      result = await supabase
        .from('classes')
        .update(classData)
        .eq('id', editingClass.id);
    } else {
      // Create new class
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
      setEditingClass(null);
      setShowCreateForm(false);
      loadClasses();
    }
    setLoading(false);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This will also affect associated students and assessments.')) return;
    
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
      loadClasses();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingClass(null);
    setShowCreateForm(false);
    setEditForm({ name: '', grade_level: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Manage Classes
          </h2>
          <p className="text-muted-foreground">Create and edit class information</p>
        </div>
        <Button onClick={handleCreateClass} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create New Class
        </Button>
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Students Count</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">{classItem.name}</TableCell>
                    <TableCell>Grade {classItem.grade_level}</TableCell>
                    <TableCell>
                      {classItem.teacher ? 
                        `${classItem.teacher.first_name} ${classItem.teacher.last_name}` : 
                        'No Teacher Assigned'}
                    </TableCell>
                    <TableCell>{classItem.learners?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClass(classItem)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Class</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmitClass} className="space-y-4">
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
                              
                              <div className="flex gap-2">
                                <Button type="submit" disabled={loading}>
                                  {loading ? "Updating..." : "Update Class"}
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

      {/* Create Class Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Class Name</Label>
              <Input
                id="create-name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="e.g., Mathematics A"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-grade">Grade Level</Label>
              <Input
                id="create-grade"
                type="number"
                min="1"
                max="12"
                value={editForm.grade_level}
                onChange={(e) => setEditForm({...editForm, grade_level: e.target.value})}
                placeholder="e.g., 10"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Class"}
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
    </div>
  );
};

export default ManageClasses;