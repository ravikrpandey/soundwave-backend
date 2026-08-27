import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { DEMO_PLAYLISTS, DEMO_PLAYLIST_TRACKS, DEMO_TRACKS } from "../../../server/catalog.ts";
import { trpcBatchPayload } from "./protocol.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const serviceKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const youtubeKey = Deno.env.get("YOUTUBE_DATA_API_KEY");
const allowedOrigin = Deno.env.get("FRONTEND_ORIGIN") ?? "*";

const headers = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

type Track = Record<string, unknown> & { id: string };
type Playlist = Record<string, unknown> & { id: number };
type User = Record<string, unknown> & { id: number; openId: string };

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers }); }
function trpc(data: unknown) { return json({ result: { data: { json: data } } }); }
function trpcBatch(data: unknown) { return json(trpcBatchPayload(data)); }
function inputOf(url: URL): any {
  const raw = url.searchParams.get("input");
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  const first = parsed?.["0"];
  return first?.json ?? first ?? parsed?.json ?? parsed;
}

async function table<T = any>(client: SupabaseClient, name: string, query: (q: any) => any): Promise<T[]> {
  const result = await query(client.from(name));
  if (result.error) throw result.error;
  return (result.data ?? []) as T[];
}

function fallbackHome() {
  return { tracks: DEMO_TRACKS, playlists: DEMO_PLAYLISTS.map(playlist => ({ ...playlist, tracks: DEMO_PLAYLIST_TRACKS.filter(row => row.playlistId === playlist.id).map(row => DEMO_TRACKS.find(track => track.id === row.trackId)).filter(Boolean) })) };
}

async function getHome() {
  const [tracks, playlists, references] = await Promise.all([
    table<Track>(admin, "tracks", q => q.select("*")),
    table<Playlist>(admin, "playlists", q => q.select("*").eq("kind", "curated").order("updatedAt", { ascending: false })),
    table<any>(admin, "playlistTracks", q => q.select("*")),
  ]);
  if (!tracks.length || !playlists.length) return fallbackHome();
  const byId = new Map(tracks.map(track => [track.id, track]));
  return { tracks, playlists: playlists.map(playlist => ({ ...playlist, tracks: references.filter(row => row.playlistId === playlist.id).sort((a, b) => a.position - b.position).map(row => byId.get(row.trackId)).filter(Boolean) })) };
}

async function getUser(token: string | null): Promise<User | null> {
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const authUser = data.user;
  const payload = { openId: authUser.id, name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? authUser.email ?? "Soundwave listener", email: authUser.email ?? null, loginMethod: "google", lastSignedIn: new Date().toISOString() };
  const upsert = await admin.from("users").upsert(payload, { onConflict: "openId" }).select("*").single();
  if (upsert.error) throw upsert.error;
  return upsert.data as User;
}

async function userLibrary(user: User) {
  const likes = await table<any>(admin, "likedTracks", q => q.select("trackId, createdAt").eq("userId", user.id).order("createdAt", { ascending: false }));
  const likedIds = likes.map(row => row.trackId);
  const likedTracks = likedIds.length ? await table<Track>(admin, "tracks", q => q.select("*").in("id", likedIds)) : [];
  const playlists = await table<Playlist>(admin, "playlists", q => q.select("*").eq("ownerId", user.id).eq("kind", "user").order("updatedAt", { ascending: false }));
  const refs = playlists.length ? await table<any>(admin, "playlistTracks", q => q.select("*").in("playlistId", playlists.map(row => row.id)).order("position")) : [];
  const ids = [...new Set(refs.map(row => row.trackId))];
  const tracks = ids.length ? await table<Track>(admin, "tracks", q => q.select("*").in("id", ids)) : [];
  const byId = new Map(tracks.map(track => [track.id, track]));
  return { likedTracks, playlists: playlists.map(playlist => ({ ...playlist, tracks: refs.filter(row => row.playlistId === playlist.id).map(row => byId.get(row.trackId)).filter(Boolean) })) };
}

async function persistTrack(track: any) {
  const value = { id: track.id, title: track.title, artist: track.artist, album: track.album, durationSeconds: track.durationSeconds, genre: track.genre, coverTone: track.coverTone, coverAccent: track.coverAccent, audioUrl: track.audioUrl ?? null };
  const result = await admin.from("tracks").upsert(value, { onConflict: "id" });
  if (result.error) throw result.error;
}

async function toggleLike(user: User, track: any) {
  await persistTrack(track);
  const current = await table<any>(admin, "likedTracks", q => q.select("id").eq("userId", user.id).eq("trackId", track.id).limit(1));
  if (current[0]) { const result = await admin.from("likedTracks").delete().eq("id", current[0].id); if (result.error) throw result.error; return { liked: false }; }
  const result = await admin.from("likedTracks").insert({ userId: user.id, trackId: track.id });
  if (result.error) throw result.error;
  return { liked: true };
}

async function ownedPlaylist(user: User, id: number) {
  const rows = await table<Playlist>(admin, "playlists", q => q.select("*").eq("id", id).eq("ownerId", user.id).eq("kind", "user").limit(1));
  if (!rows[0]) throw new Error("Playlist not found");
  return rows[0];
}

