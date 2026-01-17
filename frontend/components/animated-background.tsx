"use client"

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base grid */}
      <div className="absolute inset-0 grid-bg" />

      {/* Floating particles */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        <defs>
          <radialGradient id="cyan-glow">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.8)" />
            <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
          </radialGradient>
          <radialGradient id="green-glow">
            <stop offset="0%" stopColor="rgba(57, 255, 20, 0.8)" />
            <stop offset="100%" stopColor="rgba(57, 255, 20, 0)" />
          </radialGradient>
          <radialGradient id="purple-glow">
            <stop offset="0%" stopColor="rgba(191, 64, 255, 0.8)" />
            <stop offset="100%" stopColor="rgba(191, 64, 255, 0)" />
          </radialGradient>
        </defs>

        {/* Animated circles */}
        <circle
          cx="20%"
          cy="30%"
          r="100"
          fill="url(#cyan-glow)"
          className="animate-pulse"
          style={{ animationDelay: "0s" }}
        />
        <circle
          cx="80%"
          cy="20%"
          r="60"
          fill="url(#purple-glow)"
          className="animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <circle
          cx="70%"
          cy="70%"
          r="80"
          fill="url(#green-glow)"
          className="animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <circle
          cx="30%"
          cy="80%"
          r="50"
          fill="url(#cyan-glow)"
          className="animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />

        {/* Connection lines */}
        <line x1="20%" y1="30%" x2="80%" y2="20%" stroke="rgba(0, 212, 255, 0.1)" strokeWidth="1" />
        <line x1="80%" y1="20%" x2="70%" y2="70%" stroke="rgba(191, 64, 255, 0.1)" strokeWidth="1" />
        <line x1="70%" y1="70%" x2="30%" y2="80%" stroke="rgba(57, 255, 20, 0.1)" strokeWidth="1" />
        <line x1="30%" y1="80%" x2="20%" y2="30%" stroke="rgba(0, 212, 255, 0.1)" strokeWidth="1" />
      </svg>

      {/* Noise overlay */}
      <div className="absolute inset-0 noise-overlay" />
    </div>
  )
}
