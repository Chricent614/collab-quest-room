import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Send, MessageSquare, Users, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
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

      // Get all unique conversation partners
      const { data: messageData, error } = await supabase
        .from('private_messages')
        .select(`
          sender_id,
          receiver_id,
          content,
          created_at,
          sender:profiles!private_messages_sender_id_fkey(id, first_name, last_name, avatar_url),
          receiver:profiles!private_messages_receiver_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process conversations
      const conversationMap = new Map<string, Conversation>();
      
      messageData?.forEach((message) => {
        const isFromMe = message.sender_id === profile.id;
        const otherUser = isFromMe ? message.receiver : message.sender;
        const otherUserId = isFromMe ? message.receiver_id : message.sender_id;

        if (!conversationMap.has(otherUserId)) {
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

  const selectedConversationData = conversations.find(conv => conv.user_id === selectedConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex">
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
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground">Start a conversation with a group member</p>
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
          <>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center">
                <Avatar className="mr-3">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[500px]">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isFromBot = message.sender_id === 'chatbot';
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isFromBot ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isFromBot
                              ? 'bg-muted'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isFromBot ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
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
                    placeholder="Ask the AI assistant anything..."
                    onKeyPress={(e) => e.key === 'Enter' && sendChatbotMessage()}
                  />
                  <Button onClick={sendChatbotMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
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
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a conversation from the list to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Messages;