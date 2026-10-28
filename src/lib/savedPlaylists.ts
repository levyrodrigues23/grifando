import { type MusicSource, parseMusicLink } from "@/lib/musicLink";

export type SavedPlaylist = { name: string; link: string; source: MusicSource };

export const MAX_SAVED_PLAYLISTS = 10;
const MAX_NAME_LENGTH = 40;

export const DEFAULT_PLAYLIST: SavedPlaylist = {
  name: "Deep Focus (Spotify)",
  link: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn",
  source: { provider: "spotify", kind: "playlist", id: "37i9dQZF1DWWQRwui0ExPn" },
};

function sourceKey(source: MusicSource): string {
  return `${source.provider}:${source.kind}:${source.id}`;
}

export function isSameSource(a: MusicSource, b: MusicSource): boolean {
  return sourceKey(a) === sourceKey(b);
}

export function defaultPlaylistName(source: MusicSource): string {
  return `${source.provider === "spotify" ? "Spotify" : "YouTube"} ${source.kind}`;
}

// localStorage content is untrusted (hand-edited, older format, another app on
// the same origin): every entry is re-parsed from its link, and anything that
// doesn't parse is dropped rather than breaking the player.
export function parseSavedPlaylists(raw: string | null): SavedPlaylist[] {
  if (!raw) return [DEFAULT_PLAYLIST];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [DEFAULT_PLAYLIST];
  }
  if (!Array.isArray(data)) return [DEFAULT_PLAYLIST];

  const playlists: SavedPlaylist[] = [];
  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;
    const { name, link } = entry as Record<string, unknown>;
    if (typeof link !== "string") continue;
    const source = parseMusicLink(link);
    if (!source || playlists.some((p) => isSameSource(p.source, source))) continue;
    const label = typeof name === "string" && name.trim() ? name.trim().slice(0, MAX_NAME_LENGTH) : null;
    playlists.push({ name: label ?? defaultPlaylistName(source), link, source });
  }
  return playlists.slice(0, MAX_SAVED_PLAYLISTS);
}

export function serializeSavedPlaylists(playlists: SavedPlaylist[]): string {
  return JSON.stringify(playlists.map(({ name, link }) => ({ name, link })));
}

// Most recently added first; re-adding an existing source moves it to the top
// and renames it if a new name was given. The oldest entry falls off past the cap.
export function addPlaylist(playlists: SavedPlaylist[], link: string, name?: string): SavedPlaylist[] | null {
  const source = parseMusicLink(link);
  if (!source) return null;
  const existing = playlists.find((p) => isSameSource(p.source, source));
  const label = name?.trim().slice(0, MAX_NAME_LENGTH) || existing?.name || defaultPlaylistName(source);
  const rest = playlists.filter((p) => !isSameSource(p.source, source));
  return [{ name: label, link: link.trim(), source }, ...rest].slice(0, MAX_SAVED_PLAYLISTS);
}

export function removePlaylist(playlists: SavedPlaylist[], source: MusicSource): SavedPlaylist[] {
  return playlists.filter((p) => !isSameSource(p.source, source));
}
