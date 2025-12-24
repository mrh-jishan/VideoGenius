'use client';

import { signInWithGoogle } from '@/firebase/auth';
import { Button } from '@/components/ui/button';

export default function LoginButton() {
  return (
    <Button onClick={signInWithGoogle}>
      Login with Google
    </Button>
  );
}
