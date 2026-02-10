import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Hammer, Ruler, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Ruler className="text-white w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Structura.ai</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Features</a>
            <a href="#" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#" className="hover:text-primary transition-colors">About</a>
          </nav>
          <div className="flex gap-4">
            <Button variant="ghost" className="hidden sm:flex">Log in</Button>
            <Link href="/planner">
              <Button className="shadow-lg shadow-primary/25">Start Planning</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto px-4 text-center max-w-4xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block py-1 px-3 rounded-full bg-accent/10 text-accent-foreground text-sm font-semibold mb-6 border border-accent/20">
                AI-Powered Construction Planning
              </span>
              <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-slate-900 mb-6 leading-tight">
                Build smarter with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Intelligent Insights</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Generate accurate cost estimates, timelines, and architectural blueprints in seconds using advanced AI analysis.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/planner">
                  <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                    Start Your Project <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full">
                  View Demo
                </Button>
              </div>
            </motion.div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/3" />
        </section>

        {/* Feature Grid */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<BrainCircuit className="w-8 h-8 text-primary" />}
                title="AI Analysis"
                description="Get detailed reasoning on costs and timelines powered by advanced language models."
              />
              <FeatureCard 
                icon={<Ruler className="w-8 h-8 text-accent" />}
                title="Auto-Blueprints"
                description="Automatically generate optimal floor plans based on your dimensions and constraints."
              />
              <FeatureCard 
                icon={<Hammer className="w-8 h-8 text-purple-500" />}
                title="Resource Planning"
                description=" precise breakdown of materials (cement, steel, bricks) and labor requirements."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© 2024 Structura.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 rounded-2xl bg-white border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300"
    >
      <div className="mb-6 p-4 bg-slate-50 rounded-xl inline-block">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
