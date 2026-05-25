import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRankingDaily, getRankingMonthly, getDashboard, type RankingUser } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
import { Trophy, Flame, Star, Droplets, Dumbbell, BookOpen, Languages, Loader2, Calendar, Sun, X, ChevronRight, Check } from 'lucide-react'

type Props = { userId: string }
type Tab = 'daily' | 'monthly'

const LEVEL_COLORS = ['', '#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']
const LEVEL_NAMES = ['', 'Iniciante', 'Aprendiz', 'Comprometido', 'Consistente', 'Elite']

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function UserActivityModal({ user, onClose }: { user: RankingUser; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user.userId],
    queryFn: () => getDashboard(user.userId),
  })

  const sections = data ? [
    {
      icon: Droplets, color: '#3b82f6', label: 'Água',
      summary: `${data.today.water.total}ml / ${data.today.water.goal}ml`,
      progress: Math.min(100, (data.today.water.total / data.today.water.goal) * 100),
      items: data.today.water.logs.map(l => ({
        main: `${l.amountMl}ml`,
        sub: fmt(l.loggedAt),
      })),
      empty: 'Nenhum registro de água hoje',
    },
    {
      icon: Dumbbell, color: '#10b981', label: 'Atividade',
      summary: `${data.today.activity.total}min / ${data.today.activity.goal}min`,
      progress: Math.min(100, (data.today.activity.total / data.today.activity.goal) * 100),
      items: data.today.activity.logs.map(l => ({
        main: l.description ?? 'Atividade',
        sub: `${l.durationMinutes}min · ${fmt(l.loggedAt)}`,
      })),
      empty: 'Nenhuma atividade registrada hoje',
    },
    {
      icon: BookOpen, color: '#8b5cf6', label: 'Leitura',
      summary: `${data.today.reading.total}min / ${data.today.reading.goal}min`,
      progress: Math.min(100, (data.today.reading.total / data.today.reading.goal) * 100),
      items: data.today.reading.logs.map(l => ({
        main: `${l.durationMinutes}min`,
        sub: fmt(l.loggedAt),
      })),
      empty: 'Nenhuma leitura registrada hoje',
    },
  ] : []

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{ background: '#16161f', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#2a2a3a' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h2 className="font-bold text-white text-lg">{user.name}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs font-medium" style={{ color: LEVEL_COLORS[user.level] }}>
                Nv.{user.level} {LEVEL_NAMES[user.level]}
              </span>
              <div className="flex items-center gap-1">
                <Flame size={10} className="text-orange-400" />
                <span className="text-xs text-orange-400">{user.streak}d</span>
              </div>
              <div className="flex items-center gap-1">
                <Star size={10} className="text-primary" />
                <span className="text-xs text-primary">{user.todayPoints} pts hoje</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:text-gray-300 transition-colors"
            style={{ background: '#1c1c28' }}>
            <X size={18} />
          </button>
        </div>

        {/* English badge */}
        {data && (
          <div className="px-5 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: data.today.english.studied ? 'rgba(245,158,11,0.1)' : '#1c1c28', border: `1px solid ${data.today.english.studied ? 'rgba(245,158,11,0.2)' : '#2a2a3a'}` }}>
              <Languages size={14} style={{ color: data.today.english.studied ? '#f59e0b' : '#4b5563' }} />
              <span className="text-xs font-semibold" style={{ color: data.today.english.studied ? '#f59e0b' : '#4b5563' }}>
                Inglês
              </span>
              {data.today.english.studied
                ? <Check size={13} className="text-amber-400 ml-auto" />
                : <span className="text-xs text-gray-600 ml-auto">Não registrado</span>
              }
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 pb-6 space-y-4" style={{ maxHeight: 'calc(85vh - 160px)' }}>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            sections.map(({ icon: Icon, color, label, summary, progress, items, empty }) => (
              <div key={label} className="rounded-2xl overflow-hidden" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2a2a3a' }}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color }} strokeWidth={2.5} />
                    <span className="text-sm font-semibold text-white">{label}</span>
                  </div>
                  <span className="text-xs text-gray-500">{summary}</span>
                </div>
                <div className="px-4 py-1">
                  <ProgressBar value={progress} max={100} color="" height="h-1" className="opacity-70" />
                </div>
                {/* Log items */}
                <div className="px-4 pb-3 pt-1 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-600 py-1">{empty}</p>
                  ) : (
                    items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-sm text-white font-medium">{item.main}</span>
                        </div>
                        <span className="text-xs text-gray-600">{item.sub}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function UserCard({ user, rank, isMe, mode, onClick }: { user: RankingUser; rank: number; isMe: boolean; mode: Tab; onClick?: () => void }) {
  const pts = mode === 'daily' ? user.todayPoints : user.monthlyPoints
  const habits = [
    { icon: Droplets, value: user.today.water.total, goal: user.today.water.goal, color: '#3b82f6' },
    { icon: Dumbbell, value: user.today.activity.total, goal: user.today.activity.goal, color: '#10b981' },
    { icon: BookOpen, value: user.today.reading.total, goal: user.today.reading.goal, color: '#8b5cf6' },
    { icon: Languages, value: user.today.english.studied ? 1 : 0, goal: 1, color: '#f59e0b' },
  ]

  return (
    <div
      className={`rounded-2xl p-4 space-y-4 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
      style={{
        background: isMe ? 'rgba(124,92,252,0.08)' : '#1c1c28',
        border: `1px solid ${isMe ? '#7c5cfc40' : '#2a2a3a'}`,
      }}
      onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
          style={{ background: rank === 1 ? '#f59e0b20' : '#ffffff08', color: rank === 1 ? '#f59e0b' : '#4b5563' }}>
          {rank === 1 ? '1' : rank}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{user.name}</span>
            {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(124,92,252,0.2)', color: '#9d82fd' }}>Você</span>}
            {user.isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Admin</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-medium" style={{ color: LEVEL_COLORS[user.level] }}>
              Nv.{user.level} {LEVEL_NAMES[user.level]}
            </span>
            <div className="flex items-center gap-1">
              <Flame size={10} className="text-orange-400" />
              <span className="text-xs text-orange-400">{user.streak}d</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Star size={12} className="text-primary" />
              <span className="font-black text-white text-lg">{pts}</span>
            </div>
            <span className="text-xs text-gray-600">{mode === 'daily' ? 'hoje' : 'este mês'}</span>
          </div>
          {onClick && <ChevronRight size={14} className="text-gray-700 flex-shrink-0" />}
        </div>
      </div>

      {mode === 'daily' && (
        <div className="grid grid-cols-4 gap-2">
          {habits.map(({ icon: Icon, value, goal, color }, i) => (
            <div key={i} className="space-y-1">
              <Icon size={11} style={{ color }} strokeWidth={2.5} />
              <ProgressBar value={value} max={goal} color="" height="h-1"
                className="opacity-80" />
            </div>
          ))}
        </div>
      )}

      {mode === 'monthly' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (pts / 3000) * 100)}%` }} />
          </div>
          <span className="text-xs text-gray-600 flex-shrink-0">{pts} pts</span>
        </div>
      )}
    </div>
  )
}

