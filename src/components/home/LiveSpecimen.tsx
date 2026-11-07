import { buildHighlightSegments } from "@/lib/highlightSegments";

import { SPECIMEN_MISTAKES, SPECIMEN_TEXT } from "./specimenData";

// A looping example of what "proofed" means: three slips get underlined, then
// each shows its numbered correction. Pure CSS (no JS, no timers) so it also
// works without scripts; reduced motion shows the finished frame. The animated
// layer is hidden from assistive tech, which gets the plain-text version.
export function LiveSpecimen() {
  const segments = buildHighlightSegments(SPECIMEN_TEXT, SPECIMEN_MISTAKES);

  return (
    <figure className="rounded-[4px] bg-card p-6 ring-1 ring-border md:p-10">
      <figcaption className="label-mono mb-6 text-muted-foreground">
        Example
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
          {SPECIMEN_MISTAKES.map((mistake, index) => (
            <li
              key={mistake.originalSpan}
              className={`specimen-note specimen-loop specimen-loop-${index + 1} flex gap-3`}
              style={{ animationDelay: "350ms" }}
            >
              <span className="font-mono text-[0.625rem] font-medium text-violet pt-1.5">
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
        <p>Example of a proofed paragraph: {SPECIMEN_TEXT}</p>
        <ol>
          {SPECIMEN_MISTAKES.map((mistake) => (
            <li key={mistake.originalSpan}>
              &quot;{mistake.originalSpan}&quot; should be &quot;
              {mistake.correctedSpan}&quot;. {mistake.note}
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
