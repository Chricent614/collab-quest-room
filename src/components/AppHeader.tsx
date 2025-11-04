import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/NotificationBell';

const AppHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard?search=${encodeURIComponent(searchQuery)}`);
    }
  };

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

        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-2 md:mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-10 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center space-x-2 md:space-x-4">
          <NotificationBell />
          
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarImage src="/placeholder.svg" />
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