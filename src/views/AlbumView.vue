<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AlbumBook from '@/components/Album/AlbumBook.vue'
import AlbumEditorialPage from '@/components/Album/AlbumEditorialPage.vue'
import AlbumDropConfirm from '@/components/DragDrop/AlbumDropConfirm.vue'
import type { AlbumPageData } from '@/components/Album/AlbumPage.vue'
import StickerSlot from '@/components/Album/StickerSlot.vue'
import StickerTray from '@/components/Sticker/StickerTray.vue'
import changelogMarkdown from '@/change-log/CHANGELOG.md?raw'
import cardsData from '@/data/wc-26/mexico/players.json'
import { useAlbumStore } from '@/stores/album'
import { useCollectionStore } from '@/stores/collection'
import projectReadme from '../../README.md?raw'
import projectLogo from '../../assets/game/wc-26/main/sticker-book-logo.png?url'
import type {
  AlbumGeometryPage,
  CollectionItem,
  PlayerCard,
  StickerDropGrade,
  StickerDropResult,
  StickerPlacement,
  StickerTrayItem,
} from '@/types'

interface AlbumPageView extends AlbumPageData {
  geometry: AlbumGeometryPage
}

interface AlbumReleaseNote {
  version: string
  title: string
  items: string[]
}

const toPlainText = (value: string): string => value
  .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .trim()

const readMarkdownList = (markdown: string, sectionTitle: string): string[] => {
  const lines: string[] = markdown.split(/\r?\n/)
  const sectionStart: number = lines.findIndex((line: string): boolean => line.trim() === `## ${sectionTitle}`)
  if (sectionStart < 0) return []
  const sectionEnd: number = lines.findIndex(
    (line: string, index: number): boolean => index > sectionStart && line.startsWith('## '),
  )
  return lines
    .slice(sectionStart + 1, sectionEnd < 0 ? lines.length : sectionEnd)
    .filter((line: string): boolean => /^-\s+/.test(line))
    .map((line: string): string => toPlainText(line.replace(/^-\s+/, '')))
}

