import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Network, MessageSquare, BookOpen, Zap, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              DeepResearchFlow
            </h1>
          </div>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Discover Academic Research Like Never Before
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Explore academic papers, visualize citation networks, and engage with research 
            through AI-powered conversations. Transform how you discover and understand academic literature.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-3" onClick={() => navigate("/auth")}>
              Start Exploring
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-slate-900 dark:text-slate-100 mb-12">
          Powerful Research Tools
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
            <CardHeader>
              <Search className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Smart Paper Search</CardTitle>
              <CardDescription>
                Search millions of academic papers with advanced filtering by field, 
                year, citation count, and more.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-green-200 dark:hover:border-green-800 transition-colors">
            <CardHeader>
              <Network className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Interactive Networks</CardTitle>
              <CardDescription>
                Visualize citation relationships and discover connected research 
                through beautiful, interactive graph networks.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>AI Chat with Papers</CardTitle>
              <CardDescription>
                Have conversations about papers using your OpenAI API key. 
                Ask questions, get summaries, and explore ideas.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
            <CardHeader>
              <Zap className="h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Fast & Responsive</CardTitle>
              <CardDescription>
                Built with modern technology for lightning-fast search and 
                smooth interactions across all devices.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-red-200 dark:hover:border-red-800 transition-colors">
            <CardHeader>
              <Shield className="h-12 w-12 text-red-600 mb-4" />
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Your API keys and research data are encrypted and secure. 
                We respect your privacy and academic freedom.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
            <CardHeader>
              <BookOpen className="h-12 w-12 text-indigo-600 mb-4" />
              <CardTitle>Research Collections</CardTitle>
              <CardDescription>
                Organize papers into collections, track your reading progress, 
                and build your personal research library.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Ready to Transform Your Research?
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Join researchers worldwide who are discovering, exploring, and understanding 
            academic literature in revolutionary new ways.
          </p>
          <Button size="lg" className="text-lg px-12 py-4" onClick={() => navigate("/auth")}>
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            © 2024 DeepResearchFlow. Empowering academic discovery through technology.
          </p>
        </div>
      </footer>
    </div>
  );
}