<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AlbumBook from '@/components/Album/AlbumBook.vue'
import AlbumEditorialPage from '@/components/Album/AlbumEditorialPage.vue'
import AlbumDropConfirm from '@/components/DragDrop/AlbumDropConfirm.vue'
import type { AlbumPageData } from '@/components/Album/AlbumPage.vue'
import StickerSlot from '@/components/Album/StickerSlot.vue'
import StickerTray from '@/components/Sticker/StickerTray.vue'
import StickerPreviewDialog from '@/components/Sticker/StickerPreviewDialog.vue'
import { resolveStickerPlacement } from '@/components/DragDrop/dropGeometry'
import changelogMarkdown from '@/change-log/CHANGELOG.md?raw'
import cards from '@/data/wc-26/players'
import { useAlbumStore } from '@/stores/album'
import { useCollectionStore } from '@/stores/collection'
import { useDeletedCardsStore } from '@/stores/deletedCards'
import projectReadme from '../../README.md?raw'
import projectLogo from '../../assets/game/wc-26/main/sticker-book-logo.png?url'
import type {
  AlbumGeometryPage,
  CollectionItem,
  PlayerCard,
  StickerDropResult,
  StickerPlacement,
  StickerPreparation,
  StickerInstance,
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

const toPlainText = (value: string): string =>
  value
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim()

const readMarkdownList = (markdown: string, sectionTitle: string): string[] => {
  const lines: string[] = markdown.split(/\r?\n/)
  const sectionStart: number = lines.findIndex(
    (line: string): boolean => line.trim() === `## ${sectionTitle}`,
  )
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
  projectReadme
    .split(/\r?\n/)
    .find((line: string): boolean => Boolean(line.trim()) && !line.startsWith('#')) ?? '',
)
const currentMvpItems: string[] = readMarkdownList(projectReadme, 'Текущий MVP')
const nextStepItems: string[] = readMarkdownList(projectReadme, 'Ближайшие шаги')
const futureIdeaItems: string[] = readMarkdownList(projectReadme, 'Будущие идеи')
const allReleaseNotes: AlbumReleaseNote[] = parseReleaseNotes(changelogMarkdown)
const latestReleaseSeries: string =
  allReleaseNotes[0]?.version.split('.').slice(0, 2).join('.') ?? '0.0'
const recentReleaseNotes: AlbumReleaseNote[] = allReleaseNotes
  .filter(({ version }: AlbumReleaseNote): boolean => version.startsWith(`${latestReleaseSeries}.`))
  .slice(0, 3)

const { t } = useI18n()
const album = useAlbumStore()
const collection = useCollectionStore()
const deletedCards = useDeletedCardsStore()
const currentPage: Ref<number> = ref(0)
const isBookOpen: Ref<boolean> = ref(false)
const isDesktopSpread: Ref<boolean> = ref(false)
const activeTargetId: Ref<string | undefined> = ref(undefined)
const pendingDrop: Ref<StickerDropResult | undefined> = ref(undefined)
const confirmationKind: Ref<'wrong' | 'far'> = ref('far')
const isConfirmOpen: Ref<boolean> = ref(false)
const previewItem: Ref<StickerTrayItem | undefined> = ref(undefined)
const isPreviewOpen: Ref<boolean> = ref(false)
let desktopMediaQuery: MediaQueryList | undefined

const albumImages: Record<string, string> = import.meta.glob(
  '../../assets/game/wc-26/main/album/*.png',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

const pages: ComputedRef<AlbumPageView[]> = computed((): AlbumPageView[] =>
  album.pages.map(
    (page: AlbumGeometryPage): AlbumPageView => ({
      id: page.id,
      title: t('album.spreadTitle', { page: String(page.number).padStart(2, '0') }),
      image: albumImages[`../../assets/game/wc-26/main/album/${page.image}`],
      geometry: page,
    }),
  ),
)

const displayMode: ComputedRef<'spread' | 'page'> = computed((): 'spread' | 'page' =>
  isDesktopSpread.value ? 'spread' : 'page',
)
const pageStep: ComputedRef<number> = computed((): number => (isDesktopSpread.value ? 2 : 1))
const visiblePageIndexes: ComputedRef<number[]> = computed((): number[] =>
  Array.from(
    { length: isBookOpen.value ? pageStep.value : 1 },
    (_value: unknown, offset: number): number => currentPage.value + offset,
  ).filter((pageIndex: number): boolean => pageIndex < pages.value.length),
)
const visibleGeometries: ComputedRef<AlbumGeometryPage[]> = computed((): AlbumGeometryPage[] =>
  visiblePageIndexes.value.map(
    (pageIndex: number): AlbumGeometryPage => pages.value[pageIndex].geometry,
  ),
)
const visiblePageLabel: ComputedRef<string> = computed((): string =>
  visibleGeometries.value.map(({ number }): string => String(number).padStart(2, '0')).join('–'),
)
const visibleSlotTotal: ComputedRef<number> = computed((): number =>
  visibleGeometries.value.reduce(
    (total: number, page: AlbumGeometryPage): number => total + page.slots.length,
    0,
  ),
)
const placedOnVisiblePages: ComputedRef<number> = computed((): number =>
  visibleGeometries.value.reduce(
    (total: number, page: AlbumGeometryPage): number =>
      total + page.slots.filter(({ id }): boolean => Boolean(getPlacedCard(id))).length,
    0,
  ),
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
const getPlacedCard = (
  slotId: string,
):
  | {
      card: PlayerCard
      instance: StickerInstance
      placement: StickerPlacement
      preparation?: StickerPreparation
    }
  | undefined => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean =>
      instance.location === 'album' &&
      normalizeSlotId(instance.placement?.slotId ?? '') === slotId,
  )
  if (!item?.instance.placement) return undefined
  const card: PlayerCard | undefined = getCard(item.instance.playerId)
  return card
    ? {
        card,
        instance: item.instance,
        placement: item.instance.placement,
        preparation: item.instance.preparation,
      }
    : undefined
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

const openPreview = (instance: StickerInstance): void => {
  const card: PlayerCard | undefined = getCard(instance.playerId)
  if (!card) return
  previewItem.value = { card, instance }
  isPreviewOpen.value = true
}

const removeCard = async (instanceId: string): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === instanceId,
  )
  if (!item) return
  await deletedCards.removeCard(item.instance)
  await collection.updateCard(instanceId, { location: 'deleted' })
}

