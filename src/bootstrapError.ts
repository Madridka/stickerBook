const BOOTSTRAP_TIMEOUT_MS = 15_000

const getBootstrapRoot = (): HTMLElement | null => {
  const root: HTMLElement | null = document.querySelector<HTMLElement>('#app')
  return root?.querySelector('.app-bootstrap') ? root : null
}

const getErrorMessage = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message
  return typeof reason === 'string' ? reason : 'Неизвестная ошибка запуска'
}

const showBootstrapError = (reason: unknown): void => {
  const root: HTMLElement | null = getBootstrapRoot()
  if (!root) return

  const container: HTMLDivElement = document.createElement('div')
  container.className = 'app-bootstrap app-bootstrap--error'
  container.setAttribute('role', 'alert')

  const content: HTMLDivElement = document.createElement('div')
  content.className = 'app-bootstrap__content'

  const title: HTMLParagraphElement = document.createElement('p')
  title.className = 'app-bootstrap__title'
  title.textContent = 'Не удалось запустить приложение'

  const text: HTMLParagraphElement = document.createElement('p')
  text.className = 'app-bootstrap__text'
  text.textContent = getErrorMessage(reason)

  const retry: HTMLButtonElement = document.createElement('button')
  retry.className = 'app-bootstrap__retry'
  retry.type = 'button'
  retry.textContent = 'Повторить'
  retry.addEventListener('click', (): void => window.location.reload())

  content.append(title, text, retry)
  container.append(content)
  root.replaceChildren(container)
}

window.addEventListener('error', (event: ErrorEvent): void => {
  showBootstrapError(event.error ?? event.message)
})

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent): void => {
  showBootstrapError(event.reason)
})

window.setTimeout((): void => {
  showBootstrapError('Превышено время ожидания начального экрана')
}, BOOTSTRAP_TIMEOUT_MS)
