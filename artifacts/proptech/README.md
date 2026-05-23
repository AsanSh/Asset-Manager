# 🏢 BuildFlow - PropTech Platform

Современная платформа для управления недвижимостью, строительством и арендой.

## ✨ Возможности

- 🏗️ **Строительство** - управление проектами, бюджетами, операциями
- 🏠 **Аренда** - договоры, начисления, платежи, отчёты собственников
- 💼 **CRM** - управление клиентами и сделками
- 📦 **Склад** - учёт материалов и закупок
- 📊 **Аналитика** - детальные отчёты и дашборды
- ⚙️ **Настройки** - модульная система, роли, юр.лица

## 🚀 Быстрый старт

### Локальная разработка

\`\`\`bash
# Установка зависимостей
npm install

# Запуск dev сервера
PORT=5173 BASE_PATH=/ npm run dev
\`\`\`

Откройте http://localhost:5173

**Учетные данные:**
- Email: admin@buildflow.kz
- Password: admin123

## 📦 Деплой на Vercel

### Автоматический деплой

1. Подключи GitHub репозиторий к Vercel
2. Vercel автоматически определит Vite проект
3. Добавь переменные окружения:
   \`\`\`
   VITE_API_URL=https://your-backend-api.vercel.app
   NODE_ENV=production
   \`\`\`
4. Deploy!

### Через Vercel CLI

\`\`\`bash
# Установи Vercel CLI
npm i -g vercel

# Залогинься
vercel login

# Деплой
vercel
\`\`\`

## 🔧 Технологии

- **Frontend**: React 19, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI, shadcn/ui
- **Routing**: Wouter
- **State**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React

## 📂 Структура проекта

\`\`\`
src/
├── components/       # UI компоненты
│   ├── ui/          # shadcn/ui компоненты
│   ├── layout.tsx   # Главный layout с навигацией
│   └── ...
├── pages/           # Страницы приложения
│   ├── dashboard.tsx
│   ├── construction/
│   ├── rental/
│   ├── crm/
│   ├── warehouse/
│   └── settings/
├── lib/            # Утилиты
│   ├── api.ts      # API клиент
│   ├── auth.tsx    # Контекст аутентификации
│   ├── status-colors.ts   # Дизайн-система
│   └── design-tokens.ts
└── App.tsx         # Корневой компонент
\`\`\`

## 🎨 Дизайн-система

Проект использует консистентную дизайн-систему с семантическими цветами:

- **Success** (emerald): Приходы, успешные операции
- **Danger** (rose): Расходы, ошибки
- **Warning** (amber): Предупреждения
- **Info** (blue): Информационные сообщения
- **Primary** (blue/indigo): Основные действия

См. [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) для деталей.

## 🔐 Безопасность

- bcrypt хеширование паролей
- JWT сессии с истечением
- CORS защита
- XSS защита
- Rate limiting
- Input валидация (Zod)

## 📝 Environment Variables

\`\`\`env
# API URL
VITE_API_URL=http://localhost:3000

# Порт для dev сервера (только для разработки)
PORT=5173

# Base path (только для разработки)
BASE_PATH=/
\`\`\`

## 🧪 Тестирование

\`\`\`bash
# Type checking
npm run typecheck

# Build для production
npm run build

# Preview production build
npm run serve
\`\`\`

## 📚 Документация

- [DEPLOY.md](./DEPLOY.md) - Полное руководство по деплою
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Дизайн-система
- [MIGRATION_COMPLETED.md](./MIGRATION_COMPLETED.md) - История миграции UI/UX

## 🤝 Contributing

1. Fork проект
2. Создай feature ветку (\`git checkout -b feature/AmazingFeature\`)
3. Закоммить изменения (\`git commit -m 'Add some AmazingFeature'\`)
4. Push в ветку (\`git push origin feature/AmazingFeature\`)
5. Открой Pull Request

## 📄 License

MIT License - см. LICENSE файл

## 👥 Команда

Разработано с ❤️ командой BuildFlow

---

**Нужна помощь?** Открой issue в GitHub или свяжись с нами.
