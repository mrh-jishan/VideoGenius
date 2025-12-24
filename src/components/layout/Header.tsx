import { Clapperboard } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-card border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Clapperboard className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-headline">
              VideoGenius
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
