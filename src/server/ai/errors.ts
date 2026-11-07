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

export type AIErrorCode =
  | "AI_KEY_REQUIRED"
  | "AI_KEY_INVALID"
  | "AI_KEY_REJECTED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_UNAVAILABLE";

// Errors the UI can act on (open Settings, retry later). Messages are shown to
// the visitor and must never include the key.
export abstract class AIAccessError extends Error {
  abstract readonly code: AIErrorCode;
}

export class AIKeyRequiredError extends AIAccessError {
  readonly code = "AI_KEY_REQUIRED";
  constructor() {
    super("Set up your AI key to get feedback.");
    this.name = "AIKeyRequiredError";
  }
}

export class InvalidAICredentialsError extends AIAccessError {
  readonly code = "AI_KEY_INVALID";
  constructor() {
    super("That AI key doesn't look right. Check it in Settings.");
    this.name = "InvalidAICredentialsError";
  }
}

export class AIKeyRejectedError extends AIAccessError {
  readonly code = "AI_KEY_REJECTED";
  constructor() {
    super("Your AI provider rejected this key. Check it in Settings.");
    this.name = "AIKeyRejectedError";
  }
}

export class AIQuotaExceededError extends AIAccessError {
  readonly code = "AI_QUOTA_EXCEEDED";
  constructor() {
    super("Your AI key has used up its quota for now. Try again later or use another key.");
    this.name = "AIQuotaExceededError";
  }
}

export class AIProviderUnavailableError extends AIAccessError {
  readonly code = "AI_UNAVAILABLE";
  constructor() {
    super("The AI provider is busy right now. Your text is saved — try again in a minute.");
    this.name = "AIProviderUnavailableError";
  }
}

export function isAIAccessError(error: unknown): error is AIAccessError {
  return error instanceof AIAccessError;
}

const UNAVAILABLE_STATUSES = new Set([500, 502, 503, 504, 529]);

// Shared by both providers so they classify HTTP statuses identically. The
// SDK-specific part (reading the status) stays in each provider module.
export function accessErrorForStatus(status: number, message = ""): AIAccessError | null {
  if (status === 401 || status === 403) return new AIKeyRejectedError();
  if (status === 400 && /api key not valid|api_key_invalid/i.test(message)) {
    return new AIKeyRejectedError();
  }
  if (status === 429) return new AIQuotaExceededError();
  if (UNAVAILABLE_STATUSES.has(status)) return new AIProviderUnavailableError();
  return null;
}
