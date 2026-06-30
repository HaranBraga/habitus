import { CheckCircle2 } from 'lucide-react'

export function SuccessToast({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
      <CheckCircle2 size={16} className="flex-shrink-0" />
      {message}
    </div>
  )
}
