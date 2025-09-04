import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  MessageSquare, 
  FolderOpen, 
  Video, 
  CheckSquare, 
  Library, 
  PenTool,
  Zap
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Smart Group Formation",
    description: "Create and join study groups based on courses, subjects, or learning goals. Connect with like-minded students instantly.",
    color: "text-primary"
  },
  {
    icon: MessageSquare,
    title: "Interactive Forums",
    description: "Engage in meaningful discussions, ask questions, and share insights with your study group members.",
    color: "text-secondary"
  },
  {
    icon: FolderOpen,
    title: "Seamless File Sharing",
    description: "Upload, organize, and share notes, documents, and study materials with your group effortlessly.",
    color: "text-primary"
  },
  {
    icon: Video,
    title: "Virtual Study Sessions",
    description: "Host live video conferences and chat sessions for real-time collaboration and learning.",
    color: "text-secondary"
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    description: "Create tasks, assign responsibilities, track progress, and never miss important deadlines.",
    color: "text-primary"
  },
  {
    icon: Library,
    title: "Resource Library",
    description: "Access a centralized repository of study materials categorized by subject and contributor.",
    color: "text-secondary"
  },
  {
    icon: PenTool,
    title: "Peer Review System",
    description: "Submit assignments for structured peer feedback and improve your work collaboratively.",
    color: "text-primary"
  },
  {
    icon: Zap,
    title: "Real-time Sync",
    description: "Stay updated with instant notifications and real-time synchronization across all devices.",
    color: "text-secondary"
  }
];

const Features = () => {
  return (
    <section id="features" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Everything You Need to
            <span className="bg-gradient-hero bg-clip-text text-transparent"> Excel Together</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to enhance collaborative learning and make studying more effective and engaging.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="space-y-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-subtle flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;