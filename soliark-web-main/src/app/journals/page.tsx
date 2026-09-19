'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import TextToSpeechControls from '@/components/TextToSpeechControls';
import { createJournal, getJournals, updateJournal, uploadAudio, uploadImage, uploadDocument, type Journal, type CreateJournalData } from '@/lib/api';
import { Mic, MicOff, Upload, FileText, Image as ImageIcon, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import WriteupEditor from '@/components/editor/WriteupEditor';
import { hasWriteupContent, htmlToPlainText } from '@/components/editor/htmlUtils';

export default function JournalsPage() {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [currentJournal, setCurrentJournal] = useState<Journal | null>(null);
  const [activeMode, setActiveMode] = useState<'write' | 'voice' | 'upload'>('write');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [showTTS, setShowTTS] = useState(false);

  useEffect(() => {
    setCharacterCount(htmlToPlainText(content).length);
  }, [content]);

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [audioUrl, filePreviewUrl]);

  const handleSave = async () => {
    if (!hasWriteupContent(content)) {
      setError('Please enter some content');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const journalData: CreateJournalData = {
        title: title.trim() || undefined,
        content,
        type: 'text',
      };

      if (currentJournal) {
        await updateJournal(currentJournal._id, { 
          title: title.trim() || undefined,
          content,
        });
        setSuccess('Journal updated successfully');
      } else {
        const response = await createJournal(journalData);
        if (response.data) {
          setCurrentJournal(response.data as Journal);
          setSuccess('Journal saved successfully');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save journal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleListen = () => {
    if (!hasWriteupContent(content)) {
      setError('Please enter some content to listen');
      return;
    }
    setShowTTS(true);
    setError('');
  };

  const handleConvertToVideo = () => {
    if (!hasWriteupContent(content)) {
      setError('Please enter some content to convert');
      return;
    }
    // TODO: Implement convert to video functionality
    console.log('Convert to video');
  };

  const handleWriteJournal = () => {
    setActiveMode('write');
    setTitle('');
    setContent('');
    setCurrentJournal(null);
    setError('');
    setSuccess('');
    // Clean up audio recording state
    if (isRecording) {
      stopRecording();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingTime(0);
    // Clean up upload state
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setUploadTitle('');
    setFilePreviewUrl(null);
  };

  const handleUploadFile = () => {
    setActiveMode('upload');
    setError('');
    setSuccess('');
    // Clean up other modes
    if (isRecording) {
      stopRecording();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingTime(0);
    setTitle('');
    setContent('');
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isDocument = ['application/pdf', 'application/epub+zip', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'].includes(file.type);

    if (!isImage && !isDocument) {
      setError('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP) or document (PDF, EPUB, DOC, DOCX)');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Create preview URL for images
    if (isImage) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Determine if it's an image or document
      const isImage = selectedFile.type.startsWith('image/');
      const isDocument = ['application/pdf', 'application/epub+zip', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'].includes(selectedFile.type);
      
      let response;
      if (isImage) {
        response = await uploadImage(selectedFile, uploadTitle.trim() || undefined);
      } else {
        response = await uploadDocument(selectedFile, uploadTitle.trim() || undefined);
      }

      if (response.data) {
        setSuccess(`${isImage ? 'Image' : 'Document'} uploaded successfully!`);
        setSelectedFile(null);
        setUploadTitle('');
        // Redirect to library after a short delay
        setTimeout(() => {
          window.location.href = '/library';
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelUpload = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setUploadTitle('');
    setFilePreviewUrl(null);
    setError('');
    setSuccess('');
  };

  const handleVoiceInput = () => {
    setActiveMode('voice');
    setError('');
    setSuccess('');
    // Clean up upload state
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setUploadTitle('');
    setFilePreviewUrl(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Failed to access microphone. Please check your permissions.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSaveRecording = async () => {
    if (!audioBlob) {
      setError('No recording to save');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      const response = await uploadAudio(audioFile, title.trim() || undefined);

      if (response.data) {
        setSuccess('Audio saved successfully!');
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setTitle('');
        setTimeout(() => {
          window.location.href = '/library';
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save audio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadAudioFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate it's actually an audio file
      if (!file.type.startsWith('audio/')) {
        setError('Invalid file type. Only audio files are allowed.');
        return;
      }

      setIsSaving(true);
      setError('');
      setSuccess('');

      try {
        const response = await uploadAudio(file, title.trim() || undefined);

        if (response.data) {
          setSuccess('Audio uploaded successfully!');
          setTitle('');
          setTimeout(() => {
            window.location.href = '/library';
          }, 1500);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to upload audio');
      } finally {
        setIsSaving(false);
      }
    };
    input.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    setError('');
    setSuccess('');
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-stone-100 mb-2">{t('journals.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-stone-300">
            {t('journals.subtitle')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleWriteJournal}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <span>📄</span>
            <span>{t('journals.writeJournal')}</span>
          </button>
          <button
            onClick={handleUploadFile}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base ${
              activeMode === 'upload'
                ? 'bg-[rgb(112,130,56)] text-white border-2 border-[rgb(112,130,56)] hover:bg-[rgb(95,110,48)]'
                : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 border border-gray-300 dark:border-stone-600 hover:bg-gray-50 dark:hover:bg-stone-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{t('journals.uploadFile')}</span>
          </button>
          <button
            onClick={handleVoiceInput}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base ${
              activeMode === 'voice'
                ? 'bg-[rgb(112,130,56)] text-white border-2 border-[rgb(112,130,56)] hover:bg-[rgb(95,110,48)]'
                : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 border border-gray-300 dark:border-stone-600 hover:bg-gray-50 dark:hover:bg-stone-800'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{t('journals.voiceInput')}</span>
          </button>
        </div>

        {/* Voice Input Card */}
        {activeMode === 'voice' && (
          <div className="bg-white dark:bg-stone-900 rounded-lg border-2 border-[rgb(112,130,56)]/30 p-4 sm:p-6 shadow-sm mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-stone-100 mb-4">
              {t('journals.voiceInput')}
            </h2>

            {/* Title Field */}
            <div className="mb-4">
              <label htmlFor="audio-title" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                Title (Optional)
              </label>
              <input
                id="audio-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your audio..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent text-sm sm:text-base text-gray-900 dark:text-stone-100 bg-white dark:bg-stone-900"
              />
            </div>

            {/* Recording Interface */}
            <div className="flex flex-col items-center justify-center py-8">
              {!audioBlob ? (
                <>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                        : 'bg-[rgb(112,130,56)] hover:bg-[rgb(95,110,48)]'
                    } shadow-lg mb-4`}
                  >
                    {isRecording ? (
                      <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    ) : (
                      <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    )}
                  </button>
                  <p className="text-gray-600 dark:text-stone-300 text-sm sm:text-base mb-4">
                    {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Tap to Speak'}
                  </p>
                </>
              ) : (
                <>
                  <audio src={audioUrl || undefined} controls className="w-full max-w-md mb-4" />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveRecording}
                      disabled={isSaving}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <span>💾</span>
                      <span>{isSaving ? 'Saving...' : 'Save Recording'}</span>
                    </button>
                    <button
                      onClick={handleCancelRecording}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Upload Audio File Option */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-stone-700">
              <p className="text-sm text-gray-600 dark:text-stone-300 mb-3 text-center">Or upload an existing audio file</p>
              <button
                onClick={handleUploadAudioFile}
                disabled={isSaving || isRecording}
                className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 border-2 border-dashed border-gray-300 dark:border-stone-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Audio File</span>
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                {success}
              </div>
            )}
          </div>
        )}

        {/* Journal Entry Card */}
        {activeMode === 'write' && (
          <div className="bg-white dark:bg-stone-900 rounded-lg border-2 border-[rgb(112,130,56)]/30 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-stone-100 mb-4">
              Write Your Journal Entry
            </h2>

            {/* Title Field */}
            <div className="mb-4">
              <label htmlFor="journal-title" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                Title (Optional)
              </label>
              <input
                id="journal-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your journal entry..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent text-sm sm:text-base text-gray-900 dark:text-stone-100 bg-white dark:bg-stone-900"
              />
            </div>

            <WriteupEditor
              value={content}
              onChange={setContent}
              placeholder="Start writing your journal entry here... Share your thoughts, experiences, and reflections. This space is yours to express yourself freely."
            />

            {/* Character Counter */}
            <div className="mt-2 text-sm text-gray-500 dark:text-stone-400">
              {characterCount} characters
            </div>

            {/* Messages */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                {success}
              </div>
            )}

            {/* Text-to-Speech Controls */}
            {showTTS && (
              <div className="mt-6 mb-4">
                <TextToSpeechControls
                  text={htmlToPlainText(content)}
                  onClose={() => setShowTTS(false)}
                  autoPlay={true}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3 relative">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
              >
                <span>💾</span>
                <span>{isSaving ? t('journals.saving') : t('journals.save')}</span>
              </button>
              <button
                onClick={handleListen}
                disabled={!hasWriteupContent(content)}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)] rounded-lg font-medium hover:bg-[rgb(112,130,56)]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
              >
                <span>🔊</span>
                <span>Listen to</span>
              </button>
              <button
                onClick={handleConvertToVideo}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(139,69,19)]/20 text-[rgb(139,69,19)] rounded-lg font-medium hover:bg-[rgb(139,69,19)]/30 transition-colors flex items-center gap-2 text-sm sm:text-base"
              >
                <span>🎥</span>
                <span>Convert to Video</span>
              </button>

              {/* Floating Settings Button */}
              <button
                className="absolute -bottom-2 right-2 sm:right-4 w-12 h-12 sm:w-14 sm:h-14 bg-[rgb(230,168,77)] text-white rounded-full shadow-lg hover:bg-[rgb(220,158,67)] transition-colors flex items-center justify-center z-10"
                aria-label="Settings"
              >
                <span className="text-xl sm:text-2xl">⚙️</span>
              </button>
            </div>
          </div>
        )}

        {/* Upload File Card */}
        {activeMode === 'upload' && (
          <div className="bg-white dark:bg-stone-900 rounded-lg border-2 border-[rgb(112,130,56)]/30 p-4 sm:p-6 shadow-sm mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-stone-100 mb-4">
              {t('journals.uploadFile')}
            </h2>

            {/* Title Field */}
            <div className="mb-4">
              <label htmlFor="upload-title" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                Title (Optional)
              </label>
              <input
                id="upload-title"
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Enter a title for your file..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent text-sm sm:text-base text-gray-900 dark:text-stone-100 bg-white dark:bg-stone-900"
              />
            </div>

            {/* File Upload Area */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 dark:border-stone-600 rounded-lg p-8 sm:p-12 text-center hover:border-[rgb(112,130,56)] transition-colors cursor-pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,.pdf,.epub,.doc,.docx';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-stone-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-stone-300 text-sm sm:text-base mb-2">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-gray-500 dark:text-stone-400 text-xs sm:text-sm">
                  Supports: Images (JPEG, PNG, GIF, WebP) and Documents (PDF, EPUB, DOC, DOCX)
                </p>
              </div>
            ) : (
              <div className="border-2 border-[rgb(112,130,56)]/30 rounded-lg p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  {/* File Preview/Icon */}
                  <div className="flex-shrink-0">
                    {selectedFile.type.startsWith('image/') && filePreviewUrl ? (
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-stone-800 flex items-center justify-center">
                        <img
                          src={filePreviewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-[rgb(112,130,56)]/20 flex items-center justify-center">
                        <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-[rgb(112,130,56)]" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-800 dark:text-stone-100 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={handleCancelUpload}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-stone-400">
                      {selectedFile.type.startsWith('image/') ? 'Image' : 'Document'} file
                    </p>
                  </div>
                </div>

                {/* Upload Button */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleConfirmUpload}
                    disabled={isSaving}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isSaving ? t('journals.saving') : t('journals.uploadFile')}</span>
                  </button>
                  <button
                    onClick={handleCancelUpload}
                    disabled={isSaving}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                {success}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

