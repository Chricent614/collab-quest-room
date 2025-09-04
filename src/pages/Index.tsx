import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MessageSquare, 
  Share, 
  Video, 
  CheckSquare, 
  BookOpen, 
  PenTool,
  Star,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  GraduationCap
} from "lucide-react";
import heroImage from "@/assets/hero-collaboration.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">EduChat</h1>
              <p className="text-xs text-muted-foreground">by OMXE</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Benefits
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">Sign In</Button>
            <Button variant="hero" size="sm">Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeInUp">
              <Badge variant="secondary" className="mb-4">
                <Zap className="w-3 h-3 mr-1" />
                Transform Your Study Experience
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
                Collaborative Learning
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Made Simple</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Join study groups, share resources, and accelerate your learning with EduChat. 
                Connect with peers, access shared knowledge, and achieve academic excellence together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="lg" className="group">
                  Start Learning Together
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="lg">
                  <Video className="w-4 h-4 mr-2" />
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-8 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary border-2 border-background"></div>
                    <div className="w-8 h-8 rounded-full bg-secondary border-2 border-background"></div>
                    <div className="w-8 h-8 rounded-full bg-accent border-2 border-background"></div>
                  </div>
                  <span>500+ Students</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span>4.9/5 Rating</span>
                </div>
              </div>
            </div>
            <div className="animate-float">
              <img 
                src={heroImage} 
                alt="Students collaborating in study groups" 
                className="rounded-2xl shadow-hero w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Core Features</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything You Need for Collaborative Learning
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed to enhance your study experience and foster meaningful academic connections.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Smart Group Formation",
                description: "Join or create study groups based on courses, subjects, or learning goals. Find your perfect study companions."
              },
              {
                icon: MessageSquare,
                title: "Discussion Forums",
                description: "Engage in meaningful discussions, ask questions, and share insights with your study group members."
              },
              {
                icon: Share,
                title: "Seamless File Sharing",
                description: "Upload, share, and organize study materials, notes, and resources with integrated cloud storage."
              },
              {
                icon: Video,
                title: "Virtual Study Sessions",
                description: "Join video calls and real-time chat for virtual study sessions and collaborative learning."
              },
              {
                icon: CheckSquare,
                title: "Task Management",
                description: "Create, assign, and track study tasks and project deadlines within your groups."
              },
              {
                icon: BookOpen,
                title: "Resource Library",
                description: "Access a centralized repository of study materials categorized by subject and contributor."
              },
            ].map((feature, index) => (
              <Card key={index} className="border-0 bg-gradient-subtle hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Why Choose EduChat</Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-8">
                Unlock Your Learning Potential
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Zap,
                    title: "Enhanced Collaborative Learning",
                    description: "Work together on projects, share different perspectives, and learn from diverse viewpoints."
                  },
                  {
                    icon: Shield,
                    title: "Motivation & Accountability",
                    description: "Stay motivated with group support and accountability partners who share your academic goals."
                  },
                  {
                    icon: Globe,
                    title: "Global Learning Network",
                    description: "Connect with students worldwide, expanding your network and cultural understanding."
                  }
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <Card className="border-l-4 border-l-primary bg-gradient-subtle">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-primary" />
                    Peer Review System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get structured feedback on assignments and projects from peers, improving quality and learning outcomes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-secondary bg-gradient-subtle">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-secondary" />
                    Smart Progress Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Monitor your learning progress, track completed tasks, and celebrate achievements with your study group.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already collaborating and achieving academic success with EduChat.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="text-lg px-8">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div>
                <span className="font-bold text-foreground">EduChat</span>
                <span className="text-muted-foreground text-sm ml-2">by OMXE</span>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 EduChat by OMXE. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;