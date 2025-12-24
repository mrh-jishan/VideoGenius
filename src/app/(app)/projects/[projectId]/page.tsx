'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { VideoProject, WorkflowStep, Scene } from '@/lib/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import EditorStep from '@/components/workflow/EditorStep';
import ExportStep from '@/components/workflow/ExportStep';
import Header from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';

export default function ProjectPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [step, setStep] = useState<WorkflowStep>('editing');

  const projectDocRef = useMemoFirebase(
    () => (user && firestore && projectId ? doc(firestore, `users/${user.uid}/projects/${projectId}`) : null),
    [user, firestore, projectId]
  );
  const { data: project, isLoading: isLoadingProject } = useDoc<VideoProject>(projectDocRef);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleUpdateScene = async (updatedScene: Scene) => {
    if (!project || !projectDocRef) return;

    const newScenes = project.scenes.map((scene) =>
      scene.id === updatedScene.id ? updatedScene : scene
    );
    const updatedProject = { ...project, scenes: newScenes, lastModified: new Date().toISOString() };
    
    setDocumentNonBlocking(projectDocRef, updatedProject, { merge: true });
  };
  
  const handleExport = () => {
    setStep('export');
  };

  const renderContent = () => {
    if (isLoadingProject || isUserLoading) {
      return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }
    
    if (!project) {
        return <div className="flex h-full items-center justify-center"><p>Project not found.</p></div>;
    }

    switch (step) {
      case 'editing':
        return (
          <EditorStep
            project={project}
            onUpdateScene={handleUpdateScene}
            onExport={handleExport}
            onBackToProjects={() => router.push('/dashboard')}
          />
        );
      case 'export':
        return <ExportStep project={project} onStartOver={() => router.push('/new-project')} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="p-4 sm:p-6 lg:p-8 h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
