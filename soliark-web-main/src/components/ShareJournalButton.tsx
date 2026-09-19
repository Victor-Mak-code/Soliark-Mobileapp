'use client';

import { useState } from 'react';
import ShareJournalModal from './ShareJournalModal';
import { Share2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export interface ShareJournalButtonProps {
  journalId: string;
  journalTitle?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable Share button that opens a modal to share the journal with a friend.
 * Use on the journal detail page or anywhere you have a single journal to share.
 */
export default function ShareJournalButton({
  journalId,
  journalTitle = 'Untitled',
  className = '',
  children,
}: ShareJournalButtonProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)] rounded-lg font-medium hover:bg-[rgb(112,130,56)]/30 transition-colors flex items-center gap-2'
        }
      >
        {children ?? (
          <>
            <Share2 className="w-4 h-4" />
            <span>{t('common.share')}</span>
          </>
        )}
      </button>
      <ShareJournalModal
        open={open}
        journalId={journalId}
        journalTitle={journalTitle}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