// Открывает страницу выбранного игрока и подсвечивает единственную подходящую ячейку.
const focusCardTarget = (playerId: string): void => {
  const pageIndex: number = pages.value.findIndex(({ geometry }): boolean =>
    geometry.slots.some((slot): boolean => slot.playerId === playerId),
  )
  if (pageIndex >= 0) {
    isBookOpen.value = true
    currentPage.value = isDesktopSpread.value ? 1 + Math.floor((pageIndex - 1) / 2) * 2 : pageIndex
  }
  activeTargetId.value = playerId
}

const clearCardTarget = (): void => {
  activeTargetId.value = undefined
}

// Переводит к целевой странице только тогда, когда текущий разворот вообще не принимает наклейки.
const prepareDropPage = (playerId: string): void => {
  if (visibleSlotTotal.value === 0) focusCardTarget(playerId)
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

const savePreparation = async (
  instanceId: string,
  preparation: StickerPreparation,
): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === instanceId,
  )
  if (!item) return
  const quality: number = Math.min(item.instance.quality, preparation.quality)
  await collection.updateCard(instanceId, {
    quality,
    preparation: { ...preparation, quality },
  })
}

// Сохраняет точность позиции и итоговое качество конкретного экземпляра наклейки.
const saveDrop = async (drop: StickerDropResult): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === drop.instanceId,
  )
  if (!item) return
  const placement: StickerPlacement = resolveStickerPlacement(drop, item.instance.preparation)
  const dropQuality: number = drop.grade === 'far' ? drop.quality : 100
  await collection.updateCard(drop.instanceId, {
    quality: Math.min(item.instance.quality, dropQuality),
    location: 'album',
    placement,
  })
  activeTargetId.value = undefined
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
    <header
      class="flex h-14 shrink-0 items-center justify-between border-b border-paper/10 px-4 text-paper max-md:h-11 max-md:px-3"
    >
      <div>
        <p
          class="text-[10px] font-bold uppercase tracking-[0.18em] text-gold max-md:text-[0.48rem] max-md:tracking-[0.14em]"
        >
          {{ t('app.album') }}
        </p>
        <h1 class="text-lg font-black leading-tight max-md:text-[0.8rem]">
          {{
            t(isBookOpen && isDesktopSpread ? 'album.spreadRangeTitle' : 'album.spreadTitle', {
              page: visiblePageLabel,
              pages: visiblePageLabel,
            })
          }}
        </h1>
      </div>
      <div
        v-if="visibleSlotTotal > 0"
        class="text-right text-xs font-semibold text-paper/65 max-md:text-[0.52rem]"
      >
        <strong class="block text-base font-black text-paper max-md:text-xs"
          >{{ placedOnVisiblePages }} / {{ visibleSlotTotal }}</strong
        >
        {{ t('album.spreadProgress', { placed: placedOnVisiblePages, total: visibleSlotTotal }) }}
      </div>
      <div
        v-else
        class="text-right text-[10px] font-bold uppercase tracking-[0.16em] text-paper/55 max-md:text-[0.52rem]"
      >
        <strong class="block text-base font-black tracking-normal text-paper max-md:text-xs">{{
          visiblePageLabel
        }}</strong>
        {{ t(isBookOpen ? 'album.editorial.infoLabel' : 'album.editorial.coverLabel') }}
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
                :instance="getPlacedCard(slot.id)?.instance"
                :placement="getPlacedCard(slot.id)?.placement"
                :preparation="getPlacedCard(slot.id)?.preparation"
                :highlighted="activeTargetId === slot.playerId"
                @preview="openPreview"
              />
            </template>
          </template>
        </AlbumBook>
      </div>

      <StickerTray
        :cards="trayCards"
        @focus="focusCardTarget"
        @clear-focus="clearCardTarget"
        @drag-start="prepareDropPage"
        @ready="savePreparation"
        @drop="handleDrop"
        @remove="removeCard"
      />
    </div>

    <AlbumDropConfirm
      v-model:visible="isConfirmOpen"
      :kind="confirmationKind"
      @confirm="confirmDrop"
      @cancel="cancelDrop"
    />
    <StickerPreviewDialog
      v-model:visible="isPreviewOpen"
      :card="previewItem?.card"
      :instance="previewItem?.instance"
      @remove="removeCard($event.id)"
    />
  </section>
</template>
