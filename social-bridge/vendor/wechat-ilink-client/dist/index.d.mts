import { EventEmitter } from "node:events";

//#region src/api/types.d.ts
/**
 * WeChat iLink bot protocol types.
 *
 * Reverse-engineered from @tencent-weixin/openclaw-weixin.
 * The backend API uses JSON over HTTP; byte fields are base64 strings in JSON.
 */
declare const UploadMediaType: {
  readonly IMAGE: 1;
  readonly VIDEO: 2;
  readonly FILE: 3;
  readonly VOICE: 4;
};
type UploadMediaType = (typeof UploadMediaType)[keyof typeof UploadMediaType];
declare const MessageType: {
  readonly NONE: 0;
  readonly USER: 1;
  readonly BOT: 2;
};
type MessageType = (typeof MessageType)[keyof typeof MessageType];
declare const MessageItemType: {
  readonly NONE: 0;
  readonly TEXT: 1;
  readonly IMAGE: 2;
  readonly VOICE: 3;
  readonly FILE: 4;
  readonly VIDEO: 5;
};
type MessageItemType = (typeof MessageItemType)[keyof typeof MessageItemType];
declare const MessageState: {
  readonly NEW: 0;
  readonly GENERATING: 1;
  readonly FINISH: 2;
};
type MessageState = (typeof MessageState)[keyof typeof MessageState];
declare const TypingStatus: {
  readonly TYPING: 1;
  readonly CANCEL: 2;
};
type TypingStatus = (typeof TypingStatus)[keyof typeof TypingStatus];
/** Metadata attached to every outgoing CGI request. */
interface BaseInfo {
  channel_version?: string;
}
/** CDN media reference; aes_key is base64-encoded bytes in JSON. */
interface CDNMedia {
  /** Encrypted parameters for CDN download/upload. */
  encrypt_query_param?: string;
  /** Base64-encoded AES-128 key. */
  aes_key?: string;
  /** 0 = only encrypt fileid, 1 = packed thumb/mid info. */
  encrypt_type?: number;
}
interface TextItem {
  text?: string;
}
interface ImageItem {
  /** Original image CDN reference. */
  media?: CDNMedia;
  /** Thumbnail CDN reference. */
  thumb_media?: CDNMedia;
  /** Raw AES-128 key as hex string (16 bytes); preferred over media.aes_key for inbound decryption. */
  aeskey?: string;
  url?: string;
  mid_size?: number;
  thumb_size?: number;
  thumb_height?: number;
  thumb_width?: number;
  hd_size?: number;
}
interface VoiceItem {
  media?: CDNMedia;
  /** Voice encoding: 1=pcm, 2=adpcm, 3=feature, 4=speex, 5=amr, 6=silk, 7=mp3, 8=ogg-speex */
  encode_type?: number;
  bits_per_sample?: number;
  /** Sample rate in Hz. */
  sample_rate?: number;
  /** Duration in milliseconds. */
  playtime?: number;
  /** Speech-to-text content (if available). */
  text?: string;
}
interface FileItem {
  media?: CDNMedia;
  file_name?: string;
  md5?: string;
  /** File size as string. */
  len?: string;
}
interface VideoItem {
  media?: CDNMedia;
  video_size?: number;
  play_length?: number;
  video_md5?: string;
  thumb_media?: CDNMedia;
  thumb_size?: number;
  thumb_height?: number;
  thumb_width?: number;
}
interface RefMessage {
  message_item?: MessageItem;
  /** Summary text. */
  title?: string;
}
interface MessageItem {
  type?: number;
  create_time_ms?: number;
  update_time_ms?: number;
  is_completed?: boolean;
  msg_id?: string;
  ref_msg?: RefMessage;
  text_item?: TextItem;
  image_item?: ImageItem;
  voice_item?: VoiceItem;
  file_item?: FileItem;
  video_item?: VideoItem;
}
interface WeixinMessage {
  seq?: number;
  message_id?: number;
  from_user_id?: string;
  to_user_id?: string;
  client_id?: string;
  create_time_ms?: number;
  update_time_ms?: number;
  delete_time_ms?: number;
  session_id?: string;
  group_id?: string;
  /** 1 = USER, 2 = BOT */
  message_type?: number;
  /** 0 = NEW, 1 = GENERATING, 2 = FINISH */
  message_state?: number;
  item_list?: MessageItem[];
  /** Conversation context token — must be echoed verbatim in replies. */
  context_token?: string;
}
interface GetUpdatesReq {
  /** Full context buf cached locally; send "" on first request. */
  get_updates_buf?: string;
  base_info?: BaseInfo;
}
interface GetUpdatesResp {
  ret?: number;
  /** Error code from server (e.g. -14 = session timeout). */
  errcode?: number;
  errmsg?: string;
  msgs?: WeixinMessage[];
  /** Full context buf to cache locally and send on next request. */
  get_updates_buf?: string;
  /** Server-suggested timeout (ms) for the next long-poll. */
  longpolling_timeout_ms?: number;
}
interface SendMessageReq {
  msg?: WeixinMessage;
  base_info?: BaseInfo;
}
interface SendMessageResp {
  ret?: number;
  errmsg?: string;
}
interface GetUploadUrlReq {
  filekey?: string;
  /** See UploadMediaType: 1=IMAGE, 2=VIDEO, 3=FILE, 4=VOICE */
  media_type?: number;
  to_user_id?: string;
  /** Original file plaintext size. */
  rawsize?: number;
  /** Original file plaintext MD5 (hex). */
  rawfilemd5?: string;
  /** Ciphertext size after AES-128-ECB encryption. */
  filesize?: number;
  /** Thumbnail plaintext size (IMAGE/VIDEO). */
  thumb_rawsize?: number;
  /** Thumbnail plaintext MD5 (IMAGE/VIDEO). */
  thumb_rawfilemd5?: string;
  /** Thumbnail ciphertext size (IMAGE/VIDEO). */
  thumb_filesize?: number;
  /** Skip thumbnail upload URL. */
  no_need_thumb?: boolean;
  /** AES key (hex). */
  aeskey?: string;
  base_info?: BaseInfo;
}
interface GetUploadUrlResp {
  /** Original image upload encrypted parameters. */
  upload_param?: string;
  /** Thumbnail upload encrypted parameters. */
  thumb_upload_param?: string;
}
interface GetConfigReq {
  ilink_user_id?: string;
  context_token?: string;
  base_info?: BaseInfo;
}
interface GetConfigResp {
  ret?: number;
  errmsg?: string;
  /** Base64-encoded typing ticket for sendTyping. */
  typing_ticket?: string;
}
interface SendTypingReq {
  ilink_user_id?: string;
  typing_ticket?: string;
  /** 1 = typing, 2 = cancel typing */
  status?: number;
  base_info?: BaseInfo;
}
interface SendTypingResp {
  ret?: number;
  errmsg?: string;
}
interface QRCodeResponse {
  /** Opaque QR code identifier (pass to get_qrcode_status). */
  qrcode: string;
  /** URL that renders/encodes the QR image. */
  qrcode_img_content: string;
}
interface QRCodeStatusResponse {
  status: "wait" | "scaned" | "confirmed" | "expired";
  bot_token?: string;
  /** Bot account identifier (e.g. "hex@im.bot"). */
  ilink_bot_id?: string;
  /** API base URL returned on successful login. */
  baseurl?: string;
  /** User ID of the person who scanned the QR code. */
  ilink_user_id?: string;
}
//#endregion
//#region src/api/client.d.ts
declare const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";
declare const CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";
/** Default bot_type value. */
declare const DEFAULT_BOT_TYPE = "3";
interface ApiClientOptions {
  baseUrl?: string;
  cdnBaseUrl?: string;
  token?: string;
  /** Channel version string sent as base_info.channel_version. */
  channelVersion?: string;
  /** Optional SKRouteTag header. */
  routeTag?: string;
}
declare class ApiClient {
  readonly baseUrl: string;
  readonly cdnBaseUrl: string;
  private token?;
  private channelVersion;
  private routeTag?;
  constructor(opts?: ApiClientOptions);
  /** Update the bearer token (after QR login). */
  setToken(token: string): void;
  getToken(): string | undefined;
  private buildBaseInfo;
  private buildHeaders;
  /**
   * POST JSON to an iLink API endpoint with timeout + abort.
   */
  private apiFetch;
  /**
   * Long-poll for new messages. Returns empty response on client-side timeout
   * (normal for long-poll).
   */
  getUpdates(getUpdatesBuf: string, timeoutMs?: number): Promise<GetUpdatesResp>;
  /** Send a message downstream. */
  sendMessage(req: SendMessageReq): Promise<void>;
  /** Get a pre-signed CDN upload URL. */
  getUploadUrl(req: GetUploadUrlReq): Promise<GetUploadUrlResp>;
  /** Fetch bot config (includes typing_ticket) for a given user. */
  getConfig(ilinkUserId: string, contextToken?: string): Promise<GetConfigResp>;
  /** Send a typing indicator. */
  sendTyping(req: SendTypingReq): Promise<void>;
  /** Fetch a new QR code for bot login. */
  getQRCode(botType?: string): Promise<QRCodeResponse>;
  /**
   * Long-poll the QR code scan status.
   * Returns `{ status: "wait" }` on client-side timeout.
   */
  pollQRCodeStatus(qrcode: string): Promise<QRCodeStatusResponse>;
}
//#endregion
//#region src/auth/qr-login.d.ts
interface LoginResult {
  connected: boolean;
  botToken?: string;
  accountId?: string;
  baseUrl?: string;
  userId?: string;
  message: string;
}
interface QRLoginOptions {
  /** Maximum time to wait for QR scan (ms). Default: 480_000 (8 min). */
  timeoutMs?: number;
  /** bot_type parameter (default: "3"). */
  botType?: string;
  /** Maximum number of QR code refreshes on expiry. Default: 3. */
  maxRefreshes?: number;
  /**
   * Called when a QR code URL is available (initial and on refresh).
   * The caller is responsible for rendering the QR code.
   */
  onQRCode?: (qrcodeUrl: string) => void | Promise<void>;
  /** Called when status changes. */
  onStatus?: (status: QRCodeStatusResponse["status"]) => void;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}
