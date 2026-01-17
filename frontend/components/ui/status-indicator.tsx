import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: "active" | "pending" | "verified" | "error"
  label?: string
  className?: string
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const statusStyles = {
    active: "bg-neon-cyan shadow-[0_0_8px_rgba(0,212,255,0.8)]",
    pending: "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse",
    verified: "bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.8)]",
    error: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]",
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-2 h-2 rounded-full", statusStyles[status])} />
      {label && <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{label}</span>}
    </div>
  )
}
