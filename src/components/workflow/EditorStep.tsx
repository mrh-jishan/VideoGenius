'use client';

import { FileJson, ArrowLeft } from 'lucide-react';
import type { VideoProject, Scene } from '@/lib/types';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SceneCard from './SceneCard';

interface EditorStepProps {
  project: VideoProject;
  onUpdateScene: (scene: Scene) => void;
  onExport: () => void;
  onBackToProjects: () => void;
}

export default function EditorStep({ project, onUpdateScene, onExport, onBackToProjects }: EditorStepProps) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBackToProjects}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="font-headline text-3xl">Editing: {project.name}</CardTitle>
          <CardDescription>
            Your prompt has been transformed into {project.scenes.length} scenes. Review and edit each scene below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded-r-md">
            <strong>Original Prompt:</strong> {project.prompt}
          </p>
        </CardContent>
      </Card>
      
      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">Scene Editor</h2>
        <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={project.scenes.length > 0 ? `item-${project.scenes[0].id}`: undefined}>
          {project.scenes.map((scene, index) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              sceneNumber={index + 1}
              onUpdate={onUpdateScene}
            />
          ))}
        </Accordion>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button size="lg" onClick={onExport}>
          <FileJson className="mr-2 h-5 w-5" />
          Finalize & Export JSON
        </Button>
      </div>
    </div>
  );
}
