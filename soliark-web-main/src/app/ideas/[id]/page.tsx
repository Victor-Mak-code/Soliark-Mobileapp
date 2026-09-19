'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/i18n/I18nProvider';
import {
  getIdea,
  getCurrentUser,
  applyToRole,
  getIdeaApplications,
  acceptIdeaApplication,
  rejectIdeaApplication,
  getBrainstormSpaces,
  type IdeaListItem,
  type IdeaApplication,
} from '@/lib/api';
import { CheckCircle2, Users } from 'lucide-react';

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const [idea, setIdea] = useState<IdeaListItem | null>(null);
  const [applications, setApplications] = useState<IdeaApplication[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingRole, setApplyingRole] = useState<number | null>(null);
  const [actingAppId, setActingAppId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [ideaData, user] = await Promise.all([getIdea(id), getCurrentUser()]);
      setIdea(ideaData);
      const creator = user?.id === ideaData.creator._id;
      setIsCreator(creator);

      if (creator) {
        const apps = await getIdeaApplications(id);
        setApplications(apps);
      }

      const spaces = await getBrainstormSpaces();
      const space = spaces.find((s) => s.ideaId === id);
      setWorkspaceId(space?._id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load idea');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApply = async (roleIndex: number) => {
    setApplyingRole(roleIndex);
    setError('');
    try {
      await applyToRole(id, roleIndex);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply');
    } finally {
      setApplyingRole(null);
    }
  };

  const handleAccept = async (appId: string) => {
    setActingAppId(appId);
    try {
      await acceptIdeaApplication(appId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setActingAppId(null);
    }
  };

  const handleReject = async (appId: string) => {
    setActingAppId(appId);
    try {
      await rejectIdeaApplication(appId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActingAppId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="theme-ideas min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 max-w-3xl mx-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 rounded-full border-2 border-[var(--ideas-purple)] border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              {error}
            </div>
          )}

          {!loading && idea && (
            <>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[var(--ideas-purple-dim)] text-[var(--ideas-purple)] mb-3">
                {idea.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mb-2">
                {idea.title}
              </h1>
              <p className="text-sm text-[var(--ideas-muted)] mb-4">
                {t('ideas.detail.postedBy')} {idea.creator.firstName} {idea.creator.lastName}
              </p>
              <p className="text-[var(--ideas-text)] leading-relaxed mb-6">{idea.description}</p>

              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {idea.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-md bg-[var(--ideas-card2)] text-[var(--ideas-muted)]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {workspaceId && (
                <button
                  onClick={() => router.push(`/brainstorm/${workspaceId}`)}
                  className="mb-6 px-4 py-2 rounded-lg bg-[var(--ideas-green)]/15 text-[var(--ideas-green)] font-medium text-sm flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  {t('ideas.detail.workspaceLink')}
                </button>
              )}

              <div className="bg-[var(--ideas-card)] border border-[var(--ideas-border)] rounded-xl p-5 mb-6">
                <h2 className="font-[family-name:var(--font-display)] font-bold mb-3">
                  {t('ideas.new.rolesLabel')}
                </h2>
                <div className="space-y-2">
                  {idea.roles.map((role, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-[var(--ideas-card2)]"
                    >
                      <span className="text-sm font-medium">{role.title}</span>
                      {role.filled ? (
                        <span className="text-xs flex items-center gap-1 text-[var(--ideas-purple)]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('ideas.roleFilled')}
                        </span>
                      ) : isCreator ? (
                        <span className="text-xs text-[var(--ideas-green)]">Open</span>
                      ) : (
                        <button
                          onClick={() => handleApply(i)}
                          disabled={applyingRole === i}
                          className="text-xs px-3 py-1.5 rounded-md bg-[var(--ideas-purple)] text-white disabled:opacity-50"
                        >
                          {applyingRole === i ? '...' : t('ideas.apply')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isCreator && (
                <div className="bg-[var(--ideas-card)] border border-[var(--ideas-border)] rounded-xl p-5">
                  <h2 className="font-[family-name:var(--font-display)] font-bold mb-3">
                    {t('ideas.detail.applicants')}
                  </h2>
                  {applications.length === 0 ? (
                    <p className="text-sm text-[var(--ideas-muted)]">{t('ideas.detail.noApplicants')}</p>
                  ) : (
                    <div className="space-y-2">
                      {applications.map((app) => (
                        <div
                          key={app._id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-[var(--ideas-card2)]"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {app.applicant.firstName} {app.applicant.lastName}
                            </p>
                            <p className="text-xs text-[var(--ideas-muted)]">{app.roleTitle}</p>
                          </div>
                          {app.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAccept(app._id)}
                                disabled={actingAppId === app._id}
                                className="text-xs px-3 py-1.5 rounded-md bg-[var(--ideas-purple)] text-white disabled:opacity-50"
                              >
                                {t('ideas.detail.accept')}
                              </button>
                              <button
                                onClick={() => handleReject(app._id)}
                                disabled={actingAppId === app._id}
                                className="text-xs px-3 py-1.5 rounded-md bg-[var(--ideas-card2)] border border-[var(--ideas-border)] disabled:opacity-50"
                              >
                                {t('ideas.detail.reject')}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--ideas-muted)] capitalize">{app.status}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
