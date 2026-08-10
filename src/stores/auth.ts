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
    try {
      const response: AuthResponse = await apiRequest('/api/auth/session')
      // Если аккаунт был создан, но его первый upload прервался, не удаляем исходный Dexie.
      await cloudSave.initialize(true)
      user.value = response.user
      isGuest.value = false
      localStorage.removeItem(AUTH_UI_CONFIG.guestModeStorageKey)
    } catch (error: unknown) {
      if (!(error instanceof ApiError && error.status === 401)) errorCode.value = 'server-unavailable'
      user.value = null
      isGuest.value = localStorage.getItem(AUTH_UI_CONFIG.guestModeStorageKey) === 'true'
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
      await cloudSave.initialize(input.migrateLocalProgress)
      user.value = response.user
      isGuest.value = false
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
      await cloudSave.initialize(false)
      user.value = response.user
      isGuest.value = false
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
      await clearLocalGameData()
      window.location.reload()
    } catch (error: unknown) {
      errorCode.value = error instanceof ApiError ? (error.body.code ?? 'request-failed') : 'server-unavailable'
      isSubmitting.value = false
    }
  }

  const startGuest = (): void => {
    cloudSave.stop()
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
