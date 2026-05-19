import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Droplets, Dumbbell, BookOpen, Trophy, MoreHorizontal } from 'lucide-react'

type Props = { userId: string; onLogout: () => void }

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início', end: true },
  { to: '/water', icon: Droplets, label: 'Água', end: false },
  { to: '/activity', icon: Dumbbell, label: 'Treino', end: false },
  { to: '/studies', icon: BookOpen, label: 'Estudos', end: false },
  { to: '/ranking', icon: Trophy, label: 'Ranking', end: false },
  { to: '/more', icon: MoreHorizontal, label: 'Mais', end: false },
]

export function Layout(_: Props) {
  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#0d0d14' }}>
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 safe-bottom z-50"
        style={{ background: '#14141e', borderTop: '1px solid #2a2a3a' }}>
        <div className="flex items-center justify-around px-1 py-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[48px] ${
                  isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-primary/15' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className="text-[9px] font-medium tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
