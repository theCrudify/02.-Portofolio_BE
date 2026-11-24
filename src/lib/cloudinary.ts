import { AppError } from './errors';
import type { Env } from '../types/env';

export type UploadKind = 'image' | 'video' | 'document' | 'pdf';

export interface UploadConfig {
  folder: string;
  resourceType: 'image' | 'video' | 'raw';
  maxBytes: number;
  allowedFormats: string[];
  maxDurationSec?: number;
}

export const UPLOAD_RULES: Record<UploadKind, UploadConfig> = {
  image: {
    folder: 'portfolio/images',
    resourceType: 'image',
    maxBytes: 10 * 1024 * 1024, // 10 MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg'],
  },
  video: {
    folder: 'portfolio/clips',
    resourceType: 'video',
    maxBytes: 25 * 1024 * 1024, // 25 MB
    allowedFormats: ['mp4', 'webm'],
    maxDurationSec: 30,
  },
  // Project documentation: PDFs plus slide decks and office files.
  document: {
    folder: 'portfolio/docs',
    resourceType: 'raw',
    maxBytes: 25 * 1024 * 1024, // 25 MB
    allowedFormats: ['pdf', 'pptx', 'ppt', 'key', 'odp', 'docx', 'xlsx'],
  },
  pdf: {
    folder: 'portfolio/docs',
    resourceType: 'raw',
    maxBytes: 15 * 1024 * 1024, // 15 MB
    allowedFormats: ['pdf'],
  },
};


export async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string
): Promise<string> {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return sha1Hex(`${sorted}${apiSecret}`);
}

export async function signUpload(env: Env, kind: string, timestamp?: number) {
  const rule = UPLOAD_RULES[kind as UploadKind];
  if (!rule) {
    throw new AppError(400, 'VALIDATION_ERROR', `Invalid media kind "${kind}".`);
  }

  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const secret = env.CLOUDINARY_API_SECRET;
  if (!secret || !env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Server misconfigured');
  }
  const signature = await signCloudinaryParams(
    {
      folder: rule.folder,
      timestamp: ts,
    },
    secret
  );

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp: ts,
    folder: rule.folder,
    resourceType: rule.resourceType,
    signature,
    maxBytes: rule.maxBytes,
    allowedFormats: rule.allowedFormats,
  };
}

/** Never expires in practice (year 2100); matches the PDFs already stored. */
const DOWNLOAD_EXPIRES_AT = 4102444800;

/**
 * The account blocks public delivery of raw files (PDFs, decks): `res.cloudinary.com/.../raw/upload/...`
 * answers 401 "deny or ACL failure". A signed `raw/download` URL is served, so store that instead.
 */
export async function signedRawDownloadUrl(env: Env, publicId: string, timestamp?: number): Promise<string> {
  if (!env.CLOUDINARY_API_SECRET || !env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Server misconfigured');
  }
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const params = { expires_at: DOWNLOAD_EXPIRES_AT, public_id: publicId, timestamp: ts, type: 'upload' };
  const signature = await signCloudinaryParams(params, env.CLOUDINARY_API_SECRET);
  const qs = new URLSearchParams({
    public_id: publicId,
    type: 'upload',
    timestamp: String(ts),
    expires_at: String(DOWNLOAD_EXPIRES_AT),
    api_key: env.CLOUDINARY_API_KEY,
    signature,
  });
  return `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/raw/download?${qs}`;
}

export function validateRegisteredMedia(input: {
  kind: string;
  bytes?: number | null;
  durationSec?: number | null;
}) {
  const rule = UPLOAD_RULES[input.kind as UploadKind];
  if (!rule) {
    throw new AppError(400, 'VALIDATION_ERROR', `Invalid media kind "${input.kind}".`);
  }
  if (input.bytes && input.bytes > rule.maxBytes) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `File size (${input.bytes} bytes) exceeds maximum allowed for ${input.kind} (${rule.maxBytes} bytes).`
    );
  }
  if (
    input.kind === 'video' &&
    rule.maxDurationSec &&
    input.durationSec &&
    input.durationSec > rule.maxDurationSec
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Video clip duration (${input.durationSec}s) exceeds maximum allowed (${rule.maxDurationSec}s). Use external video embed for longer videos.`
    );
  }
}
