export const GOALS_CHANGED_EVENT = 'stickerbook:goals-changed'

export const notifyGoalsChanged = (): void => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(GOALS_CHANGED_EVENT))
}
