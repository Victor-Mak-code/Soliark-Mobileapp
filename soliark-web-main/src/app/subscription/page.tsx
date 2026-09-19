'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Gamepad2,
  Monitor,
  Phone,
  Star,
  Tv,
  User,
  Users,
  Zap,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/components/ToastContext';
import { useI18n } from '@/i18n/I18nProvider';

const AMBER = 'rgb(230,168,77)';
const GREEN = 'rgb(112,130,56)';
const OLIVE = 'rgb(92,108,48)';
const ACCENT = 'rgb(193,88,58)';

type BillingCycle = 'monthly' | 'annual';
type PlanId = 'community' | 'professional' | 'enterprise';

interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  priceSuffix: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'community',
    name: 'Community',
    monthlyPrice: '$0',
    annualPrice: '$0',
    priceSuffix: '/month',
    description: 'Perfect for getting started with basic journal-to-video creation.',
    features: [
      'Low-bandwidth mode',
      'Text-to-audio (500k chars)',
      'Voice-to-text (60 mins)',
      '1 min video/month',
      'Multilingual UI',
      'Offline transcripts',
    ],
    cta: 'Get Started Free',
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: '$25',
    annualPrice: '$20',
    priceSuffix: '/month',
    description: 'Advanced features for content creators and professionals.',
    features: [
      'HD output (1080p+)',
      'AI voices & accents',
      'Watermark-free videos',
      '10-15 mins video/month',
      'Advanced transcription',
      'Subtitles & captions',
      'Community fund contribution',
    ],
    cta: 'Upgrade Now',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: '$250+',
    annualPrice: '$200+',
    priceSuffix: '/month',
    description: 'Custom solutions for teams and organizations.',
    features: [
      'Custom AI models',
      'API access',
      'Enterprise security',
      'Unlimited usage',
      'Dedicated account manager',
      'Priority support',
      'WCAG compliance',
    ],
    cta: 'Contact Sales',
  },
];

const PLAY_TOGETHER = [
  {
    title: 'Screen Sharing',
    description: 'Text-to-video & voice-to-video',
    icon: Monitor,
  },
  {
    title: 'Party Mode',
    description: 'Communal games & activities',
    icon: Gamepad2,
  },
  {
    title: 'Group Playback',
    description: 'Collaborative viewing sessions',
    icon: Users,
  },
];

interface ComparisonRow {
  label: string;
  community: string;
  professional: string;
  enterprise: string;
}

interface ComparisonSection {
  id: string;
  title: string;
  rows: ComparisonRow[];
}

