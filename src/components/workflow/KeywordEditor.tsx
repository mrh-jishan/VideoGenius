'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import type { UserConfig } from '@/lib/actions';
import type { Scene } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface KeywordEditorProps {
  scene: Scene;
  onUpdateKeywords: (type: 'musicMood' | 'sfxKeywords', value: string) => void;
  userId: string;
  layout?: 'stacked' | 'inline';
  userConfig?: UserConfig;
}

export default function KeywordEditor({ scene, onUpdateKeywords, userId, layout = 'stacked', userConfig }: KeywordEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  
  const createEditor = (type: 'musicMood' | 'sfxKeywords', title: string, description: string) => (
    <div>
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex gap-2">
        <Input
          value={type === 'musicMood' ? scene.musicMood : scene.sfxKeywords}
          onChange={(e) => onUpdateKeywords(type, e.target.value)}
          placeholder="e.g., cinematic, inspiring"
        />
        
      </div>
      
    </div>
  );

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">Audio Keywords</CardTitle>
            <CardDescription>Refine keywords to guide AI audio selection.</CardDescription>
        </CardHeader>
        <CardContent className={layout === 'inline' ? 'space-y-3' : 'space-y-6'}>
            {layout === 'inline' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {createEditor('musicMood', 'Music Mood', 'Keywords describing the desired music mood.')}
                {createEditor('sfxKeywords', 'Sound Effects (SFX)', 'Keywords for scene-specific sound effects.')}
              </div>
            ) : (
              <>
                {createEditor('musicMood', 'Music Mood', 'Keywords describing the desired music mood.')}
                {createEditor('sfxKeywords', 'Sound Effects (SFX)', 'Keywords for scene-specific sound effects.')}
              </>
            )}
        </CardContent>
    </Card>
  );
}
