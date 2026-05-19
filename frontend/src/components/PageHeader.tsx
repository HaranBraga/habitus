import { LucideIcon } from 'lucide-react'

type Props = { title: string; subtitle?: string; Icon?: LucideIcon; iconColor?: string }

export function PageHeader({ title, subtitle, Icon, iconColor = 'text-primary' }: Props) {
  return (
    <div className="px-4 pt-12 pb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(124,92,252,0.15)' }}>
            <Icon size={22} className={iconColor} strokeWidth={2} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
