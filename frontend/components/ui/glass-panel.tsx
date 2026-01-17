import type * as React from "react"
import { cn } from "@/lib/utils"

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: "cyan" | "green" | "purple" | "none"
}

export function GlassPanel({ className, glow = "none", children, ...props }: GlassPanelProps) {
  const glowStyles = {
    cyan: "neon-border-cyan border-neon-cyan/30",
    green: "neon-border-green border-neon-green/30",
    purple: "neon-border-purple border-neon-purple/30",
    none: "border-border",
  }

  return (
    <div className={cn("glass border p-6 relative overflow-hidden", glowStyles[glow], className)} {...props}>
      {children}
    </div>
  )
}
