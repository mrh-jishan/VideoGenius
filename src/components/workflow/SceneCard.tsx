'use client';

import {
  GripVertical, Image as ImageIcon, Music, Type, Timer, Video, Image,
  Sparkles, Loader2, AlertTriangle, ChevronLeft, ChevronRight, PanelRightOpen,
} from 'lucide-react';
import Link from 'next/link';
import type { Scene } from '@/lib/types';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MediaResult, UserConfig } from '@/lib/actions';
import { useReducer, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAudioSearch } from '@/hooks/use-audio-search';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// ─── Reducer ────────────────────────────────────────────────────────────────

type VisualState = {
  query: string;
  type: 'video' | 'image';
  isLoading: boolean;
  error: string | null;
};

type VisualAction =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_TYPE'; mediaType: 'video' | 'image' }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_DONE' }
  | { type: 'SEARCH_ERROR'; error: string };

function visualReducer(state: VisualState, action: VisualAction): VisualState {
  switch (action.type) {
    case 'SET_QUERY':    return { ...state, query: action.query };
    case 'SET_TYPE':     return { ...state, type: action.mediaType };
    case 'SEARCH_START': return { ...state, isLoading: true, error: null };
    case 'SEARCH_DONE':  return { ...state, isLoading: false };
    case 'SEARCH_ERROR': return { ...state, isLoading: false, error: action.error };
    default: return state;
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
  onOpenTransitionLibrary: () => void;
  onPushResults: (type: 'visual' | 'audio', results: MediaResult[]) => void;
}

export default function SceneCard({
  scene, sceneNumber, onUpdate, userId, userConfig,
  validationErrors = [], totalScenes, onNavigateToScene, onOpenTransitionLibrary, onPushResults,
}: SceneCardProps) {
  const { toast } = useToast();

  const [visual, dispatch] = useReducer(visualReducer, {
    query: scene.visualKeywords || scene.title,
    type: 'image',
    isLoading: false,
    error: null,
  });

  const audioSearch = useAudioSearch(
    scene.audioKeywords || scene.title || scene.narration,
    userConfig?.freesoundKey
  );

  const visualSearchTerm = useMemo(
    () => visual.query || scene.visualKeywords || scene.title,
    [visual.query, scene.visualKeywords, scene.title]
  );

  // Auto-select first audio result when it arrives and the slot is empty,
  // and push results to the side panel
  const firstAudioId = audioSearch.results[0]?.id;
  useEffect(() => {
    const first = audioSearch.results[0];
    if (!first) return;
    if (!scene.bgAudio) {
      onUpdate({ ...scene, selectedAudio: first, bgAudio: first });
    }
    onPushResults('audio', audioSearch.results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstAudioId]);

  const handleFieldChange = (field: keyof Scene, value: string | number) => {
    onUpdate({ ...scene, [field]: value });
  };

  const handleVisualSearch = async (overrideType?: 'video' | 'image') => {
    if (!userConfig?.pixabayKey) {
      dispatch({ type: 'SEARCH_ERROR', error: 'Pixabay API key missing. Save it in Settings.' });
      return;
    }
    const searchType = overrideType ?? visual.type;
    dispatch({ type: 'SEARCH_START' });
    try {
      const safeQuery = (visualSearchTerm || scene.title || '')
        .split(/[, ]+/).filter(Boolean).slice(0, 10).join(' ').slice(0, 120);
      const endpoint = searchType === 'video'
        ? `https://pixabay.com/api/videos/?key=${userConfig.pixabayKey}&q=${encodeURIComponent(safeQuery)}&per_page=8&safesearch=true`
        : `https://pixabay.com/api/?key=${userConfig.pixabayKey}&q=${encodeURIComponent(safeQuery)}&per_page=12&image_type=photo&safesearch=true`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch visuals.');
      const data = await res.json();
      const results: MediaResult[] = (data.hits || []).map((hit: any) => {
        if (searchType === 'video') {
          return {
            id: String(hit.id), type: 'video' as const,
            title: hit.tags || 'Pixabay Video',
            url: hit.videos?.large?.url || hit.videos?.medium?.url || hit.videos?.small?.url || hit.videos?.tiny?.url,
            previewUrl: hit.videos?.large?.thumbnail || hit.videos?.medium?.thumbnail || hit.videos?.small?.thumbnail || hit.videos?.tiny?.thumbnail || hit.previewURL,
            tags: hit.tags ? String(hit.tags).split(',').map((t: string) => t.trim()) : [],
          };
        }
        return {
          id: String(hit.id), type: 'image' as const,
          title: hit.tags || 'Pixabay Image',
          url: hit.imageURL || hit.fullHDURL || hit.largeImageURL || hit.webformatURL,
          previewUrl: hit.previewURL || hit.webformatURL,
          tags: hit.tags ? String(hit.tags).split(',').map((t: string) => t.trim()) : [],
        };
      });
      dispatch({ type: 'SEARCH_DONE' });
      if (!results.length) {
        toast({ title: 'No visuals found', description: 'Try adjusting keywords.', variant: 'destructive' });
      } else {
        // Auto-select first result for any empty slot
        const first = results[0];
        const updates: Partial<Scene> = {};
        if (!scene.transitionVisual) { updates.selectedVisual = first; updates.transitionVisual = first; updates.asset = undefined; }
        if (!scene.narrationVideo)   { updates.narrationVideo = first; }
        if (Object.keys(updates).length) onUpdate({ ...scene, ...updates });
        // Push results to parent side panel
        onPushResults('visual', results);
      }
    } catch (error) {
      console.error(error);
      dispatch({ type: 'SEARCH_ERROR', error: error instanceof Error ? error.message : 'Failed to fetch visuals.' });
    }
  };

  return (
    <AccordionItem value={`item-${scene.id}`} className="bg-card border rounded-lg shadow-sm">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
        <div className="flex items-center gap-4 w-full">
          <GripVertical className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <div className="w-16 h-9 rounded-md bg-muted overflow-hidden shrink-0">
            {scene.transitionVisual?.type === 'image' && (
              <img src={scene.transitionVisual.previewUrl || scene.transitionVisual.url} alt="" className="object-cover w-full h-full" />
            )}
          </div>
          <span className="flex-1 text-left truncate">Scene {sceneNumber}: {scene.title}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal bg-muted px-2 py-1 rounded-md">
            <Timer className="h-3 w-3" /><span>{scene.duration}s</span>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="p-4 pt-0">
        <div className="space-y-6">
          {/* Navigation + validation */}
          <div className="flex items-start justify-between gap-4">
            {validationErrors.length > 0 ? (
              <Alert variant="destructive" className="flex-1">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm space-y-0.5">
                  {validationErrors.map((msg, i) => <div key={i}>{msg}</div>)}
                </AlertDescription>
              </Alert>
            ) : <div className="flex-1" />}
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={sceneNumber === 1} onClick={() => onNavigateToScene(sceneNumber - 1)} title="Previous scene">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={sceneNumber === totalScenes} onClick={() => onNavigateToScene(sceneNumber + 1)} title="Next scene">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Section 1: Content ──────────────────────────────────── */}
          <div className="space-y-2">
            <SectionLabel icon={<Type className="h-3.5 w-3.5" />}>Content</SectionLabel>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor={`title-${scene.id}`}>Scene Title</Label>
                    <Input id={`title-${scene.id}`} value={scene.title} onChange={(e) => handleFieldChange('title', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`duration-${scene.id}`}>Duration (s)</Label>
                    <Input id={`duration-${scene.id}`} type="number" value={scene.duration} onChange={(e) => handleFieldChange('duration', e.target.valueAsNumber)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`narration-${scene.id}`}>Narration</Label>
                  <Textarea id={`narration-${scene.id}`} value={scene.narration} onChange={(e) => handleFieldChange('narration', e.target.value)} className="min-h-24" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`subtitle-${scene.id}`}>Subtitle Transition</Label>
                  <select id={`subtitle-${scene.id}`} value={scene.subtitleTransition || 'fade'} onChange={(e) => handleFieldChange('subtitleTransition', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Section 2: Visuals ──────────────────────────────────── */}
          <div className="space-y-2">
            <SectionLabel icon={<ImageIcon className="h-3.5 w-3.5" />}>Visuals</SectionLabel>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <VisualSlot
                    label="Transition"
                    icon={<ImageIcon className="h-3.5 w-3.5" />}
                    media={scene.transitionVisual}
                    emptyText="No transition selected"
                    aside={
                      <select value={scene.transitionType || 'fade'} onChange={(e) => handleFieldChange('transitionType', e.target.value)}
                        className="text-xs rounded border border-input bg-background px-2 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="fade">Fade</option>
                        <option value="slide">Slide</option>
                        <option value="zoom">Zoom</option>
                        <option value="wipe">Wipe</option>
                      </select>
                    }
                  />
                  <VisualSlot
                    label="Narration"
                    icon={<Video className="h-3.5 w-3.5" />}
                    media={scene.narrationVideo}
                    emptyText="No narration selected"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={onOpenTransitionLibrary}>
                    <PanelRightOpen className="h-4 w-4 mr-2" />
                    Browse transition library
                  </Button>
                  <p className="text-xs text-muted-foreground self-center">
                    Search results and transition assets open in the side panel.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Input
                    value={visual.query}
                    onChange={(e) => { dispatch({ type: 'SET_QUERY', query: e.target.value }); handleFieldChange('visualKeywords', e.target.value); }}
                    placeholder="Search keywords…"
                    className="flex-1 min-w-[160px]"
                  />
                  <RadioGroup value={visual.type} onValueChange={(v) => dispatch({ type: 'SET_TYPE', mediaType: v as 'video' | 'image' })} className="flex gap-2">
                    <Label htmlFor={`vtype-img-${scene.id}`} className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm cursor-pointer">
                      <RadioGroupItem id={`vtype-img-${scene.id}`} value="image" />
                      <Image className="h-3.5 w-3.5" /> Images
                    </Label>
                    <Label htmlFor={`vtype-vid-${scene.id}`} className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm cursor-pointer">
                      <RadioGroupItem id={`vtype-vid-${scene.id}`} value="video" />
                      <Video className="h-3.5 w-3.5" /> Videos
                    </Label>
                  </RadioGroup>
                  <Button onClick={() => handleVisualSearch()} disabled={visual.isLoading}>
                    {visual.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Search
                  </Button>
                </div>
                {visual.error && <SearchError message={visual.error} />}
              </CardContent>
            </Card>
          </div>

          {/* ── Section 3: Audio ────────────────────────────────────── */}
          <div className="space-y-2">
            <SectionLabel icon={<Music className="h-3.5 w-3.5" />}>Audio</SectionLabel>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={audioSearch.query}
                    onChange={(e) => { audioSearch.setQuery(e.target.value); handleFieldChange('audioKeywords', e.target.value); }}
                    placeholder="e.g., piano, ambient, drums"
                    className="flex-1 min-w-[160px]"
                  />
                  <Button onClick={() => audioSearch.search()} disabled={audioSearch.isLoading}>
                    {audioSearch.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Search audio
                  </Button>
                </div>
                {audioSearch.error && <SearchError message={audioSearch.error} />}
                {scene.bgAudio && (
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="text-sm font-semibold flex items-center justify-between">
                      <span className="truncate">{scene.bgAudio.title}</span>
                      <span className="text-xs text-primary font-normal shrink-0 ml-2">selected</span>
                    </div>
                    <audio controls className="w-full">
                      <source src={scene.bgAudio.url} type="audio/mpeg" />
                      {scene.bgAudio.previewUrl && <source src={scene.bgAudio.previewUrl} type="audio/ogg" />}
                    </audio>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
      {icon}{children}
    </p>
  );
}

function VisualSlot({ label, icon, media, emptyText, aside }: {
  label: string;
  icon: React.ReactNode;
  media?: MediaResult;
  emptyText: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">{icon}{label}</span>
        {aside}
      </div>
      {media ? (
        <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
          {media.type === 'image' ? (
            <img src={media.previewUrl || media.url} alt={media.title} className="h-full w-full object-cover" />
          ) : (
            <video src={media.url} poster={media.previewUrl} className="h-full w-full object-cover" preload="metadata" />
          )}
          <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">✓</div>
        </div>
      ) : (
        <div className="aspect-video rounded-md bg-muted/40 border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground gap-1">
          <div className="opacity-40">{icon}</div>
          <span className="text-[11px]">{emptyText}</span>
        </div>
      )}
    </div>
  );
}

function SearchError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {message}{' '}
        <Button variant="link" className="px-1" asChild><Link href="/profile">Go to Settings</Link></Button>
      </AlertDescription>
    </Alert>
  );
}
