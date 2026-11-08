"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type MusicSource, parseMusicLink, toEmbedUrl } from "@/lib/musicLink";
import {
  addPlaylist,
  DEFAULT_PLAYLIST,
  isSameSource,
  parseSavedPlaylists,
  removePlaylist,
  type SavedPlaylist,
  serializeSavedPlaylists,
} from "@/lib/savedPlaylists";

const CURRENT_KEY = "focus-music:last-link";
const PLAYLISTS_KEY = "focus-music:playlists";

// Storage can be unavailable (private window, blocked site data): every access
// is wrapped so the player still works for the current visit.
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the choice just won't survive a reload.
  }
}

export function FocusMusic() {
  const [open, setOpen] = useState(false);
  // null until first opened, so no third-party player loads on every page view.
  const [source, setSource] = useState<MusicSource | null>(null);
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!source) {
      const saved = parseSavedPlaylists(readStorage(PLAYLISTS_KEY));
      const current = readStorage(CURRENT_KEY);
      setPlaylists(saved);
      setSource((current && parseMusicLink(current)) || saved[0]?.source || DEFAULT_PLAYLIST.source);
    }
    setOpen((value) => !value);
  }

  function updatePlaylists(next: SavedPlaylist[]) {
    setPlaylists(next);
    writeStorage(PLAYLISTS_KEY, serializeSavedPlaylists(next));
  }

  function play(playlist: SavedPlaylist) {
    setSource(playlist.source);
    writeStorage(CURRENT_KEY, playlist.link);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = addPlaylist(playlists, link, name);
    if (!next) {
      setError("Paste a Spotify (playlist, album, track) or YouTube (playlist, video) link.");
      return;
    }
    setError(null);
    updatePlaylists(next);
    play(next[0]);
    setLink("");
    setName("");
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        Focus music
      </Button>
      {/* Stays mounted once loaded and is only hidden when closed: unmounting the
          iframe would stop playback. The header lives in the root layout, so it
          also survives client-side navigation. */}
      {source ? (
        <div
          id={panelId}
          aria-hidden={!open}
          inert={!open}
          className={`absolute top-full right-0 z-10 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-4 rounded-card bg-card p-4 ring-1 ring-border ${open ? "" : "invisible"}`}
        >
          <iframe
            key={`${source.provider}:${source.kind}:${source.id}`}
            title="Focus music player"
            src={toEmbedUrl(source)}
            className={source.provider === "youtube" ? "aspect-video w-full" : "h-[152px] w-full"}
            style={{ borderRadius: "4px", border: 0 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          {playlists.length > 0 ? (
            <ul aria-label="Saved playlists" className="space-y-1">
              {playlists.map((playlist) => {
                const isCurrent = isSameSource(playlist.source, source);
                return (
                  <li key={playlist.link} className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-current={isCurrent ? "true" : undefined}
                      onClick={() => play(playlist)}
                      className={`min-w-0 flex-1 truncate text-left text-sm hover:underline ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {playlist.name}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${playlist.name}`}
                      onClick={() => updatePlaylists(removePlaylist(playlists, playlist.source))}
                    >
                      <X />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-2">
            <Input
              ref={inputRef}
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="Paste a Spotify or YouTube link"
              aria-label="Spotify or YouTube link"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            <div className="flex items-end gap-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name (optional)"
                aria-label="Playlist name"
                maxLength={40}
              />
              <Button type="submit" size="sm">
                Save &amp; play
              </Button>
            </div>
          </form>
          {error ? (
            <p id={errorId} className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {source.provider === "spotify" ? (
            <p className="text-xs text-muted-foreground">
              Full tracks need you logged into Spotify in this browser; otherwise you hear 30s previews.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
