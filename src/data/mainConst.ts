import type {
  CardFinish,
  CardKind,
  CardRarity,
  CardSeries,
  CoachRole,
  PlayerPosition,
} from '../types/cardCatalog.ts'

interface PackConfig {
  cardsPerPack: number
  rarityOdds: Record<CardRarity, number>
}

/** Стоимость одного стандартного пака в игровых монетах. */
export const PACK_PRICE: number = 20

/** Количество карточек, которое игрок получает из одного стандартного пака. */
export const CARDS_PER_PACK: number = 5

/** Настройки версии алгоритма выпадения и базового веса карточки. */
export const DROP_ENGINE_CONFIG = {
  // Вес выбора карточки, если он не указан в её каталоге.
  defaultSelectionWeight: 1,
}

/** Конфигурации содержимого и вероятностей выпадения для каждого типа пака. */
export const PACK_CONFIGS = {
  standard: {
    // Число карточек в стандартном паке.
    cardsPerPack: CARDS_PER_PACK,
    // Процентная вероятность выбора каждой редкости до нормализации доступного пула.
    rarityOdds: {
      common: 91.61,
      uncommon: 4,
      rare: 4,
      epic: 0.31,
      legendary: 0.08,
    },
  },
} satisfies Record<string, PackConfig>

/** Метаданные коллекции, используемые при загрузке и проверке каталогов команд. */
export const COLLECTION_CONFIG = {
  // Идентификатор текущей коллекции карточек.
  id: 'wc-26',
  // Ожидаемое количество командных каталогов в полной коллекции.
  expectedTeamCount: 48,
  // Количество базовых слотов альбома, отведённое одной команде.
  baseAlbumSlotsPerTeam: 20,
}

interface CardCatalogConfig {
  schemaVersion: 2
  kinds: CardKind[]
  positions: PlayerPosition[]
  coachRoles: CoachRole[]
  rarities: CardRarity[]
  series: CardSeries[]
  finishes: CardFinish[]
  defaults: {
    rarity: CardRarity
    series: CardSeries
    finish: CardFinish
    selectionWeight: number
  }
}

/** Справочники и значения по умолчанию для схемы каталога карточек. */
export const CARD_CATALOG_CONFIG: CardCatalogConfig = {
  // Версия структуры JSON-каталогов карточек.
  schemaVersion: 2,
  // Допустимые типы сущностей на карточках.
  kinds: ['team', 'coach', 'player'],
  // Допустимые игровые позиции футболистов.
  positions: ['GK', 'DF', 'MF', 'FW'],
  // Допустимые роли тренерского штаба.
  coachRoles: ['HEAD_COACH'],
  // Полный перечень редкостей карточек.
  rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
  // Полный перечень серий карточек.
  series: ['base', 'special', 'moment', 'legend'],
  // Полный перечень вариантов отделки карточек.
  finishes: ['standard', 'foil', 'holographic'],
  defaults: {
    // Редкость карточки при отсутствии собственного значения.
    rarity: 'common',
    // Серия карточки при отсутствии собственного значения.
    series: 'base',
    // Отделка карточки при отсутствии собственного значения.
    finish: 'standard',
    // Вес выбора карточки при отсутствии собственного значения.
    selectionWeight: 1,
  },
}

/** Баланс энергии, награды и отображения дробных значений кликера. */
export const CLICKER_CONFIG = {
  // Базовая награда за клик до применения бонуса прогресса альбома.
  baseReward: 1,
  // Максимальный запас энергии игрока.
  energyLimit: 100,
  // Количество энергии, расходуемое одним кликом.
  energyCostPerClick: 1,
  // Время полного восстановления энергии в миллисекундах.
  fullRechargeMs: 3_600_000,
  // Число знаков после запятой для монет и наград.
  rewardPrecision: 2,
}

/** Настройки визуальных эффектов и частоты обновления экрана кликера. */
export const HOME_VIEW_CONFIG = {
  // Время жизни всплывающей награды после клика в миллисекундах.
  clickEffectDurationMs: 700,
  // Интервал обновления восстановленной энергии в миллисекундах.
  energyRefreshIntervalMs: 1_000,
}

/** Количество повторов для обмена и число предлагаемых взамен карточек. */
export const DUPLICATE_EXCHANGE_CONFIG = {
  // Количество повторов, которое требуется отдать за один обмен.
  tradeInCount: 5,
  // Количество уникальных кандидатов, показываемых после обмена.
  candidateCount: 5,
}

