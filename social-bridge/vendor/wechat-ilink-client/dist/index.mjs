import { EventEmitter } from "node:events";
import crypto, { createCipheriv, createDecipheriv } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
//#region src/api/client.ts
/**
* Low-level HTTP API client for the WeChat iLink bot protocol.
*
* Endpoints (all POST JSON):
*   - ilink/bot/getupdates        — long-poll for new messages
*   - ilink/bot/sendmessage       — send a message (text/image/video/file)
*   - ilink/bot/getuploadurl      — get CDN upload pre-signed URL
*   - ilink/bot/getconfig         — get account config (typing ticket, etc.)
*   - ilink/bot/sendtyping        — send/cancel typing indicator
*   - ilink/bot/get_bot_qrcode    — initiate QR code login (GET)
*   - ilink/bot/get_qrcode_status — poll QR scan status (GET)
*/
const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";
const CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";
/** Default long-poll timeout for getUpdates requests. */
const DEFAULT_LONG_POLL_TIMEOUT_MS$1 = 35e3;
/** Default timeout for regular API requests. */
const DEFAULT_API_TIMEOUT_MS = 15e3;
/** Default timeout for lightweight requests (getConfig, sendTyping). */
const DEFAULT_CONFIG_TIMEOUT_MS = 1e4;
/** Default client-side timeout for get_qrcode_status long-poll. */
const QR_LONG_POLL_TIMEOUT_MS = 35e3;
/** Default bot_type value. */
const DEFAULT_BOT_TYPE = "3";
function ensureTrailingSlash(url) {
	return url.endsWith("/") ? url : `${url}/`;
}
/** X-WECHAT-UIN header: random uint32 -> decimal string -> base64. */
function randomWechatUin() {
	const uint32 = crypto.randomBytes(4).readUInt32BE(0);
	return Buffer.from(String(uint32), "utf-8").toString("base64");
}
var ApiClient = class {
	baseUrl;
	cdnBaseUrl;
	token;
	channelVersion;
	routeTag;
	constructor(opts = {}) {
		this.baseUrl = opts.baseUrl ?? "https://ilinkai.weixin.qq.com";
		this.cdnBaseUrl = opts.cdnBaseUrl ?? "https://novac2c.cdn.weixin.qq.com/c2c";
		this.token = opts.token;
		this.channelVersion = opts.channelVersion ?? "standalone-0.1.0";
		this.routeTag = opts.routeTag;
	}
	/** Update the bearer token (after QR login). */
	setToken(token) {
		this.token = token;
	}
	getToken() {
		return this.token;
	}
	buildBaseInfo() {
		return { channel_version: this.channelVersion };
	}
	buildHeaders(bodyStr) {
		const headers = {
			"Content-Type": "application/json",
			AuthorizationType: "ilink_bot_token",
			"Content-Length": String(Buffer.byteLength(bodyStr, "utf-8")),
			"X-WECHAT-UIN": randomWechatUin()
		};
		if (this.token?.trim()) headers.Authorization = `Bearer ${this.token.trim()}`;
		if (this.routeTag) headers.SKRouteTag = this.routeTag;
		return headers;
	}
	/**
	* POST JSON to an iLink API endpoint with timeout + abort.
	*/
	async apiFetch(params) {
		const base = ensureTrailingSlash(this.baseUrl);
		const url = new URL(params.endpoint, base);
		const headers = this.buildHeaders(params.body);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), params.timeoutMs);
		try {
			const res = await fetch(url.toString(), {
				method: "POST",
				headers,
				body: params.body,
				signal: controller.signal
			});
			clearTimeout(timer);
			const rawText = await res.text();
			if (!res.ok) throw new Error(`API ${params.endpoint} ${res.status}: ${rawText}`);
			return rawText;
		} catch (err) {
			clearTimeout(timer);
			throw err;
		}
	}
	/**
	* Long-poll for new messages. Returns empty response on client-side timeout
	* (normal for long-poll).
	*/
	async getUpdates(getUpdatesBuf, timeoutMs) {
		const timeout = timeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS$1;
		try {
			const rawText = await this.apiFetch({
				endpoint: "ilink/bot/getupdates",
				body: JSON.stringify({
					get_updates_buf: getUpdatesBuf,
					base_info: this.buildBaseInfo()
				}),
				timeoutMs: timeout
			});
			return JSON.parse(rawText);
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return {
				ret: 0,
				msgs: [],
				get_updates_buf: getUpdatesBuf
			};
			throw err;
		}
	}
	/** Send a message downstream. */
	async sendMessage(req) {
		await this.apiFetch({
			endpoint: "ilink/bot/sendmessage",
			body: JSON.stringify({
				...req,
				base_info: this.buildBaseInfo()
			}),
			timeoutMs: DEFAULT_API_TIMEOUT_MS
		});
	}
	/** Get a pre-signed CDN upload URL. */
	async getUploadUrl(req) {
		const rawText = await this.apiFetch({
			endpoint: "ilink/bot/getuploadurl",
			body: JSON.stringify({
				...req,
				base_info: this.buildBaseInfo()
			}),
			timeoutMs: DEFAULT_API_TIMEOUT_MS
		});
		return JSON.parse(rawText);
	}
	/** Fetch bot config (includes typing_ticket) for a given user. */
	async getConfig(ilinkUserId, contextToken) {
		const rawText = await this.apiFetch({
			endpoint: "ilink/bot/getconfig",
			body: JSON.stringify({
				ilink_user_id: ilinkUserId,
				context_token: contextToken,
				base_info: this.buildBaseInfo()
			}),
			timeoutMs: DEFAULT_CONFIG_TIMEOUT_MS
		});
		return JSON.parse(rawText);
	}
	/** Send a typing indicator. */
	async sendTyping(req) {
		await this.apiFetch({
			endpoint: "ilink/bot/sendtyping",
			body: JSON.stringify({
				...req,
				base_info: this.buildBaseInfo()
			}),
			timeoutMs: DEFAULT_CONFIG_TIMEOUT_MS
		});
	}
	/** Fetch a new QR code for bot login. */
	async getQRCode(botType) {
		const base = ensureTrailingSlash(this.baseUrl);
		const bt = botType ?? "3";
		const url = new URL(`ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(bt)}`, base);
		const headers = {};
		if (this.routeTag) headers.SKRouteTag = this.routeTag;
		const res = await fetch(url.toString(), { headers });
		if (!res.ok) {
			const body = await res.text().catch(() => "(unreadable)");
			throw new Error(`Failed to fetch QR code: ${res.status} ${res.statusText}: ${body}`);
		}
		return await res.json();
	}
	/**
	* Long-poll the QR code scan status.
	* Returns `{ status: "wait" }` on client-side timeout.
	*/
	async pollQRCodeStatus(qrcode) {
		const base = ensureTrailingSlash(this.baseUrl);
		const url = new URL(`ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`, base);
		const headers = { "iLink-App-ClientVersion": "1" };
		if (this.routeTag) headers.SKRouteTag = this.routeTag;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), QR_LONG_POLL_TIMEOUT_MS);
		try {
			const res = await fetch(url.toString(), {
				headers,
				signal: controller.signal
			});
			clearTimeout(timer);
			const rawText = await res.text();
			if (!res.ok) throw new Error(`Failed to poll QR status: ${res.status} ${res.statusText}: ${rawText}`);
			return JSON.parse(rawText);
		} catch (err) {
			clearTimeout(timer);
			if (err instanceof Error && err.name === "AbortError") return { status: "wait" };
			throw err;
		}
	}
};
//#endregion
//#region src/api/types.ts
/**
* WeChat iLink bot protocol types.
*
* Reverse-engineered from @tencent-weixin/openclaw-weixin.
* The backend API uses JSON over HTTP; byte fields are base64 strings in JSON.
*/
const UploadMediaType = {
	IMAGE: 1,
	VIDEO: 2,
	FILE: 3,
	VOICE: 4
};
const MessageType = {
	NONE: 0,
	USER: 1,
	BOT: 2
};
const MessageItemType = {
	NONE: 0,
	TEXT: 1,
	IMAGE: 2,
	VOICE: 3,
	FILE: 4,
	VIDEO: 5
};
const MessageState = {
	NEW: 0,
	GENERATING: 1,
	FINISH: 2
};
const TypingStatus = {
	TYPING: 1,
	CANCEL: 2
};
//#endregion
//#region src/auth/qr-login.ts
/**
* Run the full QR code login flow. Returns a LoginResult.
*
* The library does NOT render QR codes — use `opts.onQRCode` to receive
* the QR code URL and handle display yourself.
*/
async function loginWithQRCode(api, opts = {}) {
	const timeoutMs = Math.max(opts.timeoutMs ?? 48e4, 1e3);
	const maxRefreshes = opts.maxRefreshes ?? 3;
	const deadline = Date.now() + timeoutMs;
	let refreshCount = 1;
	const qrResponse = await api.getQRCode(opts.botType);
	let qrcode = qrResponse.qrcode;
	if (opts.onQRCode) await opts.onQRCode(qrResponse.qrcode_img_content);
	while (Date.now() < deadline) {
		if (opts.signal?.aborted) return {
			connected: false,
			message: "Login cancelled."
		};
		const status = await api.pollQRCodeStatus(qrcode);
		opts.onStatus?.(status.status);
		switch (status.status) {
			case "wait": break;
			case "scaned": break;
			case "expired": {
				refreshCount++;
				if (refreshCount > maxRefreshes) return {
					connected: false,
					message: `QR code expired ${maxRefreshes} times. Please restart login.`
				};
				const refreshed = await api.getQRCode(opts.botType);
				qrcode = refreshed.qrcode;
				if (opts.onQRCode) await opts.onQRCode(refreshed.qrcode_img_content);
				break;
			}
			case "confirmed":
				if (!status.ilink_bot_id) return {
					connected: false,
					message: "Login confirmed but server did not return ilink_bot_id."
				};
				return {
					connected: true,
					botToken: status.bot_token,
					accountId: status.ilink_bot_id,
					baseUrl: status.baseurl,
					userId: status.ilink_user_id,
					message: "Login successful!"
				};
		}
		await new Promise((r) => setTimeout(r, 1e3));
	}
	return {
		connected: false,
		message: "Login timed out."
	};
}
//#endregion
//#region src/cdn/aes-ecb.ts
/**
* AES-128-ECB crypto utilities used by the WeChat CDN for media upload/download.
*
* All media files are encrypted with AES-128-ECB (PKCS7 padding) before upload,
* and must be decrypted after download.
*/
/** Encrypt a buffer with AES-128-ECB (PKCS7 padding). */
function encryptAesEcb(plaintext, key) {
	const cipher = createCipheriv("aes-128-ecb", key, null);
	return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}
