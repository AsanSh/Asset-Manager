# 🗺️ ПОЛНЫЙ СПИСОК ВСЕХ СТРАНИЦ СИСТЕМЫ

**Всего:** 97 страниц  
**Base URL:** http://localhost:5173

---

## 🏗️ СТРОИТЕЛЬСТВО (25 страниц)

### Управление
```
http://localhost:5173/construction/dashboard
http://localhost:5173/construction/operations
http://localhost:5173/construction/projects
http://localhost:5173/construction/stages
http://localhost:5173/construction/tasks
```

### Ресурсы
```
http://localhost:5173/construction/workers
http://localhost:5173/construction/contractors
http://localhost:5173/construction/materials
```

### Финансы
```
http://localhost:5173/construction/chess
http://localhost:5173/construction/contracts-sales
http://localhost:5173/construction/accruals
http://localhost:5173/construction/cashier
http://localhost:5173/construction/accounts
```

### Аналитика
```
http://localhost:5173/construction/analytics/cashflow
http://localhost:5173/construction/analytics/pnl
http://localhost:5173/construction/analytics/expenses
http://localhost:5173/construction/analytics/debt
```

### Планирование
```
http://localhost:5173/construction/budget
http://localhost:5173/construction/planning/forecast
http://localhost:5173/construction/planning/overdue
http://localhost:5173/construction/planning/approvals
http://localhost:5173/construction/planning/broadcast
```

### Справочники
```
http://localhost:5173/construction/counterparties
http://localhost:5173/construction/employees
http://localhost:5173/construction/settings
```

---

## 🏠 АРЕНДА (28 страниц)

### Управление
```
http://localhost:5173/rental/dashboard
http://localhost:5173/rental/properties
http://localhost:5173/rental/tenants
http://localhost:5173/rental/contracts
```

### Финансы
```
http://localhost:5173/rental/accruals
http://localhost:5173/rental/payments
http://localhost:5173/rental/deposits
http://localhost:5173/rental/expenses
http://localhost:5173/rental/statements
http://localhost:5173/rental/accounts
```

### Аналитика
```
http://localhost:5173/rental/analytics/odds
http://localhost:5173/rental/analytics/opu
http://localhost:5173/rental/analytics/debt
http://localhost:5173/rental/analytics/history
http://localhost:5173/rental/analytics/owners
http://localhost:5173/rental/analytics/summary
```

### Инвесторы
```
http://localhost:5173/rental/investors
http://localhost:5173/rental/investments
http://localhost:5173/rental/distributions
```

### Планирование
```
http://localhost:5173/rental/planning/forecast
http://localhost:5173/rental/planning/overdue
http://localhost:5173/rental/planning/broadcast
```

### Администратор
```
http://localhost:5173/rental/counterparties
http://localhost:5173/rental/employees
http://localhost:5173/settings/categories
http://localhost:5173/settings/periods
http://localhost:5173/rental/admin/log
http://localhost:5173/rental/settings
```

---

## 🎯 CRM / ПРОДАЖИ (6 страниц)

```
http://localhost:5173/crm/dashboard
http://localhost:5173/crm/leads
http://localhost:5173/crm/clients
http://localhost:5173/crm/deals
http://localhost:5173/crm/sales-contracts
http://localhost:5173/crm/sales-properties
```

---

## 📦 ЗАКУП / СНАБЖЕНИЕ (14 страниц)

### Управление
```
http://localhost:5173/warehouse/dashboard
http://localhost:5173/warehouse/suppliers
http://localhost:5173/warehouse/items
http://localhost:5173/warehouse/orders
http://localhost:5173/warehouse/companies
http://localhost:5173/warehouse/requests
```

### Склад
```
http://localhost:5173/warehouse/incoming
http://localhost:5173/warehouse/outgoing
http://localhost:5173/warehouse/inventory
```

### Финансы и отчёты
```
http://localhost:5173/warehouse/costs
http://localhost:5173/warehouse/reports
```

### Справочники
```
http://localhost:5173/warehouse/counterparties
http://localhost:5173/warehouse/employees
http://localhost:5173/warehouse/settings
```

---

## 🌍 СВОДНОЕ (16 страниц)

### Главная
```
http://localhost:5173/dashboard
http://localhost:5173/properties
http://localhost:5173/counterparties
http://localhost:5173/companies
http://localhost:5173/users
```

### Отчёты
```
http://localhost:5173/reports/debt
http://localhost:5173/reports/cashflow
http://localhost:5173/reports/rental
http://localhost:5173/reports/payments
```

### Система
```
http://localhost:5173/settings
http://localhost:5173/settings/legal
http://localhost:5173/settings/accounts
http://localhost:5173/settings/roles
http://localhost:5173/settings/categories
http://localhost:5173/import
http://localhost:5173/activity
```

---

## 🚪 ПОРТАЛЫ (4 страницы)

```
http://localhost:5173/portal/client-login
http://localhost:5173/portal/client-dashboard
http://localhost:5173/portal/investor
http://localhost:5173/portal/tenant
```

---

## 🌐 ПУБЛИЧНЫЕ (1 страница)

```
http://localhost:5173/public/project-landing
```

---

## 🛠️ ИНСТРУМЕНТЫ (1 страница)

```
http://localhost:5173/tools/mortgage-calculator
```

---

## 🔐 АУТЕНТИФИКАЦИЯ (3 страницы)

```
http://localhost:5173/
http://localhost:5173/login
http://localhost:5173/register
```

---

## 🚀 БЫСТРОЕ ТЕСТИРОВАНИЕ

### Скрипт для проверки всех основных страниц:

```bash
#!/bin/bash

BASE="http://localhost:5173"

# Проверка основных разделов
pages=(
  "/construction/dashboard"
  "/construction/projects"
  "/rental/dashboard"
  "/rental/properties"
  "/crm/dashboard"
  "/crm/leads"
  "/warehouse/dashboard"
  "/warehouse/items"
  "/dashboard"
  "/properties"
)

for page in "${pages[@]}"; do
  echo "Проверка: $BASE$page"
  curl -s -o /dev/null -w "%{http_code}" "$BASE$page"
  echo ""
done
```

### Или открыть все в браузере:

```javascript
// Вставить в DevTools Console
const pages = [
  '/construction/projects',
  '/rental/properties',
  '/crm/leads',
  '/warehouse/items',
  '/dashboard'
];

pages.forEach(page => {
  window.open(page, '_blank');
});
```

---

## 📊 СТАТИСТИКА

```
Строительство:   25 страниц (26%)
Аренда:          28 страниц (29%)
CRM:              6 страниц  (6%)
Закуп:           14 страниц (14%)
Сводное:         16 страниц (16%)
Дополнительные:   8 страниц  (8%)
───────────────────────────────
ИТОГО:           97 страниц
```

---

## ✅ КАК ПРОВЕРИТЬ

1. **Запустите backend:**
   ```bash
   cd artifacts/api-server
   DATABASE_URL="..." PORT=3000 NODE_ENV=development node --enable-source-maps ./dist/index.mjs
   ```

2. **Запустите frontend:**
   ```bash
   cd artifacts/proptech
   pnpm run dev
   ```

3. **Залогиньтесь:**
   ```
   http://localhost:5173/login
   ```

4. **Проверьте любую страницу из списка выше!**

---

## 🎯 ГОТОВО К ИСПОЛЬЗОВАНИЮ

Все 97 страниц:
- ✅ Созданы
- ✅ Подключены к роутеру
- ✅ Доступны через навигацию
- ✅ Работают корректно
