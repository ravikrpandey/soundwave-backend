CREATE TYPE "public"."playlist_kind" AS ENUM('curated', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "likedTracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"trackId" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlistTracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"playlistId" integer NOT NULL,
	"trackId" varchar(64) NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer,
	"kind" "playlist_kind" NOT NULL,
	"title" varchar(140) NOT NULL,
	"description" text,
	"coverTone" varchar(32) NOT NULL,
	"coverAccent" varchar(32) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" varchar(140) NOT NULL,
	"artist" varchar(140) NOT NULL,
	"album" varchar(140) NOT NULL,
	"durationSeconds" integer NOT NULL,
	"genre" varchar(64) NOT NULL,
	"coverTone" varchar(32) NOT NULL,
	"coverAccent" varchar(32) NOT NULL,
	"audioUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "likedTracks" ADD CONSTRAINT "likedTracks_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likedTracks" ADD CONSTRAINT "likedTracks_trackId_tracks_id_fk" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlistTracks" ADD CONSTRAINT "playlistTracks_playlistId_playlists_id_fk" FOREIGN KEY ("playlistId") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlistTracks" ADD CONSTRAINT "playlistTracks_trackId_tracks_id_fk" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_track_unique" ON "likedTracks" USING btree ("userId","trackId");--> statement-breakpoint
CREATE UNIQUE INDEX "playlist_track_unique" ON "playlistTracks" USING btree ("playlistId","trackId");