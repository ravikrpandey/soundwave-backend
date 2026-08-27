import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapYouTubeSearchItems, resetYouTubeSearchStateForTests, searchYouTubeVideos, YouTubeSearchError } from "./youtube";

describe("YouTube commercial search adapter", () => {
  const apiItem = {
    id: { videoId: "video-123" },
    snippet: { title: "Official Bhojpuri Release", channelTitle: "Official Label", thumbnails: { high: { url: "https://img.example/video.jpg" } } },
  };

  beforeEach(() => resetYouTubeSearchStateForTests());

  it("maps only embeddable commercial-video search records without audio extraction fields", () => {
    expect(mapYouTubeSearchItems([apiItem, { id: {} }])).toEqual([{
      id: "video-123", title: "Official Bhojpuri Release", channelTitle: "Official Label", thumbnailUrl: "https://img.example/video.jpg", provider: "youtube",
    }]);
  });

  it("requests embeddable video results through the official search endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [apiItem] }), { status: 200 }));
    const results = await searchYouTubeVideos("Bhojpuri official songs", { apiKey: "test-key", fetchImpl });
    const requestUrl = new URL(fetchImpl.mock.calls[0]?.[0]);

    expect(requestUrl.origin + requestUrl.pathname).toBe("https://www.googleapis.com/youtube/v3/search");
    expect(requestUrl.searchParams.get("type")).toBe("video");
    expect(requestUrl.searchParams.get("videoEmbeddable")).toBe("true");
    expect(requestUrl.searchParams.get("videoCategoryId")).toBe("10");
    expect(results[0]?.provider).toBe("youtube");
    expect(results[0]).not.toHaveProperty("audioUrl");
  });

  it("surfaces a typed rate-limit outcome and pauses repeat provider calls after a 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));

    await expect(searchYouTubeVideos("Bhojpuri", { apiKey: "test-key", fetchImpl })).rejects.toMatchObject({ code: "rate_limited" } satisfies Partial<YouTubeSearchError>);
    await expect(searchYouTubeVideos("Bollywood", { apiKey: "test-key", fetchImpl })).rejects.toMatchObject({ code: "rate_limited" } satisfies Partial<YouTubeSearchError>);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
