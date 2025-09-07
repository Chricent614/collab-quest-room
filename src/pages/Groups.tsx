import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Users, Plus, Search, BookOpen, Clock, UserCheck } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  is_private: boolean;
  created_at: string;
  member_count?: number;
  creator_name?: string;
}

const Groups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    is_private: false
  });

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchMyGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          profiles!groups_created_by_fkey(first_name, last_name)
        `)
        .eq('is_private', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groupsWithCreator = data?.map(group => ({
        ...group,
        creator_name: `${group.profiles?.first_name} ${group.profiles?.last_name}`
      })) || [];

      setGroups(groupsWithCreator);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          groups(
            id,
            name,
            description,
            created_by,
            is_private,
            created_at,
            profiles!groups_created_by_fkey(first_name, last_name)
          )
        `)
        .eq('user_id', profile.id);

      if (error) throw error;

      const myGroupsData = data?.map(item => ({
        ...item.groups,
        creator_name: `${item.groups?.profiles?.first_name} ${item.groups?.profiles?.last_name}`
      })).filter(Boolean) || [];

      setMyGroups(myGroupsData);
    } catch (error) {
      console.error('Error fetching my groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name: newGroup.name,
          description: newGroup.description,
          is_private: newGroup.is_private,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: profile.id,
          role: 'admin'
        });

      toast({
        title: "Success",
        description: "Group created successfully!"
      });

      setShowCreateDialog(false);
      setNewGroup({ name: '', description: '', is_private: false });
      fetchGroups();
      fetchMyGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive"
      });
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: profile.id,
          role: 'member'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Joined group successfully!"
      });

      fetchMyGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive"
      });
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Study Groups</h1>
          <p className="text-muted-foreground">Join or create study groups to collaborate with peers</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Study Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Calculus Study Group"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Describe what this group is about..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="private"
                  checked={newGroup.is_private}
                  onChange={(e) => setNewGroup({ ...newGroup, is_private: e.target.checked })}
                />
                <Label htmlFor="private">Make this group private</Label>
              </div>
              <Button onClick={createGroup} className="w-full">
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* My Groups */}
      {myGroups.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <UserCheck className="mr-2 h-5 w-5" />
            My Groups
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{group.name}</span>
                    <Badge variant="secondary">Member</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {group.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {group.creator_name}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Groups */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Discover Groups
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const isMyGroup = myGroups.some(myGroup => myGroup.id === group.id);
            
            return (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{group.name}</span>
                    {!group.is_private && <Badge>Public</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {group.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {group.creator_name}
                    </span>
                  </div>
                  {!isMyGroup && (
                    <Button 
                      onClick={() => joinGroup(group.id)}
                      className="w-full"
                      size="sm"
                    >
                      Join Group
                    </Button>
                  )}
                  {isMyGroup && (
                    <Badge variant="secondary" className="w-full justify-center">
                      Already Joined
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {filteredGroups.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms.' : 'Be the first to create a study group!'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Groups;