import { API_BASE_URL, apiFetch, appendUploadFile, type UploadFile } from './client';

export { API_BASE_URL, type UploadFile } from './client';

export const getFileUrl = (filePath: string): string => {
  if (filePath.startsWith('http')) {
    return filePath;
  }
  return `${API_BASE_URL}${filePath.startsWith('/') ? filePath : '/' + filePath}`;
};

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  universityName?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  requiresVerification?: boolean;
  email?: string;
  data?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isEmailVerified?: boolean;
  };
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (response.status === 403 && result.requiresVerification) {
    return result;
  }

  if (!response.ok) {
    throw new Error(result.message || 'Login failed');
  }

  return result;
}

export async function signup(data: SignupData): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Signup failed');
  }

  return result;
}

export async function guestLogin(): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/guest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to start guest session');
  }

  return result;
}

export async function verifyOtp(email: string, code: string): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Invalid or expired code');
  }

  return result;
}

export async function resendOtp(email: string): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/resend-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to resend code');
  }

  return result;
}

export async function forgotPassword(email: string): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Unable to send reset code');
  }
  return result;
}

export async function resendResetOtp(email: string): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/resend-reset-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to resend code');
  }
  return result;
}

export async function verifyResetOtp(
  email: string,
  code: string
): Promise<{ resetToken: string }> {
  const response = await apiFetch(`/api/auth/verify-reset-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Invalid or expired code');
  }
  const resetToken = result.data?.resetToken as string | undefined;
  if (!resetToken) {
    throw new Error('Invalid or expired code');
  }
  return { resetToken };
}

export async function resetPassword(
  email: string,
  resetToken: string,
  newPassword: string
): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetToken, newPassword }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Unable to reset password');
  }
  return result;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Unable to update password');
  }
  return result;
}

export async function requestEmailChange(
  password: string,
  newEmail: string
): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/request-email-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, newEmail }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Unable to change email');
  }
  return result;
}

export async function resendEmailChangeOtp(): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/resend-email-change-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to resend code');
  }
  return result;
}

export async function confirmEmailChange(code: string): Promise<AuthResponse> {
  const response = await apiFetch(`/api/auth/confirm-email-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Invalid or expired code');
  }
  return result;
}

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isEmailVerified?: boolean;
  university?: { id: string; name: string; country?: string };
}

export interface CurrentUserResponse {
  success: boolean;
  message?: string;
  data?: CurrentUser;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const response = await apiFetch(`/api/auth/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result: CurrentUserResponse = await response.json();
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch current user');
  }
  return result.data ?? null;
}

export async function logout(): Promise<void> {
  const response = await apiFetch(`/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error((result as { message?: string }).message || 'Failed to sign out');
  }
}

