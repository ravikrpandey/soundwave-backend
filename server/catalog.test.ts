import { describe, expect, it } from "vitest";
import { DEMO_PLAYLISTS, DEMO_PLAYLIST_TRACKS, DEMO_TRACKS } from "./catalog";

describe("demo music catalog", () => {
  it("contains the requested 200-track catalog across a broad set of curated playlists", () => {
    expect(DEMO_TRACKS).toHaveLength(200);
    expect(DEMO_PLAYLISTS).toHaveLength(16);
    expect(DEMO_PLAYLIST_TRACKS).toHaveLength(288);
  });

  it("uses unique track identifiers and positive playback durations", () => {
    const identifiers = DEMO_TRACKS.map(track => track.id);
    expect(new Set(identifiers).size).toBe(identifiers.length);
    expect(DEMO_TRACKS.every(track => track.durationSeconds > 0)).toBe(true);
    expect(DEMO_TRACKS.every(track => track.title && track.artist && track.album)).toBe(true);
  });

  it("only references valid tracks and playlists in curated collections", () => {
    const trackIds = new Set(DEMO_TRACKS.map(track => track.id));
    const playlistIds = new Set(DEMO_PLAYLISTS.map(playlist => playlist.id));
    expect(DEMO_PLAYLIST_TRACKS.every(entry => trackIds.has(entry.trackId))).toBe(true);
    expect(DEMO_PLAYLIST_TRACKS.every(entry => playlistIds.has(entry.playlistId))).toBe(true);
  });

  it("keeps each track unique within a curated playlist", () => {
    const references = DEMO_PLAYLIST_TRACKS.map(entry => `${entry.playlistId}:${entry.trackId}`);
    expect(new Set(references).size).toBe(references.length);
  });
});
