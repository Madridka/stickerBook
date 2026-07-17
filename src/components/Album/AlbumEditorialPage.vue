<script setup lang="ts">
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
</script>

<template>
  <div class="editorial-page" :class="`editorial-page--${pageNumber}`">
    <section v-if="pageNumber === 1" class="cover-page" aria-label="Обложка StickerBook">
      <div class="cover-page__brand">
        <img class="cover-page__logo" :src="logo" alt="" />
        <span class="cover-page__edition">Digital collector's edition</span>
        <p>Собирай. Вклеивай.<br />Храни историю.</p>
      </div>

      <div class="cover-page__caption">
        <span>World Cup 2026</span>
        <strong>Интерактивный альбом</strong>
      </div>

      <footer class="cover-page__footer">
        <span>Vue 3 · TypeScript</span>
        <span>Volume 01</span>
      </footer>
    </section>

    <section v-else-if="pageNumber === 2" class="info-page" aria-label="О проекте StickerBook">
      <header class="editorial-header">
        <span class="editorial-kicker">02 / О проекте</span>
        <h2>Альбом, который<br />живёт вместе с коллекцией.</h2>
        <p>{{ projectIntro }}</p>
      </header>

      <div class="info-page__grid">
        <article class="info-block info-block--primary">
          <span class="info-block__index">A</span>
          <div>
            <h3>Текущий MVP</h3>
            <ul>
              <li v-for="item in currentItems" :key="item">{{ item }}</li>
            </ul>
          </div>
        </article>

        <article class="info-block">
          <span class="info-block__index">B</span>
          <div>
            <h3>Ближайшие шаги</h3>
            <ul>
              <li v-for="item in nextItems" :key="item">{{ item }}</li>
            </ul>
          </div>
        </article>

        <article class="info-block">
          <span class="info-block__index">C</span>
          <div>
            <h3>Будущие идеи</h3>
            <ul>
              <li v-for="item in futureItems" :key="item">{{ item }}</li>
            </ul>
          </div>
        </article>
      </div>

      <footer class="paper-page-number">StickerBook <strong>02</strong></footer>
    </section>

    <section v-else-if="pageNumber === 3" class="changelog-page" aria-label="Последние изменения StickerBook">
      <header class="editorial-header editorial-header--changelog">
        <span class="editorial-kicker">03 / Build log</span>
        <div>
          <h2>Последние<br />изменения.</h2>
          <p>Ветка {{ releaseSeries }} · три свежих патча</p>
        </div>
      </header>

      <div class="release-list">
        <article v-for="release in releases" :key="release.version" class="release-note">
          <div class="release-note__version">v{{ release.version }}</div>
          <div class="release-note__body">
            <h3>{{ release.title }}</h3>
            <ul>
              <li v-for="item in release.items.slice(0, 2)" :key="item">{{ item }}</li>
            </ul>
          </div>
        </article>
      </div>

      <footer class="paper-page-number paper-page-number--right">CHANGELOG.md <strong>03</strong></footer>
    </section>
  </div>
</template>

