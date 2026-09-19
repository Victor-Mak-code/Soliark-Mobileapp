'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Search, Video } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  formatStoryboardDuration,
  STORYBOARD_LIBRARY,
  type StoryboardTemplate,
} from '@/lib/storyboardLibrary';
import { useI18n } from '@/i18n/I18nProvider';

const AMBER = 'rgb(230,168,77)';

function StoryboardCard({
  storyboard,
  onEdit,
  onUseInVideo,
}: {
  storyboard: StoryboardTemplate;
  onEdit: (id: string) => void;
  onUseInVideo: (id: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-stone-100">
        <Image
          src={storyboard.coverImage}
          alt={storyboard.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>

      <div className="p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{storyboard.title}</h2>

        <div className="mt-2 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
          <span>{storyboard.sceneCount} scenes</span>
          <span>{formatStoryboardDuration(storyboard.durationSeconds)}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {storyboard.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onEdit(storyboard.id)}
            className="flex items-center justify-center gap-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-200 transition-colors hover:bg-stone-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onUseInVideo(storyboard.id)}
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: AMBER }}
          >
            <Video className="h-4 w-4" />
            Use in Video
          </button>
        </div>
      </div>
    </article>
  );
}

export default function StoryboardsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStoryboards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return STORYBOARD_LIBRARY;

    return STORYBOARD_LIBRARY.filter((storyboard) => {
      const haystack = [storyboard.title, ...storyboard.tags].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [searchQuery]);

  // Video generation now only happens from a Journal or Brainstorm entry — send
  // the user to Journals, where they can write it up and generate a video from it.
  const goCreateJournal = () => {
    router.push('/journals');
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100 sm:text-3xl">
            {t('storyboards.library')}
          </h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 sm:text-base">
            {t('storyboards.subtitle')}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('storyboards.search')}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 py-2.5 pl-10 pr-4 text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>

            <button
              type="button"
              onClick={goCreateJournal}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:shrink-0"
              style={{ backgroundColor: AMBER }}
            >
              <Plus className="h-4 w-4" />
              Create New
            </button>
          </div>
        </header>

        {filteredStoryboards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white dark:bg-stone-900 px-6 py-16 text-center">
            <p className="text-stone-600 dark:text-stone-300">{t('storyboards.empty')}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStoryboards.map((storyboard) => (
              <StoryboardCard
                key={storyboard.id}
                storyboard={storyboard}
                onEdit={goCreateJournal}
                onUseInVideo={goCreateJournal}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
