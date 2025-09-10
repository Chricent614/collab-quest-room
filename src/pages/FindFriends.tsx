import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Users, MessageCircle, Mail, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  avatar_url: string;
  school: string;
  role: string;
  user_id: string;
}

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const FindFriends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyProfile();
      fetchProfiles();
      fetchFriends();
    }
  }, [user]);

  const fetchMyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setMyProfile(data);
    } catch (error) {
      console.error('Error fetching my profile:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load profiles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      if (!myProfile) return;

      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${myProfile.id},friend_id.eq.${myProfile.id}`);

      if (error) throw error;
      setFriends((data || []) as Friend[]);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const sendFriendRequest = async (profileId: string) => {
    if (!myProfile) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: myProfile.id,
          friend_id: profileId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Friend request sent!"
      });

      fetchFriends();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Friend request accepted!"
      });

      fetchFriends();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    }
  };

  const getFriendshipStatus = (profileId: string) => {
    if (!myProfile) return null;

    return friends.find(
      (friendship) =>
        (friendship.user_id === myProfile.id && friendship.friend_id === profileId) ||
        (friendship.friend_id === myProfile.id && friendship.user_id === profileId)
    );
  };

  const filteredProfiles = profiles.filter((profile) =>
    `${profile.first_name} ${profile.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    profile.school?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = friends.filter(
    (friendship) =>
      friendship.friend_id === myProfile?.id && friendship.status === 'pending'
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Find Friends</h1>
        <p className="text-muted-foreground">Connect with other students and expand your network</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, school, or interests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Friend Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Friend Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map((request) => {
                const requester = profiles.find((p) => p.id === request.user_id);
                if (!requester) return null;
                
                return (
                  <Card key={request.id} className="border-yellow-200 dark:border-yellow-800">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar>
                          <AvatarImage src={requester.avatar_url} />
                          <AvatarFallback>
                            {requester.first_name[0]}{requester.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {requester.first_name} {requester.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {requester.school}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => acceptFriendRequest(request.id)}
                          className="flex-1"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* People Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProfiles.map((profile) => {
          const friendship = getFriendshipStatus(profile.id);
          const isPending = friendship?.status === 'pending';
          const isAccepted = friendship?.status === 'accepted';
          const requestSentByMe = friendship?.user_id === myProfile?.id;

          return (
            <Card key={profile.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Avatar className="mx-auto h-16 w-16">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {profile.first_name[0]}{profile.last_name[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-semibold text-lg">
                      {profile.first_name} {profile.last_name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {profile.role}
                      </Badge>
                    </div>
                  </div>

                  {profile.school && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      <span>{profile.school}</span>
                    </div>
                  )}

                  {profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {!friendship && (
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequest(profile.id)}
                        className="flex-1"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Friend
                      </Button>
                    )}

                    {isPending && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="flex-1"
                      >
                        {requestSentByMe ? "Request Sent" : "Request Pending"}
                      </Button>
                    )}

                    {isAccepted && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProfiles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "No people found matching your search" : "No people to show"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FindFriends;