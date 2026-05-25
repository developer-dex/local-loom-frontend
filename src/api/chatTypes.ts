/** Types for the Chat API — mirrors the API documentation exactly. */

import type { ApiEnvelope } from './authTypes';

// ─── Attachments ──────────────────────────────────────────────────────────────

export type AttachmentDescriptor = {
  /** Server-relative path beginning with '/public/chat-attachments/'. */
  url: string;
  type: 'image' | 'video';
  mime: string;
  size: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
};

// ─── Message primitives ───────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'video' | 'mixed';

/** Local-only status used to drive the optimistic UI lifecycle. */
export type MessageStatus = 'pending' | 'sent' | 'failed';

export type MessageSender = {
  id: string;
  name: string;
  avatar: string | null;
};

export type MessagePayload = {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  type: MessageType;
  attachments: AttachmentDescriptor[];
  /** Server-supplied message status (e.g. 'sent' for echoed messages). */
  status: string;
  createdAt: string;
  updatedAt: string;
  /** Echoed by the server when the client supplied one with the send. */
  clientMessageId?: string;
};

// ─── Conversation list ────────────────────────────────────────────────────────

export type ConversationLastMessage = {
  id: string;
  content: string;
  type: string;
  attachmentCount: number;
  senderId: string;
  createdAt: string;
} | null;

export type ConversationListItem = {
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  };
  lastMessage: ConversationLastMessage;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

// ─── REST: list conversations ────────────────────────────────────────────────

export type ListConversationsParams = {
  page?: number;
  limit?: number;
  /** Trimmed and clamped to a maximum of 100 characters client-side. */
  search?: string;
};

export type PaginatedMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ListConversationsResponse = ApiEnvelope<ConversationListItem[]> & {
  meta: PaginatedMeta;
};

// ─── REST: get / create conversation ─────────────────────────────────────────

export type GetConversationResponse = ApiEnvelope<ConversationListItem>;

export type CreateConversationResponse = ApiEnvelope<ConversationListItem>;

// ─── REST: list messages (cursor-paginated) ──────────────────────────────────

export type ListMessagesParams = {
  /** Defaults to 100 when omitted. */
  limit?: number;
  /** Keyset cursor; pass the previous response's `meta.nextBefore`. */
  before?: string;
};

export type CursorMeta = {
  limit: number;
  count: number;
  hasMore: boolean;
  nextBefore: string | null;
};

export type ListMessagesResponse = ApiEnvelope<{
  /** Server returns newest-first; the slice reverses to ascending before storing. */
  items: MessagePayload[];
  meta: CursorMeta;
}>;

// ─── REST: send message ──────────────────────────────────────────────────────

export type SendMessageRequest = {
  conversationId?: string;
  recipientId?: string;
  /** Required when no attachments are present. */
  content?: string;
  type?: MessageType;
  attachments?: AttachmentDescriptor[];
  clientMessageId?: string;
};

export type SendMessageResponse = ApiEnvelope<{
  message: MessagePayload;
  clientMessageId?: string;
}>;

// ─── REST: upload attachments ────────────────────────────────────────────────

export type UploadAttachmentsResponse = ApiEnvelope<AttachmentDescriptor[]>;

// ─── REST: mark conversation as read ─────────────────────────────────────────

export type MarkReadRequest = {
  lastReadMessageId?: string;
};

export type MarkReadResponse = ApiEnvelope<{
  conversationId: string;
  lastReadAt: string;
  unreadCount: number;
}>;

// ─── Socket: server-emitted events ───────────────────────────────────────────

export type ChatTypingEvent = {
  conversationId: string;
  userId: string;
  name: string;
};

export type ChatReadEvent = {
  conversationId: string;
  userId: string;
  lastReadMessageId: string | null;
  lastReadAt: string;
};

export type ChatOnlineStatusEvent = {
  userId: string;
  isOnline: boolean;
};

export type ChatConversationUpdatedEvent = {
  conversation: ConversationListItem;
};

export type ChatNotificationEvent = {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type ChatSocketError = {
  message: string;
  code?: ChatErrorCode;
};

// ─── Socket: ack payloads ────────────────────────────────────────────────────

export type ChatSendAck =
  | { success: true; message: MessagePayload; clientMessageId?: string }
  | { success: false; error: { code: ChatErrorCode; message: string } };

export type ChatMarkReadAck =
  | {
      success: true;
      conversationId: string;
      lastReadAt: string;
      unreadCount: number;
    }
  | { success: false; error: { code: ChatErrorCode; message: string } };

// ─── Error codes (closed union) ──────────────────────────────────────────────

export type ChatErrorCode =
  | 'CHAT_VALIDATION_ERROR'
  | 'CHAT_UNAUTHORIZED'
  | 'CHAT_FORBIDDEN'
  | 'CHAT_NOT_FOUND'
  | 'CHAT_CONFLICT'
  | 'CHAT_RATE_LIMITED'
  | 'CHAT_PAYLOAD_TOO_LARGE'
  | 'CHAT_UPLOAD_FAILED'
  | 'CHAT_AUTOSUBSCRIBE_FAILED'
  | 'CHAT_JOIN_FORBIDDEN';

// ─── Picker → upload boundary ────────────────────────────────────────────────

/** Descriptor passed from the picker (expo-image-picker) to the upload thunk. */
export type PickedAsset = {
  /** Local file URI (e.g. file://..., content://..., ph://...). Never persisted. */
  uri: string;
  name: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  durationMs?: number;
  thumbnailUrl?: string;
};
