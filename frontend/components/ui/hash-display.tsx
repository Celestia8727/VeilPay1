"use client"

import * as React from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface HashDisplayProps {
  hash: string
  label?: string
  truncate?: boolean
  className?: string
}

export function HashDisplay({ hash, label, truncate = true, className }: HashDisplayProps) {
  const [copied, setCopied] = React.useState(false)

  const displayHash = truncate ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : hash

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("font-mono text-xs", className)}>
      {label && <span className="text-muted-foreground uppercase tracking-wider block mb-1">{label}</span>}
      <div className="flex items-center gap-2 bg-secondary/50 px-3 py-2 border border-border group">
        <code className="text-neon-cyan flex-1">{displayHash}</code>
        <button onClick={handleCopy} className="text-muted-foreground hover:text-neon-cyan transition-colors">
          {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