/** Decrypt a buffer with AES-128-ECB (PKCS7 padding). */
function decryptAesEcb(ciphertext, key) {
	const decipher = createDecipheriv("aes-128-ecb", key, null);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
/** Compute AES-128-ECB ciphertext size (PKCS7 pads to 16-byte boundary). */
function aesEcbPaddedSize(plaintextSize) {
	return Math.ceil((plaintextSize + 1) / 16) * 16;
}
//#endregion
//#region src/cdn/cdn-url.ts
/**
* CDN URL construction for WeChat CDN upload/download.
*/
/** Build a CDN download URL from encrypt_query_param. */
function buildCdnDownloadUrl(encryptedQueryParam, cdnBaseUrl) {
	return `${cdnBaseUrl}/download?encrypted_query_param=${encodeURIComponent(encryptedQueryParam)}`;
}
/** Build a CDN upload URL from upload_param and filekey. */
function buildCdnUploadUrl(params) {
	return `${params.cdnBaseUrl}/upload?encrypted_query_param=${encodeURIComponent(params.uploadParam)}&filekey=${encodeURIComponent(params.filekey)}`;
}
//#endregion
//#region src/cdn/cdn-download.ts
/**
* Download and optionally decrypt media from the WeChat CDN.
*/
/**
* Download raw bytes from the CDN (no decryption).
*/
async function fetchCdnBytes(url) {
	const res = await fetch(url);
	if (!res.ok) {
		const body = await res.text().catch(() => "(unreadable)");
		throw new Error(`CDN download ${res.status} ${res.statusText}: ${body}`);
	}
	return Buffer.from(await res.arrayBuffer());
}
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
function parseAesKey(aesKeyBase64) {
	const decoded = Buffer.from(aesKeyBase64, "base64");
	if (decoded.length === 16) return decoded;
	if (decoded.length === 32 && /^[0-9a-fA-F]{32}$/.test(decoded.toString("ascii"))) return Buffer.from(decoded.toString("ascii"), "hex");
	throw new Error(`aes_key must decode to 16 raw bytes or 32-char hex string, got ${decoded.length} bytes`);
}
/**
* Download and AES-128-ECB decrypt a CDN media file. Returns plaintext Buffer.
*/
async function downloadAndDecrypt(encryptedQueryParam, aesKeyBase64, cdnBaseUrl) {
	const key = parseAesKey(aesKeyBase64);
	return decryptAesEcb(await fetchCdnBytes(buildCdnDownloadUrl(encryptedQueryParam, cdnBaseUrl)), key);
}
/**
* Download plain (unencrypted) bytes from the CDN.
*/
async function downloadPlain(encryptedQueryParam, cdnBaseUrl) {
	return fetchCdnBytes(buildCdnDownloadUrl(encryptedQueryParam, cdnBaseUrl));
}
//#endregion
//#region src/media/download.ts
/**
* Download and decrypt media from a single MessageItem.
* Returns null if the item has no downloadable media.
*/
async function downloadMediaFromItem(item, cdnBaseUrl) {
	if (item.type === MessageItemType.IMAGE) {
		const img = item.image_item;
		if (!img?.media?.encrypt_query_param) return null;
		const aesKeyBase64 = img.aeskey ? Buffer.from(img.aeskey, "hex").toString("base64") : img.media.aes_key;
		return {
			data: aesKeyBase64 ? await downloadAndDecrypt(img.media.encrypt_query_param, aesKeyBase64, cdnBaseUrl) : await downloadPlain(img.media.encrypt_query_param, cdnBaseUrl),
			kind: "image"
		};
	}
	if (item.type === MessageItemType.VOICE) {
		const voice = item.voice_item;
		if (!voice?.media?.encrypt_query_param || !voice.media.aes_key) return null;
		return {
			data: await downloadAndDecrypt(voice.media.encrypt_query_param, voice.media.aes_key, cdnBaseUrl),
			kind: "voice"
		};
	}
	if (item.type === MessageItemType.FILE) {
		const fileItem = item.file_item;
		if (!fileItem?.media?.encrypt_query_param || !fileItem.media.aes_key) return null;
		return {
			data: await downloadAndDecrypt(fileItem.media.encrypt_query_param, fileItem.media.aes_key, cdnBaseUrl),
			kind: "file",
			fileName: fileItem.file_name ?? void 0
		};
	}
	if (item.type === MessageItemType.VIDEO) {
		const videoItem = item.video_item;
		if (!videoItem?.media?.encrypt_query_param || !videoItem.media.aes_key) return null;
		return {
			data: await downloadAndDecrypt(videoItem.media.encrypt_query_param, videoItem.media.aes_key, cdnBaseUrl),
			kind: "video"
		};
	}
	return null;
}
//#endregion
//#region src/util/mime.ts
const EXTENSION_TO_MIME = {
	".pdf": "application/pdf",
	".doc": "application/msword",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xls": "application/vnd.ms-excel",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".ppt": "application/vnd.ms-powerpoint",
	".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	".txt": "text/plain",
	".csv": "text/csv",
	".zip": "application/zip",
	".tar": "application/x-tar",
	".gz": "application/gzip",
	".mp3": "audio/mpeg",
	".ogg": "audio/ogg",
	".wav": "audio/wav",
	".mp4": "video/mp4",
	".mov": "video/quicktime",
	".webm": "video/webm",
	".mkv": "video/x-matroska",
	".avi": "video/x-msvideo",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".bmp": "image/bmp"
};
const MIME_TO_EXTENSION = {
	"image/jpeg": ".jpg",
	"image/jpg": ".jpg",
	"image/png": ".png",
	"image/gif": ".gif",
	"image/webp": ".webp",
	"image/bmp": ".bmp",
	"video/mp4": ".mp4",
	"video/quicktime": ".mov",
	"video/webm": ".webm",
	"video/x-matroska": ".mkv",
	"video/x-msvideo": ".avi",
	"audio/mpeg": ".mp3",
	"audio/ogg": ".ogg",
	"audio/wav": ".wav",
	"application/pdf": ".pdf",
	"application/zip": ".zip",
	"application/x-tar": ".tar",
	"application/gzip": ".gz",
	"text/plain": ".txt",
	"text/csv": ".csv"
};
/** Get MIME type from filename extension. Defaults to "application/octet-stream". */
function getMimeFromFilename(filename) {
	return EXTENSION_TO_MIME[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
}
/** Get file extension from MIME type. Defaults to ".bin". */
function getExtensionFromMime(mimeType) {
	return MIME_TO_EXTENSION[mimeType.split(";")[0].trim().toLowerCase()] ?? ".bin";
}
/** Get file extension from Content-Type header or URL path. Defaults to ".bin". */
function getExtensionFromContentTypeOrUrl(contentType, url) {
	if (contentType) {
		const ext = getExtensionFromMime(contentType);
		if (ext !== ".bin") return ext;
	}
	const ext = path.extname(new URL(url).pathname).toLowerCase();
	return new Set(Object.keys(EXTENSION_TO_MIME)).has(ext) ? ext : ".bin";
}
//#endregion
//#region src/cdn/cdn-upload.ts
/**
* Upload encrypted media to the WeChat CDN.
*/
const UPLOAD_MAX_RETRIES = 3;
/**
* Upload one buffer to the WeChat CDN with AES-128-ECB encryption.
* Returns the download encrypted_query_param from the CDN `x-encrypted-param` header.
*/
async function uploadBufferToCdn(params) {
	const { buf, uploadParam, uploadFullUrl, filekey, cdnBaseUrl, aeskey } = params;
	const ciphertext = encryptAesEcb(buf, aeskey);
	const cdnUrl = uploadFullUrl || buildCdnUploadUrl({
		cdnBaseUrl,
		uploadParam,
		filekey
	});
	let downloadParam;
	let lastError;
	for (let attempt = 1; attempt <= UPLOAD_MAX_RETRIES; attempt++) try {
		const res = await fetch(cdnUrl, {
			method: "POST",
			headers: { "Content-Type": "application/octet-stream" },
			body: new Uint8Array(ciphertext)
		});
		if (res.status >= 400 && res.status < 500) {
			const errMsg = res.headers.get("x-error-message") ?? await res.text();
			throw new Error(`CDN upload client error ${res.status}: ${errMsg}`);
		}
		if (res.status !== 200) {
			const errMsg = res.headers.get("x-error-message") ?? `status ${res.status}`;
			throw new Error(`CDN upload server error: ${errMsg}`);
		}
		downloadParam = res.headers.get("x-encrypted-param") ?? void 0;
		if (!downloadParam) throw new Error("CDN upload response missing x-encrypted-param header");
		break;
	} catch (err) {
		lastError = err;
		if (err instanceof Error && err.message.includes("client error")) throw err;
		if (attempt >= UPLOAD_MAX_RETRIES) break;
	}
	if (!downloadParam) throw lastError instanceof Error ? lastError : /* @__PURE__ */ new Error(`CDN upload failed after ${UPLOAD_MAX_RETRIES} attempts`);
	return { downloadParam };
}
//#endregion
//#region src/media/upload.ts
/**
* High-level media upload pipeline for the WeChat CDN.
*
* Flow:
*   1. Read file -> compute MD5, plaintext size, ciphertext size
*   2. Generate random 16-byte AES key and filekey
*   3. Call getUploadUrl to get upload_param
*   4. Encrypt with AES-128-ECB and POST to CDN
*   5. Return uploaded file info (download param, key, sizes)
*/
async function uploadMedia(params) {
	const { filePath, toUserId, api, cdnBaseUrl, mediaType } = params;
	const plaintext = await fs.readFile(filePath);
	const rawsize = plaintext.length;
	const rawfilemd5 = crypto.createHash("md5").update(plaintext).digest("hex");
	const filesize = aesEcbPaddedSize(rawsize);
	const filekey = crypto.randomBytes(16).toString("hex");
	const aeskey = crypto.randomBytes(16);
	const uploadUrlResp = await api.getUploadUrl({
		filekey,
		media_type: mediaType,
		to_user_id: toUserId,
		rawsize,
		rawfilemd5,
		filesize,
		no_need_thumb: true,
		aeskey: aeskey.toString("hex")
	});
	// 兼容两种响应：新格式直接给 upload_full_url（完整上传地址），旧格式给 upload_param 需自行拼 URL
	const uploadFullUrl = uploadUrlResp.upload_full_url;
	const uploadParam = uploadUrlResp.upload_param;
	if (!uploadFullUrl && !uploadParam) throw new Error(`getUploadUrl returned no upload_param: ${JSON.stringify(uploadUrlResp)}`);
	const { downloadParam } = await uploadBufferToCdn({
		buf: plaintext,
		uploadParam,
		uploadFullUrl,
		filekey,
		cdnBaseUrl,
		aeskey
	});
	return {
		filekey,
		downloadEncryptedQueryParam: downloadParam,
		aeskey: aeskey.toString("hex"),
		fileSize: rawsize,
		fileSizeCiphertext: filesize
	};
}
/** Upload a local image file to the WeChat CDN. */
async function uploadImage(params) {
	return uploadMedia({
		...params,
		mediaType: UploadMediaType.IMAGE
	});
}
/** Upload a local video file to the WeChat CDN. */
async function uploadVideo(params) {
	return uploadMedia({
		...params,
		mediaType: UploadMediaType.VIDEO
	});
}
/** Upload a local file attachment to the WeChat CDN. */
async function uploadFile(params) {
	return uploadMedia({
		...params,
		mediaType: UploadMediaType.FILE
	});
}
//#endregion
//#region src/util/random.ts
/**
* Generate a prefixed unique ID: `{prefix}:{timestamp}-{8-char hex}`.
*/
function generateId(prefix) {
	return `${prefix}:${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}
/**
* Generate a temporary file name: `{prefix}-{timestamp}-{8-char hex}{ext}`.
*/
function tempFileName(prefix, ext) {
	return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
}
//#endregion
//#region src/media/send.ts
/**
* High-level message sending helpers.
*
* Builds SendMessageReq payloads for text, image, video, and file messages,
* and dispatches them through the ApiClient.
*/
function generateClientId() {
	return generateId("wechat-ilink");
}
function buildReq(params) {
	return { msg: {
		from_user_id: "",
		to_user_id: params.to,
		client_id: generateClientId(),
		message_type: MessageType.BOT,
		message_state: MessageState.FINISH,
		item_list: params.items.length ? params.items : void 0,
		context_token: params.contextToken ?? void 0
	} };
}
/**
* Send a text message. contextToken is required (echoed from getUpdates).
*/
async function sendText(api, to, text, contextToken) {
	const clientId = generateClientId();
	const req = { msg: {
		from_user_id: "",
		to_user_id: to,
		client_id: clientId,
		message_type: MessageType.BOT,
		message_state: MessageState.FINISH,
		item_list: text ? [{
			type: MessageItemType.TEXT,
			text_item: { text }
		}] : void 0,
		context_token: contextToken
	} };
	await api.sendMessage(req);
	return clientId;
}
/**
* Send an image message with a previously uploaded file.
*/
async function sendImage(api, to, uploaded, contextToken, caption) {
	const items = [];
	if (caption) items.push({
		type: MessageItemType.TEXT,
		text_item: { text: caption }
	});
	items.push({
		type: MessageItemType.IMAGE,
		image_item: {
			media: {
				encrypt_query_param: uploaded.downloadEncryptedQueryParam,
				aes_key: Buffer.from(uploaded.aeskey).toString("base64"),
				encrypt_type: 1
			},
			mid_size: uploaded.fileSizeCiphertext
		}
	});
	let lastClientId = "";
	for (const item of items) {
		const req = buildReq({
			to,
			contextToken,
			items: [item]
		});
		lastClientId = req.msg?.client_id ?? lastClientId;
		await api.sendMessage(req);
	}
	return lastClientId;
}
/**
* Send a video message with a previously uploaded file.
*/
async function sendVideo(api, to, uploaded, contextToken, caption) {
	const items = [];
	if (caption) items.push({
		type: MessageItemType.TEXT,
		text_item: { text: caption }
	});
	items.push({
		type: MessageItemType.VIDEO,
		video_item: {
			media: {
				encrypt_query_param: uploaded.downloadEncryptedQueryParam,
				aes_key: Buffer.from(uploaded.aeskey).toString("base64"),
				encrypt_type: 1
			},
			video_size: uploaded.fileSizeCiphertext
		}
	});
	let lastClientId = "";
	for (const item of items) {
		const req = buildReq({
			to,
			contextToken,
			items: [item]
		});
		lastClientId = req.msg?.client_id ?? lastClientId;
		await api.sendMessage(req);
	}
	return lastClientId;
}
/**
* Send a file attachment with a previously uploaded file.
*/
async function sendFileMessage(api, to, fileName, uploaded, contextToken, caption) {
	const items = [];
	if (caption) items.push({
		type: MessageItemType.TEXT,
		text_item: { text: caption }
	});
	items.push({
		type: MessageItemType.FILE,
		file_item: {
			media: {
				encrypt_query_param: uploaded.downloadEncryptedQueryParam,
				aes_key: Buffer.from(uploaded.aeskey).toString("base64"),
				encrypt_type: 1
			},
			file_name: fileName,
			len: String(uploaded.fileSize)
		}
	});
	let lastClientId = "";
	for (const item of items) {
		const req = buildReq({
			to,
			contextToken,
			items: [item]
		});
		lastClientId = req.msg?.client_id ?? lastClientId;
		await api.sendMessage(req);
	}
	return lastClientId;
}
/**
* Upload and send a local file as a media message. Routing by MIME type:
*   - video/*  -> video message
*   - image/*  -> image message
*   - else     -> file attachment
*/
async function sendMediaFile(api, to, filePath, contextToken, caption) {
	const mime = getMimeFromFilename(filePath);
	const cdnBaseUrl = api.cdnBaseUrl;
	if (mime.startsWith("video/")) return sendVideo(api, to, await uploadVideo({
		filePath,
		toUserId: to,
		api,
		cdnBaseUrl
	}), contextToken, caption);
	if (mime.startsWith("image/")) return sendImage(api, to, await uploadImage({
		filePath,
		toUserId: to,
		api,
		cdnBaseUrl
	}), contextToken, caption);
	return sendFileMessage(api, to, path.basename(filePath), await uploadFile({
		filePath,
		toUserId: to,
		api,
		cdnBaseUrl
	}), contextToken, caption);
}
//#endregion
//#region src/monitor.ts
const DEFAULT_LONG_POLL_TIMEOUT_MS = 35e3;
const MAX_CONSECUTIVE_FAILURES = 3;
const BACKOFF_DELAY_MS = 3e4;
const RETRY_DELAY_MS = 2e3;
/** Error code returned by the server when the bot session has expired. */
const SESSION_EXPIRED_ERRCODE = -14;
function sleep(ms, signal) {
	return new Promise((resolve, reject) => {
		const t = setTimeout(resolve, ms);
		signal?.addEventListener("abort", () => {
			clearTimeout(t);
			reject(/* @__PURE__ */ new Error("aborted"));
		}, { once: true });
	});
}
/**
* Start the long-poll monitor loop. Runs until the AbortSignal fires.
*/
async function startMonitor(api, opts, callbacks) {
	const { signal } = opts;
	let getUpdatesBuf = "";
	if (opts.loadSyncBuf) {
		const loaded = await opts.loadSyncBuf();
		if (loaded) getUpdatesBuf = loaded;
	}
	let nextTimeoutMs = opts.longPollTimeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS;
	let consecutiveFailures = 0;
	while (!signal?.aborted) try {
		const resp = await api.getUpdates(getUpdatesBuf, nextTimeoutMs);
		if (resp.longpolling_timeout_ms != null && resp.longpolling_timeout_ms > 0) nextTimeoutMs = resp.longpolling_timeout_ms;
		if (resp.ret !== void 0 && resp.ret !== 0 || resp.errcode !== void 0 && resp.errcode !== 0) {
			if (resp.errcode === -14 || resp.ret === -14) {
				callbacks.onSessionExpired?.();
				await sleep(3600 * 1e3, signal);
				consecutiveFailures = 0;
				continue;
			}
			consecutiveFailures++;
			callbacks.onError?.(/* @__PURE__ */ new Error(`getUpdates failed: ret=${resp.ret} errcode=${resp.errcode} errmsg=${resp.errmsg ?? ""}`));
			if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
				consecutiveFailures = 0;
				await sleep(BACKOFF_DELAY_MS, signal);
			} else await sleep(RETRY_DELAY_MS, signal);
			continue;
		}
		consecutiveFailures = 0;
		callbacks.onPoll?.(resp);
		if (resp.get_updates_buf != null && resp.get_updates_buf !== "") {
			getUpdatesBuf = resp.get_updates_buf;
			if (opts.saveSyncBuf) await opts.saveSyncBuf(getUpdatesBuf);
		}
		const msgs = resp.msgs ?? [];
		for (const msg of msgs) await callbacks.onMessage(msg);
	} catch (err) {
		if (signal?.aborted) return;
		consecutiveFailures++;
		callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
		if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
			consecutiveFailures = 0;
			await sleep(BACKOFF_DELAY_MS, signal);
		} else await sleep(RETRY_DELAY_MS, signal);
	}
}
//#endregion
//#region src/client.ts
/**
* WeChatClient — high-level client for the WeChat iLink bot protocol.
*
* Wraps the low-level API, QR login, long-poll monitor, media upload/download,
* and message sending into a single EventEmitter-based interface.
*
* This is a pure in-memory client. It does NOT persist any data to disk.
* The caller is responsible for:
*   - Storing/loading the token and accountId across restarts
*   - Storing/loading the sync buf (long-poll cursor) for message resume
*   - Rendering QR codes during login
*
* Usage:
*   const client = new WeChatClient({ token, accountId });
*   client.on("message", (msg) => { ... });
*   await client.start();
*/
/** Extract text body from a message's item_list. */
function extractTextBody(itemList) {
	if (!itemList?.length) return "";
	for (const item of itemList) {
		if (item.type === MessageItemType.TEXT && item.text_item?.text != null) return String(item.text_item.text);
		if (item.type === MessageItemType.VOICE && item.voice_item?.text) return item.voice_item.text;
	}
	return "";
}
/**
* Normalize a raw account ID (e.g. "hex@im.bot") to a safe key
* (e.g. "hex-im-bot").
*/
function normalizeAccountId(raw) {
	return raw.trim().toLowerCase().replace(/[@.]/g, "-");
}
var WeChatClient = class extends EventEmitter {
	api;
	accountId;
	abortController;
	/** In-process cache: userId -> contextToken (echoed from getUpdates). */
	contextTokens = /* @__PURE__ */ new Map();
	constructor(opts = {}) {
		super();
		this.api = new ApiClient(opts);
		this.accountId = opts.accountId;
	}
	getAccountId() {
		return this.accountId;
	}
	/** Get the cached context token for a user (needed for sending replies). */
	getContextToken(userId) {
		return this.contextTokens.get(userId);
	}
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
	async login(opts = {}) {
		const result = await loginWithQRCode(this.api, opts);
		if (result.connected && result.botToken && result.accountId) {
			this.accountId = normalizeAccountId(result.accountId);
			this.api.setToken(result.botToken);
		}
		return result;
	}
	/**
	* Start the long-poll monitor loop. Emits "message" events for each
	* inbound message.
	*
	* Sync buf persistence is opt-in via `opts.loadSyncBuf` / `opts.saveSyncBuf`.
	*
	* Call `stop()` to terminate.
	*/
	async start(opts = {}) {
		if (!this.accountId) throw new Error("No accountId set. Call login() first or pass accountId in constructor.");
		if (!this.api.getToken()) throw new Error("No token set. Call login() first or pass token in constructor options.");
		this.abortController = new AbortController();
		const monitorOpts = {
			signal: this.abortController.signal,
			...opts
		};
		await startMonitor(this.api, monitorOpts, {
			onMessage: async (msg) => {
				if (msg.context_token && msg.from_user_id) this.contextTokens.set(msg.from_user_id, msg.context_token);
				this.emit("message", msg);
			},
			onError: (err) => {
				this.emit("error", err);
			},
			onSessionExpired: () => {
				this.emit("sessionExpired");
			},
			onPoll: (resp) => {
				this.emit("poll", resp);
			}
		});
	}
	/** Stop the long-poll monitor loop. */
	stop() {
		this.abortController?.abort();
		this.abortController = void 0;
	}
	/**
	* Send a text message. Uses the cached context token for the target user.
	* Pass an explicit contextToken to override.
	*/
	async sendText(to, text, contextToken) {
		const ct = contextToken ?? this.contextTokens.get(to);
		if (!ct) throw new Error(`No context_token for user ${to}. Receive a message from them first.`);
		return sendText(this.api, to, text, ct);
	}
	/**
	* Upload a local file and send it as the appropriate media type.
	* (image/*, video/*, or file attachment based on MIME type.)
	*/
	async sendMedia(to, filePath, caption, contextToken) {
		const ct = contextToken ?? this.contextTokens.get(to);
		if (!ct) throw new Error(`No context_token for user ${to}. Receive a message from them first.`);
		return sendMediaFile(this.api, to, filePath, ct, caption);
	}
	/**
	* Send an already-uploaded image.
	*/
	async sendUploadedImage(to, uploaded, caption, contextToken) {
		const ct = contextToken ?? this.contextTokens.get(to);
		if (!ct) throw new Error(`No context_token for user ${to}.`);
		return sendImage(this.api, to, uploaded, ct, caption);
	}
	/**
	* Send an already-uploaded video.
	*/
	async sendUploadedVideo(to, uploaded, caption, contextToken) {
		const ct = contextToken ?? this.contextTokens.get(to);
		if (!ct) throw new Error(`No context_token for user ${to}.`);
		return sendVideo(this.api, to, uploaded, ct, caption);
	}
	/**
	* Send an already-uploaded file attachment.
	*/
	async sendUploadedFile(to, fileName, uploaded, caption, contextToken) {
		const ct = contextToken ?? this.contextTokens.get(to);
		if (!ct) throw new Error(`No context_token for user ${to}.`);
		return sendFileMessage(this.api, to, fileName, uploaded, ct, caption);
	}
	/**
	* Send a "typing" indicator to the user. Requires a typing_ticket
	* (obtained from getConfig).
	*/
	async sendTyping(userId, typingTicket, status = "typing") {
		const req = {
			ilink_user_id: userId,
			typing_ticket: typingTicket,
			status: status === "typing" ? TypingStatus.TYPING : TypingStatus.CANCEL
		};
		await this.api.sendTyping(req);
	}
	/**
	* Get the typing ticket for a user (calls getConfig).
	*/
	async getTypingTicket(userId, contextToken) {
		return (await this.api.getConfig(userId, contextToken)).typing_ticket ?? "";
	}
	async uploadImage(filePath, toUserId) {
		return uploadImage({
			filePath,
			toUserId,
			api: this.api,
			cdnBaseUrl: this.api.cdnBaseUrl
		});
	}
	async uploadVideo(filePath, toUserId) {
		return uploadVideo({
			filePath,
			toUserId,
			api: this.api,
			cdnBaseUrl: this.api.cdnBaseUrl
		});
	}
	async uploadFile(filePath, toUserId) {
		return uploadFile({
			filePath,
			toUserId,
			api: this.api,
			cdnBaseUrl: this.api.cdnBaseUrl
		});
	}
	/**
	* Download and decrypt a media item from an inbound message.
	*/
	async downloadMedia(item) {
		return downloadMediaFromItem(item, this.api.cdnBaseUrl);
	}
	/** Extract the text body from a WeixinMessage. */
	static extractText(msg) {
		return extractTextBody(msg.item_list);
	}
	/** Check if a message item is a media type. */
	static isMediaItem(item) {
		return item.type === MessageItemType.IMAGE || item.type === MessageItemType.VIDEO || item.type === MessageItemType.FILE || item.type === MessageItemType.VOICE;
	}
};
//#endregion
export { ApiClient, CDN_BASE_URL, DEFAULT_BASE_URL, DEFAULT_BOT_TYPE, MessageItemType, MessageState, MessageType, SESSION_EXPIRED_ERRCODE, TypingStatus, UploadMediaType, WeChatClient, aesEcbPaddedSize, buildCdnDownloadUrl, buildCdnUploadUrl, decryptAesEcb, downloadAndDecrypt, downloadMediaFromItem, downloadPlain, encryptAesEcb, generateId, getExtensionFromContentTypeOrUrl, getExtensionFromMime, getMimeFromFilename, loginWithQRCode, normalizeAccountId, parseAesKey, sendFileMessage, sendImage, sendMediaFile, sendText, sendVideo, startMonitor, tempFileName, uploadBufferToCdn, uploadFile, uploadImage, uploadVideo };

//# sourceMappingURL=index.mjs.map