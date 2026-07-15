import { createI18n, type I18n } from 'vue-i18n'
import album from '@/lang/ru/album.json'
import app from '@/lang/ru/app.json'
import common from '@/lang/ru/common.json'
import home from '@/lang/ru/home.json'
import shop from '@/lang/ru/shop.json'

// Собирает русские сообщения из отдельных файлов lang
const messages: {
  ru: {
    album: typeof album
    app: typeof app
    common: typeof common
    home: typeof home
    shop: typeof shop
  }
} = {
  ru: { album, app, common, home, shop },
}

export const i18n: I18n = createI18n({
  legacy: false,
  warnHtmlMessage: false,
  locale: 'ru',
  messages,
})

export default i18n
