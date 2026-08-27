const FEATURED_TRACKS = [
  { id: "tideglass", title: "Tideglass", artist: "Mara Vale", album: "Afterglow", durationSeconds: 218, genre: "Ambient", coverTone: "#1d3557", coverAccent: "#52b788", audioUrl: null },
  { id: "slow-bloom", title: "Slow Bloom", artist: "Citrine", album: "Soft Focus", durationSeconds: 204, genre: "Indie", coverTone: "#612f4c", coverAccent: "#f4a261", audioUrl: null },
  { id: "night-swim", title: "Night Swim", artist: "Atoll", album: "Waterline", durationSeconds: 236, genre: "Electronic", coverTone: "#102a43", coverAccent: "#70d6ff", audioUrl: null },
  { id: "glow-state", title: "Glow State", artist: "Lumen Club", album: "Prism", durationSeconds: 191, genre: "Dance", coverTone: "#3d246c", coverAccent: "#ff6bd6", audioUrl: null },
  { id: "places-we-left", title: "Places We Left", artist: "Nico June", album: "Postcards", durationSeconds: 262, genre: "Alternative", coverTone: "#543f2e", coverAccent: "#f6bd60", audioUrl: null },
  { id: "open-window", title: "Open Window", artist: "Sonder", album: "Daylight Archive", durationSeconds: 187, genre: "Lo-fi", coverTone: "#314a38", coverAccent: "#b8e986", audioUrl: null },
  { id: "mercury", title: "Mercury", artist: "Velour", album: "Orbiting", durationSeconds: 228, genre: "Electronic", coverTone: "#452a5a", coverAccent: "#a78bfa", audioUrl: null },
  { id: "blue-room", title: "Blue Room", artist: "Kite Lines", album: "Rooms", durationSeconds: 212, genre: "Jazz", coverTone: "#16324f", coverAccent: "#f7c59f", audioUrl: null },
  { id: "early-hours", title: "Early Hours", artist: "Eloise Reed", album: "Quiet Light", durationSeconds: 245, genre: "Acoustic", coverTone: "#5b4b3a", coverAccent: "#f9dc5c", audioUrl: null },
  { id: "heat-haze", title: "Heat Haze", artist: "Foam", album: "Late Summer", durationSeconds: 199, genre: "Indie", coverTone: "#7b2d26", coverAccent: "#ff9f1c", audioUrl: null },
  { id: "the-long-way", title: "The Long Way", artist: "River Sway", album: "Northbound", durationSeconds: 276, genre: "Folk", coverTone: "#314632", coverAccent: "#d8f3dc", audioUrl: null },
  { id: "static-sun", title: "Static Sun", artist: "Northstar", album: "Signal", durationSeconds: 222, genre: "Synth-pop", coverTone: "#2b2d42", coverAccent: "#ffadad", audioUrl: null },
] as const;

const TITLE_PREFIXES = [
  "Amber", "Velvet", "Neon", "Quiet", "Silver", "Faded", "Lunar", "Golden", "Midnight", "Paper", "Electric", "Soft", "Distant", "Parallel", "Crimson", "Hollow", "Blooming", "Summer", "Drifting", "Modern", "Secret", "Satellite", "Dawn", "Liquid",
] as const;
const TITLE_SUFFIXES = ["Static", "Memory", "Frames", "Weather", "Cinema", "Echo", "Garden", "Motion"] as const;
const ARTISTS = ["Arden Rue", "Milo North", "Sola Park", "Iris Field", "Lark & Lune", "Morrow", "Cove", "Paloma Gray", "The Stillness", "Juno Heart", "Orrin", "Maya Bloom", "Dahlia Kid", "Briar", "Hana Coast", "Rook", "Tala", "June Hotel", "August Ray", "Echo Harbor"] as const;
const ALBUMS = ["Out of Season", "Velvet Sky", "Long Exposure", "Hours Apart", "Little Futures", "Postcard Weather", "Two A.M.", "Second Nature", "Side Streets", "A Kind of Blue", "Window Seat", "Soft Landing"] as const;
const GENRES = ["Ambient", "Electronic", "Indie", "Lo-fi", "Jazz", "Acoustic", "Dance", "Alternative", "Folk", "Synth-pop"] as const;
const PALETTES = [
  ["#1b365d", "#79c8ff"], ["#4a285f", "#f78adf"], ["#57422e", "#ffd166"], ["#174a48", "#75e6da"],
  ["#702c46", "#ff9b8c"], ["#263c68", "#a6b9ff"], ["#305340", "#cbf08e"], ["#3e2e53", "#d8b4fe"],
] as const;