/**
 * Run the full QR code login flow. Returns a LoginResult.
 *
 * The library does NOT render QR codes — use `opts.onQRCode` to receive
 * the QR code URL and handle display yourself.
 */
declare function loginWithQRCode(api: ApiClient, opts?: QRLoginOptions): Promise<LoginResult>;
//#endregion
//#region src/media/download.d.ts
interface DownloadedMedia {
  /** Decrypted file content. */
  data: Buffer;
  /** Media type hint: "image", "voice", "file", "video". */
  kind: "image" | "voice" | "file" | "video";
  /** Original filename (file items only). */
  fileName?: string;
}
/**
 * Download and decrypt media from a single MessageItem.
 * Returns null if the item has no downloadable media.
 */
declare function downloadMediaFromItem(item: MessageItem, cdnBaseUrl: string): Promise<DownloadedMedia | null>;
//#endregion
//#region src/media/upload.d.ts
interface UploadedFileInfo {
  filekey: string;
  /** CDN download encrypted_query_param (fill into CDNMedia.encrypt_query_param). */
  downloadEncryptedQueryParam: string;
  /** AES-128-ECB key, hex-encoded; convert to base64 for CDNMedia.aes_key. */
  aeskey: string;
  /** Plaintext file size in bytes. */
  fileSize: number;
  /** Ciphertext file size in bytes (after AES-128-ECB + PKCS7). */
  fileSizeCiphertext: number;
}
/** Upload a local image file to the WeChat CDN. */
declare function uploadImage(params: {
  filePath: string;
  toUserId: string;
  api: ApiClient;
  cdnBaseUrl: string;
}): Promise<UploadedFileInfo>;
/** Upload a local video file to the WeChat CDN. */
declare function uploadVideo(params: {
  filePath: string;
  toUserId: string;
  api: ApiClient;
  cdnBaseUrl: string;
}): Promise<UploadedFileInfo>;
/** Upload a local file attachment to the WeChat CDN. */
declare function uploadFile(params: {
  filePath: string;
  toUserId: string;
  api: ApiClient;
  cdnBaseUrl: string;
}): Promise<UploadedFileInfo>;
//#endregion
//#region src/monitor.d.ts
/** Error code returned by the server when the bot session has expired. */
declare const SESSION_EXPIRED_ERRCODE = -14;
interface MonitorOptions {
  /** Long-poll timeout in ms. Server may override via longpolling_timeout_ms. */
  longPollTimeoutMs?: number;
  /** AbortSignal for stopping the loop. */
  signal?: AbortSignal;
  /**
   * Called once at startup to load a previously persisted sync cursor.
   * Return the cursor string, or undefined/empty to start fresh.
   */
  loadSyncBuf?: () => string | undefined | Promise<string | undefined>;
  /**
   * Called after each successful getUpdates with the new cursor value.
   * The caller can persist this for resume across restarts.
   */
  saveSyncBuf?: (buf: string) => void | Promise<void>;
}
interface MonitorCallbacks {
  /** Called for each inbound message. */
  onMessage: (msg: WeixinMessage) => void | Promise<void>;
  /** Called when getUpdates returns an error response. */
  onError?: (err: Error) => void;
  /** Called when the bot session has expired (errcode -14). */
  onSessionExpired?: () => void;
  /** Called after each successful getUpdates response. */
  onPoll?: (resp: GetUpdatesResp) => void;
}
/**
 * Start the long-poll monitor loop. Runs until the AbortSignal fires.
 */
