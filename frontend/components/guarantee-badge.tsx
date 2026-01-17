import { cn } from "@/lib/utils"
import { Shield, Eye, Lock, Key } from "lucide-react"

interface GuaranteeBadgeProps {
  type: "stealth" | "zk" | "no-identity" | "commitment"
  className?: string
}

const badges = {
  stealth: {
    icon: Shield,
    label: "Stealth Payments",
    color: "cyan",
  },
  zk: {
    icon: Eye,
    label: "Zero-Knowledge Proofs",
    color: "green",
  },
  "no-identity": {
    icon: Lock,
    label: "No On-Chain Identity",
    color: "purple",
  },
  commitment: {
    icon: Key,
    label: "Commitment-Based Verification",
    color: "cyan",
  },
}

export function GuaranteeBadge({ type, className }: GuaranteeBadgeProps) {
  const badge = badges[type]
  const Icon = badge.icon

  const colorStyles = {
    cyan: "border-neon-cyan/50 text-neon-cyan neon-border-cyan",
    green: "border-neon-green/50 text-neon-green neon-border-green",
    purple: "border-neon-purple/50 text-neon-purple neon-border-purple",
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 border bg-card/50 backdrop-blur-sm",
        colorStyles[badge.color as keyof typeof colorStyles],
        className,
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-mono text-xs uppercase tracking-wider">{badge.label}</span>
    </div>
  )
}
