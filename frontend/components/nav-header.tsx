"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Menu, X, ChevronDown, Layers, CreditCard, LayoutDashboard } from "lucide-react"
import { useAccount, useConnect, useDisconnect } from "wagmi"

// Grouped navigation structure
const navGroups = {
  domains: {
    label: "Domains",
    icon: Layers,
    items: [
      { href: "/register-domain", label: "Register" },
      { href: "/my-domains", label: "My Domains" },
    ]
  },
  payments: {
    label: "Payments",
    icon: CreditCard,
    items: [
      { href: "/merchant", label: "Merchant" },
      { href: "/scan-payments", label: "Scan" },
      { href: "/pay", label: "Pay" },
    ]
  }
}

const mainLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
]

// Custom Wallet Button using Wagmi
function WalletButton() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending, error, reset } = useConnect()
  const { disconnect } = useDisconnect()
  const [showMenu, setShowMenu] = React.useState(false)
  const [isConnecting, setIsConnecting] = React.useState(false)

  // Debug: Log connectors
  React.useEffect(() => {
    console.log('Available connectors:', connectors.map(c => ({ name: c.name, type: c.type })))
  }, [connectors])

  // Debug: Log connection error
  React.useEffect(() => {
    if (error) {
      console.error('Connection error:', error)
    }
  }, [error])

  // Reset connecting state when connection status changes
  React.useEffect(() => {
    if (isConnected) {
      setIsConnecting(false)
    }
  }, [isConnected])

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      console.log('Attempting to connect...')

      // Reset any previous connection errors
      reset()

      // Detect if we're in Farcaster environment
      const isFarcasterEnv = typeof window !== 'undefined' && (
        window.location.ancestorOrigins?.length > 0 ||
        window.parent !== window ||
        document.referrer.includes('warpcast') ||
        document.referrer.includes('farcaster')
      )

      console.log('Environment:', isFarcasterEnv ? 'Farcaster Mini App' : 'Regular Web')

      // Find available connectors
      const farcasterConnector = connectors.find(c =>
        c.name.toLowerCase().includes('farcaster') ||
        c.type === 'farcaster'
      )
      const injectedConnector = connectors.find(c => c.type === 'injected')

      // Choose connector based on environment
      let connector
      if (isFarcasterEnv && farcasterConnector) {
        // In Farcaster app, use Farcaster connector
        connector = farcasterConnector
        console.log('Using Farcaster connector in mini app')
      } else if (injectedConnector) {
        // On regular web, use injected wallet (MetaMask, etc.)
        connector = injectedConnector
        console.log('Using injected connector on web')
      } else {
        // Fallback to first available
        connector = connectors[0]
        console.log('Using fallback connector:', connector?.name)
      }

      console.log('Selected connector:', connector?.name, connector?.type)
      console.log('All available connectors:', connectors.map(c => ({ name: c.name, type: c.type })))

      if (connector) {
        await connect({ connector })
      } else {
        console.error('No connectors available')
        const message = isFarcasterEnv
          ? 'Unable to connect to Farcaster wallet. Please try again.'
          : 'No wallet found. Please install MetaMask or a compatible wallet.'
        alert(message)
        setIsConnecting(false)
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setShowMenu(false)
    setIsConnecting(false)
    reset()
    disconnect()
  }

  if (!isConnected) {
    // Check if we're in Farcaster environment
    const hasFarcasterConnector = connectors.some(c =>
      c.name.toLowerCase().includes('farcaster') || c.type === 'farcaster'
    )

    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting || isPending}
        type="button"
        className="px-4 py-1.5 bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan font-mono text-xs uppercase tracking-wider hover:bg-neon-cyan/20 transition-all rounded-md disabled:opacity-50"
      >
        {isConnecting || isPending ? 'Connecting...' : hasFarcasterConnector ? 'Connect Wallet' : 'Connect'}
      </button>
    )
  }

  const wrongNetwork = chain?.id !== 10143 // Monad testnet

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        type="button"
        className={cn(
          "px-3 py-1.5 border font-mono text-xs uppercase tracking-wider transition-all rounded-md",
          wrongNetwork
            ? "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20"
            : "bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20"
        )}
      >
        {wrongNetwork ? "Wrong Network" : `${address?.slice(0, 6)}...${address?.slice(-4)}`}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-background/95 backdrop-blur-xl border border-neon-cyan/20 rounded-xl p-2 shadow-2xl z-50">
          <button
            onClick={handleDisconnect}
            className="w-full px-3 py-2 text-left font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}