declare function startMonitor(api: ApiClient, opts: MonitorOptions, callbacks: MonitorCallbacks): Promise<void>;
//#endregion
//#region src/client.d.ts
interface WeChatClientOptions extends ApiClientOptions {
  /** Account ID. Set after login if not provided. */
  accountId?: string;
}
interface WeChatClientEvents {
  message: [msg: WeixinMessage];
  error: [err: Error];
  sessionExpired: [];
  poll: [resp: GetUpdatesResp];
}
/**
 * Normalize a raw account ID (e.g. "hex@im.bot") to a safe key
 * (e.g. "hex-im-bot").
 */
declare function normalizeAccountId(raw: string): string;
declare class WeChatClient extends EventEmitter {
  readonly api: ApiClient;
  private accountId?;
  private abortController?;
  /** In-process cache: userId -> contextToken (echoed from getUpdates). */
  private contextTokens;
  constructor(opts?: WeChatClientOptions);
  getAccountId(): string | undefined;
  /** Get the cached context token for a user (needed for sending replies). */
  getContextToken(userId: string): string | undefined;
  /**
   * Run the QR code login flow. On success, configures the API client
   * with the new token and sets the accountId.
   *
   * The library does NOT render QR codes. Use `opts.onQRCode` to receive
   * the QR code URL and handle display yourself.
   *
   * The library does NOT persist credentials. The caller should save
   * `result.botToken`, `result.accountId`, and `result.baseUrl` themselves.
   */
  login(opts?: QRLoginOptions): Promise<LoginResult>;
  /**
   * Start the long-poll monitor loop. Emits "message" events for each
   * inbound message.
   *
   * Sync buf persistence is opt-in via `opts.loadSyncBuf` / `opts.saveSyncBuf`.
   *
   * Call `stop()` to terminate.
   */
  start(opts?: Omit<MonitorOptions, "accountId">): Promise<void>;
  /** Stop the long-poll monitor loop. */
  stop(): void;
  /**
   * Send a text message. Uses the cached context token for the target user.
   * Pass an explicit contextToken to override.
   */
  sendText(to: string, text: string, contextToken?: string): Promise<string>;
  /**
   * Upload a local file and send it as the appropriate media type.
   * (image/*, video/*, or file attachment based on MIME type.)
   */
  sendMedia(to: string, filePath: string, caption?: string, contextToken?: string): Promise<string>;
  /**
   * Send an already-uploaded image.
   */
  sendUploadedImage(to: string, uploaded: UploadedFileInfo, caption?: string, contextToken?: string): Promise<string>;
  /**
   * Send an already-uploaded video.
   */
  sendUploadedVideo(to: string, uploaded: UploadedFileInfo, caption?: string, contextToken?: string): Promise<string>;
  /**
   * Send an already-uploaded file attachment.
   */
  sendUploadedFile(to: string, fileName: string, uploaded: UploadedFileInfo, caption?: string, contextToken?: string): Promise<string>;
  /**
   * Send a "typing" indicator to the user. Requires a typing_ticket
   * (obtained from getConfig).
   */
  sendTyping(userId: string, typingTicket: string, status?: "typing" | "cancel"): Promise<void>;
  /**
   * Get the typing ticket for a user (calls getConfig).
   */
  getTypingTicket(userId: string, contextToken?: string): Promise<string>;
  uploadImage(filePath: string, toUserId: string): Promise<UploadedFileInfo>;
  uploadVideo(filePath: string, toUserId: string): Promise<UploadedFileInfo>;
  uploadFile(filePath: string, toUserId: string): Promise<UploadedFileInfo>;
  /**
   * Download and decrypt a media item from an inbound message.
   */
  downloadMedia(item: MessageItem): Promise<DownloadedMedia | null>;
  /** Extract the text body from a WeixinMessage. */
  static extractText(msg: WeixinMessage): string;
  /** Check if a message item is a media type. */
  static isMediaItem(item: MessageItem): boolean;
}
//#endregion
//#region src/media/send.d.ts
/**
 * Send a text message. contextToken is required (echoed from getUpdates).
 */
