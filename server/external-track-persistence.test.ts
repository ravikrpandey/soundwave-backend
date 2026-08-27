import { describe, expect, it, vi } from "vitest";
import { likedTracks, playlistTracks, tracks } from "../drizzle/schema";
import { addTrackToOwnedPlaylistOnDb, persistTrackForLibrary, toggleTrackLikeOnDb } from "./db";

const externalTrack = {
  id: "audius:3oqjbGv",
  title: "Peak",
  artist: "@iLLPeTiLL",
  album: "Empowering",
  durationSeconds: 356,
  genre: "House",
  coverTone: "#5b4b2a",
  coverAccent: "#f7df74",
  audioUrl: "https://api.audius.co/v1/tracks/3oqjbGv/stream",
};

function createLibraryDb(responses: unknown[][]) {
  const events: string[] = [];
  const takeResponse = () => responses.shift() ?? [];
  const fakeDb = {
    insert: vi.fn((table: unknown) => {
      if (table === tracks) {
        events.push("track-insert");
        return { values: vi.fn(() => ({ onConflictDoUpdate: async () => events.push("track-upsert") })) };
      }
      if (table === likedTracks) return { values: async () => { events.push("liked-reference"); } };
      if (table === playlistTracks) return { values: async () => { events.push("playlist-reference"); } };
      return { values: async () => undefined };
    }),
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => { events.push("select"); return takeResponse(); },
          orderBy: () => ({ limit: async () => { events.push("select"); return takeResponse(); } }),
        }),
      }),
    })),
  };
  return { events, fakeDb };
}

describe("external track persistence", () => {
  it("upserts and verifies an Audius track before a library reference can be written", async () => {
    const events: string[] = [];
    const onConflictDoUpdate = vi.fn(async () => { events.push("upsert"); });
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const fakeDb = {
      insert: vi.fn(() => { events.push("insert"); return { values }; }),
      select: vi.fn(() => ({
        from: () => ({ where: () => ({ limit: async () => { events.push("verify"); return [{ id: externalTrack.id }]; } }) }),
      })),
    };

    await persistTrackForLibrary(fakeDb as never, externalTrack);

    expect(events).toEqual(["insert", "upsert", "verify"]);
    expect(onConflictDoUpdate).toHaveBeenCalledWith({
      target: tracks.id,
      set: expect.objectContaining({ title: "Peak", audioUrl: externalTrack.audioUrl }),
    });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ id: externalTrack.id, artist: externalTrack.artist }));
  });

  it("persists and verifies an Audius track before inserting a liked-track reference", async () => {
    const { events, fakeDb } = createLibraryDb([[{ id: externalTrack.id }], []]);

    await expect(toggleTrackLikeOnDb(fakeDb as never, 1, externalTrack)).resolves.toEqual({ liked: true });

    expect(events).toEqual(["track-insert", "track-upsert", "select", "select", "liked-reference"]);
  });

  it("persists and verifies an Audius track before inserting a playlist-track reference", async () => {
    const { events, fakeDb } = createLibraryDb([[{ id: externalTrack.id }], [], []]);

    await addTrackToOwnedPlaylistOnDb(fakeDb as never, 501, externalTrack);

    expect(events).toEqual(["track-insert", "track-upsert", "select", "select", "select", "playlist-reference"]);
  });
});
