
"use client";

import AppSidebar from '@/components/layout/AppSidebar';
import Header from '@/components/layout/Header';
import { ReactNode } from 'react';

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="relative flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <div className="flex h-screen flex-1 flex-col bg-muted/20 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
