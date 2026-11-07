"use client";

import { useId } from "react";

import { cn } from "cn";

// A sheet of white paper on the cream canvas: the textarea has no box of its
// own, the sheet is the field. `variant="code"` sets it in mono for snippets.
export function WritingSheet({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  disabled,
  variant = "prose",
  minHeight = "min-h-[320px]",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  disabled?: boolean;
  variant?: "prose" | "code";
  minHeight?: string;
}) {
  const id = useId();

  return (
    <div className="rounded-[4px] bg-card ring-1 ring-border transition-shadow focus-within:ring-foreground has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-violet">
      <div className="flex items-center justify-between gap-4 px-6 pt-5 md:px-10 md:pt-8">
        <label htmlFor={id} className="label-mono text-muted-foreground">
          {label}
        </label>
        <span className="label-mono text-muted-foreground tabular-nums" aria-live="polite">
          {value.length} / {maxLength}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "field-sizing-content block w-full resize-none bg-transparent px-6 pt-4 pb-8 outline-none placeholder:text-smoke disabled:opacity-60 md:px-10 md:pb-10",
          minHeight,
          variant === "code"
            ? "font-mono text-sm leading-relaxed"
            : "prose-serif text-xl leading-[1.7]",
        )}
      />
    </div>
  );
}
