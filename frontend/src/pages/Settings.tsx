import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, updateSettings, type UserSettings } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Settings, Save, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

type Props = { userId: string }

export function SettingsPage({ userId }: Props) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })
  const [form, setForm] = useState<Partial<UserSettings>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (data?.settings) setForm(data.settings) }, [data])

  const mutation = useMutation({
    mutationFn: () => updateSettings(userId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  if (isLoading || !data) return (
    <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
  )

  const field = (label: string, key: keyof UserSettings, unit: string, min: number, max: number, step = 1) => (
    <div className="px-4 py-3 rounded-xl flex items-center justify-between"
      style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-600">{unit}</p>
      </div>
      <input type="number" value={(form[key] as number) ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
        min={min} max={max} step={step}
        className="w-24 text-right px-3 py-2 rounded-xl text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
    </div>
  )

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Configurações" subtitle={data.user.name} Icon={Settings} iconColor="text-gray-400" />

      <div className="space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium px-1">Metas diárias</p>
        {field('Água', 'waterGoalMl', 'ml por dia', 500, 5000, 100)}
        {field('Atividade física', 'activityGoalMinutes', 'minutos por dia', 5, 240, 5)}
        {field('Leitura', 'readingGoalMinutes', 'minutos por dia', 5, 240, 5)}
        {field('Inglês', 'englishGoalMinutes', 'minutos por dia', 5, 120, 5)}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium px-1">Lembretes WhatsApp</p>
        {field('Lembrete de água', 'waterReminderIntervalHours', 'a cada X horas', 1, 12)}
        {field('Checagem de peso', 'weightCheckIntervalDays', 'a cada X dias', 1, 30)}
      </div>

      <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
        style={{ background: saved ? '#10b981' : '#7c5cfc', color: '#fff' }}>
        {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saved ? 'Salvo!' : 'Salvar configurações'}
      </button>
    </div>
  )
}
