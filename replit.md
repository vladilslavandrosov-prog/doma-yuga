# Клиентский портал «Дома Юга»

Веб-приложение для строительной компании — клиентский портал для отслеживания строительных проектов.

## Стек технологий
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, wouter
- **Backend**: Express 5, TypeScript, express-session
- **БД**: PostgreSQL (Drizzle ORM), currently using MemStorage with demo data
- **Формы**: React Hook Form + Zod

## Структура проекта
```
client/src/
  pages/          - Login, About, Dashboard, Estimates, Payments, Documents, Photos, Videos, Chat
  components/     - ThemeProvider, app-sidebar, ui/ (shadcn components)
  lib/            - queryClient, utils, auth (AuthContext + useAuth hook)
  hooks/          - use-toast, use-mobile
server/
  index.ts        - Express entry point + express-session + static /uploads
  routes.ts       - API routes: auth, data, admin CRUD, photo upload
  storage.ts      - IStorage interface + MemStorage with demo data
  vite.ts         - Vite dev server middleware
shared/
  schema.ts       - Drizzle schema
uploads/          - Загруженные фото (served at /uploads/*)
```

## Маршруты
- `/` — О компании (публичная страница)
- `/cabinet` — Дашборд (личный кабинет)
- `/cabinet/estimates` — Сметы
- `/cabinet/payments` — Оплата
- `/cabinet/documents` — Документы
- `/cabinet/photos` — Фотоотчёт
- `/cabinet/videos` — Видео объекта
- `/cabinet/chat` — Чат
- `/login` — Страница входа
- Без авторизации кабинет работает в демо-режиме (плашка «Демо-режим»)

## Авторизация
- Авторизация **необязательна** — сайт полностью доступен без входа (только просмотр)
- express-session для серверных сессий
- Роли: `admin` (полный доступ + CRUD) и `client` (только чтение + чат)
- Демо-пользователи: admin/admin123 (админ), client/client123 (клиент)
- Вход через страницу /login (кнопка «Войти» в футере сайдбара)
- Middleware: requireAuth (только для отправки сообщений), requireAdmin (для CRUD операций)
- Все GET-маршруты данных — публичные (не требуют авторизации)

## Admin CRUD маршруты
- POST/DELETE /api/admin/estimate-items — создание/удаление позиций сметы
- PATCH /api/admin/estimate-items/:id — обновление позиции
- POST/DELETE /api/admin/payments — создание/удаление платежей
- POST/DELETE /api/admin/documents — создание/удаление документов
- POST/DELETE /api/admin/photos — создание/удаление фото
- POST /api/admin/videos/upload — загрузка видеофайла
- POST/DELETE /api/admin/videos — создание/удаление видео (по URL)

## Цветовая схема
«Тёплый камень и терракота» — Primary: терракотовый оранжевый (hsl 25 90% 55%), Sidebar: тёмно-синий графит (hsl 220 18% 18%), Dark mode: графитово-синий фон.

## Загрузка файлов
- Загрузка фото и видео через multipart/form-data (multer)
- Файлы сохраняются в папку `uploads/`, доступны по `/uploads/<filename>`
- Ограничение: изображения и видео, максимум 100 МБ
- Endpoints: POST /api/admin/photos/upload, POST /api/admin/videos/upload (требуют роль admin)

## Ключевые особенности
- Авторизация с разделением ролей (admin/client)
- Sidebar-навигация с 7 разделами (включая «О компании»)
- Админ-панель: добавление/удаление записей через диалоговые формы
- Тёмная/светлая тема с переключателем
- Адаптивный дизайн (карточки на мобильных, таблицы на десктопе)
- Демо-данные в MemStorage (uid: demo-uid-123, projectId: 1)
- Чат с отправкой сообщений и пометкой прочитанных
- Sidebar footer: имя пользователя, роль, кнопка выхода

## GitHub
Repository: vladilslavandrosov-prog/website (main branch)
