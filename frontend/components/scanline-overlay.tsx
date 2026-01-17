export function ScanlineOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-[0.02]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/20 to-transparent h-[10px] animate-scanline" />
    </div>
  )
}
