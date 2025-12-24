'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const profileFormSchema = z.object({
  geminiApiKey: z.string().optional(),
  ttsProvider: z.enum(['gTTS', 'AmazonPolly']).default('gTTS'),
  pollyVoice: z.string().optional(),
  pollyEngine: z.enum(['standard', 'neural', 'generative', 'long-form']).default('standard'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const pollyVoices = [
    { value: 'Joanna', label: 'Joanna (Female, American English)', engines: ['standard', 'neural', 'long-form'] },
    { value: 'Matthew', label: 'Matthew (Male, American English)', engines: ['standard', 'neural', 'long-form'] },
    { value: 'Ivy', label: 'Ivy (Female, American English, Child)', engines: ['standard', 'neural'] },
    { value: 'Amy', label: 'Amy (Female, British English)', engines: ['standard', 'neural', 'long-form'] },
    { value: 'Brian', label: 'Brian (Male, British English)', engines: ['standard', 'neural', 'long-form'] },
    { value: 'Emma', label: 'Emma (Female, British English)', engines: ['standard', 'neural', 'long-form'] },
    { value: 'Ruth', label: 'Ruth (Female, American English)', engines: ['generative', 'long-form'] },
    { value: 'Stephen', label: 'Stephen (Male, American English)', engines: ['generative', 'long-form'] },
];

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<ProfileFormValues>(userDocRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      geminiApiKey: '',
      ttsProvider: 'gTTS',
      pollyVoice: 'Joanna',
      pollyEngine: 'standard'
    },
  });
  
  const watchedTtsProvider = form.watch('ttsProvider');
  const watchedPollyEngine = form.watch('pollyEngine');
  
  const availableVoices = useMemo(() => {
    return pollyVoices.filter(voice => voice.engines.includes(watchedPollyEngine));
  }, [watchedPollyEngine]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userProfile) {
      form.reset({
        geminiApiKey: userProfile.geminiApiKey || '',
        ttsProvider: userProfile.ttsProvider || 'gTTS',
        pollyVoice: userProfile.pollyVoice || 'Joanna',
        pollyEngine: userProfile.pollyEngine || 'standard',
      });
    }
  }, [userProfile, form]);
  
  useEffect(() => {
      const currentVoice = form.getValues('pollyVoice');
      const isCurrentVoiceAvailable = availableVoices.some(v => v.value === currentVoice);
      if (!isCurrentVoiceAvailable && availableVoices.length > 0) {
        form.setValue('pollyVoice', availableVoices[0].value);
      }
  }, [watchedPollyEngine, availableVoices, form]);


  const onSubmit = async (data: ProfileFormValues) => {
    if (!userDocRef) return;
    try {
      setDocumentNonBlocking(userDocRef, data, { merge: true });
      toast({
        title: 'Profile Updated',
        description: 'Your settings have been saved.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your settings. Please try again.',
      });
      console.error(error);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Redirect is handled by useEffect
  }
  
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-headline">User Profile</CardTitle>
                <CardDescription>Manage your settings, API keys, and text-to-speech preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">API Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                            control={form.control}
                            name="geminiApiKey"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Gemini API Key</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Enter your Gemini API Key" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Text-to-Speech (TTS)</CardTitle>
                            <CardDescription>Choose your preferred speech synthesis provider.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="ttsProvider"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>TTS Provider</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a provider" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        <SelectItem value="gTTS">Google Text-to-Speech (gTTS)</SelectItem>
                                        <SelectItem value="AmazonPolly">Amazon Polly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {watchedTtsProvider === 'AmazonPolly' && (
                                <div className="space-y-6 rounded-md border p-4">
                                    <FormField
                                        control={form.control}
                                        name="pollyEngine"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Amazon Polly Engine</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an engine" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="standard">Standard</SelectItem>
                                                    <SelectItem value="neural">Neural</SelectItem>
                                                    <SelectItem value="generative">Generative</SelectItem>
                                                    <SelectItem value="long-form">Long-Form</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Neural and Generative engines provide higher quality voices.</FormDescription>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="pollyVoice"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Amazon Polly Voice</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a voice" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {availableVoices.map(voice => (
                                                        <SelectItem key={voice.value} value={voice.value}>{voice.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
