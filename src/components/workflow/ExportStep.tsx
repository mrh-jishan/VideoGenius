'use client';

import { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import type { VideoProject } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ExportStepProps {
  project: VideoProject;
  onStartOver: () => void;
}

export default function ExportStep({ project, onStartOver }: ExportStepProps) {
  const [hasCopied, setHasCopied] = useState(false);

  const jsonOutput = JSON.stringify(project, null, 2);

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
        <CardContent>
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