declare function sendText(api: ApiClient, to: string, text: string, contextToken: string): Promise<string>;
/**
 * Send an image message with a previously uploaded file.
 */
declare function sendImage(api: ApiClient, to: string, uploaded: UploadedFileInfo, contextToken: string, caption?: string): Promise<string>;
/**
 * Send a video message with a previously uploaded file.
 */
declare function sendVideo(api: ApiClient, to: string, uploaded: UploadedFileInfo, contextToken: string, caption?: string): Promise<string>;
/**
 * Send a file attachment with a previously uploaded file.
 */
declare function sendFileMessage(api: ApiClient, to: string, fileName: string, uploaded: UploadedFileInfo, contextToken: string, caption?: string): Promise<string>;
/**
 * Upload and send a local file as a media message. Routing by MIME type:
 *   - video/*  -> video message
 *   - image/*  -> image message
 *   - else     -> file attachment
 */
declare function sendMediaFile(api: ApiClient, to: string, filePath: string, contextToken: string, caption?: string): Promise<string>;
//#endregion
//#region src/cdn/aes-ecb.d.ts
/** Encrypt a buffer with AES-128-ECB (PKCS7 padding). */
declare function encryptAesEcb(plaintext: Buffer, key: Buffer): Buffer;
/** Decrypt a buffer with AES-128-ECB (PKCS7 padding). */
declare function decryptAesEcb(ciphertext: Buffer, key: Buffer): Buffer;
/** Compute AES-128-ECB ciphertext size (PKCS7 pads to 16-byte boundary). */
declare function aesEcbPaddedSize(plaintextSize: number): number;
//#endregion
//#region src/cdn/cdn-download.d.ts
/**
 * Parse CDNMedia.aes_key into a raw 16-byte AES key.
 *
 * Two encodings are observed:
 *   - base64(raw 16 bytes)           -> images (aes_key from media field)
 *   - base64(hex string of 16 bytes) -> file / voice / video
 *
 * In the second case, base64-decoding yields 32 ASCII hex chars which must
 * then be parsed as hex to recover the actual 16-byte key.
 */
