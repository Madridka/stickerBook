import { computed, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type BlisterCooldown } from '@/db/database'
import { CLOCK_CONFIG } from '@/config/runtimeConfig'
import { getPlayerBlisterById } from '@/data/albumRegistry'
import { resolveBlisterCooldownEnd } from '@/utils/blisterCooldown'

export const useBlistersStore = defineStore('blisters', () => {
  const cooldowns: Ref<Record<string, number>> = ref({})
  const now: Ref<number> = ref(Date.now())
  const isLoaded: Ref<boolean> = ref(false)
  const timer: ReturnType<typeof setInterval> = setInterval((): void => {
    now.value = Date.now()
  }, CLOCK_CONFIG.refreshIntervalMs)

  const load = async (): Promise<void> => {
    const stored: BlisterCooldown[] = await database.blisterCooldowns.toArray()
    const timestamp: number = Date.now()
    const normalized: BlisterCooldown[] = stored.map((cooldown): BlisterCooldown => {
      const cooldownMs: number = getPlayerBlisterById(cooldown.id)?.cooldownMs ?? 0
      const startedAt: number = cooldown.startedAt ?? Math.min(timestamp, cooldown.nextAvailableAt)
      return {
        ...cooldown,
        startedAt,
        nextAvailableAt: resolveBlisterCooldownEnd(
          { ...cooldown, startedAt },
          cooldownMs,
          timestamp,
        ),
      }
    })
    if (normalized.length > 0) await database.blisterCooldowns.bulkPut(normalized)
    cooldowns.value = Object.fromEntries(
      normalized.map(({ id, nextAvailableAt }): [string, number] => [id, nextAvailableAt]),
    )
    now.value = timestamp
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
