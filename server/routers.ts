import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addTrackToPlaylist,
  createUserPlaylist,
  getCatalogHome,
  getUserLibrary,
  removeTrackFromPlaylist,
  searchCatalog,
  toggleTrackLike,
} from "./db";
import { getAudiusTrendingTracks, searchAudiusTracks } from "./audius";
import { searchYouTubeVideos, YouTubeSearchError } from "./youtube";

const persistedTrackInput = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(140),
  artist: z.string().min(1).max(140),
  album: z.string().min(1).max(140),
  durationSeconds: z.number().int().positive().max(7200),
  genre: z.string().min(1).max(64),
  coverTone: z.string().min(1).max(32),
  coverAccent: z.string().min(1).max(32),
  audioUrl: z.string().url().nullable().optional(),
});

type CommercialSearchResponse = {
  videos: Awaited<ReturnType<typeof searchYouTubeVideos>>;
  availability: "available" | "rate_limited" | "unavailable";
};

async function searchCommercialVideos(query: string): Promise<CommercialSearchResponse> {
  try {
    return { videos: await searchYouTubeVideos(query), availability: "available" };
  } catch (error) {
    const availability = error instanceof YouTubeSearchError && error.code === "rate_limited" ? "rate_limited" : "unavailable";
    return { videos: [], availability };
  }
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ?? null),
    // Supabase sessions live in the browser client. This remains a harmless
    // compatibility response for older UI clients; it does not clear any
    // cross-site cookie because Render does not issue one.
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  catalog: router({
    home: publicProcedure.query(() => getCatalogHome()),
    search: publicProcedure.input(z.object({ query: z.string().max(120) })).query(({ input }) => searchCatalog(input.query)),
    audiusTrending: publicProcedure.query(() => getAudiusTrendingTracks()),
    audiusSearch: publicProcedure.input(z.object({ query: z.string().max(120) })).query(({ input }) => searchAudiusTracks(input.query)),
    youtubeSearch: publicProcedure.input(z.object({ query: z.string().trim().min(1).max(120) })).query(({ input }) => searchCommercialVideos(input.query)),
  }),
  library: router({
    get: protectedProcedure.query(({ ctx }) => getUserLibrary(ctx.user.id)),
    toggleLike: protectedProcedure
      .input(z.object({ track: persistedTrackInput }))
      .mutation(({ ctx, input }) => toggleTrackLike(ctx.user.id, input.track)),
    createPlaylist: protectedProcedure
      .input(z.object({ title: z.string().trim().min(1).max(140), description: z.string().trim().max(320).optional() }))
      .mutation(({ ctx, input }) => createUserPlaylist(ctx.user.id, input.title, input.description)),
    addTrack: protectedProcedure
      .input(z.object({ playlistId: z.number().int().positive(), track: persistedTrackInput }))
      .mutation(({ ctx, input }) => addTrackToPlaylist(ctx.user.id, input.playlistId, input.track)),
    removeTrack: protectedProcedure
      .input(z.object({ playlistId: z.number().int().positive(), trackId: z.string().min(1).max(64) }))
      .mutation(({ ctx, input }) => removeTrackFromPlaylist(ctx.user.id, input.playlistId, input.trackId)),
  }),
});

export type AppRouter = typeof appRouter;
