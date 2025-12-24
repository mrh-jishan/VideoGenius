import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import UserProfileButton from '@/components/auth/UserProfileButton';

export default function Header() {
  return (
    <header className="bg-card border-b sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Clapperboard className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-headline">
              VideoGenius
            </h1>
          </Link>
          <UserProfileButton />
        </div>
      </div>
    </header>
  );
}
