// SDK errors can carry the request config (headers, so the visitor's AI key)
// as properties. Logs only ever get the error's name, message and code.
export function describeError(error: unknown): { name: string; message?: string; code?: string } {
  if (!(error instanceof Error)) return { name: "NonErrorThrown" };
  const code = (error as { code?: unknown }).code;
  return {
    name: error.name,
    message: error.message,
    ...((typeof code === "string" || typeof code === "number") && { code: String(code) }),
  };
}

export function logError(context: string, error: unknown): void {
  console.error(context, describeError(error));
}
