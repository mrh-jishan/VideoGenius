import Link from 'next/link';
import { Clapperboard } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <Clapperboard className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight font-headline">
              VideoGenius
            </h1>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
            <Link href="/#features" className="hover:text-primary">Features</Link>
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          </nav>
        </div>
        <div className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} VideoGenius. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
