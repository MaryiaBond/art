# ART v1.0

Local-first приложение для изучения истории искусства: Vue 3 PWA без аккаунтов и серверной пользовательской базы. Проверенный общий каталог поставляется со статикой, а личные уроки, прогресс, ответы, избранное, цвета и заметки живут только в IndexedDB устройства.


## Deploy

npx netlify-cli@latest deploy --prod


## Состав релиза

- 11 опубликованных исторических разделов — от доисторического до современного искусства;
- 15 произведений с локальными репродукциями, музейными источниками и сведениями о правах;
- 11 официальных интерактивных уроков и 4 конечные тренировочные сессии;
- библиотека «Мои уроки» с поиском, фильтрами, продолжением и повторным прохождением;
- разбор реальных ошибок и отдельные сессии повторения;
- персональные структурированные уроки Gemini без HTML и без передачи личных данных профиля;
- «Автопортрет»: галерея, цвета, эмоциональные палитры, заметки, статистика и история;
- версионированный экспорт/импорт локального архива с режимами объединения и замены;
- закрытая от production-сборки редакторская мастерская с ручным утверждением материалов.

Интерфейс остаётся нейтральным и минималистичным. Хедер находится в потоке документа, нижняя навигация закреплена с учётом safe-area, SVG встроены в DOM и совместимы с WebKit.

## Локальный запуск

```bash
npm test
npm run build
cd dist
python3 -m http.server 8080 --bind 127.0.0.1
```

Открой `http://127.0.0.1:8080`. Не открывай `index.html` через `file://`: ES-модули, service worker и IndexedDB требуют HTTP-контекст.

Статический сервер не запускает Netlify Functions. Для персональных AI-уроков используй актуальный Netlify CLI из корня проекта:

```bash
npx netlify dev
```

## Данные и offline

`data/catalog.js` — опубликованный каталог. Каждое произведение имеет стабильный ID, атрибуцию, датировку, период, регион, материал, технику, признаки, палитру, музейную запись, источник изображения, лицензию и статус проверки. Репродукции находятся в `assets/artworks/` и входят в precache service worker, поэтому опубликованные уроки доступны после установки/первого успешного обновления PWA без сети.

Личная схема `art-local-v1`, версия архива `2`, разделена на сущности:

- избранное и сохранённые цвета;
- эмоциональные палитры и рефлексии;
- персональные уроки и прогресс уроков;
- тренировочные сессии, история ответов и результаты повторения.

Импорт сначала валидируется. Объединение не удаляет существующие записи; полная замена и очистка требуют явного действия пользователя. Старые схемы намеренно не мигрируются.

Проверка каталога без сети:

```bash
npm run catalog:verify
```

Дополнительная проверка доступности внешних музейных, лицензионных и image-source URL:

```bash
npm run catalog:verify -- --network
```

Сетевой результат может зависеть от rate limit, защиты от ботов и временной доступности сайтов; публикационный статус всё равно требует ручной редакторской проверки.

## Gemini

Ключ хранится только в окружении Netlify Function. В браузерную сборку он не попадает.

Переменные:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
AI_PUBLIC_ENABLED=true
```

`AI_PUBLIC_ENABLED` по умолчанию выключен. Перед публичным включением настрой квоты, бюджет и оповещения у провайдера. Function ограничивает тело запроса и частоту до трёх запросов на IP в час. Для Gemini 3 используется минимальный thinking level, структурированный JSON и серверная семантическая проверка всех `artworkId`/`questionId`. Таймаут 45 секунд остаётся ниже 60-секундного синхронного лимита Netlify Functions.

Безопасная диагностика модели:

```bash
GEMINI_API_KEY='...' npm run diagnose:gemini
```

Она отправляет только короткое техническое сообщение, не пользовательский урок. Логи содержат операцию, модель, длительность, HTTP-статус и тип ошибки, но не ключ и не полный prompt. Ошибки timeout, 400, 401/403, 429, 5xx, envelope JSON, output JSON и валидации урока разделены. При ошибке приложение не подменяет ответ выдуманным уроком, а сохраняет локальные данные и показывает понятную причину.

## Редакторская мастерская

Мастерская обслуживается только локально и не копируется в `dist`:

```bash
npm run studio
# открыть http://127.0.0.1:8090/studio/
```

Она ищет записи Met Museum API, формирует/загружает редакторский пакет, показывает источники, позволяет менять структуру и отмечать четыре обязательные проверки. Gemini-черновик создаётся отдельно:

```bash
GEMINI_API_KEY='...' npm run editorial:generate -- renaissance
GEMINI_API_KEY='...' npm run editorial:regenerate-block -- editorial/drafts/<file>.json <block-id>
npm run editorial:validate -- editorial/drafts/<file>.json
```

Публикация возможна только для пакета со статусом `approved`, именем редактора, датой утверждения, полностью отмеченным checklist и всеми источниками в состоянии `verified`:

```bash
npm run editorial:validate -- editorial/drafts/<file>.json --approved
npm run editorial:publish -- editorial/drafts/<file>.json
npm test
npm run build
```

Команда публикации сохраняет утверждённый пакет в `editorial/approved/` и пересобирает `data/editorial-approved.js`. Ни генерация, ни preview не публикуют материал автоматически.

## Production / Netlify

Настройки сайта:

```text
Build command: node scripts/build.mjs
Publish directory: dist
Functions directory: netlify/functions
```

Предпросмотр и production deploy:

```bash
npx netlify deploy --build
npx netlify deploy --build --prod
```

`scripts/build.mjs` пересоздаёт `dist` по белому списку. Туда не попадают `.env`, серверные модули, мастерская, CLI и редакторские черновики.

## Структура

```text
index.html                       Vue-шаблоны экранов
src/app.js                       маршрутизация и UI-состояние
src/storage.js                   IndexedDB и архив v3
src/practice.js                  конечные сессии и повторение ошибок
src/icons.js                     WebKit-safe inline SVG
src/styles.css                   адаптивная дизайн-система
data/catalog.js                  опубликованный каталог
data/editorial-approved.js       сгенерированные утверждённые дополнения
assets/artworks/                 локальные репродукции
netlify/functions/ai-lesson.mjs  публичный AI endpoint
server/gemini.mjs                server-only Gemini adapter/validation
studio/                          локальная редакторская мастерская
scripts/                         build, диагностика и editorial CLI
tests/                           каталог, Gemini, storage, practice, icons
```

Полезные первичные документы: [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Gemini 3 thinking](https://ai.google.dev/gemini-api/docs/generate-content/gemini-3), [Netlify Functions limits](https://docs.netlify.com/build/functions/configuration/), [Netlify environment variables](https://docs.netlify.com/build/functions/environment-variables/).

Vue.js 3.5.13 распространяется по лицензии MIT. Эмоции и ассоциации в ART — добровольная саморефлексия, не психологическая диагностика.
