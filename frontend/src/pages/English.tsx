import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logEnglish } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { useState } from 'react'

type Props = { userId: string }

export function EnglishPage({ userId }: Props) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })
  const [duration, setDuration] = useState('')

  const mutation = useMutation({
    mutationFn: (d: { studied: boolean; durationMinutes?: number }) => logEnglish(userId, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', userId] }),
  })

  if (isLoading || !data) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-amber-500" size={28} /></div>

  const { studied, log } = data.today.english

  const handleLog = () => {
    const min = parseInt(duration)
    mutation.mutate({ studied: true, durationMinutes: min > 0 ? min : undefined })
    setDuration('')
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <PageHeader title="Inglês" subtitle="Estudo de inglês diário" icon="🇺🇸" />

      {/* Status */}
      <div className={`rounded-3xl p-8 flex flex-col items-center text-center ${studied ? 'bg-amber-50' : 'bg-gray-50'}`}>
        {studied ? (
          <>
            <CheckCircle2 className="text-amber-500 mb-3" size={56} />
            <p className="text-xl font-bold text-amber-700">Inglês feito hoje!</p>
            {log?.durationMinutes && (
              <p className="text-amber-500 mt-1 text-sm">{log.durationMinutes} minutos estudados</p>
            )}
          </>
        ) : (
          <>
            <Circle className="text-gray-300 mb-3" size={56} />
            <p className="text-xl font-bold text-gray-500">Ainda não registrado</p>
            <p className="text-gray-400 mt-1 text-sm">Você estudou inglês hoje?</p>
          </>
        )}
      </div>

      {!studied && (
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Quantos minutos? (opcional)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={1}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            onClick={handleLog}
            disabled={mutation.isPending}
            className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 size={20} className="animate-spin" /> : '🎓'}
            Marcar como feito
          </button>
        </div>
      )}

      {studied && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">
            ✅ Você manteve o hábito de estudar inglês hoje. Continue assim!
          </p>
        </div>
      )}

      {/* Streak tip */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
        <p className="text-xs text-amber-600 font-medium">
          💡 Dica: Estude inglês todo dia, mesmo que seja por 5 minutos. A consistência é o que transforma o hábito.
        </p>
      </div>
    </div>
  )
}