/** Общие и индивидуальные параметры мини-игр, выдающих бесплатный пак. */
export const PACK_HUNT_CONFIG = {
  // Пауза между двумя доступными бесплатными паками в миллисекундах.
  cooldownMs: 14_400_000,
  // Веса случайного выбора доступной мини-игры.
  games: [
    { id: 'signal', weight: 1 },
    { id: 'rack', weight: 1 },
    { id: 'machine', weight: 1 },
    { id: 'shell', weight: 1 },
    { id: 'puzzle', weight: 1 },
    { id: 'catch', weight: 1 },
  ],
  // Количество сигналов, которое нужно найти для завершения поиска.
  signalsRequired: 3,
  // Время удержания сканера над сигналом в миллисекундах.
  holdDurationMs: 3_000,
  // Задержка переноса сигнала после находки в миллисекундах.
  signalTransitionMs: 500,
  // Задержка финального завершения поиска сигнала в миллисекундах.
  signalCompletionDelayMs: 650,
  // Радиус уверенного обнаружения сигнала в процентах поля.
  detectionRadiusPercent: 11,
  // Радиус сигнала средней силы в процентах поля.
  mediumSignalRadiusPercent: 23,
  // Радиус слабого сигнала в процентах поля.
  weakSignalRadiusPercent: 40,
  // Минимальное расстояние между последовательными целями в процентах поля.
  minimumTargetDistancePercent: 38,
  // Отступ цели от края игрового поля в процентах.
  targetPaddingPercent: 16,
  // Отступ сканера от края игрового поля в процентах.
  scannerPaddingPercent: 4,
  // Шаг перемещения элементов стрелками клавиатуры в процентах поля.
  keyboardStepPercent: 4,
  // Число попыток найти достаточно удалённую позицию нового сигнала.
  targetCandidateAttempts: 40,
  // Максимальный учитываемый промежуток между кадрами поиска сигнала.
  maxFrameDeltaMs: 64,
  // Скорость потери прогресса удержания сканера в процентах от скорости набора.
  lockDecayPercent: 35,
  rack: {
    // Минимальная длительность игры со стойкой в миллисекундах.
    minimumDurationMs: 10_000,
    // Пауза между этапами игры в миллисекундах.
    stageTransitionMs: 450,
    // Начальное расстояние между стопками в процентах поля.
    stackSeparationPercent: 4,
    // Расстояние, на которое нужно раздвинуть каждую стопку.
    spreadTargetPercent: 24,
    // Время удержания пака до захвата в миллисекундах.
    gripDurationMs: 3_500,
    // Допустимое отклонение от следующей точки маршрута.
    pathTolerancePercent: 10,
    // Максимальный учитываемый промежуток между кадрами анимации.
    maxFrameDeltaMs: 64,
    // Скорость потери прогресса захвата, когда игрок отпустил пак.
    gripDecayPercent: 30,
    route: {
      // Минимальное количество точек маршрута.
      pointCountMin: 5,
      // Максимальное количество точек маршрута.
      pointCountMax: 7,
      // Минимальная X-координата промежуточной точки.
      xMinPercent: 12,
      // Максимальная X-координата промежуточной точки.
      xMaxPercent: 88,
      // Минимальная Y-координата промежуточной точки.
      yMinPercent: 12,
      // Максимальная Y-координата промежуточной точки.
      yMaxPercent: 88,
      // Нижняя граница стартовой Y-координаты.
      startYMinPercent: 72,
      // Верхняя граница стартовой Y-координаты.
      startYMaxPercent: 88,
      // Нижняя граница конечной Y-координаты.
      endYMinPercent: 12,
      // Верхняя граница конечной Y-координаты.
      endYMaxPercent: 28,
      // Минимальная длина сегмента маршрута.
      minimumSegmentLengthPercent: 24,
      // Минимальное расстояние между любыми точками маршрута.
      minimumPointSpacingPercent: 13,
      // Минимальное изменение X между соседними точками.
      minimumHorizontalChangePercent: 14,
      // Число случайных кандидатов при поиске следующей точки.
      candidateAttempts: 80,
    },
  },
  machine: {
    // Минимальная длительность игры с автоматом в миллисекундах.
    minimumDurationMs: 10_000,
    // Пауза между этапами игры в миллисекундах.
    stageTransitionMs: 450,
    // Минимальное стартовое смещение барабана.
    drumOffsetMinPercent: 28,
    // Максимальное стартовое смещение барабана.
    drumOffsetMaxPercent: 38,
    // Допустимое смещение барабана от центра.
    drumAlignmentTolerancePercent: 5,
    // Длительность полного цикла индикатора тайминга.
    timingCycleMs: 1_800,
    // Центр успешной зоны тайминга.
    timingTargetCenterPercent: 54,
    // Ширина успешной зоны тайминга.
    timingTargetWidthPercent: 24,
    // Допустимое отклонение от следующей точки маршрута.
    pathTolerancePercent: 10,
    // Интервал подавления click после pointer-события.
    pointerClickSuppressionMs: 700,
    route: {
      // Минимальное количество точек маршрута.
      pointCountMin: 5,
      // Максимальное количество точек маршрута.
      pointCountMax: 7,
      // Минимальная X-координата промежуточной точки.
      xMinPercent: 12,
      // Максимальная X-координата промежуточной точки.
      xMaxPercent: 88,
      // Минимальная Y-координата промежуточной точки.
      yMinPercent: 10,
      // Максимальная Y-координата промежуточной точки.
      yMaxPercent: 90,
      // Нижняя граница стартовой Y-координаты.
      startYMinPercent: 10,
      // Верхняя граница стартовой Y-координаты.
      startYMaxPercent: 24,
      // Нижняя граница конечной Y-координаты.
      endYMinPercent: 76,
      // Верхняя граница конечной Y-координаты.
      endYMaxPercent: 90,
      // Минимальная длина сегмента маршрута.
      minimumSegmentLengthPercent: 24,
      // Минимальное расстояние между любыми точками маршрута.
      minimumPointSpacingPercent: 13,
      // Минимальное изменение X между соседними точками.
      minimumHorizontalChangePercent: 14,
      // Число случайных кандидатов при поиске следующей точки.
      candidateAttempts: 80,
    },
  },
  shell: {
    // Настройки сложности каждого последовательного раунда.
    rounds: [
      { boxCount: 3, swapCount: 3, swapDurationMs: 950, feintChance: 0 },
      { boxCount: 3, swapCount: 5, swapDurationMs: 650, feintChance: 0.25 },
      { boxCount: 4, swapCount: 6, swapDurationMs: 600, feintChance: 0.2 },
    ],
    // Время показа расположения пака перед перемешиванием.
    revealDurationMs: 1_500,
    // Пауза перед началом перемешивания.
    preShuffleDelayMs: 500,
    // Дополнительное время первой перестановки.
    firstMoveExtraMs: 380,
    // Время показа результата выбранной коробки.
    resultDelayMs: 1_100,
    // Задержка завершения после последнего раунда.
    completionDelayMs: 900,
    // Пауза в верхней точке ложного движения.
    feintPauseMs: 200,
    // Доля длительности движения до верхней точки финта.
    feintPeakFraction: 0.55,
    // Боковой отступ коробок от границ поля.
    fieldPaddingPercent: 15,
    // Интервал обновления счётчика времени раунда.
    elapsedIntervalMs: 1_000,
  },
  puzzle: {
    // Минимальное число фрагментов пазла.
    fragmentCountMin: 4,
    // Максимальное число фрагментов пазла.
    fragmentCountMax: 6,
    // Соотношение ширины карточки к её высоте.
    cardAspectRatio: 0.7142857,
    // Степень смещения выбора изображения к редким карточкам.
    lowWeightBiasPower: 2,
    // Задержка завершения после сборки пазла.
    completionDelayMs: 900,
    // Время показа подсказки об ошибочном слоте.
    wrongSlotFeedbackMs: 1_000,
  },
  catch: {
    // Длительность игровой сессии в секундах.
    sessionDurationSeconds: 18,
    // Задержка выдачи награды после окончания сессии.
    completionDelayMs: 1_300,
    // Ширина ловца в процентах поля.
    catcherWidthPercent: 16,
    // Вертикальная позиция линии ловли.
    catchLinePercent: 82,
    // Половина вертикальной зоны допустимой ловли.
    catchBandHalfPercent: 4,
    // Дополнительный горизонтальный допуск ловли.
    catchToleranceExtraPercent: 3,
    // Скорость перемещения ловца с клавиатуры.
    keyboardMovePercentPerSecond: 85,
    // Длительность замедления после препятствия.
    stumbleDurationMs: 1_100,
    // Множитель скорости во время замедления.
    stumbleSpeedMultiplier: 0.45,
    // Начальный интервал появления предметов.
    spawnIntervalStartMs: 950,
    // Финальный интервал появления предметов.
    spawnIntervalEndMs: 480,
    // Начальная длительность падения предметов.
    fallDurationStartMs: 3_600,
    // Финальная длительность падения предметов.
    fallDurationEndMs: 2_100,
    // Минимальный случайный множитель длительности падения.
    fallDurationJitterMin: 0.85,
    // Максимальный случайный множитель длительности падения.
    fallDurationJitterMax: 1.15,
    // Начальный вес появления препятствия.
    obstacleWeightStart: 0.08,
    // Финальный вес появления препятствия.
    obstacleWeightEnd: 0.24,
    // Начальный вес появления золотого пака.
    goldenWeightStart: 0.12,
    // Финальный вес появления золотого пака.
    goldenWeightEnd: 0.16,
    // Постоянный вес появления пустого предмета.
    emptyWeight: 0.16,
    // Очки за обычный пак.
    packScore: 1,
    // Очки за золотой пак.
    goldenScore: 5,
    // Штраф за препятствие.
    obstacleScore: -3,
    // Время жизни всплывающей подписи очков.
    floatingLabelLifetimeMs: 700,
    // Начальная горизонтальная позиция ловца.
    initialCatcherXPercent: 50,
    // Начальная вертикальная позиция нового предмета.
    initialItemYPercent: -6,
    // Позиция удаления предмета за нижней границей поля.
    itemDespawnYPercent: 104,
    // Максимальный учитываемый промежуток между кадрами.
    maxFrameDeltaMs: 48,
  },
}

