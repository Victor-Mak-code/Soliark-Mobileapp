'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useI18n } from '@/i18n/I18nProvider';

interface TextToSpeechControlsProps {
  text: string;
  onClose?: () => void;
  autoPlay?: boolean;
}

export default function TextToSpeechControls({ text, onClose, autoPlay = false }: TextToSpeechControlsProps) {
  const { t } = useI18n();
  const {
    isPlaying,
    isPaused,
    availableVoices,
    play,
    pause,
    resume,
    stop,
    setRate,
    setVoice,
    rate,
    selectedVoice,
    isSupported,
  } = useTextToSpeech();

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (autoPlay && text && isSupported) {
      play(text);
    }
  }, [autoPlay, text, isSupported, play]);

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {t('tts.unsupported')}
        </p>
      </div>
    );
  }

  const handlePlayPause = () => {
    if (!isPlaying) {
      play(text);
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-[rgb(112,130,56)]/30 rounded-lg p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-stone-100 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-[rgb(112,130,56)]" />
          {t('tts.title')}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-stone-400 hover:text-gray-600 dark:text-stone-300 transition-colors"
            aria-label={t('common.close')}
          >
            <span className="text-xl">×</span>
          </button>
        )}
      </div>

      {/* Main Controls */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handlePlayPause}
          disabled={!text.trim()}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            isPlaying && !isPaused
              ? 'bg-[rgb(230,168,77)] text-white hover:bg-[rgb(220,158,67)]'
              : 'bg-[rgb(112,130,56)] text-white hover:bg-[rgb(95,110,48)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPlaying && !isPaused ? (
            <>
              <Pause className="w-4 h-4" />
              <span>{t('tts.pause')}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>{isPaused ? t('tts.resume') : t('tts.play')}</span>
            </>
          )}
        </button>

        <button
          onClick={stop}
          disabled={!isPlaying && !isPaused}
          className="px-4 py-2 bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Square className="w-4 h-4" />
          <span>{t('tts.stop')}</span>
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="ml-auto px-3 py-2 text-sm text-gray-600 dark:text-stone-300 hover:text-gray-800 dark:text-stone-100 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors"
        >
          {showAdvanced ? t('tts.optionsHide') : t('tts.optionsShow')}
        </button>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="border-t border-gray-200 dark:border-stone-700 pt-4 space-y-4">
          {/* Speed Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              {t('tts.speed')}: {rate}x
            </label>
            <div className="flex gap-2 flex-wrap">
              {speedOptions.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setRate(speed)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    rate === speed
                      ? 'bg-[rgb(112,130,56)] text-white'
                      : 'bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 dark:bg-stone-700'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          {availableVoices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                {t('tts.voice')}
              </label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = availableVoices.find(v => v.name === e.target.value) || null;
                  setVoice(voice);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent text-sm bg-white dark:bg-stone-900"
              >
                {availableVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          {isPlaying && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-stone-300">
              <div className="w-2 h-2 bg-green-50 dark:bg-green-9500 rounded-full animate-pulse"></div>
              <span>{t('tts.reading')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

