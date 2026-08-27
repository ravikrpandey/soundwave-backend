import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const playlistKind = pgEnum("playlist_kind", ["curated", "user"]);

/** Core user table backing the Soundwave authenticated session. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** A compact, original demo-track catalog. Playback is generated in the client. */
export const tracks = pgTable("tracks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 140 }).notNull(),
  artist: varchar("artist", { length: 140 }).notNull(),
  album: varchar("album", { length: 140 }).notNull(),
  durationSeconds: integer("durationSeconds").notNull(),
  genre: varchar("genre", { length: 64 }).notNull(),
  coverTone: varchar("coverTone", { length: 32 }).notNull(),
  coverAccent: varchar("coverAccent", { length: 32 }).notNull(),
  audioUrl: text("audioUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").references(() => users.id, { onDelete: "cascade" }),
  kind: playlistKind("kind").notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description"),
  coverTone: varchar("coverTone", { length: 32 }).notNull(),
  coverAccent: varchar("coverAccent", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const playlistTracks = pgTable(
  "playlistTracks",
  {
    id: serial("id").primaryKey(),
    playlistId: integer("playlistId")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: varchar("trackId", { length: 64 })
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("playlist_track_unique").on(table.playlistId, table.trackId)]
);

export const likedTracks = pgTable(
  "likedTracks",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: varchar("trackId", { length: 64 })
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("user_track_unique").on(table.userId, table.trackId)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type PlaylistTrack = typeof playlistTracks.$inferSelect;
