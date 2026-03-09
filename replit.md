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
  pages/          - Login, About, Dashboard, Estimates, Payments, Documents, Photos, Chat
  components/     - ThemeProvider, app-sidebar, ui/ (shadcn components)
  lib/            - queryClient, utils, auth (AuthContext + useAuth hook)
  hooks/          - use-toast, use-mobile
server/
  index.ts        - Express entry point + express-session setup
  routes.ts       - API routes: auth (/api/auth/*), data (/api/project/:id/*), admin CRUD (/api/admin/*)
  storage.ts      - IStorage interface + MemStorage with demo data
  vite.ts         - Vite dev server middleware
shared/
  schema.ts       - Drizzle schema: clients, projects, estimates, estimateItems, payments, documents, photos, messages, users
```

## Авторизация
- express-session для серверных сессий
- Роли: `admin` (полный доступ + CRUD) и `client` (только чтение + чат)
- Демо-пользователи: admin/admin123 (админ), client/client123 (клиент)
- Middleware: requireAuth (проверка сессии), requireAdmin (проверка роли)
- Публичные маршруты: /api/auth/login, /api/auth/logout, /api/auth/me

## Admin CRUD маршруты
- POST/DELETE /api/admin/estimate-items — создание/удаление позиций сметы
- PATCH /api/admin/estimate-items/:id — обновление позиции
- POST/DELETE /api/admin/payments — создание/удаление платежей
- POST/DELETE /api/admin/documents — создание/удаление документов
- POST/DELETE /api/admin/photos — создание/удаление фото

## Цветовая схема
«Тёплый камень и терракота» — Primary: терракотовый оранжевый (hsl 25 90% 55%), Sidebar: тёмно-синий графит (hsl 220 18% 18%), Dark mode: графитово-синий фон.

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
