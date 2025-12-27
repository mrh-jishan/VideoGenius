'use client';

import Image from 'next/image';
import { Image as ImageIcon, CheckCircle2 } from 'lucide-react';
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

interface AssetSelectorProps {
  selectedAsset?: ImagePlaceholder;
  onSelect: (asset: ImagePlaceholder) => void;
  query?: string;
}

export default function AssetSelector({ selectedAsset, onSelect, query }: AssetSelectorProps) {
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
        <ScrollArea className="h-[60vh] -mx-6">
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
      </DialogContent>
    </Dialog>
  );
}
