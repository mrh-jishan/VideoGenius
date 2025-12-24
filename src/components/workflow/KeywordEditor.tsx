'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { getKeywordSuggestionsAction } from '@/lib/actions';
import type { Scene } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface KeywordEditorProps {
  scene: Scene;
  onUpdateKeywords: (type: 'musicMood' | 'sfxKeywords', value: string) => void;
}

export default function KeywordEditor({ scene, onUpdateKeywords }: KeywordEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const handleGetSuggestions = async (type: 'musicMood' | 'sfxKeywords') => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const currentKeywords = (type === 'musicMood' ? scene.musicMood : scene.sfxKeywords).split(',').map(k => k.trim());
      const response = await getKeywordSuggestionsAction({
        sceneDescription: scene.narration,
        existingKeywords: currentKeywords,
        newKeywords: currentKeywords,
      });
      setSuggestions(response.suggestedKeywords);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Suggestion Failed',
        description: 'Could not fetch keyword suggestions.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
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
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleGetSuggestions(type)}
          disabled={isLoading}
          aria-label="Get AI suggestions"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Suggestions:</span>
          {suggestions.map((suggestion, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                onUpdateKeywords(type, suggestion);
                setSuggestions([]);
              }}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">Audio Keywords</CardTitle>
            <CardDescription>Refine keywords to guide AI audio selection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {createEditor('musicMood', 'Music Mood', 'Keywords describing the desired music mood.')}
            {createEditor('sfxKeywords', 'Sound Effects (SFX)', 'Keywords for scene-specific sound effects.')}
        </CardContent>
    </Card>
  );
}
