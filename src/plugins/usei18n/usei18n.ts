import { createI18n, type I18n } from 'vue-i18n'
import album from '@/lang/ru/album.json'
import app from '@/lang/ru/app.json'
import common from '@/lang/ru/common.json'
import duplicateExchange from '@/lang/ru/duplicateExchange.json'
import home from '@/lang/ru/home.json'
import goals from '@/lang/ru/goals.json'
import packOpening from '@/lang/ru/packOpening.json'
import packHunt from '@/lang/ru/packHunt.json'
import shop from '@/lang/ru/shop.json'
import stickerTray from '@/lang/ru/stickerTray.json'
import stickerPreview from '@/lang/ru/stickerPreview.json'

// Объединяет локализационные JSON-файлы в единый словарь приложения
const messages: {
  ru: {
    album: typeof album
    app: typeof app
    common: typeof common
    duplicateExchange: typeof duplicateExchange
    home: typeof home
    goals: typeof goals
    packOpening: typeof packOpening
    packHunt: typeof packHunt
    shop: typeof shop
    stickerTray: typeof stickerTray
    stickerPreview: typeof stickerPreview
  }
} = {
  ru: {
    album,
    app,
    common,
    duplicateExchange,
    home,
    goals,
    packOpening,
    packHunt,
    shop,
    stickerTray,
    stickerPreview,
  },
}

// Создаёт экземпляр vue-i18n с Composition API
export const i18n: I18n = createI18n({
  legacy: false,
  warnHtmlMessage: false,
  locale: 'ru',
  messages,
})

export default i18n
