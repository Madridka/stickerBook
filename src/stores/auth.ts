import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { AUTH_UI_CONFIG } from '@/config/runtimeConfig'
import { ApiError, apiRequest } from '@/services/api'
import { clearLocalGameData, cloudSave } from '@/services/cloudSave'

export interface AuthUser {
  id: string
  username: string
}

interface AuthResponse {
  user: AuthUser
}

const readCachedUser = (): AuthUser | null => {
  try {
    const raw: string | null = localStorage.getItem(AUTH_UI_CONFIG.authenticatedUserStorageKey)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const candidate = value as Partial<AuthUser>
    return typeof candidate.id === 'string' && typeof candidate.username === 'string'
      ? { id: candidate.id, username: candidate.username }
      : null
  } catch {
    return null
  }
}

const cacheUser = (value: AuthUser | null): void => {
  if (value) {
    localStorage.setItem(AUTH_UI_CONFIG.authenticatedUserStorageKey, JSON.stringify(value))
  } else {
    localStorage.removeItem(AUTH_UI_CONFIG.authenticatedUserStorageKey)
  }
}

export interface RegisterInput {
  username: string
  password: string
  migrateLocalProgress: boolean
}

export interface LoginInput {
  username: string
  password: string
}

export const useAuthStore = defineStore('auth', () => {
  const user: Ref<AuthUser | null> = ref(null)
  const isGuest: Ref<boolean> = ref(false)
  const isInitializing: Ref<boolean> = ref(true)
  const isSubmitting: Ref<boolean> = ref(false)
  const errorCode: Ref<string | null> = ref(null)

  const initialize = async (): Promise<void> => {
    isInitializing.value = true
    errorCode.value = null
    if (localStorage.getItem(AUTH_UI_CONFIG.guestModeStorageKey) === 'true') {
      cloudSave.stop()
      user.value = null
      isGuest.value = true
      isInitializing.value = false
      return
    }
    // Новый игрок сразу попадает в игру; сетевой вход остаётся осознанным действием в профиле.
    if (!readCachedUser()) {
      cloudSave.stop()
      user.value = null
      isGuest.value = true
      localStorage.setItem(AUTH_UI_CONFIG.guestModeStorageKey, 'true')
      isInitializing.value = false
      return
    }
    try {
      const response: AuthResponse = await apiRequest('/api/auth/session')
      try {
        // Если первый upload аккаунта прервался, локальный прогресс остаётся источником
        // изменений и будет догружен при восстановлении соединения.
        await cloudSave.initialize(response.user.id, true)
      } catch {
        await cloudSave.initializeOffline(response.user.id)
        errorCode.value = 'server-unavailable'
      }
      cacheUser(response.user)
      user.value = response.user
      isGuest.value = false
      localStorage.removeItem(AUTH_UI_CONFIG.guestModeStorageKey)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        cacheUser(null)
        user.value = null
        isGuest.value = true
        localStorage.setItem(AUTH_UI_CONFIG.guestModeStorageKey, 'true')
        cloudSave.stop()
      } else {
        const cachedUser: AuthUser | null = readCachedUser()
        if (cachedUser) {
          await cloudSave.initializeOffline(cachedUser.id)
          user.value = cachedUser
          isGuest.value = false
        } else {
          user.value = null
          isGuest.value = true
          localStorage.setItem(AUTH_UI_CONFIG.guestModeStorageKey, 'true')
          cloudSave.stop()
        }
        errorCode.value = 'server-unavailable'
      }
    } finally {
      isInitializing.value = false
    }
  }

  const register = async (input: RegisterInput): Promise<boolean> => {
    isSubmitting.value = true
    errorCode.value = null
    try {
      const response: AuthResponse = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: input.username,
          password: input.password,
        }),
      })
      try {
        await cloudSave.initialize(response.user.id, input.migrateLocalProgress)
      } catch {
        await cloudSave.initializeOffline(response.user.id)
        errorCode.value = 'server-unavailable'
      }
      user.value = response.user
      isGuest.value = false
      cacheUser(response.user)
      localStorage.removeItem(AUTH_UI_CONFIG.guestModeStorageKey)
      return true
    } catch (error: unknown) {
      errorCode.value = error instanceof ApiError ? (error.body.code ?? 'request-failed') : 'server-unavailable'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const login = async (input: LoginInput): Promise<boolean> => {
    isSubmitting.value = true
    errorCode.value = null
    try {
      const response: AuthResponse = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      try {
        await cloudSave.initialize(response.user.id, false)
      } catch {
        await cloudSave.initializeOffline(response.user.id)
        errorCode.value = 'server-unavailable'
      }
      user.value = response.user
      isGuest.value = false
      cacheUser(response.user)
      localStorage.removeItem(AUTH_UI_CONFIG.guestModeStorageKey)
      return true
    } catch (error: unknown) {
      errorCode.value = error instanceof ApiError ? (error.body.code ?? 'request-failed') : 'server-unavailable'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const logout = async (): Promise<void> => {
    isSubmitting.value = true
    errorCode.value = null
    try {
      await cloudSave.flush()
      cloudSave.stop()
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      cacheUser(null)
      await clearLocalGameData()
      window.location.reload()
    } catch (error: unknown) {
      errorCode.value = error instanceof ApiError ? (error.body.code ?? 'request-failed') : 'server-unavailable'
      isSubmitting.value = false
    }
  }

  const startGuest = (): void => {
    cloudSave.stop()
    cacheUser(null)
    errorCode.value = null
    user.value = null
    isGuest.value = true
    localStorage.setItem(AUTH_UI_CONFIG.guestModeStorageKey, 'true')
  }

  const exitGuest = (): void => {
    cloudSave.stop()
    isGuest.value = false
    localStorage.removeItem(AUTH_UI_CONFIG.guestModeStorageKey)
  }

  return {
    user,
    isGuest,
    isInitializing,
    isSubmitting,
    errorCode,
    initialize,
    register,
    login,
    logout,
    startGuest,
    exitGuest,
  }
})
