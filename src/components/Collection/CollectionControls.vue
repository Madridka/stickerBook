<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

type CollectionFilter = 'all' | 'ready' | 'album'
type CollectionSort = 'status' | 'album' | 'name'

interface FilterOption {
  value: CollectionFilter
  label: string
  count: number
}

interface SelectOption {
  value: string
  label: string
}

interface Props {
  filterOptions: FilterOption[]
  teamOptions: SelectOption[]
  sortOptions: SelectOption[]
}

defineProps<Props>()
const filter = defineModel<CollectionFilter>('filter', { required: true })
const team = defineModel<string>('team', { required: true })
const sort = defineModel<CollectionSort>('sort', { required: true })
const { t } = useI18n()
</script>

<template>
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <SelectButton
      v-model="filter"
      class="!grid w-full min-w-0 max-w-full grid-cols-3 sm:!inline-flex sm:w-auto"
      :options="filterOptions"
      option-label="label"
      option-value="value"
      size="small"
      :allow-empty="false"
      :aria-label="t('album.collectionControls.filterLabel')"
      :pt="{
        pcToggleButton: {
          root: {
            class: '!min-w-0 !overflow-hidden !px-1 sm:!px-3',
          },
          content: {
            class: '!w-full !min-w-0 !overflow-hidden',
          },
        },
      }"
    >
      <template #option="{ option }">
        <span
          class="flex w-full min-w-0 max-w-full items-center justify-center gap-1 overflow-hidden text-[10px] font-black sm:text-xs"
        >
          <span class="min-w-0 truncate">{{ option.label }}</span>
          <span class="shrink-0 rounded-full bg-current/10 px-1 py-0.5 text-[10px]">
            {{ option.count }}
          </span>
        </span>
      </template>
    </SelectButton>

    <div class="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
      <label class="w-full min-w-0 sm:w-52">
        <span class="sr-only">{{ t('album.collectionControls.teamLabel') }}</span>
        <Select
          v-model="team"
          class="w-full min-w-0 text-xs font-bold"
          :options="teamOptions"
          filter
          size="small"
          option-label="label"
          option-value="value"
          :aria-label="t('album.collectionControls.teamLabel')"
          :pt="{ option: { class: 'text-xs' } }"
        />
      </label>

      <label class="w-full min-w-0 sm:w-40">
        <span class="sr-only">{{ t('album.collectionControls.sortLabel') }}</span>
        <Select
          v-model="sort"
          class="w-full min-w-0 text-xs font-bold"
          :options="sortOptions"
          size="small"
          option-label="label"
          option-value="value"
          :aria-label="t('album.collectionControls.sortLabel')"
          :pt="{ option: { class: 'text-xs' } }"
        />
      </label>
    </div>
  </div>
</template>
