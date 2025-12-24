'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
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

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);
  const [step, setStep] = useState<WorkflowStep>('prompt');
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

        await setDoc(doc(firestore, `users/${user.uid}/projects/${newProject.id}`), newProject);
        
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
    await setDoc(doc(firestore, `users/${user.uid}/projects/${updatedProject.id}`), updatedProject, { merge: true });
  };
  
  const handleExport = () => {
    setStep('export');
  };

  const handleStartOver = () => {
    setActiveProject(null);
    setStep('prompt');
  };

  const handleSelectProject = (project: VideoProject) => {
    setActiveProject(project);
    setStep('editing');
  };
  
  const handleDeleteProject = async (projectId: string) => {
    if (!user || !firestore) return;
    await deleteDoc(doc(firestore, `users/${user.uid}/projects/${projectId}`));
    toast({ title: 'Project deleted' });
  };

  const renderDashboard = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline">Your Projects</h1>
        <Button onClick={() => setStep('prompt')}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>
      {isLoadingProjects && <Loader2 className="mx-auto animate-spin" />}
      {!isLoadingProjects && projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="truncate">{p.name || 'Untitled Project'}</CardTitle>
                <CardDescription>{new Date(p.creationDate).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10">{p.prompt}</p>
                <div className="mt-4 flex gap-2">
                  <Button className="w-full" onClick={() => handleSelectProject(p)}>Edit</Button>
                  <Button variant="outline" className="w-full" onClick={() => handleDeleteProject(p.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !isLoadingProjects && <p>You have no projects yet. Create one to get started!</p>
      )}
    </div>
  );

  const renderStep = () => {
    if (!user) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    if (!activeProject && step === 'prompt') {
       if (projects && projects.length > 0) {
         return renderDashboard();
       }
       return <PromptStep onPromptSubmit={handleGenerateScenes} isLoading={isLoading} />;
    }

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
        return renderDashboard();
      case 'export':
        if (activeProject) {
          return <ExportStep project={activeProject} onStartOver={handleStartOver} />;
        }
        return renderDashboard();
      default:
        return renderDashboard();
    }
  };

  if (isUserLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }
  
  if (!user) {
    // This will be handled by the redirect, but as a fallback
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
