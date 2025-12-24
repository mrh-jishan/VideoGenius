'use client';

import Link from 'next/link';
import { Clapperboard, PanelLeft } from 'lucide-react';
import UserProfileButton from '@/components/auth/UserProfileButton';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

export default function Header() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <header className="bg-card border-b sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
              <PanelLeft className="h-6 w-6" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
             <Link href="/" className="flex items-center gap-3">
              <Clapperboard className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold text-foreground tracking-tight font-headline hidden sm:block">
                VideoGenius
              </h1>
            </Link>
          </div>
          <UserProfileButton />
        </div>
      </div>
    </header>
  );
}
