import Link from "next/link";

// Shown in place of an error line when an AI action is submitted without a
// stored key. The visitor's typed text is left untouched by the caller.
export function KeyRequiredNotice() {
  return (
    <p role="alert" className="text-sm text-foreground">
      Set up your AI key to get feedback.{" "}
      <Link href="/settings" className="underline underline-offset-4 hover:text-iron">
        Set up a key
      </Link>
    </p>
  );
}
