import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, BookOpen, MessageSquare } from "lucide-react";
import heroImage from "@/assets/hero-collaboration.jpg";

const Hero = () => {
  return (
    <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fadeInUp">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Transform Your
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Study Experience</span>
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                Join collaborative study groups, share resources, and accelerate your learning with EduChat - the modern platform designed for ambitious students.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="group">
                Start Learning Together
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="group">
                <Play className="h-5 w-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-primary" />
                <span>10,000+ Students</span>
              </div>
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>500+ Study Groups</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span>Active Discussions</span>
              </div>
            </div>
          </div>
          
          {/* Right Content - Hero Image */}
          <div className="relative animate-float">
            <div className="relative rounded-2xl overflow-hidden shadow-hero">
              <img 
                src={heroImage} 
                alt="Students collaborating in study groups" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-primary opacity-20"></div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 bg-card rounded-full p-4 shadow-lg animate-float" style={{ animationDelay: '0.5s' }}>
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card rounded-full p-4 shadow-lg animate-float" style={{ animationDelay: '1s' }}>
              <Users className="h-6 w-6 text-secondary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;