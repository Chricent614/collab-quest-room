import { Button } from "@/components/ui/button";
import { GraduationCap, Menu } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">EduChat</h1>
            <p className="text-xs text-muted-foreground">by OMXE</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#features" className="text-foreground hover:text-primary transition-colors">Features</a>
          <a href="#benefits" className="text-foreground hover:text-primary transition-colors">Benefits</a>
          <a href="#pricing" className="text-foreground hover:text-primary transition-colors">Pricing</a>
        </nav>
        
        <div className="flex items-center space-x-3">
          <Button variant="ghost" className="hidden md:inline-flex" asChild>
            <a href="/auth">Sign In</a>
          </Button>
          <Button variant="hero" asChild>
            <a href="/auth">Get Started</a>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;