"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

interface TerminalTextProps extends React.HTMLAttributes<HTMLDivElement> {
  prefix?: string
  typing?: boolean
}

export function TerminalText({ className, prefix = ">", typing = false, children, ...props }: TerminalTextProps) {
  return (
    <div className={cn("font-mono text-sm text-muted-foreground flex items-start gap-2", className)} {...props}>
      <span className="text-neon-cyan">{prefix}</span>
      <span className={typing ? "cursor-blink" : ""}>{children}</span>
    </div>
  )
}
