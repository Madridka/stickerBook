<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ALBUM_VIEW_CONFIG } from '@/config/albumConfig'
import type { AlbumEditorialContentsItem, AlbumEditorialPageDefinition } from '@/types'

interface AlbumReleaseNote {
  version: string
  title: string
  items: string[]
}

interface Props {
  definition: AlbumEditorialPageDefinition
  pageNumber: number
  logo?: string
  releaseSeries?: string
  releases?: AlbumReleaseNote[]
}

const props = withDefaults(defineProps<Props>(), {
  logo: '',
  releaseSeries: '',
  releases: () => [],
})

const emit = defineEmits<{
  navigate: [pageNumber: number]
}>()

const { t } = useI18n()

const visibleContentsItems = computed((): AlbumEditorialContentsItem[] => {
  const items = props.definition.contentsSections?.flatMap(({ items: sectionItems }) => sectionItems) ?? []
  const pageSize = props.definition.contentsPageSize
  if (!pageSize) return items

  const pageIndex = props.pageNumber - (props.definition.contentsFirstPage ?? props.pageNumber)
  return items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
})

const getContentsItemLabel = (item: AlbumEditorialContentsItem): string => {
  const label = item.translateLabel === false ? item.label : t(item.label)
  return item.group ? `${label} · ${item.group}` : label
}
</script>

