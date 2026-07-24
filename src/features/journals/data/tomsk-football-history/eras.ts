import type { JournalSpreadDefinition } from '@/features/journals/types'

const spreads = [
  {
    id: 'siberian-foundation',
    title: 'Сибирский фундамент',
    subtitle: 'Люди, с которых начинается современная летопись',
    leftPage: {
      id: 'siberian-foundation-left',
      cards: [
        { cardId: 'surovtsev', position: 'top' },
        { cardId: 'zhukov', position: 'bottom-left' },
        { cardId: 'sebelev', position: 'bottom-right' },
      ],
    },
    rightPage: {
      id: 'siberian-foundation-right',
      cards: [
        { cardId: 'perednya', position: 'top' },
        { cardId: 'baryshev', position: 'bottom-left' },
        { cardId: 'familcev', position: 'bottom-right' },
      ],
    },
  },
  {
    id: 'big-stage',
    title: 'Выход на большую сцену',
    subtitle: 'Переход от региональной истории к большому футболу',
    leftPage: {
      id: 'big-stage-left',
      cards: [
        { cardId: 'klimov', position: 'top' },
        { cardId: 'yanotovsky', position: 'bottom-left' },
        { cardId: 'pareiko', position: 'bottom-right' },
      ],
    },
    rightPage: {
      id: 'big-stage-right',
      cards: [
        { cardId: 'vejic', position: 'top' },
        { cardId: 'kiselev', position: 'bottom-left' },
        { cardId: 'pogrebnyak', position: 'bottom-right' },
      ],
    },
  },
  {
    id: 'national-map',
    title: 'На футбольной карте страны',
    subtitle: 'Томская команда становится узнаваемой по всей России',
    leftPage: {
      id: 'national-map-left',
      cards: [
        { cardId: 'khomutovsky', position: 'top' },
        { cardId: 'jokic', position: 'bottom-left' },
        { cardId: 'kim-nam-il', position: 'bottom-right' },
      ],
    },
    rightPage: {
      id: 'national-map-right',
      cards: [
        { cardId: 'mladenov', position: 'top' },
        { cardId: 'maznov', position: 'bottom-left' },
        { cardId: 'dzyuba', position: 'bottom-right' },
      ],
    },
  },
  {
    id: 'new-chapter',
    title: 'Новая глава',
    subtitle: 'Память о пройденном и движение к следующей эпохе',
    leftPage: {
      id: 'new-chapter-left',
      cards: [
        { cardId: 'nagaev', position: 'top' },
        { cardId: 'simdyankin', position: 'bottom-left' },
        { cardId: 'kozlov', position: 'bottom-right' },
      ],
    },
    rightPage: {
      id: 'new-chapter-right',
      cards: [
        { cardId: 'stepanenko', position: 'top' },
        { cardId: 'kilin', position: 'bottom-left' },
        { cardId: 'dorokhov', position: 'bottom-right' },
      ],
    },
  },
] satisfies JournalSpreadDefinition[]

export default spreads
