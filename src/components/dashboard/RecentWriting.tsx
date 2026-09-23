const EXCERPT_LENGTH = 140;

type RecentSession = {
  id: string;
  promptType: string;
  originalText: string;
  createdAt: Date;
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function RecentWriting({ sessions }: { sessions: RecentSession[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No writing sessions yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {sessions.map((session) => (
        <li
          key={session.id}
          className="space-y-1 border-b border-dashed border-border pb-3 last:border-0 last:pb-0"
        >
          <div className="flex items-center justify-between text-xs tracking-normal text-muted-foreground uppercase">
            <span>{session.promptType.replace(/_/g, " ")}</span>
            <span>{session.createdAt.toLocaleDateString()}</span>
          </div>
          <p className="text-sm">{truncate(session.originalText, EXCERPT_LENGTH)}</p>
        </li>
      ))}
    </ul>
  );
}
