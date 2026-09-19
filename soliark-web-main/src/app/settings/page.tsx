'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Camera,
  Database,
  Download,
  KeyRound,
  Mail,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/components/ToastContext';
import OtpVerify, { EMAIL_CHANGE_OTP_RESEND_UNTIL_KEY } from '@/components/OtpVerify';
import {
  changePassword,
  confirmEmailChange,
  getCurrentUser,
  requestEmailChange,
  resendEmailChangeOtp,
} from '@/lib/api';
import { persistAndNotifyTheme } from '@/components/ThemeProvider';
import { persistAndNotifyLanguage, useI18n } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/translations';

const AMBER = 'rgb(230,168,77)';
const PROFILE_STORAGE_KEY = 'settings-profile';
const EXTRA_STORAGE_KEY = 'settings-extra';
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/gif', 'image/png'];

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'privacy' | 'account';

interface ProfileForm {
  fullName: string;
  email: string;
  location: string;
  website: string;
  bio: string;
  photoDataUrl: string;
}

interface PreferencesForm {
  theme: string;
  language: string;
  timezone: string;
  autoSave: boolean;
  videoQuality: string;
  audioQuality: string;
}

interface NotificationForm {
  email: boolean;
  push: boolean;
  share: boolean;
  collaboration: boolean;
  marketing: boolean;
  weeklyDigest: boolean;
}

interface PrivacyForm {
  visibility: string;
  shareAnalytics: boolean;
  searchIndexing: boolean;
  twoFactor: boolean;
}

const EMPTY_PROFILE: ProfileForm = {
  fullName: '',
  email: '',
  location: '',
  website: '',
  bio: '',
  photoDataUrl: '',
};

const DEFAULT_PREFERENCES: PreferencesForm = {
  theme: 'Light',
  language: 'English',
  timezone: 'Pacific Time (UTC-8)',
  autoSave: true,
  videoQuality: 'HD (720p)',
  audioQuality: 'High (320kbps)',
};

const DEFAULT_NOTIFICATIONS: NotificationForm = {
  email: true,
  push: true,
  share: true,
  collaboration: true,
  marketing: false,
  weeklyDigest: true,
};

const DEFAULT_PRIVACY: PrivacyForm = {
  visibility: 'Friends Only',
  shareAnalytics: false,
  searchIndexing: false,
  twoFactor: false,
};

const TABS: { id: SettingsTab; labelKey: MessageKey; icon: typeof User }[] = [
  { id: 'profile', labelKey: 'settings.tab.profile', icon: User },
  { id: 'preferences', labelKey: 'settings.tab.preferences', icon: SettingsIcon },
  { id: 'notifications', labelKey: 'settings.tab.notifications', icon: Bell },
  { id: 'privacy', labelKey: 'settings.tab.privacy', icon: Shield },
  { id: 'account', labelKey: 'settings.tab.account', icon: Database },
];

const NOTIFICATION_ITEMS: { key: keyof NotificationForm; title: string; description: string }[] = [
  { key: 'email', title: 'Email Notifications', description: 'Receive notifications via email' },
  { key: 'push', title: 'Push Notifications', description: 'Browser push notifications' },
  { key: 'share', title: 'Share Notifications', description: 'When content is shared with you' },
  { key: 'collaboration', title: 'Collaboration Updates', description: 'Comments and edits on shared items' },
  { key: 'marketing', title: 'Marketing Emails', description: 'Product updates and tips' },
  { key: 'weeklyDigest', title: 'Weekly Digest', description: 'Summary of your activity' },
];

const PRIVACY_TOGGLES: { key: keyof Omit<PrivacyForm, 'visibility'>; title: string; description: string }[] = [
  { key: 'shareAnalytics', title: 'Share Analytics', description: 'Help improve the app with usage data' },
  { key: 'searchIndexing', title: 'Search Engine Indexing', description: 'Allow search engines to index your public content' },
  { key: 'twoFactor', title: 'Two-Factor Authentication', description: 'Add an extra layer of security' },
];

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback;
  } catch {
    return fallback;
  }
}

