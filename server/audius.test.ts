import { afterEach, describe, expect, it, vi } from "vitest";
import { getAudiusTrendingTracks, searchAudiusTracks } from "./audius";

const apiTrack = {
  id: "95wro",
  title: "Stars In The Sky",
  duration: 71,
  genre: "Hip-Hop/Rap",
  mood: "Peaceful",
  user: { name: "Lofi Beats" },
  album_backlink: { title: "Night focus" },
};

afterEach(() => vi.unstubAllGlobals());

describe("Audius catalog adapter", () => {
  it("maps an official open-catalog search response into a Soundwave streamable track", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [apiTrack] }) });
    vi.stubGlobal("fetch", fetchMock);

    const tracks = await searchAudiusTracks("lofi");

    expect(fetchMock).toHaveBeenCalledWith("https://api.audius.co/v1/tracks/search?query=lofi&limit=30", expect.any(Object));
    expect(tracks).toEqual([expect.objectContaining({
      id: "audius:95wro",
      title: "Stars In The Sky",
      artist: "Lofi Beats",
      durationSeconds: 71,
      source: "audius",
      audioUrl: "https://api.audius.co/v1/tracks/95wro/stream",
    })]);
  });

  it("uses the same safe adapter for live trending tracks", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [apiTrack] }) }));

    const tracks = await getAudiusTrendingTracks(1);

    expect(tracks[0]).toMatchObject({ id: "audius:95wro", source: "audius" });
  });
});
