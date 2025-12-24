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
import { PlusCircle, FileVideo, Home, Loader2, Settings, Clapperboard } from 'lucide-react';
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

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg group-data-[collapsible=icon]:-ml-1 group-data-[collapsible=icon]:pointer-events-none">
          <Clapperboard className="h-5 w-5 text-sidebar-primary" />
          <span className="group-data-[collapsible=icon]:hidden">VideoGenius</span>
        </Link>
        <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent className="flex-1 p-4 space-y-6">
        <div>
          <Button
            variant="default"
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            onClick={() => router.push('/new-project')}
          >
            <PlusCircle className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden ml-2">New Project</span>
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            My Projects
          </p>
          <div className="flex-1 overflow-y-auto">
            <SidebarMenu className="space-y-1">
              {isUserLoading || isLoadingProjects ? (
                Array.from({ length: 3 }).map((_, i) => <SidebarMenuSkeleton key={i} showIcon />)
              ) : projects && projects.length > 0 ? (
                projects.map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton
                      onClick={() => router.push(`/projects/${p.id}`)}
                      isActive={pathname.startsWith(`/projects/${p.id}`)}
                      tooltip={p.name}
                      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                      <FileVideo className="h-4 w-4" />
                      <span className="truncate">{p.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <div className="p-3 text-sm text-sidebar-foreground/70 bg-sidebar-accent/40 rounded-md">
                  <p className="group-data-[collapsible=icon]:hidden">No projects yet. Create one to get started.</p>
                </div>
              )}
            </SidebarMenu>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push('/dashboard')}
              isActive={pathname === '/dashboard'}
              tooltip="Dashboard"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
            >
              <Home className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push('/profile')}
              isActive={pathname === '/profile'}
              tooltip="Profile & Settings"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
            >
              <Settings className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
