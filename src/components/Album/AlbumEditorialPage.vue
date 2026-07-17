<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface AlbumReleaseNote {
  version: string
  title: string
  items: string[]
}

interface Props {
  pageNumber: number
  logo: string
  projectIntro: string
  currentItems: string[]
  nextItems: string[]
  futureItems: string[]
  releaseSeries: string
  releases: AlbumReleaseNote[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <div
    class="editorial-page absolute inset-0 overflow-hidden text-[#17212b] [container-type:inline-size] [font-family:Inter,ui-sans-serif,system-ui,sans-serif] [&_*]:box-border [&_*::after]:box-border [&_*::before]:box-border"
    :class="`editorial-page--${pageNumber}`"
  >
    <section
      v-if="pageNumber === 1"
      class="cover-page relative h-full w-full text-[#f7f3eb]"
      :aria-label="t('album.editorial.coverAria')"
    >
      <div class="cover-page__brand absolute left-[3.5%] top-[5.2%] w-[45%]">
        <img class="cover-page__logo block h-auto w-full object-contain" :src="logo" alt="" />
        <span
          class="cover-page__edition block [margin:-4.2cqw_0_1.5cqw_2.7cqw] text-[clamp(7px,1.02cqw,15px)] font-extrabold uppercase tracking-[0.2em] text-[#e5b95c] max-md:text-[clamp(4px,1.02cqw,7px)]"
          >{{ t('album.editorial.edition') }}</span
        >
        <p
          class="[margin:0_0_0_2.7cqw] text-[clamp(9px,1.6cqw,24px)] [font-weight:750] leading-[1.35] tracking-[0.025em] text-[#b9d8c2] max-md:text-[clamp(6px,1.6cqw,9px)]"
        >
          {{ t('album.editorial.mottoFirst') }}<br />{{ t('album.editorial.mottoSecond') }}
        </p>
      </div>

      <div
        class="cover-page__caption absolute bottom-[12.2%] left-[6.2%] grid w-[31%] gap-[0.55cqw] text-[#17212b]"
      >
        <span
          class="text-[clamp(7px,0.95cqw,14px)] font-black uppercase tracking-[0.17em] text-[#e86b52] max-md:text-[clamp(4px,0.95cqw,7px)]"
          >{{ t('album.title') }}</span
        >
        <strong
          class="text-[clamp(10px,1.45cqw,22px)] leading-[1.15] max-md:text-[clamp(6px,1.45cqw,10px)]"
          >{{ t('album.editorial.interactiveAlbum') }}</strong
        >
      </div>

      <footer
        class="cover-page__footer absolute bottom-[3.6%] left-[6.2%] right-[4.4%] flex justify-between text-[clamp(6px,0.78cqw,12px)] font-extrabold uppercase tracking-[0.15em] text-[#e5b95c] max-md:text-[clamp(4px,0.9cqw,7px)]"
      >
        <span>{{ t('album.editorial.collectionEdition') }}</span>
        <span>{{ t('album.editorial.volume') }}</span>
      </footer>
    </section>

    <section
      v-else-if="pageNumber === 2"
      class="info-page h-full w-full [padding:13.3%_6.8%_5.4%_13.2%]"
      :aria-label="t('album.editorial.infoAria')"
    >
      <header
        class="editorial-header grid grid-cols-[1.18fr_0.82fr] items-end gap-[5cqw] border-b-[max(1px,0.1cqw)] border-solid border-[rgb(23_33_43_/_28%)] pb-[3.2cqw]"
      >
        <span
          class="editorial-kicker col-span-full text-[clamp(7px,0.92cqw,14px)] font-black uppercase tracking-[0.2em] text-[#e86b52] max-md:text-[clamp(4px,0.9cqw,7px)]"
          >{{ t('album.editorial.infoKicker') }}</span
        >
        <h2
          class="m-0 text-[clamp(19px,3.8cqw,58px)] [font-weight:950] leading-[0.95] tracking-[-0.055em] max-md:text-[clamp(12px,3.8cqw,19px)]"
        >
          {{ t('album.editorial.infoTitleFirst') }}<br />{{ t('album.editorial.infoTitleSecond') }}
        </h2>
        <p
          class="m-0 text-[clamp(7px,1.18cqw,18px)] [font-weight:560] leading-[1.5] max-md:text-[clamp(4.5px,1.18cqw,7px)]"
        >
          {{ projectIntro }}
        </p>
      </header>

      <div class="info-page__grid mt-[3.4cqw] grid grid-cols-[1.05fr_0.95fr] gap-[2.6cqw_4.8cqw]">
        <article
          class="info-block info-block--primary grid min-w-0 row-span-2 grid-cols-[2.5cqw_1fr] gap-[1.5cqw] border-r-[max(1px,0.1cqw)] border-solid border-[rgb(23_33_43_/_22%)] pr-[4.4cqw]"
        >
          <span
            class="info-block__index grid h-[2.4cqw] w-[2.4cqw] place-items-center rounded-full bg-[#e5b95c] text-[clamp(6px,0.78cqw,12px)] [font-weight:950] text-[#17212b] max-md:text-[clamp(4px,0.9cqw,7px)]"
            >{{ t('album.editorial.currentIndex') }}</span
          >
          <div>
            <h3
              class="m-0 text-[clamp(9px,1.38cqw,21px)] font-black leading-[1.15] tracking-[-0.025em] max-md:text-[clamp(5.5px,1.38cqw,9px)]"
            >
              {{ t('album.editorial.currentMvp') }}
            </h3>
            <ul class="grid list-none gap-[0.72cqw] [margin:1.25cqw_0_0] p-0">
              <li
                v-for="item in currentItems"
                :key="item"
                class="relative pl-[1.4cqw] text-[clamp(7px,0.98cqw,15px)] [font-weight:570] leading-[1.35] before:absolute before:left-0 before:top-[0.54em] before:h-[0.45cqw] before:w-[0.45cqw] before:rounded-full before:bg-[#e86b52] before:content-[''] max-md:text-[clamp(4.5px,0.98cqw,7px)]"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </article>

        <article class="info-block grid min-w-0 grid-cols-[2.5cqw_1fr] gap-[1.5cqw]">
          <span
            class="info-block__index grid h-[2.4cqw] w-[2.4cqw] place-items-center rounded-full bg-[#e5b95c] text-[clamp(6px,0.78cqw,12px)] [font-weight:950] text-[#17212b] max-md:text-[clamp(4px,0.9cqw,7px)]"
            >{{ t('album.editorial.nextIndex') }}</span
          >
          <div>
            <h3
              class="m-0 text-[clamp(9px,1.38cqw,21px)] font-black leading-[1.15] tracking-[-0.025em] max-md:text-[clamp(5.5px,1.38cqw,9px)]"
            >
              {{ t('album.editorial.nextSteps') }}
            </h3>
            <ul class="grid list-none gap-[0.72cqw] [margin:1.25cqw_0_0] p-0">
              <li
                v-for="item in nextItems"
                :key="item"
                class="relative pl-[1.4cqw] text-[clamp(7px,0.98cqw,15px)] [font-weight:570] leading-[1.35] before:absolute before:left-0 before:top-[0.54em] before:h-[0.45cqw] before:w-[0.45cqw] before:rounded-full before:bg-[#e86b52] before:content-[''] max-md:text-[clamp(4.5px,0.98cqw,7px)]"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </article>

        <article class="info-block grid min-w-0 grid-cols-[2.5cqw_1fr] gap-[1.5cqw]">
          <span
            class="info-block__index grid h-[2.4cqw] w-[2.4cqw] place-items-center rounded-full bg-[#e5b95c] text-[clamp(6px,0.78cqw,12px)] [font-weight:950] text-[#17212b] max-md:text-[clamp(4px,0.9cqw,7px)]"
            >{{ t('album.editorial.futureIndex') }}</span
          >
          <div>
            <h3
              class="m-0 text-[clamp(9px,1.38cqw,21px)] font-black leading-[1.15] tracking-[-0.025em] max-md:text-[clamp(5.5px,1.38cqw,9px)]"
            >
              {{ t('album.editorial.futureIdeas') }}
            </h3>
            <ul class="grid list-none gap-[0.72cqw] [margin:1.25cqw_0_0] p-0">
              <li
                v-for="item in futureItems"
                :key="item"
                class="relative pl-[1.4cqw] text-[clamp(7px,0.98cqw,15px)] [font-weight:570] leading-[1.35] before:absolute before:left-0 before:top-[0.54em] before:h-[0.45cqw] before:w-[0.45cqw] before:rounded-full before:bg-[#e86b52] before:content-[''] max-md:text-[clamp(4.5px,0.98cqw,7px)]"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </article>
      </div>

      <footer
        class="paper-page-number absolute bottom-[3.1%] left-[13.2%] right-[6.8%] flex items-baseline justify-between text-[clamp(6px,0.72cqw,11px)] font-extrabold uppercase tracking-[0.17em] text-[rgb(23_33_43_/_54%)] max-md:text-[clamp(4px,0.9cqw,7px)]"
      >
        {{ t('app.title') }}
        <strong
          class="text-[clamp(10px,1.45cqw,22px)] tracking-[-0.03em] text-[#e86b52] max-md:text-[clamp(6px,1.45cqw,10px)]"
          >02</strong
        >
      </footer>
    </section>

    <section
      v-else-if="pageNumber === 3"
      class="changelog-page h-full w-full [padding:13.3%_12.3%_5.4%_7.5%]"
      :aria-label="t('album.editorial.changelogAria')"
    >
      <header
        class="editorial-header editorial-header--changelog grid grid-cols-[0.62fr_1.38fr] items-start gap-[5cqw] border-b-[max(1px,0.1cqw)] border-solid border-[rgb(23_33_43_/_28%)] pb-[3.2cqw]"
      >
        <span
          class="editorial-kicker col-auto pt-[0.45cqw] text-[clamp(7px,0.92cqw,14px)] font-black uppercase tracking-[0.2em] text-[#e86b52] max-md:text-[clamp(4px,0.9cqw,7px)]"
          >{{ t('album.editorial.changelogKicker') }}</span
        >
        <div>
          <h2
            class="m-0 text-[clamp(19px,3.8cqw,58px)] [font-weight:950] leading-[0.95] tracking-[-0.055em] max-md:text-[clamp(12px,3.8cqw,19px)]"
          >
            {{ t('album.editorial.changelogTitleFirst') }}<br />{{
              t('album.editorial.changelogTitleSecond')
            }}
          </h2>
          <p
            class="mb-0 ml-0 mr-0 mt-[1.2cqw] text-[clamp(7px,0.92cqw,14px)] font-extrabold uppercase leading-[1.5] tracking-[0.08em] text-[rgb(23_33_43_/_60%)] max-md:text-[clamp(4.5px,1.18cqw,7px)]"
          >
            {{ t('album.editorial.releaseSummary', { series: releaseSeries }) }}
          </p>
        </div>
      </header>

      <div
        class="release-list relative mt-[3cqw] grid gap-[2.15cqw] pl-[2.5cqw] before:absolute before:bottom-[0.7cqw] before:left-0 before:top-[0.7cqw] before:w-[max(1px,0.12cqw)] before:bg-[#e5b95c] before:content-['']"
      >
        <article
          v-for="release in releases"
          :key="release.version"
          class="release-note relative grid grid-cols-[12cqw_1fr] gap-[3.4cqw] before:absolute before:left-[-3.05cqw] before:top-[0.45cqw] before:h-[1.15cqw] before:w-[1.15cqw] before:rounded-full before:border-[max(1px,0.14cqw)] before:border-solid before:border-[#e5b95c] before:bg-[#f7f3eb] before:content-['']"
        >
          <div
            class="release-note__version text-[clamp(10px,1.62cqw,25px)] [font-weight:950] tracking-[-0.04em] text-[#e86b52] max-md:text-[clamp(6px,1.62cqw,10px)]"
          >
            v{{ release.version }}
          </div>
          <div class="release-note__body min-w-0">
            <h3
              class="m-0 text-[clamp(9px,1.38cqw,21px)] font-black leading-[1.15] tracking-[-0.025em] max-md:text-[clamp(5.5px,1.38cqw,9px)]"
            >
              {{ release.title }}
            </h3>
            <ul class="grid list-none grid-cols-2 gap-[1.3cqw_2.5cqw] [margin:1.25cqw_0_0] p-0">
              <li
                v-for="item in release.items.slice(0, 2)"
                :key="item"
                class="relative pl-[1.4cqw] text-[clamp(7px,0.98cqw,15px)] [font-weight:570] leading-[1.35] before:absolute before:left-0 before:top-[0.54em] before:h-[0.45cqw] before:w-[0.45cqw] before:rounded-full before:bg-[#b9d8c2] before:content-[''] before:[box-shadow:inset_0_0_0_max(1px,0.08cqw)_rgb(23_33_43_/_20%)] max-md:text-[clamp(4.5px,0.98cqw,7px)]"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </article>
      </div>

      <footer
        class="paper-page-number paper-page-number--right paper-page-number--number-only absolute bottom-[3.1%] left-[7.5%] right-[12.3%] flex items-baseline justify-end text-[clamp(6px,0.72cqw,11px)] font-extrabold uppercase tracking-[0.17em] text-[rgb(23_33_43_/_54%)] max-md:text-[clamp(4px,0.9cqw,7px)]"
      >
        <strong
          class="text-[clamp(10px,1.45cqw,22px)] tracking-[-0.03em] text-[#e86b52] max-md:text-[clamp(6px,1.45cqw,10px)]"
          >03</strong
        >
      </footer>
    </section>
  </div>
</template>
