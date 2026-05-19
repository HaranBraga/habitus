import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Droplets, Dumbbell, BookOpen, Languages, Scale, Settings } from 'lucide-react'

type Props = { userId: string; onLogout: () => void }

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/water', icon: Droplets, label: 'Água' },
  { to: '/activity', icon: Dumbbell, label: 'Treino' },
  { to: '/reading', icon: BookOpen, label: 'Leitura' },
  { to: '/english', icon: Languages, label: 'Inglês' },
  { to: '/weight', icon: Scale, label: 'Peso' },
]

export function Layout(_: Props) {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
        <div className="flex items-center justify-around px-1 py-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[48px] ${
                  isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <Icon size={22} strokeWidth={1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[48px] ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Settings size={22} strokeWidth={1.75} />
            <span className="text-[10px] font-medium">Config</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
