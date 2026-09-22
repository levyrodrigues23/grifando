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
            className="rounded bg-ember/15 px-0.5 underline decoration-ember decoration-2 underline-offset-2"
          >
            {segment.text}
            <sup className="ml-0.5 font-semibold text-ember">
              {segment.mistakeIndex + 1}
            </sup>
          </a>
        ),
      )}
    </p>
  );
}