<style scoped>
.editorial-page {
  container-type: inline-size;
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: #17212b;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.editorial-page *,
.editorial-page *::before,
.editorial-page *::after {
  box-sizing: border-box;
}

.cover-page,
.info-page,
.changelog-page {
  height: 100%;
  width: 100%;
}

.cover-page {
  position: relative;
  color: #f7f3eb;
}

.cover-page__brand {
  position: absolute;
  left: 3.5%;
  top: 5.2%;
  width: 45%;
}

.cover-page__edition {
  display: block;
  margin: -4.2cqw 0 1.5cqw 2.7cqw;
  color: #e5b95c;
  font-size: clamp(7px, 1.02cqw, 15px);
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.cover-page__logo {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.cover-page__brand > p {
  margin: 0 0 0 2.7cqw;
  color: #b9d8c2;
  font-size: clamp(9px, 1.6cqw, 24px);
  font-weight: 750;
  letter-spacing: 0.025em;
  line-height: 1.35;
}

.cover-page__caption {
  position: absolute;
  bottom: 12.2%;
  left: 6.2%;
  display: grid;
  gap: 0.55cqw;
  width: 31%;
  color: #17212b;
}

.cover-page__caption span {
  color: #e86b52;
  font-size: clamp(7px, 0.95cqw, 14px);
  font-weight: 900;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.cover-page__caption strong {
  font-size: clamp(10px, 1.45cqw, 22px);
  line-height: 1.15;
}

.cover-page__footer {
  position: absolute;
  right: 4.4%;
  bottom: 3.6%;
  left: 6.2%;
  display: flex;
  justify-content: space-between;
  color: #e5b95c;
  font-size: clamp(6px, 0.78cqw, 12px);
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.info-page {
  padding: 13.3% 6.8% 5.4% 13.2%;
}

.changelog-page {
  padding: 13.3% 12.3% 5.4% 7.5%;
}

.editorial-header {
  display: grid;
  grid-template-columns: 1.18fr 0.82fr;
  align-items: end;
  gap: 5cqw;
  padding-bottom: 3.2cqw;
  border-bottom: max(1px, 0.1cqw) solid rgb(23 33 43 / 28%);
}

.editorial-kicker {
  grid-column: 1 / -1;
  color: #e86b52;
  font-size: clamp(7px, 0.92cqw, 14px);
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.editorial-header h2 {
  margin: 0;
  font-size: clamp(19px, 3.8cqw, 58px);
  font-weight: 950;
  letter-spacing: -0.055em;
  line-height: 0.95;
}

.editorial-header p {
  margin: 0;
  font-size: clamp(7px, 1.18cqw, 18px);
  font-weight: 560;
  line-height: 1.5;
}

.info-page__grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 2.6cqw 4.8cqw;
  margin-top: 3.4cqw;
}

.info-block {
  display: grid;
  grid-template-columns: 2.5cqw 1fr;
  gap: 1.5cqw;
  min-width: 0;
}

.info-block--primary {
  grid-row: span 2;
  padding-right: 4.4cqw;
  border-right: max(1px, 0.1cqw) solid rgb(23 33 43 / 22%);
}

.info-block__index {
  display: grid;
  width: 2.4cqw;
  height: 2.4cqw;
  place-items: center;
  border-radius: 50%;
  background: #e5b95c;
  color: #17212b;
  font-size: clamp(6px, 0.78cqw, 12px);
  font-weight: 950;
}

.info-block h3,
.release-note h3 {
  margin: 0;
  font-size: clamp(9px, 1.38cqw, 21px);
  font-weight: 900;
  letter-spacing: -0.025em;
  line-height: 1.15;
}

.info-block ul,
.release-note ul {
  display: grid;
  gap: 0.72cqw;
  margin: 1.25cqw 0 0;
  padding: 0;
  list-style: none;
}

.info-block li,
.release-note li {
  position: relative;
  padding-left: 1.4cqw;
  font-size: clamp(7px, 0.98cqw, 15px);
  font-weight: 570;
  line-height: 1.35;
}

.info-block li::before,
.release-note li::before {
  position: absolute;
  top: 0.54em;
  left: 0;
  width: 0.45cqw;
  height: 0.45cqw;
  border-radius: 50%;
  background: #e86b52;
  content: '';
}

.paper-page-number {
  position: absolute;
  right: 6.8%;
  bottom: 3.1%;
  left: 13.2%;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  color: rgb(23 33 43 / 54%);
  font-size: clamp(6px, 0.72cqw, 11px);
  font-weight: 800;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.paper-page-number strong {
  color: #e86b52;
  font-size: clamp(10px, 1.45cqw, 22px);
  letter-spacing: -0.03em;
}

.editorial-header--changelog {
  grid-template-columns: 0.62fr 1.38fr;
  align-items: start;
}

.editorial-header--changelog .editorial-kicker {
  grid-column: auto;
  padding-top: 0.45cqw;
}

.editorial-header--changelog p {
  margin-top: 1.2cqw;
  color: rgb(23 33 43 / 60%);
  font-size: clamp(7px, 0.92cqw, 14px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.release-list {
  position: relative;
  display: grid;
  gap: 2.15cqw;
  margin-top: 3cqw;
  padding-left: 2.5cqw;
}

.release-list::before {
  position: absolute;
  top: 0.7cqw;
  bottom: 0.7cqw;
  left: 0;
  width: max(1px, 0.12cqw);
  background: #e5b95c;
  content: '';
}

.release-note {
  position: relative;
  display: grid;
  grid-template-columns: 12cqw 1fr;
  gap: 3.4cqw;
}

.release-note::before {
  position: absolute;
  top: 0.45cqw;
  left: -3.05cqw;
  width: 1.15cqw;
  height: 1.15cqw;
  border: max(1px, 0.14cqw) solid #e5b95c;
  border-radius: 50%;
  background: #f7f3eb;
  content: '';
}

.release-note__version {
  color: #e86b52;
  font-size: clamp(10px, 1.62cqw, 25px);
  font-weight: 950;
  letter-spacing: -0.04em;
}

.release-note__body {
  min-width: 0;
}

.release-note ul {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.3cqw 2.5cqw;
}

.release-note li::before {
  background: #b9d8c2;
  box-shadow: inset 0 0 0 max(1px, 0.08cqw) rgb(23 33 43 / 20%);
}

.paper-page-number--right {
  right: 12.3%;
  left: 7.5%;
}

@media (max-width: 767px) {
  .cover-page__edition {
    font-size: clamp(4px, 1.02cqw, 7px);
  }

  .cover-page__brand > p {
    font-size: clamp(6px, 1.6cqw, 9px);
  }

  .cover-page__caption span {
    font-size: clamp(4px, 0.95cqw, 7px);
  }

  .cover-page__caption strong {
    font-size: clamp(6px, 1.45cqw, 10px);
  }

  .cover-page__footer,
  .editorial-kicker,
  .info-block__index,
  .paper-page-number {
    font-size: clamp(4px, 0.9cqw, 7px);
  }

  .editorial-header h2 {
    font-size: clamp(12px, 3.8cqw, 19px);
  }

  .editorial-header p,
  .editorial-header--changelog p {
    font-size: clamp(4.5px, 1.18cqw, 7px);
  }

  .info-block h3,
  .release-note h3 {
    font-size: clamp(5.5px, 1.38cqw, 9px);
  }

  .info-block li,
  .release-note li {
    font-size: clamp(4.5px, 0.98cqw, 7px);
  }

  .paper-page-number strong {
    font-size: clamp(6px, 1.45cqw, 10px);
  }

  .release-note__version {
    font-size: clamp(6px, 1.62cqw, 10px);
  }
}
</style>
