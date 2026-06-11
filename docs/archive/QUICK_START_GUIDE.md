# 🚀 Быстрый старт - Улучшенный модуль строительства

## ✅ Что уже готово

1. ✅ База данных обновлена (новые поля для проектов и юнитов)
2. ✅ API endpoint `/construction/projects/:id/cost-analysis` создан
3. ✅ Улучшенный Dashboard создан (`enhanced-dashboard.tsx`)
4. ✅ Backend перезапущен с новыми routes

---

## 🎯 Как использовать новый Dashboard

### Вариант 1: Заменить текущий Dashboard (рекомендуется)

```bash
# 1. Сделайте backup текущего dashboard
cd /Users/asans/Desktop/4Project/Asset-Manager/artifacts/proptech/src/pages/construction
mv dashboard.tsx dashboard-old.tsx

# 2. Переименуйте новый dashboard
mv enhanced-dashboard.tsx dashboard.tsx
```

### Вариант 2: Добавить как отдельный роут

В файле `/artifacts/proptech/src/App.tsx` добавьте:

```typescript
import EnhancedConstructionDashboard from "@/pages/construction/enhanced-dashboard";

// Добавьте роут:
<Route path="/construction/dashboard-enhanced">
  <ProtectedRoute component={EnhancedConstructionDashboard} />
</Route>
```

Тогда новый Dashboard будет доступен по адресу:
```
http://localhost:5173/construction/dashboard-enhanced
```

---

## 📝 Пример создания проекта с полными характеристиками

### Через UI:

1. Откройте `/construction/projects`
2. Нажмите "Создать проект"
3. Заполните **новые поля**:
   - **Общая площадь**: 12,500 м²
   - **Жилая площадь**: 10,000 м²
   - **Коммерческая площадь**: 2,500 м²
   - **1-комн квартир**: 30
   - **2-комн квартир**: 40
   - **3-комн квартир**: 20
   - **Стоимость за м²**: 15,000 сом (план)
   - **Общий бюджет**: 187,500,000 сом
   - **Дата начала**: 01.06.2026
   - **Дата завершения**: 31.12.2027

### Через API:

```bash
curl -X POST http://localhost:3000/api/construction/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "ЖК Ала-Тоо",
    "address": "ул. Ибраимова 103",
    "region": "Бишкек, Свердловский р-н",
    "status": "planning",
    "buildingType": "apartment",
    "constructionType": "monolith",
    "totalFloors": 12,
    "totalArea": 12500,
    "residentialArea": 10000,
    "commercialArea": 2500,
    "units1Room": 30,
    "units2Room": 40,
    "units3Room": 20,
    "costPerSqm": 15000,
    "totalBudget": 187500000,
    "currency": "KGS",
    "startDate": "2026-06-01",
    "plannedEndDate": "2027-12-31",
    "description": "12-этажный жилой комплекс в центре города"
  }'
```

---

## 🔍 Проверка работы API

### 1. Получить анализ себестоимости:

```bash
curl http://localhost:3000/api/construction/projects/1/cost-analysis \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый ответ:**
```json
{
  "project": {
    "id": 1,
    "name": "ЖК Ала-Тоо",
    "totalArea": 12500,
    "totalBudget": 187500000
  },
  "costs": {
    "plannedCostPerSqm": 15000,
    "actualCostPerSqm": 8500,
    "costDeviation": -43.3,
    "budgetProgress": 56.7
  },
  "sales": {
    "soldUnits": 45,
    "totalUnits": 90,
    "salesProgress": 50
  },
  "profitability": {
    "profit": 75000000,
    "profitMargin": 70.5,
    "roi": 40
  }
}
```

### 2. Проверить, что новые поля сохраняются:

```bash
curl http://localhost:3000/api/construction/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Убедитесь, что в ответе есть поля:
- `residentialArea`
- `commercialArea`
- `units1Room`, `units2Room`, `units3Room`
- `totalBudget`
- `spentAmount`

---

## 🎨 Настройка Dashboard в навигации

### Обновите Layout для новых разделов:

В `/artifacts/proptech/src/components/layout.tsx` найдите секцию Construction и обновите:

