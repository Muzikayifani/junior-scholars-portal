import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, X, Search } from 'lucide-react';
import { z } from 'zod';

interface LinkParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentUserId: string;
  studentName: string;
}

interface Parent {
  user_id: string;
  full_name: string;
  email: string;
}

interface LinkedParent extends Parent {
  relationship_id: string;
  relationship_type: string;
}

const emailSchema = z.string().email({ message: "Invalid email address" });
const nameSchema = z.string().min(2, { message: "Name must be at least 2 characters" }).max(100, { message: "Name must be less than 100 characters" });

export default function LinkParentDialog({ open, onOpenChange, studentUserId, studentName }: LinkParentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [relationshipType, setRelationshipType] = useState('parent');
  
  const [newParentForm, setNewParentForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    relationshipType: 'parent'
  });

  useEffect(() => {
    if (open) {
      loadParents();
      loadLinkedParents();
    }
  }, [open, studentUserId]);

  const loadParents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('role', 'parent')
        .order('full_name');

      if (error) throw error;
      setParents(data || []);
    } catch (error: any) {
      console.error('Error loading parents:', error);
    }
  };

  const loadLinkedParents = async () => {
    try {
      const { data, error } = await supabase
        .from('parent_child_relationships')
        .select(`
          id,
          relationship_type,
          parent:profiles!parent_child_relationships_parent_user_id_fkey(
            user_id,
            full_name,
            email
          )
        `)
        .eq('child_user_id', studentUserId);

      if (error) throw error;

      const formatted = data?.map(item => ({
        relationship_id: item.id,
        relationship_type: item.relationship_type,
        user_id: (item.parent as any)?.user_id,
        full_name: (item.parent as any)?.full_name,
        email: (item.parent as any)?.email
      })) || [];

      setLinkedParents(formatted);
    } catch (error: any) {
      console.error('Error loading linked parents:', error);
    }
  };

  const handleLinkExistingParent = async () => {
    if (!selectedParentId) {
      toast({
        title: "Error",
        description: "Please select a parent to link",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('parent_child_relationships')
        .insert({
          parent_user_id: selectedParentId,
          child_user_id: studentUserId,
          relationship_type: relationshipType
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Parent linked successfully!"
      });

      setSelectedParentId('');
      setRelationshipType('parent');
      loadLinkedParents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link parent",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    try {
      emailSchema.parse(newParentForm.email.trim());
      nameSchema.parse(newParentForm.firstName.trim());
      nameSchema.parse(newParentForm.lastName.trim());
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid input",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      // Create parent account via edge function
      const response = await fetch(
        `https://zhduiylpsfdswfsoqdba.supabase.co/functions/v1/create-parent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newParentForm.email.trim(),
            firstName: newParentForm.firstName.trim(),
            lastName: newParentForm.lastName.trim(),
            childUserId: studentUserId,
            relationshipType: newParentForm.relationshipType
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create parent account');
      }

      toast({
        title: "Success",
        description: `Parent account created! Temporary password: ${result.data.tempPassword} (Please save this and share with the parent)`,
        duration: 15000
      });

      setNewParentForm({
        email: '',
        firstName: '',
        lastName: '',
        relationshipType: 'parent'
      });
      
      loadParents();
      loadLinkedParents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create parent account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkParent = async (relationshipId: string, parentName: string) => {
    if (!confirm(`Are you sure you want to unlink ${parentName} from ${studentName}?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('parent_child_relationships')
        .delete()
        .eq('id', relationshipId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Parent unlinked successfully"
      });

      loadLinkedParents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unlink parent",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredParents = parents.filter(parent => {
    const query = searchQuery.toLowerCase();
    return (
      parent.full_name?.toLowerCase().includes(query) ||
      parent.email?.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Parents for {studentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Currently Linked Parents */}
          {linkedParents.length > 0 && (
            <div className="space-y-2">
              <Label>Currently Linked Parents</Label>
              <div className="space-y-2">
                {linkedParents.map((parent) => (
                  <div key={parent.relationship_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{parent.full_name}</p>
                        <p className="text-sm text-muted-foreground">{parent.email}</p>
                      </div>
                      <Badge variant="outline">{parent.relationship_type}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkParent(parent.relationship_id, parent.full_name)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Link Existing Parent</TabsTrigger>
              <TabsTrigger value="new">Create New Parent</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <div className="space-y-2">
                <Label>Search Parents</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Parent</Label>
                <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a parent account" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredParents.map((parent) => (
                      <SelectItem key={parent.user_id} value={parent.user_id}>
                        {parent.full_name} - {parent.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Relationship Type</Label>
                <Select value={relationshipType} onValueChange={setRelationshipType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleLinkExistingParent} 
                disabled={loading || !selectedParentId}
                className="w-full"
              >
                {loading ? "Linking..." : "Link Parent"}
              </Button>
            </TabsContent>

            <TabsContent value="new" className="space-y-4">
              <form onSubmit={handleCreateAndLinkParent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={newParentForm.firstName}
                      onChange={(e) => setNewParentForm({...newParentForm, firstName: e.target.value})}
                      maxLength={100}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={newParentForm.lastName}
                      onChange={(e) => setNewParentForm({...newParentForm, lastName: e.target.value})}
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newParentForm.email}
                    onChange={(e) => setNewParentForm({...newParentForm, email: e.target.value})}
                    maxLength={255}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newRelationType">Relationship Type</Label>
                  <Select 
                    value={newParentForm.relationshipType} 
                    onValueChange={(value) => setNewParentForm({...newParentForm, relationshipType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {loading ? "Creating..." : "Create & Link Parent"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
