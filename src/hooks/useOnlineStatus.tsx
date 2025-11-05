import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface OnlineUser {
  user_id: string;
  online_at: string;
}

export const useOnlineStatus = (channelName: string = 'online-users') => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const setupPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const presenceChannel = supabase.channel(channelName);

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const online = new Set<string>();
          
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (presence.user_id) {
                online.add(presence.user_id);
              }
            });
          });
          
          setOnlineUsers(online);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          setOnlineUsers(prev => {
            const updated = new Set(prev);
            (newPresences as any[]).forEach((presence: any) => {
              if (presence.user_id) {
                updated.add(presence.user_id);
              }
            });
            return updated;
          });
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          setOnlineUsers(prev => {
            const updated = new Set(prev);
            (leftPresences as any[]).forEach((presence: any) => {
              if (presence.user_id) {
                updated.delete(presence.user_id);
              }
            });
            return updated;
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: profile.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      setChannel(presenceChannel);
    };

    setupPresence();

    return () => {
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      }
    };
  }, [channelName]);

  return { onlineUsers, isOnline: (userId: string) => onlineUsers.has(userId) };
};
