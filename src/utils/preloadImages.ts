const pendingImages: Map<string, Promise<boolean>> = new Map()

export const preloadImage = (src: string, highPriority: boolean = false): Promise<boolean> => {
  if (!src || typeof Image === 'undefined') return Promise.resolve(false)

  const pending: Promise<boolean> | undefined = pendingImages.get(src)
  if (pending) return pending

  const request: Promise<boolean> = new Promise((resolve): void => {
    const image = new Image()
    image.decoding = 'async'
    image.loading = 'eager'
    image.fetchPriority = highPriority ? 'high' : 'auto'
    image.onload = (): void => {
      if (typeof image.decode !== 'function') {
        resolve(true)
        return
      }
      void image.decode().then(
        (): void => resolve(true),
        (): void => resolve(true),
      )
    }
    image.onerror = (): void => {
      pendingImages.delete(src)
      resolve(false)
    }
    image.src = src
  })

  pendingImages.set(src, request)
  return request
}

export const preloadImages = (sources: readonly string[], highPriority: boolean = false): void => {
  Array.from(new Set(sources.filter(Boolean))).forEach((src: string): void => {
    void preloadImage(src, highPriority)
  })
}
