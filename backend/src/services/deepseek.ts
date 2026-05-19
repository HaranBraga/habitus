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
      max_tokens: 800,
    })
    return res.data.choices[0].message.content as string
  } catch {
    return 'Análise indisponível no momento.'
  }
}

export async function analyzeUserProgress(data: {
  name: string
  weightHistory: { weight: number; loggedAt: string }[]
  waterAvg7d: number
  waterGoal: number
  activityAvg7d: number
  activityGoal: number
  readingAvg7d: number
  englishDays7d: number
  streak: number
  totalPoints: number
}): Promise<string> {
  const system = `Você é um coach de saúde e produtividade pessoal. Analise os dados do usuário e forneça insights práticos, encorajadores e personalizados em português. Seja direto, use no máximo 4 parágrafos curtos.`

  const weightTrend =
    data.weightHistory.length >= 2
      ? `${data.weightHistory[0].weight}kg (atual) vs ${data.weightHistory[data.weightHistory.length - 1].weight}kg (início)`
      : data.weightHistory.length === 1
      ? `${data.weightHistory[0].weight}kg`
      : 'sem registros'

  const msg = `
Usuário: ${data.name}
Peso: ${weightTrend}
Água (média 7 dias): ${data.waterAvg7d}ml / meta ${data.waterGoal}ml
Atividade física (média 7 dias): ${data.activityAvg7d}min / meta ${data.activityGoal}min
Leitura (média 7 dias): ${data.readingAvg7d}min
Inglês (últimos 7 dias): ${data.englishDays7d}/7 dias
Sequência atual: ${data.streak} dias
Pontos acumulados: ${data.totalPoints}

Faça uma análise de evolução destacando: pontos positivos, área que precisa mais atenção, e 1 dica específica para a semana.`

  return askDeepSeek(system, msg)
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
