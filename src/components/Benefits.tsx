import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Lightbulb, Clock, Network, Target } from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    title: "Enhanced Learning",
    description: "Collaborative study methods proven to improve retention and understanding through peer interaction."
  },
  {
    icon: Users,
    title: "Motivation & Accountability",
    description: "Stay motivated with group commitments and peer support that keeps you on track with your goals."
  },
  {
    icon: Lightbulb,
    title: "Diverse Perspectives",
    description: "Gain new insights and understanding by learning from students with different backgrounds and approaches."
  },
  {
    icon: Clock,
    title: "Better Time Management",
    description: "Structured group activities and deadlines help you develop strong time management skills."
  },
  {
    icon: Network,
    title: "Networking Opportunities",
    description: "Build lasting relationships with fellow students that extend beyond your academic journey."
  },
  {
    icon: Target,
    title: "Focused Study Sessions",
    description: "Organized group activities and clear objectives make your study time more productive and effective."
  }
];

const Benefits = () => {
  return (
    <section id="benefits" className="py-16 lg:py-24 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Why Students Love
            <span className="bg-gradient-hero bg-clip-text text-transparent"> EduChat</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the transformative benefits that make collaborative learning more effective and enjoyable.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card 
              key={index}
              className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-card/50 backdrop-blur-sm border-border"
            >
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;