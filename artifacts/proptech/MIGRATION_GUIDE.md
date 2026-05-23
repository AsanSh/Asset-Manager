# BuildFlow UI Migration Guide

> **Цель:** Пошаговое руководство по переводу существующего кода на новую дизайн-систему  
> **Предполагаемое время:** 3-4 недели для полной миграции  

---

## Содержание

1. [Quick Wins - Быстрые исправления](#quick-wins)
2. [Файлы для приоритетной миграции](#файлы-для-приоритетной-миграции)
3. [Find & Replace Guide](#find--replace-guide)
4. [Примеры до/после](#примеры-допосле)
5. [Automated Scripts](#automated-scripts)
6. [Testing Checklist](#testing-checklist)

---

## Quick Wins

Эти изменения дают максимальный визуальный эффект при минимальных усилиях.

### 1. operations.tsx - Кнопки в боковой панели

**ДО (Текущий код):**
```tsx
<button 
  className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
    panelType === t
      ? t === "income" ? "bg-emerald-500 text-white border-emerald-500"
      : t === "expense" ? "bg-red-500 text-white border-red-500"
      : "bg-blue-500 text-white border-blue-500"
      : "border-gray-200 text-gray-700 hover:border-gray-300"
  }`}
>
  {t === "income" ? "Приход" : t === "expense" ? "Расход" : "Перевод"}
</button>
```

**ПОСЛЕ (Новый дизайн):**
```tsx
<button 
  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
    panelType === t
      ? t === "income" 
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
      : t === "expense" 
        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
      : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
  }`}
>
  {t === "income" ? "Приход" : t === "expense" ? "Расход" : "Перевод"}
</button>
```

**Изменения:**
- `bg-emerald-500` → `bg-emerald-50` + `text-emerald-700` + `border-emerald-200`
- `bg-red-500` → `bg-red-50` + `text-red-700` + `border-red-200`
- `bg-blue-500` → `bg-blue-50` + `text-blue-700` + `border-blue-200`
- Добавлен hover: `hover:bg-emerald-100`

---

### 2. operations.tsx - Submit button

**ДО:**
```tsx
<Button
  className={`w-full h-9 text-sm font-semibold ${
    panelType === "income" ? "bg-emerald-500 hover:bg-emerald-600" 
    : panelType === "expense" ? "bg-red-500 hover:bg-red-600" 
    : "bg-blue-500 hover:bg-blue-600"
  }`}
>
  Добавить операцию
</Button>
```

**ПОСЛЕ:**
```tsx
<Button
  className={`w-full h-9 text-sm font-medium ${
    panelType === "income" 
      ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
    : panelType === "expense" 
      ? "bg-red-600 hover:bg-red-700 text-white" 
      : "bg-blue-600 hover:bg-blue-700 text-white"
  }`}
>
  Добавить операцию
</Button>
```

**Изменения:**
- `500` → `600` (более насыщенный, но не неоновый)
- `hover:*-600` → `hover:*-700`
- `font-semibold` → `font-medium` (более subtle)

---

### 3. dashboard.tsx - Net Profit Card

**ДО:**
```tsx
<div className={`rounded-2xl border shadow-sm p-4 ${
  netProfit >= 0 
    ? "bg-emerald-500 border-emerald-400" 
    : "bg-red-500 border-red-400"
}`}>
  <div className="flex items-center justify-between mb-1">
    <span className="text-xs text-emerald-100 font-medium">ЧИСТАЯ ПРИБЫЛЬ</span>
    <BarChart2 className="w-4 h-4 text-white/70" />
  </div>
  <div className="text-2xl font-bold text-white mt-1">
    {netProfit >= 0 ? "+" : ""}{fmt(netProfit)}
  </div>
</div>
```

**ПОСЛЕ:**
```tsx
<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
  <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-medium text-gray-500 uppercase">
      Чистая прибыль
    </span>
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
      netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"
    }`}>
      <BarChart2 className={`w-4 h-4 ${
        netProfit >= 0 ? "text-emerald-600" : "text-red-600"
      }`} />
    </div>
  </div>
  <div className={`text-2xl font-bold mt-1 ${
    netProfit >= 0 ? "text-emerald-600" : "text-red-600"
  }`}>
    {netProfit >= 0 ? "+" : ""}{fmt(netProfit)}
  </div>
  <div className="text-xs text-gray-400 mt-1">KGS</div>
</div>
```

**Изменения:**
- Убран яркий цветной фон, теперь белая карточка
- Цвет только для иконки и числа
- Иконка в отдельном квадрате `w-8 h-8 rounded-lg`
- Консистентный стиль с другими KPI cards

---

### 4. Глобальная замена статусных badges

**ДО (разные варианты в разных файлах):**
```tsx
// Вариант 1
<Badge className="bg-green-100 text-green-700">Активен</Badge>

// Вариант 2
<span className="bg-emerald-500 text-white px-2 py-1">Активен</span>

// Вариант 3
<div className="text-green-600">Активен</div>
```

**ПОСЛЕ (единый стандарт):**
```tsx
<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
  Активен
</Badge>
```

**Создать helper:**
```tsx
// src/lib/status-colors.ts
export const statusColors = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  terminated: "bg-red-100 text-red-700 border-red-200",
  expired: "bg-yellow-100 text-yellow-700 border-yellow-200",
} as const;

// Использование:
<Badge className={statusColors.active}>Активен</Badge>
```

---

## Файлы для приоритетной миграции

### Priority 1 - Критичные (Видны пользователю сразу)

```bash
# 1. Главные дашборды
src/pages/dashboard.tsx
src/pages/construction/dashboard.tsx
src/pages/rental/rental-dashboard.tsx
src/pages/crm/dashboard.tsx
src/pages/warehouse/dashboard.tsx

# 2. Страницы с яркими кнопками
src/pages/construction/operations.tsx
src/pages/construction/cashier.tsx
src/pages/construction/projects.tsx
```

**Ожидаемое время:** 2-3 дня  
**Impact:** VERY HIGH - это первое, что видит пользователь

---

### Priority 2 - Списки и таблицы

```bash
# Списки операций
src/pages/construction/accruals.tsx
src/pages/rental/payments.tsx
src/pages/rental/leases.tsx
src/pages/warehouse/inventory.tsx

# Списки сущностей
src/pages/construction/contractors.tsx
src/pages/rental/tenants.tsx
src/pages/crm/clients.tsx
```

**Ожидаемое время:** 3-4 дня  
**Impact:** HIGH - часто используемые страницы

---

### Priority 3 - Формы создания/редактирования

```bash
src/pages/construction/projects.tsx  (dialog)
src/pages/rental/leases.tsx  (dialog)
src/pages/crm/deals.tsx  (dialog)
```

**Ожидаемое время:** 2-3 дня  
**Impact:** MEDIUM - используются реже, но важны для консистентности

---

### Priority 4 - Остальные страницы

```bash
# Аналитика
src/pages/construction/analytics/*.tsx
src/pages/rental/analytics/*.tsx

# Настройки
src/pages/settings/*.tsx

# Отчёты
src/pages/reports/*.tsx
```

**Ожидаемое время:** 5-7 дней  
**Impact:** LOW-MEDIUM

---

## Find & Replace Guide

### Автоматические замены (безопасные)

Эти замены можно делать глобально через IDE Find & Replace.

#### 1. Яркие фоновые цвета

```bash
# Emerald
Find:    bg-emerald-500
Replace: bg-emerald-400

# Red
Find:    bg-red-500
Replace: bg-red-400

# Green (alias for emerald)
Find:    bg-green-500
Replace: bg-emerald-400

# Purple (заменить на indigo или убрать)
Find:    bg-purple-500
Replace: bg-indigo-500

Find:    bg-violet-500
Replace: bg-indigo-500
```

#### 2. Текстовые цвета (требуют проверки контекста)

```bash
# Emerald text (обычно OK, но проверить контраст)
Find:    text-emerald-500
Replace: text-emerald-600

# Red text
Find:    text-red-500
Replace: text-red-600
```

#### 3. Border radius унификация

```bash
# Карточки - оставить как есть
rounded-xl  → OK

# Кнопки
Find:    rounded-xl   (в Button компонентах)
Replace: rounded-md

# Inputs
Find:    rounded-lg   (в Input компонентах)
Replace: rounded-md
```

#### 4. Spacing

```bash
# Убрать слишком малые gap
Find:    gap-1([^0-9])
Replace: gap-2$1

# Убрать слишком большие gap
Find:    gap-6([^0-9])
Replace: gap-4$1

# Примечание: Используйте regex в вашей IDE
```

---

### Ручные замены (требуют внимания)

Эти замены требуют проверки контекста и не могут быть автоматизированы.

#### 1. KPI Cards

**Поиск паттерна:**
```tsx
// Найти все карточки с цифрами вида:
<div className="...">
  <div className="text-2xl font-bold">{число}</div>
</div>
```

**Проверить:**
- Есть ли `rounded-2xl`? (должен быть)
- Есть ли `p-5`? (должен быть)
- Иконка в квадрате `w-8 h-8 rounded-lg`?
- Label `text-xs font-medium text-gray-500 uppercase`?

#### 2. Кнопки с действиями

**Найти:**
```tsx
<Button className="bg-orange-500">...</Button>
<Button className="bg-emerald-500">...</Button>
```

**Решить:**
- Primary action? → `bg-blue-600 hover:bg-blue-700`
- Success action? → `bg-emerald-600 hover:bg-emerald-700`
- Destructive action? → `bg-red-600 hover:bg-red-700`
- Secondary action? → `variant="secondary"`

#### 3. Status Badges

**Найти все:**
```bash
# В IDE поиск:
(bg-green-|bg-emerald-|bg-red-|bg-yellow-|bg-blue-)(100|500)
```

**Заменить на:**
```tsx
// Использовать helper:
<Badge className={statusColors[status]}>
  {statusLabel}
</Badge>
```

---

## Примеры До/После

### Пример 1: Страница со списком

**ДО:**
```tsx
export default function ProjectsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Проекты</h1>
      
      <Button className="bg-orange-500 hover:bg-orange-600 mb-3">
        <Plus className="w-4 h-4 mr-2" />
        Добавить
      </Button>

      <div className="grid grid-cols-3 gap-3">
        {projects.map(p => (
          <div key={p.id} className="bg-white border rounded-lg p-3">
            <h3 className="font-semibold text-base">{p.name}</h3>
            <Badge className="bg-green-500 text-white mt-2">
              {p.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**ПОСЛЕ:**
```tsx
export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
          <p className="text-sm text-gray-500 mt-1">
            Управление строительными проектами
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Добавить проект
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {projects.map(p => (
          <div 
            key={p.id} 
            className="
              bg-white rounded-xl border border-gray-200 
              hover:border-gray-300 hover:shadow-md 
              transition-all p-5
            "
          >
            <h3 className="font-semibold text-base text-gray-900">
              {p.name}
            </h3>
            <Badge className={statusColors[p.status]} className="mt-2">
              {statusLabels[p.status]}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Ключевые изменения:**
- `p-4` → `space-y-6` (больше воздуха)
- `text-xl` → `text-2xl` (крупнее заголовок)
- Добавлено description
- `bg-orange-500` → default Button (blue-600)
- `gap-3` → `gap-4` (больше пространства)
- `rounded-lg` → `rounded-xl` (консистентно)
- `p-3` → `p-5` (больше padding)
- Добавлен hover эффект
- `bg-green-500` → `statusColors` helper

---

### Пример 2: KPI Dashboard

**ДО:**
```tsx
<div className="grid grid-cols-4 gap-3">
  <div className="bg-white border p-4">
    <div className="text-xs text-gray-400">ДОХОДЫ</div>
    <div className="text-xl font-bold mt-1">2,500,000</div>
  </div>
  
  <div className="bg-emerald-500 border-emerald-400 p-4 text-white">
    <div className="text-xs">ПРИБЫЛЬ</div>
    <div className="text-xl font-bold mt-1">+500,000</div>
  </div>
</div>
```

**ПОСЛЕ:**
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-gray-500 uppercase">
        Доходы
      </span>
      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
        <TrendingUp className="w-4 h-4 text-emerald-600" />
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900">2,500,000</div>
    <div className="text-xs text-gray-400 mt-1">KGS</div>
  </div>
  
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-gray-500 uppercase">
        Прибыль
      </span>
      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
        <BarChart2 className="w-4 h-4 text-emerald-600" />
      </div>
    </div>
    <div className="text-2xl font-bold text-emerald-600">+500,000</div>
    <div className="text-xs text-gray-400 mt-1">KGS • рентабельность 20%</div>
  </div>
</div>
```

**Ключевые изменения:**
- Все карточки белые (не цветные)
- `gap-3` → `gap-4`
- `p-4` → `p-5`
- Добавлены `rounded-2xl`, `shadow-sm`
- Иконки в цветных квадратах
- `text-xl` → `text-2xl`
- Числа цветные (не весь card)
- Добавлена валюта `KGS`

---

## Automated Scripts

### Bash скрипт для bulk замены

```bash
#!/bin/bash
# migrate-colors.sh

# Найти все .tsx файлы и заменить цвета
find ./src/pages -name "*.tsx" -type f -exec sed -i '' \
  -e 's/bg-emerald-500/bg-emerald-400/g' \
  -e 's/bg-red-500/bg-red-400/g' \
  -e 's/bg-green-500/bg-emerald-400/g' \
  -e 's/bg-purple-500/bg-indigo-500/g' \
  -e 's/bg-violet-500/bg-indigo-500/g' \
  -e 's/text-emerald-500/text-emerald-600/g' \
  -e 's/text-red-500/text-red-600/g' \
  {} +

echo "✅ Color migration complete"
```

**Использование:**
```bash
chmod +x migrate-colors.sh
./migrate-colors.sh
```

### Node.js скрипт для анализа

```javascript
// analyze-colors.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const problemColors = [
  'bg-emerald-500', 'bg-red-500', 'bg-green-500', 
  'bg-purple-500', 'bg-violet-500', 'bg-pink-500'
];

const results = {};

glob.sync('./src/pages/**/*.tsx').forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  problemColors.forEach(color => {
    const matches = (content.match(new RegExp(color, 'g')) || []).length;
    if (matches > 0) {
      if (!results[file]) results[file] = {};
      results[file][color] = matches;
    }
  });
});

