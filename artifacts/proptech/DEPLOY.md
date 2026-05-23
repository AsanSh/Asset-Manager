# 🚀 Деплой BuildFlow на Vercel

## Часть 1: Деплой Frontend на Vercel

### Шаг 1: Подготовка репозитория

Сначала нужно залить код в GitHub репозиторий.

```bash
cd /Users/asans/Desktop/4Project/Asset-Manager/artifacts/proptech

# Инициализируем git (если ещё не сделано)
git init

# Добавляем все файлы
git add .

# Создаём коммит
git commit -m "Initial commit - BuildFlow PropTech Platform"

# Создай новый репозиторий на GitHub и добавь remote
git remote add origin https://github.com/YOUR_USERNAME/buildflow-frontend.git
git branch -M main
git push -u origin main
```

### Шаг 2: Деплой на Vercel

1. Зайди на [vercel.com](https://vercel.com)
2. Нажми **"Add New Project"**
3. Выбери свой GitHub репозиторий **buildflow-frontend**
4. Vercel автоматически определит Vite проект

**Настройки проекта:**
- **Framework Preset**: Vite
- **Root Directory**: `./` (или оставь пустым)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Шаг 3: Настройка переменных окружения

В Vercel Dashboard → Settings → Environment Variables добавь:

```
VITE_API_URL=https://your-backend-api.vercel.app
NODE_ENV=production
```

**ВАЖНО:** Замени `https://your-backend-api.vercel.app` на реальный URL твоего бэкенда (см. Часть 2)

### Шаг 4: Deploy

Нажми **"Deploy"** и дождись завершения.

Frontend будет доступен по адресу: `https://your-project.vercel.app`

---

## Часть 2: Деплой Backend (API + Database)

### Вариант A: Vercel + Neon/Supabase PostgreSQL (Рекомендуется)

#### 1. Создай PostgreSQL базу данных

**Neon (Бесплатный tier):**
- Зайди на [neon.tech](https://neon.tech)
- Создай новый проект
- Скопируй **Connection String**:
  ```
  postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

**Или Supabase:**
- [supabase.com](https://supabase.com)
- Создай проект
- Database → Connection → URI

#### 2. Подготовь Backend для Vercel

Vercel поддерживает **Serverless Functions**. Нужно адаптировать Express app:

```bash
cd /Users/asans/Desktop/4Project/Asset-Manager/artifacts/api-server
```

Создай файл `/api-server/api/index.ts`:

```typescript
import app from '../src/app';

export default app;
```

Создай `vercel.json` в `api-server/`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "PORT": "3000",
    "NODE_ENV": "production",
    "ALLOWED_ORIGINS": "@allowed_origins"
  }
}
```

#### 3. Загрузи API на GitHub

```bash
cd /Users/asans/Desktop/4Project/Asset-Manager/artifacts/api-server

git init
git add .
git commit -m "Backend API for BuildFlow"
git remote add origin https://github.com/YOUR_USERNAME/buildflow-backend.git
git push -u origin main
```

#### 4. Деплой API на Vercel

1. В Vercel → Add New Project
2. Выбери **buildflow-backend** репозиторий
3. **Framework**: Other

**Environment Variables:**
```
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

4. Deploy

#### 5. Запусти миграции базы данных

После деплоя выполни seed через Vercel CLI:

```bash
# Установи Vercel CLI
npm i -g vercel

# Залогинься
vercel login

# Перейди в проект
cd /Users/asans/Desktop/4Project/Asset-Manager

# Запусти seed
vercel env pull
DATABASE_URL="твой_neon_url" npx tsx lib/db/src/seed.ts
```

#### 6. Обнови VITE_API_URL во Frontend

Вернись в настройки **frontend проекта** на Vercel:
- Settings → Environment Variables
- Обнови `VITE_API_URL` на URL твоего backend:
  ```
  VITE_API_URL=https://buildflow-backend.vercel.app
  ```
- Redeploy frontend

---

### Вариант B: Railway (Проще для PostgreSQL)

**Railway** поддерживает PostgreSQL из коробки:

1. Зайди на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Выбери **buildflow-backend**
4. Railway автоматически создаст PostgreSQL базу
5. В Settings добавь переменные:
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```
6. Railway автоматически установит `DATABASE_URL`

После деплоя скопируй **Railway URL** и обнови `VITE_API_URL` в Vercel (frontend).

---

### Вариант C: Render (Полностью бесплатный)

1. [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo: **buildflow-backend**
4. Settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Создай PostgreSQL базу: New → PostgreSQL
6. Добавь переменные окружения в Web Service

---

## Часть 3: Финальная настройка

### 1. Обнови CORS в Backend

В `api-server/.env` или Vercel Environment Variables:

```
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-custom-domain.com
```

### 2. Настрой Custom Domain (опционально)

В Vercel → Settings → Domains:
- Добавь свой домен
- Обнови DNS записи согласно инструкциям Vercel

### 3. Проверь работу

1. Открой `https://your-frontend.vercel.app`
2. Войди с учетными данными:
   - Email: admin@buildflow.kz
   - Password: admin123
3. Проверь все модули

---

## 📋 Чеклист деплоя

- [ ] Frontend задеплоен на Vercel
- [ ] PostgreSQL база создана (Neon/Supabase/Railway)
- [ ] Backend задеплоен
- [ ] `DATABASE_URL` настроен в backend
- [ ] Seed выполнен (admin пользователь создан)
- [ ] `VITE_API_URL` обновлён во frontend
- [ ] `ALLOWED_ORIGINS` включает frontend URL
- [ ] Тестовый вход работает
- [ ] CORS работает корректно

---

## 🆘 Troubleshooting

### CORS ошибки в production

Убедись что в backend env vars:
```
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### 500 ошибка на backend

Проверь логи в Vercel Dashboard → Deployments → Logs

### База данных не подключается

Проверь `DATABASE_URL`:
- Должен включать `?sslmode=require` для Neon
- Должен быть External Database URL для Supabase

### Frontend не может достучаться до API

Проверь что `VITE_API_URL` в environment variables Vercel правильный и без слэша на конце:
```
✅ https://api.example.com
❌ https://api.example.com/
```

---

## 🎯 Рекомендуемая архитектура

```
Frontend (Vercel)
    ↓
Backend API (Vercel/Railway/Render)
    ↓
PostgreSQL (Neon/Supabase)
```

**Стоимость:** Полностью бесплатно для старта (до 100k запросов/месяц)

---

## 📚 Дополнительные ресурсы

- [Vercel Documentation](https://vercel.com/docs)
- [Neon PostgreSQL](https://neon.tech/docs)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