declare function parseAesKey(aesKeyBase64: string): Buffer;
/**
 * Download and AES-128-ECB decrypt a CDN media file. Returns plaintext Buffer.
 */
declare function downloadAndDecrypt(encryptedQueryParam: string, aesKeyBase64: string, cdnBaseUrl: string): Promise<Buffer>;
/**
 * Download plain (unencrypted) bytes from the CDN.
 */
declare function downloadPlain(encryptedQueryParam: string, cdnBaseUrl: string): Promise<Buffer>;
//#endregion
//#region src/cdn/cdn-upload.d.ts
/**
 * Upload one buffer to the WeChat CDN with AES-128-ECB encryption.
 * Returns the download encrypted_query_param from the CDN `x-encrypted-param` header.
 */
declare function uploadBufferToCdn(params: {
  buf: Buffer;
  uploadParam: string;
  filekey: string;
  cdnBaseUrl: string;
  aeskey: Buffer;
}): Promise<{
  downloadParam: string;
}>;
//#endregion
//#region src/cdn/cdn-url.d.ts
/**
 * CDN URL construction for WeChat CDN upload/download.
 */
/** Build a CDN download URL from encrypt_query_param. */
declare function buildCdnDownloadUrl(encryptedQueryParam: string, cdnBaseUrl: string): string;
/** Build a CDN upload URL from upload_param and filekey. */
declare function buildCdnUploadUrl(params: {
  cdnBaseUrl: string;
  uploadParam: string;
  filekey: string;
}): string;
//#endregion
//#region src/util/mime.d.ts
/** Get MIME type from filename extension. Defaults to "application/octet-stream". */
declare function getMimeFromFilename(filename: string): string;
/** Get file extension from MIME type. Defaults to ".bin". */
declare function getExtensionFromMime(mimeType: string): string;
/** Get file extension from Content-Type header or URL path. Defaults to ".bin". */
declare function getExtensionFromContentTypeOrUrl(contentType: string | null, url: string): string;
//#endregion
//#region src/util/random.d.ts
/**
 * Generate a prefixed unique ID: `{prefix}:{timestamp}-{8-char hex}`.
 */
