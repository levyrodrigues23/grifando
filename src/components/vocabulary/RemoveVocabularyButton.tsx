"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function RemoveVocabularyButton({ id, term }: { id: string; term: string }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      const response = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
      // 404: already gone (another tab) — refresh either way.
      if (response.ok || response.status === 404) router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={`Remove ${term}`}
      onClick={handleRemove}
      disabled={removing}
    >
      <X />
    </Button>
  );
}
