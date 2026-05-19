type Props = {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}

export function PageHeader({ title, subtitle, icon }: Props) {
  return (
    <div className="px-4 pt-12 pb-4">
      <div className="flex items-center gap-3">
        {icon && <div className="text-3xl">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
