import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, UserPlus, UserCheck, Clock, ArrowLeft } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school?: string;
  bio?: string;
  avatar_url?: string;
  email_verified: boolean;
  phone_verified: boolean;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'sent'>('none');
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchFriendStatus();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendStatus = async () => {
    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!currentProfile) return;
      setCurrentUserProfileId(currentProfile.id);

      // Check if friend request exists
      const { data: friendship } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${currentProfile.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentProfile.id})`)
        .maybeSingle();

      if (friendship) {
        if (friendship.status === 'accepted') {
          setFriendStatus('accepted');
        } else if (friendship.user_id === currentProfile.id) {
          setFriendStatus('sent');
        } else {
          setFriendStatus('pending');
        }
      }
    } catch (error) {
      console.error('Error fetching friend status:', error);
    }
  };

  const handleFriendRequest = async () => {
    if (!currentUserProfileId) return;

    try {
      if (friendStatus === 'none') {
        // Send friend request
        const { error } = await supabase
          .from('friends')
          .insert({
            user_id: currentUserProfileId,
            friend_id: userId,
            status: 'pending'
          });

        if (error) throw error;

        setFriendStatus('sent');
        toast({
          title: "Success",
          description: "Friend request sent!"
        });
      } else if (friendStatus === 'pending') {
        // Accept friend request
        const { error } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .eq('user_id', userId)
          .eq('friend_id', currentUserProfileId);

        if (error) throw error;

        setFriendStatus('accepted');
        toast({
          title: "Success",
          description: "Friend request accepted!"
        });
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast({
        title: "Error",
        description: "Failed to update friend status",
        variant: "destructive"
      });
    }
  };

  const handleMessage = () => {
    navigate('/messages', { state: { selectedUserId: userId } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Profile not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url} alt={`${profile.first_name} ${profile.last_name}`} />
              <AvatarFallback className="text-2xl">
                {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">
                {profile.first_name} {profile.last_name}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.email_verified && (
                  <Badge variant="secondary">Email Verified</Badge>
                )}
                {profile.phone_verified && (
                  <Badge variant="secondary">Phone Verified</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleFriendRequest} disabled={friendStatus === 'sent' || friendStatus === 'accepted'}>
                  {friendStatus === 'none' && <><UserPlus className="mr-2 h-4 w-4" /> Add Friend</>}
                  {friendStatus === 'sent' && <><Clock className="mr-2 h-4 w-4" /> Request Sent</>}
                  {friendStatus === 'pending' && <><UserPlus className="mr-2 h-4 w-4" /> Accept Request</>}
                  {friendStatus === 'accepted' && <><UserCheck className="mr-2 h-4 w-4" /> Friends</>}
                </Button>
                <Button variant="outline" onClick={handleMessage}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.bio && (
            <div>
              <h3 className="font-semibold mb-2">Bio</h3>
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-1">Email</h3>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
            {profile.phone && (
              <div>
                <h3 className="font-semibold mb-1">Phone</h3>
                <p className="text-muted-foreground">{profile.phone}</p>
              </div>
            )}
            {profile.school && (
              <div>
                <h3 className="font-semibold mb-1">School</h3>
                <p className="text-muted-foreground">{profile.school}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
