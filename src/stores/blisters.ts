import { computed, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type BlisterCooldown } from '@/db/database'

export const useBlistersStore = defineStore('blisters', () => {
  const cooldowns: Ref<Record<string, number>> = ref({})
  const now: Ref<number> = ref(Date.now())
  const isLoaded: Ref<boolean> = ref(false)
  const timer: ReturnType<typeof setInterval> = setInterval((): void => {
    now.value = Date.now()
  }, 1_000)

  const load = async (): Promise<void> => {
    const stored: BlisterCooldown[] = await database.blisterCooldowns.toArray()
    cooldowns.value = Object.fromEntries(
      stored.map(({ id, nextAvailableAt }): [string, number] => [id, nextAvailableAt]),
    )
    now.value = Date.now()
    isLoaded.value = true
  }

  const cooldownRemainingById: ComputedRef<Record<string, number>> = computed(() =>
    Object.fromEntries(
      Object.entries(cooldowns.value).map(([id, nextAvailableAt]): [string, number] => [
        id,
        Math.max(0, nextAvailableAt - now.value),
      ]),
    ),
  )
  const getCooldownRemainingMs = (blisterId: string): number =>
    cooldownRemainingById.value[blisterId] ?? 0

  onScopeDispose((): void => clearInterval(timer))
  void load()

  return { cooldowns, cooldownRemainingById, isLoaded, getCooldownRemainingMs, load }
})