function NavDropdown({
  label,
  icon: Icon,
  items,
  pathname
}: {
  label: string
  icon: React.ElementType
  items: { href: string; label: string }[]
  pathname: string
}) {
  const [open, setOpen] = React.useState(false)
  const isActive = items.some(item => pathname === item.href)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-300 rounded-md",
          isActive
            ? "text-neon-cyan bg-neon-cyan/10"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
      >
        <Icon className={cn("w-3.5 h-3.5 transition-transform duration-300", open && "scale-110")} />
        {label}
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", open && "rotate-180")} />
      </button>

      {/* Wrapper with padding to bridge gap */}
      <div
        className={cn(
          "absolute top-full left-0 pt-1 min-w-[160px]",
          open ? "" : "pointer-events-none"
        )}
      >
        {/* Actual dropdown container */}
        <div
          className={cn(
            "py-2 rounded-xl overflow-hidden",
            "bg-gradient-to-b from-background/98 to-background/95 backdrop-blur-2xl",
            "border border-neon-cyan/20 shadow-2xl shadow-neon-cyan/5",
            "transition-all duration-300 ease-out origin-top",
            open
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-2"
          )}
        >
          {/* Glow effect at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />

          {items.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-4 py-2.5 font-mono text-xs transition-all duration-200",
                "relative overflow-hidden",
                pathname === item.href
                  ? "text-neon-cyan bg-neon-cyan/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{
                transitionDelay: open ? `${index * 50}ms` : '0ms'
              }}
            >
              {/* Hover highlight */}
              <span className={cn(
                "absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-neon-cyan/5 to-neon-cyan/0",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              )} />

              {/* Active indicator */}
              {pathname === item.href && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-neon-cyan rounded-full" />
              )}

              <span className="relative">{item.label}</span>
            </Link>
          ))}

          {/* Glow effect at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />
        </div>
      </div>
    </div>
  )
}

export function NavHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 border border-neon-cyan/70 flex items-center justify-center rounded-md bg-neon-cyan/5 group-hover:bg-neon-cyan/10 transition-colors">
              <span className="font-mono text-neon-cyan font-bold text-xs">V</span>
            </div>
            <span className="font-mono text-sm tracking-[0.2em] text-foreground/90 group-hover:text-neon-cyan transition-colors">
              VEIL
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Domains Dropdown */}
            <NavDropdown
              {...navGroups.domains}
              pathname={pathname}
            />

            {/* Payments Dropdown */}
            <NavDropdown
              {...navGroups.payments}
              pathname={pathname}
            />

            {/* Main Links */}
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-all rounded-md",
                  pathname === link.href
                    ? "text-neon-cyan bg-neon-cyan/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="w-px h-6 bg-border/50 mx-2" />

            {/* Wallet Connect Button */}
            <WalletButton />
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border/30 p-4">
          {/* Domains Group */}
          <div className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Domains
            </p>
            {navGroups.domains.items.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block font-mono text-sm py-2 pl-4 transition-colors",
                  pathname === link.href ? "text-neon-cyan" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Payments Group */}
          <div className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Payments
            </p>
            {navGroups.payments.items.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block font-mono text-sm py-2 pl-4 transition-colors",
                  pathname === link.href ? "text-neon-cyan" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Main Links */}
          <div className="pt-4 border-t border-border/30">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 font-mono text-sm py-2 transition-colors",
                  pathname === link.href ? "text-neon-cyan" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Wallet Connect */}
          <div className="pt-4 mt-4 border-t border-border/30">
            <WalletButton />
          </div>
        </nav>
      )}
    </header>
  )
}
