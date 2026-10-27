"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type MusicSource, parseMusicLink, toEmbedUrl } from "@/lib/musicLink";

// Official Spotify editorial playlist — a safe, no-auth default until the user
// pastes their own link.
const DEFAULT_SOURCE: MusicSource = { provider: "spotify", kind: "playlist", id: "37i9dQZF1DWWQRwui0ExPn" };
const STORAGE_KEY = "focus-music:last-link";

function loadSavedSource(): MusicSource {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return (saved && parseMusicLink(saved)) || DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
}

function saveLink(link: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, link);
  } catch {
    // Storage blocked (private window, etc.): the link still plays this visit.
  }
}

export function FocusMusic() {
  const [open, setOpen] = useState(false);
  // null until first opened, so no third-party player loads on every page view.
  const [source, setSource] = useState<MusicSource | null>(null);
  const [link, setLink] = useState("");
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
    if (!source) setSource(loadSavedSource());
    setOpen((value) => !value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseMusicLink(link);
    if (!parsed) {
      setError("Paste a Spotify (playlist, album, track) or YouTube (playlist, video) link.");
      return;
    }
    setError(null);
    setSource(parsed);
    saveLink(link.trim());
    setLink("");
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="xs"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        Focus Music
      </Button>
      {/* Stays mounted once loaded and is only hidden when closed: unmounting the
          iframe would stop playback. The header lives in the root layout, so it
          also survives client-side navigation. */}
      {source ? (
        <div
          id={panelId}
          aria-hidden={!open}
          inert={!open}
          className={`absolute top-full right-0 z-10 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl bg-card p-3 ring-1 ring-border ${open ? "" : "invisible"}`}
        >
          <iframe
            key={`${source.provider}:${source.kind}:${source.id}`}
            title="Focus music player"
            src={toEmbedUrl(source)}
            className={source.provider === "youtube" ? "aspect-video w-full" : "h-[152px] w-full"}
            style={{ borderRadius: "0.75rem", border: 0 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Input
              ref={inputRef}
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="Paste a Spotify or YouTube link"
              aria-label="Spotify or YouTube link"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            <Button type="submit" size="xs">
              Play
            </Button>
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
