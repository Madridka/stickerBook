# Английские клубные эмблемы — 2026/27

Полный каталог: **1088 клубов, 52 дивизиона, уровни 1–10**.
Все клубы из `england/structure.json` представлены в дивизионных `cards.json`
и имеют WebP-карточку в `public/englandClubsLogo/cards/england/`.

Championship, League One, League Two и три дивизиона National League содержат
по 24 клуба. В региональных лигах количество соответствует составу конкретного
дивизиона, а не общей норме в 24 клуба.

## Источники и воспроизводимость

- Составы NLS: [распределение FA на сезон 2026/27](https://www.thefa.com/news/2026/may/14/nls-club-allocations-2026-27).
- Источники каждой эмблемы записаны в `england/logo-sources.json`;
  уточнения прямых ссылок — в `england/logo-overrides.json`.
- Метаданные клубов находятся в `england/club-metadata.json`, подтверждённые
  уточнения со ссылками — в `england/metadata-overrides.json`.
- Неподтверждённый год основания не подменяется значением 1900: поле отсутствует
  в карточке, год не выводится на изображении.
- Карточки отрисованы существующим генератором на английском шаблоне
  `public/examples/clubLogos/template_england.webp`, размер 1024 × 1536.

Сохранены ID и URL карточек. Исходные номера и `albumSlot` берутся из каталога;
отсутствующий клуб больше не исключается молча из геометрии журнала.
Генератор изображений также не пропускает отсутствующие эмблемы.

## Сверка файлов

Составы и порядок ID всех 52 каталогов совпадают со структурой; 1088 ID уникальны,
нумерация каждого дивизиона непрерывна, все 1088 путей WebP существуют.
По действующей раскладке журнал занимает 156 страниц дивизионов и 7 вводных
страниц; последний разворот — 162–163.

| Уровень | Лига / дивизион | Карточек |
| --- | --- | ---: |
| 1 | Premier League / Premier League (PL) | 20 |
| 2 | EFL Championship / EFL Championship (CH) | 24 |
| 3 | EFL League One / EFL League One (L1) | 24 |
| 4 | EFL League Two / EFL League Two (L2) | 24 |
| 5 | National League / National League (NL) | 24 |
| 6 | National League North / National League North (NLN) | 24 |
| 6 | National League South / National League South (NLS) | 24 |
| 7 | Isthmian League - Premier / Isthmian League - Premier (IP) | 22 |
| 7 | Northern Premier League - Premier / Northern Premier League - Premier (NPP) | 22 |
| 7 | Southern League - Premier Central / Southern League - Premier Central (SPC) | 22 |
| 7 | Southern League - Premier South / Southern League - Premier South (SPS) | 22 |
| 8 | Isthmian League - South Central / Isthmian League - South Central (ISC) | 22 |
| 8 | Isthmian League - North / Isthmian League - North (IN) | 22 |
| 8 | Isthmian League - South East / Isthmian League - South East (ISE) | 22 |
| 8 | Northern Premier League - East / Northern Premier League - East (NPE) | 22 |
| 8 | Northern Premier League - West / Northern Premier League - West (NPW) | 22 |
| 8 | Northern Premier League - Midlands / Northern Premier League - Midlands (NPM) | 22 |
| 8 | Southern League - Central / Southern League - Central (SLC) | 22 |
| 8 | Southern League - South / Southern League - South (SLS) | 22 |
| 9 | Combined Counties Football League / Premier Division North (CCLN) | 20 |
| 10 | Combined Counties Football League / Division One (CCL1) | 22 |
| 9 | Combined Counties Football League / Premier Division South (CCLS) | 20 |
| 9 | Eastern Counties Football League / Premier Division (ECLP) | 20 |
| 10 | Eastern Counties Football League / Division One (ECLN) | 20 |
| 9 | Essex Senior Football League / Premier Division (ESLP) | 20 |
| 10 | Eastern Counties Football League / Eastern Senior League (ESLS) | 22 |
| 9 | Hellenic Football League / Premier Division (HLP) | 20 |
| 10 | Hellenic Football League / Division One (HL1) | 18 |
| 9 | Midland Football League / Premier Division (MLP) | 20 |
| 10 | Midland Football League / Division One (ML1) | 22 |
| 9 | North West Counties League / Premier Division (NWCP) | 20 |
| 10 | North West Counties League / Division One North (NWCN) | 22 |
| 10 | North West Counties League / First Division South (NWCS) | 20 |
| 9 | Northern Counties East Football League / Premier Division (NCEP) | 20 |
| 10 | Northern Counties East Football League / Division One (NCE1) | 22 |
| 9 | Northern Football League / Division One (NL1) | 22 |
| 10 | Northern Football League / Division Two (NL2) | 20 |
| 10 | South West Peninsula Football League / Premier Division West (SWPW) | 18 |
| 10 | South West Peninsula Football League / Premier Division East (SWPE) | 17 |
| 9 | Southern Combination / Premier Division (SCP) | 20 |
| 10 | Southern Combination / Division One (SC1) | 20 |
| 9 | Southern Counties East Football League / Premier Division (SCEP) | 18 |
| 10 | Southern Counties East Football League / Division One (SCE1) | 18 |
| 9 | Spartan South Midlands Football League / Premier Division (SSMP) | 20 |
| 10 | Spartan South Midlands Football League / Division One (SSM1) | 19 |
| 9 | United Counties Football League / Premier Division North (UCLN) | 18 |
| 10 | United Counties Football League / Division One (UCL1) | 22 |
| 9 | United Counties Football League / Premier Division South (UCLS) | 20 |
| 9 | Wessex Football League / Premier Division (WXP) | 22 |
| 10 | Wessex Football League / Division One (WX1) | 20 |
| 9 | Western Football League / Premier Division (WLP) | 20 |
| 10 | Western Football League / Premier Division (WL1) | 18 |
