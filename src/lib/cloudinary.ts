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
