import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, updateSettings, type UserSettings } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Save, Loader2, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

type Props = { userId: string }

export function SettingsPage({ userId }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })
  const [form, setForm] = useState<Partial<UserSettings>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data?.settings) setForm(data.settings)
  }, [data])

  const mutation = useMutation({
    mutationFn: () => updateSettings(userId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const handleLogout = () => {
    localStorage.removeItem('habitus_user_id')
    window.location.reload()
  }

  if (isLoading || !data) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-primary" size={28} /></div>

  const field = (label: string, key: keyof UserSettings, unit: string, min: number, max: number, step = 1) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-400">{unit}</span>
      </div>
      <input
        type="number"
        value={(form[key] as number) ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) }))}
        min={min}
        max={max}
        step={step}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mt-1"
      />
    </div>
  )

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <PageHeader title="Configurações" subtitle={`Perfil: ${data.user.name}`} icon="⚙️" />

      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Metas diárias</p>
        {field('Meta de água', 'waterGoalMl', 'ml', 500, 5000, 100)}
        {field('Meta de atividade', 'activityGoalMinutes', 'min', 5, 240, 5)}
        {field('Meta de leitura', 'readingGoalMinutes', 'min', 5, 240, 5)}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lembretes</p>
        {field('Lembrete de água', 'waterReminderIntervalHours', 'horas', 1, 12)}
        {field('Checagem de peso', 'weightCheckIntervalDays', 'dias', 1, 30)}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className={`w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
          saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'
        } disabled:opacity-60`}
      >
        {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {saved ? 'Salvo!' : 'Salvar configurações'}
      </button>

      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-2xl font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut size={16} />
          Trocar de usuário
        </button>
      </div>
    </div>
  )
}
