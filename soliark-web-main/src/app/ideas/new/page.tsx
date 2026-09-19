'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/i18n/I18nProvider';
import { createIdea, type IdeaVisibility } from '@/lib/api';
import { Plus, X } from 'lucide-react';

export default function NewIdeaPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<IdeaVisibility>('all');
  const [roles, setRoles] = useState<string[]>(['']);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateRole = (index: number, value: string) => {
    setRoles((prev) => prev.map((r, i) => (i === index ? value : r)));
  };

  const removeRole = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const idea = await createIdea({
        title,
        description,
        category,
        visibility,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        roles: roles.filter((r) => r.trim()).map((title) => ({ title: title.trim() })),
      });
      router.push(`/ideas/${idea._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post idea');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg bg-[var(--ideas-card)] border border-[var(--ideas-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ideas-purple)]';
  const labelClass = 'block text-xs font-bold uppercase tracking-wide text-[var(--ideas-muted)] mb-1.5';

  return (
    <DashboardLayout>
      <div className="theme-ideas min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mb-6">
            {t('ideas.new.title')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>{t('ideas.new.titleLabel')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t('ideas.new.descriptionLabel')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('ideas.new.categoryLabel')}</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('ideas.new.visibilityLabel')}</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as IdeaVisibility)}
                  className={inputClass}
                >
                  <option value="all">{t('ideas.new.visibilityAll')}</option>
                  <option value="university">{t('ideas.new.visibilityUniversity')}</option>
                  <option value="selected">{t('ideas.new.visibilitySelected')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>{t('ideas.new.tagsLabel')}</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>{t('ideas.new.rolesLabel')}</label>
              <div className="space-y-2">
                {roles.map((role, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => updateRole(i, e.target.value)}
                      placeholder={t('ideas.new.roleTitlePlaceholder')}
                      className={inputClass}
                    />
                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRole(i)}
                        className="px-3 rounded-lg border border-[var(--ideas-border)] text-[var(--ideas-muted)] hover:text-red-500 hover:border-red-500/40"
                        aria-label="Remove role"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRoles((prev) => [...prev, ''])}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--ideas-purple)]"
              >
                <Plus className="w-4 h-4" />
                {t('ideas.new.addRole')}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg font-medium bg-[var(--ideas-purple)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? t('ideas.new.posting') : t('ideas.new.submit')}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