function Field({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2.5 text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  icon,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string | { value: string; label: string }>;
  icon?: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">{label}</span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400">
            {icon}
          </span>
        )}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full appearance-none rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 py-2.5 pr-9 text-sm text-stone-700 dark:text-stone-200 focus:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200 ${
            icon ? 'pl-9' : 'pl-3'
          }`}
        >
          {options.map((option) => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-400">
          ▾
        </span>
      </div>
    </label>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        enabled ? '' : 'bg-stone-200 dark:bg-stone-600'
      }`}
      style={enabled ? { backgroundColor: AMBER } : undefined}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white dark:bg-stone-900 shadow-sm transition-transform ${
          enabled ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} label={title} />
    </div>
  );
}

function SaveButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      className={`mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-stone-800 dark:text-stone-100 transition-opacity hover:opacity-90 ${className ?? ''}`}
      style={{ backgroundColor: AMBER }}
    >
      <Save className="h-4 w-4" />
      {children}
    </button>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 shadow-sm sm:p-8">
      {children}
    </section>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [preferences, setPreferences] = useState<PreferencesForm>(DEFAULT_PREFERENCES);
  const [notifications, setNotifications] = useState<NotificationForm>(DEFAULT_NOTIFICATIONS);
  const [privacy, setPrivacy] = useState<PrivacyForm>(DEFAULT_PRIVACY);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<'form' | 'otp'>('form');
  const [emailPassword, setEmailPassword] = useState('');
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const extra = loadJson(EXTRA_STORAGE_KEY, {
      preferences: DEFAULT_PREFERENCES,
      notifications: DEFAULT_NOTIFICATIONS,
      privacy: DEFAULT_PRIVACY,
    });

    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        const stored = loadJson(PROFILE_STORAGE_KEY, EMPTY_PROFILE);
        setProfile({
          fullName:
            stored.fullName ||
            (user ? `${user.firstName} ${user.lastName}`.trim() : ''),
          email: user?.email || stored.email || '',
          location: stored.location || '',
          website: stored.website || '',
          bio: stored.bio || '',
          photoDataUrl: stored.photoDataUrl || '',
        });
        setPreferences({ ...DEFAULT_PREFERENCES, ...extra.preferences });
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...extra.notifications });
        setPrivacy({ ...DEFAULT_PRIVACY, ...extra.privacy });
      })
      .catch(() => {
        if (cancelled) return;
        const stored = loadJson(PROFILE_STORAGE_KEY, EMPTY_PROFILE);
        setProfile(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...extra.preferences });
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...extra.notifications });
        setPrivacy({ ...DEFAULT_PRIVACY, ...extra.privacy });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persistExtra = (next?: {
    preferences?: PreferencesForm;
    notifications?: NotificationForm;
    privacy?: PrivacyForm;
  }) => {
    localStorage.setItem(
      EXTRA_STORAGE_KEY,
      JSON.stringify({
        preferences: next?.preferences ?? preferences,
        notifications: next?.notifications ?? notifications,
        privacy: next?.privacy ?? privacy,
      })
    );
  };

  const updateField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast(t('settings.photoTypeError'), 'error');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast(t('settings.photoSizeError'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField('photoDataUrl', typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (event: FormEvent) => {
    event.preventDefault();
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    toast(t('settings.profileSaved'), 'success');
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSaving(false);
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setEmailStep('form');
    setEmailPassword('');
    setPendingNewEmail('');
    setEmailError('');
    setEmailSaving(false);
    sessionStorage.removeItem(EMAIL_CHANGE_OTP_RESEND_UNTIL_KEY);
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.passwordMismatch'));
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast(t('settings.passwordUpdated'), 'success');
      closePasswordModal();
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRequestEmailChange = async (event: FormEvent) => {
    event.preventDefault();
    setEmailError('');
    setEmailSaving(true);
    try {
      const result = await requestEmailChange(emailPassword, pendingNewEmail);
      const nextEmail = result.email || pendingNewEmail.trim().toLowerCase();
      setPendingNewEmail(nextEmail);
      sessionStorage.setItem(
        EMAIL_CHANGE_OTP_RESEND_UNTIL_KEY,
        String(Date.now() + 90 * 1000)
      );
      setEmailStep('otp');
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSavePreferences = () => {
    persistExtra({ preferences });
    persistAndNotifyTheme(preferences.theme);
    persistAndNotifyLanguage(preferences.language);
    toast(t('settings.prefsSaved'), 'success');
  };

  const handleSaveNotifications = () => {
    persistExtra({ notifications });
    toast(t('settings.notifSaved'), 'success');
  };

  const handleSavePrivacy = () => {
    persistExtra({ privacy });
    toast(t('settings.privacySaved'), 'success');
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(t('settings.deleteConfirm'));
    if (confirmed) {
      toast(t('settings.deleteUnavailable'), 'info');
    }
  };

  const initials =
    profile.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100 sm:text-3xl">{t('settings.title')}</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 sm:text-base">
            {t('settings.subtitle')}
          </p>
        </header>

        <div className="mb-6 overflow-x-auto rounded-full bg-[#e8dcc8] dark:bg-stone-800 p-1.5">
          <div className="flex min-w-max gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 shadow-sm'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:text-stone-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{t('settings.profileInfo')}</h2>

            {loading ? (
              <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">{t('settings.loadingProfile')}</p>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                    {profile.photoDataUrl ? (
                      <img
                        src={profile.photoDataUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-stone-600 dark:text-stone-300">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/gif,image/png"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-stone-400 dark:border-stone-600 bg-[#f3ead9] dark:bg-stone-800 px-3.5 py-2 text-sm font-medium text-stone-800 dark:text-stone-100 transition-colors hover:bg-[#eee2cc] dark:hover:bg-stone-700"
                    >
                      <Camera className="h-4 w-4" />
                      {t('settings.changePhoto')}
                    </button>
                    <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">{t('settings.photoHint')}</p>
                  </div>
                </div>

                <div className="my-6 border-t border-stone-200 dark:border-stone-700" />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label={t('settings.fullName')}
                    value={profile.fullName}
                    placeholder="John Doe"
                    onChange={(value) => updateField('fullName', value)}
                  />
                  <div>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">
                        {t('settings.email')}
                      </span>
                      <input
                        type="email"
                        value={profile.email}
                        readOnly
                        className="w-full cursor-default rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                      />
                    </label>
                    <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                      {t('settings.emailReadOnlyHint')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailStep('form');
                        setEmailModalOpen(true);
                      }}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-[#f3ead9] px-3 py-2 text-sm font-medium text-stone-800 hover:bg-[#eee2cc] dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                    >
                      <Mail className="h-4 w-4" />
                      {t('settings.changeEmail')}
                    </button>
                  </div>
                  <Field
                    label={t('settings.location')}
                    value={profile.location}
                    placeholder="City, Country"
                    onChange={(value) => updateField('location', value)}
                  />
                  <Field
                    label={t('settings.website')}
                    value={profile.website}
                    type="url"
                    placeholder="https://yourwebsite.com"
                    onChange={(value) => updateField('website', value)}
                  />
                </div>

                <label className="mt-5 block">
                  <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">{t('settings.bio')}</span>
                  <textarea
                    value={profile.bio}
                    placeholder="Tell us about yourself..."
                    rows={5}
                    onChange={(event) => updateField('bio', event.target.value)}
                    className="w-full resize-y rounded-lg border border-stone-200 dark:border-stone-700 bg-[#f3ead9] dark:bg-stone-800 px-3 py-2.5 text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200"
                  />
                </label>

                <div className="my-6 border-t border-stone-200 dark:border-stone-700" />

                <h3 className="text-base font-semibold text-stone-800 dark:text-stone-100">
                  {t('settings.securityActions')}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-[#f3ead9] px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-[#eee2cc] dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                  >
                    <KeyRound className="h-4 w-4" />
                    {t('settings.changePassword')}
                  </button>
                  <SaveButton className="!mt-0">{t('settings.saveChanges')}</SaveButton>
                </div>
              </>
            )}
          </form>
        )}

        {activeTab === 'preferences' && (
          <SettingsCard>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{t('settings.general')}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <SelectField
                label={t('settings.theme')}
                value={preferences.theme}
                options={[
                  { value: 'Light', label: t('theme.Light') },
                  { value: 'Dark', label: t('theme.Dark') },
                  { value: 'System', label: t('theme.System') },
                ]}
                icon={<Sun className="h-4 w-4" />}
                onChange={(theme) => {
                  setPreferences((prev) => ({ ...prev, theme }));
                  persistAndNotifyTheme(theme);
                }}
              />
              <SelectField
                label={t('settings.language')}
                value={preferences.language}
                options={[
                  { value: 'English', label: t('lang.English') },
                  { value: 'Spanish', label: t('lang.Spanish') },
                  { value: 'French', label: t('lang.French') },
                ]}
                onChange={(language) => {
                  setPreferences((prev) => ({ ...prev, language }));
                  persistAndNotifyLanguage(language);
                }}
              />
              <SelectField
                label={t('settings.timezone')}
                value={preferences.timezone}
                options={[
                  'Pacific Time (UTC-8)',
                  'Mountain Time (UTC-7)',
                  'Central Time (UTC-6)',
                  'Eastern Time (UTC-5)',
                  'UTC',
                ]}
                onChange={(timezone) => setPreferences((prev) => ({ ...prev, timezone }))}
              />
              <div className="flex items-center justify-between rounded-lg py-1">
                <div>
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{t('settings.autoSave')}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{t('settings.autoSaveHint')}</p>
                </div>
                <Toggle
                  enabled={preferences.autoSave}
                  onChange={(autoSave) => setPreferences((prev) => ({ ...prev, autoSave }))}
                  label={t('settings.autoSave')}
                />
              </div>
            </div>

            <div className="my-6 border-t border-stone-200 dark:border-stone-700" />

            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{t('settings.exportQuality')}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <SelectField
                label={t('settings.videoQuality')}
                value={preferences.videoQuality}
                options={['SD (480p)', 'HD (720p)', 'Full HD (1080p)', '4K']}
                onChange={(videoQuality) => setPreferences((prev) => ({ ...prev, videoQuality }))}
              />
              <SelectField
                label={t('settings.audioQuality')}
                value={preferences.audioQuality}
                options={['Standard (128kbps)', 'High (320kbps)']}
                onChange={(audioQuality) => setPreferences((prev) => ({ ...prev, audioQuality }))}
              />
            </div>
            <SaveButton onClick={handleSavePreferences}>{t('settings.savePreferences')}</SaveButton>
          </SettingsCard>
        )}

        {activeTab === 'notifications' && (
          <SettingsCard>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{t('settings.notifTitle')}</h2>
            <div className="mt-2 divide-y divide-stone-100">
              {NOTIFICATION_ITEMS.map((item) => (
                <ToggleRow
                  key={item.key}
                  title={t(`notif.${item.key}.title` as MessageKey)}
                  description={t(`notif.${item.key}.desc` as MessageKey)}
                  enabled={notifications[item.key]}
                  onChange={(value) =>
                    setNotifications((prev) => ({ ...prev, [item.key]: value }))
                  }
                />
              ))}
            </div>
            <SaveButton onClick={handleSaveNotifications}>{t('settings.saveNotif')}</SaveButton>
          </SettingsCard>
        )}

        {activeTab === 'privacy' && (
          <SettingsCard>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{t('settings.privacyTitle')}</h2>
            <div className="mt-5 max-w-md">
              <SelectField
                label={t('settings.profileVisibility')}
                value={privacy.visibility}
                options={[
                  { value: 'Public', label: t('visibility.Public') },
                  { value: 'Friends Only', label: t('visibility.Friends Only') },
                  { value: 'Private', label: t('visibility.Private') },
                ]}
                onChange={(visibility) => setPrivacy((prev) => ({ ...prev, visibility }))}
              />
            </div>
            <div className="mt-2 divide-y divide-stone-100">
              {PRIVACY_TOGGLES.map((item) => (
                <ToggleRow
                  key={item.key}
                  title={t(`privacy.${item.key}.title` as MessageKey)}
                  description={t(`privacy.${item.key}.desc` as MessageKey)}
                  enabled={privacy[item.key]}
                  onChange={(value) => setPrivacy((prev) => ({ ...prev, [item.key]: value }))}
                />
              ))}
            </div>

            <div className="my-6 border-t border-stone-200 dark:border-stone-700" />

            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{t('settings.securityActions')}</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-[#f3ead9] dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 hover:bg-[#eee2cc] dark:hover:bg-stone-700"
              >
                <KeyRound className="h-4 w-4" />
                {t('settings.changePassword')}
              </button>
              <button
                type="button"
                onClick={() => router.push('/export')}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-[#f3ead9] dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 hover:bg-[#eee2cc] dark:hover:bg-stone-700"
              >
                <Download className="h-4 w-4" />
                {t('settings.downloadData')}
              </button>
            </div>
            <SaveButton onClick={handleSavePrivacy}>{t('settings.savePrivacy')}</SaveButton>
          </SettingsCard>
        )}

        {activeTab === 'account' && (
          <SettingsCard>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{t('settings.accountMgmt')}</h2>
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-3 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{t('settings.exportData')}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{t('settings.exportDataHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/export')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-[#f3ead9] dark:bg-stone-800 px-4 py-2 text-sm font-medium text-stone-800 dark:text-stone-100 hover:bg-[#eee2cc] dark:hover:bg-stone-700"
                >
                  <Download className="h-4 w-4" />
                  {t('settings.export')}
                </button>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{t('settings.usage')}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{t('settings.usageHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Storage: 1.2 GB of 10 GB used', 'info')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-[#f3ead9] dark:bg-stone-800 px-4 py-2 text-sm font-medium text-stone-800 dark:text-stone-100 hover:bg-[#eee2cc] dark:hover:bg-stone-700"
                >
                  <Database className="h-4 w-4" />
                  {t('settings.viewUsage')}
                </button>
              </div>
            </div>

            <div className="my-6 border-t border-stone-200 dark:border-stone-700" />

            <h2 className="text-lg font-semibold text-[#c45c54]">{t('settings.danger')}</h2>
            <div className="mt-4 rounded-xl border border-[#c45c54]/50 px-4 py-4">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{t('settings.deleteAccount')}</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {t('settings.deleteHint')}
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#c45c54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b04f48]"
              >
                <Trash2 className="h-4 w-4" />
                {t('settings.deleteAccount')}
              </button>
            </div>
          </SettingsCard>
        )}
      </div>

      {passwordModalOpen && (
        <ModalShell title={t('settings.passwordModalTitle')} onClose={closePasswordModal}>
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
            {t('settings.passwordModalSubtitle')}
          </p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">
                {t('settings.currentPassword')}
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">
                {t('settings.newPassword')}
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">
                {t('settings.confirmNewPassword')}
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>
            {passwordError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {passwordError}
              </div>
            )}
            <button
              type="submit"
              disabled={passwordSaving}
              className="w-full rounded-lg bg-[rgb(112,130,56)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(95,110,48)] disabled:opacity-50"
            >
              {passwordSaving ? t('auth.resetting') : t('settings.changePassword')}
            </button>
          </form>
        </ModalShell>
      )}

      {emailModalOpen && (
        <ModalShell title={t('settings.emailModalTitle')} onClose={closeEmailModal}>
          {emailStep === 'form' ? (
            <>
              <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
                {t('settings.emailModalSubtitle')}
              </p>
              <form onSubmit={handleRequestEmailChange} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">
                    {t('settings.currentPassword')}
                  </span>
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">
                    {t('settings.newEmail')}
                  </span>
                  <input
                    type="email"
                    value={pendingNewEmail}
                    onChange={(e) => setPendingNewEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
                {emailError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                    {emailError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={emailSaving}
                  className="w-full rounded-lg bg-[rgb(112,130,56)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(95,110,48)] disabled:opacity-50"
                >
                  {emailSaving ? t('auth.forgotSending') : t('settings.sendCode')}
                </button>
              </form>
            </>
          ) : (
            <OtpVerify
              email={pendingNewEmail}
              titleKey="settings.emailOtpTitle"
              subtitleKey="settings.emailOtpSubtitle"
              resendUntilKey={EMAIL_CHANGE_OTP_RESEND_UNTIL_KEY}
              clearKeysOnSuccess={[EMAIL_CHANGE_OTP_RESEND_UNTIL_KEY]}
              verifyFn={async (_email, code) => {
                const result = await confirmEmailChange(code);
                if (result.data?.email) {
                  setProfile((prev) => ({ ...prev, email: result.data!.email }));
                }
              }}
              resendFn={async () => {
                await resendEmailChangeOtp();
              }}
              onSuccess={() => {
                toast(t('settings.emailUpdated'), 'success');
                closeEmailModal();
              }}
            />
          )}
        </ModalShell>
      )}
    </DashboardLayout>
  );
}
