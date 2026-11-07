import { buildHighlightSegments } from "@/lib/highlightSegments";
import type { MistakeOccurrenceDTO } from "@/components/writing/types";

// The "proofed page": the learner's own prose in serif, each mistake marked with
// a violet underline and a numbered mark that links to its note.
export function HighlightedText({
  text,
  mistakes,
}: {
  text: string;
  mistakes: MistakeOccurrenceDTO[];
}) {
  const segments = buildHighlightSegments(text, mistakes);

  return (
    <p className="prose-serif text-xl leading-[1.7] whitespace-pre-wrap">
      {segments.map((segment, index) =>
        segment.mistakeIndex === null ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <a
            key={index}
            href={`#mistake-${segment.mistakeIndex}`}
            className="proof-mark proof-mark-draw hover:bg-violet/5"
            style={{ animationDelay: `${200 + segment.mistakeIndex * 120}ms` }}
          >
            {segment.text}
            <sup className="proof-mark-num ml-0.5 font-mono text-[0.625rem] font-medium text-violet">
              {segment.mistakeIndex + 1}
            </sup>
          </a>
        ),
      )}
    </p>
  );
}
