'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, setDoc } from 'firebase/firestore';
import type { VideoProject, WorkflowStep, Scene } from '@/lib/types';
import { generateScenesAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import PromptStep from '@/components/workflow/PromptStep';
import EditorStep from '@/components/workflow/EditorStep';
import ExportStep from '@/components/workflow/ExportStep';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);
  const [step, setStep] = useState<WorkflowStep>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const projectsQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, `users/${user.uid}/projects`) : null),
    [user, firestore]
  );
  const { data: projects, isLoading: isLoadingProjects } = useCollection<VideoProject>(projectsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    // This effect should navigate back to dashboard if we are in a project-specific step without a project.
    // 'prompt' step is for creating a new project, so it doesn't need an activeProject.
    if ((step === 'editing' || step === 'export') && !activeProject) {
        setStep('dashboard');
    }
  }, [step, activeProject]);


  const handleGenerateScenes = async (
    prompt: string,
    aspectRatio: 'horizontal' | 'vertical',
    duration: number
  ) => {
    if (!user || !firestore) return;
    setIsLoading(true);
    try {
      const scenes = await generateScenesAction({ prompt, aspectRatio, duration });
      if (scenes && scenes.length > 0) {
        const scenesWithIds: Scene[] = scenes.map((scene) => ({
          ...scene,
          id: uuidv4(),
        }));
        
        const newProject: VideoProject = {
          id: uuidv4(),
          userId: user.uid,
          name: prompt.substring(0, 50),
          prompt,
          scenes: scenesWithIds,
          creationDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };

        const projectRef = doc(firestore, `users/${user.uid}/projects/${newProject.id}`);
        setDocumentNonBlocking(projectRef, newProject, {});
        
        setActiveProject(newProject);
        setStep('editing');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not generate scenes. The prompt may be invalid.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred while generating scenes.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateScene = async (updatedScene: Scene) => {
    if (!activeProject || !user || !firestore) return;
    const newScenes = activeProject.scenes.map((scene) =>
      scene.id === updatedScene.id ? updatedScene : scene
    );
    const updatedProject = { ...activeProject, scenes: newScenes, lastModified: new Date().toISOString() };
    
    setActiveProject(updatedProject);
    const projectRef = doc(firestore, `users/${user.uid}/projects/${updatedProject.id}`);
    setDocumentNonBlocking(projectRef, updatedProject, { merge: true });
  };
  
  const handleExport = () => {
    setStep('export');
  };

  const handleStartNewProject = () => {
    setActiveProject(null);
    setStep('prompt');
  };

  const handleSelectProject = (project: VideoProject) => {
    setActiveProject(project);
    setStep('editing');
  };
  
  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent card click event
    if (!user || !firestore) return;
    const projectRef = doc(firestore, `users/${user.uid}/projects/${projectId}`);
    deleteDocumentNonBlocking(projectRef);
    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setStep('dashboard');
    }
    toast({ title: 'Project deleted' });
  };

  const renderDashboard = () => (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">Your Projects</h1>
        <Button onClick={handleStartNewProject} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> New Project
        </Button>
      </div>
      {isLoadingProjects && <div className="flex justify-center py-20"><Loader2 className="mx-auto animate-spin h-10 w-10 text-primary" /></div>}
      
      {!isLoadingProjects && projects && projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => (
            <Card 
              key={p.id} 
              className="flex flex-col cursor-pointer transition-all duration-200 ease-in-out hover:shadow-xl hover:-translate-y-1"
              onClick={() => handleSelectProject(p)}
            >
              <CardHeader>
                <CardTitle className="font-headline truncate">{p.name || 'Untitled Project'}</CardTitle>
                <CardDescription>
                  Created: {new Date(p.creationDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-4 h-[80px]">{p.prompt}</p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-4 border-t mt-auto">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete Project</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your project.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={(e) => handleDeleteProject(e, p.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button className="w-full" variant="outline" onClick={() => handleSelectProject(p)}>Edit Project</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        !isLoadingProjects && 
        <div className="text-center py-24 border-2 border-dashed rounded-lg bg-card">
            <h3 className="text-2xl font-semibold text-foreground">No Projects Yet</h3>
            <p className="text-muted-foreground mt-3 mb-6 max-w-sm mx-auto">It looks like your workspace is empty. Get started by creating your first video project.</p>
            <Button onClick={handleStartNewProject} size="lg">
                <PlusCircle className="mr-2 h-5 w-5" /> Create New Project
            </Button>
        </div>
      )}
    </div>
  );

  const renderStep = () => {
    if (!user) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    switch (step) {
      case 'prompt':
         return <PromptStep onPromptSubmit={handleGenerateScenes} isLoading={isLoading} />;
      case 'editing':
        if (activeProject) {
          return (
            <EditorStep
              project={activeProject}
              onUpdateScene={handleUpdateScene}
              onExport={handleExport}
              onBackToProjects={() => {
                setActiveProject(null);
                setStep('dashboard');
              }}
            />
          );
        }
        break;
      case 'export':
        if (activeProject) {
          return <ExportStep project={activeProject} onStartOver={handleStartNewProject} />;
        }
        break;
      case 'dashboard':
      default:
        return renderDashboard();
    }
    // Fallback for when a step is selected but there's no active project
    return renderDashboard();
  };

  if (isUserLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }
  
  if (!user) {
    // This will be handled by the redirect, but as a fallback
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Header />
      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
