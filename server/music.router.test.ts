import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  addTrackToPlaylist: vi.fn(),
  createUserPlaylist: vi.fn(),
  getCatalogHome: vi.fn(),
  getUserLibrary: vi.fn(),
  removeTrackFromPlaylist: vi.fn(),
  searchCatalog: vi.fn(),
  toggleTrackLike: vi.fn(),
}));
const audiusMocks = vi.hoisted(() => ({
  getAudiusTrendingTracks: vi.fn(),
  searchAudiusTracks: vi.fn(),
}));
const youtubeMocks = vi.hoisted(() => ({
  searchYouTubeVideos: vi.fn(),
  YouTubeSearchError: class YouTubeSearchError extends Error {
    code: "rate_limited" | "unavailable";
    constructor(code: "rate_limited" | "unavailable", message: string) { super(message); this.code = code; }
  },
}));

vi.mock("./db", () => dbMocks);
vi.mock("./audius", () => audiusMocks);
vi.mock("./youtube", () => youtubeMocks);

import { appRouter } from "./routers";

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "music-tester",
      name: "Music Tester",
      email: "tester@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("music router", () => {
  it("passes catalog text search through to the search helper", async () => {
    const expected = { tracks: [{ id: "night-swim" }], playlists: [] };
    dbMocks.searchCatalog.mockResolvedValueOnce(expected);

    const result = await appRouter.createCaller(createUserContext()).catalog.search({ query: "night" });

    expect(dbMocks.searchCatalog).toHaveBeenCalledWith("night");
    expect(result).toEqual(expected);
  });

  it("routes live Audius discovery and search through the catalog adapter", async () => {
    audiusMocks.getAudiusTrendingTracks.mockResolvedValueOnce([{ id: "audius:live" }]);
    audiusMocks.searchAudiusTracks.mockResolvedValueOnce([{ id: "audius:search" }]);
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.catalog.audiusTrending()).resolves.toEqual([{ id: "audius:live" }]);
    await expect(caller.catalog.audiusSearch({ query: "lofi" })).resolves.toEqual([{ id: "audius:search" }]);
    expect(audiusMocks.searchAudiusTracks).toHaveBeenCalledWith("lofi");
  });

  it("returns a safe commercial-search response when YouTube is rate limited", async () => {
    youtubeMocks.searchYouTubeVideos.mockRejectedValueOnce(new youtubeMocks.YouTubeSearchError("rate_limited", "quota paused"));

    await expect(appRouter.createCaller(createUserContext()).catalog.youtubeSearch({ query: "Bhojpuri" })).resolves.toEqual({ videos: [], availability: "rate_limited" });
  });

  it("uses the authenticated user when toggling a like", async () => {
    dbMocks.toggleTrackLike.mockResolvedValueOnce({ liked: true });

    const track = { id: "tideglass", title: "Tideglass", artist: "Mara Vale", album: "Afterglow", durationSeconds: 218, genre: "Ambient", coverTone: "#1d3557", coverAccent: "#52b788", audioUrl: null };
    const result = await appRouter.createCaller(createUserContext()).library.toggleLike({ track });

    expect(dbMocks.toggleTrackLike).toHaveBeenCalledWith(42, track);
    expect(result).toEqual({ liked: true });
  });

  it("routes playlist creation and track changes through the authenticated user", async () => {
    dbMocks.createUserPlaylist.mockResolvedValueOnce({ id: 701, title: "Night notes" });
    dbMocks.addTrackToPlaylist.mockResolvedValueOnce({ id: 701, tracks: [{ id: "tideglass" }] });
    dbMocks.removeTrackFromPlaylist.mockResolvedValueOnce({ id: 701, tracks: [] });
    const caller = appRouter.createCaller(createUserContext());

    await caller.library.createPlaylist({ title: "Night notes", description: "A little atmosphere" });
    const track = { id: "tideglass", title: "Tideglass", artist: "Mara Vale", album: "Afterglow", durationSeconds: 218, genre: "Ambient", coverTone: "#1d3557", coverAccent: "#52b788", audioUrl: null };
    await caller.library.addTrack({ playlistId: 701, track });
    await caller.library.removeTrack({ playlistId: 701, trackId: "tideglass" });

    expect(dbMocks.createUserPlaylist).toHaveBeenCalledWith(42, "Night notes", "A little atmosphere");
    expect(dbMocks.addTrackToPlaylist).toHaveBeenCalledWith(42, 701, track);
    expect(dbMocks.removeTrackFromPlaylist).toHaveBeenCalledWith(42, 701, "tideglass");
  });
});
