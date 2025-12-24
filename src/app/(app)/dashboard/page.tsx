'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Header from '@/components/layout/Header';

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
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
           <div className="text-center py-24 border-2 border-dashed rounded-lg bg-card">
              <h3 className="text-2xl font-semibold text-foreground">Welcome to VideoGenius</h3>
              <p className="text-muted-foreground mt-3 mb-6 max-w-sm mx-auto">Select a project from the sidebar to start editing, or create a new one.</p>
              <Button onClick={() => router.push('/new-project')} size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" /> Create New Project
              </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