```typescript
{
  id: "construction",
  label: "Строительство",
  icon: HardHat,
  sections: [
    {
      title: "Основное",
      items: [
        { href: "/construction/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/construction/projects", label: "Проекты", icon: Building2 },
        { href: "/construction/chess", label: "Шахматка", icon: Grid3x3 },
        // ...
      ]
    },
    {
      title: "Аналитика", // ⚡ новый раздел
      items: [
        { href: "/construction/analytics/pnl", label: "P&L", icon: TrendingUp },
        { href: "/construction/analytics/cashflow", label: "Денежный поток", icon: Wallet },
        { href: "/construction/analytics/expenses", label: "Расходы", icon: DollarSign },
        { href: "/construction/analytics/cost-analysis", label: "Себестоимость", icon: Calculator }, // новое
      ]
    }
  ]
}
```

---

## 📊 Тестовый сценарий

### Шаг 1: Создайте проект
```
POST /construction/projects
{
  "name": "Тестовый проект",
  "totalArea": 1000,
  "costPerSqm": 10000,
  "totalBudget": 10000000
}
```

### Шаг 2: Добавьте расходы
```
POST /construction/expenses
{
  "projectId": 1,
  "category": "Материалы",
  "amountKgs": 2500000,
  "description": "Цемент и арматура"
}
```

### Шаг 3: Создайте юниты
```
POST /construction/units
{
  "projectId": 1,
  "unitNumber": "A-101",
  "area": 45.5,
  "pricePerSqm": 35000,
  "totalPrice": 1592500
}
```

### Шаг 4: Продайте юнит через CRM
```
POST /crm/sales-contracts
{
  "clientId": 1,
  "propertyId": 1, // или unitId
  "totalAmount": 1592500
}

PATCH /construction/units/1
{
  "status": "sold",
  "salesContractId": 1,
  "salePrice": 1592500
}
```

### Шаг 5: Проверьте Dashboard
```
GET /construction/projects/1/cost-analysis
```

Вы должны увидеть:
- Фактическая себестоимость: 2500000 / 1000 = 2500 сом/м²
- План: 10000 сом/м²
- Экономия: -75%
- Прибыль: 1592500 - 2500000 = -907500 (пока убыток, т.к. продан 1 юнит)

---

## ⚡ Быстрые команды

### Перезапуск backend:
```bash
cd /Users/asans/desktop/4Project/Asset-Manager/artifacts/api-server
kill $(lsof -ti:3000)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/proptech' \
PORT=3000 NODE_ENV=development \
node --enable-source-maps ./dist/index.mjs > /tmp/backend.log 2>&1 &
```

### Перезапуск frontend:
```bash
cd /Users/asans/desktop/4Project/Asset-Manager/artifacts/proptech
pnpm run dev
```

### Проверка БД:
```bash
psql postgresql://postgres:postgres@localhost:5432/proptech

# Проверить новые колонки:
\d construction_projects
\d construction_units
\d construction_progress_photos
```

---

## 🐛 Troubleshooting

### Ошибка: "Column does not exist"
```bash
# Пересоздайте схему БД:
cd /Users/asans/Desktop/4Project/Asset-Manager/lib/db
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/proptech' pnpm run push
```

### Ошибка: "API endpoint not found"
```bash
# Пересоберите backend:
cd /Users/asans/desktop/4Project/Asset-Manager/artifacts/api-server
pnpm run build
# Затем перезапустите (см. выше)
```

### Dashboard не показывает данные
1. Проверьте, что backend запущен: `curl http://localhost:3000/api/healthz`
2. Проверьте консоль браузера (F12) на ошибки API
3. Убедитесь, что у вас есть проекты в БД

---

## ✅ Checklist

- [ ] Backend запущен на :3000
- [ ] Frontend запущен на :5173
- [ ] Открыт `/construction/dashboard` или `/construction/dashboard-enhanced`
- [ ] Создан хотя бы 1 проект с новыми полями
- [ ] API endpoint `/projects/:id/cost-analysis` отвечает
- [ ] Dashboard показывает KPI карточки
- [ ] Выбор проекта из dropdown работает

---

## 🎉 Готово!

Теперь у вас есть:
- ✅ Расчет себестоимости в реальном времени
- ✅ Контроль бюджета с визуальными индикаторами
- ✅ Интеграция шахматки с продажами
- ✅ Анализ прибыльности по проектам

**Следующий этап:** Бюджет план/факт, workflow продаж, уведомления.
