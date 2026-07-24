import type {
  GoalDefinition,
  GoalPlayerState,
  GoalProgress,
  GoalProgressContext,
  GoalRequirement,
  GoalRuntimeState,
} from './types'

const measurableRequirement = (
  definition: GoalDefinition,
): Exclude<GoalRequirement, { type: 'goal-completed' }> | undefined =>
  definition.requirements.find(
    (
      requirement,
    ): requirement is Exclude<GoalRequirement, { type: 'goal-completed' }> =>
      requirement.type !== 'goal-completed',
  )

export const resolveRequirementProgress = (
  requirement: Exclude<GoalRequirement, { type: 'goal-completed' }>,
  context: GoalProgressContext,
): GoalProgress => {
  let actualValue: number = 0
  let target: number = 1

  switch (requirement.type) {
    case 'coins-earned':
    case 'packs-purchased':
    case 'packs-opened':
    case 'minigames-completed':
    case 'duplicates-exchanged':
      actualValue = context.counters[requirement.type] ?? 0
      target = requirement.target
      break
    case 'unique-cards-collected':
      actualValue = context.uniqueCardsCollected
      target = requirement.target
      break
    case 'stickers-prepared':
      actualValue = context.stickersPrepared
      target = requirement.target
      break
    case 'stickers-placed':
      actualValue = context.stickersPlaced
      target = requirement.target
      break
    case 'album-slots-filled':
      actualValue = context.albumSlotsFilled[requirement.albumId] ?? 0
      target = requirement.target
      break
    case 'album-progress':
      actualValue = context.albumProgress[requirement.albumId] ?? 0
      target = requirement.targetPercent
      break
    case 'album-page-filled':
      actualValue =
        context.albumPagesFilled[requirement.albumId]?.[requirement.pageId] ?? 0
      target = requirement.target
      break
    case 'rarity-collected':
      actualValue = context.rarityCollected[requirement.rarity] ?? 0
      target = requirement.target
      break
    case 'variant-collected':
      actualValue = context.variantsCollected
      target = requirement.target
      break
  }

  return {
    current: Math.min(Math.max(0, actualValue), target),
    target,
  }
}

export const resolveGoalProgress = (
  definition: GoalDefinition,
  context: GoalProgressContext,
): GoalProgress => {
  const requirement = measurableRequirement(definition)
  return requirement
    ? resolveRequirementProgress(requirement, context)
    : { current: 0, target: 1 }
}

export const resolveGoalRuntimeState = (
  definition: GoalDefinition,
  context: GoalProgressContext,
  playerStates: ReadonlyMap<string, GoalPlayerState>,
): GoalRuntimeState => {
  const saved = playerStates.get(definition.id)
  const dependenciesMet = definition.requirements
    .filter(
      (requirement): requirement is Extract<GoalRequirement, { type: 'goal-completed' }> =>
        requirement.type === 'goal-completed',
    )
    .every((requirement): boolean => {
      const dependency = playerStates.get(requirement.goalId)
      return Boolean(dependency?.completedAt || dependency?.claimedAt)
    })
  const progress = resolveGoalProgress(definition, context)
  const isComplete = progress.current >= progress.target
  const status = saved?.claimedAt
    ? 'claimed'
    : saved?.completedAt || (dependenciesMet && isComplete)
      ? 'completed'
      : dependenciesMet
        ? 'active'
        : 'locked'

  return {
    definition,
    status,
    progress,
    isRewardAvailable: status === 'completed',
  }
}

export const resolveGoals = (
  definitions: GoalDefinition[],
  context: GoalProgressContext,
  playerStates: GoalPlayerState[],
): GoalRuntimeState[] => {
  const stateMap = new Map(
    playerStates.map((state): [string, GoalPlayerState] => [state.goalId, state]),
  )
  const result: GoalRuntimeState[] = []

  // Последовательный проход позволяет вычисляемому завершению открыть следующую ступень.
  for (const definition of [...definitions].sort((a, b): number => a.order - b.order)) {
    const runtime = resolveGoalRuntimeState(definition, context, stateMap)
    result.push(runtime)
    if (
      runtime.status === 'completed' &&
      !stateMap.get(definition.id)?.completedAt
    ) {
      stateMap.set(definition.id, { goalId: definition.id, completedAt: 1 })
    }
  }
  return result
}
