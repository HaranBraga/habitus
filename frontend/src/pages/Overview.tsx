import { useQuery } from '@tanstack/react-query'
import { getUsers, getRankingDaily, getEvolution, type User, type RankingUser } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { TrendingUp, Flame, Star, Loader2, Scale } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Props = { userId: string }

const LEVEL_COLORS = ['', '#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']
const LEVEL_NAMES = ['', 'Iniciante', 'Aprendiz', 'Comprometido', 'Consistente', 'Elite']
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function UserOverviewCard({ user, ranking, isMe }: { user: User; ranking?: RankingUser; isMe: boolean }) {
  const { data: evo, isLoading } = useQuery({
    queryKey: ['evolution', user.id],
    queryFn: () => getEvolution(user.id, 6),
  })

  const monthsData = evo?.months.map(m => ({
    month: MONTH_SHORT[Number(m.month.split('-')[1]) - 1],
    pts: m.monthlyPoints,
  })) ?? []

  const weightData = evo?.weightHistory.map(w => ({
    date: new Date(w.loggedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    peso: w.weight,
  })) ?? []

  return (
    <div className="rounded-2xl p-4 space-y-4"
      style={{ background: isMe ? 'rgba(124,92,252,0.08)' : '#1c1c28', border: `1px solid ${isMe ? '#7c5cfc40' : '#2a2a3a'}` }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">{user.name}</span>
            {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(124,92,252,0.2)', color: '#9d82fd' }}>Você</span>}
          </div>
          {ranking && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-medium" style={{ color: LEVEL_COLORS[ranking.level] }}>
                Nv.{ranking.level} {LEVEL_NAMES[ranking.level]}
              </span>
              <div className="flex items-center gap-1">
                <Flame size={11} className="text-orange-400" />
                <span className="text-xs text-orange-400">{ranking.streak}d</span>
              </div>
            </div>
          )}
        </div>
        {ranking && (
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Star size={13} className="text-primary" />
              <span className="font-black text-white text-lg">{ranking.monthlyPoints}</span>
            </div>
            <span className="text-xs text-gray-600">pts este mês</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary" size={20} /></div>
      ) : (
        <>
          {monthsData.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-2">Pontos por mês</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={monthsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: '#1c1c28', border: '1px solid #2a2a3a', borderRadius: 12, color: '#fff' }}
                    labelStyle={{ color: '#9090b0', fontSize: 11 }}
                    formatter={(v: number) => [`${v} pts`, 'Pontos']}
                  />
                  <Bar dataKey="pts" fill="#7c5cfc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {weightData.length >= 2 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Scale size={12} className="text-pink-400" />
                <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">Evolução do peso</p>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={['auto', 'auto']} width={32} />
                  <Tooltip
                    contentStyle={{ background: '#1c1c28', border: '1px solid #2a2a3a', borderRadius: 12, color: '#fff' }}
                    labelStyle={{ color: '#9090b0', fontSize: 11 }}
                    formatter={(v: number) => [`${v}kg`, 'Peso']}
                  />
                  <Line type="monotone" dataKey="peso" stroke="#ec4899" strokeWidth={2}
                    dot={{ fill: '#ec4899', r: 2.5 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function OverviewPage({ userId }: Props) {
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const { data: ranking } = useQuery({ queryKey: ['ranking', 'daily'], queryFn: getRankingDaily })

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      <PageHeader title="Visão Geral" subtitle="Evolução de cada usuário" Icon={TrendingUp} iconColor="text-primary" />

      {isLoading ? (
        <div className="flex justify-center pt-8"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : !users || users.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sem dados ainda</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(user => (
            <UserOverviewCard key={user.id} user={user} ranking={ranking?.find(r => r.userId === user.id)} isMe={user.id === userId} />
          ))}
        </div>
      )}
    </div>
  )
}
