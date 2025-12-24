"use client";

import { ReactNode } from 'react';

export default function PublicLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  );
}
