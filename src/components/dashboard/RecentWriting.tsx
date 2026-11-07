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
    return <p className="text-muted-foreground">No writing sessions yet.</p>;
  }

  return (
    <ul className="border-t border-border">
      {sessions.map((session) => (
        <li key={session.id} className="space-y-2 border-b border-border py-4">
          <div className="label-mono flex items-center justify-between gap-4 text-muted-foreground">
            <span>{session.promptType.replace(/_/g, " ")}</span>
            <time dateTime={session.createdAt.toISOString()}>
              {session.createdAt.toLocaleDateString()}
            </time>
          </div>
          <p className="prose-serif text-lg">{truncate(session.originalText, EXCERPT_LENGTH)}</p>
        </li>
      ))}
    </ul>
  );
}
