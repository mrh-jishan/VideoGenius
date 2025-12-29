'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const profileFormSchema = z.object({
  geminiApiKey: z.string().min(1, 'Google API Key is required'),
  pixabayKey: z.string().optional(),
  freesoundKey: z.string().optional(),
  geminiTextModel: z.string().optional(),
  geminiImageModel: z.string().optional(),
  ttsProvider: z.enum(['gTTS', 'AmazonPolly']).default('gTTS'),
  pollyVoice: z.string().optional(),
  pollyEngine: z.enum(['standard', 'neural', 'generative', 'long-form']).default('generative'),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  awsRegion: z.string().optional(),
  outputDirectory: z.string().optional(),
  renderBackendUrl: z.string().url('Enter a valid URL').optional(),
  renderBackendApiKey: z.string().optional(),
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
      pixabayKey: '',
      freesoundKey: '',
      geminiTextModel: 'gemini-2.5-flash',
      geminiImageModel: 'gemini-2.5-flash-image',
      ttsProvider: 'gTTS',
      pollyVoice: 'Ruth',
      pollyEngine: 'generative',
      awsAccessKeyId: '',
      awsSecretAccessKey: '',
      awsRegion: '',
      outputDirectory: ''
      ,renderBackendUrl: '',
      renderBackendApiKey: ''
    },
  });
  
  const watchedTtsProvider = form.watch('ttsProvider');
  const watchedPollyEngine = form.watch('pollyEngine');
  const missingRequired = {
    gemini: !form.watch('geminiApiKey'),
    aws:
      watchedTtsProvider === 'AmazonPolly' &&
      (!form.watch('awsAccessKeyId') || !form.watch('awsSecretAccessKey') || !form.watch('awsRegion')),
  };
  
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
        pixabayKey: userProfile.pixabayKey || '',
        freesoundKey: userProfile.freesoundKey || '',
        geminiTextModel: userProfile.geminiTextModel || 'gemini-2.5-flash',
        geminiImageModel: userProfile.geminiImageModel || 'gemini-2.5-flash-image',
        ttsProvider: userProfile.ttsProvider || 'gTTS',
        pollyVoice: userProfile.pollyVoice || 'Ruth',
        pollyEngine: userProfile.pollyEngine || 'generative',
        awsAccessKeyId: userProfile.awsAccessKeyId || '',
        awsSecretAccessKey: userProfile.awsSecretAccessKey || '',
        awsRegion: userProfile.awsRegion || '',
        outputDirectory: userProfile.outputDirectory || '',
        renderBackendUrl: userProfile.renderBackendUrl || '',
        renderBackendApiKey: userProfile.renderBackendApiKey || '',
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
      <div className="flex flex-1 items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Redirect is handled by useEffect
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">User Profile</CardTitle>
          <CardDescription>Manage your settings, API keys, and text-to-speech preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          {(missingRequired.gemini || missingRequired.aws) && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing required configuration</AlertTitle>
              <AlertDescription>
                {missingRequired.gemini && 'Add your Google API Key for Gemini. '}
                {missingRequired.aws && 'Add AWS Access Key, Secret, and Region to use Amazon Polly.'}
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API Keys</CardTitle>
                  <CardDescription>Set API keys for Gemini, stock images, and audio services.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="geminiApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google API Key (Gemini) <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Required for Gemini text/image" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pixabayKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pixabay API Key</FormLabel>
                        <FormDescription>Used for stock images/videos when not generating via AI.</FormDescription>
                        <FormControl>
                          <Input type="password" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="freesoundKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Freesound API Key</FormLabel>
                        <FormDescription>Fetch background music and sound effects.</FormDescription>
                        <FormControl>
                          <Input type="password" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI Models</CardTitle>
                  <CardDescription>Choose which Gemini models to use for text and images.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="geminiTextModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Model</FormLabel>
                        <FormDescription>e.g., gemini-1.5-flash-latest, gemini-2.5-flash</FormDescription>
                        <FormControl>
                          <Input placeholder="gemini-2.5-flash" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="geminiImageModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image Model</FormLabel>
                        <FormDescription>e.g., gemini-2.5-flash-image, imagen-3.0-generate-001</FormDescription>
                        <FormControl>
                          <Input placeholder="gemini-2.5-flash-image" {...field} />
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
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="awsAccessKeyId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>AWS Access Key ID</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="AKIA..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="awsSecretAccessKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>AWS Secret Access Key</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Your secret access key" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="awsRegion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AWS Region</FormLabel>
                            <FormDescription>e.g., us-east-1</FormDescription>
                            <FormControl>
                              <Input placeholder="us-east-1" {...field} />
                            </FormControl>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Output Settings</CardTitle>
                  <CardDescription>Where to save rendered videos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="outputDirectory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Output Directory</FormLabel>
                        <FormDescription>Absolute or relative path to save rendered videos.</FormDescription>
                        <FormControl>
                          <Input placeholder="/path/to/renders" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="mt-6 space-y-6 rounded-md border p-4">
                    <FormField
                      control={form.control}
                      name="renderBackendUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rendering Backend URL</FormLabel>
                          <FormDescription>Optional: If set, Export can send the JSON payload to this endpoint.</FormDescription>
                          <FormControl>
                            <Input placeholder="https://api.example.com/render" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="renderBackendApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rendering Backend API Key</FormLabel>
                          <FormDescription>Optional: Sent as `Authorization: Bearer <key>` header.</FormDescription>
                          <FormControl>
                            <Input type="password" placeholder="Optional API key" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
  );
}
