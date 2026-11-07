import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-[4px] bg-linen", className)}
      {...props}
    />
  )
}

export { Skeleton }
