import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

export type User = {
  id: string; name: string; phone: string; height: number
  age: number; isAdmin: boolean; createdAt: string
  settings: UserSettings | null
  weightGoal?: { min: number; ideal: number; max: number }
}
export type UserSettings = {
  waterGoalMl: number; waterReminderIntervalHours: number
  weightCheckIntervalDays: number; activityGoalMinutes: number
  readingGoalMinutes: number; englishGoalMinutes: number
  weightGoalKg: number | null
}
export type DashboardData = {
  user: { id: string; name: string; height: number }
  settings: UserSettings
  today: {
    water: { total: number; goal: number; logs: { id: string; amountMl: number; loggedAt: string }[] }
    activity: { total: number; goal: number; logs: { id: string; durationMinutes: number; description?: string; loggedAt: string }[] }
    reading: { total: number; goal: number; logs: { id: string; durationMinutes: number; loggedAt: string }[] }
    english: { total: number; goal: number; logs: { id: string; durationMinutes: number; loggedAt: string }[] }
  }
  weight: { latest: number | null; loggedAt: string | null; due: boolean; daysAgo: number | null }
  gamification: { streak: number; points: number }
}
export type WeightLog = {
  id: string; weight: number; isOfficial: boolean; loggedAt: string
}
export type WeightStatus = {
  latest: number | null; latestAt: string | null
  lastOfficial: number | null; lastOfficialAt: string | null
  due: boolean; daysAgo: number | null; daysUntilNext: number
  intervalDays: number
  goal: { min: number; ideal: number; max: number } | null
  personalGoalKg: number | null
}
export type RankingUser = {
  userId: string; name: string; isAdmin: boolean
  todayPoints: number; monthlyPoints: number; streak: number
  days: { date: string; points: number }[]
  level: number; levelName: string; totalPoints: number
  today: {
    water: { total: number; goal: number }
    activity: { total: number; goal: number }
    reading: { total: number; goal: number }
    english: { total: number; goal: number }
    groupTasksCompleted: number; groupTasksTotal: number
  }
  latestWeight: number | null
}
export type EvolutionData = {
  months: { month: string; monthlyPoints: number; days: { date: string; points: number }[] }[]
  weightHistory: { id: string; weight: number; isOfficial: boolean; loggedAt: string }[]
}
export type GroupTask = {
  id: string; title: string; description?: string
  pointValue: number; color: string; active: boolean
  completedToday?: boolean
}

// Users
export const getUsers = () => api.get<User[]>('/users').then(r => r.data)
export const createUser = (d: { name: string; phone: string; height: number; age: number }) =>
  api.post<User>('/users', d).then(r => r.data)
export const getUser = (id: string) => api.get<User>(`/users/${id}`).then(r => r.data)

// Dashboard
export const getDashboard = (userId: string) =>
  api.get<DashboardData>(`/dashboard/${userId}`).then(r => r.data)

// Water
export const logWater = (userId: string, amountMl: number, loggedAt?: string) =>
  api.post(`/water/${userId}`, { amountMl, loggedAt }).then(r => r.data)
export const deleteWaterLog = (logId: string) => api.delete(`/water/${logId}`)

// Weight
export const logWeight = (userId: string, weight: number, loggedAt?: string) =>
  api.post<{ isOfficial: boolean; newWaterGoal: number | null; weightPoints: { points: number; reason: string } | null }>(`/weight/${userId}`, { weight, loggedAt }).then(r => r.data)
export const getWeightHistory = (userId: string) =>
  api.get<WeightLog[]>(`/weight/${userId}/history`).then(r => r.data)
export const getWeightOfficial = (userId: string) =>
  api.get<WeightLog[]>(`/weight/${userId}/official`).then(r => r.data)
export const getWeightGoal = (userId: string) =>
  api.get<{ min: number; ideal: number; max: number }>(`/weight/${userId}/goal`).then(r => r.data)
export const getWeightStatus = (userId: string) =>
  api.get<WeightStatus>(`/weight/${userId}/status`).then(r => r.data)

// Activity
export const logActivity = (userId: string, d: { durationMinutes: number; description?: string; loggedAt?: string }) =>
  api.post(`/activity/${userId}`, d).then(r => r.data)

// Reading
export const logReading = (userId: string, durationMinutes: number, loggedAt?: string) =>
  api.post(`/reading/${userId}`, { durationMinutes, loggedAt }).then(r => r.data)

// English
export const logEnglish = (userId: string, durationMinutes: number, loggedAt?: string) =>
  api.post(`/english/${userId}`, { durationMinutes, loggedAt }).then(r => r.data)

// Settings
export const updateSettings = (userId: string, d: Partial<UserSettings>) =>
  api.put(`/settings/${userId}`, d).then(r => r.data)
export const updateProfile = (userId: string, d: { name?: string; height?: number; age?: number }) =>
  api.put(`/settings/${userId}/profile`, d).then(r => r.data)

// Group Tasks
export const getGroupTasks = (userId: string) =>
  api.get<GroupTask[]>(`/grouptasks/today/${userId}`).then(r => r.data)
export const createGroupTask = (adminId: string, d: Partial<GroupTask>) =>
  api.post<GroupTask>('/grouptasks', { adminId, ...d }).then(r => r.data)
export const completeGroupTask = (taskId: string, userId: string) =>
  api.post(`/grouptasks/${taskId}/complete`, { userId }).then(r => r.data)
export const deleteGroupTask = (taskId: string, adminId: string) =>
  api.delete(`/grouptasks/${taskId}?adminId=${adminId}`)

// Ranking
export const getRankingDaily = () => api.get<RankingUser[]>('/ranking/daily').then(r => r.data)
export const getRankingMonthly = (month?: string) =>
  api.get<RankingUser[]>('/ranking/monthly', { params: month ? { month } : undefined }).then(r => r.data)
export const getEvolution = (userId: string, months = 6) =>
  api.get<EvolutionData>(`/ranking/${userId}/evolution`, { params: { months } }).then(r => r.data)

// Analysis
export type AnalysisSection = { title: string; body: string }
export type AnalysisResult = {
  analysis: string
  sections: AnalysisSection[]
  data: {
    waterAvg7d: number; activityAvg7d: number; readingAvg7d: number; englishDays7d: number
    weightHistory: { weight: number; loggedAt: string; isOfficial: boolean }[]
    dailyTrend: { date: string; water: number; activity: number; reading: number; english: number }[]
    streak: number; level: number; levelName: string; monthlyPoints: number; totalPoints: number
    targetWeight: number; distanceToGoal: number | null
    groupTasksCompletedToday: number; groupTasksTotalToday: number
  }
}
export const getAnalysis = (userId: string) =>
  api.get<AnalysisResult>(`/analysis/${userId}`).then(r => r.data)
