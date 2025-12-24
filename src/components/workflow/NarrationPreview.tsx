'use client';

import { Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function NarrationPreview() {
  const { toast } = useToast();

  const handlePreview = () => {
    toast({
      title: 'Narration Preview',
      description: 'This is a demo feature. In a full app, this would play the generated audio.',
    });
  };

  return (
    <Button variant="outline" onClick={handlePreview}>
      <Play className="mr-2 h-4 w-4" />
      Preview Narration
    </Button>
  );
}
