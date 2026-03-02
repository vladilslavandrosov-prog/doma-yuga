# Клиентский портал «Дома Юга»

Веб-приложение для строительной компании — клиентский портал для отслеживания строительных проектов.

## Стек технологий
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, wouter
- **Backend**: Express 5, TypeScript
- **БД**: PostgreSQL (Drizzle ORM), currently using MemStorage with demo data
- **Формы**: React Hook Form + Zod

## Структура проекта
```
client/src/
  pages/          - Dashboard, About, Estimates, Payments, Documents, Photos, Chat
  components/     - ThemeProvider, app-sidebar, ui/ (shadcn components)
  lib/            - queryClient, utils
  hooks/          - use-toast, use-mobile
server/
  index.ts        - Express entry point
  routes.ts       - API routes (/api/dashboard, /api/project/:id/*, /api/client/:uid)
  storage.ts      - IStorage interface + MemStorage with demo data
  vite.ts         - Vite dev server middleware
shared/
  schema.ts       - Drizzle schema: clients, projects, estimates, estimateItems, payments, documents, photos, messages
```

## Цветовая схема
«Тёплый камень и терракота» — Primary: терракотовый оранжевый (hsl 25 90% 55%), Sidebar: тёмно-синий графит (hsl 220 18% 18%), Dark mode: графитово-синий фон.

## Ключевые особенности
- Sidebar-навигация с 7 разделами (включая «О компании»)
- Тёмная/светлая тема с переключателем
- Адаптивный дизайн (карточки на мобильных, таблицы на десктопе)
- Демо-данные в MemStorage (uid: demo-uid-123)
- Чат с отправкой сообщений и пометкой прочитанных

## GitHub
Repository: vladilslavandrosov-prog/website (main branch)
