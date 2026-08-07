import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
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
  const isInitializing: Ref<boolean> = ref(true)
  const isSubmitting: Ref<boolean> = ref(false)
  const errorCode: Ref<string | null> = ref(null)

  const initialize = async (): Promise<void> => {
    isInitializing.value = true
    errorCode.value = null
    try {
      const response: AuthResponse = await apiRequest('/api/auth/session')
      // Если аккаунт был создан, но его первый upload прервался, не удаляем исходный Dexie.
      await cloudSave.initialize(true)
      user.value = response.user
    } catch (error: unknown) {
      if (!(error instanceof ApiError && error.status === 401)) errorCode.value = 'server-unavailable'
      user.value = null
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

  return {
    user,
    isInitializing,
    isSubmitting,
    errorCode,
    initialize,
    register,
    login,
    logout,
  }
})
