'use client';

import { FileJson, Sparkles, Loader2, AlertTriangle, ExternalLink, Trash, Eye } from 'lucide-react';
import type { VideoProject, Scene } from '@/lib/types';
import type { UserConfig } from '@/lib/actions';
import type { MediaResult } from '@/lib/actions';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SceneCard from './SceneCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAudioSearch } from '@/hooks/use-audio-search';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card as ResultCard, CardContent as ResultCardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface EditorStepProps {
  project: VideoProject;
  onUpdateScene: (scene: Scene) => void;
  onUpdateProjectMeta: (payload: Partial<VideoProject>) => void;
  onExport: () => void;
  onDeleteProject?: () => void;
  isDeletingProject?: boolean;
  onBackToProjects: () => void;
  userId: string;
  userConfig?: UserConfig & {
    channelName?: string;
    socialLinks?: string;
    [key: string]: unknown;
  };
}

export default function EditorStep({ project, onUpdateScene, onUpdateProjectMeta, onExport, onDeleteProject, isDeletingProject, onBackToProjects, userId, userConfig }: EditorStepProps) {
  const { toast } = useToast();

  // Two independent audio search slots — each is just one hook call
  const globalAudio = useAudioSearch(project.globalAudioKeywords || '', userConfig?.freesoundKey);
  const transitionSound = useAudioSearch('whoosh', userConfig?.freesoundKey);

  const [activeSceneValue, setActiveSceneValue] = useState<string | undefined>(
    project.scenes.length > 0 ? `item-${project.scenes[0].id}` : undefined
  );

  const sceneIssues = useMemo(() => {
    return project.scenes.map((scene, idx) => {
      const messages: string[] = [];
      if (!scene.transitionVisual) messages.push('Add a transition image');
      if (!scene.narrationVideo) messages.push('Select a narration visual');
      if (!scene.bgAudio) messages.push('Pick background audio');
      return { id: scene.id, label: `Scene ${idx + 1}`, messages };
    });
  }, [project.scenes]);

  const allIssues = sceneIssues.flatMap(s => s.messages.length ? [`${s.label}: ${s.messages.join(', ')}`] : []);

  const handleNavigateToScene = (sceneNumber: number) => {
    if (sceneNumber < 1 || sceneNumber > project.scenes.length) return;
    const target = project.scenes[sceneNumber - 1];
    if (target) setActiveSceneValue(`item-${target.id}`);
  };

  const handleSelectGlobalAudio = (audio: MediaResult) => {
    onUpdateProjectMeta({ globalBgAudio: audio });
    toast({ title: 'Global background audio set', description: audio.title });
    globalAudio.hideResults();
  };

  const handleSelectTransitionSound = (audio: MediaResult) => {
    onUpdateProjectMeta({ transitionSound: audio });
    toast({ title: 'Transition sound set', description: audio.title });
    transitionSound.hideResults();
  };

  const handleExportClick = () => {
    if (allIssues.length) {
      const extra = allIssues.length > 3 ? ` • +${allIssues.length - 3} more` : '';
      toast({
        variant: 'destructive',
        title: 'Complete scenes before export',
        description: `${allIssues.slice(0, 3).join(' • ')}${extra}`,
      });
      return;
    }
    onExport();
  };

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
          {(userConfig?.channelName || userConfig?.socialLinks) && (
            <p className="text-xs text-muted-foreground mt-2">
              CTA defaults: {userConfig?.channelName && `Channel: ${userConfig.channelName}`}{userConfig?.socialLinks && ` • Social: ${userConfig.socialLinks}`}
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">Scene Editor</h2>
        <Accordion type="single" collapsible className="w-full space-y-4" value={activeSceneValue} onValueChange={setActiveSceneValue}>
          {project.scenes.map((scene, index) => {
            const validation = sceneIssues.find(s => s.id === scene.id);
            return (
              <SceneCard
                key={scene.id}
                scene={scene}
                sceneNumber={index + 1}
                onUpdate={onUpdateScene}
                userId={userId}
                userConfig={userConfig}
                validationErrors={validation?.messages || []}
                totalScenes={project.scenes.length}
                onNavigateToScene={handleNavigateToScene}
              />
            );
          })}
        </Accordion>
      </div>

      <div className="space-y-6 border-t pt-6">
        {/* ── Global Background Audio ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-headline">Global Background Audio</CardTitle>
            <CardDescription>Optional track that plays across the full video. Scene-specific background audio still applies per scene.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Search global background audio</Label>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                <Input
                  value={globalAudio.query}
                  onChange={(e) => {
                    globalAudio.setQuery(e.target.value);
                    onUpdateProjectMeta({ globalAudioKeywords: e.target.value });
                  }}
                  placeholder="e.g., piano, ambient, nature"
                  className="flex-1"
                />
                <Button onClick={() => globalAudio.search()} disabled={globalAudio.isLoading} className="whitespace-nowrap">
                  {globalAudio.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Search audio
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Use simple terms (e.g., "piano", "ambient", "drums") that sound libraries commonly have.</p>
              {globalAudio.error && <AudioSearchError message={globalAudio.error} />}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Selected global track</Label>
              {project.globalBgAudio ? (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-semibold">{project.globalBgAudio.title}</div>
                  <audio controls className="w-full">
                    <source src={project.globalBgAudio.url} type="audio/mpeg" />
                    {project.globalBgAudio.previewUrl && <source src={project.globalBgAudio.previewUrl} type="audio/ogg" />}
                  </audio>
                  {project.globalBgAudio.tags && (
                    <div className="text-xs text-muted-foreground truncate">Tags: {project.globalBgAudio.tags.join(', ')}</div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No global track selected.</p>
              )}
            </div>

            <AudioResultsGrid
              results={globalAudio.results}
              show={globalAudio.showResults}
              onToggle={globalAudio.toggleResults}
              onSelect={handleSelectGlobalAudio}
              actionLabel="Use as global track"
              keyPrefix="global-audio"
            />
          </CardContent>
        </Card>

        {/* ── Transition Sound ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-headline">Transition Sound Effect</CardTitle>
            <CardDescription>Optional sound effect that plays during scene transitions (e.g., whoosh, swipe).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Search transition sounds</Label>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                <Input
                  value={transitionSound.query}
                  onChange={(e) => transitionSound.setQuery(e.target.value)}
                  placeholder="e.g., whoosh, swipe, swoosh"
                  className="flex-1"
                />
                <Button onClick={() => transitionSound.search()} disabled={transitionSound.isLoading} className="whitespace-nowrap">
                  {transitionSound.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Search sounds
                </Button>
              </div>
              {transitionSound.error && <AudioSearchError message={transitionSound.error} />}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Selected transition sound</Label>
              {project.transitionSound ? (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-semibold">{project.transitionSound.title}</div>
                  <audio controls className="w-full">
                    <source src={project.transitionSound.url} type="audio/mpeg" />
                    {project.transitionSound.previewUrl && <source src={project.transitionSound.previewUrl} type="audio/ogg" />}
                  </audio>
                  {project.transitionSound.tags && (
                    <div className="text-xs text-muted-foreground truncate">Tags: {project.transitionSound.tags.join(', ')}</div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No transition sound selected.</p>
              )}
            </div>

            <AudioResultsGrid
              results={transitionSound.results}
              show={transitionSound.showResults}
              onToggle={transitionSound.toggleResults}
              onSelect={handleSelectTransitionSound}
              actionLabel="Use as transition sound"
              keyPrefix="transition-sound"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-headline">Actions</CardTitle>
            <CardDescription>Export or manage your project. Open payload preview if needed.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="mr-2 h-5 w-5" />
                  Payload Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Payload Preview</DialogTitle>
                  <DialogDescription>JSON that will be sent to the backend.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] rounded-md border bg-muted/40">
                  <pre className="whitespace-pre text-xs p-3 font-mono min-w-max">{JSON.stringify(project, null, 2)}</pre>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" onClick={onDeleteProject} disabled={!onDeleteProject || isDeletingProject}>
              <Trash className="mr-2 h-5 w-5" />
              Delete Project
            </Button>
            <Button onClick={handleExportClick} disabled={allIssues.length > 0}>
              <FileJson className="mr-2 h-5 w-5" />
              Export Project
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

// ─── Local sub-components ────────────────────────────────────────────────────

function AudioSearchError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {message}{' '}
        <Button variant="link" className="px-1" onClick={() => (window.location.href = '/profile')}>
          Go to Settings
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function AudioResultsGrid({ results, show, onToggle, onSelect, actionLabel, keyPrefix }: {
  results: MediaResult[];
  show: boolean;
  onToggle: () => void;
  onSelect: (r: MediaResult) => void;
  actionLabel: string;
  keyPrefix: string;
}) {
  if (!results.length) return null;
  return (
    <div className="border-t pt-4 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Search Results ({results.length})</Label>
        <Button variant="ghost" size="sm" onClick={onToggle}>{show ? 'Hide' : 'Show'} Results</Button>
      </div>
      {show && (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map(result => (
            <ResultCard key={`${keyPrefix}-${result.id}`}>
              <ResultCardContent className="p-3 space-y-2">
                <div className="text-sm font-medium truncate">{result.title}</div>
                {result.tags && result.tags.length > 0 && (
                  <div className="text-xs text-muted-foreground truncate">Tags: {result.tags.join(', ')}</div>
                )}
                {result.duration && (
                  <div className="text-xs text-muted-foreground">Duration: {Math.round(result.duration)}s</div>
                )}
                <audio controls className="w-full">
                  <source src={result.url} type="audio/mpeg" />
                  {result.previewUrl && <source src={result.previewUrl} type="audio/ogg" />}
                </audio>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onSelect(result)}>{actionLabel}</Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={result.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                </div>
              </ResultCardContent>
            </ResultCard>
          ))}
        </div>
      )}
    </div>
  );
}
