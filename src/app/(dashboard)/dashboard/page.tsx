'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return null; // Or a loading spinner, sidebar will handle main loading state
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center py-24 border-2 border-dashed rounded-lg bg-card shadow-sm max-w-lg w-full">
        <h3 className="text-2xl font-semibold text-foreground">Welcome to VideoGenius</h3>
        <p className="text-muted-foreground mt-3 mb-6 max-w-sm mx-auto">
          Select a project from the sidebar to start editing, or create a new one.
        </p>
        <Button onClick={() => router.push('/new-project')} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> Create New Project
        </Button>
      </div>
    </div>
  );
}
