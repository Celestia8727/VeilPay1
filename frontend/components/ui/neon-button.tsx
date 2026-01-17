"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "cyan" | "green" | "purple" | "outline"
  size?: "default" | "sm" | "lg"
}

export function NeonButton({ className, variant = "cyan", size = "default", children, ...props }: NeonButtonProps) {
  const variants = {
    cyan: "bg-neon-cyan text-primary-foreground hover:shadow-[0_0_20px_rgba(0,212,255,0.6)] border-neon-cyan",
    green: "bg-neon-green text-primary-foreground hover:shadow-[0_0_20px_rgba(57,255,20,0.6)] border-neon-green",
    purple: "bg-neon-purple text-primary-foreground hover:shadow-[0_0_20px_rgba(191,64,255,0.6)] border-neon-purple",
    outline:
      "bg-transparent border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.4)]",
  }

  const sizes = {
    sm: "px-4 py-2 text-sm",
    default: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  }

  return (
    <button
      className={cn(
        "font-mono tracking-wider uppercase border transition-all duration-300",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
