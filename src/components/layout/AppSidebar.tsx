'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSkeleton
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileVideo, Home, Loader2, LogIn, Settings } from 'lucide-react';
import type { VideoProject } from '@/lib/types';
import { useRouter, usePathname, useParams } from 'next/navigation';
import UserProfileButton from '../auth/UserProfileButton';
import Link from 'next/link';

export default function AppSidebar() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;

  const projectsQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, `users/${user.uid}/projects`) : null),
    [user, firestore]
  );
  const { data: projects, isLoading: isLoadingProjects } = useCollection<VideoProject>(projectsQuery);

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <Sidebar collapsible="icon" side="left" variant='sidebar' className="border-r">
      <SidebarHeader className="flex items-center justify-between">
          <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">Projects</h2>
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          <SidebarMenuItem>
             <Button variant="default" className="w-full" onClick={() => router.push('/new-project')}>
                <PlusCircle />
                <span className="group-data-[collapsible=icon]:hidden ml-2">New Project</span>
             </Button>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex-1 overflow-y-auto mt-4">
            <SidebarMenu>
                {isUserLoading || isLoadingProjects ? (
                    Array.from({length: 3}).map((_, i) => <SidebarMenuSkeleton key={i} showIcon />)
                ) : !user ? (
                    <div className="p-4 text-center group-data-[collapsible=icon]:hidden">
                        <p className="text-sm text-muted-foreground mb-4">Log in to see your projects.</p>
                        <Button onClick={handleLogin}><LogIn className="mr-2"/> Login</Button>
                    </div>
                ) : (
                    projects?.map(p => (
                        <SidebarMenuItem key={p.id}>
                            <SidebarMenuButton
                                onClick={() => router.push(`/projects/${p.id}`)}
                                isActive={pathname.startsWith(`/projects/${p.id}`)}
                                tooltip={p.name}
                            >
                                <FileVideo />
                                <span>{p.name}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))
                )}
            </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => router.push('/dashboard')} isActive={pathname === '/dashboard'} tooltip="Dashboard">
              <Home />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => router.push('/profile')} isActive={pathname === '/profile'} tooltip="Profile & Settings">
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
