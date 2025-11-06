import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, GraduationCap, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface SuggestedFriend {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  school: string;
  bio: string;
  reason: string;
  score: number;
}

export const FriendSuggestionEngine = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestedFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const fetchSuggestions = async () => {
    try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id, school')
        .eq('user_id', user?.id)
        .single();

      if (!myProfile) return;

      // Get total user count
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('email_verified', true);

      setTotalUsers(count || 0);

      // Get existing friends
      const { data: friendships } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${myProfile.id},friend_id.eq.${myProfile.id}`);

      const friendIds = friendships?.map(f => 
        f.user_id === myProfile.id ? f.friend_id : f.user_id
      ) || [];

      // Get mutual friend counts
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, school, bio, user_id')
        .neq('user_id', user?.id)
        .eq('email_verified', true)
        .not('id', 'in', `(${[myProfile.id, ...friendIds].join(',')})`);

      if (!allProfiles) return;

      // Score each profile
      const scoredProfiles = await Promise.all(
        allProfiles.map(async (profile) => {
          let score = 0;
          let reasons: string[] = [];

          // Same school (highest priority)
          if (profile.school && profile.school === myProfile.school) {
            score += 50;
            reasons.push('Same school');
          }

          // Mutual friends
          const { data: mutualFriends } = await supabase
            .from('friends')
            .select('user_id, friend_id')
            .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
            .eq('status', 'accepted');

          const mutualCount = mutualFriends?.filter(f => 
            friendIds.includes(f.user_id === profile.id ? f.friend_id : f.user_id)
          ).length || 0;

          if (mutualCount > 0) {
            score += mutualCount * 20;
            reasons.push(`${mutualCount} mutual friend${mutualCount > 1 ? 's' : ''}`);
          }

          // Add random factor for variety
          score += Math.random() * 10;

          return {
            ...profile,
            reason: reasons.join(' • ') || 'Suggested for you',
            score
          } as SuggestedFriend;
        })
      );

      // Sort by score and take top suggestions
      const topSuggestions = scoredProfiles
        .sort((a, b) => b.score - a.score)
        .slice(0, count && count < 1000 ? 10 : 5);

      setSuggestions(topSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (profileId: string) => {
    try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!myProfile) return;

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

      setSuggestions(prev => prev.filter(s => s.id !== profileId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg"></div>;
  }

  if (suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Suggested Friends
          {totalUsers < 1000 && (
            <Badge variant="secondary" className="ml-2">
              New Platform - Discover Everyone!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="text-center space-y-3">
                  <Avatar className="mx-auto h-12 w-12">
                    <AvatarImage src={suggestion.avatar_url} />
                    <AvatarFallback>
                      {suggestion.first_name[0]}{suggestion.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h4 className="font-medium text-sm">
                      {suggestion.first_name} {suggestion.last_name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {suggestion.reason}
                    </p>
                  </div>

                  {suggestion.school && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3" />
                      <span className="truncate">{suggestion.school}</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={() => sendFriendRequest(suggestion.id)}
                    className="w-full"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add Friend
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
