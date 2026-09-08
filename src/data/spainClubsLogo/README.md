# Испанские клубные эмблемы

Сверка файлов от 8 сентября 2026 года: **496 карточек в 27 разделах**.
Дубликатов ID, пропусков нумерации внутри групп и отсутствующих WebP нет.
В каждом файле `cards.json` значения `albumSlot` образуют непрерывную последовательность.

| Дивизион | Групп | Клубов в группе | Всего |
| --- | ---: | ---: | ---: |
| La Liga | 1 | 20 | 20 |
| Segunda División | 1 | 22 | 22 |
| Primera Federación | 2 | 20 | 40 |
| Segunda Federación | 5 | 18 | 90 |
| Tercera Federación | 18 | 18 | 324 |

Группировка журнала использует `leagueId` и номер группы в ID карточки.
Количество клубов в метаданных журнала вычисляется из каталога.

## Актуальность состава

Полнота файлов не означает актуальность переходов между дивизионами.
Состав выпуска сохранён. При сверке с [решением RFEF от 14 августа 2026 года](https://rfef.es/es/noticias/composicion-final-de-grupos-de-segunda-federacion)
обнаружены следующие расхождения, требующие отдельной актуализации:

| Клуб | В выпуске | По решению RFEF |
| --- | --- | --- |
| Calamocha | Segunda, группа 5 | Segunda, группа 2 |
| Castellón B | Segunda, группа 2 | Segunda, группа 3 |
| Puente Genil | Tercera, группа 10 | Segunda, группа 4 |
| Atlético Paso | Segunda, группа 4 | Segunda, группа 5 |

В группе 3 выпуска также остаётся La Unión Atlético; перед актуализацией
необходимо учесть отказ в регистрации и определить окончательного участника
освободившегося места Puente Genil в Tercera. Такая замена меняет клубы выпуска,
а не устраняет численный пропуск. Она не выполнена в рамках сверки файлов.

Основания размеров групп: [Primera Federación 2026/27](https://rfef.es/es/noticias/aprobados-los-grupos-de-primera-federacion-para-la-temporada-202627),
[Segunda Federación 2026/27](https://rfef.es/es/noticias/definidos-los-grupos-de-segunda-federacion-para-la-temporada-202627).
