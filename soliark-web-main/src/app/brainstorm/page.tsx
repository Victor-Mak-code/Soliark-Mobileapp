'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/i18n/I18nProvider';
import { getBrainstormSpaces, createBrainstormSpace, getFriends, type BrainstormSpace, type FriendListItem } from '@/lib/api';
import { Plus, Users } from 'lucide-react';

export default function BrainstormListPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [spaces, setSpaces] = useState<BrainstormSpace[]>([]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [spacesData, friendsRes] = await Promise.all([getBrainstormSpaces(), getFriends()]);
      setSpaces(spacesData);
      setFriends(friendsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const space = await createBrainstormSpace({ title, memberIds: selectedFriends });
      setShowModal(false);
      setTitle('');
      setSelectedFriends([]);
      router.push(`/brainstorm/${space._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create space');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="theme-ideas min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
                {t('brainstorm.title')}
              </h1>
              <p className="text-sm sm:text-base text-[var(--ideas-muted)] mt-1">{t('brainstorm.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-lg font-medium bg-[var(--ideas-purple)] text-white hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {t('brainstorm.newSpace')}
            </button>
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

          {!loading && spaces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-[var(--ideas-card)] rounded-xl border border-[var(--ideas-border)] text-center">
              <p className="text-5xl mb-4">🧠</p>
              <p className="text-[var(--ideas-muted)]">{t('brainstorm.noSpaces')}</p>
            </div>
          )}

          {!loading && spaces.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {spaces.map((space) => (
                <button
                  key={space._id}
                  onClick={() => router.push(`/brainstorm/${space._id}`)}
                  className="text-left bg-[var(--ideas-card)] border border-[var(--ideas-border)] rounded-xl p-5 hover:border-[var(--ideas-purple)] transition-colors"
                >
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-base mb-2">{space.title}</h3>
                  <p className="text-xs text-[var(--ideas-muted)] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {space.memberIds.length} member{space.memberIds.length !== 1 ? 's' : ''}
                    {space.ideaId ? ' · Workspace' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="theme-ideas bg-[var(--ideas-card)] rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
              {t('brainstorm.new.title')}
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--ideas-muted)] mb-1.5">
                  {t('brainstorm.new.titleLabel')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--ideas-card2)] border border-[var(--ideas-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ideas-purple)]"
                />
              </div>
              {friends.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[var(--ideas-muted)] mb-1.5">
                    {t('brainstorm.new.friendsLabel')}
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {friends.map((f) => (
                      <label
                        key={f.friend._id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--ideas-card2)] text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(f.friend._id)}
                          onChange={() => toggleFriend(f.friend._id)}
                        />
                        {f.friend.firstName} {f.friend.lastName}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-[var(--ideas-purple)] text-white disabled:opacity-50"
                >
                  {creating ? '...' : t('brainstorm.new.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-lg bg-[var(--ideas-card2)] border border-[var(--ideas-border)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
