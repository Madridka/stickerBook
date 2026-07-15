import { createI18n } from 'vue-i18n'

const messages = {
  ru: {
    app: { title: 'Вклейка', home: 'Главная', album: 'Альбом', shop: 'Магазин', collection: 'Коллекция' },
    home: { eyebrow: 'StickerBook · MVP', title: 'Собирай моменты чемпионата', text: 'Твоя цифровая коллекция стикеров уже готова к первым находкам.', openAlbum: 'Открыть альбом', visitShop: 'Зайти в магазин', progress: 'Прогресс коллекции', found: 'найдено', next: 'Следующий выпуск уже скоро' },
    shop: { title: 'Магазин', text: 'Выбирай наборы для своей коллекции.', empty: 'Наборы появятся здесь на следующем этапе.' },
    album: { title: 'Альбом', text: 'Здесь будут собраны все найденные стикеры.', empty: 'В альбоме пока нет стикеров.', collection: 'Коллекция', pages: 'страниц' },
    common: { back: 'На главную', language: 'Язык' },
  },
}

export default createI18n({ legacy: false, locale: 'ru', fallbackLocale: 'ru', messages })
