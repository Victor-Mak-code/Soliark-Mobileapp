'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Login from '@/components/Login';
import Signup from '@/components/Signup';
import { startVerificationFlow } from '@/components/OtpVerify';
import { useI18n } from '@/i18n/I18nProvider';

function AuthCard() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const showResetSuccess = searchParams.get('reset') === '1';

  const handleAuthSuccess = () => {
    router.push('/');
  };

  const handleNeedsVerification = (email: string) => {
    startVerificationFlow(email);
    router.push('/auth/verify');
  };

  return (
    <>
      {showResetSuccess && isLogin && (
        <div className="mb-4 rounded-lg border border-[rgb(112,130,56)]/30 bg-[rgb(112,130,56)]/10 p-3 text-sm text-[rgb(95,110,48)] dark:text-[rgb(180,200,110)]">
          {t('auth.resetSuccess')}
        </div>
      )}
      {isLogin ? (
        <Login
          onSuccess={handleAuthSuccess}
          onNeedsVerification={handleNeedsVerification}
          onSwitchToSignup={() => setIsLogin(false)}
        />
      ) : (
        <Signup
          onSuccess={handleNeedsVerification}
          onSwitchToLogin={() => setIsLogin(true)}
        />
      )}
    </>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(112,130,56)]/10 to-[rgb(230,168,77)]/10 dark:from-stone-950 dark:to-stone-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-xl p-8">
        <Suspense>
          <AuthCard />
        </Suspense>
      </div>
    </div>
  );
}