async function playlistWithTracks(id: number) {
  const rows = await table<Playlist>(admin, "playlists", q => q.select("*").eq("id", id).limit(1));
  if (!rows[0]) return undefined;
  const refs = await table<any>(admin, "playlistTracks", q => q.select("*").eq("playlistId", id).order("position"));
  const tracks = refs.length ? await table<Track>(admin, "tracks", q => q.select("*").in("id", refs.map(row => row.trackId))) : [];
  const byId = new Map(tracks.map(track => [track.id, track]));
  return { ...rows[0], tracks: refs.map(row => byId.get(row.trackId)).filter(Boolean) };
}

async function audius(path: string) {
  const response = await fetch(`https://discoveryprovider.audius.co/v1${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Audius API returned ${response.status}`);
  const payload = await response.json();
  return (payload.data ?? []).flatMap((track: any) => {
    const id = String(track.id ?? ""); if (!id || !track.title) return [];
    const n = Array.from(id).reduce((sum, c) => sum * 31 + c.charCodeAt(0), 7);
    const palettes = [["#20395e", "#77c8ff"], ["#4d2768", "#f58dde"], ["#754032", "#ffad7b"], ["#24514a", "#7ee5c1"]];
    const [coverTone, coverAccent] = palettes[Math.abs(n) % palettes.length];
    return [{ id: `audius:${id}`, title: track.title, artist: track.user?.name || track.user?.handle || "Audius artist", album: track.album_backlink?.title || track.mood || "Audius release", durationSeconds: Math.max(1, Math.round(track.duration || 180)), genre: track.genre || "Open catalog", coverTone, coverAccent, audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${encodeURIComponent(id)}/stream`, source: "audius" }];
  });
}

let youtubeCooldown = 0;
async function youtube(query: string) {
  if (!youtubeKey || Date.now() < youtubeCooldown) return [];
  const params = new URLSearchParams({ key: youtubeKey, part: "snippet", type: "video", videoEmbeddable: "true", videoCategoryId: "10", maxResults: "12", q: query });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (response.status === 429) { youtubeCooldown = Date.now() + 120000; return []; }
  if (!response.ok) return [];
  const payload = await response.json();
  return (payload.items ?? []).flatMap((item: any) => { const id = item.id?.videoId; const snippet = item.snippet; if (!id || !snippet?.title) return []; return [{ id, title: snippet.title.trim(), channelTitle: snippet.channelTitle?.trim() || "YouTube", thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "", provider: "youtube" }]; });
}

async function handleProcedure(procedure: string, input: any, user: User | null) {
  if (procedure === "auth.me") return user;
  if (procedure === "auth.logout") return { success: true };
  if (procedure === "catalog.home") return getHome();
  if (procedure === "catalog.search") { const home = await getHome(); const query = String(input.query ?? "").trim().toLowerCase(); if (!query) return home; return { tracks: home.tracks.filter((track: any) => [track.title, track.artist, track.album, track.genre].some(value => String(value).toLowerCase().includes(query))), playlists: home.playlists.filter((playlist: any) => [playlist.title, playlist.description ?? ""].some(value => String(value).toLowerCase().includes(query))) }; }
  if (procedure === "catalog.audiusTrending") return audius("/tracks/trending?limit=18");
  if (procedure === "catalog.audiusSearch") return audius(`/tracks/search?query=${encodeURIComponent(input.query ?? "")}&limit=30`);
  if (procedure === "catalog.youtubeSearch") return { videos: await youtube(input.query ?? ""), availability: youtubeKey && Date.now() >= youtubeCooldown ? "available" : "rate_limited" };
  if (!user) throw new Error("Authentication required");
  if (procedure === "library.get") return userLibrary(user);
  if (procedure === "library.toggleLike") return toggleLike(user, input.track);
  if (procedure === "library.createPlaylist") { const result = await admin.from("playlists").insert({ ownerId: user.id, kind: "user", title: input.title, description: input.description || null, coverTone: "#273046", coverAccent: "#fb7185" }).select("id").single(); if (result.error) throw result.error; return playlistWithTracks(result.data.id); }
  if (procedure === "library.addTrack") { await ownedPlaylist(user, input.playlistId); await persistTrack(input.track); const existing = await table<any>(admin, "playlistTracks", q => q.select("id").eq("playlistId", input.playlistId).eq("trackId", input.track.id).limit(1)); if (!existing[0]) { const last = await table<any>(admin, "playlistTracks", q => q.select("position").eq("playlistId", input.playlistId).order("position", { ascending: false }).limit(1)); const result = await admin.from("playlistTracks").insert({ playlistId: input.playlistId, trackId: input.track.id, position: (last[0]?.position ?? -1) + 1 }); if (result.error) throw result.error; } return playlistWithTracks(input.playlistId); }
  if (procedure === "library.removeTrack") { await ownedPlaylist(user, input.playlistId); const result = await admin.from("playlistTracks").delete().eq("playlistId", input.playlistId).eq("trackId", input.trackId); if (result.error) throw result.error; return playlistWithTracks(input.playlistId); }
  throw new Error(`Unknown procedure: ${procedure}`);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const url = new URL(request.url);
  if (url.pathname.endsWith("/health")) return json({ status: "ok", service: "soundwave-api" });
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  try {
    const user = await getUser(token);
    const path = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const procedure = path === "trpc" ? url.searchParams.get("path") ?? "" : path;
    const value = await handleProcedure(procedure, inputOf(url), user);
    return url.searchParams.has("batch") ? trpcBatch(value) : trpc(value);
  } catch (error) {
    console.error("[soundwave-api]", error instanceof Error ? error.message : error);
    return json({ error: { message: error instanceof Error ? error.message : "Request failed", data: { code: "INTERNAL_SERVER_ERROR" } } }, 500);
  }
});
