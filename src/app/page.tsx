import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clapperboard, Sparkles, Film, Bot } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40 bg-muted/20">
          <div className="container mx-auto text-center px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 font-headline bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
              AI-Powered Video Creation
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
              Transform your ideas into professional videos with VideoGenius. Our AI-driven platform simplifies video production, from script to final cut.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/dashboard">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-20 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">Features</h2>
              <p className="text-muted-foreground mt-2">Everything you need to create amazing videos.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>AI Scripting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Generate compelling video scripts from a simple text prompt. Let our AI handle the creative heavy lifting.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Film className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Scene Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Automatically break down your script into manageable scenes, complete with visual and audio suggestions.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Asset Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Choose from a library of pre-selected assets or let the AI suggest visuals that match your scene's content.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Ready to Start Creating?</h2>
            <p className="max-w-xl mx-auto text-lg mb-8">
              Sign up today and experience the future of video production.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">Create Your First Video</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
