import { ENV } from "./_core/env";

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { medium?: { url?: string }; high?: { url?: string }; default?: { url?: string } };
  };
};

type YouTubeSearchResponse = { items?: YouTubeSearchItem[] };

export type CommercialVideo = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  provider: "youtube";
};

export class YouTubeSearchError extends Error {
  constructor(public readonly code: "rate_limited" | "unavailable", message: string) {
    super(message);
    this.name = "YouTubeSearchError";
  }
}

const cache = new Map<string, { expiresAt: number; videos: CommercialVideo[] }>();
let rateLimitCooldownUntil = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000;

export function resetYouTubeSearchStateForTests() {
  cache.clear();
  rateLimitCooldownUntil = 0;
}

export function mapYouTubeSearchItems(items: YouTubeSearchItem[]): CommercialVideo[] {
  return items.flatMap(item => {
    const id = item.id?.videoId;
    const title = item.snippet?.title?.trim();
    if (!id || !title) return [];
    return [{
      id,
      title,
      channelTitle: item.snippet?.channelTitle?.trim() || "YouTube",
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
      provider: "youtube" as const,
    }];
  });
}

export async function searchYouTubeVideos(
  query: string,
  options: { apiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<CommercialVideo[]> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const cached = cache.get(normalizedQuery);
  if (cached && cached.expiresAt > Date.now()) return cached.videos;
  if (Date.now() < rateLimitCooldownUntil) throw new YouTubeSearchError("rate_limited", "Official YouTube results are temporarily paused while the provider recovers.");

  const apiKey = options.apiKey ?? ENV.youtubeDataApiKey;
  if (!apiKey) throw new YouTubeSearchError("unavailable", "YouTube search is not configured");
  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    videoCategoryId: "10",
    maxResults: "12",
    q: query.trim(),
  });
  const response = await (options.fetchImpl ?? fetch)(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!response.ok) {
    if (response.status === 429) {
      rateLimitCooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      throw new YouTubeSearchError("rate_limited", "Official YouTube results are temporarily paused while the provider recovers.");
    }
    throw new YouTubeSearchError("unavailable", `YouTube search is temporarily unavailable (status ${response.status}).`);
  }
  const payload = await response.json() as YouTubeSearchResponse;
  const videos = mapYouTubeSearchItems(payload.items ?? []);
  cache.set(normalizedQuery, { videos, expiresAt: Date.now() + CACHE_TTL_MS });
  return videos;
}
