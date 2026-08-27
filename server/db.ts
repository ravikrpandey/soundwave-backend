import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser,
  likedTracks,
  Playlist,
  playlists,
  playlistTracks,
  Track,
  tracks,
  users,
} from "../drizzle/schema";
import { DEMO_PLAYLISTS, DEMO_PLAYLIST_TRACKS, DEMO_TRACKS } from "./catalog";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
type PlaylistWithTracks = Playlist & { tracks: Track[] };
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type PersistedTrackInput = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  genre: string;
  coverTone: string;
  coverAccent: string;
  audioUrl?: string | null;
};

export async function getDb() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!_db && databaseUrl) {
    try {
      _pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 5,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function ensureDemoCatalog() {
  const db = await getDb();
  if (!db) return;
  const [existingTracks, existingPlaylists, existingReferences] = await Promise.all([
    db.select({ id: tracks.id }).from(tracks),
    db.select({ id: playlists.id }).from(playlists),
    db.select({ playlistId: playlistTracks.playlistId, trackId: playlistTracks.trackId }).from(playlistTracks),
  ]);
  const trackIds = new Set(existingTracks.flatMap(track => track ? [track.id] : []));
  const playlistIds = new Set(existingPlaylists.flatMap(playlist => playlist ? [playlist.id] : []));
  const referenceIds = new Set(existingReferences.flatMap(reference => reference ? [`${reference.playlistId}:${reference.trackId}`] : []));
  const tracksToInsert = DEMO_TRACKS.filter(track => !trackIds.has(track.id));
  const playlistsToInsert = DEMO_PLAYLISTS.filter(playlist => !playlistIds.has(playlist.id));
  if (tracksToInsert.length) await db.insert(tracks).values([...tracksToInsert]);
  if (playlistsToInsert.length) await db.insert(playlists).values(playlistsToInsert.map(playlist => ({ ...playlist, ownerId: null })));
  const playlistTracksToInsert = DEMO_PLAYLIST_TRACKS.filter(reference => !referenceIds.has(`${reference.playlistId}:${reference.trackId}`));
  if (playlistTracksToInsert.length) await db.insert(playlistTracks).values([...playlistTracksToInsert]);
}

async function getPlaylistWithTracks(playlistId: number): Promise<PlaylistWithTracks | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const playlist = await db.select().from(playlists).where(eq(playlists.id, playlistId)).limit(1);
  if (!playlist[0]) return undefined;
  const entries = await db
    .select({ track: tracks, position: playlistTracks.position })
    .from(playlistTracks)
    .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
    .where(eq(playlistTracks.playlistId, playlistId))
    .orderBy(asc(playlistTracks.position));
  return { ...playlist[0], tracks: entries.map(entry => entry.track) };
}

export async function getCatalogHome(): Promise<{ tracks: Track[]; playlists: PlaylistWithTracks[] }> {
  const db = await getDb();
  if (!db) return { tracks: [], playlists: [] };
  await ensureDemoCatalog();
  const [catalogTracks, catalogPlaylists] = await Promise.all([
    db.select().from(tracks),
    db.select().from(playlists).where(eq(playlists.kind, "curated")).orderBy(desc(playlists.updatedAt)),
  ]);
  const playlistDetails = await Promise.all(
    catalogPlaylists.flatMap(playlist => (playlist ? [getPlaylistWithTracks(playlist.id)] : []))
  );
  return {
    tracks: catalogTracks.filter((track): track is Track => track !== undefined),
    playlists: playlistDetails.filter(
      (playlist): playlist is PlaylistWithTracks => playlist !== undefined
    ),
  };
}

export async function searchCatalog(query: string) {
  const catalog = await getCatalogHome();
  const normalized = query.trim().toLowerCase();
  if (!normalized) return catalog;
  return {
    tracks: catalog.tracks.filter(track =>
      [track.title, track.artist, track.album, track.genre].some(value =>
        value.toLowerCase().includes(normalized)
      )
    ),
    playlists: catalog.playlists.filter(playlist =>
      [playlist.title, playlist.description ?? ""].some(value =>
        value.toLowerCase().includes(normalized)
      )
    ),
  };
}

export async function getUserLibrary(userId: number): Promise<{ likedTracks: Track[]; playlists: PlaylistWithTracks[] }> {
  const db = await getDb();
  if (!db) return { likedTracks: [], playlists: [] };
  const likes = await db
    .select({ track: tracks })
    .from(likedTracks)
    .innerJoin(tracks, eq(likedTracks.trackId, tracks.id))
    .where(eq(likedTracks.userId, userId))
    .orderBy(desc(likedTracks.createdAt));
  const ownedPlaylists = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.ownerId, userId), eq(playlists.kind, "user")))
    .orderBy(desc(playlists.updatedAt));
  const details = await Promise.all(
    ownedPlaylists.flatMap(playlist => (playlist ? [getPlaylistWithTracks(playlist.id)] : []))
  );
  return {
    likedTracks: likes.flatMap(like => (like.track ? [like.track] : [])),
    playlists: details.filter((playlist): playlist is PlaylistWithTracks => playlist !== undefined),
  };
}