export interface Journal {
  _id: string;
  userId: string;
  title?: string;
  content: string;
  type: 'text' | 'audio' | 'pdf' | 'video' | 'image' | 'document' | 'doc' | 'ai_video';
  fileUrl?: string;
  imageUrl?: string;
  documentUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  characterCount: number;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalData {
  title?: string;
  content: string;
  type?: 'text' | 'audio' | 'pdf' | 'video';
  fileUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
}

export interface UpdateJournalData {
  title?: string;
  content?: string;
  isStarred?: boolean;
}

export interface JournalResponse {
  success: boolean;
  message?: string;
  data?: Journal | Journal[];
}

export async function createJournal(data: CreateJournalData): Promise<JournalResponse> {
  const response = await apiFetch(`/api/journals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to create journal');
  }

  return result;
}

export async function getJournals(): Promise<JournalResponse> {
  const response = await apiFetch(`/api/journals`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch journals');
  }

  return result;
}

export async function getJournal(id: string): Promise<JournalResponse> {
  const response = await apiFetch(`/api/journals/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch journal');
  }

  return result;
}

export async function updateJournal(id: string, data: UpdateJournalData): Promise<JournalResponse> {
  const response = await apiFetch(`/api/journals/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to update journal');
  }

  return result;
}

export async function deleteJournal(id: string): Promise<JournalResponse> {
  const response = await apiFetch(`/api/journals/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to delete journal');
  }

  return result;
}

export type VideoGenerationStatus =
  | 'queued'
  | 'processing'
  | 'saving'
  | 'completed'
  | 'failed';

export interface VideoGenerationJob {
  id: string;
  sourceJournalId?: string;
  title?: string;
  status: VideoGenerationStatus;
  error?: string;
  resultJournalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  message?: string;
  data?: VideoGenerationJob | null;
}

export interface JournalVideoOptions {
  resolution?: string;
  duration?: number;
  aspectRatio?: string;
  sceneStyle?: string;
  visualStyle?: string;
  lighting?: string;
  background?: string;
  characterNotes?: string;
  pacing?: string;
  transitions?: string;
  narrationVoice?: string;
  narrationSpeed?: string;
  backgroundMusic?: boolean;
  subtitles?: boolean;
}

export async function generateJournalVideo(
  journalId: string,
  sourceText?: string,
  options?: JournalVideoOptions
): Promise<VideoGenerationResponse> {
  const body: { sourceText?: string; options?: JournalVideoOptions } = {};
  if (sourceText) body.sourceText = sourceText;
  if (options) body.options = options;

  const response = await apiFetch(`/api/journals/${journalId}/generate-video`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to start video generation');
  }
  return result;
}

export async function getVideoGenerationById(
  jobId: string
): Promise<VideoGenerationResponse> {
  const response = await apiFetch(`/api/journals/video-generations/${jobId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch video generation status');
  }
  return result;
}

export async function getJournalVideoGeneration(
  journalId: string
): Promise<VideoGenerationResponse> {
  const response = await apiFetch(`/api/journals/${journalId}/video-generation`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch video generation status');
  }
  return result;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  data?: {
    journal: Journal;
    fileUrl: string;
  };
}

export async function uploadImage(file: UploadFile, title?: string): Promise<UploadResponse> {
  const formData = new FormData();
  appendUploadFile(formData, 'file', file);
  if (title) {
    formData.append('title', title);
  }

  const response = await apiFetch(`/api/upload/image`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to upload image');
  }

  return result;
}

export async function uploadDocument(file: UploadFile, title?: string): Promise<UploadResponse> {
  const formData = new FormData();
  appendUploadFile(formData, 'file', file);
  if (title) {
    formData.append('title', title);
  }

  const response = await apiFetch(`/api/upload/document`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to upload document');
  }

  return result;
}

export async function uploadAudio(file: UploadFile, title?: string): Promise<UploadResponse> {
  const formData = new FormData();
  appendUploadFile(formData, 'file', file);
  if (title) {
    formData.append('title', title);
  }

  const response = await apiFetch(`/api/upload/audio`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to upload audio');
  }

  return result;
}

export interface AssetUploadResponse {
  success: boolean;
  message?: string;
  data?: {
    fileUrl: string;
    kind: 'image' | 'video';
  };
}

/** Upload image/video for inline write-up embeds (does not create a journal). */
export async function uploadAsset(
  file: UploadFile,
  kind?: 'image' | 'video'
): Promise<AssetUploadResponse> {
  const formData = new FormData();
  appendUploadFile(formData, 'file', file);
  if (kind) {
    formData.append('kind', kind);
  }

  const response = await apiFetch(`/api/upload/asset`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to upload asset');
  }

  return result;
}

// Friends API
export interface FriendUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface FriendListItem {
  _id: string;
  friend: FriendUser;
  sharedItemsCount: number;
  joinedAt: string;
}

export interface PendingInvitationItem {
  _id: string;
  requester: FriendUser;
  createdAt: string;
}

export interface FriendsResponse {
  success: boolean;
  message?: string;
  data?: FriendListItem[];
}

export interface PendingResponse {
  success: boolean;
  message?: string;
  data?: PendingInvitationItem[];
}

export interface GenericMessageResponse {
  success: boolean;
  message?: string;
}

export async function getFriends(): Promise<FriendsResponse> {
  const response = await apiFetch(`/api/friends`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch friends');
  }
  return result;
}

export async function getPendingInvitations(): Promise<PendingResponse> {
  const response = await apiFetch(`/api/friends/pending`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch pending invitations');
  }
  return result;
}

export async function inviteFriend(email: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/friends/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to send invite');
  }
  return result;
}

export async function acceptFriendRequest(id: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/friends/${id}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to accept request');
  }
  return result;
}

export async function rejectFriendRequest(id: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/friends/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to reject request');
  }
  return result;
}

export async function removeFriend(id: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/friends/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to remove friend');
  }
  return result;
}

export async function blockFriend(id: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/friends/${id}/block`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to block friend');
  }
  return result;
}

// Shared journals API
export interface SharedByUser {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface SharedJournalItemJournal {
  _id: string;
  title?: string;
  content: string;
  type: string;
  documentUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  characterCount: number;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ContributorRole = 'viewer' | 'editor';

export interface SharedJournalItem {
  _id: string;
  sharedBy: SharedByUser;
  journal: SharedJournalItemJournal;
  sharedAt: string;
  starredByRecipient: boolean;
  contributorRole: ContributorRole;
}

export interface SharedListResponse {
  success: boolean;
  message?: string;
  data?: SharedJournalItem[];
}

export interface SharedItemResponse {
  success: boolean;
  message?: string;
  data?: SharedJournalItem;
}

export async function getSharedWithMe(): Promise<SharedListResponse> {
  const response = await apiFetch(`/api/shared`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch shared journals');
  }
  return result;
}

export async function getSharedItem(shareId: string): Promise<SharedItemResponse> {
  const response = await apiFetch(`/api/shared/${shareId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch shared item');
  }
  return result;
}

export async function shareJournal(
  journalId: string,
  sharedWithUserId: string,
  contributorRole: ContributorRole = 'viewer'
): Promise<GenericMessageResponse & { data?: { _id: string } }> {
  const response = await apiFetch(`/api/shared`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journalId, sharedWithUserId, contributorRole }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to share journal');
  }
  return result;
}

export async function removeShared(shareId: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/shared/${shareId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to remove share');
  }
  return result;
}

export async function toggleSharedStar(shareId: string): Promise<SharedItemResponse> {
  const response = await apiFetch(`/api/shared/${shareId}/star`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to toggle star');
  }
  return result;
}

// Notifications API
export type NotificationType =
  | 'friend_invite'
  | 'share'
  | 'starred'
  | 'collaboration'
  | 'system';

export interface NotificationFromUser {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface NotificationItem {
  _id: string;
  type: NotificationType;
  read: boolean;
  fromUser: NotificationFromUser;
  title: string;
  message: string;
  friendshipId?: string;
  journalId?: string;
  shareId?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  message?: string;
  data?: NotificationItem[];
  unreadCount?: number;
}

export interface GetNotificationsParams {
  type?: NotificationType;
  unreadOnly?: boolean;
}

export async function getNotifications(
  params: GetNotificationsParams = {}
): Promise<NotificationsResponse> {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.unreadOnly) search.set('unreadOnly', 'true');
  const query = search.toString();
  const url = `/api/notifications${query ? `?${query}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch notifications');
  }
  return result;
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const response = await apiFetch(`/api/notifications/count`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (response.status === 401 || !response.ok) {
    return 0;
  }
  return typeof result?.data?.unreadCount === 'number' ? result.data.unreadCount : 0;
}

export async function markNotificationRead(id: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to mark as read');
  }
  return result;
}

export async function markAllNotificationsRead(): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/notifications/read-all`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to mark all as read');
  }
  return result;
}

export async function deleteNotification(id: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/notifications/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to delete notification');
  }
  return result;
}

// Collaboration API
export interface CollaborationJournalListItem {
  _id: string;
  title?: string;
  updatedAt: string;
  owner?: { _id: string; firstName: string; lastName: string };
}

export interface CollaboratorItem {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  role: 'Owner' | 'Editor' | 'Viewer';
}

export interface CollaborationListResponse {
  success: boolean;
  message?: string;
  data?: CollaborationJournalListItem[];
}

export interface CollaboratorsResponse {
  success: boolean;
  message?: string;
  data?: CollaboratorItem[];
}

export async function getCollaborationJournals(): Promise<CollaborationListResponse> {
  const response = await apiFetch(`/api/collaboration`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch collaboration journals');
  }
  return result;
}

export async function getCollaborators(journalId: string): Promise<CollaboratorsResponse> {
  const response = await apiFetch(`/api/collaboration/${journalId}/collaborators`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch collaborators');
  }
  return result;
}

// Journal comments API
export interface CommentItem {
  _id: string;
  userId: string;
  author: { firstName: string; lastName: string };
  content: string;
  createdAt: string;
}

export interface CommentsResponse {
  success: boolean;
  message?: string;
  data?: CommentItem[];
}

export async function getComments(journalId: string): Promise<CommentsResponse> {
  const response = await apiFetch(`/api/journals/${journalId}/comments`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch comments');
  }
  return result;
}

export async function createComment(
  journalId: string,
  content: string
): Promise<{ success: boolean; message?: string; data?: CommentItem }> {
  const response = await apiFetch(`/api/journals/${journalId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content.trim() }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to add comment');
  }
  return result;
}

// Universities API
export interface UniversityItem {
  _id: string;
  name: string;
  country?: string;
}

export async function searchUniversities(query: string): Promise<UniversityItem[]> {
  const response = await apiFetch(`/api/universities?query=${encodeURIComponent(query)}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to search universities');
  }
  return result.data || [];
}

// Ideas API
export type IdeaVisibility = 'university' | 'selected' | 'all';

export interface IdeaRole {
  title: string;
  filled: boolean;
}

export interface IdeaListItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  creator: { _id: string; firstName: string; lastName: string };
  visibility: IdeaVisibility;
  tags: string[];
  roles: IdeaRole[];
  createdAt: string;
}

export interface CreateIdeaData {
  title: string;
  description: string;
  category: string;
  visibility?: IdeaVisibility;
  tags?: string[];
  roles?: { title: string }[];
}

export interface IdeaApplication {
  _id: string;
  roleIndex: number;
  roleTitle?: string;
  status: 'pending' | 'accepted' | 'rejected';
  applicant: { _id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
}

export async function getIdeas(filters?: {
  category?: string;
  search?: string;
  tag?: string;
}): Promise<IdeaListItem[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.tag) params.set('tag', filters.tag);
  const qs = params.toString();