console.log('Files with problem colors:\n');
Object.entries(results).forEach(([file, colors]) => {
  console.log(`\n📄 ${file}`);
  Object.entries(colors).forEach(([color, count]) => {
    console.log(`   - ${color}: ${count} occurrences`);
  });
});
```

**Использование:**
```bash
node analyze-colors.js
```

---

## Testing Checklist

### После каждого файла проверить:

- [ ] Все цвета соответствуют дизайн-системе (нет -500)
- [ ] Border radius консистентен (xl для карточек, md для кнопок)
- [ ] Spacing правильный (gap-2/3/4, p-4/5)
- [ ] Typography правильная (text-2xl для H1, text-sm для body)
- [ ] Hover states работают
- [ ] Focus states работают
- [ ] Responsive работает (проверить на мобильном)
- [ ] Accessibility - цветовой контраст WCAG AA

### Инструменты для проверки

```bash
# 1. Проверка контраста
https://webaim.org/resources/contrastchecker/

# 2. Lighthouse audit
npm run build
npx serve -s dist
# Открыть DevTools → Lighthouse → Run audit

# 3. Axe DevTools
# Установить Chrome extension "axe DevTools"
# Запустить тест на каждой странице
```

### Visual Regression Testing (опционально)

```bash
# Установка
npm install -D @playwright/test