const COMPARISON: ComparisonSection[] = [
  {
    id: 'core',
    title: 'Core Features',
    rows: [
      {
        label: 'Text-to-Audio',
        community: '500k characters/month',
        professional: '2M characters/month',
        enterprise: 'Unlimited',
      },
      {
        label: 'Voice-to-Text',
        community: '60 minutes/month',
        professional: '240 minutes/month',
        enterprise: 'Unlimited',
      },
      {
        label: 'Video Generation',
        community: '1 min/month (watermarked)',
        professional: '10-15 mins/month',
        enterprise: 'Custom limits',
      },
      {
        label: 'Video Quality',
        community: 'Low quality',
        professional: 'HD 1080p+',
        enterprise: 'Up to 8K',
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    rows: [
      {
        label: 'AI voices & accents',
        community: '—',
        professional: 'Included',
        enterprise: 'Custom voices',
      },
      {
        label: 'Watermark-free export',
        community: '—',
        professional: 'Included',
        enterprise: 'Included',
      },
      {
        label: 'Subtitles & captions',
        community: '—',
        professional: 'Included',
        enterprise: 'Included',
      },
      {
        label: 'Custom AI models',
        community: '—',
        professional: '—',
        enterprise: 'Included',
      },
      {
        label: 'API access',
        community: '—',
        professional: '—',
        enterprise: 'Included',
      },
    ],
  },
  {
    id: 'collaboration',
    title: 'Collaboration & Sharing',
    rows: [
      {
        label: 'Shared journals',
        community: 'Basic',
        professional: 'Unlimited',
        enterprise: 'Unlimited',
      },
      {
        label: 'Collaboration rooms',
        community: '1 room',
        professional: '10 rooms',
        enterprise: 'Unlimited',
      },
      {
        label: 'TV & group playback',
        community: '—',
        professional: 'Included',
        enterprise: 'Included',
      },
      {
        label: 'SSO / team admin',
        community: '—',
        professional: '—',
        enterprise: 'Included',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support & Services',
    rows: [
      {
        label: 'Support',
        community: 'Community',
        professional: 'Email',
        enterprise: 'Priority + dedicated manager',
      },
      {
        label: 'Security',
        community: 'Standard',
        professional: 'Standard',
        enterprise: 'Enterprise security',
      },
      {
        label: 'WCAG compliance',
        community: '—',
        professional: '—',
        enterprise: 'Included',
      },
    ],
  },
];

export default function SubscriptionPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    core: true,
  });

  const handleSelectPlan = (planId: PlanId) => {
    if (planId === 'community') {
      toast("You're on the Community plan", 'success');
      return;
    }
    if (planId === 'enterprise') {
      toast('Contact sales at hello@soliark.com to set up Enterprise', 'info');
      return;
    }
    toast('Professional billing is not connected yet', 'info');
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const planIcons = useMemo(
    () => ({
      community: User,
      professional: Zap,
      enterprise: Building2,
    }),
    []
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 pb-32 max-w-[1600px]">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-stone-100 mb-3">
            {t('subscription.title')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-stone-300 max-w-2xl mx-auto">
            {t('subscription.subtitle')}
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 px-2 py-1.5 shadow-sm">
            <span
              className={`text-sm font-medium px-2 ${
                billing === 'monthly' ? 'text-gray-900 dark:text-stone-100' : 'text-gray-500 dark:text-stone-400'
              }`}
            >
              {t('subscription.monthly')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billing === 'annual'}
              aria-label="Toggle annual billing"
              onClick={() =>
                setBilling((prev) => (prev === 'monthly' ? 'annual' : 'monthly'))
              }
              className="relative w-11 h-6 rounded-full flex-shrink-0"
              style={{ backgroundColor: billing === 'annual' ? AMBER : '#d1d5db' }}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-stone-900 rounded-full shadow transition-transform ${
                  billing === 'annual' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium px-2 ${
                billing === 'annual' ? 'text-gray-900 dark:text-stone-100' : 'text-gray-500 dark:text-stone-400'
              }`}
            >
              {t('subscription.annual')}
            </span>
            {billing === 'annual' && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: GREEN }}
              >
                {t('subscription.save20')}
              </span>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {PLANS.map((plan) => {
                const Icon = planIcons[plan.id];
                const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
                const checkColor =
                  plan.id === 'community' ? GREEN : plan.id === 'professional' ? AMBER : ACCENT;
                const iconWrap =
                  plan.id === 'community'
                    ? 'bg-[rgb(112,130,56)]/15 text-[rgb(112,130,56)]'
                    : plan.id === 'professional'
                      ? 'bg-[rgb(230,168,77)]/15 text-[rgb(230,168,77)]'
                      : 'bg-[rgb(193,88,58)]/15 text-[rgb(193,88,58)]';

                return (
                  <article
                    key={plan.id}
                    className={`relative bg-white dark:bg-stone-900 rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col ${
                      plan.popular ? 'border-[rgb(230,168,77)]' : 'border-gray-200 dark:border-stone-700'
                    }`}
                  >
                    {plan.popular && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                        style={{ backgroundColor: AMBER }}
                      >
                        <Star className="w-3 h-3 fill-white" />
                        {t('subscription.mostPopular')}
                      </div>
                    )}

                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${iconWrap}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-stone-100">{t(`subscription.${plan.id}` as 'subscription.community' | 'subscription.professional' | 'subscription.enterprise')}</h2>
                    <p className="mt-2 flex items-end gap-1">
                      <span className="text-3xl font-bold text-gray-900 dark:text-stone-100">{price}</span>
                      <span className="text-sm text-gray-500 dark:text-stone-400 mb-1">{t('subscription.perMonth')}</span>
                    </p>
                    {billing === 'annual' && plan.id === 'professional' && (
                      <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Billed $240 annually</p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-stone-300 mt-3 mb-5">{plan.description}</p>

                    <ul className="space-y-2.5 flex-1 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-stone-300">
                          <Check
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                            style={{ color: checkColor }}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 ${
                        plan.popular ? 'text-white' : 'border border-gray-200 dark:border-stone-700 bg-[#f5f0e6] dark:bg-stone-800 text-gray-800 dark:text-stone-100'
                      }`}
                      style={plan.popular ? { backgroundColor: AMBER } : undefined}
                    >
                      {plan.id === 'enterprise' && <Phone className="w-4 h-4" />}
                      {plan.id === 'community' && t('subscription.getStarted')}
                      {plan.id === 'professional' && t('subscription.upgrade')}
                      {plan.id === 'enterprise' && t('subscription.contactSales')}
                    </button>
                  </article>
                );
              })}
            </div>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-stone-100 text-center mb-5">
                {t('subscription.comparison')}
              </h2>
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-gray-200 dark:border-stone-700 shadow-sm overflow-hidden">
                <div className="hidden md:grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr] gap-3 px-5 py-3 bg-[#f8f4ec] dark:bg-stone-800 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-stone-400">
                  <span>Feature</span>
                  <span>{t('subscription.community')}</span>
                  <span>{t('subscription.professional')}</span>
                  <span>{t('subscription.enterprise')}</span>
                </div>
                {COMPARISON.map((section) => {
                  const open = Boolean(openSections[section.id]);
                  return (
                    <div key={section.id} className="border-t border-gray-200 dark:border-stone-700 first:border-t-0">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-stone-800"
                      >
                        <span className="font-semibold text-gray-800 dark:text-stone-100">{section.title}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 dark:text-stone-400 transition-transform ${
                            open ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {open && (
                        <div className="px-5 pb-4">
                          {section.rows.map((row) => (
                            <div
                              key={row.label}
                              className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr] gap-2 md:gap-3 py-3 border-t border-gray-100 dark:border-stone-800 text-sm"
                            >
                              <p className="font-medium text-gray-800 dark:text-stone-100">{row.label}</p>
                              <p className="text-gray-600 dark:text-stone-300">
                                <span className="md:hidden text-xs text-gray-400 dark:text-stone-400 mr-2">
                                  Community
                                </span>
                                {row.community}
                              </p>
                              <p className="text-gray-600 dark:text-stone-300">
                                <span className="md:hidden text-xs text-gray-400 dark:text-stone-400 mr-2">
                                  Professional
                                </span>
                                {row.professional}
                              </p>
                              <p className="text-gray-600 dark:text-stone-300">
                                <span className="md:hidden text-xs text-gray-400 dark:text-stone-400 mr-2">
                                  Enterprise
                                </span>
                                {row.enterprise}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside
            className="rounded-2xl p-5 text-white shadow-sm xl:sticky xl:top-6"
            style={{ backgroundColor: OLIVE }}
          >
            <div className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center mb-4">
              <Tv className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold">{t('subscription.playTogether')}</h2>
            <p className="text-sm text-white/80 mt-2 mb-6">
              Connect to TV &amp; Monitors for collaborative experiences.
            </p>
            <ul className="space-y-4 mb-6">
              {PLAY_TOGETHER.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-white/75">{item.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => toast('Play Together is coming soon', 'info')}
              className="w-full bg-white dark:bg-stone-900 text-gray-800 dark:text-stone-100 font-semibold py-2.5 rounded-lg text-sm inline-flex items-center justify-center gap-2 hover:opacity-90"
            >
              Learn More
              <ArrowRight className="w-4 h-4" />
            </button>
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 bg-white dark:bg-stone-900 border-t border-gray-200 dark:border-stone-700 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 dark:text-stone-100">{t('subscription.ready')}</p>
            <p className="text-sm text-gray-500 dark:text-stone-400">
              {t('subscription.readySub')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleSelectPlan('community')}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 dark:border-stone-700 bg-[#f5f0e6] dark:bg-stone-800 text-gray-800 dark:text-stone-100 hover:bg-[#efe9dc] dark:bg-stone-800 dark:hover:bg-stone-700"
            >
              {t('subscription.getStarted')}
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlan('professional')}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: AMBER }}
            >
              {t('subscription.upgrade')}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
