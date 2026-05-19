type Props = {
  value: number
  max: number
  color?: string
  className?: string
}

export function ProgressBar({ value, max, color = 'bg-primary', className = '' }: Props) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className={`w-full bg-gray-100 rounded-full h-2.5 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
