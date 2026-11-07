import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[4px] border border-transparent bg-clip-padding text-sm font-normal whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-iron",
        outline:
          "border-foreground bg-card text-foreground hover:bg-linen aria-expanded:bg-linen",
        secondary:
          "bg-linen text-foreground hover:bg-stone aria-expanded:bg-stone",
        ghost:
          "text-foreground hover:bg-linen aria-expanded:bg-linen",
        destructive:
          "border-destructive/40 bg-card text-destructive hover:bg-destructive/5",
        link: "h-auto! px-0! text-foreground underline underline-offset-4 hover:text-iron",
      },
      size: {
        default:
          "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 text-[0.8125rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      // A `render` prop swaps in a non-<button> (e.g. a Next <Link>); tell Base UI so.
      nativeButton={props.render === undefined}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