<template>
  <div
    class="absolute inset-0 overflow-hidden text-[#17212b] [container-type:inline-size] [font-family:Inter,ui-sans-serif,system-ui,sans-serif] [&_*]:box-border [&_*::after]:box-border [&_*::before]:box-border"
  >
    <section
      v-if="definition.kind === 'cover'"
      class="relative flex h-full w-full flex-col justify-between [padding:7.5%_7%_5.5%]"
      :class="definition.tone === 'light' ? 'text-[#f7f3eb]' : 'text-[#17212b]'"
      :aria-label="t(definition.title)"
    >
      <div
        v-if="!definition.hideCoverCopy"
        class="pointer-events-none absolute inset-0"
        :class="
          definition.tone === 'light'
            ? 'bg-gradient-to-r from-[#081728]/80 via-[#081728]/35 to-transparent'
            : 'bg-gradient-to-r from-[#f7f0df]/75 via-[#f7f0df]/25 to-transparent'
        "
      />

      <div v-if="!definition.hideCoverCopy" class="relative z-10 w-[53%]">
        <img
          v-if="logo"
          class="mb-[2.6cqw] block h-auto w-[78%] object-contain"
          :src="logo"
          alt=""
        />
        <span
          class="block text-[clamp(7px,0.95cqw,14px)] font-black uppercase tracking-[0.2em] text-[#e5b95c] max-md:text-[clamp(4px,0.95cqw,7px)]"
        >
          {{ t(definition.eyebrow) }}
        </span>
        <h2
          class="m-0 mt-[1.2cqw] text-[clamp(23px,4.9cqw,74px)] font-black leading-[0.92] tracking-[-0.055em] max-md:text-[clamp(14px,4.9cqw,23px)]"
        >
          {{ t(definition.title) }}
        </h2>
        <p
          class="m-0 mt-[1.8cqw] max-w-[38cqw] text-[clamp(8px,1.35cqw,20px)] font-semibold leading-[1.45] opacity-90 max-md:text-[clamp(5px,1.35cqw,8px)]"
        >
          {{ t(definition.description) }}
        </p>
      </div>

      <footer
        v-if="!definition.hideCoverCopy"
        class="relative z-10 flex items-end justify-between border-t border-current/25 pt-[1.4cqw] text-[clamp(6px,0.76cqw,11px)] font-black uppercase tracking-[0.16em] max-md:text-[clamp(4px,0.76cqw,6px)]"
      >
        <span>{{ definition.footer ? t(definition.footer) : t('album.editorial.issue') }}</span>
        <strong class="text-[clamp(10px,1.45cqw,22px)] text-[#e5b95c]">01</strong>
      </footer>
    </section>

    <section
      v-else-if="definition.kind === 'contents'"
      class="relative flex h-full w-full items-center [padding:5.2%_5.5%_5.5%]"
      :aria-label="t(definition.title)"
    >
      <article
        class="relative w-full rounded-[1.4cqw] border border-[#17212b]/15 bg-[#fffaf0]/95 p-[2.5cqw] shadow-[0_1.2cqw_3cqw_rgb(23_33_43_/_14%)] backdrop-blur-[1px]"
      >
        <header class="border-b border-[#17212b]/15 pb-[1.4cqw]">
          <span
            class="text-[clamp(7px,0.88cqw,13px)] font-black uppercase tracking-[0.2em] text-[#c83d36] max-md:text-[clamp(4px,0.88cqw,7px)]"
          >
            {{ t(definition.eyebrow) }}
          </span>
          <h2
            class="m-0 mt-[0.55cqw] text-[clamp(19px,3.25cqw,50px)] font-black leading-[0.96] tracking-[-0.05em] max-md:text-[clamp(12px,3.25cqw,19px)]"
          >
            {{ t(definition.title) }}
          </h2>
          <p
            class="m-0 mt-[0.8cqw] text-[clamp(7px,0.95cqw,14px)] font-semibold leading-[1.4] text-[#17212b]/70 max-md:text-[clamp(4.5px,0.95cqw,7px)]"
          >
            {{ t(definition.description) }}
          </p>
        </header>

        <div
          v-if="definition.contentsVariant === 'logo-grid'"
          class="mt-[1.8cqw] grid min-h-0 gap-[1.35cqw]"
          :class="(definition.contentsPageSize ?? 0) > 15 ? 'grid-cols-6' : 'grid-cols-5'"
        >
          <button
            v-for="item in visibleContentsItems"
            :key="`${item.label}-${item.group ?? ''}`"
            type="button"
            class="group flex aspect-square min-w-0 cursor-pointer flex-col items-center rounded-[1.1cqw] border border-[#17212b]/10 bg-white/95 p-[0.8cqw] shadow-[0_0.45cqw_1.2cqw_rgb(23_33_43_/_10%)] transition duration-200 hover:-translate-y-[0.22cqw] hover:border-[#c83d36]/45 hover:shadow-[0_0.7cqw_1.6cqw_rgb(23_33_43_/_16%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c83d36]"
            :aria-label="getContentsItemLabel(item)"
            :title="getContentsItemLabel(item)"
            @click.stop="emit('navigate', item.targetPage)"
          >
            <span class="flex min-h-0 w-full flex-1 items-center justify-center" aria-hidden="true">
              <img
                v-if="item.logo"
                :src="item.logo"
                alt=""
                class="max-h-full w-[78%] object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span v-else class="text-[2cqw] font-black">{{ item.badge }}</span>
            </span>
            <strong
              class="mt-[0.35cqw] line-clamp-2 w-full shrink-0 text-center text-[clamp(5px,0.76cqw,11px)] font-black leading-[1.08] text-[#17212b] group-hover:text-[#c83d36] max-md:text-[clamp(3.5px,0.76cqw,5px)]"
            >
              {{ getContentsItemLabel(item) }}
            </strong>
          </button>
        </div>

        <div
          v-else
          class="mt-[1.5cqw] grid gap-[1.2cqw]"
          :class="(definition.contentsSections?.length ?? 0) === 1 ? 'grid-cols-6' : 'grid-cols-3'"
        >
          <section
            v-for="section in definition.contentsSections"
            :key="section.title"
            class="rounded-[0.8cqw] bg-[#17212b]/[0.045] p-[1.25cqw]"
          >
            <h3
              class="m-0 border-b border-[#c83d36]/25 pb-[0.75cqw] text-[clamp(8px,1.05cqw,16px)] font-black uppercase tracking-[0.06em] text-[#c83d36] max-md:text-[clamp(5px,1.05cqw,8px)]"
            >
              {{ t(section.title) }}
            </h3>
            <ul class="m-0 mt-[0.55cqw] list-none p-0">
              <li
                v-for="item in section.items"
                :key="`${item.label}-${item.group ?? ''}`"
                class="border-b border-[#17212b]/10 last:border-b-0"
              >
                <button
                  type="button"
                  class="group flex w-full cursor-pointer items-center gap-[0.55cqw] rounded-[0.35cqw] border-0 bg-transparent px-[0.25cqw] py-[0.34cqw] text-left text-[#17212b] transition-colors hover:bg-[#c83d36]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#c83d36]"
                  @click.stop="emit('navigate', item.targetPage)"
                >
                  <span
                    v-if="item.logo || item.badge"
                    class="flex h-[1.65cqw] w-[1.65cqw] shrink-0 items-center justify-center bg-white p-[0.12cqw] shadow-[0_0.15cqw_0_rgb(23_33_43_/_18%)]"
                    :class="{
                      'border border-[#c8102e] text-[#c8102e]': !item.logo && item.badgeTheme === 'england',
                      'border border-[#aa151b] bg-[#f1bf00] text-[#6b1115]': !item.logo && item.badgeTheme === 'spain',
                      'border border-[#17467b] text-[#c51e3a]': !item.logo && item.badgeTheme === 'russia',
                    }"
                    aria-hidden="true"
                  >
                    <img v-if="item.logo" :src="item.logo" alt="" class="h-full w-full object-contain" />
                    <template v-else>{{ item.badge }}</template>
                  </span>
                  <span
                    class="min-w-0 text-[clamp(6px,0.79cqw,12px)] font-bold leading-[1.15] group-hover:text-[#c83d36] max-md:text-[clamp(4px,0.79cqw,6px)]"
                  >
                    {{ item.translateLabel === false ? item.label : t(item.label) }}<template v-if="item.group"> · {{ item.group }}</template>
                  </span>
                  <span class="min-w-[1cqw] flex-1 border-b border-dotted border-[#17212b]/30" />
                  <strong
                    class="shrink-0 text-[clamp(6px,0.82cqw,12px)] font-black tabular-nums text-[#17212b] group-hover:text-[#c83d36] max-md:text-[clamp(4px,0.82cqw,6px)]"
                  >
                    {{ item.pages }}
                  </strong>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </article>

      <strong
        class="absolute bottom-[3%] right-[5.5%] text-[clamp(10px,1.45cqw,22px)] font-black text-[#c83d36] max-md:text-[clamp(6px,1.45cqw,10px)]"
      >
        {{ String(pageNumber).padStart(2, '0') }}
      </strong>
    </section>

    <section
      v-else-if="definition.kind === 'article'"
      class="relative flex h-full w-full items-center [padding:6.5%_6.5%_5.5%]"
      :aria-label="t(definition.title)"
    >
      <article
        class="relative w-full rounded-[1.4cqw] border border-[#17212b]/15 bg-[#fffaf0] p-[3.2cqw] shadow-[0_1.2cqw_3cqw_rgb(23_33_43_/_14%)]"
      >
        <span
          class="text-[clamp(7px,0.88cqw,13px)] font-black uppercase tracking-[0.2em] text-[#c83d36] max-md:text-[clamp(4px,0.88cqw,7px)]"
        >
          {{ t(definition.eyebrow) }}
        </span>
        <h2
          class="m-0 mt-[0.8cqw] text-[clamp(19px,3.55cqw,54px)] font-black leading-[0.96] tracking-[-0.05em] max-md:text-[clamp(12px,3.55cqw,19px)]"
        >
          {{ t(definition.title) }}
        </h2>
        <p
          class="m-0 mt-[1.35cqw] text-[clamp(7px,1.08cqw,16px)] font-semibold leading-[1.5] text-[#17212b]/75 max-md:text-[clamp(4.5px,1.08cqw,7px)]"
        >
          {{ t(definition.description) }}
        </p>

        <div
          v-if="definition.features?.length"
          class="mt-[2.2cqw] grid grid-cols-2 gap-[1.2cqw] border-t border-[#17212b]/15 pt-[1.8cqw]"
        >
          <div
            v-for="(feature, index) in definition.features"
            :key="feature.title"
            class="rounded-[0.8cqw] bg-[#17212b]/[0.045] p-[1.3cqw]"
          >
            <span
              class="mb-[0.55cqw] block text-[clamp(6px,0.72cqw,11px)] font-black text-[#c83d36] max-md:text-[clamp(4px,0.72cqw,6px)]"
            >
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <h3
              class="m-0 text-[clamp(9px,1.18cqw,18px)] font-black leading-[1.08] max-md:text-[clamp(5.5px,1.18cqw,9px)]"
            >
              {{ t(feature.title) }}
            </h3>
            <p
              class="m-0 mt-[0.45cqw] text-[clamp(6px,0.88cqw,13px)] font-medium leading-[1.4] text-[#17212b]/70 max-md:text-[clamp(4px,0.88cqw,6px)]"
            >
              {{ t(feature.description) }}
            </p>
          </div>
        </div>
      </article>

      <strong
        class="absolute bottom-[3%] text-[clamp(10px,1.45cqw,22px)] font-black text-[#c83d36] max-md:text-[clamp(6px,1.45cqw,10px)]"
        :class="pageNumber % 2 === 0 ? 'left-[6.5%]' : 'right-[6.5%]'"
      >
        {{ String(pageNumber).padStart(2, '0') }}
      </strong>
    </section>

    <section
      v-else
      class="relative flex h-full w-full items-center [padding:8%_8%_5.5%]"
      :aria-label="t(definition.title)"
    >
      <div class="w-full rounded-[1.4cqw] border border-[#17212b]/15 bg-[#fffaf0] p-[3cqw]">
        <header class="grid grid-cols-[0.56fr_1.44fr] gap-[3cqw] border-b border-[#17212b]/20 pb-[2cqw]">
          <span
            class="pt-[0.5cqw] text-[clamp(7px,0.88cqw,13px)] font-black uppercase tracking-[0.2em] text-[#c83d36] max-md:text-[clamp(4px,0.88cqw,7px)]"
          >
            {{ t(definition.eyebrow) }}
          </span>
          <div>
            <h2
              class="m-0 text-[clamp(19px,3.55cqw,54px)] font-black leading-[0.96] tracking-[-0.05em] max-md:text-[clamp(12px,3.55cqw,19px)]"
            >
              {{ t(definition.title) }}
            </h2>
            <p
              class="m-0 mt-[0.8cqw] text-[clamp(7px,0.92cqw,14px)] font-bold uppercase tracking-[0.08em] text-[#17212b]/55 max-md:text-[clamp(4.5px,0.92cqw,7px)]"
            >
              {{ t(definition.description, { series: releaseSeries }) }}
            </p>
          </div>
        </header>

        <div class="relative mt-[2cqw] grid gap-[1.4cqw] pl-[2cqw] before:absolute before:bottom-0 before:left-0 before:top-0 before:w-px before:bg-[#e5b95c] before:content-['']">
          <article
            v-for="release in releases"
            :key="release.version"
            class="relative grid grid-cols-[10cqw_1fr] gap-[2.5cqw] before:absolute before:left-[-2.42cqw] before:top-[0.35cqw] before:h-[0.85cqw] before:w-[0.85cqw] before:rounded-full before:border before:border-[#e5b95c] before:bg-[#fffaf0] before:content-['']"
          >
            <strong class="text-[clamp(9px,1.35cqw,20px)] font-black text-[#c83d36]">
              v{{ release.version }}
            </strong>
            <div>
              <h3 class="m-0 text-[clamp(8px,1.15cqw,17px)] font-black">
                {{ release.title }}
              </h3>
              <ul class="mt-[0.6cqw] grid list-none grid-cols-2 gap-[0.6cqw_2cqw] p-0">
                <li
                  v-for="item in release.items.slice(0, ALBUM_VIEW_CONFIG.releaseItemsPerNote)"
                  :key="item"
                  class="text-[clamp(6px,0.84cqw,13px)] font-medium leading-[1.35] text-[#17212b]/70"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
          </article>
        </div>
      </div>

      <strong
        class="absolute bottom-[3%] right-[8%] text-[clamp(10px,1.45cqw,22px)] font-black text-[#c83d36]"
      >
        {{ String(pageNumber).padStart(2, '0') }}
      </strong>
    </section>
  </div>
</template>
