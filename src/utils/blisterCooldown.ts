import type { BlisterCooldown } from '@/db/database'

/**
 * Вычисляет окончание кулдауна из времени его запуска и текущей конфигурации.
 * Благодаря этому изменение баланса в gameBalance применяется и к уже начатому кулдауну.
 */
export const resolveBlisterCooldownEnd = (
  cooldown: BlisterCooldown,
  cooldownMs: number,
  now: number = Date.now(),
): number => {
  if (cooldownMs <= 0) return 0
  const startedAt: number = cooldown.startedAt ?? Math.min(now, cooldown.nextAvailableAt)
  return startedAt + cooldownMs
}
