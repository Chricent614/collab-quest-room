import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender?: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  read_count?: number;
  is_delivered?: boolean;
}

interface GroupMessagesProps {
  groupId: string;
  groupName: string;
}

const GroupMessages = ({ groupId, groupName }: GroupMessagesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && groupId) {
      fetchMyProfile();
      fetchMessages();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user, groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      console.error('Error fetching profile:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      // Fetch messages with read counts
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          author_id,
          profiles!posts_author_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .eq('content_type', 'text')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch read counts for all messages
      const messageIds = (data || []).map(post => post.id);
      const { data: readData } = await supabase
        .from('message_reads')
        .select('message_id, user_id')
        .in('message_id', messageIds);

      const readCounts = readData?.reduce((acc, read) => {
        acc[read.message_id] = (acc[read.message_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const formattedMessages = (data || []).map(post => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        sender_id: post.author_id,
        sender: post.profiles ? {
          first_name: post.profiles.first_name,
          last_name: post.profiles.last_name,
          avatar_url: post.profiles.avatar_url
        } : undefined,
        read_count: readCounts[post.id] || 0,
        is_delivered: true // Messages are delivered once in DB
      }));

      setMessages(formattedMessages);
      
      // Mark messages as read
      if (myProfile && messageIds.length > 0) {
        markMessagesAsRead(messageIds);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (messageIds: string[]) => {
    if (!myProfile) return;

    try {
      // Mark all messages as read (ignore duplicates)
      const reads = messageIds.map(messageId => ({
        message_id: messageId,
        user_id: myProfile.id
      }));

      await supabase
        .from('message_reads')
        .upsert(reads, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('group-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const newPost = payload.new;
          if (newPost.content_type === 'text') {
            fetchMessages(); // Refetch to get profile data and read counts
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads'
        },
        () => {
          // Update read counts when someone reads a message
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !myProfile) return;

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          content: newMessage,
          content_type: 'text',
          author_id: myProfile.id,
          group_id: groupId
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          {groupName} Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4 max-h-96">
          <div className="space-y-4 py-4">
            {messages.map((message) => {
              const isMyMessage = message.sender_id === myProfile?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMyMessage && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={message.sender?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {message.sender?.first_name[0]}{message.sender?.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col max-w-[70%] ${isMyMessage ? 'items-end' : 'items-start'}`}>
                    {!isMyMessage && (
                      <span className="text-xs text-muted-foreground mb-1">
                        {message.sender?.first_name} {message.sender?.last_name}
                      </span>
                    )}
                    
                    <div
                      className={`rounded-lg px-3 py-2 break-words ${
                        isMyMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </span>
                      {isMyMessage && (
                        <span className={`ml-1 ${(message.read_count || 0) > 0 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                          {message.is_delivered ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isMyMessage && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={myProfile?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {myProfile?.first_name[0]}{myProfile?.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupMessages;