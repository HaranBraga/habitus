import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

export type User = {
  id: string
  name: string
  phone: string
  height: number
  createdAt: string
  settings: UserSettings | null
}

export type UserSettings = {
  waterGoalMl: number
  waterReminderIntervalHours: number
  weightCheckIntervalDays: number
  activityGoalMinutes: number
  readingGoalMinutes: number
}

export type DashboardData = {
  user: { id: string; name: string; height: number }
  settings: UserSettings
  today: {
    water: { total: number; goal: number; logs: { id: string; amountMl: number; loggedAt: string }[] }
    activity: { total: number; goal: number; logs: { id: string; durationMinutes: number; description?: string; loggedAt: string }[] }
    reading: { total: number; goal: number; logs: { id: string; durationMinutes: number; loggedAt: string }[] }
    english: { studied: boolean; log: { id: string; durationMinutes?: number } | null }
  }
  weight: { latest: number | null; loggedAt: string | null; due: boolean; daysAgo: number | null }
  gamification: { streak: number; points: number }
}

// Users
export const getUsers = () => api.get<User[]>('/users').then((r) => r.data)
export const createUser = (data: { name: string; phone: string; height: number }) =>
  api.post<User>('/users', data).then((r) => r.data)

// Dashboard
export const getDashboard = (userId: string) =>
  api.get<DashboardData>(`/dashboard/${userId}`).then((r) => r.data)

// Water
export const logWater = (userId: string, amountMl: number) =>
  api.post(`/water/${userId}`, { amountMl }).then((r) => r.data)
export const deleteWaterLog = (logId: string) =>
  api.delete(`/water/${logId}`)

// Weight
export const logWeight = (userId: string, weight: number) =>
  api.post(`/weight/${userId}`, { weight }).then((r) => r.data)
export const getWeightHistory = (userId: string) =>
  api.get<{ id: string; weight: number; loggedAt: string }[]>(`/weight/${userId}/history`).then((r) => r.data)

// Activity
export const logActivity = (userId: string, data: { durationMinutes: number; description?: string }) =>
  api.post(`/activity/${userId}`, data).then((r) => r.data)

// Reading
export const logReading = (userId: string, durationMinutes: number) =>
  api.post(`/reading/${userId}`, { durationMinutes }).then((r) => r.data)

// English
export const logEnglish = (userId: string, data: { studied: boolean; durationMinutes?: number }) =>
  api.post(`/english/${userId}`, data).then((r) => r.data)

// Settings
export const updateSettings = (userId: string, data: Partial<UserSettings>) =>
  api.put(`/settings/${userId}`, data).then((r) => r.data)
