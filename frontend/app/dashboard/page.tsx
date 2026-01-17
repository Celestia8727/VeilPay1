"use client"

import * as React from "react"
import { AnimatedBackground } from "@/components/animated-background"
import { ScanlineOverlay } from "@/components/scanline-overlay"
import { NavHeader } from "@/components/nav-header"
import { GlassPanel } from "@/components/ui/glass-panel"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Activity, RefreshCw, TrendingUp, Wallet, Zap } from "lucide-react"
import { formatEther } from "viem"

type EventType = "PaymentReceived" | "PaymentClaimed" | "x402Payment"

interface ProtocolEvent {
  id: string
  type: EventType
  timestamp: Date
  blockNumber?: number
  hash: string
  amount?: string
  claimed?: boolean
  isWeiAmount?: boolean // true for payments (wei), false for x402 (decimal)
}

const eventColors: Record<EventType, string> = {
  PaymentReceived: "text-neon-cyan",
  PaymentClaimed: "text-neon-green",
  x402Payment: "text-neon-purple",
}

const eventDots: Record<EventType, "active" | "pending" | "verified"> = {
  PaymentReceived: "active",
  PaymentClaimed: "verified",
  x402Payment: "pending",
}

export default function DashboardPage() {
  const [events, setEvents] = React.useState<ProtocolEvent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [stats, setStats] = React.useState({
    totalPayments: 0,
    claimedPayments: 0,
    unclaimedPayments: 0,
    totalVolume: BigInt(0),
    x402Payments: 0
  })

  // Fetch real data from Supabase
  const fetchData = React.useCallback(async () => {
    console.log('📊 Dashboard: Fetching data...')
    setIsLoading(true)
    try {
      // Fetch payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50)

      if (paymentsError) console.error('Payments fetch error:', paymentsError)

      // Fetch x402 payments
      const { data: x402Payments } = await supabase
        .from('x402_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      // Convert to events
      const paymentEvents: ProtocolEvent[] = (payments || []).map(p => ({
        id: p.transaction_hash,
        type: p.claimed ? "PaymentClaimed" : "PaymentReceived" as EventType,
        timestamp: new Date(p.timestamp * 1000),
        blockNumber: p.block_number,
        hash: p.transaction_hash,
        amount: p.amount,
        claimed: p.claimed,
        isWeiAmount: true // payments are in wei
      }))

      const x402Events: ProtocolEvent[] = (x402Payments || []).map(p => ({
        id: p.id,
        type: "x402Payment" as EventType,
        timestamp: new Date(p.created_at),
        hash: p.transaction_hash,
        amount: p.amount,
        isWeiAmount: false // x402 payments are stored as decimal strings like "0.001"
      }))

      // Combine and sort by timestamp
      const allEvents = [...paymentEvents, ...x402Events]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50)

      setEvents(allEvents)

      // Calculate stats
      const claimed = (payments || []).filter(p => p.claimed).length
      const unclaimed = (payments || []).filter(p => !p.claimed).length
      const totalVol = (payments || []).reduce((sum, p) => sum + BigInt(p.amount || 0), BigInt(0))

      setStats({
        totalPayments: payments?.length || 0,
        claimedPayments: claimed,
        unclaimedPayments: unclaimed,
        totalVolume: totalVol,
        x402Payments: x402Payments?.length || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    })
  }

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <ScanlineOverlay />
      <NavHeader />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-mono text-3xl sm:text-4xl tracking-wider text-foreground mb-2">
                <span className="text-neon-purple">//</span> Dashboard
              </h1>
              <p className="font-mono text-sm text-muted-foreground">
                Real-time protocol activity and statistics
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all rounded-md",
                "border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <GlassPanel glow="cyan" className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-neon-cyan" />
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Total Payments
                </span>
              </div>
              <div className="font-mono text-2xl text-neon-cyan">{stats.totalPayments}</div>
            </GlassPanel>

            <GlassPanel glow="green" className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-neon-green" />
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Claimed
                </span>
              </div>
              <div className="font-mono text-2xl text-neon-green">{stats.claimedPayments}</div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-yellow-400" />
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Unclaimed
                </span>
              </div>
              <div className="font-mono text-2xl text-yellow-400">{stats.unclaimedPayments}</div>
            </GlassPanel>

            <GlassPanel glow="purple" className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-neon-purple" />
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  x402 Payments
                </span>
              </div>
              <div className="font-mono text-2xl text-neon-purple">{stats.x402Payments}</div>
            </GlassPanel>
          </div>

          {/* Volume Card */}
          <GlassPanel className="p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Total Volume
                </div>
                <div className="font-mono text-3xl text-foreground">
                  {Number(formatEther(stats.totalVolume)).toFixed(4)} <span className="text-neon-cyan text-xl">MON</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Avg per Payment
                </div>
                <div className="font-mono text-xl text-muted-foreground">
                  {stats.totalPayments > 0
                    ? Number(formatEther(stats.totalVolume / BigInt(stats.totalPayments))).toFixed(4)
                    : '0.0000'
                  } MON
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Event Feed */}
          <GlassPanel>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <Activity className="w-5 h-5 text-neon-cyan" />
              <h2 className="font-mono text-lg tracking-wider text-foreground">Recent Activity</h2>
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.8)]" />
                <span className="font-mono text-xs text-muted-foreground">Auto-refresh: 30s</span>
              </div>
            </div>

            {/* Terminal-style log */}
            {isLoading && events.length === 0 ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 text-neon-cyan animate-spin mx-auto mb-2" />
                <p className="font-mono text-xs text-muted-foreground">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-mono text-xs text-muted-foreground">No events yet. Make some payments!</p>
              </div>
            ) : (
              <div className="font-mono text-xs space-y-0 max-h-[500px] overflow-y-auto">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-3 py-2 px-3 border-l-2 transition-all hover:bg-secondary/20",
                      index === 0 && "bg-secondary/30",
                      event.type === "PaymentReceived" && "border-l-neon-cyan",
                      event.type === "PaymentClaimed" && "border-l-neon-green",
                      event.type === "x402Payment" && "border-l-neon-purple",
                    )}
                  >
                    <span className="text-muted-foreground shrink-0">
                      [{formatDate(event.timestamp)} {formatTime(event.timestamp)}]
                    </span>
                    <StatusIndicator status={eventDots[event.type]} className="shrink-0 mt-1" />
                    <span className={cn("shrink-0", eventColors[event.type])}>{event.type}</span>
                    {event.amount && (
                      <span className="text-foreground">
                        {event.isWeiAmount
                          ? Number(formatEther(BigInt(event.amount))).toFixed(4)
                          : Number(event.amount).toFixed(4)
                        } MON
                      </span>
                    )}
                    {event.blockNumber && (
                      <span className="text-muted-foreground">block:{event.blockNumber}</span>
                    )}
                    {event.hash && (
                      <span className="text-muted-foreground/60 truncate hidden sm:block">
                        {event.hash.slice(0, 16)}...
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer note */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="font-mono text-xs text-muted-foreground text-center">
                Showing real payments from the Stealth Payment Protocol
              </p>
            </div>
          </GlassPanel>
        </div>
      </main>
    </div>
  )
}
