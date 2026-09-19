'use client';

import { useEffect, useRef, useState } from 'react';
import { resendOtp, verifyOtp } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/translations';

export const PENDING_VERIFY_EMAIL_KEY = 'pendingVerifyEmail';
export const OTP_RESEND_UNTIL_KEY = 'otpResendUntil';
export const PENDING_RESET_EMAIL_KEY = 'pendingResetEmail';
export const RESET_OTP_RESEND_UNTIL_KEY = 'resetOtpResendUntil';
export const RESET_TOKEN_KEY = 'passwordResetToken';
export const EMAIL_CHANGE_OTP_RESEND_UNTIL_KEY = 'emailChangeOtpResendUntil';
const OTP_LENGTH = 6;
const RESEND_SECONDS = 90;

export function startVerificationFlow(email: string): void {
  sessionStorage.setItem(PENDING_VERIFY_EMAIL_KEY, email);
  sessionStorage.setItem(OTP_RESEND_UNTIL_KEY, String(Date.now() + RESEND_SECONDS * 1000));
}

export function startPasswordResetFlow(email: string): void {
  sessionStorage.setItem(PENDING_RESET_EMAIL_KEY, email);
  sessionStorage.setItem(RESET_OTP_RESEND_UNTIL_KEY, String(Date.now() + RESEND_SECONDS * 1000));
  sessionStorage.removeItem(RESET_TOKEN_KEY);
}

function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface OtpVerifyProps {
  email: string;
  onSuccess: () => void;
  verifyFn?: (email: string, code: string) => Promise<void>;
  resendFn?: (email: string) => Promise<unknown>;
  titleKey?: MessageKey;
  subtitleKey?: MessageKey;
  resendUntilKey?: string;
  clearKeysOnSuccess?: string[];
}

export default function OtpVerify({
  email,
  onSuccess,
  verifyFn,
  resendFn,
  titleKey = 'auth.checkEmail',
  subtitleKey = 'auth.codeSent',
  resendUntilKey = OTP_RESEND_UNTIL_KEY,
  clearKeysOnSuccess = [PENDING_VERIFY_EMAIL_KEY, OTP_RESEND_UNTIL_KEY],
}: OtpVerifyProps) {
  const { t } = useI18n();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submittingRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const until = Number(sessionStorage.getItem(resendUntilKey) || 0);
      setSecondsLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [resendUntilKey]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submitCode = async (code: string) => {
    if (submittingRef.current || code.length !== OTP_LENGTH) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      if (verifyFn) {
        await verifyFn(email, code);
      } else {
        await verifyOtp(email, code);
      }
      clearKeysOnSuccess.forEach((key) => sessionStorage.removeItem(key));
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const joined = next.join('');
    if (joined.length === OTP_LENGTH && next.every(Boolean)) {
      void submitCode(joined);
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === OTP_LENGTH) {
      void submitCode(pasted);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      if (resendFn) {
        await resendFn(email);
      } else {
        await resendOtp(email);
      }
      sessionStorage.setItem(resendUntilKey, String(Date.now() + RESEND_SECONDS * 1000));
      setSecondsLeft(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const canResend = secondsLeft === 0 && !resending && !loading;

  return (
    <div className="w-full max-w-md">
      <h2 className="mb-2 text-3xl font-semibold text-[rgb(112,130,56)]">{t(titleKey)}</h2>
      <p className="mb-6 text-gray-600 dark:text-stone-400">
        {t(subtitleKey, { email })}
      </p>

      <div className="mb-6 flex justify-between gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={loading}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className="h-12 w-10 rounded-lg border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-center text-lg font-semibold text-stone-800 dark:text-stone-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] sm:h-14 sm:w-12"
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!canResend}
        onClick={handleResend}
        className="w-full rounded-lg bg-[rgb(112,130,56)] px-4 py-3 font-medium text-white transition-colors hover:bg-[rgb(95,110,48)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {resending
          ? t('auth.sending')
          : secondsLeft > 0
            ? t('auth.resendIn', { time: formatCountdown(secondsLeft) })
            : t('auth.resendOtp')}
      </button>

      {loading && <p className="mt-4 text-center text-sm text-gray-500 dark:text-stone-400">{t('auth.verifying')}</p>}
    </div>
  );
}
