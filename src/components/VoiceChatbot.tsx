import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

interface VoiceChatbotProps {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  newMessage: string;
  setNewMessage: (message: string) => void;
}

const VoiceChatbot = ({ messages, setMessages, newMessage, setNewMessage }: VoiceChatbotProps) => {
  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = async (text: string) => {
    if (!voiceEnabled) return;

    try {
      setIsSpeaking(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'Aria' }
      });

      if (error) throw error;

      if (data.audioContent) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
      toast({
        title: "Audio Error",
        description: "Could not play voice response",
        variant: "destructive"
      });
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const sendChatbotMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = newMessage.trim();
    setNewMessage('');

    // Add user message to chat
    const userChatMessage: Message = {
      id: `user-${Date.now()}`,
      content: userMessage,
      created_at: new Date().toISOString(),
      sender_id: 'user',
      receiver_id: 'chatbot',
      sender: { first_name: 'You', last_name: '', avatar_url: '' },
      receiver: { first_name: 'Assistant', last_name: '', avatar_url: '' }
    };

    setMessages([...messages, userChatMessage]);

    // Generate bot response
    const botResponses = [
      "I'm here to help! What would you like to know?",
      "That's an interesting question. Let me think about that...",
      "I understand. How can I assist you further?",
      "Thanks for sharing that with me. Is there anything specific you need help with?",
      "I'm a helpful AI assistant. For advanced features, you might want to integrate with services like OpenAI.",
      "How has your day been going? I'm here to chat!",
      "That's a great point. What else would you like to discuss?",
      "I appreciate you reaching out. What's on your mind?",
      "Let me help you with that. Can you provide more details?",
      "I'm designed to be helpful and informative. What can I assist you with today?"
    ];

    setTimeout(async () => {
      const botResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        content: botResponse,
        created_at: new Date().toISOString(),
        sender_id: 'chatbot',
        receiver_id: 'user',
        sender: { first_name: 'Assistant', last_name: '', avatar_url: '' },
        receiver: { first_name: 'You', last_name: '', avatar_url: '' }
      };
      
      setMessages([...messages, botMessage]);
      
      // Play the bot response
      await playAudio(botResponse);
    }, 1000);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Avatar className="mr-3">
            <AvatarFallback>
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">AI Assistant</span>
          {isSpeaking && (
            <span className="ml-2 text-sm text-muted-foreground animate-pulse">
              Speaking...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="flex items-center gap-2"
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {voiceEnabled ? 'Voice On' : 'Voice Off'}
          </Button>
          {isSpeaking && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopAudio}
            >
              Stop
            </Button>
          )}
        </div>
      </div>
      
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
    </>
  );
};

export default VoiceChatbot;