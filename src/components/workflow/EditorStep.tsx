'use client';

import { FileJson, ArrowLeft } from 'lucide-react';
import type { VideoProject, Scene } from '@/lib/types';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SceneCard from './SceneCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditorStepProps {
  project: VideoProject;
  onUpdateScene: (scene: Scene) => void;
  onExport: () => void;
  onBackToProjects: () => void;
  userId: string;
  userConfig?: {
    pixabayKey?: string;
    freesoundKey?: string;
    channelName?: string;
    socialLinks?: string;
  };
}

export default function EditorStep({ project, onUpdateScene, onExport, onBackToProjects, userId, userConfig }: EditorStepProps) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="font-headline text-3xl">{project.name}</CardTitle>
          <CardDescription>
            Your prompt has been transformed into {project.scenes.length} scenes. Review and edit each scene below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded-r-md">
            <strong>Original Prompt:</strong> {project.prompt}
          </p>
          {userConfig?.channelName || userConfig?.socialLinks ? (
            <p className="text-xs text-muted-foreground mt-2">
              CTA defaults: {userConfig?.channelName && `Channel: ${userConfig.channelName}`} {userConfig?.socialLinks && `• Social: ${userConfig.socialLinks}`}
            </p>
          ) : null}
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
              userId={userId}
              userConfig={userConfig}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-headline">Payload Preview</CardTitle>
          <CardDescription>JSON that will be sent to the backend.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[480px] rounded-md border bg-muted/40 overflow-auto">
            <pre className="whitespace-pre text-xs p-3 font-mono min-w-full overflow-auto">
{JSON.stringify(project, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
