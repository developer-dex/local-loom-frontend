export { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './http';
export {
  authenticatedDelete,
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
  authenticatedPut,
} from './client';
export { signupApi, loginApi, verifyOtpApi, refreshTokenApi, logoutApi, getProfileApi } from './auth';
export { getUserMeApi, updateUserMeApi, deleteUserMeApi, updateUserAvatarApi } from './users';
export { classifyServiceApi } from './ai';
export type { ClassifyServiceRequest, ClassifyServiceResult, ClassifyServiceResponse } from './aiTypes';
export { fetchCategoriesApi, fetchCategoryByIdApi } from './categories';
export { fetchRegionsApi, fetchRegionByIdApi } from './regions';
export { addFavouriteApi, isAlreadyFavouriteError, removeFavouriteApi } from './favourites';
export type {
  AddFavouriteRequest,
  AddFavouriteResponse,
  FavouriteRecord,
  RemoveFavouriteResponse,
} from './favourites';
export {
  fetchTradiesApi,
  fetchTradieByIdApi,
  fetchTradieDetailsApi,
  fetchTradieReviewsApi,
  fetchTradieWorkPhotosApi,
  fetchTradieContactApi,
  abnLookupApi,
  fetchMyTradieProfileApi,
  setupBusinessProfileApi,
  uploadWorkPhotosApi,
  deleteWorkPhotoApi,
  fetchTradieStatsApi,
} from './tradies';
export {
  listConversationsApi,
  getConversationApi,
  createConversationApi,
  listMessagesApi,
  sendMessageApi,
  uploadAttachmentsApi,
  markReadApi,
} from './chat';
export {
  mapApiError,
  logChatError,
  reportChatError,
  redactForLog,
  setChatErrorLogger,
  REDACTED,
} from './chatErrors';
export type {
  ChatErrorOutcome,
  ChatErrorSource,
  ChatErrorSink,
} from './chatErrors';
export { ApiError } from './errors';
export type { ApiRequestOptions, HttpMethod, QueryParams } from './types';
export type {
  UserRole,
  UserStatus,
  IdentifierType,
  AuthUser,
  AuthTokens,
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutResponse,
  ProfileResponse,
} from './authTypes';
export type { Category, CategoriesResponse, CategoryResponse } from './categoryTypes';
export type { Region, RegionsResponse, RegionResponse } from './regionTypes';
export type {
  TradieListItem,
  TradieProfile,
  TradieAboutDetail,
  TradieWorkDetail,
  TradieReview,
  TradieReviewsDetail,
  TradieReviewsDetailApi,
  TradieReviewApiItem,
  WorkPhoto,
  TradieStats,
  AbnLookupResult,
  BusinessSetupRequest,
  PaginationMeta,
  PaginatedData,
  PaginatedEnvelope,
  TradieListResponse,
  TradieProfileResponse,
  TradieDetailsResponse,
  TradieReviewsResponse,
  WorkPhotosResponse,
  WorkPhotosUploadResponse,
  TradieContactResponse,
  AbnLookupResponse,
  TradieStatsResponse,
  MyTradieProfile,
  MyTradieProfileResponse,
} from './tradieTypes';
export type { UserProfile, UpdateUserRequest, UserMeResponse, UpdateUserResponse, DeleteUserResponse } from './userTypes';
export type { FetchTradiesParams, DetailType } from './tradies';
export type {
  AttachmentDescriptor,
  MessageType,
  MessageStatus,
  MessageSender,
  MessagePayload,
  ConversationLastMessage,
  ConversationListItem,
  ListConversationsParams,
  PaginatedMeta,
  ListConversationsResponse,
  GetConversationResponse,
  CreateConversationResponse,
  ListMessagesParams,
  CursorMeta,
  ListMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  UploadAttachmentsResponse,
  MarkReadRequest,
  MarkReadResponse,
  ChatTypingEvent,
  ChatReadEvent,
  ChatOnlineStatusEvent,
  ChatConversationUpdatedEvent,
  ChatNotificationEvent,
  ChatSocketError,
  ChatSendAck,
  ChatMarkReadAck,
  ChatErrorCode,
  PickedAsset,
} from './chatTypes';
