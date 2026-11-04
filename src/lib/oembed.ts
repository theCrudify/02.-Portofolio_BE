import { AppError } from './errors';

export type VideoEmbedProvider = 'youtube' | 'vimeo' | 'loom';

export interface ParsedVideoEmbed {
  provider: VideoEmbedProvider;
  embedId: string;
  canonicalUrl: string;
  defaultThumbnailUrl: string | null;
  oembedEndpoint: string;
}

export function parseVideoUrl(rawUrl: string): ParsedVideoEmbed {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid video URL.');
  }

  if (u.protocol !== 'https:') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Video URL must use https://');
  }

  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  // YouTube: youtube.com/watch?v=ID, youtube.com/shorts/ID, youtu.be/ID
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    let id: string | null = null;
    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (u.pathname === '/watch') {
      id = u.searchParams.get('v');
    } else if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/embed/')) {
      id = u.pathname.split('/').filter(Boolean)[1] ?? null;
    }

    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Could not extract valid YouTube video ID.');
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
    return {
      provider: 'youtube',
      embedId: id,
      canonicalUrl,
      defaultThumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      oembedEndpoint: `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
    };
  }

  // Vimeo: vimeo.com/{id}
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = u.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1] ?? null;
    if (!id || !/^\d{5,15}$/.test(id)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Could not extract valid Vimeo video ID.');
    }
    const canonicalUrl = `https://vimeo.com/${id}`;
    return {
      provider: 'vimeo',
      embedId: id,
      canonicalUrl,
      defaultThumbnailUrl: null,
      oembedEndpoint: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(canonicalUrl)}`,
    };
  }

  // Loom: loom.com/share/{id} or loom.com/embed/{id}
  if (host === 'loom.com') {
    const parts = u.pathname.split('/').filter(Boolean);
    const id = (parts[0] === 'share' || parts[0] === 'embed') ? (parts[1] ?? null) : null;
    if (!id || !/^[a-f0-9]{24,40}$/i.test(id)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Could not extract valid Loom video ID.');
    }
    const canonicalUrl = `https://www.loom.com/share/${id}`;
    return {
      provider: 'loom',
      embedId: id,
      canonicalUrl,
      defaultThumbnailUrl: null,
      oembedEndpoint: `https://www.loom.com/v1/oembed?url=${encodeURIComponent(canonicalUrl)}`,
    };
  }

  throw new AppError(
    400,
    'VALIDATION_ERROR',
    'Unsupported video provider. Allowed providers: YouTube, Vimeo, Loom.'
  );
}

export async function resolveVideoEmbed(rawUrl: string): Promise<{
  provider: VideoEmbedProvider;
  embedId: string;
  url: string;
  titleEn: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
}> {
  const parsed = parseVideoUrl(rawUrl);
  let titleEn: string | null = null;
  let thumbnailUrl: string | null = parsed.defaultThumbnailUrl;
  let durationSec: number | null = null;

  try {
    const res = await fetch(parsed.oembedEndpoint);
    if (res.ok) {
      const data = (await res.json()) as {
        title?: string;
        thumbnail_url?: string;
        duration?: number;
      };
      if (data.title) titleEn = data.title.slice(0, 160);
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
      if (typeof data.duration === 'number') durationSec = data.duration;
    }
  } catch {
    // Graceful fallback if oEmbed network call fails
  }

  return {
    provider: parsed.provider,
    embedId: parsed.embedId,
    url: parsed.canonicalUrl,
    titleEn,
    thumbnailUrl,
    durationSec,
  };
}
