export type MusicSource =
  | { provider: "spotify"; kind: "playlist" | "album" | "track"; id: string }
  | { provider: "youtube"; kind: "playlist" | "video"; id: string };

const SPOTIFY_KINDS = ["playlist", "album", "track"] as const;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_LIST_ID = /^[A-Za-z0-9_-]{10,}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);

function isSpotifyKind(value: string): value is (typeof SPOTIFY_KINDS)[number] {
  return (SPOTIFY_KINDS as readonly string[]).includes(value);
}

function spotifySource(kind: string, id: string): MusicSource | null {
  return isSpotifyKind(kind) && SPOTIFY_ID.test(id) ? { provider: "spotify", kind, id } : null;
}

// A link carrying a playlist (`list=`) plays the whole playlist, even when it
// was copied from a single video inside it.
function youtubeSource(videoId: string | null, listId: string | null): MusicSource | null {
  if (listId && YOUTUBE_LIST_ID.test(listId)) return { provider: "youtube", kind: "playlist", id: listId };
  if (videoId && YOUTUBE_VIDEO_ID.test(videoId)) return { provider: "youtube", kind: "video", id: videoId };
  return null;
}

// Accepts the share links users actually paste (Spotify web/URI, YouTube
// watch/playlist/youtu.be/music) and returns null for anything else, so the
// iframe src is only ever built from a validated provider + id.
export function parseMusicLink(input: string): MusicSource | null {
  const text = input.trim();

  const uri = /^spotify:(\w+):(\w+)$/.exec(text);
  if (uri) return spotifySource(uri[1], uri[2]);

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "open.spotify.com") {
    // Drops locale (`/intl-pt/`) and embed (`/embed/`) prefixes.
    const rest = segments.filter((segment) => !segment.startsWith("intl-") && segment !== "embed");
    return rest.length >= 2 ? spotifySource(rest[0], rest[1]) : null;
  }

  if (host === "youtu.be") {
    return youtubeSource(segments[0] ?? null, url.searchParams.get("list"));
  }

  if (YOUTUBE_HOSTS.has(host)) {
    const list = url.searchParams.get("list");
    if (segments[0] === "watch") return youtubeSource(url.searchParams.get("v"), list);
    if (segments[0] === "playlist") return youtubeSource(null, list);
    if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") {
      return youtubeSource(segments[1] ?? null, list);
    }
  }

  return null;
}

export function toEmbedUrl(source: MusicSource): string {
  if (source.provider === "spotify") {
    return `https://open.spotify.com/embed/${source.kind}/${source.id}?utm_source=generator&theme=0`;
  }
  return source.kind === "playlist"
    ? `https://www.youtube.com/embed?listType=playlist&list=${source.id}`
    : `https://www.youtube.com/embed/${source.id}`;
}
