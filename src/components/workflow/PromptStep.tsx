'use client';

import { Wand2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PromptStepProps {
  onPromptSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const formSchema = z.object({
  prompt: z.string().min(10, {
    message: 'Prompt must be at least 10 characters long.',
  }),
});

export default function PromptStep({ onPromptSubmit, isLoading }: PromptStepProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onPromptSubmit(values.prompt);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 font-headline bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
          Turn Your Ideas into Videos
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Start with a simple idea or a detailed script. Our AI will craft a complete video storyboard for you, scene by scene.
        </p>
      </div>

      <Card className="shadow-2xl shadow-primary/10">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">Enter your video prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A cinematic video about the wonders of space, showing galaxies, planets, and astronauts..."
                        className="min-h-[150px] text-base resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-5 w-5" />
                )}
                Generate Scenes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
