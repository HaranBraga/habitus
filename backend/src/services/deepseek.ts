import axios from 'axios'

const client = axios.create({
  baseURL: 'https://api.deepseek.com',
  headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  timeout: 30000,
})

export async function askDeepSeek(systemPrompt: string, userMessage: string): Promise<string> {
  if (!process.env.DEEPSEEK_API_KEY) return 'API key não configurada.'
  try {
    const res = await client.post('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 900,
    })
    return res.data.choices[0].message.content as string
  } catch {
    return 'Análise indisponível no momento.'
  }
}

export type AnalysisInput = {
  name: string
  weightHistory: { weight: number; loggedAt: string }[]
  latestWeight: number | null
  targetWeight: number
  distanceToGoal: number | null
  waterAvg7d: number
  waterGoal: number
  activityAvg7d: number
  activityGoal: number
  readingAvg7d: number
  readingGoal: number
  englishDays7d: number
  streak: number
  level: number
  levelName: string
  monthlyPoints: number
  totalPoints: number
  groupTasksCompletedToday: number
  groupTasksTotalToday: number
}

export type AnalysisSection = { title: string; body: string }

const SECTION_TITLES = ['RESUMO DA SEMANA', 'PONTO FORTE', 'PRECISA DE ATENÇÃO', 'DICA PARA A PRÓXIMA SEMANA']

// Splits the model's reply into the sections we asked it to use, so the frontend can render
// distinct cards instead of one undifferentiated block of text.
export function parseAnalysisSections(text: string): AnalysisSection[] {
  const titlesPattern = SECTION_TITLES.join('|')
  const pattern = new RegExp(`(${titlesPattern})\\s*\\n([\\s\\S]*?)(?=\\n(?:${titlesPattern})\\s*\\n|$)`, 'g')
  const sections: AnalysisSection[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const body = match[2].trim()
    if (body) sections.push({ title: match[1].trim(), body })
  }
  return sections
}

export async function analyzeUserProgress(data: AnalysisInput): Promise<{ analysis: string; sections: AnalysisSection[] }> {
  const system = `Você é um coach de saúde e produtividade pessoal, direto e encorajador. Responda sempre em português, em texto simples (sem markdown, sem asteriscos, sem emojis), citando números concretos dos dados fornecidos. Use EXATAMENTE esta estrutura, com cada título em uma linha própria, em maiúsculas, seguido pelo conteúdo:

RESUMO DA SEMANA
2-3 frases sobre o progresso geral.

PONTO FORTE
1-2 frases destacando o que está indo bem, citando um número.

PRECISA DE ATENÇÃO
1-2 frases sobre a área mais fraca, citando um número e explicando por que importa.

DICA PARA A PRÓXIMA SEMANA
1 dica prática, específica e mensurável para os próximos 7 dias.`

  const weightTrend =
    data.weightHistory.length >= 2
      ? `${data.weightHistory[0].weight}kg (atual) vs ${data.weightHistory[data.weightHistory.length - 1].weight}kg (30 dias atrás)`
      : data.weightHistory.length === 1
      ? `${data.weightHistory[0].weight}kg`
      : 'sem registros'

  const distanceLine =
    data.distanceToGoal === null
      ? ''
      : data.distanceToGoal === 0
      ? 'no peso ideal'
      : `${data.distanceToGoal > 0 ? '+' : ''}${data.distanceToGoal}kg em relação à meta`

  const msg = `
Usuário: ${data.name}
Nível ${data.level} (${data.levelName}) — ${data.totalPoints} pontos no total, ${data.monthlyPoints} pontos neste mês
Sequência (streak) atual: ${data.streak} dias consecutivos

Peso (últimos 30 dias): ${weightTrend}
Meta de peso: ${data.targetWeight}kg${distanceLine ? ` (${distanceLine})` : ''}

Água — média 7 dias: ${data.waterAvg7d}ml / meta diária ${data.waterGoal}ml
Atividade física — média 7 dias: ${data.activityAvg7d}min / meta diária ${data.activityGoal}min
Leitura — média 7 dias: ${data.readingAvg7d}min / meta diária ${data.readingGoal}min
Inglês — dias estudados na última semana: ${data.englishDays7d}/7
Tarefas em grupo hoje: ${data.groupTasksCompletedToday}/${data.groupTasksTotalToday}

Analise a evolução real do usuário com base nesses dados, seguindo a estrutura pedida.`

  const raw = await askDeepSeek(system, msg)
  return { analysis: raw, sections: parseAnalysisSections(raw) }
}

export async function generateSmartWaterMessage(
  name: string,
  currentMl: number,
  goalMl: number,
  hour: number
): Promise<string> {
  const system = `Você é um assistente de saúde amigável e motivacional. Escreva mensagens de lembrete de água curtas (2-3 linhas) em português, diretas e encorajadoras. Não use mais de 3 emojis por mensagem.`

  const pct = Math.round((currentMl / goalMl) * 100)
  const remaining = goalMl - currentMl

  const msg = `
Nome: ${name}
Hora do dia: ${hour}h
Água consumida: ${currentMl}ml (${pct}% da meta de ${goalMl}ml)
Faltam: ${remaining}ml para a meta

Escreva um lembrete personalizado para esta situação específica.`

  return askDeepSeek(system, msg)
}