/** Полный размер координатного поля мини-игр в процентах. */
export const MINI_GAME_FIELD_PERCENT: number = 100

/** Тайминги и количество стадий анимации открытия пака. */
export const PACK_ANIMATION_CONFIG = {
  // Количество стадий до завершения анимации.
  stepCount: 3,
  // Интервал переключения стадий в миллисекундах.
  stepIntervalMs: 850,
  // Пауза перед событием завершения после последней стадии.
  completionDelayMs: 450,
}

/** Параметры интерактивной подготовки наклейки перед помещением в альбом. */
export const STICKER_PREPARATION_CONFIG = {
  peel: {
    // Начальная позиция ползунка снятия наклейки.
    initialPositionPercent: 12,
    // Начальная позиция движущейся цели до первого сброса.
    initialTargetPositionPercent: 70,
    // Начальная длительность движения цели до первого сброса.
    initialTargetDurationMs: 900,
    // Минимальная длительность движения цели.
    targetDurationMinMs: 650,
    // Максимальная длительность движения цели.
    targetDurationMaxMs: 1_250,
    // Минимальная позиция движущейся цели.
    targetPositionMinPercent: 22,
    // Максимальная позиция движущейся цели.
    targetPositionMaxPercent: 78,
    // Минимальная пауза между перемещениями цели.
    targetPauseMinMs: 180,
    // Максимальная пауза между перемещениями цели.
    targetPauseMaxMs: 520,
    // Минимальная позиция цели при сбросе этапа.
    resetTargetMinPercent: 38,
    // Максимальная позиция цели при сбросе этапа.
    resetTargetMaxPercent: 72,
    // Задержка первого перемещения цели.
    startDelayMs: 180,
    // Минимальная позиция ползунка внутри дорожки.
    handleMinPercent: 7,
    // Максимальная позиция ползунка внутри дорожки.
    handleMaxPercent: 93,
  },
  alignment: {
    // Начальное горизонтальное смещение наклейки.
    initialX: 38,
    // Начальное вертикальное смещение наклейки.
    initialY: -30,
    // Базовое значение формулы точности совмещения.
    accuracyBase: 101,
    // Делитель расстояния в формуле точности совмещения.
    accuracyDistanceDivisor: 2,
    // Ширина карточки для нормализации сохранённого смещения.
    cardWidth: 112,
    // Высота карточки для нормализации сохранённого смещения.
    cardHeight: 168,
    // Точность, с которой совмещение считается идеальным.
    perfectAccuracy: 95,
    // Максимальное горизонтальное смещение наклейки.
    maxX: 128,
    // Максимальное вертикальное смещение наклейки.
    maxY: 144,
  },
  press: {
    // Минимальное качество разглаживания независимо от числа ошибок.
    minimumQuality: 80,
    // Потеря качества за каждое нажатие углов не по порядку.
    mistakePenalty: 5,
  },
  // Число последовательных этапов подготовки наклейки.
  stepCount: 3,
}

/** Настройки содержимого, пагинации и адаптивного режима альбома. */
export const ALBUM_VIEW_CONFIG = {
  // Максимальное число свежих релизов одной серии на странице изменений.
  recentReleaseCount: 3,
  // Максимальное число пунктов, показываемых для одного релиза.
  releaseItemsPerNote: 2,
  // Количество команд на одной странице оглавления.
  contentsPageSize: 12,
  // Номер первой страницы оглавления.
  contentsFirstPage: 4,
  // Номер последней страницы оглавления.
  contentsLastPage: 7,
  // Media query, включающий отображение альбома разворотом.
  desktopSpreadMediaQuery: '(min-width: 1024px)',
  // Длительность анимации переворота страницы в миллисекундах.
  pageTurnDurationMs: 520,
  // Время подсветки карточки, открытой из коллекции, в миллисекундах.
  trayFocusDurationMs: 3_500,
}

/** Минимальное движение указателя в пикселях, после которого начинается drag карточки. */
export const STICKER_DRAG_THRESHOLD_PX: number = 10

/**
 * Демонстрационный режим альбома: показывает весь каталог как уже вклеенный,
 * не изменяя сохранённые данные игрока.
 */
export const PLACE_ALL_COLLECTED_CARDS: boolean = false
