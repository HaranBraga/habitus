import { useQuery } from '@tanstack/react-query'
import { getRanking, type RankingUser } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
import { Trophy, Flame, Star, Droplets, Dumbbell, BookOpen, Languages, Loader2 } from 'lucide-react'

type Props = { userId: string }

const LEVEL_NAMES = ['', 'Iniciante', 'Aprendiz', 'Comprometido', 'Consistente', 'Elite']
const LEVEL_COLORS = ['', '#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']

function UserCard({ user, rank, isMe }: { user: RankingUser; rank: number; isMe: boolean }) {
  const habits = [
    { icon: Droplets, value: user.today.water.total, goal: user.today.water.goal,
      label: `${user.today.water.total}ml`, color: '#3b82f6' },
    { icon: Dumbbell, value: user.today.activity.total, goal: user.today.activity.goal,
      label: `${user.today.activity.total}min`, color: '#10b981' },
    { icon: BookOpen, value: user.today.reading.total, goal: user.today.reading.goal,
      label: `${user.today.reading.total}min`, color: '#8b5cf6' },
    { icon: Languages, value: user.today.english.studied ? 1 : 0, goal: 1,
      label: user.today.english.studied ? 'Sim' : 'Não', color: '#f59e0b' },
  ]

  return (
    <div className="rounded-2xl p-4 space-y-4"
      style={{
        background: isMe ? 'rgba(124,92,252,0.08)' : '#1c1c28',
        border: `1px solid ${isMe ? '#7c5cfc40' : '#2a2a3a'}`,
      }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black"
          style={{ background: rank === 1 ? '#f59e0b20' : '#ffffff10',
            color: rank === 1 ? '#f59e0b' : '#6b7280' }}>
          {rank === 1 ? '1' : rank}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{user.name}</span>
            {isMe && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Você</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-medium" style={{ color: LEVEL_COLORS[user.level] }}>
              Nv.{user.level} {LEVEL_NAMES[user.level]}
            </span>
            <div className="flex items-center gap-1">
              <Flame size={11} className="text-orange-400" />
              <span className="text-xs text-orange-400">{user.streak}d</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Star size={13} className="text-primary" />
            <span className="font-black text-white text-lg">{user.todayPoints}</span>
          </div>
          <span className="text-xs text-gray-600">hoje</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {habits.map(({ icon: Icon, value, goal, label, color }, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center gap-1">
              <Icon size={11} style={{ color }} strokeWidth={2.5} />
              <span className="text-xs text-gray-500 truncate">{label}</span>
            </div>
            <ProgressBar value={value} max={goal} color=""
              className="!rounded-full"
              {...{ style: { '--tw-bg': color } } as Record<string, unknown>}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RankingPage({ userId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['ranking'],
    queryFn: getRanking,
    refetchInterval: 30_000,
  })

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      <PageHeader title="Ranking" subtitle="Quem está na frente hoje?" Icon={Trophy} iconColor="text-amber-400" />

      {isLoading ? (
        <div className="flex justify-center pt-10">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : data && data.length > 0 ? (
        <>
          {data[0] && data[1] && (
            <div className="rounded-2xl p-4" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
              <p className="text-xs text-gray-600 mb-3 text-center">Diferença de pontos hoje</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white flex-1 text-center">{data[0].name}</span>
                <div className="text-center">
                  <div className="font-black text-primary text-xl">
                    {Math.abs(data[0].todayPoints - data[1].todayPoints)}
                  </div>
                  <div className="text-xs text-gray-600">pts</div>
                </div>
                <span className="text-sm font-bold text-white flex-1 text-center">{data[1].name}</span>
              </div>
              <div className="flex gap-1 mt-3">
                <div className="h-2 rounded-l-full bg-primary transition-all"
                  style={{ width: `${(data[0].todayPoints / Math.max(data[0].todayPoints + data[1].todayPoints, 1)) * 100}%` }} />
                <div className="h-2 rounded-r-full transition-all" style={{ background: '#ec4899',
                  width: `${(data[1].todayPoints / Math.max(data[0].todayPoints + data[1].todayPoints, 1)) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {data.map((user, i) => (
              <UserCard key={user.userId} user={user} rank={i + 1} isMe={user.userId === userId} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-600">
          <Trophy size={40} className="mx-auto mb-3 opacity-20" />
          <p>Sem dados ainda</p>
        </div>
      )}
    </div>
  )
}
