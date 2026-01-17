import { AnimatedBackground } from "@/components/animated-background"
import { ScanlineOverlay } from "@/components/scanline-overlay"
import { NavHeader } from "@/components/nav-header"
import { NeonButton } from "@/components/ui/neon-button"
import { GuaranteeBadge } from "@/components/guarantee-badge"
import { GlassPanel } from "@/components/ui/glass-panel"
import { TerminalText } from "@/components/ui/terminal-text"
import Link from "next/link"
import { ArrowRight, Terminal, Shield, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <ScanlineOverlay />
      <NavHeader />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            {/* Protocol badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-neon-cyan/30 bg-card/30 backdrop-blur-sm mb-8">
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Protocol v1.0</span>
            </div>

            {/* Main title */}
            <h1 className="font-mono text-5xl sm:text-7xl lg:text-8xl font-bold tracking-[0.2em] mb-6 animate-flicker">
              <span className="neon-text-cyan">VEIL</span>
            </h1>

            {/* Tagline */}
            <p className="font-mono text-lg sm:text-xl text-muted-foreground tracking-wider mb-4">
              Private subscriptions. Trustless access.
            </p>

            {/* Terminal-style description */}
            <div className="max-w-2xl mx-auto mb-12 space-y-2">
              <TerminalText>Zero-knowledge payment protocol</TerminalText>
              <TerminalText prefix="$">Stealth addresses for complete anonymity</TerminalText>
              <TerminalText prefix="#">Commitment-based access verification</TerminalText>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/register-domain">
                <NeonButton variant="green" size="lg" className="w-full sm:w-auto group">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Register Domain
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </NeonButton>
              </Link>
              <Link href="/pay">
                <NeonButton variant="cyan" size="lg" className="w-full sm:w-auto group">
                  <span className="flex items-center gap-2">
                    Pay Privately
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </NeonButton>
              </Link>
              <Link href="/verify">
                <NeonButton variant="outline" size="lg" className="w-full sm:w-auto">
                  Verify Access
                </NeonButton>
              </Link>
            </div>

            {/* Guarantee badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <GuaranteeBadge type="stealth" />
              <GuaranteeBadge type="zk" />
              <GuaranteeBadge type="no-identity" />
              <GuaranteeBadge type="commitment" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-mono text-2xl sm:text-3xl tracking-wider text-foreground mb-4">
                <span className="text-neon-cyan">//</span> Protocol Architecture
              </h2>
              <p className="font-mono text-sm text-muted-foreground max-w-2xl mx-auto">
                Trustless infrastructure for privacy-preserving payments and access control
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassPanel glow="cyan" className="group hover:scale-[1.02] transition-transform">
                <Terminal className="w-8 h-8 text-neon-cyan mb-4" />
                <h3 className="font-mono text-lg tracking-wider text-foreground mb-2">Stealth Addresses</h3>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                  Generate unique one-time addresses for each payment. No on-chain link between sender and recipient.
                </p>
                <div className="mt-4 pt-4 border-t border-border">
                  <TerminalText prefix="0x">f7d8...9e2a → stealth_addr</TerminalText>
                </div>
              </GlassPanel>

              <GlassPanel glow="green" className="group hover:scale-[1.02] transition-transform">
                <Shield className="w-8 h-8 text-neon-green mb-4" />
                <h3 className="font-mono text-lg tracking-wider text-foreground mb-2">ZK Verification</h3>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                  Prove access rights without revealing payment details. Cryptographic verification without identity
                  exposure.
                </p>
                <div className="mt-4 pt-4 border-t border-border">
                  <TerminalText prefix="π">proof_valid: true</TerminalText>
                </div>
              </GlassPanel>

              <GlassPanel glow="purple" className="group hover:scale-[1.02] transition-transform">
                <Zap className="w-8 h-8 text-neon-purple mb-4" />
                <h3 className="font-mono text-lg tracking-wider text-foreground mb-2">Commitment Registry</h3>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                  On-chain commitments without identity correlation. Nullifiers prevent double-spending and replay
                  attacks.
                </p>
                <div className="mt-4 pt-4 border-t border-border">
                  <TerminalText prefix="C">commitment_registered</TerminalText>
                </div>
              </GlassPanel>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border border-neon-cyan/50 flex items-center justify-center">
                  <span className="font-mono text-neon-cyan font-bold text-xs">V</span>
                </div>
                <span className="font-mono text-sm tracking-wider text-muted-foreground">VEIL PROTOCOL</span>
              </div>
              <div className="font-mono text-xs text-muted-foreground">Trustless. Private. Verifiable.</div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
