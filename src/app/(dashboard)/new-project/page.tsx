'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { VideoProject, Scene } from '@/lib/types';
import type { MediaResult } from '@/lib/actions';
import { generateScenesAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import PromptStep from '@/components/workflow/PromptStep';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Loader2 } from 'lucide-react';

export default function NewProjectPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userConfig, isLoading: isConfigLoading } = useDoc(userDocRef);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (isUserLoading || isConfigLoading) {
     return <div className="flex flex-1 items-center justify-center py-12"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }
  
  const handleGenerateScenes = async (
    prompt: string,
    aspectRatio: 'horizontal' | 'vertical',
    duration: number,
    sceneCount: number
  ) => {
    if (!user || !firestore) return;
    if (!userConfig?.geminiApiKey) {
      toast({
        variant: 'destructive',
        title: 'Missing Gemini API Key',
        description: 'Add your Google API Key in Settings before generating scenes.',
      });
      router.push('/profile');
      return;
    }
    const safeConfig = {
      geminiApiKey: userConfig.geminiApiKey,
      pixabayKey: userConfig.pixabayKey,
      freesoundKey: userConfig.freesoundKey,
    };
    setIsLoading(true);
    try {
      const scenes = await generateScenesAction({ prompt, aspectRatio, duration, sceneCount, userId: user.uid, userConfig: safeConfig });
      if (scenes && scenes.length > 0) {
        const scenesWithIds: Scene[] = scenes.map((scene) => ({
          ...scene,
          id: uuidv4(),
        }));
        
        let globalBgAudio: MediaResult | undefined;
        if (userConfig?.freesoundKey) {
          try {
            const firstScene = scenesWithIds[0];
            const seed = firstScene?.audioKeywords || prompt;
            const safeQuery = (seed || '')
              .split(/[, ]+/)
              .filter(Boolean)
              .slice(0, 8)
              .join(' ')
              .slice(0, 100);
            const endpoint = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(
              safeQuery
            )}&fields=id,name,previews,duration,tags&token=${userConfig.freesoundKey}&page_size=1`;
            const res = await fetch(endpoint);
            if (res.ok) {
              const data = await res.json();
              const hit = data.results?.[0];
              if (hit) {
                globalBgAudio = {
                  id: String(hit.id),
                  type: 'audio',
                  title: hit.name || 'Freesound Audio',
                  url: hit.previews?.['preview-hq-mp3'] || hit.previews?.['preview-lq-mp3'],
                  previewUrl: hit.previews?.['preview-hq-ogg'] || hit.previews?.['preview-lq-ogg'],
                  duration: hit.duration,
                  tags: hit.tags || [],
                };
              }
            }
          } catch (err) {
            console.error('Failed to prefetch global audio', err);
          }
        }
        
        const newProject: VideoProject = {
          id: uuidv4(),
          userId: user.uid,
          name: prompt.substring(0, 50),
          prompt,
          scenes: scenesWithIds,
          aspectRatio,
          targetDurationSeconds: duration,
          desiredSceneCount: sceneCount,
          ...(globalBgAudio ? { globalBgAudio } : {}),
          creationDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };

        const projectRef = doc(firestore, `users/${user.uid}/projects/${newProject.id}`);
        setDocumentNonBlocking(projectRef, newProject, {});
        
        // Navigate to the new project's editor page
        router.push(`/projects/${newProject.id}`);
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
  
  return (
    <div className="space-y-6">
      <PromptStep onPromptSubmit={handleGenerateScenes} isLoading={isLoading} />
    </div>
  );
}
