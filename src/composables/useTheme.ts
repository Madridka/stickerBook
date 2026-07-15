import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue'

export type ThemeName = 'default' | 'emerald-pink'

export interface ThemeControls {
  theme: Ref<ThemeName>
  isEmeraldPink: ComputedRef<boolean>
  toggleTheme: () => void
}

const THEME_STORAGE_KEY: string = 'sticker-book-theme'

const applyTheme = (theme: ThemeName): void => {
  if (theme === 'default') {
    document.documentElement.removeAttribute('data-theme')
    return
  }

  document.documentElement.dataset.theme = theme
}

export const useTheme = (): ThemeControls => {
  const theme: Ref<ThemeName> = ref<ThemeName>('default')
  const isEmeraldPink: ComputedRef<boolean> = computed(
    (): boolean => theme.value === 'emerald-pink',
  )
  const toggleTheme: () => void = (): void => {
    theme.value = isEmeraldPink.value ? 'default' : 'emerald-pink'
    applyTheme(theme.value)
    localStorage.setItem(THEME_STORAGE_KEY, theme.value)
  }

  // Восстанавливает выбранную пользователем тему после загрузки приложения
  onMounted((): void => {
    const savedTheme: string | null = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'emerald-pink') {
      theme.value = savedTheme
    }
    applyTheme(theme.value)
  })

  return { theme, isEmeraldPink, toggleTheme }
}
