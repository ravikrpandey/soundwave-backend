const AUDIUS_API_BASE = "https://api.audius.co/v1";
const COVER_PALETTES = [
  ["#20395e", "#77c8ff"], ["#4d2768", "#f58dde"], ["#754032", "#ffad7b"], ["#24514a", "#7ee5c1"],
  ["#493768", "#b7a3ff"], ["#5b4b2a", "#f7df74"], ["#703347", "#ff9cba"], ["#244d69", "#88d0ff"],
] as const;

type AudiusArtist = { name?: string; handle?: string };
type AudiusTrack = {
  id: string | number;
  title?: string;
  duration?: number;
  genre?: string;
  mood?: string;
  user?: AudiusArtist;
  album_backlink?: { title?: string } | null;
};

export type AudiusSoundwaveTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  genre: string;
  coverTone: string;
  coverAccent: string;
  audioUrl: string;
  source: "audius";
};

function stableColor(value: string) {
  const hash = Array.from(value).reduce((total, character) => total * 31 + character.charCodeAt(0), 7);
  return COVER_PALETTES[Math.abs(hash) % COVER_PALETTES.length];
}

function mapTrack(track: AudiusTrack): AudiusSoundwaveTrack | null {
  const rawId = String(track.id ?? "").trim();
  if (!rawId || !track.title) return null;
  const [coverTone, coverAccent] = stableColor(rawId);
  return {
    id: `audius:${rawId}`,
    title: track.title,
    artist: track.user?.name || track.user?.handle || "Audius artist",
    album: track.album_backlink?.title || track.mood || "Audius release",
    durationSeconds: Math.max(1, Math.round(track.duration || 180)),
    genre: track.genre || "Open catalog",
    coverTone,
    coverAccent,
    audioUrl: `${AUDIUS_API_BASE}/tracks/${encodeURIComponent(rawId)}/stream`,
    source: "audius",
  };
}

async function requestAudius(path: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${AUDIUS_API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Audius API returned ${response.status}`);
    const payload = await response.json() as { data?: AudiusTrack[] };
    return (payload.data ?? []).flatMap(track => {
      const mapped = mapTrack(track);
      return mapped ? [mapped] : [];
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAudiusTrendingTracks(limit = 18) {
  return requestAudius(`/tracks/trending?limit=${Math.min(Math.max(limit, 1), 30)}`);
}

export async function searchAudiusTracks(query: string, limit = 30) {
  const normalized = query.trim();
  if (!normalized) return getAudiusTrendingTracks(Math.min(limit, 18));
  return requestAudius(`/tracks/search?query=${encodeURIComponent(normalized)}&limit=${Math.min(Math.max(limit, 1), 50)}`);
}
