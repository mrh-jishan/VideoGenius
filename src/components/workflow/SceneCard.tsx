'use client';

import { GripVertical, Image as ImageIcon, Music, Type, Timer, Video, Image, Sparkles, Loader2, AlertTriangle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Scene } from '@/lib/types';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import NarrationPreview from './NarrationPreview';
import { Card, CardContent } from '@/components/ui/card';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MediaResult, UserConfig } from '@/lib/actions';
import { useReducer, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAudioSearch } from '@/hooks/use-audio-search';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// ─── Visual-search reducer ───────────────────────────────────────────────────
// Audio search is handled by useAudioSearch hook; only visual state lives here.

type VisualState = {
  activeTab: string;
  visual: {
    query: string;
    type: 'video' | 'image';
    results: MediaResult[];
    isLoading: boolean;
    error: string | null;
    showResults: boolean;
  };
};

type VisualAction =
  | { type: 'SET_TAB'; tab: string }
  | { type: 'SET_VISUAL_QUERY'; query: string }
  | { type: 'SET_VISUAL_TYPE'; mediaType: 'video' | 'image' }
  | { type: 'VISUAL_SEARCH_START' }
  | { type: 'VISUAL_SEARCH_SUCCESS'; results: MediaResult[] }
  | { type: 'VISUAL_SEARCH_ERROR'; error: string }
  | { type: 'TOGGLE_VISUAL_RESULTS' }
  | { type: 'HIDE_VISUAL_RESULTS' };

