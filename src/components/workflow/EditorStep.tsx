'use client';

import {
  FileJson, Sparkles, Loader2, AlertTriangle, ExternalLink, Trash, Eye,
  Image as ImageIcon, Video, Music, Library,
} from 'lucide-react';
import Link from 'next/link';
import type { VideoProject, Scene } from '@/lib/types';
import type { UserConfig, MediaResult } from '@/lib/actions';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SceneCard from './SceneCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAudioSearch } from '@/hooks/use-audio-search';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveResults = {
  type: 'transition-assets' | 'visual' | 'audio';
  results?: MediaResult[];
  sceneId: string;
  sceneLabel: string;
} | null;

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

  const [activeResults, setActiveResults] = useState<ActiveResults>(
    project.scenes.length > 0
      ? {
          type: 'transition-assets',
          sceneId: project.scenes[0].id,
          sceneLabel: 'Scene 1',
        }
      : null
  );
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia>(null);

  const activePanelScene = activeResults
    ? project.scenes.find(s => s.id === activeResults.sceneId)
    : null;

  const transitionLibraryResults = useMemo(() => {
    if (!activePanelScene) return PlaceHolderImages;
    const terms = [
      activePanelScene.title,
      activePanelScene.visualKeywords,
      activePanelScene.narration,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);

    if (!terms.length) return PlaceHolderImages;

    return [...PlaceHolderImages].sort((a, b) => {
      const score = (asset: ImagePlaceholder) => {
        const haystack = `${asset.description} ${asset.imageHint}`.toLowerCase();
        return terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      };
      return score(b) - score(a);
    });
  }, [activePanelScene]);

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

  useEffect(() => {
    if (!activeSceneValue) return;
    const sceneId = activeSceneValue.replace('item-', '');
    const sceneIndex = project.scenes.findIndex(scene => scene.id === sceneId);
    if (sceneIndex === -1) return;

    setActiveResults(current => ({
      type: current?.type ?? 'transition-assets',
      results: current?.type === 'transition-assets' ? undefined : current?.results,
      sceneId,
      sceneLabel: `Scene ${sceneIndex + 1}`,
    }));
  }, [activeSceneValue, project.scenes]);

  // Panel selection handlers — always read from project.scenes so they never go stale
  const handlePanelSelectTransition = useCallback((media: MediaResult) => {
    const scene = project.scenes.find(s => s.id === activeResults?.sceneId);
    if (!scene) return;
    onUpdateScene({ ...scene, selectedVisual: media, transitionVisual: media, asset: undefined });
  }, [project.scenes, activeResults?.sceneId, onUpdateScene]);

  const handlePanelSelectNarration = useCallback((media: MediaResult) => {
    const scene = project.scenes.find(s => s.id === activeResults?.sceneId);
    if (!scene) return;
    onUpdateScene({ ...scene, narrationVideo: media });
  }, [project.scenes, activeResults?.sceneId, onUpdateScene]);

  const handlePanelSelectAudio = useCallback((media: MediaResult) => {
    const scene = project.scenes.find(s => s.id === activeResults?.sceneId);
    if (!scene) return;
    onUpdateScene({ ...scene, selectedAudio: media, bgAudio: media });
  }, [project.scenes, activeResults?.sceneId, onUpdateScene]);

  const handlePanelSelectTransitionAsset = useCallback((asset: ImagePlaceholder) => {
    const scene = project.scenes.find(s => s.id === activeResults?.sceneId);
    if (!scene) return;
    const media: MediaResult = {
      id: asset.id,
      type: 'image',
      title: asset.description,
      url: asset.imageUrl,
      previewUrl: asset.imageUrl,
    };
    onUpdateScene({ ...scene, asset, selectedVisual: media, transitionVisual: media });
  }, [project.scenes, activeResults?.sceneId, onUpdateScene]);

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
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
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

      {/* ── Scene Editor with sticky results panel ─────────────────── */}
      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">Scene Editor</h2>
        <div className="flex gap-6 items-start">
          {/* Left: accordion */}
          <div className="flex-1 min-w-0">
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
                    onOpenTransitionLibrary={() =>
                      setActiveResults({ type: 'transition-assets', sceneId: scene.id, sceneLabel: `Scene ${index + 1}` })
                    }
                    onPushResults={(type, results) =>
                      setActiveResults({ type, results, sceneId: scene.id, sceneLabel: `Scene ${index + 1}` })
                    }
                  />
                );
              })}
            </Accordion>
          </div>

          {/* Right: sticky results panel */}
          {activeResults && activePanelScene && (
            <div className={`${activeResults.type === 'visual' ? 'w-96' : 'w-64'} shrink-0 sticky top-4 self-start`}>
              <Card className="overflow-hidden shadow-md">
                <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {activeResults.type === 'visual'
                      ? <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : activeResults.type === 'transition-assets'
                        ? <Library className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <Music className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{activeResults.sceneLabel}</p>
                      <p className="text-sm font-semibold truncate">
                        {activeResults.type === 'transition-assets'
                          ? 'Transition Library'
                          : activeResults.type === 'visual'
                            ? 'Visual Results'
                            : 'Audio Results'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {activeResults.type === 'transition-assets'
                        ? transitionLibraryResults.length
                        : activeResults.results?.length ?? 0}
                    </Badge>
                  </div>
                </CardHeader>
                <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                  <div className="p-3 space-y-3">
                    {activeResults.type === 'transition-assets' && activePanelScene && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Ranked from the built-in transition library using this scene&apos;s title, narration, and visual keywords.
                        </p>
                        {transitionLibraryResults.map(asset => {
                          const selected = activePanelScene.asset?.id === asset.id || activePanelScene.transitionVisual?.id === asset.id;
                          return (
                            <div key={`panel-t-${asset.id}`} className={`rounded-lg border p-2 ${selected ? 'ring-2 ring-primary' : ''}`}>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="shrink-0"
                                  onClick={() => openPreview({
                                    type: 'image',
                                    title: asset.description,
                                    url: asset.imageUrl,
                                    previewUrl: asset.imageUrl,
                                  })}
                                >
                                  <img src={asset.imageUrl} alt={asset.description} className="h-16 w-24 rounded object-cover" />
                                </button>
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="text-xs text-muted-foreground line-clamp-3">{asset.description}</div>
                                  <Button
                                    size="sm"
                                    variant={selected ? 'default' : 'secondary'}
                                    className="w-full text-xs h-7"
                                    onClick={() => handlePanelSelectTransitionAsset(asset)}
                                  >
                                    {selected ? '✓ Selected' : 'Use transition'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {activeResults.type === 'visual' && activeResults.results?.map(result => (
                      <div key={`panel-v-${result.id}`} className={`rounded-lg border p-2.5 transition-shadow${result.id === activePanelScene.transitionVisual?.id || result.id === activePanelScene.narrationVideo?.id ? ' ring-2 ring-primary' : ''}`}>
                        <div className="flex gap-2">
                          <div className="h-24 w-36 rounded overflow-hidden bg-muted shrink-0">
                            {result.type === 'image' ? (
                              <img src={result.previewUrl || result.url} alt={result.title} className="h-full w-full object-cover" />
                            ) : (
                              <video src={result.url} poster={result.previewUrl} className="h-full w-full object-cover" preload="metadata" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="text-sm text-muted-foreground line-clamp-3">{result.title}</div>
                            <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={result.id === activePanelScene.transitionVisual?.id ? 'default' : 'secondary'}
                                  className="flex-1 text-xs h-8 px-2"
                                  onClick={() => handlePanelSelectTransition(result)}
                                >
                                  {result.id === activePanelScene.transitionVisual?.id ? '✓ Trans' : 'Trans'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={result.id === activePanelScene.narrationVideo?.id ? 'default' : 'outline'}
                                  className="flex-1 text-xs h-8 px-2"
                                  onClick={() => handlePanelSelectNarration(result)}
                                >
                                  {result.id === activePanelScene.narrationVideo?.id ? '✓ Narr' : 'Narr'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => openPreview({
                                    type: result.type,
                                    title: result.title,
                                    url: result.url,
                                    previewUrl: result.previewUrl,
                                  })}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                        </div>
                      </div>
                    ))}

                    {activeResults.type === 'audio' && activeResults.results?.map(result => (
                      <div key={`panel-a-${result.id}`} className={`rounded-md border p-3 space-y-2${result.id === activePanelScene.bgAudio?.id ? ' ring-2 ring-primary' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium truncate">{result.title}</span>
                          {result.duration && <span className="text-xs text-muted-foreground shrink-0">{Math.round(result.duration)}s</span>}
                        </div>
                        <audio controls className="w-full">
                          <source src={result.url} type="audio/mpeg" />
                          {result.previewUrl && <source src={result.previewUrl} type="audio/ogg" />}
                        </audio>
                        <div className="flex gap-1.5">
                          <Button variant={result.id === activePanelScene.bgAudio?.id ? 'default' : 'secondary'} size="sm" onClick={() => handlePanelSelectAudio(result)} className="flex-1 text-xs">
                            {result.id === activePanelScene.bgAudio?.id ? '✓ Selected' : 'Use audio'}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                            <a href={result.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </Button>
                        </div>
                      </div>
                    ))}

                    {activeResults.type !== 'transition-assets' && (!activeResults.results || activeResults.results.length === 0) && (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Run a search in the open scene to load {activeResults.type === 'visual' ? 'image/video' : 'audio'} results here.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
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
          <CardContent>
            <div className={globalAudio.results.length > 0 ? 'flex flex-row gap-4 items-start' : 'space-y-4'}>
              <div className={`space-y-4${globalAudio.results.length > 0 ? ' w-[44%] shrink-0 min-w-0' : ''}`}>
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
              </div>

              {globalAudio.results.length > 0 && (
                <div className="flex flex-col gap-2 flex-1 min-w-0 border-l pl-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results ({globalAudio.results.length})</span>
                    <Button variant="ghost" size="sm" onClick={globalAudio.toggleResults}>{globalAudio.showResults ? 'Hide' : 'Show'}</Button>
                  </div>
                  {globalAudio.showResults && (
                    <div className="overflow-y-auto max-h-96 space-y-3 pr-1">
                      {globalAudio.results.map(result => (
                        <div key={`global-${result.id}`} className="rounded-md border p-3 space-y-2">
                          <div className="text-sm font-medium truncate">{result.title}</div>
                          {result.tags && result.tags.length > 0 && <div className="text-xs text-muted-foreground truncate">Tags: {result.tags.join(', ')}</div>}
                          {result.duration && <div className="text-xs text-muted-foreground">Duration: {Math.round(result.duration)}s</div>}
                          <audio controls className="w-full">
                            <source src={result.url} type="audio/mpeg" />
                            {result.previewUrl && <source src={result.previewUrl} type="audio/ogg" />}
                          </audio>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleSelectGlobalAudio(result)}>Use as global track</Button>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={result.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
          <CardContent>
            <div className={transitionSound.results.length > 0 ? 'flex flex-row gap-4 items-start' : 'space-y-4'}>
              <div className={`space-y-4${transitionSound.results.length > 0 ? ' w-[44%] shrink-0 min-w-0' : ''}`}>
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
              </div>

              {transitionSound.results.length > 0 && (
                <div className="flex flex-col gap-2 flex-1 min-w-0 border-l pl-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results ({transitionSound.results.length})</span>
                    <Button variant="ghost" size="sm" onClick={transitionSound.toggleResults}>{transitionSound.showResults ? 'Hide' : 'Show'}</Button>
                  </div>
                  {transitionSound.showResults && (
                    <div className="overflow-y-auto max-h-96 space-y-3 pr-1">
                      {transitionSound.results.map(result => (
                        <div key={`ts-${result.id}`} className="rounded-md border p-3 space-y-2">
                          <div className="text-sm font-medium truncate">{result.title}</div>
                          {result.tags && result.tags.length > 0 && <div className="text-xs text-muted-foreground truncate">Tags: {result.tags.join(', ')}</div>}
                          {result.duration && <div className="text-xs text-muted-foreground">Duration: {Math.round(result.duration)}s</div>}
                          <audio controls className="w-full">
                            <source src={result.url} type="audio/mpeg" />
                            {result.previewUrl && <source src={result.previewUrl} type="audio/ogg" />}
                          </audio>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleSelectTransitionSound(result)}>Use as transition sound</Button>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={result.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
