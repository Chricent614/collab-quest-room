import { ReactNode } from 'react';
import AppHeader from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col">
        <AppHeader />
        
        <div className="flex flex-1 pt-16">
          <AppSidebar />
          
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 max-w-7xl">
              {children}
            </div>
          </main>
        </div>

        {/* WhatsApp-style bottom navigation for mobile */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
            <div className="flex justify-around items-center h-16 px-2">
              {/* Quick action buttons will be rendered here by pages that need them */}
              <div id="mobile-bottom-nav" className="flex justify-around items-center w-full" />
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