  const response = await apiFetch(`/api/ideas${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch ideas');
  }
  return result.data || [];
}

export async function getIdea(id: string): Promise<IdeaListItem> {
  const response = await apiFetch(`/api/ideas/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch idea');
  }
  return result.data;
}

export async function createIdea(data: CreateIdeaData): Promise<IdeaListItem> {
  const response = await apiFetch(`/api/ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to create idea');
  }
  return result.data;
}

export async function applyToRole(ideaId: string, roleIndex: number): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/ideas/${ideaId}/roles/${roleIndex}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to apply to role');
  }
  return result;
}

export async function getIdeaApplications(ideaId: string): Promise<IdeaApplication[]> {
  const response = await apiFetch(`/api/ideas/${ideaId}/applications`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch applications');
  }
  return result.data || [];
}

export async function acceptIdeaApplication(appId: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/ideas/applications/${appId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to accept application');
  }
  return result;
}

export async function rejectIdeaApplication(appId: string): Promise<GenericMessageResponse> {
  const response = await apiFetch(`/api/ideas/applications/${appId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to reject application');
  }
  return result;
}

// Brainstorm API
export type BrainstormEntryType = 'text' | 'image' | 'video' | 'ai_video';

export interface BrainstormSpace {
  _id: string;
  title: string;
  ownerId: string;
  memberIds: string[];
  ideaId?: string;
  createdAt: string;
}

export interface BrainstormEntryItem {
  _id: string;
  spaceId: string;
  author: { _id: string; firstName: string; lastName: string };
  type: BrainstormEntryType;
  content: string;
  sourceEntryId?: string;
  voteCount: number;
  votedByMe: boolean;
  createdAt: string;
}

export interface BrainstormVideoJob {
  id: string;
  status: 'queued' | 'processing' | 'saving' | 'completed' | 'failed';
  error?: string;
  resultEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getBrainstormSpaces(): Promise<BrainstormSpace[]> {
  const response = await apiFetch(`/api/brainstorm`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch brainstorm spaces');
  }
  return result.data || [];
}

export async function createBrainstormSpace(data: {
  title: string;
  memberIds?: string[];
}): Promise<BrainstormSpace> {
  const response = await apiFetch(`/api/brainstorm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to create space');
  }
  return result.data;
}

export async function getBrainstormSpace(
  id: string
): Promise<{ space: BrainstormSpace; entries: BrainstormEntryItem[] }> {
  const response = await apiFetch(`/api/brainstorm/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch space');
  }
  return result.data;
}

export async function addBrainstormEntry(
  spaceId: string,
  data: { type: BrainstormEntryType; content: string }
): Promise<BrainstormEntryItem> {
  const response = await apiFetch(`/api/brainstorm/${spaceId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to add entry');
  }
  return result.data;
}

export async function generateBrainstormEntryVideo(
  spaceId: string,
  entryId: string
): Promise<BrainstormVideoJob> {
  const response = await apiFetch(`/api/brainstorm/${spaceId}/entries/${entryId}/generate-video`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to start video generation');
  }
  return result.data;
}

export async function getBrainstormVideoJob(
  spaceId: string,
  jobId: string
): Promise<BrainstormVideoJob> {
  const response = await apiFetch(`/api/brainstorm/${spaceId}/video-generations/${jobId}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch video job');
  }
  return result.data;
}

export async function voteBrainstormEntry(
  spaceId: string,
  entryId: string
): Promise<{ voteCount: number; votedByMe: boolean }> {
  const response = await apiFetch(`/api/brainstorm/${spaceId}/entries/${entryId}/vote`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to vote');
  }
  return result.data;
}

export async function promoteBrainstormSpaceToIdea(
  spaceId: string,
  data: CreateIdeaData
): Promise<{ ideaId: string }> {
  const response = await apiFetch(`/api/brainstorm/${spaceId}/promote-to-idea`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to promote to idea');
  }
  return result.data;
}

