<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AlbumContentsTeam } from '@/data/wc-26/contents'

interface Props {
  pageNumber: number
  teams: AlbumContentsTeam[]
}

interface Emits {
  select: [pageId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const flagSlots: ComputedRef<Array<AlbumContentsTeam | undefined>> = computed(
  (): Array<AlbumContentsTeam | undefined> =>
    Array.from({ length: 4 }, (_value: unknown, index: number): AlbumContentsTeam | undefined =>
      props.teams[index],
    ),
)
</script>

<template>
  <section
    class="absolute inset-0 flex flex-col px-[12%] pb-[8%] pt-[9%] text-ink [container-type:inline-size]"
    :aria-label="t('album.contents.aria', { page: pageNumber })"
  >
    <header class="shrink-0 text-center">
      <p
        class="text-[clamp(6px,0.95cqw,14px)] font-black uppercase tracking-[0.24em] text-coral"
      >
        {{ String(pageNumber).padStart(2, '0') }} / {{ t('album.contents.kicker') }}
      </p>
      <h2
        class="mt-[1.1cqw] text-[clamp(16px,3.5cqw,52px)] font-black uppercase tracking-[-0.04em]"
      >
        {{ t('album.contents.title') }}
      </h2>
      <p class="mt-[0.7cqw] text-[clamp(7px,1.15cqw,17px)] font-semibold text-ink/55">
        {{ t('album.contents.hint') }}
      </p>
    </header>

    <!-- Четыре фиксированные ячейки сохраняют одинаковый масштаб флагов на обеих страницах. -->
    <nav
      class="mx-auto mt-[4cqw] grid min-h-0 w-[78%] flex-1 grid-cols-2 grid-rows-2 gap-x-[8cqw] gap-y-[3.5cqw]"
      :aria-label="t('album.contents.navigation')"
    >
      <template v-for="(team, index) in flagSlots" :key="team?.id ?? `empty-${index}`">
        <button
          v-if="team"
          class="group grid min-h-0 place-items-center rounded-[2.2cqw] border border-ink/10 bg-paper/55 shadow-[0_0.8cqw_2.2cqw_rgb(var(--color-ink)/0.1)] transition duration-200 hover:-translate-y-[0.4cqw] hover:border-coral/45 hover:bg-white/70 hover:shadow-[0_1.2cqw_3cqw_rgb(var(--color-ink)/0.16)] focus-visible:outline focus-visible:outline-[0.35cqw] focus-visible:outline-offset-[0.35cqw] focus-visible:outline-gold"
          type="button"
          :aria-label="t('album.contents.openTeam', { team: t(team.nameKey) })"
          :title="t(team.nameKey)"
          @click="emit('select', team.pageId)"
        >
          <img
            class="w-[72%] select-none rounded-[0.35cqw] border border-ink/15 object-contain shadow-[0_0.55cqw_0.8cqw_rgb(var(--color-ink)/0.2)] transition-transform duration-200 group-hover:scale-105"
            :src="team.flag"
            alt=""
            aria-hidden="true"
          />
        </button>
        <span v-else class="rounded-[2.2cqw] border border-dashed border-ink/10" aria-hidden="true" />
      </template>
    </nav>

    <footer
      class="absolute bottom-[3.1%] text-[clamp(10px,1.45cqw,22px)] font-extrabold tracking-[-0.03em] text-coral"
      :class="pageNumber % 2 === 0 ? 'left-[12.3%]' : 'right-[12.3%]'"
      aria-hidden="true"
    >
      {{ String(pageNumber).padStart(2, '0') }}
    </footer>
  </section>
</template>