const parseReleaseNotes = (markdown: string): AlbumReleaseNote[] => {
  const headings: RegExpMatchArray[] = Array.from(
    markdown.matchAll(/^##\s+(\d+\.\d+\.\d+)\s+—\s+(.+)$/gm),
  )
  return headings.map((heading: RegExpMatchArray, index: number): AlbumReleaseNote => {
    const contentStart: number = (heading.index ?? 0) + heading[0].length
    const contentEnd: number = headings[index + 1]?.index ?? markdown.length
    const items: string[] = markdown
      .slice(contentStart, contentEnd)
      .split(/\r?\n/)
      .filter((line: string): boolean => /^-\s+/.test(line))
      .map((line: string): string => toPlainText(line.replace(/^-\s+/, '')))
    return { version: heading[1], title: toPlainText(heading[2]), items }
  })
}

const projectIntro: string = toPlainText(
  projectReadme.split(/\r?\n/).find((line: string): boolean => Boolean(line.trim()) && !line.startsWith('#')) ?? '',
)
const currentMvpItems: string[] = readMarkdownList(projectReadme, 'Текущий MVP')
const nextStepItems: string[] = readMarkdownList(projectReadme, 'Ближайшие шаги')
const futureIdeaItems: string[] = readMarkdownList(projectReadme, 'Будущие идеи')
const allReleaseNotes: AlbumReleaseNote[] = parseReleaseNotes(changelogMarkdown)
const latestReleaseSeries: string = allReleaseNotes[0]?.version.split('.').slice(0, 2).join('.') ?? '0.0'
const recentReleaseNotes: AlbumReleaseNote[] = allReleaseNotes
  .filter(({ version }: AlbumReleaseNote): boolean => version.startsWith(`${latestReleaseSeries}.`))
  .slice(0, 3)

const { t } = useI18n()
const album = useAlbumStore()
const collection = useCollectionStore()
const currentPage: Ref<number> = ref(0)
const isBookOpen: Ref<boolean> = ref(false)
const isDesktopSpread: Ref<boolean> = ref(false)
const activeTargetId: Ref<string | undefined> = ref(undefined)
const pendingDrop: Ref<StickerDropResult | undefined> = ref(undefined)
const confirmationKind: Ref<'wrong' | 'far'> = ref('far')
const isConfirmOpen: Ref<boolean> = ref(false)
const lastGrade: Ref<StickerDropGrade | undefined> = ref(undefined)
let desktopMediaQuery: MediaQueryList | undefined

const albumImages: Record<string, string> = import.meta.glob(
  '../../assets/game/wc-26/mexico/album/*.png',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>
const cards: PlayerCard[] = cardsData as PlayerCard[]

const pages: ComputedRef<AlbumPageView[]> = computed((): AlbumPageView[] =>
  album.pages.map((page: AlbumGeometryPage): AlbumPageView => ({
    id: page.id,
    title: t('album.spreadTitle', { page: String(page.number).padStart(2, '0') }),
    image: albumImages[`../../assets/game/wc-26/mexico/album/${page.image}`],
    geometry: page,
  })),
)

const displayMode: ComputedRef<'spread' | 'page'> = computed(
  (): 'spread' | 'page' => isDesktopSpread.value ? 'spread' : 'page',
)
const pageStep: ComputedRef<number> = computed((): number => isDesktopSpread.value ? 2 : 1)
const visiblePageIndexes: ComputedRef<number[]> = computed((): number[] =>
  Array.from(
    { length: isBookOpen.value ? pageStep.value : 1 },
    (_value: unknown, offset: number): number => currentPage.value + offset,
  )
    .filter((pageIndex: number): boolean => pageIndex < pages.value.length),
)
const visibleGeometries: ComputedRef<AlbumGeometryPage[]> = computed(
  (): AlbumGeometryPage[] => visiblePageIndexes.value.map(
    (pageIndex: number): AlbumGeometryPage => pages.value[pageIndex].geometry,
  ),
)
const visiblePageLabel: ComputedRef<string> = computed((): string =>
  visibleGeometries.value
    .map(({ number }): string => String(number).padStart(2, '0'))
    .join('–'),
)
const visibleSlotTotal: ComputedRef<number> = computed((): number =>
  visibleGeometries.value.reduce((total: number, page: AlbumGeometryPage): number => total + page.slots.length, 0),
)
const placedOnVisiblePages: ComputedRef<number> = computed((): number =>
  visibleGeometries.value.reduce(
    (total: number, page: AlbumGeometryPage): number =>
      total + page.slots.filter(({ id }): boolean => Boolean(getPlacedCard(id))).length,
    0,
  ),
)
const showStickerTray: ComputedRef<boolean> = computed(
  (): boolean => isBookOpen.value && visibleSlotTotal.value > 0,
)

const normalizeSlotId = (slotId: string): string => slotId.replace(/-slot$/, '')
const getCard = (playerId: string): PlayerCard | undefined =>
  cards.find(({ id }): boolean => id === playerId)

// Синхронизирует режим одной страницы и полного разворота с Tailwind breakpoint lg.
const syncDesktopSpread = (event: MediaQueryList | MediaQueryListEvent): void => {
  isDesktopSpread.value = event.matches
  if (event.matches && isBookOpen.value) {
    currentPage.value = 1 + Math.floor((currentPage.value - 1) / 2) * 2
  }
}

// Возвращает уже вклеенную карточку с поддержкой старых идентификаторов слотов.
const getPlacedCard = (slotId: string): { card: PlayerCard; placement: StickerPlacement } | undefined => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => normalizeSlotId(instance.placement?.slotId ?? '') === slotId,
  )
  if (!item?.instance.placement) return undefined
  const card: PlayerCard | undefined = getCard(item.instance.playerId)
  return card ? { card, placement: item.instance.placement } : undefined
}

const trayCards: ComputedRef<StickerTrayItem[]> = computed((): StickerTrayItem[] =>
  collection.items
    .filter(({ instance }): boolean => ['inventory', 'collection'].includes(instance.location))
    .map(({ instance }): StickerTrayItem | undefined => {
      const card: PlayerCard | undefined = getCard(instance.playerId)
      return card ? { card, instance } : undefined
    })
    .filter((item: StickerTrayItem | undefined): item is StickerTrayItem => Boolean(item)),
)

// Открывает страницу выбранного игрока и подсвечивает единственную подходящую ячейку.
const focusCardTarget = (playerId: string): void => {
  const pageIndex: number = pages.value.findIndex(({ geometry }): boolean =>
    geometry.slots.some((slot): boolean => slot.playerId === playerId),
  )
  if (pageIndex >= 0) {
    currentPage.value = isDesktopSpread.value ? 1 + Math.floor((pageIndex - 1) / 2) * 2 : pageIndex
  }
  activeTargetId.value = playerId
}

const openBook = (): void => {
  currentPage.value = 1
  isBookOpen.value = true
}

const closeBook = (): void => {
  currentPage.value = 0
  isBookOpen.value = false
  activeTargetId.value = undefined
}

const previousPage = (): void => {
  currentPage.value = Math.max(1, currentPage.value - pageStep.value)
}

const nextPage = (): void => {
  currentPage.value = Math.min(pages.value.length - 1, currentPage.value + pageStep.value)
}

const updatePreparationQuality = async (instanceId: string, quality: number): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === instanceId,
  )
  if (item) await collection.updateCard(instanceId, { quality: Math.min(item.instance.quality, quality) })
}

