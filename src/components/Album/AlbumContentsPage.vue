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

interface ContentsGroup {
  id: string
  teams: AlbumContentsTeam[]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const groupRows: ComputedRef<ContentsGroup[]> = computed((): ContentsGroup[] => {
  const teamsByGroup: Map<string, AlbumContentsTeam[]> = new Map()

  props.teams.forEach((team: AlbumContentsTeam): void => {
    const teams: AlbumContentsTeam[] = teamsByGroup.get(team.group) ?? []
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
        {{ t('album.contents.hint') }}
      </p>
    </header>

    <nav
      class="mx-auto mt-[1.8cqw] grid min-h-0 w-full flex-1 grid-rows-3 gap-[1.1cqw]"
      :aria-label="t('album.contents.navigation')"
    >
      <section
        v-for="group in groupRows"
        :key="group.id"
        class="grid min-h-0 grid-cols-[10cqw_minmax(0,1fr)] items-stretch gap-[1cqw]"
      >
        <h3
          class="grid min-w-0 place-items-center overflow-hidden border-r border-ink/15 px-[0.4cqw] text-center text-[clamp(6px,1cqw,15px)] font-black uppercase leading-tight tracking-[0.03em] text-coral"
        >
          {{ t('album.contents.group', { group: group.id }) }}
        </h3>

        <div class="grid min-h-0 grid-cols-4 gap-[1.35cqw]">
          <button
            v-for="team in group.teams"
            :key="team.id"
            class="group grid min-h-0 place-items-center rounded-[1.1cqw] border border-ink/10 bg-paper/55 px-[0.8cqw] shadow-[0_0.45cqw_1.2cqw_rgb(var(--color-ink)/0.1)] transition duration-200 hover:-translate-y-[0.25cqw] hover:border-coral/45 hover:bg-white/70 hover:shadow-[0_0.7cqw_1.6cqw_rgb(var(--color-ink)/0.16)] focus-visible:outline focus-visible:outline-[0.3cqw] focus-visible:outline-offset-[0.25cqw] focus-visible:outline-gold"
            type="button"
            :aria-label="t('album.contents.openTeam', { team: t(team.nameKey) })"
            :title="t(team.nameKey)"
            @click="emit('select', team.pageId)"
          >
            <img
              class="w-[82%] select-none rounded-[0.3cqw] border border-ink/15 object-contain shadow-[0_0.35cqw_0.6cqw_rgb(var(--color-ink)/0.2)] transition-transform duration-200 group-hover:scale-105"
              :src="team.flag"
              alt=""
              aria-hidden="true"
            />
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
