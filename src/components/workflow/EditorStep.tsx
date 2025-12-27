'use client';

import { FileJson, ArrowLeft, Sparkles, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import type { VideoProject, Scene } from '@/lib/types';
import type { UserConfig } from '@/lib/actions';
import type { MediaResult } from '@/lib/actions';
import { getKeywordSuggestionsAction } from '@/lib/actions';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SceneCard from './SceneCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card as ResultCard, CardContent as ResultCardContent } from '@/components/ui/card';

interface EditorStepProps {
  project: VideoProject;
  onUpdateScene: (scene: Scene) => void;
  onUpdateProjectMeta: (payload: Partial<VideoProject>) => void;
  onExport: () => void;
  onBackToProjects: () => void;
  userId: string;
  userConfig?: UserConfig & {
    channelName?: string;
    socialLinks?: string;
    [key: string]: unknown;
  };
}

export default function EditorStep({ project, onUpdateScene, onUpdateProjectMeta, onExport, onBackToProjects, userId, userConfig }: EditorStepProps) {
  const { toast } = useToast();
  const [globalAudioQuery, setGlobalAudioQuery] = useState<string>(project.prompt || '');
  const [globalAudioResults, setGlobalAudioResults] = useState<MediaResult[]>([]);
  const [isGlobalAudioLoading, setIsGlobalAudioLoading] = useState(false);
  const [globalAudioError, setGlobalAudioError] = useState<string | null>(null);
  const [isSuggestingGlobal, setIsSuggestingGlobal] = useState(false);

  const safeUserConfig = userConfig
    ? {
        geminiApiKey: userConfig.geminiApiKey,
        pixabayKey: userConfig.pixabayKey,
        freesoundKey: userConfig.freesoundKey,
      }
    : undefined;

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

  const handleGlobalAudioSearch = async () => {
    if (!userConfig?.freesoundKey) {
      setGlobalAudioError('Freesound API key missing. Save it in Settings.');
      return;
    }
    setIsGlobalAudioLoading(true);
    setGlobalAudioError(null);
    try {
      const safeQuery = (globalAudioQuery || project.prompt || '').split(/[, ]+/).filter(Boolean).slice(0, 8).join(' ').slice(0, 100);
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
      setGlobalAudioResults(mapped);
      if (!mapped.length) {
        toast({ title: 'No audio found', description: 'Try different keywords.', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      setGlobalAudioError(error instanceof Error ? error.message : 'Failed to fetch audio.');
    } finally {
      setIsGlobalAudioLoading(false);
    }
  };

  const handleSelectGlobalAudio = (audio: MediaResult) => {
    onUpdateProjectMeta({ globalBgAudio: audio });
    toast({ title: 'Global background audio set', description: audio.title });
  };

  const handleSuggestGlobalAudio = async () => {
    setIsSuggestingGlobal(true);
    try {
      const existing = globalAudioQuery.split(',').map((k) => k.trim()).filter(Boolean);
      const response = await getKeywordSuggestionsAction({
        sceneDescription: project.prompt,
        existingKeywords: existing,
        newKeywords: existing,
        userId,
        userConfig: safeUserConfig,
      });
      const suggestion = response.suggestedKeywords.join(', ');
      setGlobalAudioQuery(suggestion);
      toast({ title: 'Updated global audio keywords', description: 'Using AI-suggested keywords.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Suggestion failed',
        description: 'Could not fetch keyword suggestions. Check Gemini key in Settings.',
      });
    } finally {
      setIsSuggestingGlobal(false);
    }
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
          {project.scenes.map((scene, index) => {
            const validation = sceneIssues.find((s) => s.id === scene.id);
            return (
            <SceneCard
              key={scene.id}
              scene={scene}
              sceneNumber={index + 1}
              onUpdate={onUpdateScene}
              userId={userId}
              userConfig={userConfig}
              validationErrors={validation?.messages || []}
            />
          )})}
        </Accordion>
      </div>

      <div className="space-y-6 border-t pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-headline">Global Background Audio</CardTitle>
            <CardDescription>Optional track that plays across the full video. Scene-specific background audio still applies per scene.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr,1fr] md:items-start">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Search audio</Label>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                  <Input
                    value={globalAudioQuery}
                    onChange={(e) => setGlobalAudioQuery(e.target.value)}
                    placeholder="e.g., cinematic, inspiring"
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleGlobalAudioSearch} disabled={isGlobalAudioLoading} className="whitespace-nowrap">
                      {isGlobalAudioLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Search audio
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={handleSuggestGlobalAudio}
                      disabled={isSuggestingGlobal}
                    >
                      {isSuggestingGlobal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      AI suggest
                    </Button>
                  </div>
                </div>
                {globalAudioError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {globalAudioError}{' '}
                      <Button variant="link" className="px-1" onClick={() => (window.location.href = '/profile')}>
                        Go to Settings
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Selected global track</Label>
                {project.globalBgAudio ? (
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {project.globalBgAudio.title}
                    </div>
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
                <div className="border-t pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {globalAudioResults.map(result => (
                  <ResultCard key={`global-audio-${result.id}`}>
                    <ResultCardContent className="p-3 space-y-2">
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
                        <Button variant="secondary" size="sm" onClick={() => handleSelectGlobalAudio(result)}>
                          Use as global track
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <a href={result.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </ResultCardContent>
                  </ResultCard>
                ))}
                  </div>
                </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
        <Button size="lg" onClick={handleExportClick} disabled={allIssues.length > 0}>
          <FileJson className="mr-2 h-5 w-5" />
          Finalize & Export JSON
        </Button>
        </div>
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
