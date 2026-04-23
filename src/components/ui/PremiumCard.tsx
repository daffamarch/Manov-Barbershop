import * as React from "react"
import { cn } from "@/lib/utils"

const PremiumCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8",
      className
    )}
    {...props}
  />
))
PremiumCard.displayName = "PremiumCard"

export { PremiumCard }