export async function persistTrackForLibrary(db: Database, track: PersistedTrackInput) {
  const values = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationSeconds: track.durationSeconds,
    genre: track.genre,
    coverTone: track.coverTone,
    coverAccent: track.coverAccent,
    audioUrl: track.audioUrl ?? null,
  };
  await db.insert(tracks).values(values).onConflictDoUpdate({
    target: tracks.id,
    set: {
      title: values.title,
      artist: values.artist,
      album: values.album,
      durationSeconds: values.durationSeconds,
      genre: values.genre,
      coverTone: values.coverTone,
      coverAccent: values.coverAccent,
      audioUrl: values.audioUrl,
    },
  });
  const persisted = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, track.id)).limit(1);
  if (!persisted[0]) throw new Error("Track persistence could not be verified");
}

export async function toggleTrackLikeOnDb(db: Database, userId: number, track: PersistedTrackInput) {
  await persistTrackForLibrary(db, track);
  const existing = await db
    .select({ id: likedTracks.id })
    .from(likedTracks)
    .where(and(eq(likedTracks.userId, userId), eq(likedTracks.trackId, track.id)))
    .limit(1);
  if (existing[0]) {
    await db.delete(likedTracks).where(eq(likedTracks.id, existing[0].id));
    return { liked: false };
  }
  await db.insert(likedTracks).values({ userId, trackId: track.id });
  return { liked: true };
}

export async function toggleTrackLike(userId: number, track: PersistedTrackInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return toggleTrackLikeOnDb(db, userId, track);
}

export async function createUserPlaylist(userId: number, title: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.insert(playlists).values({
    ownerId: userId,
    kind: "user",
    title,
    description: description || null,
    coverTone: "#273046",
    coverAccent: "#fb7185",
  }).returning({ id: playlists.id });
  const playlistId = result[0]?.id;
  if (!playlistId) throw new Error("Playlist could not be created");
  return getPlaylistWithTracks(playlistId);
}

async function assertOwnedPlaylist(userId: number, playlistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const playlist = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.ownerId, userId), eq(playlists.kind, "user")))
    .limit(1);
  if (!playlist[0]) throw new Error("Playlist not found");
  return db;
}

export async function addTrackToOwnedPlaylistOnDb(db: Database, playlistId: number, track: PersistedTrackInput) {
  await persistTrackForLibrary(db, track);
  const existing = await db
    .select({ id: playlistTracks.id })
    .from(playlistTracks)
    .where(and(eq(playlistTracks.playlistId, playlistId), eq(playlistTracks.trackId, track.id)))
    .limit(1);
  if (!existing[0]) {
    const entries = await db
      .select({ position: playlistTracks.position })
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId))
      .orderBy(desc(playlistTracks.position))
      .limit(1);
    await db.insert(playlistTracks).values({
      playlistId,
      trackId: track.id,
      position: (entries[0]?.position ?? -1) + 1,
    });
  }
}

export async function addTrackToPlaylist(userId: number, playlistId: number, track: PersistedTrackInput) {
  const db = await assertOwnedPlaylist(userId, playlistId);
  await addTrackToOwnedPlaylistOnDb(db, playlistId, track);
  return getPlaylistWithTracks(playlistId);
}

export async function removeTrackFromPlaylist(userId: number, playlistId: number, trackId: string) {
  const db = await assertOwnedPlaylist(userId, playlistId);
  await db
    .delete(playlistTracks)
    .where(and(eq(playlistTracks.playlistId, playlistId), eq(playlistTracks.trackId, trackId)));
  return getPlaylistWithTracks(playlistId);
}
