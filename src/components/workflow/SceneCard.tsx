'use client';

import { GripVertical, Image as ImageIcon, Music, Type, Timer, Video, Image, Sparkles, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
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
import KeywordEditor from './KeywordEditor';
import NarrationPreview from './NarrationPreview';
import { Card, CardContent } from '@/components/ui/card';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MediaResult } from '@/lib/actions';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input as CTAInput } from '@/components/ui/input';

interface SceneCardProps {
  scene: Scene;
  sceneNumber: number;
  onUpdate: (scene: Scene) => void;
  userId: string;
  userConfig?: {
    pixabayKey?: string;
    freesoundKey?: string;
  };
}

export default function SceneCard({ scene, sceneNumber, onUpdate, userId, userConfig }: SceneCardProps) {
  const { toast } = useToast();
  const [visualType, setVisualType] = useState<'video' | 'image'>('video');
  const [visualQuery, setVisualQuery] = useState(scene.visualPrompt || scene.title);
  const [visualExtra, setVisualExtra] = useState('');
  const [visualResults, setVisualResults] = useState<MediaResult[]>([]);
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);

  const [audioQuery, setAudioQuery] = useState(scene.musicMood || scene.sfxKeywords || scene.title);
  const [audioExtra, setAudioExtra] = useState('');
  const [audioResults, setAudioResults] = useState<MediaResult[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const visualSearchTerm = useMemo(
    () => [visualQuery, visualExtra].filter(Boolean).join(' '),
    [visualQuery, visualExtra]
  );
  const audioSearchTerm = useMemo(
    () => [audioQuery, audioExtra].filter(Boolean).join(' '),
    [audioQuery, audioExtra]
  );
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

  const handleKeywordUpdate = (type: 'musicMood' | 'sfxKeywords', value: string) => {
    onUpdate({ ...scene, [type]: value });
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
      const safeQuery = (visualSearchTerm || scene.visualPrompt || scene.title || '').split(/[, ]+/).filter(Boolean).slice(0, 8).join(' ').slice(0, 100);
      const endpoint =
        visualType === 'video'
          ? `https://pixabay.com/api/videos/?key=${userConfig.pixabayKey}&q=${encodeURIComponent(safeQuery)}&per_page=8&safesearch=true`
          : `https://pixabay.com/api/?key=${userConfig.pixabayKey}&q=${encodeURIComponent(safeQuery)}&per_page=12&image_type=photo&safesearch=true`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch visuals.');
      const data = await res.json();
      const mapped: MediaResult[] = (data.hits || []).map((hit: any) => {
        if (visualType === 'video') {
          const videoUrl = hit.videos?.medium?.url || hit.videos?.small?.url;
          return {
            id: String(hit.id),
            type: 'video',
            title: hit.tags || 'Pixabay Video',
            url: videoUrl,
            previewUrl: hit.picture_id ? `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg` : undefined,
            tags: hit.tags ? String(hit.tags).split(',').map((t: string) => t.trim()) : [],
          };
        }
        return {
          id: String(hit.id),
          type: 'image',
          title: hit.tags || 'Pixabay Image',
          url: hit.largeImageURL || hit.webformatURL,
          previewUrl: hit.previewURL,
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
      const safeQuery = (audioSearchTerm || scene.musicMood || scene.title || '').split(/[, ]+/).filter(Boolean).slice(0, 8).join(' ').slice(0, 100);
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
        <Tabs defaultValue="content">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content"><Type className="mr-2 h-4 w-4" />Content</TabsTrigger>
            <TabsTrigger value="transition"><ImageIcon className="mr-2 h-4 w-4" />Transition Visual</TabsTrigger>
            <TabsTrigger value="narration"><Video className="mr-2 h-4 w-4" />Narration Video</TabsTrigger>
            <TabsTrigger value="audio"><Music className="mr-2 h-4 w-4" />Audio</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="mt-4 space-y-4">
            <Card>
                <CardContent className="p-6 grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`title-${scene.id}`}>Scene Title</Label>
                      <Input
                        id={`title-${scene.id}`}
                        value={scene.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                      />
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
                     <div className="grid gap-2">
                        <Label htmlFor={`duration-${scene.id}`}>Duration (seconds)</Label>
                        <Input
                            id={`duration-${scene.id}`}
                            type="number"
                            value={scene.duration}
                            onChange={(e) => handleFieldChange('duration', e.target.valueAsNumber)}
                            className="w-24"
                        />
                    </div>
                    <div className="grid gap-2">
                      <Label>Call to Action</Label>
                      <CTAInput
                        value={scene.callToAction ?? userConfig?.channelName ?? ''}
                        onChange={(e) => handleFieldChange('callToAction', e.target.value)}
                        placeholder={userConfig?.channelName ? `e.g., Subscribe to ${userConfig.channelName}` : 'Add a CTA for this scene'}
                      />
                      {userConfig?.socialLinks && (
                        <p className="text-xs text-muted-foreground">
                          Social links available in settings: {userConfig.socialLinks}
                        </p>
                      )}
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transition" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-2">
                  <Label>Transition Image (Asset Library)</Label>
                  <AssetSelector selectedAsset={scene.asset} onSelect={handleAssetSelect} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="narration" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
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
                        <img
                          src={scene.narrationVideo.previewUrl || scene.narrationVideo.url}
                          alt={scene.narrationVideo.title}
                          className="w-full max-h-60 rounded-md object-cover"
                        />
                      ) : (
                        <video
                          src={scene.narrationVideo.url}
                          poster={scene.narrationVideo.previewUrl}
                          controls
                          className="w-full max-h-60 rounded-md"
                          preload="metadata"
                        />
                      )}
                      <div className="text-xs text-muted-foreground truncate">{scene.narrationVideo.title}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Use search results to assign a narration video.</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`visualPrompt-${scene.id}`}>Narration Prompt (also used for TTS)</Label>
                  <Textarea
                    id={`visualPrompt-${scene.id}`}
                    value={scene.visualPrompt}
                    onChange={(e) => {
                      handleFieldChange('visualPrompt', e.target.value);
                      handleFieldChange('narration', e.target.value);
                    }}
                    placeholder="e.g., A stunning nebula in deep space..."
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt drives narration video selection and will be narrated in TTS.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Search keywords</Label>
                    <Input
                      value={visualQuery}
                      onChange={(e) => setVisualQuery(e.target.value)}
                      placeholder="Use scene prompt or custom keywords"
                    />
                    <Input
                      value={visualExtra}
                      onChange={(e) => setVisualExtra(e.target.value)}
                      placeholder="Extra prompt (optional)"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Result type</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={visualType === 'video' ? 'default' : 'outline'}
                        onClick={() => setVisualType('video')}
                        size="sm"
                        className="flex-1"
                      >
                        <Video className="h-4 w-4 mr-1" /> Video
                      </Button>
                      <Button
                        variant={visualType === 'image' ? 'default' : 'outline'}
                        onClick={() => setVisualType('image')}
                        size="sm"
                        className="flex-1"
                      >
                        <Image className="h-4 w-4 mr-1" /> Image
                      </Button>
                    </div>
                    <Button onClick={handleVisualSearch} disabled={isLoadingVisual} className="w-full">
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
            <KeywordEditor scene={scene} onUpdateKeywords={handleKeywordUpdate} userId={userId} />
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Search background audio</Label>
                    <Input
                      value={audioQuery}
                      onChange={(e) => setAudioQuery(e.target.value)}
                      placeholder="e.g., cinematic, inspiring"
                    />
                    <Input
                      value={audioExtra}
                      onChange={(e) => setAudioExtra(e.target.value)}
                      placeholder="Extra prompt (optional)"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAudioSearch} disabled={isLoadingAudio} className="flex-1">
                        {isLoadingAudio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Search audio
                      </Button>
                      <Button variant="secondary" onClick={() => handleKeywordUpdate('musicMood', audioQuery)}>
                        Save keywords
                      </Button>
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

                  <div className="space-y-3">
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
                </div>

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
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleKeywordUpdate('musicMood', result.tags?.slice(0, 5).join(', ') || result.title)}
                          >
                            Use tags
                          </Button>
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
              </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <Label className="font-semibold text-sm">Narration Audio</Label>
                    <div className="mt-2">
                      {scene.selectedAudio ? (
                        <audio controls className="w-full">
                          <source src={scene.selectedAudio.url} type="audio/mpeg" />
                          {scene.selectedAudio.previewUrl && <source src={scene.selectedAudio.previewUrl} type="audio/ogg" />}
                        </audio>
                      ) : (
                        <NarrationPreview />
                      )}
                    </div>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  );
}
