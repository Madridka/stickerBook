<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AlbumContentsItem } from '@/types'
import LoadableImage from '@/components/ui/LoadableImage.vue'

interface Props {
  pageNumber: number
  teams: AlbumContentsItem[]
}

interface Emits {
  select: [pageId: string]
}

interface ContentsGroup {
  id: string
  teams: AlbumContentsItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const isTomskContents: ComputedRef<boolean> = computed((): boolean =>
  props.teams.some(({ id }): boolean => id === 'kdv' || id.startsWith('tom-')),
)

const groupRows: ComputedRef<ContentsGroup[]> = computed((): ContentsGroup[] => {
  const teamsByGroup: Map<string, AlbumContentsItem[]> = new Map()

  props.teams.forEach((team: AlbumContentsItem): void => {
    const teams: AlbumContentsItem[] = teamsByGroup.get(team.group) ?? []
    teams.push(team)
    teamsByGroup.set(team.group, teams)
  })

  return Array.from(teamsByGroup, ([id, teams]): ContentsGroup => ({ id, teams }))
})
</script>

<template>
  <section
    class="absolute inset-0 flex flex-col px-[10%] pb-[8%] pt-[7%] text-ink [container-type:inline-size]"
    :aria-label="t('album.contents.aria', { page: pageNumber })"
  >
    <header class="shrink-0 text-center">
      <p class="text-[clamp(6px,0.9cqw,13px)] font-black uppercase tracking-[0.24em] text-coral">
        {{ String(pageNumber).padStart(2, '0') }} / {{ t('album.contents.kicker') }}
      </p>
      <h2
        class="mt-[0.7cqw] text-[clamp(15px,3.1cqw,46px)] font-black uppercase tracking-[-0.04em]"
      >
        {{ t('album.contents.title') }}
      </h2>
      <p class="mt-[0.35cqw] text-[clamp(7px,1cqw,15px)] font-semibold text-ink/55">
        {{ t(isTomskContents ? 'album.contents.tomsk.hint' : 'album.contents.hint') }}
      </p>
    </header>

    <nav
      class="mx-auto mt-[1.8cqw] grid min-h-0 w-full flex-1 gap-[1.1cqw]"
      :class="isTomskContents ? 'grid-rows-1' : 'grid-rows-3'"
      :aria-label="
        t(isTomskContents ? 'album.contents.tomsk.navigation' : 'album.contents.navigation')
      "
    >
      <section
        v-for="group in groupRows"
        :key="group.id"
        class="grid min-h-0 grid-cols-[10cqw_minmax(0,1fr)] items-stretch gap-[1cqw]"
      >
        <h3
          class="grid min-w-0 place-items-center overflow-hidden border-r border-ink/15 px-[0.4cqw] text-center text-[clamp(6px,1cqw,15px)] font-black uppercase leading-tight tracking-[0.03em] text-coral"
        >
          {{
            isTomskContents
              ? t(`album.contents.tomsk.group${group.id}`)
              : t('album.contents.group', { group: group.id })
          }}
        </h3>

        <div
          class="grid min-h-0 gap-[1.35cqw]"
          :class="
            isTomskContents && group.teams.length === 1 ? 'flex justify-center' : 'grid-cols-4'
          "
        >
          <button
            v-for="team in group.teams"
            :key="team.id"
            class="group min-h-0 rounded-[1.1cqw] border border-ink/10 bg-paper px-[0.8cqw] shadow-[0_0.45cqw_1.2cqw_rgb(var(--color-ink)/0.1)] transition duration-200 hover:-translate-y-[0.25cqw] hover:border-coral/45 hover:bg-white/70 hover:shadow-[0_0.7cqw_1.6cqw_rgb(var(--color-ink)/0.16)] focus-visible:outline focus-visible:outline-[0.3cqw] focus-visible:outline-offset-[0.25cqw] focus-visible:outline-gold"
            :class="
              isTomskContents
                ? [
                    'flex flex-col items-center justify-start gap-[0.65cqw] pb-[0.9cqw] pt-[0.8cqw]',
                    group.teams.length === 1 ? 'w-[23.5%]' : '',
                  ]
                : 'grid place-items-center'
            "
            type="button"
            :aria-label="
              isTomskContents
                ? t('album.contents.tomsk.openEra', { era: t(team.nameKey) })
                : t('album.contents.openTeam', { team: t(team.nameKey) })
            "
            :title="t(team.nameKey)"
            @click="emit('select', team.pageId)"
          >
            <LoadableImage
              class="select-none"
              image-class="transition-transform duration-200 group-hover:scale-105"
              :class="
                isTomskContents
                  ? 'h-[38%] min-h-0 w-[82%] shrink-0'
                  : 'aspect-[3/2] w-[82%]'
              "
              :src="team.flag"
              alt=""
              fit="contain"
            />
            <strong
              v-if="isTomskContents"
              class="text-center text-[clamp(10px,1.35cqw,21px)] font-black uppercase leading-[1.05] tracking-[-0.025em]"
            >
              {{ t(team.nameKey) }}
            </strong>
            <span
              v-if="isTomskContents && team.descriptionKey"
              class="flex min-h-[35%] max-w-[94%] flex-1 items-start justify-center text-center text-lg font-semibold leading-[1.28] text-ink/70"
            >
              {{ t(team.descriptionKey) }}
            </span>
          </button>
        </div>
      </section>
    </nav>

    <footer
      class="absolute bottom-[3.1%] text-[clamp(10px,1.45cqw,22px)] font-extrabold tracking-[-0.03em] text-coral"
      :class="pageNumber % 2 === 0 ? 'left-[10.3%]' : 'right-[10.3%]'"
      aria-hidden="true"
    >
      {{ String(pageNumber).padStart(2, '0') }}
    </footer>
  </section>
</template>
