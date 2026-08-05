type NearViewportCallback = () => void

const callbacks: WeakMap<Element, NearViewportCallback> = new WeakMap()
let observer: IntersectionObserver | undefined

const getObserver = (): IntersectionObserver | undefined => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined
  if (observer) return observer

  observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]): void => {
      entries.forEach((entry: IntersectionObserverEntry): void => {
        if (!entry.isIntersecting) return
        const callback: NearViewportCallback | undefined = callbacks.get(entry.target)
        if (!callback) return
        callbacks.delete(entry.target)
        observer?.unobserve(entry.target)
        callback()
      })
    },
    { rootMargin: '600px 0px' },
  )

  return observer
}

// Uses one observer for every image so a large collection does not allocate
// hundreds of observers or start hundreds of skeleton animations at once.
export const observeNearViewport = (
  element: Element,
  callback: NearViewportCallback,
): (() => void) => {
  const viewportObserver: IntersectionObserver | undefined = getObserver()
  if (!viewportObserver) {
    callback()
    return (): void => undefined
  }

  callbacks.set(element, callback)
  viewportObserver.observe(element)

  return (): void => {
    callbacks.delete(element)
    viewportObserver.unobserve(element)
  }
}
