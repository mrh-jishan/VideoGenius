'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlusCircle, AlertTriangle, Loader2 } from 'lucide-react';

type UserConfig = {
  geminiApiKey?: string;
  ttsProvider?: 'gTTS' | 'AmazonPolly';
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
};

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const configDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userConfig, isLoading: isConfigLoading } = useDoc<UserConfig>(configDocRef);

  const isLoading = isUserLoading || isConfigLoading;
  const needsGemini = !userConfig?.geminiApiKey;
  const needsAws =
    userConfig?.ttsProvider === 'AmazonPolly' &&
    (!userConfig.awsAccessKeyId || !userConfig.awsSecretAccessKey || !userConfig.awsRegion);
  const showConfigAlert = !isLoading && (needsGemini || needsAws);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {showConfigAlert && (
          <Alert variant="destructive" className="border border-destructive/40 bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Finish your setup</AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              {needsGemini && <div>Add your Google API Key for Gemini to generate text/images.</div>}
              {needsAws && <div>Add AWS credentials (Access Key, Secret, Region) to use Amazon Polly TTS.</div>}
              <Button variant="outline" size="sm" className="mt-1" onClick={() => router.push('/profile')}>
                Go to Settings
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr]">
          <div className="text-center py-16 border border-dashed rounded-lg bg-card shadow-sm">
            <h3 className="text-2xl font-semibold text-foreground">Welcome to VideoGenius</h3>
            <p className="text-muted-foreground mt-3 mb-6 max-w-md mx-auto">
              Select a project from the sidebar to start editing, or create a new one.
            </p>
            <Button onClick={() => router.push('/new-project')} size="lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
