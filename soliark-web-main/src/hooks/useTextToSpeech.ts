import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTextToSpeechOptions {
  rate?: number; // Speech rate (0.1 to 10, default 1)
  pitch?: number; // Speech pitch (0 to 2, default 1)
  volume?: number; // Speech volume (0 to 1, default 1)
  voice?: SpeechSynthesisVoice | null;
}

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string;
  availableVoices: SpeechSynthesisVoice[];
  play: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  rate: number;
  selectedVoice: SpeechSynthesisVoice | null;
  isSupported: boolean;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRate] = useState(options.rate || 1);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(options.voice || null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Set default voice if not already set
      if (!selectedVoice && voices.length > 0) {
        // Prefer English voices, or first available
        const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        setSelectedVoice(englishVoice);
      }
    };

    loadVoices();
    
    // Voices may load asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Cleanup
    return () => {
      if (window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported, selectedVoice]);

  // Handle page visibility changes (pause when tab is hidden)
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && !isPaused) {
        pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, isPaused, isSupported]);

  const play = useCallback((text: string) => {
    if (!isSupported || !text.trim()) {
      console.warn('Text-to-speech not supported or no text provided');
      return;
    }

    // Stop any current speech
    stop();

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Set up event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentText(text);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentText('');
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      // Some browsers fire error events even when speech works correctly
      // Only handle critical errors that actually stop speech
      if (event.error) {
        // Check if it's a critical error
        const errorType = event.error;
        // 'network', 'synthesis', 'synthesis-unavailable', 'audio-busy', 'not-allowed'
        if (errorType === 'not-allowed' || errorType === 'synthesis-unavailable') {
          console.error('Speech synthesis error:', event.error, event);
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentText('');
          utteranceRef.current = null;
        } else {
          // For other errors, just log a warning (speech might still work)
          console.warn('Speech synthesis warning:', event.error);
        }
      } else {
        // Empty error object - often a false positive, ignore it
        // Speech is likely still working
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, rate, selectedVoice, options.pitch, options.volume]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported, isPlaying, isPaused]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    
    if (isPlaying && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported, isPlaying, isPaused]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentText('');
    utteranceRef.current = null;
  }, [isSupported]);

  const handleSetRate = useCallback((newRate: number) => {
    setRate(newRate);
    // If currently playing, update the utterance
    if (utteranceRef.current && isPlaying && !isPaused) {
      utteranceRef.current.rate = newRate;
    }
  }, [isPlaying, isPaused]);

  const handleSetVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
    // If currently playing, update the utterance
    if (utteranceRef.current && isPlaying && !isPaused) {
      utteranceRef.current.voice = voice;
    }
  }, [isPlaying, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    isPlaying,
    isPaused,
    currentText,
    availableVoices,
    play,
    pause,
    resume,
    stop,
    setRate: handleSetRate,
    setVoice: handleSetVoice,
    rate,
    selectedVoice,
    isSupported,
  };
}

