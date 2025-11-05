import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Send, MessageSquare, Users, Bot, ArrowLeft, Check, CheckCheck, Paperclip, Download, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VoiceChatbot from '@/components/VoiceChatbot';
import GroupMessages from '@/components/GroupMessages';
import FriendSuggestions from '@/components/FriendSuggestions';
import VoiceRecorder from '@/components/VoiceRecorder';
import VoicePlayer from '@/components/VoicePlayer';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  file_url?: string;
  file_name?: string;
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
  user_id?: string;
  group_id?: string;
  user_name: string;
  avatar_url?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  is_group?: boolean;
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMyProfile();
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMyProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    setMyProfile(data);
  };

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

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user || !selectedConversation) return;

    let myProfileId: string | null = null;

    const setupMessageRealtime = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;
      myProfileId = profile.id;

      const channel = supabase
        .channel('private-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `receiver_id=eq.${myProfileId}`
          },
          (payload) => {
            // If the message is for the current conversation, add it
            if (payload.new.sender_id === selectedConversation) {
              fetchMessages(selectedConversation);
            }
            // Update conversations list
            fetchConversations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `sender_id=eq.${myProfileId}`
          },
          (payload) => {
            // Update conversations list when we send a message
            fetchConversations();
          }
        )
        .subscribe();

      return channel;
    };

    fetchMessages(selectedConversation);
    const channelPromise = setupMessageRealtime();

    return () => {
      channelPromise.then(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [user, selectedConversation]);

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

      // Get user's groups
      const { data: groupsData } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(id, name, avatar_url)
        `)
        .eq('user_id', profile.id);

      // Get last messages for each group
      const groupIds = groupsData?.map(g => g.group_id) || [];
      const { data: groupMessages } = groupIds.length > 0 ? await supabase
        .from('posts')
        .select('id, content, created_at, group_id, author_id')
        .in('group_id', groupIds)
        .eq('content_type', 'text')
        .order('created_at', { ascending: false }) : { data: [] };

      // Count unread messages
      const { data: unreadMessages } = await supabase
        .from('private_messages')
        .select('sender_id')
        .eq('receiver_id', profile.id)
        .is('read_at', null);

      const unreadCounts = new Map<string, number>();
      unreadMessages?.forEach(msg => {
        unreadCounts.set(msg.sender_id, (unreadCounts.get(msg.sender_id) || 0) + 1);
      });

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
            unread_count: unreadCounts.get(otherUserId) || 0,
            is_group: false
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
            unread_count: 0,
            is_group: false
          });
        }
      });

      // Add group conversations
      groupsData?.forEach((groupMember) => {
        const group = groupMember.groups;
        const groupId = `group-${group.id}`;
        const lastGroupMessage = groupMessages?.find(m => m.group_id === group.id);

        conversationMap.set(groupId, {
          group_id: group.id,
          user_name: group.name,
          avatar_url: group.avatar_url,
          last_message: lastGroupMessage?.content,
          last_message_time: lastGroupMessage?.created_at,
          unread_count: 0,
          is_group: true
        });
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
      
      // Mark received messages as read
      await supabase
        .from('private_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', profile.id)
        .is('read_at', null);

      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: "File selected",
        description: `${file.name} ready to send`
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      toast({
        title: "Image selected",
        description: `${file.name} ready to send`
      });
    } else {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
    }
  };

  const handleVoiceSend = async (audioBlob: Blob) => {
    if (!selectedConversation) return;

    try {
      setUploading(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Upload voice message
      const fileName = `${user?.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: profile.id,
          receiver_id: selectedConversation,
          content: '🎤 Voice message',
          file_url: publicUrl,
          file_name: 'voice-message.webm'
        });

      if (error) throw error;

      fetchMessages(selectedConversation);
      fetchConversations();
      
      toast({
        title: "Success",
        description: "Voice message sent"
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('message-files')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('message-files')
      .getPublicUrl(fileName);

    return { url: publicUrl, name: file.name };
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation) return;

    try {
      setUploading(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      let fileUrl = null;
      let fileName = null;

      if (selectedFile) {
        const fileData = await uploadFile(selectedFile);
        fileUrl = fileData?.url;
        fileName = fileData?.name;
      }

      const { error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: profile.id,
          receiver_id: selectedConversation,
          content: newMessage.trim() || (fileName ? `Sent file: ${fileName}` : ''),
          file_url: fileUrl,
          file_name: fileName
        });

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchMessages(selectedConversation);
      fetchConversations();
      
      toast({
        title: "Success",
        description: fileName ? "File sent successfully" : "Message sent"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "File downloaded"
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
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
      <div className="fixed inset-0 top-16 z-10">
        {isMobile ? (
        /* Mobile Layout: Show conversations list or chat */
        <div className="h-full">
          {selectedConversation || selectedGroupId || showChatbot ? (
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
              ) : selectedGroupId ? (
                /* Show Group Chat */
                <GroupMessages 
                  groupId={selectedGroupId} 
                  groupName={conversations.find(c => c.group_id === selectedGroupId)?.user_name || 'Group'} 
                />
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
                   <CardContent className="p-0 flex flex-col h-[calc(100vh-14rem)]">
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
                                {message.file_url && message.file_name?.endsWith('.webm') ? (
                                  <VoicePlayer audioUrl={message.file_url} />
                                ) : message.file_url && message.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img 
                                    src={message.file_url} 
                                    alt={message.file_name}
                                    className="max-w-full rounded cursor-pointer"
                                    onClick={() => window.open(message.file_url, '_blank')}
                                  />
                                ) : (
                                  <p className="text-sm">{message.content}</p>
                                )}
                                {message.file_url && message.file_name && !message.file_name.endsWith('.webm') && !message.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 flex items-center gap-2"
                                    onClick={() => downloadFile(message.file_url!, message.file_name!)}
                                  >
                                    <Download className="h-4 w-4" />
                                    {message.file_name}
                                  </Button>
                                )}
                                <div className="flex items-center gap-1 mt-1">
                                  <p className={`text-xs ${isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                  </p>
                                  {isFromMe && (
                                    <CheckCheck className="h-3 w-3 text-primary-foreground/70 ml-1" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                         })}
                         <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="border-t p-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      {selectedFile && (
                        <div className="mb-2 p-2 bg-muted rounded flex items-center justify-between">
                          {selectedFile.type.startsWith('image/') ? (
                            <img 
                              src={URL.createObjectURL(selectedFile)} 
                              alt="Preview"
                              className="h-20 object-contain rounded"
                            />
                          ) : (
                            <span className="text-sm truncate">{selectedFile.name}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                              if (imageInputRef.current) imageInputRef.current.value = '';
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <VoiceRecorder onSendVoice={handleVoiceSend} disabled={uploading} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          onKeyPress={(e) => e.key === 'Enter' && !uploading && sendMessage()}
                          disabled={uploading}
                        />
                        <Button onClick={sendMessage} size="icon" disabled={uploading}>
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
                <ScrollArea className="h-[calc(100vh-12rem)]">
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
                        key={conversation.user_id || conversation.group_id}
                        className="p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors relative"
                        onClick={() => {
                          if (conversation.is_group) {
                            setSelectedGroupId(conversation.group_id!);
                            setSelectedConversation(null);
                          } else {
                            setSelectedConversation(conversation.user_id!);
                            setSelectedGroupId(null);
                          }
                          setShowChatbot(false);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarImage src={conversation.avatar_url} />
                              <AvatarFallback>
                                {conversation.is_group ? (
                                  <Users className="h-4 w-4" />
                                ) : (
                                  conversation.user_name.split(' ').map(n => n[0]).join('')
                                )}
                              </AvatarFallback>
                            </Avatar>
                            {conversation.unread_count > 0 && (
                              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                                {conversation.unread_count}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{conversation.user_name}</p>
                              {conversation.last_message_time && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: false })}
                                </span>
                              )}
                            </div>
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
        <div className="flex h-full gap-4">
          {/* Conversations List */}
          <Card className="w-1/3">
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
              <ScrollArea className="h-[calc(100vh-14rem)]">
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
                        key={conversation.user_id || conversation.group_id}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedConversation === conversation.user_id && !showChatbot ? 'bg-muted' : ''
                        }`}
                    onClick={() => {
                      if (conversation.is_group) {
                        setSelectedGroupId(conversation.group_id!);
                        setSelectedConversation(null);
                      } else {
                        setSelectedConversation(conversation.user_id!);
                        setSelectedGroupId(null);
                      }
                      setShowChatbot(false);
                    }}
                  >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={conversation.avatar_url} />
                            <AvatarFallback>
                              {conversation.is_group ? (
                                <Users className="h-4 w-4" />
                              ) : (
                                conversation.user_name.split(' ').map(n => n[0]).join('')
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.unread_count > 0 && (
                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium truncate ${conversation.unread_count > 0 ? 'font-bold' : ''}`}>
                              {conversation.user_name}
                            </p>
                            {conversation.last_message_time && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: false })}
                              </span>
                            )}
                          </div>
                          {conversation.last_message && (
                            <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {conversation.last_message}
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
              <CardContent className="p-0 flex flex-col h-[calc(100vh-8rem)]">
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
                <CardContent className="p-0 flex flex-col h-[calc(100vh-14rem)]">
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