"use client"

import * as React from "react"
import { AnimatedBackground } from "@/components/animated-background"
import { ScanlineOverlay } from "@/components/scanline-overlay"
import { NavHeader } from "@/components/nav-header"
import { NeonButton } from "@/components/ui/neon-button"
import { GlassPanel } from "@/components/ui/glass-panel"
import { TerminalText } from "@/components/ui/terminal-text"
import { HashDisplay } from "@/components/ui/hash-display"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { cn } from "@/lib/utils"
import { Check, Loader2, Shield, Key, Lock } from "lucide-react"

type VerificationStep = {
  id: string
  label: string
  status: "pending" | "active" | "complete"
  hash?: string
}

export default function VerifyPage() {
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [isComplete, setIsComplete] = React.useState(false)
  const [steps, setSteps] = React.useState<VerificationStep[]>([
    { id: "commitment", label: "Commitment detected", status: "pending" },
    { id: "proof", label: "Proof generated", status: "pending" },
    { id: "access", label: "Access verified", status: "pending" },
  ])
  const [nullifier, setNullifier] = React.useState("")

  const startVerification = () => {
    setIsVerifying(true)

    // Simulate step-by-step verification
    setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === "commitment"
            ? {
                ...s,
                status: "complete",
                hash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
              }
            : s.id === "proof"
              ? { ...s, status: "active" }
              : s,
        ),
      )
    }, 1500)

    setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === "proof"
            ? {
                ...s,
                status: "complete",
                hash: "π_" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
              }
            : s.id === "access"
              ? { ...s, status: "active" }
              : s,
        ),
      )
    }, 3000)

    setTimeout(() => {
      setSteps((prev) => prev.map((s) => (s.id === "access" ? { ...s, status: "complete" } : s)))
      setNullifier("N_" + Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join(""))
      setIsComplete(true)
      setIsVerifying(false)
    }, 4500)
  }

  const getStepIcon = (step: VerificationStep) => {
    if (step.status === "complete") {
      return <Check className="w-5 h-5 text-neon-green" />
    }
    if (step.status === "active") {
      return <Loader2 className="w-5 h-5 text-neon-cyan animate-spin" />
    }
    return <div className="w-5 h-5 border border-border" />
  }

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <ScanlineOverlay />
      <NavHeader />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-mono text-3xl sm:text-4xl tracking-wider text-foreground mb-4">
              <span className="text-neon-green">//</span> Access Verification
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Prove subscription access without revealing identity
            </p>
          </div>

          <div className="grid gap-6">
            {/* Verification Panel */}
            <GlassPanel glow={isComplete ? "green" : "cyan"}>
              <div className="flex items-center gap-3 mb-6">
                <Shield className={cn("w-6 h-6", isComplete ? "text-neon-green" : "text-neon-cyan")} />
                <h2 className="font-mono text-lg tracking-wider text-foreground">ZK Proof Verification</h2>
              </div>

              {/* Verification Steps */}
              <div className="space-y-4 mb-8">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-start gap-4 p-4 border transition-all",
                      step.status === "complete" && "border-neon-green/30 bg-neon-green/5",
                      step.status === "active" && "border-neon-cyan/30 bg-neon-cyan/5",
                      step.status === "pending" && "border-border",
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">{getStepIcon(step)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "font-mono text-sm",
                            step.status === "complete" && "text-neon-green",
                            step.status === "active" && "text-neon-cyan",
                            step.status === "pending" && "text-muted-foreground",
                          )}
                        >
                          {step.label}
                        </span>
                        {step.status === "complete" && <span className="font-mono text-xs text-neon-green">✓</span>}
                      </div>
                      {step.hash && (
                        <code className="font-mono text-xs text-muted-foreground break-all">
                          {step.hash.slice(0, 30)}...
                        </code>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ZK Proof Animation */}
              {isVerifying && !isComplete && (
                <div className="mb-8 p-6 border border-neon-cyan/30 bg-secondary/30">
                  <div className="flex items-center justify-center gap-4">
                    <div className="relative">
                      <div
                        className="w-16 h-16 border-2 border-neon-cyan/30 animate-spin"
                        style={{ animationDuration: "3s" }}
                      />
                      <div
                        className="absolute inset-2 border border-neon-purple/50 animate-spin"
                        style={{ animationDuration: "2s", animationDirection: "reverse" }}
                      />
                      <div
                        className="absolute inset-4 border border-neon-green/30 animate-spin"
                        style={{ animationDuration: "1.5s" }}
                      />
                    </div>
                    <div className="text-left">
                      <TerminalText typing>Generating zero-knowledge proof...</TerminalText>
                      <p className="font-mono text-xs text-muted-foreground mt-1">Computing witness and constraints</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Nullifier Display */}
              {isComplete && (
                <div className="mb-8 space-y-4">
                  <HashDisplay hash={nullifier} label="Nullifier (prevents replay)" truncate={false} />
                  <div className="flex items-center gap-4 p-4 border border-neon-green/30 bg-neon-green/5">
                    <Key className="w-5 h-5 text-neon-green" />
                    <div>
                      <div className="font-mono text-sm text-neon-green">Access Granted</div>
                      <div className="font-mono text-xs text-muted-foreground">Valid until block #18,334,567</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {!isVerifying && !isComplete && (
                <NeonButton variant="cyan" className="w-full" onClick={startVerification}>
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    Verify Access
                  </span>
                </NeonButton>
              )}

              {isComplete && (
                <div className="flex items-center justify-center gap-2">
                  <StatusIndicator status="verified" />
                  <span className="font-mono text-sm text-neon-green">Verification Complete</span>
                </div>
              )}
            </GlassPanel>

            {/* Info Panel */}
            <GlassPanel>
              <h3 className="font-mono text-sm tracking-wider text-muted-foreground mb-4">How ZK Verification Works</h3>
              <div className="space-y-3">
                <TerminalText prefix="1.">Locate commitment in registry</TerminalText>
                <TerminalText prefix="2.">Generate proof of knowledge</TerminalText>
                <TerminalText prefix="3.">Verify proof without revealing secret</TerminalText>
                <TerminalText prefix="4.">Nullifier prevents double-use</TerminalText>
              </div>
            </GlassPanel>
          </div>
        </div>
      </main>
    </div>
  )
}
