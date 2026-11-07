type RecentPattern = {
  id: string;
  exampleOriginal: string;
  exampleCorrection: string;
};

export function RecentMistakes({ patterns }: { patterns: RecentPattern[] }) {
  if (patterns.length === 0) {
    return <p className="text-muted-foreground">No mistakes recorded yet.</p>;
  }

  return (
    <ul className="border-t border-border">
      {patterns.map((pattern) => (
        <li key={pattern.id} className="prose-serif border-b border-border py-4 text-lg">
          <span className="text-muted-foreground line-through decoration-1">
            {pattern.exampleOriginal}
          </span>{" "}
          <span aria-hidden="true">→</span> <span className="sr-only">corrected to</span>
          <span>{pattern.exampleCorrection}</span>
        </li>
      ))}
    </ul>
  );
}
