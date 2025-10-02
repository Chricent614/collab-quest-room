import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Send, MessageSquare, Users, Bot, ArrowLeft, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VoiceChatbot from '@/components/VoiceChatbot';
import FriendSuggestions from '@/components/FriendSuggestions';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  receiver: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);
  const [longPressUser, setLongPressUser] = useState<Conversation | null>(null);
  const [showChatRequestDialog, setShowChatRequestDialog] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Real-time subscription for friend updates
  useEffect(() => {
    if (!user) return;

    let myProfileId: string | null = null;

    const setupRealtime = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;
      myProfileId = profile.id;

      const channel = supabase
        .channel('friends-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friends',
            filter: `friend_id=eq.${myProfileId}`
          },
          (payload) => {
            // When someone accepts our friend request
            if (payload.new.status === 'accepted') {
              fetchConversations();
              toast({
                title: "Friend Request Accepted",
                description: "You can now start chatting!",
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friends',
            filter: `user_id=eq.${myProfileId}`
          },
          (payload) => {
            // When we accept a friend request
            if (payload.new.status === 'accepted') {
              fetchConversations();
            }
          }
        )
        .subscribe();

      return channel;
    };

    const channelPromise = setupRealtime();

    return () => {
      channelPromise.then(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Get all unique conversation partners (only verified emails)
      const { data: messageData, error } = await supabase
        .from('private_messages')
        .select(`
          sender_id,
          receiver_id,
          content,
          created_at,
          sender:profiles!private_messages_sender_id_fkey(id, first_name, last_name, avatar_url, email_verified),
          receiver:profiles!private_messages_receiver_id_fkey(id, first_name, last_name, avatar_url, email_verified)
        `)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all accepted friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select(`
          user_id,
          friend_id,
          user:profiles!friends_user_id_fkey(id, first_name, last_name, avatar_url, email_verified),
          friend:profiles!friends_friend_id_fkey(id, first_name, last_name, avatar_url, email_verified)
        `)
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
        .eq('status', 'accepted');

      // Process conversations - filter for verified emails only
      const conversationMap = new Map<string, Conversation>();
      
      // Add message-based conversations
      messageData?.forEach((message) => {
        const isFromMe = message.sender_id === profile.id;
        const otherUser = isFromMe ? message.receiver : message.sender;
        const otherUserId = isFromMe ? message.receiver_id : message.sender_id;

        // Only show conversations with verified email users
        if (otherUser.email_verified && !conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            user_id: otherUserId,
            user_name: `${otherUser.first_name} ${otherUser.last_name}`,
            avatar_url: otherUser.avatar_url,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0
          });
        }
      });

      // Add accepted friends even if no messages yet
      friendsData?.forEach((friendship) => {
        const isFromMe = friendship.user_id === profile.id;
        const otherUser = isFromMe ? friendship.friend : friendship.user;
        const otherUserId = isFromMe ? friendship.friend_id : friendship.user_id;

        // Only show verified email users and don't overwrite existing conversations
        if (otherUser.email_verified && !conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            user_id: otherUserId,
            user_name: `${otherUser.first_name} ${otherUser.last_name}`,
            avatar_url: otherUser.avatar_url,
            last_message: undefined,
            last_message_time: undefined,
            unread_count: 0
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('private_messages')
        .select(`
          *,
          sender:profiles!private_messages_sender_id_fkey(first_name, last_name, avatar_url),
          receiver:profiles!private_messages_receiver_id_fkey(first_name, last_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${profile.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: profile.id,
          receiver_id: selectedConversation,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedConversation);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const sendChatbotMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = newMessage.trim();
    setNewMessage('');

    // Add user message to chat
    const userChatMessage = {
      id: `user-${Date.now()}`,
      content: userMessage,
      created_at: new Date().toISOString(),
      sender_id: 'user',
      receiver_id: 'chatbot',
      sender: { first_name: 'You', last_name: '', avatar_url: '' },
      receiver: { first_name: 'Assistant', last_name: '', avatar_url: '' }
    };

    setMessages(prev => [...prev, userChatMessage]);

    // Generate bot response
    const botResponses = [
      "I'm here to help! What would you like to know?",
      "That's an interesting question. Let me think about that...",
      "I understand. How can I assist you further?",
      "Thanks for sharing that with me. Is there anything specific you need help with?",
      "I'm a simple chatbot. For more advanced features, you might want to integrate with a service like OpenAI or Claude.",
      "How has your day been going? I'm here to chat!",
      "That's a great point. What else would you like to discuss?",
      "I appreciate you reaching out. What's on your mind?"
    ];

    setTimeout(() => {
      const botMessage = {
        id: `bot-${Date.now()}`,
        content: botResponses[Math.floor(Math.random() * botResponses.length)],
        created_at: new Date().toISOString(),
        sender_id: 'chatbot',
        receiver_id: 'user',
        sender: { first_name: 'Assistant', last_name: '', avatar_url: '' },
        receiver: { first_name: 'You', last_name: '', avatar_url: '' }
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  const startChatbot = () => {
    setShowChatbot(true);
    setSelectedConversation(null);
    setMessages([]);
    
    // Initial bot greeting
    const greeting = {
      id: `bot-${Date.now()}`,
      content: "Hello! I'm your AI assistant. How can I help you today?",
      created_at: new Date().toISOString(),
      sender_id: 'chatbot',
      receiver_id: 'user',
      sender: { first_name: 'Assistant', last_name: '', avatar_url: '' },
      receiver: { first_name: 'You', last_name: '', avatar_url: '' }
    };
    setMessages([greeting]);
  };

  const handleLongPressStart = async (conversation: Conversation) => {
    longPressTimer.current = setTimeout(async () => {
      setLongPressUser(conversation);
      
      // Check if they're friends
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data: friendship } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${profile.id},friend_id.eq.${conversation.user_id}),and(user_id.eq.${conversation.user_id},friend_id.eq.${profile.id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      setIsFriend(!!friendship);
      setShowChatRequestDialog(true);
    }, 5000);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const sendFriendRequest = async () => {
    if (!longPressUser) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${profile.id},friend_id.eq.${longPressUser.user_id}),and(user_id.eq.${longPressUser.user_id},friend_id.eq.${profile.id})`)
        .maybeSingle();

      if (existingRequest) {
        toast({
          title: "Already Connected",
          description: "You already have a connection with this user",
          variant: "destructive"
        });
        setShowChatRequestDialog(false);
        return;
      }

      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: profile.id,
          friend_id: longPressUser.user_id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Friend request sent successfully!"
      });
      
      setShowChatRequestDialog(false);
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startConversationWithFriend = async (friendId: string) => {
    setSelectedConversation(friendId);
    setShowChatbot(false);
    
    // Send initial message
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: profile.id,
          receiver_id: friendId,
          content: "Hi! Let's start chatting!"
        });

      if (error) throw error;
      
      fetchMessages(friendId);
      fetchConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const initiateChat = () => {
    if (longPressUser) {
      setSelectedConversation(longPressUser.user_id);
      setShowChatbot(false);
      setShowChatRequestDialog(false);
    }
  };

  const selectedConversationData = conversations.find(conv => conv.user_id === selectedConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={showChatRequestDialog} onOpenChange={setShowChatRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat with {longPressUser?.user_name}?</DialogTitle>
            <DialogDescription>
              {isFriend 
                ? "You can start chatting with this friend." 
                : "You're not friends yet. Would you like to send a friend request?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {isFriend ? (
              <>
                <Button variant="outline" onClick={() => setShowChatRequestDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={initiateChat}>
                  Start Chat
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowChatRequestDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={sendFriendRequest}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Friend Request
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-[calc(100vh-12rem)]">
        {isMobile ? (
        /* Mobile Layout: Show conversations list or chat */
        <div className="h-full">
          {selectedConversation || showChatbot ? (
            /* Show Chat Area on Mobile */
            <Card className="h-full">
              {showChatbot ? (
                <>
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowChatbot(false);
                          setSelectedConversation(null);
                        }}
                        className="mr-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Bot className="mr-2 h-5 w-5" />
                      AI Assistant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col h-[calc(100%-5rem)]">
                    <VoiceChatbot
                      messages={messages}
                      setMessages={setMessages}
                      newMessage={newMessage}
                      setNewMessage={setNewMessage}
                    />
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedConversation(null)}
                        className="mr-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Avatar className="mr-3">
                        <AvatarImage src={selectedConversationData?.avatar_url} />
                        <AvatarFallback>
                          {selectedConversationData?.user_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {selectedConversationData?.user_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col h-[calc(100%-5rem)]">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isFromMe = message.sender_id !== selectedConversation;
                          
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  isFromMe
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className={`text-xs mt-1 ${isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <div className="border-t p-4">
                      <div className="flex space-x-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <Button onClick={sendMessage} size="icon">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ) : (
            /* Show Conversations List on Mobile */
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Messages
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startChatbot}
                    className="flex items-center gap-2"
                  >
                    <Bot className="h-4 w-4" />
                    AI Chat
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  {conversations.length === 0 ? (
                    <div className="space-y-4 p-4">
                      <div className="text-center py-4">
                        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-sm">No conversations yet</p>
                      </div>
                      <FriendSuggestions onStartConversation={startConversationWithFriend} />
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.user_id}
                        className="p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedConversation(conversation.user_id);
                          setShowChatbot(false);
                        }}
                        onMouseDown={() => handleLongPressStart(conversation)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(conversation)}
                        onTouchEnd={handleLongPressEnd}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={conversation.avatar_url} />
                            <AvatarFallback>
                              {conversation.user_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{conversation.user_name}</p>
                            {conversation.last_message && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.last_message}
                              </p>
                            )}
                            {conversation.last_message_time && (
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Desktop Layout: Show both conversations and chat side by side */
        <div className="flex h-full">
          {/* Conversations List */}
          <Card className="w-1/3 mr-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Messages
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startChatbot}
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  AI Chat
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {conversations.length === 0 ? (
                  <div className="space-y-4 p-4">
                    <div className="text-center py-4">
                      <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No conversations yet</p>
                    </div>
                    <FriendSuggestions onStartConversation={startConversationWithFriend} />
                  </div>
                ) : (
                  conversations.map((conversation) => (
                      <div
                        key={conversation.user_id}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedConversation === conversation.user_id && !showChatbot ? 'bg-muted' : ''
                        }`}
                    onClick={() => {
                      setSelectedConversation(conversation.user_id);
                      setShowChatbot(false);
                    }}
                    onMouseDown={() => handleLongPressStart(conversation)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(conversation)}
                    onTouchEnd={handleLongPressEnd}
                  >
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={conversation.avatar_url} />
                          <AvatarFallback>
                            {conversation.user_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conversation.user_name}</p>
                          {conversation.last_message && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.last_message}
                            </p>
                          )}
                          {conversation.last_message_time && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1">
            {showChatbot ? (
              <CardContent className="p-0 flex flex-col h-[500px]">
                <VoiceChatbot
                  messages={messages}
                  setMessages={setMessages}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                />
              </CardContent>
            ) : selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center">
                    <Avatar className="mr-3">
                      <AvatarImage src={selectedConversationData?.avatar_url} />
                      <AvatarFallback>
                        {selectedConversationData?.user_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {selectedConversationData?.user_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex flex-col h-[500px]">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isFromMe = message.sender_id !== selectedConversation;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isFromMe
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <div className="border-t p-4">
                    <div className="flex space-x-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button onClick={sendMessage} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">Choose a conversation from the list to start messaging</p>
                  <div className="mt-6">
                    <FriendSuggestions onStartConversation={startConversationWithFriend} />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
      </div>
    </>
  );
};

export default Messages;