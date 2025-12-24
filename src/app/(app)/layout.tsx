
import AppSidebar from '@/components/layout/AppSidebar';
import { ReactNode } from 'react';

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1">
            {children}
        </div>
    </div>
  );
}
