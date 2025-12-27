'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { VideoProject, WorkflowStep, Scene } from '@/lib/types';
import type { MediaResult } from '@/lib/actions';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import EditorStep from '@/components/workflow/EditorStep';
import ExportStep from '@/components/workflow/ExportStep';
import { Loader2 } from 'lucide-react';
import type { ProfileFormValues } from '@/app/(dashboard)/profile/page';

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

  const userConfigRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userConfig } = useDoc<ProfileFormValues>(userConfigRef);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleUpdateScene = async (updatedScene: Scene) => {
    if (!project || !projectDocRef) return;

    const newScenes = project.scenes.map((scene) =>
      scene.id === updatedScene.id ? cleanScene(updatedScene) : cleanScene(scene)
    );
    const updatedProject = { ...project, scenes: newScenes, lastModified: new Date().toISOString() };
    
    setDocumentNonBlocking(projectDocRef, updatedProject, { merge: true });
  };

  const cleanMedia = (media?: MediaResult) => {
    if (!media) return undefined;
    const cleaned: Partial<MediaResult> = {
      id: media.id,
      type: media.type,
      title: media.title,
      url: media.url,
    };
    if (media.previewUrl) cleaned.previewUrl = media.previewUrl;
    if (typeof media.duration === 'number') cleaned.duration = media.duration;
    if (media.tags && media.tags.length) cleaned.tags = media.tags;
    return cleaned as MediaResult;
  };

  const cleanScene = (scene: Scene) => {
    const { selectedVisual, selectedAudio, transitionVisual, narrationVideo, bgAudio, asset, ...rest } = scene;
    const next: any = { ...rest };
    if (asset) next.asset = asset;
    const visual = cleanMedia(selectedVisual);
    if (visual) next.selectedVisual = visual;
    const audio = cleanMedia(selectedAudio);
    if (audio) next.selectedAudio = audio;
    const transition = cleanMedia(transitionVisual);
    if (transition) next.transitionVisual = transition;
    const narrationVid = cleanMedia(narrationVideo);
    if (narrationVid) next.narrationVideo = narrationVid;
    const bg = cleanMedia(bgAudio);
    if (bg) next.bgAudio = bg;
    return next;
  };

  const handleUpdateProjectMeta = (payload: Partial<VideoProject>) => {
    if (!project || !projectDocRef) return;
    const next: Partial<VideoProject> = { ...payload };
    if (payload.globalBgAudio) {
      next.globalBgAudio = cleanMedia(payload.globalBgAudio);
    }
    setDocumentNonBlocking(projectDocRef, { ...next, lastModified: new Date().toISOString() }, { merge: true });
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
            userId={project.userId}
            userConfig={userConfig}
            onUpdateProjectMeta={handleUpdateProjectMeta}
          />
        );
      case 'export':
        return <ExportStep project={project} userConfig={userConfig} onStartOver={() => router.push('/new-project')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[70vh]">
      {renderContent()}
    </div>
  );
}
