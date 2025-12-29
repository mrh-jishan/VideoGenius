'use client';

import { useMemo, useState } from 'react';
import { Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import type { VideoProject } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ExportStepProps {
  project: VideoProject;
  onStartOver: () => void;
  userConfig?: {
    ttsProvider?: 'gTTS' | 'AmazonPolly';
    pollyVoice?: string;
    pollyEngine?: string;
    geminiTextModel?: string;
    geminiImageModel?: string;
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsRegion?: string;
  };
}

export default function ExportStep({ project, onStartOver, userConfig }: ExportStepProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<'gTTS' | 'AmazonPolly'>(userConfig?.ttsProvider || 'gTTS');
  const [voiceId, setVoiceId] = useState<string>(userConfig?.pollyVoice || 'Ruth');
  const [engine, setEngine] = useState<string>(userConfig?.pollyEngine || 'generative');
  const [model, setModel] = useState<string>(userConfig?.geminiTextModel || 'gemini-2.5-flash');
  const [notes, setNotes] = useState<string>('');

  const exportPayload = useMemo(() => {
    return {
      ...project,
      renderOptions: {
        ttsProvider,
        voiceId: ttsProvider === 'AmazonPolly' ? voiceId : 'gTTS-default',
        engine: ttsProvider === 'AmazonPolly' ? engine : undefined,
        model,
        notes: notes.trim() || undefined,
      },
    };
  }, [project, ttsProvider, voiceId, engine, model, notes]);

  const jsonOutput = JSON.stringify(exportPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonOutput);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Export Complete</CardTitle>
          <CardDescription>
            Your video project has been compiled into the JSON format below. Copy this to your clipboard and use it with your backend video generation service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Voice provider</Label>
              <RadioGroup
                value={ttsProvider}
                onValueChange={(val) => setTtsProvider(val as 'gTTS' | 'AmazonPolly')}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="provider-gtts"
                  className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/10"
                >
                  <RadioGroupItem id="provider-gtts" value="gTTS" />
                  Google TTS
                </Label>
                <Label
                  htmlFor="provider-polly"
                  className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/10"
                >
                  <RadioGroupItem id="provider-polly" value="AmazonPolly" />
                  Amazon Polly
                </Label>
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose text model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.5-flash">gemini-2.5-flash</SelectItem>
                  <SelectItem value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</SelectItem>
                  <SelectItem value="gemini-2.5-pro">gemini-2.5-pro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for narration script generation.</p>
            </div>
          </div>

          {ttsProvider === 'AmazonPolly' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Voice</Label>
                <Select value={voiceId} onValueChange={setVoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Joanna">Joanna</SelectItem>
                    <SelectItem value="Matthew">Matthew</SelectItem>
                    <SelectItem value="Amy">Amy</SelectItem>
                    <SelectItem value="Brian">Brian</SelectItem>
                    <SelectItem value="Emma">Emma</SelectItem>
                    <SelectItem value="Ruth">Ruth</SelectItem>
                    <SelectItem value="Stephen">Stephen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Engine</Label>
                <Select value={engine} onValueChange={setEngine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="neural">Neural</SelectItem>
                    <SelectItem value="generative">Generative</SelectItem>
                    <SelectItem value="long-form">Long form</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Notes for rendering</Label>
            <Textarea
              placeholder="Any extra instructions for the rendering backend..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {ttsProvider === 'AmazonPolly' && (!userConfig?.awsAccessKeyId || !userConfig?.awsSecretAccessKey || !userConfig?.awsRegion) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing AWS credentials</AlertTitle>
              <AlertDescription>Add AWS keys and region in Settings to use Amazon Polly.</AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-7 w-7"
              onClick={handleCopy}
              aria-label="Copy JSON"
            >
              {hasCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <ScrollArea className="h-96 rounded-md border bg-muted/50">
              <pre className="p-4 text-sm font-mono">
                <code>{jsonOutput}</code>
              </pre>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
      <div className="text-center">
        <Button onClick={onStartOver} variant="outline" size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Create Another Video
        </Button>
      </div>
    </div>
  );
}