const ARCHIVE_TRACKS = TITLE_PREFIXES.flatMap((prefix, prefixIndex) =>
  TITLE_SUFFIXES.map((suffix, suffixIndex) => {
    const index = prefixIndex * TITLE_SUFFIXES.length + suffixIndex;
    const palette = PALETTES[index % PALETTES.length];
    return {
      id: `archive-${String(index + 1).padStart(3, "0")}`,
      title: `${prefix} ${suffix}`,
      artist: ARTISTS[(index * 3 + suffixIndex) % ARTISTS.length],
      album: ALBUMS[(index + prefixIndex) % ALBUMS.length],
      durationSeconds: 176 + (index * 13) % 126,
      genre: GENRES[index % GENRES.length],
      coverTone: palette[0],
      coverAccent: palette[1],
      audioUrl: null,
    };
  })
);

/** Original catalog metadata used with the app's generated audio previews. */
export const DEMO_TRACKS = [...FEATURED_TRACKS, ...ARCHIVE_TRACKS.slice(0, 188)] as const;

const PLAYLIST_DETAILS = [
  [101, "Night Drive", "Neon-lit momentum for the road after dark.", "#1d1a4d", "#e056fd"],
  [102, "Soft Focus", "Warm edges, slow mornings, and room to think.", "#274c3a", "#d9ed92"],
  [103, "Elsewhere", "A gentle left turn into a different headspace.", "#53354a", "#ffb4a2"],
  [104, "Fresh Finds", "New colors from the Soundwave catalog.", "#184e77", "#52b69a"],
  [105, "Open Roads", "Windows down and no rush to arrive.", "#4b345e", "#f7aef8"],
  [106, "Low Light", "Late evening tracks for a softer room.", "#213756", "#8ecae6"],
  [107, "Cloud Club", "Dream-pop and soft electronics above the noise.", "#51444b", "#f6bd60"],
  [108, "Sunday Static", "A slow-start selection for unhurried hours.", "#365043", "#cde77f"],
  [109, "Velvet Hours", "After-midnight warmth in measured doses.", "#532c46", "#ff8fab"],
  [110, "Blue Shift", "Cool-toned beats, misty synths, clean lines.", "#244363", "#78c6f7"],
  [111, "Daydreaming", "Little windows of light in the everyday.", "#6b5140", "#f4d35e"],
  [112, "In Transit", "Rhythm for between here and somewhere else.", "#47326a", "#b8a1ff"],
  [113, "Golden Hour", "Sun-warmed guitars and easy momentum.", "#765f2b", "#ffe66d"],
  [114, "City Rain", "Reflections, crosswalks, and an umbrella beat.", "#264653", "#75e6da"],
  [115, "Slow Burn", "Patient songs that make room for the night.", "#712f3b", "#ffafcc"],
  [116, "Orbiting", "Weightless electronic currents and quiet lift.", "#2d3d70", "#a0c4ff"],
] as const;

export const DEMO_PLAYLISTS = PLAYLIST_DETAILS.map(([id, title, description, coverTone, coverAccent]) => ({
  id,
  kind: "curated" as const,
  title,
  description,
  coverTone,
  coverAccent,
}));

export const DEMO_PLAYLIST_TRACKS = DEMO_PLAYLISTS.flatMap((playlist, playlistIndex) =>
  Array.from({ length: 18 }, (_, position) => ({
    playlistId: playlist.id,
    trackId: DEMO_TRACKS[(playlistIndex * 11 + position * 3) % DEMO_TRACKS.length].id,
    position,
  }))
);
