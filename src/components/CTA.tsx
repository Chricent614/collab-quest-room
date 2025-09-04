import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Users } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-16 lg:py-24 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/10"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg lg:text-xl text-primary-foreground/90 leading-relaxed">
              Join thousands of students who are already experiencing the power of collaborative learning. 
              Start your journey today and unlock your academic potential.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="group shadow-xl hover:shadow-2xl">
              <BookOpen className="h-5 w-5" />
              Join Study Groups
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Users className="h-5 w-5" />
              Create Your Group
            </Button>
          </div>
          
          <div className="text-sm text-primary-foreground/80">
            <p>Free to start • No credit card required • Join in seconds</p>
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-primary-foreground/10 animate-float"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-primary-foreground/5 animate-float" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-primary-foreground/10 animate-float" style={{ animationDelay: '2s' }}></div>
    </section>
  );
};

export default CTA;