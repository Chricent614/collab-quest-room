import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/integrations/supabase/client';
import GlobalSearch from '@/components/GlobalSearch';

const AppHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border h-16">
      <div className="flex items-center justify-between px-2 md:px-4 h-full gap-2">
        <div className="flex items-center space-x-2 md:space-x-4">
          <SidebarTrigger />
          
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold text-foreground">EduChat</h1>
              <p className="text-xs text-muted-foreground">by OMXE</p>
            </div>
          </div>
        </div>

        <GlobalSearch />

        <div className="flex items-center space-x-2 md:space-x-4">
          <NotificationBell />
          
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7 md:h-8 md:w-8 cursor-pointer" onClick={() => navigate('/profile')}>
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={signOut}
              className="hidden md:flex"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;