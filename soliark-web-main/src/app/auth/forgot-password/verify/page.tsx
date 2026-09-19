'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OtpVerify, {
  PENDING_RESET_EMAIL_KEY,
  RESET_OTP_RESEND_UNTIL_KEY,
  RESET_TOKEN_KEY,
} from '@/components/OtpVerify';
import { resendResetOtp, verifyResetOtp } from '@/lib/api';

export default function ForgotPasswordVerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_RESET_EMAIL_KEY);
    if (!pending) {
      router.replace('/auth/forgot-password');
      return;
    }
    setEmail(pending);
  }, [router]);

  if (!email) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[rgb(112,130,56)]/10 to-[rgb(230,168,77)]/10 px-4 dark:from-stone-950 dark:to-stone-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-stone-900">
        <OtpVerify
          email={email}
          titleKey="auth.resetCheckEmail"
          subtitleKey="auth.resetCodeSent"
          resendUntilKey={RESET_OTP_RESEND_UNTIL_KEY}
          clearKeysOnSuccess={[RESET_OTP_RESEND_UNTIL_KEY]}
          verifyFn={async (resetEmail, code) => {
            const { resetToken } = await verifyResetOtp(resetEmail, code);
            sessionStorage.setItem(RESET_TOKEN_KEY, resetToken);
          }}
          resendFn={resendResetOtp}
          onSuccess={() => router.push('/auth/forgot-password/reset')}
        />
      </div>
    </div>
  );
}
