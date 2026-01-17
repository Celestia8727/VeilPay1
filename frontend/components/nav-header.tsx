"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Menu, X, ChevronDown, Layers, CreditCard, LayoutDashboard } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"

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
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted
                const connected = ready && account && chain

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="px-4 py-1.5 bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan font-mono text-xs uppercase tracking-wider hover:bg-neon-cyan/20 transition-all rounded-md"
                          >
                            Connect
                          </button>
                        )
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="px-4 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 font-mono text-xs uppercase tracking-wider hover:bg-red-500/20 transition-all rounded-md"
                          >
                            Wrong Network
                          </button>
                        )
                      }

                      return (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="px-2 py-1.5 bg-white/5 border border-border/50 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors rounded-md flex items-center gap-1"
                          >
                            {chain.hasIcon && chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                className="w-3 h-3"
                              />
                            )}
                            {chain.name?.slice(0, 6)}
                          </button>

                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan font-mono text-xs uppercase tracking-wider hover:bg-neon-cyan/20 transition-all rounded-md"
                          >
                            {account.displayName}
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                )
              }}
            </ConnectButton.Custom>
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
            <ConnectButton />
          </div>
        </nav>
      )}
    </header>
  )
}