// Сохраняет точность позиции и итоговое качество конкретного экземпляра наклейки.
const saveDrop = async (drop: StickerDropResult): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === drop.instanceId,
  )
  if (!item) return
  const placement: StickerPlacement = {
    slotId: drop.slotId,
    x: drop.x,
    y: drop.y,
    rotation: drop.grade === 'perfect' ? 0 : Math.round(Math.max(-0.45, Math.min(0.45, drop.x)) * 18),
    accuracy: drop.accuracy,
  }
  await collection.updateCard(drop.instanceId, {
    quality: Math.min(item.instance.quality, drop.quality),
    location: 'album',
    placement,
  })
  activeTargetId.value = undefined
  lastGrade.value = drop.grade
}

// Проверяет попадание в слот и запрашивает подтверждение намеренно плохой вклейки.
const handleDrop = (drop: StickerDropResult): void => {
  const slot = album.geometry.getSlot(drop.slotId)
  const isWrongSlot: boolean = slot?.playerId !== drop.playerId
  if (isWrongSlot || drop.grade === 'far') {
    pendingDrop.value = drop
    confirmationKind.value = isWrongSlot ? 'wrong' : 'far'
    isConfirmOpen.value = true
    return
  }
  void saveDrop(drop)
}

const confirmDrop = async (): Promise<void> => {
  if (!pendingDrop.value) return
  await saveDrop(pendingDrop.value)
  pendingDrop.value = undefined
  isConfirmOpen.value = false
}

const cancelDrop = (): void => {
  pendingDrop.value = undefined
  isConfirmOpen.value = false
}

onMounted((): void => {
  desktopMediaQuery = window.matchMedia('(min-width: 1024px)')
  syncDesktopSpread(desktopMediaQuery)
  desktopMediaQuery.addEventListener('change', syncDesktopSpread)
})

onBeforeUnmount((): void => {
  desktopMediaQuery?.removeEventListener('change', syncDesktopSpread)
})
</script>

<template>
  <section class="flex h-full min-h-0 w-full flex-col overflow-hidden bg-ink">
    <header class="flex h-14 shrink-0 items-center justify-between border-b border-paper/10 px-4 text-paper">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{{ t('app.album') }}</p>
        <h1 class="text-lg font-black leading-tight">
          {{ t(isBookOpen && isDesktopSpread ? 'album.spreadRangeTitle' : 'album.spreadTitle', { page: visiblePageLabel, pages: visiblePageLabel }) }}
        </h1>
      </div>
      <div v-if="visibleSlotTotal > 0" class="text-right text-xs font-semibold text-paper/65">
        <strong class="block text-base font-black text-paper">{{ placedOnVisiblePages }} / {{ visibleSlotTotal }}</strong>
        {{ t('album.spreadProgress', { placed: placedOnVisiblePages, total: visibleSlotTotal }) }}
      </div>
      <div v-else class="text-right text-[10px] font-bold uppercase tracking-[0.16em] text-paper/55">
        <strong class="block text-base font-black tracking-normal text-paper">{{ visiblePageLabel }}</strong>
        {{ isBookOpen ? 'О проекте' : 'Обложка' }}
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col">
      <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <AlbumBook
          class="h-full min-h-0 w-full"
          :pages="pages"
          :current-page="currentPage"
          :is-open="isBookOpen"
          :display-mode="displayMode"
          :open-start-page="1"
          @open="openBook"
          @close="closeBook"
          @previous="previousPage"
          @next="nextPage"
        >
          <template #default="{ pageIndex }">
            <AlbumEditorialPage
              v-if="pages[pageIndex].geometry.number <= 3"
              :page-number="pages[pageIndex].geometry.number"
              :logo="projectLogo"
              :project-intro="projectIntro"
              :current-items="currentMvpItems"
              :next-items="nextStepItems"
              :future-items="futureIdeaItems"
              :release-series="latestReleaseSeries"
              :releases="recentReleaseNotes"
            />
            <template v-else>
              <StickerSlot
                v-for="slot in pages[pageIndex].geometry.slots"
                :key="slot.id"
                :slot="slot"
                :page="pages[pageIndex].geometry"
                :target-card="getCard(slot.playerId)"
                :card="getPlacedCard(slot.id)?.card"
                :placement="getPlacedCard(slot.id)?.placement"
                :highlighted="activeTargetId === slot.playerId"
              />
            </template>
          </template>
        </AlbumBook>

        <p
          v-if="lastGrade"
          class="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded bg-mint px-3 py-1 text-xs font-bold text-ink shadow"
          aria-live="polite"
        >
          {{ t(`stickerTray.result.${lastGrade}`) }}
        </p>
      </div>

      <div v-if="isBookOpen" class="h-52 max-h-52 w-full shrink-0">
        <StickerTray
          v-if="showStickerTray"
          :cards="trayCards"
          @focus="focusCardTarget"
          @ready="updatePreparationQuality"
          @drop="handleDrop"
        />
      </div>
    </div>

    <AlbumDropConfirm
      v-model:visible="isConfirmOpen"
      :kind="confirmationKind"
      @confirm="confirmDrop"
      @cancel="cancelDrop"
    />
  </section>
</template>
