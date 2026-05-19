import { useNavigate } from 'react-router-dom'
import { Scale, CheckSquare, Settings, BrainCircuit, LogOut, ChevronRight } from 'lucide-react'

type Props = { userId: string; onLogout: () => void }

export function MorePage({ onLogout }: Props) {
  const navigate = useNavigate()

  const items = [
    { icon: Scale, label: 'Peso', sub: 'Registrar e acompanhar', to: '/weight', color: '#ec4899' },
    { icon: CheckSquare, label: 'Tarefas', sub: 'Hábitos personalizados', to: '/tasks', color: '#7c5cfc' },
    { icon: BrainCircuit, label: 'Análise IA', sub: 'Insights com DeepSeek', to: '/analysis', color: '#3b82f6' },
    { icon: Settings, label: 'Configurações', sub: 'Metas e lembretes', to: '/settings', color: '#6b7280' },
  ]

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-white">Mais</h1>
      </div>

      <div className="space-y-2">
        {items.map(({ icon: Icon, label, sub, to, color }) => (
          <button key={to} onClick={() => navigate(to)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-95"
            style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: color + '20' }}>
              <Icon size={20} style={{ color }} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
            </div>
            <ChevronRight size={16} className="text-gray-700" />
          </button>
        ))}
      </div>

      <div className="pt-4">
        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-gray-600 transition-all"
          style={{ border: '1px solid #2a2a3a' }}>
          <LogOut size={15} />
          Trocar de usuário
        </button>
      </div>
    </div>
  )
}
