type RecentPattern = {
  id: string;
  exampleOriginal: string;
  exampleCorrection: string;
};

export function RecentMistakes({ patterns }: { patterns: RecentPattern[] }) {
  if (patterns.length === 0) {
    return <p className="text-sm text-muted-foreground">No mistakes recorded yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {patterns.map((pattern) => (
        <li key={pattern.id} className="text-sm">
          <span className="text-destructive line-through">{pattern.exampleOriginal}</span>
          {" → "}
          <span className="font-medium text-success">{pattern.exampleCorrection}</span>
        </li>
      ))}
    </ul>
  );
}
