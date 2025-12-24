'use client';

import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import UserProfileButton from '@/components/auth/UserProfileButton';

export default function Header() {
  return (
    <header className="bg-card border-b sticky top-0 z-40">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Clapperboard className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-headline hidden sm:block">
              VideoGenius
            </h1>
          </Link>
        </div>
        <UserProfileButton />
      </div>
    </header>
  );
}
