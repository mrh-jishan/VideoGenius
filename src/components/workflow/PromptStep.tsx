'use client';

import { Wand2, Loader2, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PromptStepProps {
  onPromptSubmit: (
    prompt: string,
    aspectRatio: 'horizontal' | 'vertical',
    duration: number,
    sceneCount: number
  ) => void;
  isLoading: boolean;
}

const formSchema = z.object({
  prompt: z
    .string()
    .min(20, {
      message: 'Prompt must be at least 20 characters long.',
    })
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length <= 500, {
      message: 'Prompt cannot be more than 500 words.',
    }),
  aspectRatio: z.enum(['horizontal', 'vertical']),
  duration: z.coerce.number().min(5, 'Duration must be at least 5 seconds.').max(300, 'Duration cannot exceed 300 seconds (5 minutes).'),
  sceneCount: z.coerce.number().min(1, 'At least 1 scene').max(30, 'Too many scenes'),
});

export default function PromptStep({ onPromptSubmit, isLoading }: PromptStepProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      aspectRatio: 'horizontal',
      duration: 60,
      sceneCount: 6,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onPromptSubmit(values.prompt, values.aspectRatio, values.duration, values.sceneCount);
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <div className="grid gap-6 md:grid-cols-[2fr,1fr] items-start">
        <div>
          <div className="mb-6">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">New project</p>
            <h1 className="text-4xl font-extrabold font-headline leading-tight">
              Turn your idea into a storyboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Describe the video, pick an aspect ratio, target duration, and how many scenes you want.
            </p>
          </div>
          <Card className="shadow-2xl shadow-primary/10">
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                        <FormDescription>
                          Describe the video you want to create in detail. Max 500 words.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="aspectRatio"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-lg font-semibold">Aspect Ratio</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-2 gap-3"
                            >
                              <FormItem className="flex-1">
                                <FormControl>
                                  <RadioGroupItem value="horizontal" id="horizontal" className="sr-only" />
                                </FormControl>
                                <FormLabel
                                  htmlFor="horizontal"
                                  className={cn(
                                    "flex flex-col items-start gap-1 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer h-full",
                                    field.value === 'horizontal' && "border-primary"
                                  )}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-sm font-semibold">Horizontal</span>
                                    <RectangleHorizontal className="h-5 w-5" />
                                  </div>
                                  <p className="text-xs text-muted-foreground">16:9 — YouTube, desktop, TV.</p>
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex-1">
                                <FormControl>
                                  <RadioGroupItem
                                    value="vertical"
                                    id="vertical"
                                    className="sr-only"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor="vertical"
                                  className={cn(
                                    "flex flex-col items-start gap-1 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer h-full",
                                    field.value === 'vertical' && "border-primary"
                                   )}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-sm font-semibold">Vertical</span>
                                    <RectangleVertical className="h-5 w-5" />
                                  </div>
                                  <p className="text-xs text-muted-foreground">9:16 — Shorts, Reels, TikTok.</p>
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">Target Duration</FormLabel>
                            <FormControl>
                              <div className="relative">
                                  <Input type="number" className="pr-16" {...field} />
                                  <span className="absolute inset-y-0 right-4 flex items-center text-muted-foreground text-sm">seconds</span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              How long should the final video be?
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sceneCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">Desired Scenes</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={30} {...field} />
                            </FormControl>
                            <FormDescription>
                              Approximate number of scenes to generate.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

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

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardContent className="p-6 space-y-4">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Tips</p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Be specific about style, era, or mood to guide visuals and music.</li>
                <li>Set realistic duration; we’ll split it across your scenes.</li>
                <li>Choose scene count to control pacing and detail.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
