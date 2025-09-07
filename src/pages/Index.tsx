import { ArrowRight, BookOpen, Users, MessageSquare, GraduationCap, Star, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Index = () => {
  const features = [
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Study Groups",
      description: "Form collaborative study groups with peers in your field"
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: "Real-time Discussions", 
      description: "Engage in threaded conversations and instant messaging"
    },
    {
      icon: <BookOpen className="h-8 w-8 text-primary" />,
      title: "Resource Sharing",
      description: "Upload and share study materials, notes, and documents"
    },
    {
      icon: <Star className="h-8 w-8 text-primary" />,
      title: "Peer Reviews",
      description: "Get feedback on assignments and help others improve"
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Secure Platform", 
      description: "Your data is protected with enterprise-grade security"
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Fast & Reliable",
      description: "Built on modern technology for optimal performance"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <GraduationCap className="h-12 w-12 text-primary" />
              <div>
                <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                  EduChat
                </h1>
                <p className="text-sm text-muted-foreground">by OMXE</p>
              </div>
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-6">
              Collaborative Study Group Platform
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Connect with students worldwide, form study groups, share resources, and achieve academic excellence together. 
              Join thousands of learners transforming their educational journey.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <a href="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground mb-4">Trusted by students from top universities</p>
              <div className="flex items-center justify-center space-x-8 opacity-60">
                <span className="font-semibold">Harvard</span>
                <span className="font-semibold">MIT</span>
                <span className="font-semibold">Stanford</span>
                <span className="font-semibold">Oxford</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything You Need to Excel
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our comprehensive platform provides all the tools and features you need for successful collaborative learning
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Why Choose EduChat?
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 rounded-full p-2 mt-1">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Global Community</h3>
                      <p className="text-muted-foreground">Connect with students from universities worldwide and expand your learning network</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 rounded-full p-2 mt-1">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Rich Resources</h3>
                      <p className="text-muted-foreground">Access a vast library of study materials, notes, and academic resources</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 rounded-full p-2 mt-1">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Peer Support</h3>
                      <p className="text-muted-foreground">Get help when you need it and help others in return through peer reviews</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-8 text-center">
                  <div className="text-4xl mb-4">🎓</div>
                  <h3 className="text-xl font-semibold mb-2">Join 50,000+ Students</h3>
                  <p className="text-muted-foreground mb-6">Already using EduChat to improve their academic performance</p>
                  <div className="flex justify-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">4.9/5 average rating</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Join thousands of students who are already using EduChat to enhance their academic journey. 
              Get started today and discover the power of collaborative learning.
            </p>
            <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <a href="/auth">
                Start Learning Together
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;