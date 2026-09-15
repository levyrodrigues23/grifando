import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">AI English Coach</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Write something in English and get structured feedback built from your own mistakes.
        Mistake Notebook and Exercises land in the next phases.
      </p>
      <Button render={<Link href="/write">Start writing</Link>} />
    </main>
  );
}
