import * as React from "react"
import { cn } from "cn"

/**
 * Spacing roles (4px base), used instead of per-page margins:
 *  - Field   label -> control -> helper/error   8px (tight, one unit)
 *  - Stack   field -> field / block -> block     24px (inside cards: --card-spacing)
 *  - Actions control -> action row               24px above, 12px between buttons
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function Stack({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stack"
      className={cn("flex flex-col gap-6", className)}
      {...props}
    />
  )
}

function Actions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="actions"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  )
}

export { Field, Stack, Actions }