export function RankingPage({ userId }: Props) {
  const [tab, setTab] = useState<Tab>('daily')
  const [selectedUser, setSelectedUser] = useState<RankingUser | null>(null)

  const { data: daily, isLoading: loadingDaily } = useQuery({
    queryKey: ['ranking', 'daily'],
    queryFn: getRankingDaily,
    refetchInterval: 30_000,
  })
  const { data: monthly, isLoading: loadingMonthly } = useQuery({
    queryKey: ['ranking', 'monthly'],
    queryFn: getRankingMonthly,
    refetchInterval: 60_000,
  })

  const data = tab === 'daily' ? daily : monthly
  const isLoading = tab === 'daily' ? loadingDaily : loadingMonthly

  const [first, second] = data ?? []
  const totalPts = (first?.todayPoints ?? 0) + (second?.todayPoints ?? 0)
  const monthTotal = (first?.monthlyPoints ?? 0) + (second?.monthlyPoints ?? 0)
  const compTotal = tab === 'daily' ? totalPts : monthTotal

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      {selectedUser && (
        <UserActivityModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      <PageHeader title="Ranking" subtitle={tab === 'daily' ? 'Batalha de hoje' : `Mês de ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`}
        Icon={Trophy} iconColor="text-amber-400" />

      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: '#1c1c28' }}>
        {[
          { key: 'daily' as Tab, label: 'Hoje', Icon: Sun },
          { key: 'monthly' as Tab, label: 'Este Mês', Icon: Calendar },
        ].map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: tab === key ? 'rgba(124,92,252,0.2)' : 'transparent', color: tab === key ? '#9d82fd' : '#6b7280' }}>
            <Icon size={15} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-8"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : data && data.length >= 2 ? (
        <>
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-white">{first?.name}</span>
              <span className="text-xs text-gray-600 font-medium">
                {tab === 'daily' ? 'diferença hoje' : 'diferença no mês'}
              </span>
              <span className="font-bold text-white">{second?.name}</span>
            </div>
            <div className="flex gap-1 h-3">
              {compTotal > 0 ? (
                <>
                  <div className="rounded-l-full transition-all" style={{
                    background: '#7c5cfc',
                    width: `${((tab === 'daily' ? first.todayPoints : first.monthlyPoints) / compTotal) * 100}%`,
                  }} />
                  <div className="rounded-r-full transition-all" style={{
                    background: '#ec4899',
                    width: `${((tab === 'daily' ? second.todayPoints : second.monthlyPoints) / compTotal) * 100}%`,
                  }} />
                </>
              ) : (
                <div className="w-full rounded-full" style={{ background: '#2a2a3a' }} />
              )}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-primary font-bold">{tab === 'daily' ? first?.todayPoints : first?.monthlyPoints} pts</span>
              <span style={{ color: '#ec4899' }} className="font-bold">{tab === 'daily' ? second?.todayPoints : second?.monthlyPoints} pts</span>
            </div>
          </div>

          <div className="space-y-3">
            {data.map((user, i) => (
              <UserCard key={user.userId} user={user} rank={i + 1} isMe={user.userId === userId} mode={tab}
                onClick={() => setSelectedUser(user)} />
            ))}
          </div>
        </>
      ) : data && data.length === 1 ? (
        <UserCard user={data[0]} rank={1} isMe={data[0].userId === userId} mode={tab}
          onClick={() => setSelectedUser(data[0])} />
      ) : (
        <div className="text-center py-12 text-gray-600">
          <Trophy size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sem dados ainda</p>
        </div>
      )}
    </div>
  )
}
