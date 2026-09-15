import { buildHighlightSegments } from "@/lib/highlightSegments";
import type { MistakeOccurrenceDTO } from "@/components/writing/types";

export function HighlightedText({
  text,
  mistakes,
}: {
  text: string;
  mistakes: MistakeOccurrenceDTO[];
}) {
  const segments = buildHighlightSegments(text, mistakes);

  return (
    <p className="leading-relaxed whitespace-pre-wrap">
      {segments.map((segment, index) =>
        segment.mistakeIndex === null ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <a
            key={index}
            href={`#mistake-${segment.mistakeIndex}`}
            className="rounded bg-amber-200/60 px-0.5 underline decoration-amber-500 decoration-2 underline-offset-2 dark:bg-amber-900/40"
          >
            {segment.text}
            <sup className="ml-0.5 font-semibold text-amber-700 dark:text-amber-400">
              {segment.mistakeIndex + 1}
            </sup>
          </a>
        ),
      )}
    </p>
  );
}
