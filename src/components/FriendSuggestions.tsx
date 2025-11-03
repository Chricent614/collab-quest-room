import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface SuggestedFriend {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  school?: string;
  bio?: string;
}

interface FriendSuggestionsProps {
  onStartConversation: (friendId: string) => void;
}

const FriendSuggestions = ({ onStartConversation }: FriendSuggestionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestedFriend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const fetchSuggestions = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Get users who are not already friends and not the current user
      const { data: friends } = await supabase
        .from('friends')
        .select('friend_id, user_id')
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);

      const friendIds = friends?.map(f => 
        f.user_id === profile.id ? f.friend_id : f.user_id
      ) || [];

      // Only show users with verified emails
      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, school, bio')
        .not('id', 'in', `(${[profile.id, ...friendIds].join(',')})`)
        .eq('email_verified', true)
        .limit(6);

      if (error) throw error;
      setSuggestions(allProfiles || []);
    } catch (error) {
      console.error('Error fetching friend suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Check if request already exists (in either direction)
      const { data: existingRequest } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${profile.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${profile.id})`)
        .maybeSingle();

      if (existingRequest) {
        toast({
          title: "Already Connected",
          description: existingRequest.status === 'pending' 
            ? "Friend request already pending" 
            : "You are already friends with this user",
          variant: "destructive"
        });
        setSuggestions(prev => prev.filter(s => s.id !== friendId));
        return;
      }

      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: profile.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) {
        // Handle duplicate key error
        if (error.code === '23505') {
          toast({
            title: "Already Sent",
            description: "Friend request already sent to this user",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Success",
          description: "Friend request sent successfully!"
        });
      }

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.id !== friendId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Find Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            No new friend suggestions available right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Suggested Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.slice(0, 3).map((suggestion) => (
          <div key={suggestion.id} className="flex items-center justify-between p-2 rounded-lg border">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={suggestion.avatar_url} />
                <AvatarFallback>
                  {suggestion.first_name[0]}{suggestion.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {suggestion.first_name} {suggestion.last_name}
                </p>
                {suggestion.school && (
                  <p className="text-xs text-muted-foreground">{suggestion.school}</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => sendFriendRequest(suggestion.id)}
            >
              <UserPlus className="h-3 w-3 mr-2" />
              Add Friend
            </Button>
          </div>
        ))}
        {suggestions.length > 3 && (
          <p className="text-xs text-muted-foreground text-center">
            +{suggestions.length - 3} more suggestions
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FriendSuggestions;