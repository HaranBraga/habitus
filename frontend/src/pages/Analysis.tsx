import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getAnalysis } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { BrainCircuit, Sparkles, Loader2, TrendingUp } from 'lucide-react'

type Props = { userId: string }

export function AnalysisPage({ userId }: Props) {
  const [result, setResult] = useState<{ analysis: string; data: Record<string, unknown> } | null>(null)

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
                  A IA vai analisar seu peso, hidratação, atividade física, leitura e inglês dos últimos 30 dias e gerar recomendações personalizadas.
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
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: '#1c1c28', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={15} className="text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">Análise da IA</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{result.analysis}</p>
          </div>

          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-gray-500" />
              <span className="text-xs text-gray-600 font-medium uppercase tracking-wide">Dados (últimos 7 dias)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Água média', value: `${result.data.waterAvg7d}ml` },
                { label: 'Atividade média', value: `${result.data.activityAvg7d}min` },
                { label: 'Leitura média', value: `${result.data.readingAvg7d}min` },
                { label: 'Inglês', value: `${result.data.englishDays7d}/7 dias` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: '#242434' }}>
                  <p className="text-xs text-gray-600">{label}</p>
                  <p className="font-bold text-white text-sm mt-0.5">{String(value)}</p>
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
