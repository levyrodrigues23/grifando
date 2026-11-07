import { AIProviderUnavailableError } from "@/server/ai/errors";
import type { AIProvider } from "@/server/ai/provider";

class AITimeoutError extends Error {
  constructor() {
    super("AI call timed out");
    this.name = "AITimeoutError";
  }
}

const OVERLOAD_STATUSES = new Set([503, 529]);

function hasOverloadShape(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const status = record.status;
  if (typeof status === "number" && OVERLOAD_STATUSES.has(status)) return true;
  if (status === "UNAVAILABLE") return true;
  if (record.type === "overloaded_error") return true;
  return hasOverloadShape(record.error);
}

// True only for "the provider is busy/slow" failures worth one retry on the
// fallback model. Key, quota and validation errors must never match.
export function isOverloaded(error: unknown): boolean {
  if (error instanceof AIProviderUnavailableError || error instanceof AITimeoutError) return true;
  return hasOverloadShape(error);
}

function withTimeout<T>(run: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new AITimeoutError());
    }, timeoutMs);
    // A late result from a timed-out call is ignored via `settled`.
    run().then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Compile error here if AIProvider gains a method that is not listed, so a new
// method cannot silently bypass the wrapper.
const METHOD_NAMES = [
  "analyzeWriting",
  "generateExercises",
  "continueInterview",
  "explainAttempt",
] as const satisfies readonly (keyof AIProvider)[];
type _AllMethodsListed = Exclude<keyof AIProvider, (typeof METHOD_NAMES)[number]> extends never
  ? true
  : never;
const _allMethodsListed: _AllMethodsListed = true;
void _allMethodsListed;

type AnyMethod = (...args: unknown[]) => Promise<unknown>;

export function withResilience(
  primary: AIProvider,
  fallback: AIProvider,
  options: { timeoutMs: number },
): AIProvider {
  const wrapped: Record<string, AnyMethod> = {};
  for (const name of METHOD_NAMES) {
    wrapped[name] = async (...args: unknown[]) => {
      const callPrimary = primary[name] as AnyMethod;
      const callFallback = fallback[name] as AnyMethod;
      try {
        return await withTimeout(() => callPrimary.apply(primary, args), options.timeoutMs);
      } catch (primaryError) {
        if (!isOverloaded(primaryError)) throw primaryError;
      }
      try {
        return await withTimeout(() => callFallback.apply(fallback, args), options.timeoutMs);
      } catch (fallbackError) {
        if (isOverloaded(fallbackError)) throw new AIProviderUnavailableError();
        throw fallbackError;
      }
    };
  }
  return wrapped as unknown as AIProvider;
}
