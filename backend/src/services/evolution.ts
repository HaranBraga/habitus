import axios from 'axios'

const api = axios.create({
  baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  headers: {
    apikey: process.env.EVOLUTION_API_KEY || '',
  },
})

const INSTANCE = process.env.EVOLUTION_INSTANCE || 'habitus'

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  try {
    const number = phone.replace(/\D/g, '')
    await api.post(`/message/sendText/${INSTANCE}`, {
      number: `55${number}@s.whatsapp.net`,
      text: message,
    })
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err)
  }
}

export function buildWaterReminderMessage(name: string): string {
  return `💧 *Habitus – Lembrete de Hidratação*\n\nOi ${name}! Não se esqueça de beber água. Você ainda não registrou consumo nas últimas horas.\n\nAbra o app e marque! 🏆`
}

export function buildWeightReminderMessage(name: string, daysSince: number): string {
  return `⚖️ *Habitus – Hora de pesar!*\n\nOi ${name}! Já faz ${daysSince} dias desde o seu último registro de peso.\n\nAbra o app e registre seu peso de hoje! 💪`
}

export function buildDailySummaryMessage(
  name: string,
  data: {
    waterTotal: number
    waterGoal: number
    activityTotal: number
    englishStudied: boolean
    readingTotal: number
    streak: number
    points: number
  }
): string {
  const waterPercent = Math.round((data.waterTotal / data.waterGoal) * 100)
  const lines = [
    `🌅 *Habitus – Resumo do Dia*`,
    ``,
    `Oi ${name}! Veja como foi seu dia:`,
    ``,
    `💧 Água: ${data.waterTotal}ml / ${data.waterGoal}ml (${waterPercent}%)`,
    `🏃 Atividade: ${data.activityTotal} min`,
    `📚 Leitura: ${data.readingTotal} min`,
    `🇺🇸 Inglês: ${data.englishStudied ? '✅ Estudou' : '❌ Não estudou'}`,
    ``,
    `🔥 Sequência: ${data.streak} dia(s)`,
    `⭐ Pontos hoje: ${data.points}/100`,
  ]
  return lines.join('\n')
}
