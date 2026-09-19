'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/i18n/I18nProvider';
import { getIdeas, type IdeaListItem } from '@/lib/api';
import { Plus, Search, Users, CheckCircle2 } from 'lucide-react';

export default function IdeasBoardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [ideas, setIdeas] = useState<IdeaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getIdeas();
      setIdeas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(ideas.map((i) => i.category))).sort(),
    [ideas]
  );

  const filtered = useMemo(() => {
    return ideas.filter((idea) => {
      if (category && idea.category !== category) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        idea.title.toLowerCase().includes(q) ||
        idea.description.toLowerCase().includes(q) ||
        idea.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [ideas, search, category]);

  return (
    <DashboardLayout>
      <div className="theme-ideas min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
                {t('ideas.title')}
              </h1>
              <p className="text-sm sm:text-base text-[var(--ideas-muted)] mt-1">{t('ideas.subtitle')}</p>
            </div>
            <button
              onClick={() => router.push('/ideas/new')}
              className="px-4 py-2.5 rounded-lg font-medium bg-[var(--ideas-purple)] text-white hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {t('ideas.postIdea')}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ideas-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('ideas.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[var(--ideas-card)] border border-[var(--ideas-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ideas-purple)]"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-[var(--ideas-card)] border border-[var(--ideas-border)] text-sm"
              >
                <option value="">{t('ideas.allCategories')}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 rounded-full border-2 border-[var(--ideas-purple)] border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-[var(--ideas-card)] rounded-xl border border-[var(--ideas-border)] text-center">
              <p className="text-5xl mb-4">💡</p>
              <p className="text-[var(--ideas-muted)]">{t('ideas.noResults')}</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((idea) => {
                const openRoles = idea.roles.filter((r) => !r.filled);
                return (
                  <button
                    key={idea._id}
                    onClick={() => router.push(`/ideas/${idea._id}`)}
                    className="text-left bg-[var(--ideas-card)] border border-[var(--ideas-border)] rounded-xl p-5 hover:border-[var(--ideas-purple)] transition-colors"
                  >
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[var(--ideas-purple-dim)] text-[var(--ideas-purple)] mb-2">
                      {idea.category}
                    </span>
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-base mb-1">
                      {idea.title}
                    </h3>
                    <p className="text-sm text-[var(--ideas-muted)] line-clamp-2 mb-3">{idea.description}</p>
                    <p className="text-xs text-[var(--ideas-muted)] mb-3">
                      {t('ideas.detail.postedBy')} {idea.creator.firstName} {idea.creator.lastName}
                    </p>
                    {openRoles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {openRoles.slice(0, 3).map((r) => (
                          <span
                            key={r.title}
                            className="text-[11px] px-2 py-1 rounded-md bg-[var(--ideas-card2)] border border-[var(--ideas-border)]"
                          >
                            {r.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1.5 text-xs text-[var(--ideas-muted)] pt-3 border-t border-[var(--ideas-border)]">
                      {openRoles.length > 0 ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ideas-green)]" />
                          {t('ideas.spotsOpen').replace('{count}', String(openRoles.length))}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ideas-purple)]" />
                          {t('ideas.teamFull')}
                        </>
                      )}
                      <span className="ml-auto flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {idea.roles.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