declare function generateId(prefix: string): string;
/**
 * Generate a temporary file name: `{prefix}-{timestamp}-{8-char hex}{ext}`.
 */
declare function tempFileName(prefix: string, ext: string): string;
//#endregion
export { ApiClient, type ApiClientOptions, type BaseInfo, type CDNMedia, CDN_BASE_URL, DEFAULT_BASE_URL, DEFAULT_BOT_TYPE, type DownloadedMedia, type FileItem, type GetConfigReq, type GetConfigResp, type GetUpdatesReq, type GetUpdatesResp, type GetUploadUrlReq, type GetUploadUrlResp, type ImageItem, type LoginResult, type MessageItem, MessageItemType, MessageState, MessageType, type MonitorCallbacks, type MonitorOptions, type QRCodeResponse, type QRCodeStatusResponse, type QRLoginOptions, type RefMessage, SESSION_EXPIRED_ERRCODE, type SendMessageReq, type SendMessageResp, type SendTypingReq, type SendTypingResp, type TextItem, TypingStatus, UploadMediaType, type UploadedFileInfo, type VideoItem, type VoiceItem, WeChatClient, type WeChatClientEvents, type WeChatClientOptions, type WeixinMessage, aesEcbPaddedSize, buildCdnDownloadUrl, buildCdnUploadUrl, decryptAesEcb, downloadAndDecrypt, downloadMediaFromItem, downloadPlain, encryptAesEcb, generateId, getExtensionFromContentTypeOrUrl, getExtensionFromMime, getMimeFromFilename, loginWithQRCode, normalizeAccountId, parseAesKey, sendFileMessage, sendImage, sendMediaFile, sendText, sendVideo, startMonitor, tempFileName, uploadBufferToCdn, uploadFile, uploadImage, uploadVideo };
//# sourceMappingURL=index.d.mts.map