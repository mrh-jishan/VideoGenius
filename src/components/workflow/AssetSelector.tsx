'use client';

import Image from 'next/image';
import { Image as ImageIcon, CheckCircle2, Search, Loader2 } from 'lucide-react';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { UserConfig } from '@/lib/actions';

interface AssetSelectorProps {
  selectedAsset?: ImagePlaceholder;
  onSelect: (asset: ImagePlaceholder) => void;
  query?: string;
  userConfig?: UserConfig;
}

export default function AssetSelector({ selectedAsset, onSelect, query, userConfig }: AssetSelectorProps) {
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<ImagePlaceholder[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const normalizedTerms = query
    ? query
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean)
    : [];

  const rankedImages = normalizedTerms.length
    ? [...PlaceHolderImages].sort((a, b) => {
        const score = (img: ImagePlaceholder) =>
          normalizedTerms.reduce((acc, term) => {
            const haystack = `${img.description} ${img.imageHint}`.toLowerCase();
            return haystack.includes(term) ? acc + 1 : acc;
          }, 0);
        return score(b) - score(a);
      })
    : PlaceHolderImages;

  const handleUnsplashSearch = async () => {
    if (!userConfig?.unsplashKey) {
      setSearchError('Unsplash Access Key missing. Add it in Settings.');
      return;
    }
    if (!unsplashQuery.trim()) {
      setSearchError('Enter a search term.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        unsplashQuery.trim()
      )}&per_page=20&orientation=landscape`;
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Client-ID ${userConfig.unsplashKey}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch from Unsplash.');
      const data = await res.json();
      const mapped: ImagePlaceholder[] = (data.results || []).map((photo: any) => ({
        id: `unsplash-${photo.id}`,
        description: photo.alt_description || photo.description || 'Unsplash Image',
        imageHint: photo.alt_description || '',
        imageUrl: photo.urls.regular,
      }));
      setUnsplashResults(mapped);
      if (!mapped.length) {
        setSearchError('No images found. Try different keywords.');
      }
    } catch (error) {
      console.error(error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search Unsplash.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group">
          <CardContent className="p-0">
            {selectedAsset ? (
              <div className="relative aspect-video">
                <Image
                  src={selectedAsset.imageUrl}
                  alt={selectedAsset.description}
                  fill
                  className="object-cover"
                  data-ai-hint={selectedAsset.imageHint}
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-semibold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" /> Change Asset
                  </span>
                </div>
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-muted/50">
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Select an asset</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select an Asset</DialogTitle>
          {normalizedTerms.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing best matches for: <span className="font-medium">{normalizedTerms.join(', ')}</span>
            </p>
          )}
        </DialogHeader>

        {/* Unsplash Search Section */}
        <div className="space-y-3 border-b pb-4">
          <Label className="text-sm font-semibold">Search Unsplash</Label>
          <div className="flex gap-2">
            <Input
              value={unsplashQuery}
              onChange={(e) => setUnsplashQuery(e.target.value)}
              placeholder="e.g., mountains, ocean, city"
              onKeyDown={(e) => e.key === 'Enter' && handleUnsplashSearch()}
            />
            <Button onClick={handleUnsplashSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
          {searchError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{searchError}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Unsplash Results */}
        {unsplashResults.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Unsplash Results ({unsplashResults.length})</Label>
            <ScrollArea className="h-[40vh] -mx-6">
              <div className="px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {unsplashResults.map((image) => (
                  <DialogTrigger key={image.id} asChild>
                    <button
                      onClick={() => onSelect(image)}
                      className="block text-left"
                      aria-label={`Select ${image.description}`}
                    >
                      <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                        <CardContent className="p-0 relative">
                          <div className="aspect-video relative">
                            <Image
                              src={image.imageUrl}
                              alt={image.description}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                              data-ai-hint={image.imageHint}
                            />
                            {selectedAsset?.id === image.id && (
                              <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                                <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-muted-foreground truncate">{image.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  </DialogTrigger>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Placeholder Images */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Placeholder Library</Label>
          <ScrollArea className="h-[40vh] -mx-6">
            <div className="px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {rankedImages.map((image) => (
                <DialogTrigger key={image.id} asChild>
                  <button
                    onClick={() => onSelect(image)}
                    className="block text-left"
                    aria-label={`Select ${image.description}`}
                  >
                    <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                      <CardContent className="p-0 relative">
                        <div className="aspect-video relative">
                          <Image
                            src={image.imageUrl}
                            alt={image.description}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            data-ai-hint={image.imageHint}
                          />
                          {selectedAsset?.id === image.id && (
                            <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                              <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground truncate">{image.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                </DialogTrigger>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
