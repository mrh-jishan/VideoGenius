'use client';

import { GripVertical, Image as ImageIcon, Music, Type, Timer, Video, Image, Sparkles, Loader2, AlertTriangle, ExternalLink, Wand2 } from 'lucide-react';
import type { Scene } from '@/lib/types';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AssetSelector from './AssetSelector';
import NarrationPreview from './NarrationPreview';
import { Card, CardContent } from '@/components/ui/card';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MediaResult, UserConfig } from '@/lib/actions';
import { getKeywordSuggestionsAction } from '@/lib/actions';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input as CTAInput } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface SceneCardProps {
  scene: Scene;
  sceneNumber: number;
  onUpdate: (scene: Scene) => void;
  userId: string;
  userConfig?: UserConfig;
  validationErrors?: string[];
}

export default function SceneCard({ scene, sceneNumber, onUpdate, userId, userConfig, validationErrors = [] }: SceneCardProps) {
  const { toast } = useToast();
  const [visualType, setVisualType] = useState<'video' | 'image'>('video');
  const [visualQuery, setVisualQuery] = useState(scene.visualKeywords || scene.title);
  const [visualResults, setVisualResults] = useState<MediaResult[]>([]);
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);

  const [audioQuery, setAudioQuery] = useState(scene.audioKeywords || scene.title || scene.narration);
  const [audioResults, setAudioResults] = useState<MediaResult[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isSuggestingVisual, setIsSuggestingVisual] = useState(false);

  const visualSearchTerm = useMemo(() => {
    return visualQuery || scene.visualKeywords || scene.title;
  }, [visualQuery, scene.visualKeywords, scene.title]);

  const audioSearchTerm = useMemo(() => {
    return audioQuery || scene.audioKeywords;
  }, [audioQuery, scene.audioKeywords]);

  const safeUserConfig = userConfig
    ? {
        geminiApiKey: userConfig.geminiApiKey,
        pixabayKey: userConfig.pixabayKey,
        freesoundKey: userConfig.freesoundKey,
      }
    : undefined;

  const suggestVisualKeywords = async () => {
    setIsSuggestingVisual(true);
    try {
      const existing = visualQuery
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      const response = await getKeywordSuggestionsAction({
        sceneDescription: scene.narration || scene.title,
        existingKeywords: existing,
        newKeywords: existing,
        userId,
        userConfig: safeUserConfig,
      });
      const suggestion = response.suggestedKeywords.join(', ');
      setVisualQuery(suggestion);
      handleFieldChange('visualKeywords', suggestion);
      toast({ title: 'Updated visual keywords', description: 'Using AI-suggested keywords.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Suggestion failed',
        description: 'Could not fetch keyword suggestions. Check Gemini key in Settings.',
      });
    } finally {
      setIsSuggestingVisual(false);
    }
  };
  const handleFieldChange = (field: keyof Scene, value: string | number) => {
    onUpdate({ ...scene, [field]: value });
  };
  
  const handleAssetSelect = (asset: ImagePlaceholder) => {
    const media: MediaResult = {
      id: asset.id,
      type: 'image',
      title: asset.description,
      url: asset.imageUrl,
      previewUrl: asset.imageUrl,
    };
    onUpdate({
      ...scene,
      asset,
      selectedVisual: media,
      transitionVisual: media,
    });
  }

  const handleSelectTransitionVisual = (media: MediaResult) => {
    onUpdate({ ...scene, selectedVisual: media, transitionVisual: media, asset: undefined });
  };

  const handleSelectNarrationVideo = (media: MediaResult) => {
    onUpdate({ ...scene, narrationVideo: media });
  };

  const handleSelectAudioMedia = (media: MediaResult) => {
    onUpdate({ ...scene, selectedAudio: media, bgAudio: media });
  };

  const handleVisualSearch = async () => {
    if (!userConfig?.pixabayKey) {
      setVisualError('Pixabay API key missing. Save it in Settings.');
      return;
    }

    setIsLoadingVisual(true);
    setVisualError(null);
    try {
      const safeQuery = (visualSearchTerm || scene.title || '')
        .split(/[, ]+/)
        .filter(Boolean)
        .slice(0, 10)
        .join(' ')
        .slice(0, 120);
      const endpoint =
        visualType === 'video'
          ? `https://pixabay.com/api/videos/?key=${userConfig.pixabayKey}&q=${encodeURIComponent(safeQuery)}&per_page=8&safesearch=true`
          : `https://pixabay.com/api/?key=${userConfig.pixabayKey}&q=${encodeURIComponent(safeQuery)}&per_page=12&image_type=photo&safesearch=true`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch visuals.');
      const data = await res.json();
      const mapped: MediaResult[] = (data.hits || []).map((hit: any) => {
        if (visualType === 'video') {
          const videoUrl =
            hit.videos?.large?.url ||
            hit.videos?.medium?.url ||
            hit.videos?.small?.url ||
            hit.videos?.tiny?.url;
          const previewThumb =
            hit.videos?.large?.thumbnail ||
            hit.videos?.medium?.thumbnail ||
            hit.videos?.small?.thumbnail ||
            hit.videos?.tiny?.thumbnail ||
            hit.previewURL;
          return {
            id: String(hit.id),
            type: 'video',
            title: hit.tags || 'Pixabay Video',
            url: videoUrl,
            previewUrl: previewThumb,
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
      setVisualResults(mapped);
      if (!mapped.length) {
        toast({ title: 'No visuals found', description: 'Try adjusting keywords or prompt.', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      setVisualError(error instanceof Error ? error.message : 'Failed to fetch visuals.');
    } finally {
      setIsLoadingVisual(false);
    }
  };

  const handleAudioSearch = async () => {
    if (!userConfig?.freesoundKey) {
      setAudioError('Freesound API key missing. Save it in Settings.');
      return;
    }

    setIsLoadingAudio(true);
    setAudioError(null);
    try {
      const safeQuery = (audioSearchTerm || '')
        .split(/[, ]+/)
        .filter(Boolean)
        .slice(0, 10)
        .join(' ')
        .slice(0, 120);
      const endpoint = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(
        safeQuery
      )}&fields=id,name,previews,duration,tags&token=${userConfig.freesoundKey}&page_size=10`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch audio.');
      const data = await res.json();
      const mapped: MediaResult[] = (data.results || []).map((hit: any) => ({
        id: String(hit.id),
        type: 'audio',
        title: hit.name || 'Freesound Audio',
        url: hit.previews?.['preview-hq-mp3'] || hit.previews?.['preview-lq-mp3'],
        previewUrl: hit.previews?.['preview-hq-ogg'] || hit.previews?.['preview-lq-ogg'],
        duration: hit.duration,
        tags: hit.tags || [],
      }));
      setAudioResults(mapped);
      if (!mapped.length) {
        toast({ title: 'No audio found', description: 'Try different keywords.', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      setAudioError(error instanceof Error ? error.message : 'Failed to fetch audio.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

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
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm space-y-1">
              {validationErrors.map((msg, idx) => (
                <div key={idx}>{msg}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
        <Tabs defaultValue="content">
          <TabsList className="grid w-full grid-cols-4 gap-2">
            <TabsTrigger value="content"><Type className="mr-2 h-4 w-4" />Content</TabsTrigger>
            <TabsTrigger value="transition"><ImageIcon className="mr-2 h-4 w-4" />Transition</TabsTrigger>
            <TabsTrigger value="narration"><Video className="mr-2 h-4 w-4" />Narration</TabsTrigger>
            <TabsTrigger value="audio"><Music className="mr-2 h-4 w-4" />Audio</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor={`title-${scene.id}`}>Scene Title</Label>
                    <Input
                      id={`title-${scene.id}`}
                      value={scene.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`duration-${scene.id}`}>Duration (seconds)</Label>
                    <Input
                      id={`duration-${scene.id}`}
                      type="number"
                      value={scene.duration}
                      onChange={(e) => handleFieldChange('duration', e.target.valueAsNumber)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`narration-${scene.id}`}>Narration</Label>
                  <Textarea
                    id={`narration-${scene.id}`}
                    value={scene.narration}
                    onChange={(e) => handleFieldChange('narration', e.target.value)}
                    className="min-h-24"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transition" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-2">
                  <Label>Transition Image (Asset Library)</Label>
                  <AssetSelector
                    selectedAsset={scene.asset}
                    onSelect={handleAssetSelect}
                    query={[scene.title, scene.visualKeywords, scene.narration].filter(Boolean).join(' ')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="narration" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-2">
                  <Label>Narration Video</Label>
                  {scene.narrationVideo ? (
                    <div className="mt-1 space-y-2 rounded-md border p-3">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {scene.narrationVideo.type === 'video' ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <Image className="h-4 w-4" />
                        )}
                        Selected narration {scene.narrationVideo.type}
                      </div>
                      {scene.narrationVideo.type === 'image' ? (
                        <div className="aspect-video w-full max-h-[320px] overflow-hidden rounded-md bg-muted">
                          <img
                            src={scene.narrationVideo.previewUrl || scene.narrationVideo.url}
                            alt={scene.narrationVideo.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video w-full max-h-[320px] overflow-hidden rounded-md bg-black">
                          <video
                            src={scene.narrationVideo.url}
                            poster={scene.narrationVideo.previewUrl}
                            controls
                            className="h-full w-full object-cover"
                            preload="metadata"
                          />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">{scene.narrationVideo.title}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Use search results to assign a narration video.</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Search keywords</Label>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                    <div className="flex-1">
                      <Input
                        value={visualQuery}
                        onChange={(e) => {
                          setVisualQuery(e.target.value);
                          handleFieldChange('visualKeywords', e.target.value);
                        }}
                        placeholder="Use scene keywords or customize"
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Result</span>
                      <RadioGroup
                        value={visualType}
                        onValueChange={(val) => setVisualType(val as 'video' | 'image')}
                        className="flex gap-2"
                      >
                        <Label
                          htmlFor={`narration-video-${scene.id}`}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/10"
                        >
                          <RadioGroupItem id={`narration-video-${scene.id}`} value="video" />
                          <Video className="h-4 w-4" /> Video
                        </Label>
                        <Label
                          htmlFor={`narration-image-${scene.id}`}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/10"
                        >
                          <RadioGroupItem id={`narration-image-${scene.id}`} value="image" />
                          <Image className="h-4 w-4" /> Image
                        </Label>
                      </RadioGroup>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={suggestVisualKeywords}
                        disabled={isSuggestingVisual}
                      >
                        {isSuggestingVisual ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                        AI suggest
                      </Button>
                    </div>
                    <Button onClick={handleVisualSearch} disabled={isLoadingVisual} className="w-full lg:w-auto whitespace-nowrap">
                      {isLoadingVisual ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Search {visualType === 'video' ? 'videos' : 'images'}
                    </Button>
                  </div>
                </div>

                {visualError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {visualError}{' '}
                      <Button variant="link" className="px-1" onClick={() => (window.location.href = '/profile')}>
                        Go to Settings
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {visualResults.map(result => (
                    <Card key={`${result.type}-${result.id}`} className="overflow-hidden">
                      <CardContent className="p-3 space-y-2">
                        {result.type === 'image' ? (
                          <img src={result.previewUrl || result.url} alt={result.title} className="w-full rounded-md object-cover max-h-48" />
                        ) : (
                          <video src={result.url} poster={result.previewUrl} controls className="w-full rounded-md max-h-48" />
                        )}
                        <div className="text-sm font-medium truncate">{result.title}</div>
                        {result.tags && (
                          <div className="text-xs text-muted-foreground truncate">Tags: {result.tags.join(', ')}</div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => handleSelectNarrationVideo(result)}>
                            Use for narration
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={result.url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Search background audio</Label>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                    <Input
                      value={audioQuery}
                      onChange={(e) => {
                        setAudioQuery(e.target.value);
                        handleFieldChange('audioKeywords', e.target.value);
                      }}
                      placeholder="e.g., cinematic, inspiring"
                      className="flex-1"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAudioSearch} disabled={isLoadingAudio} className="whitespace-nowrap">
                        {isLoadingAudio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Search audio
                      </Button>
                    </div>
                  </div>
                  {audioError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {audioError}{' '}
                        <Button variant="link" className="px-1" onClick={() => (window.location.href = '/profile')}>
                          Go to Settings
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Selected background audio</Label>
                  {scene.bgAudio ? (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {scene.bgAudio.title}
                      </div>
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

                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-semibold">Search results</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                  {audioResults.map(result => (
                    <Card key={`audio-${result.id}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="text-sm font-medium truncate">{result.title}</div>
                        {result.duration && (
                          <div className="text-xs text-muted-foreground">Duration: {Math.round(result.duration)}s</div>
                        )}
                        <audio controls className="w-full">
                          <source src={result.url} type="audio/mpeg" />
                          {result.previewUrl && <source src={result.previewUrl} type="audio/ogg" />}
                        </audio>
                        {result.tags && (
                          <div className="text-xs text-muted-foreground truncate">Tags: {result.tags.join(', ')}</div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => handleSelectAudioMedia(result)}>
                            Select audio
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={result.url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  );
}
