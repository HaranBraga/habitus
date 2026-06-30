import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getAnalysis, type AnalysisResult } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { BrainCircuit, Sparkles, Loader2, TrendingUp, ThumbsUp, AlertTriangle, Lightbulb, Scale, Droplets } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Props = { userId: string }

const SECTION_META: Record<string, { Icon: typeof Sparkles; color: string }> = {
  'RESUMO DA SEMANA': { Icon: Sparkles, color: '#3b82f6' },
  'PONTO FORTE': { Icon: ThumbsUp, color: '#10b981' },
  'PRECISA DE ATENÇÃO': { Icon: AlertTriangle, color: '#f59e0b' },
  'DICA PARA A PRÓXIMA SEMANA': { Icon: Lightbulb, color: '#7c5cfc' },
}

export function AnalysisPage({ userId }: Props) {
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const mutation = useMutation({
    mutationFn: () => getAnalysis(userId),
    onSuccess: setResult,
  })

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Análise IA" subtitle="Insights personalizados com DeepSeek" Icon={BrainCircuit} iconColor="text-blue-400" />

      {!result ? (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: '#1c1c28', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Sparkles size={18} className="text-blue-400" strokeWidth={2} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Análise de evolução</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  A IA vai analisar seu nível, pontos, peso, hidratação, atividade física, leitura, inglês e tarefas em grupo para gerar um relatório estruturado com pontos fortes, áreas de atenção e uma dica para a semana.
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #7c5cfc)' }}>
            {mutation.isPending
              ? <><Loader2 size={18} className="animate-spin" /> Analisando...</>
              : <><BrainCircuit size={18} /> Gerar análise</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const weightData = [...result.data.weightHistory].reverse().map((w) => ({
              date: new Date(w.loggedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              peso: w.weight,
            }))
            const trendData = result.data.dailyTrend.map((d) => ({
              date: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              água: d.water,
              atividade: d.activity,
              leitura: d.reading,
              inglês: d.english,
            }))
            return (
              <>
                {weightData.length >= 2 && (
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                    <div className="flex items-center gap-2">
                      <Scale size={14} className="text-pink-400" />
                      <span className="text-xs text-gray-600 font-medium uppercase tracking-wide">Evolução do peso</span>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={weightData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={32} />
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

                <div className="rounded-2xl p-4 space-y-2" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                  <div className="flex items-center gap-2">
                    <Droplets size={14} className="text-blue-400" />
                    <span className="text-xs text-gray-600 font-medium uppercase tracking-wide">Últimos 7 dias</span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        contentStyle={{ background: '#1c1c28', border: '1px solid #2a2a3a', borderRadius: 12, color: '#fff' }}
                        labelStyle={{ color: '#9090b0', fontSize: 11 }}
                      />
                      <Bar dataKey="água" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="atividade" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="leitura" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="inglês" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-3 pt-1 flex-wrap">
                    {[
                      { label: 'Água (ml)', color: '#3b82f6' },
                      { label: 'Atividade (min)', color: '#10b981' },
                      { label: 'Leitura (min)', color: '#8b5cf6' },
                      { label: 'Inglês (min)', color: '#f59e0b' },
                    ].map(({ label, color }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs text-gray-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          })()}

          {result.sections.length > 0 ? (
            result.sections.map(({ title, body }) => {
              const meta = SECTION_META[title] ?? { Icon: Sparkles, color: '#3b82f6' }
              const { Icon, color } = meta
              return (
                <div key={title} className="rounded-2xl p-5 space-y-2"
                  style={{ background: '#1c1c28', border: `1px solid ${color}30` }}>
                  <div className="flex items-center gap-2">
                    <Icon size={15} style={{ color }} />
                    <span className="text-sm font-semibold" style={{ color }}>{title}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{body}</p>
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl p-5 space-y-3"
              style={{ background: '#1c1c28', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={15} className="text-blue-400" />
                <span className="text-sm font-semibold text-blue-400">Análise da IA</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{result.analysis}</p>
            </div>
          )}

          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-gray-500" />
              <span className="text-xs text-gray-600 font-medium uppercase tracking-wide">Resumo dos dados</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Nível', value: `${result.data.level} · ${result.data.levelName}` },
                { label: 'Pontos no mês', value: `${result.data.monthlyPoints}` },
                { label: 'Sequência', value: `${result.data.streak} dias` },
                { label: 'Meta de peso', value: result.data.distanceToGoal === null ? '—' : result.data.distanceToGoal === 0 ? 'no alvo' : `${result.data.distanceToGoal > 0 ? '+' : ''}${result.data.distanceToGoal}kg` },
                { label: 'Água média (7d)', value: `${result.data.waterAvg7d}ml` },
                { label: 'Atividade média (7d)', value: `${result.data.activityAvg7d}min` },
                { label: 'Leitura média (7d)', value: `${result.data.readingAvg7d}min` },
                { label: 'Inglês (7d)', value: `${result.data.englishDays7d}/7 dias` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: '#242434' }}>
                  <p className="text-xs text-gray-600">{label}</p>
                  <p className="font-bold text-white text-sm mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setResult(null)}
            className="w-full py-3 rounded-2xl text-sm font-medium text-gray-500 transition-all"
            style={{ border: '1px solid #2a2a3a' }}>
            Nova análise
          </button>
        </div>
      )}
    </div>
  )
}
