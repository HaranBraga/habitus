import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, getUser, updateSettings, updateProfile, type UserSettings } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Settings, Save, Loader2, User } from 'lucide-react'
import { useState, useEffect } from 'react'

type Props = { userId: string }

export function SettingsPage({ userId }: Props) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['dashboard', userId], queryFn: () => getDashboard(userId) })
  const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: () => getUser(userId) })

  const [settingsForm, setSettingsForm] = useState<Partial<UserSettings & { weightGoalKg: string }>>({})
  const [profileForm, setProfileForm] = useState({ name: '', height: '', age: '' })
  const [savedSettings, setSavedSettings] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)

  useEffect(() => {
    if (data?.settings) {
      setSettingsForm({
        ...data.settings,
        weightGoalKg: data.settings.weightGoalKg != null ? String(data.settings.weightGoalKg) : '',
      })
    }
  }, [data?.settings])

  useEffect(() => {
    if (user) setProfileForm({ name: user.name, height: String(user.height), age: String(user.age) })
  }, [user])

  const settingsMutation = useMutation({
    mutationFn: () => updateSettings(userId, {
      ...settingsForm,
      weightGoalKg: settingsForm.weightGoalKg ? parseFloat(String(settingsForm.weightGoalKg)) : null,
    } as Partial<UserSettings>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      qc.invalidateQueries({ queryKey: ['weight-status', userId] })
      setSavedSettings(true)
      setTimeout(() => setSavedSettings(false), 2000)
    },
  })

  const profileMutation = useMutation({
    mutationFn: () => updateProfile(userId, {
      name: profileForm.name || undefined,
      height: profileForm.height ? parseFloat(profileForm.height) : undefined,
      age: profileForm.age ? parseInt(profileForm.age) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] })
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setSavedProfile(true)
      setTimeout(() => setSavedProfile(false), 2000)
    },
  })

  const inp = (
    label: string, value: string,
    onChange: (v: string) => void,
    opts: { type?: string; placeholder?: string; unit?: string; min?: number; max?: number; step?: number } = {}
  ) => (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {opts.unit && <p className="text-xs text-gray-600">{opts.unit}</p>}
      </div>
      <input type={opts.type ?? 'number'} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={opts.placeholder}
        min={opts.min} max={opts.max} step={opts.step ?? 1}
        className="w-24 text-right px-3 py-2 rounded-xl text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
    </div>
  )

  return (
    <div className="px-4 pt-12 pb-4 space-y-6">
      <PageHeader title="Configurações" Icon={Settings} iconColor="text-gray-400" />

      {/* Profile */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <User size={13} className="text-gray-600" />
          <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">Perfil</p>
        </div>
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
          <p className="text-sm font-medium text-white">Nome</p>
          <input type="text" value={profileForm.name}
            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
            className="w-36 text-right px-3 py-2 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
        </div>
        {inp('Idade', profileForm.age, v => setProfileForm(f => ({ ...f, age: v })), { unit: 'anos', min: 10, max: 100 })}
        {inp('Altura', profileForm.height, v => setProfileForm(f => ({ ...f, height: v })), { unit: 'cm', min: 100, max: 250 })}
        <button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: savedProfile ? '#10b981' : '#242434', color: savedProfile ? '#fff' : '#9d82fd', border: '1px solid #2a2a3a' }}>
          {profileMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {savedProfile ? 'Perfil salvo!' : 'Salvar perfil'}
        </button>
      </div>

      {/* Goals */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium px-1">Metas diárias</p>
        {inp('Água', String(settingsForm.waterGoalMl ?? ''), v => setSettingsForm(f => ({ ...f, waterGoalMl: parseInt(v) })), { unit: 'ml/dia', min: 500, max: 5000, step: 100 })}
        {inp('Atividade', String(settingsForm.activityGoalMinutes ?? ''), v => setSettingsForm(f => ({ ...f, activityGoalMinutes: parseInt(v) })), { unit: 'min/dia', min: 5, max: 240, step: 5 })}
        {inp('Leitura', String(settingsForm.readingGoalMinutes ?? ''), v => setSettingsForm(f => ({ ...f, readingGoalMinutes: parseInt(v) })), { unit: 'min/dia', min: 5, max: 240, step: 5 })}
        {inp('Inglês', String(settingsForm.englishGoalMinutes ?? ''), v => setSettingsForm(f => ({ ...f, englishGoalMinutes: parseInt(v) })), { unit: 'min/dia', min: 5, max: 120, step: 5 })}
      </div>

      {/* Weight goal */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium px-1">Meta de peso pessoal</p>
        <div className="px-4 py-3 rounded-xl space-y-2" style={{ background: '#1c1c28', border: '1px solid rgba(236,72,153,0.2)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Minha meta</p>
              <p className="text-xs text-gray-600">kg desejados (sua escolha)</p>
            </div>
            <input type="number" step="0.1" min="30" max="250"
              placeholder="ex: 72"
              value={settingsForm.weightGoalKg ?? ''}
              onChange={e => setSettingsForm(f => ({ ...f, weightGoalKg: e.target.value }))}
              className="w-24 text-right px-3 py-2 rounded-xl text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
              style={{ background: '#242434', border: '1px solid rgba(236,72,153,0.2)' }} />
          </div>
          {data?.user.height && (
            <p className="text-xs text-gray-700">
              Sistema sugere {(22 * Math.pow(data.user.height / 100, 2)).toFixed(1)}kg (IMC ideal para {data.user.height}cm)
            </p>
          )}
        </div>
      </div>

      {/* Reminders */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium px-1">Lembretes WhatsApp</p>
        {inp('Lembrete de água', String(settingsForm.waterReminderIntervalHours ?? ''), v => setSettingsForm(f => ({ ...f, waterReminderIntervalHours: parseInt(v) })), { unit: 'a cada X horas', min: 1, max: 12 })}
        {inp('Checagem de peso', String(settingsForm.weightCheckIntervalDays ?? ''), v => setSettingsForm(f => ({ ...f, weightCheckIntervalDays: parseInt(v) })), { unit: 'a cada X dias (oficial)', min: 1, max: 30 })}
      </div>

      <button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending}
        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
        style={{ background: savedSettings ? '#10b981' : '#7c5cfc', color: '#fff' }}>
        {settingsMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {savedSettings ? 'Metas salvas!' : 'Salvar metas e lembretes'}
      </button>
    </div>
  )
}