function visualReducer(state: VisualState, action: VisualAction): VisualState {
  switch (action.type) {
    case 'SET_TAB': {
      const base = { ...state, activeTab: action.tab };
      if (action.tab === 'transition')
        return { ...base, visual: { ...state.visual, type: 'image', showResults: true } };
      if (action.tab === 'narration')
        return { ...base, visual: { ...state.visual, type: 'video', showResults: true } };
      return base;
    }
    case 'SET_VISUAL_QUERY':
      return { ...state, visual: { ...state.visual, query: action.query } };
    case 'SET_VISUAL_TYPE':
      return { ...state, visual: { ...state.visual, type: action.mediaType } };
    case 'VISUAL_SEARCH_START':
      return { ...state, visual: { ...state.visual, isLoading: true, error: null } };
    case 'VISUAL_SEARCH_SUCCESS':
      return { ...state, visual: { ...state.visual, isLoading: false, results: action.results, showResults: true } };
    case 'VISUAL_SEARCH_ERROR':
      return { ...state, visual: { ...state.visual, isLoading: false, error: action.error } };
    case 'TOGGLE_VISUAL_RESULTS':
      return { ...state, visual: { ...state.visual, showResults: !state.visual.showResults } };
    case 'HIDE_VISUAL_RESULTS':
      return { ...state, visual: { ...state.visual, showResults: false } };
    default:
      return state;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface SceneCardProps {
  scene: Scene;
  sceneNumber: number;
  onUpdate: (scene: Scene) => void;
  userId: string;
  userConfig?: UserConfig;
  validationErrors?: string[];
  totalScenes: number;
  onNavigateToScene: (sceneNumber: number) => void;
}

export default function SceneCard({ scene, sceneNumber, onUpdate, userId, userConfig, validationErrors = [], totalScenes, onNavigateToScene }: SceneCardProps) {
  const { toast } = useToast();

  const [state, dispatch] = useReducer(visualReducer, {
    activeTab: 'content',
    visual: {
      query: scene.visualKeywords || scene.title,
      type: 'video',
      results: [],
      isLoading: false,
      error: null,
      showResults: true,
    },
  });

  const { activeTab, visual } = state;

  // Audio search is fully managed by the hook (state + progressive-fallback fetch)
  const audioSearch = useAudioSearch(
    scene.audioKeywords || scene.title || scene.narration,
    userConfig?.freesoundKey
  );

  const visualSearchTerm = useMemo(
    () => visual.query || scene.visualKeywords || scene.title,
    [visual.query, scene.visualKeywords, scene.title]
  );

  const handleFieldChange = (field: keyof Scene, value: string | number) => {
    onUpdate({ ...scene, [field]: value });
  };

  const handleSelectTransitionVisual = (media: MediaResult) => {
    onUpdate({ ...scene, selectedVisual: media, transitionVisual: media, asset: undefined });
    dispatch({ type: 'HIDE_VISUAL_RESULTS' });
  };

  const handleSelectNarrationVideo = (media: MediaResult) => {
    onUpdate({ ...scene, narrationVideo: media });
    dispatch({ type: 'HIDE_VISUAL_RESULTS' });
  };

  const handleSelectAudioMedia = (media: MediaResult) => {
    onUpdate({ ...scene, selectedAudio: media, bgAudio: media });
    audioSearch.hideResults();
  };

  const handleVisualSearch = async (overrideType?: 'video' | 'image') => {
    if (!userConfig?.pixabayKey) {
      dispatch({ type: 'VISUAL_SEARCH_ERROR', error: 'Pixabay API key missing. Save it in Settings.' });
      return;
    }

    const searchType = overrideType ?? visual.type;
    dispatch({ type: 'VISUAL_SEARCH_START' });
    try {
      const safeQuery = (visualSearchTerm || scene.title || '')
        .split(/[, ]+/)
        .filter(Boolean)
        .slice(0, 10)
        .join(' ')
        .slice(0, 120);
      const endpoint =
        searchType === 'video'
          ? `https://pixabay.com/api/videos/?key=${userConfig.pixabayKey}&q=${encodeURIComponent(safeQuery)}&per_page=8&safesearch=true`
          : `https://pixabay.com/api/?key=${userConfig.pixabayKey}&q=${encodeURIComponent(safeQuery)}&per_page=12&image_type=photo&safesearch=true`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch visuals.');
      const data = await res.json();
      const results: MediaResult[] = (data.hits || []).map((hit: any) => {
        if (searchType === 'video') {
          return {
            id: String(hit.id),
            type: 'video',
            title: hit.tags || 'Pixabay Video',
            url: hit.videos?.large?.url || hit.videos?.medium?.url || hit.videos?.small?.url || hit.videos?.tiny?.url,
            previewUrl: hit.videos?.large?.thumbnail || hit.videos?.medium?.thumbnail || hit.videos?.small?.thumbnail || hit.videos?.tiny?.thumbnail || hit.previewURL,
            tags: hit.tags ? String(hit.tags).split(',').map((t: string) => t.trim()) : [],
          };
        }
        return {
          id: String(hit.id),
          type: 'image',
          title: hit.tags || 'Pixabay Image',
          url: hit.imageURL || hit.fullHDURL || hit.largeImageURL || hit.webformatURL,
          previewUrl: hit.previewURL || hit.webformatURL,
          tags: hit.tags ? String(hit.tags).split(',').map((t: string) => t.trim()) : [],
        };
      });
      dispatch({ type: 'VISUAL_SEARCH_SUCCESS', results });
      if (!results.length) {
        toast({ title: 'No visuals found', description: 'Try adjusting keywords or prompt.', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      dispatch({ type: 'VISUAL_SEARCH_ERROR', error: error instanceof Error ? error.message : 'Failed to fetch visuals.' });
    }
  };

  // Auto-search when switching to a media tab; SET_TAB already sets visual.type
  useEffect(() => {
    if (activeTab === 'transition') {
      handleVisualSearch('image');
    } else if (activeTab === 'narration') {
      handleVisualSearch('video');
    } else if (activeTab === 'audio') {
      audioSearch.search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <AccordionItem value={`item-${scene.id}`} className="bg-card border rounded-lg shadow-sm">
      <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
        <div className="flex items-center gap-4 w-full">
          <GripVertical className="h-5 w-5 text-muted-foreground" aria-hidden="true"/>
          <div className="w-16 h-9 rounded-md bg-muted overflow-hidden shrink-0">
            {scene.asset && (
              <NextImage
                src={scene.asset.imageUrl}
                alt={scene.asset.description}
                width={64}
                height={36}
                className="object-cover w-full h-full"
              />
            )}
          </div>
          <span className="flex-1 text-left truncate">
            Scene {sceneNumber}: {scene.title}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal bg-muted px-2 py-1 rounded-md">
            <Timer className="h-3 w-3" />
            <span>{scene.duration}s</span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 pt-0">
        <div className="flex justify-end gap-2 mb-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={sceneNumber === 1} onClick={() => onNavigateToScene(sceneNumber - 1)} title="Previous scene">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={sceneNumber === totalScenes} onClick={() => onNavigateToScene(sceneNumber + 1)} title="Next scene">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm space-y-1">
              {validationErrors.map((msg, idx) => <div key={idx}>{msg}</div>)}
            </AlertDescription>
          </Alert>
        )}
        <Tabs value={activeTab} onValueChange={(tab) => dispatch({ type: 'SET_TAB', tab })}>
          <TabsList className="grid w-full grid-cols-4 gap-2">
            <TabsTrigger value="content"><Type className="mr-2 h-4 w-4" />Content</TabsTrigger>
            <TabsTrigger value="transition"><ImageIcon className="mr-2 h-4 w-4" />Transition</TabsTrigger>
            <TabsTrigger value="narration"><Video className="mr-2 h-4 w-4" />Narration</TabsTrigger>
            <TabsTrigger value="audio"><Music className="mr-2 h-4 w-4" />Audio</TabsTrigger>
          </TabsList>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <TabsContent value="content" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor={`title-${scene.id}`}>Scene Title</Label>
                    <Input id={`title-${scene.id}`} value={scene.title} onChange={(e) => handleFieldChange('title', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`duration-${scene.id}`}>Duration (seconds)</Label>
                    <Input id={`duration-${scene.id}`} type="number" value={scene.duration} onChange={(e) => handleFieldChange('duration', e.target.valueAsNumber)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`narration-${scene.id}`}>Narration</Label>
                  <Textarea id={`narration-${scene.id}`} value={scene.narration} onChange={(e) => handleFieldChange('narration', e.target.value)} className="min-h-24" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`subtitle-transition-${scene.id}`}>Subtitle Transition</Label>
                  <select
                    id={`subtitle-transition-${scene.id}`}
                    value={scene.subtitleTransition || 'fade'}
                    onChange={(e) => handleFieldChange('subtitleTransition', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="none">None</option>
                  </select>
                  <p className="text-xs text-muted-foreground">How subtitles appear in this scene.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Transition ──────────────────────────────────────────────── */}
          <TabsContent value="transition" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor={`transition-type-${scene.id}`}>Transition Type</Label>
                  <select
                    id={`transition-type-${scene.id}`}
                    value={scene.transitionType || 'fade'}
                    onChange={(e) => handleFieldChange('transitionType', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="zoom">Zoom</option>
                    <option value="wipe">Wipe</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Choose the transition effect when moving to this scene.</p>
                </div>

                <div className="grid gap-2">
                  <Label>Transition Visual</Label>
                  {scene.transitionVisual ? (
                    <div className="mt-1 space-y-2 rounded-md border p-3">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {scene.transitionVisual.type === 'video' ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                        Selected transition {scene.transitionVisual.type}
                      </div>
                      {scene.transitionVisual.type === 'image' ? (
                        <div className="aspect-video w-full max-h-[320px] overflow-hidden rounded-md bg-muted">
                          <img src={scene.transitionVisual.previewUrl || scene.transitionVisual.url} alt={scene.transitionVisual.title} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-video w-full max-h-[320px] overflow-hidden rounded-md bg-black">
                          <video src={scene.transitionVisual.url} poster={scene.transitionVisual.previewUrl} controls className="h-full w-full object-cover" preload="metadata" />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">{scene.transitionVisual.title}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Use search results to assign a transition visual.</p>
                  )}
                </div>

                <VisualSearchControls
                  sceneId={scene.id}
                  query={visual.query}
                  mediaType={visual.type}
                  isLoading={visual.isLoading}
                  onQueryChange={(q) => { dispatch({ type: 'SET_VISUAL_QUERY', query: q }); handleFieldChange('visualKeywords', q); }}
                  onTypeChange={(t) => dispatch({ type: 'SET_VISUAL_TYPE', mediaType: t })}
                  onSearch={() => handleVisualSearch()}
                  prefix="transition"
                />
                {visual.error && <SearchError message={visual.error} />}
                {visual.results.length > 0 && (
                  <VisualResultsGrid
                    results={visual.results}
                    show={visual.showResults}
                    onToggle={() => dispatch({ type: 'TOGGLE_VISUAL_RESULTS' })}
                    onSelect={handleSelectTransitionVisual}
                    actionLabel="Use for transition"
                    keyPrefix="tr"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Narration ───────────────────────────────────────────────── */}
          <TabsContent value="narration" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-2">
                  <Label>Narration Video</Label>
                  {scene.narrationVideo ? (
                    <div className="mt-1 space-y-2 rounded-md border p-3">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {scene.narrationVideo.type === 'video' ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                        Selected narration {scene.narrationVideo.type}
                      </div>
                      {scene.narrationVideo.type === 'image' ? (
                        <div className="aspect-video w-full max-h-[320px] overflow-hidden rounded-md bg-muted">
                          <img src={scene.narrationVideo.previewUrl || scene.narrationVideo.url} alt={scene.narrationVideo.title} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-video w-full max-h-[320px] overflow-hidden rounded-md bg-black">
                          <video src={scene.narrationVideo.url} poster={scene.narrationVideo.previewUrl} controls className="h-full w-full object-cover" preload="metadata" />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">{scene.narrationVideo.title}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Use search results to assign a narration video.</p>
                  )}
                </div>

                <VisualSearchControls
                  sceneId={scene.id}
                  query={visual.query}
                  mediaType={visual.type}
                  isLoading={visual.isLoading}
                  onQueryChange={(q) => { dispatch({ type: 'SET_VISUAL_QUERY', query: q }); handleFieldChange('visualKeywords', q); }}
                  onTypeChange={(t) => dispatch({ type: 'SET_VISUAL_TYPE', mediaType: t })}
                  onSearch={() => handleVisualSearch()}
                  prefix="narration"
                />
                {visual.error && <SearchError message={visual.error} />}
                {visual.results.length > 0 && (
                  <VisualResultsGrid
                    results={visual.results}
                    show={visual.showResults}
                    onToggle={() => dispatch({ type: 'TOGGLE_VISUAL_RESULTS' })}
                    onSelect={handleSelectNarrationVideo}
                    actionLabel="Use for narration"
                    keyPrefix="narr"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Audio ───────────────────────────────────────────────────── */}
          <TabsContent value="audio" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Search background audio</Label>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                    <Input
                      value={audioSearch.query}
                      onChange={(e) => {
                        audioSearch.setQuery(e.target.value);
                        handleFieldChange('audioKeywords', e.target.value);
                      }}
                      placeholder="e.g., piano, ambient, drums"
                      className="flex-1"
                    />
                    <Button onClick={() => audioSearch.search()} disabled={audioSearch.isLoading} className="whitespace-nowrap">
                      {audioSearch.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Search audio
                    </Button>
                  </div>
                  {audioSearch.error && <SearchError message={audioSearch.error} />}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Selected background audio</Label>
                  {scene.bgAudio ? (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-sm font-semibold">{scene.bgAudio.title}</div>
                      <audio controls className="w-full">
                        <source src={scene.bgAudio.url} type="audio/mpeg" />
                        {scene.bgAudio.previewUrl && <source src={scene.bgAudio.previewUrl} type="audio/ogg" />}
                      </audio>
                      {scene.bgAudio.tags && (
                        <div className="text-xs text-muted-foreground truncate">Tags: {scene.bgAudio.tags.join(', ')}</div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No background audio selected yet.</p>
                  )}
                </div>

                {audioSearch.results.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Search Results ({audioSearch.results.length})</Label>
                      <Button variant="ghost" size="sm" onClick={audioSearch.toggleResults}>
                        {audioSearch.showResults ? 'Hide' : 'Show'} Results
                      </Button>
                    </div>
                    {audioSearch.showResults && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {audioSearch.results.map(result => (
                          <Card key={`audio-${result.id}`}>
                            <CardContent className="p-3 space-y-2">
                              <div className="text-sm font-medium truncate">{result.title}</div>
                              {result.duration && <div className="text-xs text-muted-foreground">Duration: {Math.round(result.duration)}s</div>}
                              <audio controls className="w-full">
                                <source src={result.url} type="audio/mpeg" />
                                {result.previewUrl && <source src={result.previewUrl} type="audio/ogg" />}
                              </audio>
                              {result.tags && <div className="text-xs text-muted-foreground truncate">Tags: {result.tags.join(', ')}</div>}
                              <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" onClick={() => handleSelectAudioMedia(result)}>Select audio</Button>
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={result.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SearchError({ message }: { message: string }) {
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

function VisualSearchControls({ sceneId, query, mediaType, isLoading, onQueryChange, onTypeChange, onSearch, prefix }: {
  sceneId: string;
  query: string;
  mediaType: 'video' | 'image';
  isLoading: boolean;
  onQueryChange: (q: string) => void;
  onTypeChange: (t: 'video' | 'image') => void;
  onSearch: () => void;
  prefix: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>Search keywords</Label>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <div className="flex-1">
          <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Use scene keywords or customize" className="w-full" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Result</span>
          <RadioGroup value={mediaType} onValueChange={(v) => onTypeChange(v as 'video' | 'image')} className="flex gap-2">
            <Label htmlFor={`${prefix}-video-${sceneId}`} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/10">
              <RadioGroupItem id={`${prefix}-video-${sceneId}`} value="video" />
              <Video className="h-4 w-4" /> Video
            </Label>
            <Label htmlFor={`${prefix}-image-${sceneId}`} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/10">
              <RadioGroupItem id={`${prefix}-image-${sceneId}`} value="image" />
              <Image className="h-4 w-4" /> Image
            </Label>
          </RadioGroup>
        </div>
        <Button onClick={onSearch} disabled={isLoading} className="w-full lg:w-auto whitespace-nowrap">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Search {mediaType === 'video' ? 'videos' : 'images'}
        </Button>
      </div>
    </div>
  );
}

function VisualResultsGrid({ results, show, onToggle, onSelect, actionLabel, keyPrefix }: {
  results: MediaResult[];
  show: boolean;
  onToggle: () => void;
  onSelect: (media: MediaResult) => void;
  actionLabel: string;
  keyPrefix: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Search Results ({results.length})</Label>
        <Button variant="ghost" size="sm" onClick={onToggle}>{show ? 'Hide' : 'Show'} Results</Button>
      </div>
      {show && (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map(result => (
            <Card key={`${keyPrefix}-${result.type}-${result.id}`} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                {result.type === 'image' ? (
                  <img src={result.previewUrl || result.url} alt={result.title} className="w-full rounded-md object-cover max-h-48" />
                ) : (
                  <video src={result.url} poster={result.previewUrl} controls className="w-full rounded-md max-h-48" />
                )}
                <div className="text-sm font-medium truncate">{result.title}</div>
                {result.tags && <div className="text-xs text-muted-foreground truncate">Tags: {result.tags.join(', ')}</div>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onSelect(result)}>{actionLabel}</Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={result.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
