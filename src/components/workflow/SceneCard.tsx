'use client';

import { GripVertical, Pencil, Image as ImageIcon, Music, Type, Clapperboard, Timer } from 'lucide-react';
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

interface SceneCardProps {
  scene: Scene;
  sceneNumber: number;
  onUpdate: (scene: Scene) => void;
}

export default function SceneCard({ scene, sceneNumber, onUpdate }: SceneCardProps) {
  const handleFieldChange = (field: keyof Scene, value: string | number) => {
    onUpdate({ ...scene, [field]: value });
  };
  
  const handleAssetSelect = (asset: ImagePlaceholder) => {
    onUpdate({ ...scene, asset });
  }

  const handleKeywordUpdate = (type: 'musicMood' | 'sfxKeywords', value: string) => {
    onUpdate({ ...scene, [type]: value });
  }

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content"><Type className="mr-2 h-4 w-4" />Content</TabsTrigger>
            <TabsTrigger value="visuals"><ImageIcon className="mr-2 h-4 w-4" />Visuals</TabsTrigger>
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
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visuals" className="mt-4 space-y-4">
            <Card>
                <CardContent className="p-6 grid gap-4">
                    <div className="grid gap-2">
                      <Label>Selected Asset</Label>
                      <AssetSelector selectedAsset={scene.asset} onSelect={handleAssetSelect} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`visualPrompt-${scene.id}`}>Visual Prompt (for AI generation)</Label>
                      <Textarea
                        id={`visualPrompt-${scene.id}`}
                        value={scene.visualPrompt}
                        onChange={(e) => handleFieldChange('visualPrompt', e.target.value)}
                        placeholder="e.g., A stunning nebula in deep space..."
                      />
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio" className="mt-4 space-y-4">
            <KeywordEditor scene={scene} onUpdateKeywords={handleKeywordUpdate} />
            <Card>
                <CardContent className="p-6">
                    <Label className="font-semibold text-sm">Narration Audio</Label>
                    <div className="mt-2">
                      <NarrationPreview />
                    </div>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  );
}
