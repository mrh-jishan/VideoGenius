'use client';

import {
  FileJson, Sparkles, Loader2, AlertTriangle, ExternalLink, Trash, Eye,
  Image as ImageIcon, Video, Music,
} from 'lucide-react';
import Link from 'next/link';
import type { VideoProject, Scene } from '@/lib/types';
import type { UserConfig, MediaResult } from '@/lib/actions';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SceneCard, { type SceneCardHandle } from './SceneCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAudioSearch } from '@/hooks/use-audio-search';
import { useMemo, useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────

type ScenePanelState = {
  transitionResults: MediaResult[];
  narrationResults: MediaResult[];
  audioResults: MediaResult[];
};

type PreviewMedia = {
  type: 'image' | 'video';
  title: string;
  url: string;
  previewUrl?: string;
} | null;

// ─── Props ───────────────────────────────────────────────────────────────────

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

  const globalAudio = useAudioSearch(project.globalAudioKeywords || '', userConfig?.freesoundKey);
  const transitionSound = useAudioSearch('whoosh', userConfig?.freesoundKey);

  const [activeSceneValue, setActiveSceneValue] = useState<string | undefined>(
    project.scenes.length > 0 ? `item-${project.scenes[0].id}` : undefined
  );
  const [scenePanels, setScenePanels] = useState<Record<string, ScenePanelState>>({});
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia>(null);
  const sceneCardRefs = useRef<Record<string, SceneCardHandle | null>>({});
  const initialSceneSearchTriggeredRef = useRef(false);

  const activeSceneId = activeSceneValue?.replace('item-', '');
  const activePanelScene = activeSceneId
    ? project.scenes.find(s => s.id === activeSceneId)
    : null;
  const activeSceneIndex = activeSceneId
    ? project.scenes.findIndex(s => s.id === activeSceneId)
    : -1;
  const activeSceneLabel = activeSceneIndex >= 0 ? `Scene ${activeSceneIndex + 1}` : 'Scene';
  const activeScenePanel = activeSceneId
    ? (scenePanels[activeSceneId] ?? { transitionResults: [], narrationResults: [], audioResults: [] })
    : { transitionResults: [], narrationResults: [], audioResults: [] };

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

  const handleAccordionValueChange = useCallback((value: string) => {
    setActiveSceneValue(value);
    const sceneId = value.replace('item-', '');
    sceneCardRefs.current[sceneId]?.runSearch();
  }, []);

  // Panel selection handlers — always read from project.scenes so they never go stale
  const handlePanelSelectTransition = useCallback((media: MediaResult) => {
    const scene = project.scenes.find(s => s.id === activeSceneId);
    if (!scene) return;
    onUpdateScene({ ...scene, selectedVisual: media, transitionVisual: media, asset: undefined });
  }, [project.scenes, activeSceneId, onUpdateScene]);

  const handlePanelSelectNarration = useCallback((media: MediaResult) => {
    const scene = project.scenes.find(s => s.id === activeSceneId);
    if (!scene) return;
    onUpdateScene({ ...scene, narrationVideo: media });
  }, [project.scenes, activeSceneId, onUpdateScene]);

  const handlePanelSelectAudio = useCallback((media: MediaResult) => {
    const scene = project.scenes.find(s => s.id === activeSceneId);
    if (!scene) return;
    onUpdateScene({ ...scene, selectedAudio: media, bgAudio: media });
  }, [project.scenes, activeSceneId, onUpdateScene]);

  const storeSceneResults = useCallback((sceneId: string, type: 'transition' | 'narration' | 'audio', results: MediaResult[]) => {
    setScenePanels(current => ({
      ...current,
      [sceneId]: {
        transitionResults: type === 'transition' ? results : (current[sceneId]?.transitionResults ?? []),
        narrationResults: type === 'narration' ? results : (current[sceneId]?.narrationResults ?? []),
        audioResults: type === 'audio' ? results : (current[sceneId]?.audioResults ?? []),
      },
    }));
  }, []);

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

  const openPreview = useCallback((media: PreviewMedia) => {
    setPreviewMedia(media);
  }, []);

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
    <div className="mx-auto w-full max-w-[110rem] space-y-4 px-0.5 py-1">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 px-4 py-4 sm:px-5 sm:py-4">
          <CardTitle className="font-headline text-3xl">{project.name}</CardTitle>
          <CardDescription>
            Your prompt has been transformed into {project.scenes.length} scenes. Review and edit each scene below.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-4 sm:px-5 sm:py-4">
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

      {/* ── Scene Editor with sticky results panel ─────────────────── */}
      <div>
        <h2 className="text-2xl font-bold mb-3 font-headline">Scene Editor</h2>
        <div className="flex gap-6 items-start overflow-x-hidden">
          {/* Left: accordion */}
          <div className="min-w-0 flex-[0_1_40%]">
            <Accordion type="single" collapsible className="w-full space-y-4" value={activeSceneValue} onValueChange={handleAccordionValueChange}>
              {project.scenes.map((scene, index) => {
                const validation = sceneIssues.find(s => s.id === scene.id);
                return (
                  <SceneCard
                    key={scene.id}
                    ref={(instance) => {
                      sceneCardRefs.current[scene.id] = instance;
                      if (
                        instance &&
                        !initialSceneSearchTriggeredRef.current &&
                        activeSceneValue === `item-${scene.id}`
                      ) {
                        initialSceneSearchTriggeredRef.current = true;
                        instance.runSearch();
                      }
                    }}
                    scene={scene}
                    sceneNumber={index + 1}
                    onUpdate={onUpdateScene}
                    userId={userId}
                    userConfig={userConfig}
                    validationErrors={validation?.messages || []}
                    totalScenes={project.scenes.length}
                    onNavigateToScene={handleNavigateToScene}
                    onPushResults={(type, results) => storeSceneResults(scene.id, type, results)}
                  />
                );
              })}
            </Accordion>
          </div>

          {/* Right: sticky media + audio panels */}
          {activePanelScene && (
            <div className="min-w-0 flex-[1_1_0%] sticky top-4 self-start">
              <div className="grid min-w-0 grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
              <Card className="overflow-hidden shadow-md">
                <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{activeSceneLabel}</p>
                      <p className="text-sm font-semibold truncate">Media</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activeScenePanel.transitionResults.length + activeScenePanel.narrationResults.length}
                  </Badge>
                </CardHeader>
                <div className="p-3 grid grid-cols-2 gap-3 items-start">
                  <div className="space-y-2 min-w-0 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transition Image</div>
                        <Badge variant="outline" className="text-[10px]">{activeScenePanel.transitionResults.length}</Badge>
                      </div>
                      {activeScenePanel.transitionResults.map(result => {
                        const selected = result.id === activePanelScene.transitionVisual?.id;
                        return (
                          <div
                            key={`panel-transition-${result.id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => handlePanelSelectTransition(result)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handlePanelSelectTransition(result);
                              }
                            }}
                            className={`group relative block w-full overflow-hidden rounded-lg border bg-muted text-left transition-all cursor-pointer ${selected ? 'ring-2 ring-primary border-primary shadow-md' : 'hover:border-primary/50 hover:shadow-sm'}`}
                          >
                            <div className="relative aspect-video w-full">
                              <img src={result.previewUrl || result.url} alt={result.title} className="h-full w-full object-cover" />
                              <div className={`absolute inset-0 transition-colors ${selected ? 'bg-primary/20' : 'bg-black/0 group-hover:bg-black/10'}`} />
                              <button
                                type="button"
                                className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPreview({
                                    type: 'image',
                                    title: result.title,
                                    url: result.url,
                                    previewUrl: result.previewUrl,
                                  });
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-2 left-2">
                                <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${selected ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'}`}>
                                  {selected ? 'Selected for transition' : 'Select for transition'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {activeScenePanel.transitionResults.length === 0 && (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          Run a search in the open scene to load transition image results here.
                        </div>
                      )}
                  </div>

                  <div className="space-y-2 min-w-0 max-h-[calc(100vh-220px)] overflow-y-auto pl-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Narration Visual</div>
                        <Badge variant="outline" className="text-[10px]">{activeScenePanel.narrationResults.length}</Badge>
                      </div>

                      {activeScenePanel.narrationResults.map(result => {
                        const selected = result.id === activePanelScene.narrationVideo?.id;
                        return (
                          <div
                            key={`panel-narration-${result.id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => handlePanelSelectNarration(result)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handlePanelSelectNarration(result);
                              }
                            }}
                            className={`group relative block w-full overflow-hidden rounded-lg border bg-muted text-left transition-all cursor-pointer ${selected ? 'ring-2 ring-primary border-primary shadow-md' : 'hover:border-primary/50 hover:shadow-sm'}`}
                          >
                            <div className="relative aspect-video w-full">
                              {result.type === 'image' ? (
                                <img src={result.previewUrl || result.url} alt={result.title} className="h-full w-full object-cover" />
                              ) : (
                                <video src={result.url} poster={result.previewUrl} className="h-full w-full object-cover" preload="metadata" />
                              )}
                              <div className={`absolute inset-0 transition-colors ${selected ? 'bg-primary/20' : 'bg-black/0 group-hover:bg-black/10'}`} />
                              <button
                                type="button"
                                className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPreview({
                                    type: result.type === 'video' ? 'video' : 'image',
                                    title: result.title,
                                    url: result.url,
                                    previewUrl: result.previewUrl,
                                  });
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-2 left-2">
                                <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${selected ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'}`}>
                                  {selected ? 'Selected for narration' : 'Select for narration'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {activeScenePanel.narrationResults.length === 0 && (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          Run a search in the open scene to load narration image/video results here.
                        </div>
                      )}
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden shadow-md">
                <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{activeSceneLabel}</p>
                      <p className="text-sm font-semibold truncate">Audio</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activeScenePanel.audioResults.length}
                  </Badge>
                </CardHeader>
                <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
                    <div className="p-3 space-y-3">
                    {activeScenePanel.audioResults.map(result => {
                      const selected = result.id === activePanelScene.bgAudio?.id;
                      return (
                        <div
                          key={`panel-a-${result.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handlePanelSelectAudio(result)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handlePanelSelectAudio(result);
                            }
                          }}
                          className={`group rounded-md border p-3 space-y-2 cursor-pointer transition-all ${selected ? 'ring-2 ring-primary border-primary shadow-md' : 'hover:border-primary/50 hover:shadow-sm'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium truncate">{result.title}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {result.duration && <span className="text-xs text-muted-foreground">{Math.round(result.duration)}s</span>}
                              <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-background'}`}>
                                {selected ? 'Selected' : 'Select'}
                              </span>
                            </div>
                          </div>
                          <audio controls className="w-full" onClick={(e) => e.stopPropagation()}>
                            <source src={result.url} type="audio/mpeg" />
                            {result.previewUrl && <source src={result.previewUrl} type="audio/ogg" />}
                          </audio>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                              <a href={result.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-3.5 w-3.5" /></a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {activeScenePanel.audioResults.length === 0 && (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Run an audio search in the open scene to load sound results here.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Global Audio & Transition Sound ────────────────────────── */}
      <div className="space-y-6 border-t pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-headline">Global Background Audio</CardTitle>
            <CardDescription>Optional track that plays across the full video. Scene-specific background audio still applies per scene.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-hidden">
            <div className={globalAudio.results.length > 0 ? 'grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4 items-start' : 'space-y-4'}>
              <div className="space-y-4 min-w-0">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Search global background audio</Label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={globalAudio.query}
                      onChange={(e) => {
                        globalAudio.setQuery(e.target.value);
                        onUpdateProjectMeta({ globalAudioKeywords: e.target.value });
                      }}
                      placeholder="e.g., piano, ambient, nature"
                      className="flex-1 min-w-[160px]"
                    />
                    <Button onClick={() => globalAudio.search()} disabled={globalAudio.isLoading}>
                      {globalAudio.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Search audio
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Use simple terms (e.g., "piano", "ambient", "drums") that sound libraries commonly have.</p>
                  {globalAudio.error && <AudioSearchError message={globalAudio.error} />}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Selected global track</Label>
                  <SelectedAudioSummary media={project.globalBgAudio} emptyText="No global track selected." />
                </div>
              </div>

              {globalAudio.results.length > 0 && (
                <div className="flex min-w-0 flex-col gap-2 border-l pl-4 overflow-x-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results ({globalAudio.results.length})</span>
                  </div>
                  <div className="max-h-96 space-y-3 overflow-x-hidden overflow-y-auto pr-1">
                    {globalAudio.results.map(result => (
                      <SelectableAudioCard
                        key={`global-${result.id}`}
                        result={result}
                        selected={result.id === project.globalBgAudio?.id}
                        selectedLabel="Selected"
                        idleLabel="Select"
                        onSelect={() => handleSelectGlobalAudio(result)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-headline">Transition Sound Effect</CardTitle>
            <CardDescription>Optional sound effect that plays during scene transitions (e.g., whoosh, swipe).</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-hidden">
            <div className={transitionSound.results.length > 0 ? 'grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4 items-start' : 'space-y-4'}>
              <div className="space-y-4 min-w-0">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Search transition sounds</Label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={transitionSound.query}
                      onChange={(e) => transitionSound.setQuery(e.target.value)}
                      placeholder="e.g., whoosh, swipe, swoosh"
                      className="flex-1 min-w-[160px]"
                    />
                    <Button onClick={() => transitionSound.search()} disabled={transitionSound.isLoading}>
                      {transitionSound.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Search sounds
                    </Button>
                  </div>
                  {transitionSound.error && <AudioSearchError message={transitionSound.error} />}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Selected transition sound</Label>
                  <SelectedAudioSummary media={project.transitionSound} emptyText="No transition sound selected." />
                </div>
              </div>

              {transitionSound.results.length > 0 && (
                <div className="flex min-w-0 flex-col gap-2 border-l pl-4 overflow-x-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results ({transitionSound.results.length})</span>
                  </div>
                  <div className="max-h-96 space-y-3 overflow-x-hidden overflow-y-auto pr-1">
                    {transitionSound.results.map(result => (
                      <SelectableAudioCard
                        key={`ts-${result.id}`}
                        result={result}
                        selected={result.id === project.transitionSound?.id}
                        selectedLabel="Selected"
                        idleLabel="Select"
                        onSelect={() => handleSelectTransitionSound(result)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Actions ───────────────────────────────────────────────── */}
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

      <Dialog open={!!previewMedia} onOpenChange={(open) => !open && setPreviewMedia(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewMedia?.title || 'Preview'}</DialogTitle>
            <DialogDescription>
              Preview the selected {previewMedia?.type === 'video' ? 'video' : 'image'} without leaving the editor.
            </DialogDescription>
          </DialogHeader>
          {previewMedia && (
            <div className="overflow-hidden rounded-md border bg-black/5">
              {previewMedia.type === 'image' ? (
                <img
                  src={previewMedia.previewUrl || previewMedia.url}
                  alt={previewMedia.title}
                  className="max-h-[75vh] w-full object-contain"
                />
              ) : (
                <video
                  src={previewMedia.url}
                  poster={previewMedia.previewUrl}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-full bg-black object-contain"
                  preload="metadata"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Local sub-components ────────────────────────────────────────────────────

function SelectedAudioSummary({ media, emptyText }: { media?: MediaResult; emptyText: string }) {
  if (!media) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold truncate">{media.title}</div>
        <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">Selected</span>
      </div>
      <audio controls className="w-full">
        <source src={media.url} type="audio/mpeg" />
        {media.previewUrl && <source src={media.previewUrl} type="audio/ogg" />}
      </audio>
      {media.tags && media.tags.length > 0 && (
        <div className="text-xs text-muted-foreground truncate">Tags: {media.tags.join(', ')}</div>
      )}
    </div>
  );
}

function SelectableAudioCard({
  result,
  selected,
  selectedLabel,
  idleLabel,
  onSelect,
}: {
  result: MediaResult;
  selected: boolean;
  selectedLabel: string;
  idleLabel: string;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group min-w-0 overflow-hidden rounded-md border p-3 space-y-2 cursor-pointer transition-all ${selected ? 'ring-2 ring-primary border-primary shadow-md' : 'hover:border-primary/50 hover:shadow-sm'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium truncate">{result.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          {result.duration && <span className="text-xs text-muted-foreground">{Math.round(result.duration)}s</span>}
          <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-background'}`}>
            {selected ? selectedLabel : idleLabel}
          </span>
        </div>
      </div>
      <audio controls className="block w-full max-w-full" onClick={(e) => e.stopPropagation()}>
        <source src={result.url} type="audio/mpeg" />
        {result.previewUrl && <source src={result.previewUrl} type="audio/ogg" />}
      </audio>
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
          <a href={result.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function AudioSearchError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {message}{' '}
        <Button variant="link" className="px-1" asChild>
          <Link href="/profile">Go to Settings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
