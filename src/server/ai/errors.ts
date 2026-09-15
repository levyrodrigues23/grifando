// Thrown when an AI response doesn't match its expected schema. Callers should
// treat this as a handled failure (keep original input, never persist), not a crash.
export class AIResponseValidationError extends Error {
  readonly issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;

  constructor(message: string, issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) {
    super(message);
    this.name = "AIResponseValidationError";
    this.issues = issues;
  }
}
