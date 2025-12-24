'use client';

import { useState } from 'react';
import type { VideoProject, WorkflowStep, Scene } from '@/lib/types';
import { generateScenesAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import PromptStep from '@/components/workflow/PromptStep';
import EditorStep from '@/components/workflow/EditorStep';
import ExportStep from '@/components/workflow/ExportStep';

export default function Home() {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [step, setStep] = useState<WorkflowStep>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateScenes = async (prompt: string) => {
    setIsLoading(true);
    try {
      const scenes = await generateScenesAction(prompt);
      if (scenes && scenes.length > 0) {
        const scenesWithIds: Scene[] = scenes.map((scene) => ({
          ...scene,
          id: crypto.randomUUID(),
        }));
        setProject({ prompt, scenes: scenesWithIds });
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

  const handleUpdateScene = (updatedScene: Scene) => {
    if (!project) return;
    const newScenes = project.scenes.map((scene) =>
      scene.id === updatedScene.id ? updatedScene : scene
    );
    setProject({ ...project, scenes: newScenes });
  };
  
  const handleExport = () => {
    setStep('export');
  };

  const handleStartOver = () => {
    setProject(null);
    setStep('prompt');
  };

  const renderStep = () => {
    switch (step) {
      case 'prompt':
        return (
          <PromptStep
            onPromptSubmit={handleGenerateScenes}
            isLoading={isLoading}
          />
        );
      case 'editing':
        if (project) {
          return (
            <EditorStep
              project={project}
              onUpdateScene={handleUpdateScene}
              onExport={handleExport}
            />
          );
        }
        return null;
      case 'export':
        if (project) {
          return <ExportStep project={project} onStartOver={handleStartOver} />;
        }
        return null;
      default:
        return <p>Invalid step</p>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
