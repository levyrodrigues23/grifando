"use client";

import { useState } from "react";

import { buildHighlightSegments } from "@/lib/highlightSegments";
import { cn } from "cn";

import { SPECIMEN_SCENARIOS } from "./specimenData";

// A looping example of what "proofed" means: three slips get underlined, then
// each shows its numbered correction. Pure CSS animation, so reduced motion shows
// the finished frame. The scenario pills swap the example; the first one renders
// on the server, so without JS the hero still shows a complete example. The
// animated layer is hidden from assistive tech, which gets the plain-text version.
export function LiveSpecimen() {
  const [activeId, setActiveId] = useState(SPECIMEN_SCENARIOS[0].id);
  const scenario =
    SPECIMEN_SCENARIOS.find((item) => item.id === activeId) ?? SPECIMEN_SCENARIOS[0];
  const segments = buildHighlightSegments(scenario.text, scenario.mistakes);

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Example scenario" className="flex flex-wrap gap-2">
        {SPECIMEN_SCENARIOS.map((item) => {
          const active = item.id === scenario.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "h-9 rounded-pill px-4 text-sm transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "bg-card text-iron ring-1 ring-border hover:bg-linen",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <figure
        key={scenario.id}
        className="fade-in rounded-card bg-card p-6 ring-1 ring-border md:p-10"
      >
        <figcaption className="label-mono mb-6 text-muted-foreground">
          Example · {scenario.label}
        </figcaption>

        <div
          aria-hidden="true"
          className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          <p className="prose-serif text-xl leading-[1.7] md:text-2xl md:leading-[1.7]">
            {segments.map((segment, index) =>
              segment.mistakeIndex === null ? (
                <span key={index}>{segment.text}</span>
              ) : (
                <span
                  key={index}
                  className={`proof-mark specimen-loop specimen-loop-${segment.mistakeIndex + 1}`}
                >
                  {segment.text}
                  <sup className="proof-mark-num ml-0.5 font-mono text-[0.625rem] font-medium text-violet">
                    {segment.mistakeIndex + 1}
                  </sup>
                </span>
              ),
            )}
          </p>
          <ol className="space-y-4">
            {scenario.mistakes.map((mistake, index) => (
              <li
                key={mistake.originalSpan}
                className={`specimen-note specimen-loop specimen-loop-${index + 1} flex gap-3`}
                style={{ animationDelay: "350ms" }}
              >
                <span className="pt-1.5 font-mono text-[0.625rem] font-medium text-violet">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <p className="prose-serif text-lg">
                    <span className="text-muted-foreground line-through decoration-1">
                      {mistake.originalSpan}
                    </span>{" "}
                    <span>{mistake.correctedSpan}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{mistake.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="sr-only">
          <p>Example of a proofed paragraph: {scenario.text}</p>
          <ol>
            {scenario.mistakes.map((mistake) => (
              <li key={mistake.originalSpan}>
                &quot;{mistake.originalSpan}&quot; should be &quot;
                {mistake.correctedSpan}&quot;. {mistake.note}
              </li>
            ))}
          </ol>
        </div>
      </figure>
    </div>
  );
}
