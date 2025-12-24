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
import { Loader2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
    if (step !== 'dashboard' && !activeProject) {
        setStep('dashboard');
    }
  }, [step, activeProject]);


  const handleGenerateScenes = async (prompt: string) => {
    if (!user || !firestore) return;
    setIsLoading(true);
    try {
      const scenes = await generateScenesAction(prompt);
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
  
  const handleDeleteProject = async (projectId: string) => {
    if (!user || !firestore) return;
    const projectRef = doc(firestore, `users/${user.uid}/projects/${projectId}`);
    deleteDocumentNonBlocking(projectRef);
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
    toast({ title: 'Project deleted' });
  };

  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline">Your Projects</h1>
        <Button onClick={handleStartNewProject}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>
      {isLoadingProjects && <div className="flex justify-center py-10"><Loader2 className="mx-auto animate-spin h-8 w-8" /></div>}
      {!isLoadingProjects && projects && projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="truncate font-headline">{p.name || 'Untitled Project'}</CardTitle>
                <CardDescription>
                  {new Date(p.creationDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3 h-[60px]">{p.prompt}</p>
              </CardContent>
              <CardContent className="flex gap-2 pt-0">
                  <Button className="w-full" onClick={() => handleSelectProject(p)}>Edit</Button>
                  <Button variant="destructive" className="w-full" onClick={() => handleDeleteProject(p.id)}>Delete</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !isLoadingProjects && 
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No Projects Yet</h3>
            <p className="text-muted-foreground mt-2 mb-4">Click "New Project" to start creating your first video.</p>
            <Button onClick={handleStartNewProject}>
                <PlusCircle className="mr-2 h-4 w-4" /> New Project
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
              onBackToProjects={() => setActiveProject(null)}
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
        <div className="container mx-auto px-4 py-8">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
