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
    duration: number
  ) => void;
  isLoading: boolean;
}

const formSchema = z.object({
  prompt: z
    .string()
    .min(20, {
      message: 'Prompt must be at least 20 characters long.',
    })
    .max(500, {
      message: 'Prompt cannot be more than 500 characters long.',
    }),
  aspectRatio: z.enum(['horizontal', 'vertical']),
  duration: z.coerce.number().min(5, 'Duration must be at least 5 seconds.').max(300, 'Duration cannot exceed 300 seconds (5 minutes).'),
});

export default function PromptStep({ onPromptSubmit, isLoading }: PromptStepProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      aspectRatio: 'horizontal',
      duration: 60,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onPromptSubmit(values.prompt, values.aspectRatio, values.duration);
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
                      Describe the video you want to create in detail.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-8">
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
                          className="flex gap-4"
                        >
                          <FormItem className="flex-1">
                            <FormControl>
                              <RadioGroupItem value="horizontal" id="horizontal" className="sr-only" />
                            </FormControl>
                            <FormLabel
                              htmlFor="horizontal"
                              className={cn(
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                field.value === 'horizontal' && "border-primary"
                              )}
                            >
                              <RectangleHorizontal className="mb-3 h-6 w-6" />
                              Horizontal (16:9)
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
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                field.value === 'vertical' && "border-primary"
                               )}
                            >
                              <RectangleVertical className="mb-3 h-6 w-6" />
                              Vertical (9:16)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
  );
}
