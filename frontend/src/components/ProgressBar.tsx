type Props = { value: number; max: number; color?: string; className?: string; height?: string }

export function ProgressBar({ value, max, color = 'bg-primary', className = '', height = 'h-1.5' }: Props) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0)
  return (
    <div className={`w-full rounded-full overflow-hidden ${height} ${className}`}
      style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }} />
    </div>
  )
}
