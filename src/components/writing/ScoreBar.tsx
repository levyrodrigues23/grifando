import { Progress } from "@/components/ui/progress";

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-subheading tabular-nums">{value}</span>
      </div>
      <Progress value={value} aria-label={`${label} score`} />
    </div>
  );
}