# playwright.config.ts
export default {
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
};

# Создать базовые скриншоты
npm run test:visual -- --update-snapshots

# Запустить проверку
npm run test:visual
```

---

## Rollout Plan

### Week 1: Preparation
- [ ] Создать feature branch `ui-redesign`
- [ ] Создать helper файлы (`status-colors.ts`, и т.д.)
- [ ] Обновить UI components (`Button`, `Badge`, `Card`)
- [ ] Создать примеры в Storybook (опционально)

### Week 2: Critical Pages
- [ ] Dashboard pages (5 файлов)
- [ ] operations.tsx
- [ ] Visual QA + user testing

### Week 3: List Pages
- [ ] Все страницы со списками (15 файлов)
- [ ] Все таблицы унифицировать
- [ ] Visual QA

### Week 4: Forms & Remaining
- [ ] Формы создания/редактирования (20 файлов)
- [ ] Аналитика страницы (15 файлов)
- [ ] Настройки (10 файлов)
- [ ] Final QA

### Week 5: Polish & Deploy
- [ ] Automated tests
- [ ] Visual regression tests
- [ ] Merge to main
- [ ] Staged rollout to production

---

## Support

Если возникли вопросы при миграции:

1. Проверьте DESIGN_SYSTEM.md - там примеры
2. Посмотрите на уже мигрированные файлы как reference
3. Задайте вопрос в Slack channel #design-system

**Контакты:**
- Design System Lead: design@buildflow.kg
- Tech Lead: tech@buildflow.kg

---

**Happy migrating!** 🚀
