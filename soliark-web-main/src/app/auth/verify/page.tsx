'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OtpVerify, { PENDING_VERIFY_EMAIL_KEY } from '@/components/OtpVerify';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_VERIFY_EMAIL_KEY);
    if (!pending) {
      router.replace('/auth');
      return;
    }
    setEmail(pending);
  }, [router]);

  if (!email) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[rgb(112,130,56)]/10 to-[rgb(230,168,77)]/10 dark:from-stone-950 dark:to-stone-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 p-8 shadow-xl">
        <OtpVerify email={email} onSuccess={() => router.push('/')} />
      </div>
    </div>
  );
}
