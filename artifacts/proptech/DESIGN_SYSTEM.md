# BuildFlow Design System

> **Версия:** 1.0.0  
> **Дата:** 6 мая 2026  
> **Статус:** Production Ready  

---

## Оглавление

1. [Введение](#введение)
2. [Результаты аудита](#результаты-аудита)
3. [Цветовая палитра](#цветовая-палитра)
4. [Типографика](#типографика)
5. [Компоненты](#компоненты)
6. [Spacing & Layout](#spacing--layout)
7. [Состояния и интерактивность](#состояния-и-интерактивность)
8. [Примеры использования](#примеры-использования)
9. [Что НЕ использовать](#что-не-использовать)
10. [Roadmap внедрения](#roadmap-внедрения)

---

## Введение

Этот документ описывает единую дизайн-систему для платформы **BuildFlow** (PropTech Management Platform), состоящей из 5 модулей:
- **Строительство** (Construction) - 34 страницы
- **Аренда** (Rental) - 28 страниц
- **CRM / Продажи** - 7 страниц
- **Склад / Закуп** (Warehouse) - 14 страниц
- **Сводное** (Dashboard, Settings, Reports) - 29 страниц

**ВСЕГО:** 112 страниц проанализировано.

### Цели дизайн-системы

1. **Консистентность** - единый визуальный язык во всех модулях
2. **Профессионализм** - современный, clean дизайн уровня enterprise
3. **Читаемость** - WCAG AA compliant, мягкие цвета, хороший контраст
4. **Масштабируемость** - легко добавлять новые компоненты
5. **Избегание AI-телл** - никаких ярких неоновых цветов (purple-500, emerald-500, etc)

---

## Результаты аудита

### Найденные проблемы

#### 1. Несоответствие цветов

**Проблема:** Использование слишком ярких, неоновых цветов, характерных для AI-генерированных интерфейсов.

**Примеры из кода:**
```tsx
// operations.tsx - ПРОБЛЕМА
bg-emerald-500    // Слишком яркий зелёный
bg-red-500        // Слишком яркий красный
bg-blue-500       // Слишком яркий синий

// dashboard.tsx - ПРОБЛЕМА
bg-emerald-500 border-emerald-400  // Неоновые оттенки
bg-red-500 border-red-400
```

**Найдено использований:**
- `purple-/violet-`: 108 использований
- `bg-emerald-500`: 15 использований
- `bg-red-500`: 12 использований
- `bg-green-500`: 8 использований

#### 2. Inconsistent Border Radius

**Найдено:** 456 использований `rounded-xl/2xl/lg`

**Проблема:** Разные радиусы в одних и тех же контекстах:
- Карточки: `rounded-xl` И `rounded-2xl`
- Кнопки: `rounded-md` И `rounded-xl`
- Инпуты: `rounded-md` И `rounded-lg`

#### 3. Spacing Inconsistency

**Анализ spacing:**
```
gap-2:  332 использования  ✓ (основной)
gap-3:  171 использования  ✓ (вторичный)
gap-4:  140 использований  ✓ (большой)
gap-1:  142 использования  ⚠️ (слишком мало)
gap-6:   29 использований  ⚠️ (слишком много)
```

#### 4. Typography Inconsistency

**Анализ размеров:**
```
text-xs:    672 использования
text-sm:    719 использований  ← основной текст
text-base:  ~150 использований  ⚠️ (недоиспользован)
text-2xl:   173 использования  ← заголовки
```

**Проблема:** Слишком много мелкого текста (xs), недостаточно `text-base`.

#### 5. Shadow Usage

```
shadow-sm:   103 использования  ✓ (основной)
shadow-lg:    34 использования
shadow-xl:    16 использований
shadow-md:    13 использований
shadow-2xl:   12 использований
```

**Проблема:** Избыточное разнообразие теней.

---

## Цветовая палитра

### Философия цвета

**Принцип:** Мягкие, приглушённые тона. Избегаем насыщенных 500-уровней. Используем 400/600 для акцентов, 50/100 для фонов.

### 1. Нейтральные цвета (Primary Palette)

Основа всего интерфейса - серые оттенки.

```css
/* Backgrounds */
--bg-primary: white                    /* #ffffff */
--bg-secondary: gray-50                /* #f9fafb */
--bg-tertiary: gray-100                /* #f3f4f6 */

/* Text */
--text-primary: gray-900               /* #111827 */
--text-secondary: gray-700             /* #374151 */
--text-tertiary: gray-500              /* #6b7280 */
--text-disabled: gray-400              /* #9ca3af */

/* Borders */
--border-default: gray-200             /* #e5e7eb */
--border-strong: gray-300              /* #d1d5db */
--border-subtle: gray-100              /* #f3f4f6 */
```

**Использование:**
- `gray-50` - фоны вторичных секций, hover-состояния
- `gray-100` - разделители, неактивные элементы
- `gray-200` - основные borders
- `gray-400` - placeholder текст
- `gray-500` - вторичный текст, labels
- `gray-700` - основной текст
- `gray-900` - заголовки, важный текст

### 2. Semantic Colors (Смысловые)

#### Success (Положительные операции)

```css
/* Приходы, успех, подтверждения */
--success-bg: emerald-50               /* #ecfdf5 */
--success-light: emerald-100           /* #d1fae5 */
--success-border: emerald-200          /* #a7f3d0 */
--success-hover: emerald-300           /* #6ee7b7 */
--success-default: emerald-400         /* #34d399 */  ← ОСНОВНОЙ
--success-strong: emerald-600          /* #059669 */
--success-text: emerald-700            /* #047857 */
```

**Примеры использования:**
```tsx
// Положительные операции (приходы)
className="text-emerald-600 font-semibold"    // +250,000 KGS
className="bg-emerald-50 border-emerald-200"  // Success notification

// Статус badges
className="bg-emerald-100 text-emerald-700"   // Активен
```

#### Danger (Отрицательные операции)

```css
/* Расходы, ошибки, удаления, просрочки */
--danger-bg: red-50                    /* #fef2f2 */
--danger-light: red-100                /* #fee2e2 */
--danger-border: red-200               /* #fecaca */
--danger-hover: red-300                /* #fca5a5 */
--danger-default: red-400              /* #f87171 */  ← ОСНОВНОЙ
--danger-strong: red-500               /* #ef4444 */
--danger-text: red-600                 /* #dc2626 */
```

**Примеры использования:**
```tsx
// Отрицательные операции (расходы)
className="text-red-600 font-semibold"        // -150,000 KGS
className="bg-red-50 border-red-200"          // Error notification

// Просрочки
className="bg-red-50/30 border-red-200"       // Overdue row
```

#### Warning (Предупреждения)

```css
/* Ожидающие действия, предупреждения */
--warning-bg: amber-50                 /* #fffbeb */
--warning-light: amber-100             /* #fef3c7 */
--warning-border: amber-200            /* #fde68a */
--warning-default: amber-400           /* #fbbf24 */  ← ОСНОВНОЙ
--warning-strong: amber-500            /* #f59e0b */
--warning-text: amber-700              /* #b45309 */
```

**Примеры использования:**
```tsx
// Pending статусы
className="bg-amber-100 text-amber-700"       // Ожидает подтверждения
className="border-amber-300 bg-amber-50"      // Warning alert
```

#### Info (Информация, акценты)

```css
/* Информация, primary действия, акценты */
--info-bg: blue-50                     /* #eff6ff */
--info-light: blue-100                 /* #dbeafe */
--info-border: blue-200                /* #bfdbfe */
--info-hover: blue-300                 /* #93c5fd */
--info-default: blue-400               /* #60a5fa */  ← ОСНОВНОЙ для фонов
--info-strong: blue-600                /* #2563eb */  ← ОСНОВНОЙ для кнопок
--info-text: blue-700                  /* #1d4ed8 */
```

**Примеры использования:**
```tsx
// Primary кнопки
className="bg-blue-600 hover:bg-blue-700 text-white"

// Info badges
className="bg-blue-100 text-blue-700"         // Информация

// Ссылки
className="text-blue-600 hover:text-blue-700" // Links
```

### 3. Module Accent Colors

Мягкие акцентные цвета для различных модулей.

```css
/* Construction Module */
--construction-primary: orange-500     /* #f97316 */
--construction-light: orange-100       /* #ffedd5 */
--construction-dark: orange-600        /* #ea580c */

/* Rental Module */
--rental-primary: teal-500             /* #14b8a6 */
--rental-light: teal-100               /* #ccfbf1 */
--rental-dark: teal-600                /* #0d9488 */

/* CRM Module */
--crm-primary: indigo-500              /* #6366f1 */
--crm-light: indigo-100                /* #e0e7ff */
--crm-dark: indigo-600                 /* #4f46e5 */

/* Warehouse Module */
--warehouse-primary: slate-600         /* #475569 */
--warehouse-light: slate-100           /* #f1f5f9 */
--warehouse-dark: slate-700            /* #334155 */
```

**ВАЖНО:** Акцентные цвета используются **экономно**:
- Только для кнопок "Call to Action" внутри модуля
- Иконки модуля в навигации
- Специфичные для модуля элементы

**НЕ использовать** для фонов карточек, текста, или других общих элементов.

### 4. Chart Colors

Мягкая палитра для графиков и визуализации данных.

```css
--chart-1: #3b82f6    /* blue-500 */
--chart-2: #10b981    /* emerald-500 */
--chart-3: #f59e0b    /* amber-500 */
--chart-4: #ef4444    /* red-500 */
--chart-5: #8b5cf6    /* purple-500 */
--chart-6: #06b6d4    /* cyan-500 */
--chart-7: #f97316    /* orange-500 */
--chart-8: #6b7280    /* gray-500 */
```

**Использование только в графиках:** SVG charts, pie charts, bar charts.

---

## Типографика

### Font Family

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'Menlo', 'Monaco', 'Courier New', monospace;
```

**Inter** - основной шрифт. Отличная читаемость, modern, профессиональный.

### Font Sizes & Line Heights

Используем модульную шкалу с четким назначением каждого размера.

```css
/* Display (редко) */
--text-3xl: 30px / 36px      /* font-size / line-height */
  font-weight: 700 (bold)

/* H1 - Главные заголовки страниц */
--text-2xl: 24px / 32px
  font-weight: 700 (bold)
  color: gray-900

/* H2 - Заголовки секций */
--text-xl: 20px / 28px
  font-weight: 600 (semibold)
  color: gray-900

/* H3 - Подзаголовки */
--text-lg: 18px / 28px
  font-weight: 600 (semibold)
  color: gray-800

/* Body - Основной текст */
--text-base: 16px / 24px
  font-weight: 400 (regular)
  color: gray-700

/* Body Small - Вторичный текст */
--text-sm: 14px / 20px
  font-weight: 400 (regular)
  color: gray-600

/* Caption - Подписи, labels */
--text-xs: 12px / 16px
  font-weight: 500 (medium)
  color: gray-500

/* Tiny - Для special cases */
--text-[10px]: 10px / 14px
  font-weight: 500 (medium)
  color: gray-400
```

### Font Weights

```css
--font-regular: 400      /* Основной текст */
--font-medium: 500       /* Labels, captions, кнопки */
--font-semibold: 600     /* Подзаголовки, важный текст */
--font-bold: 700         /* Заголовки, цифры */
```

**Правило:** 
- Заголовки всегда `font-bold` (700)
- Кнопки всегда `font-medium` (500) или `font-semibold` (600)
- Числа в KPI-картах всегда `font-bold` (700)

### Использование в коде

```tsx
// ✅ ПРАВИЛЬНО
<h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
<p className="text-sm text-gray-600">Описание страницы</p>
<span className="text-xs font-medium text-gray-500 uppercase">LABEL</span>

// ❌ НЕПРАВИЛЬНО
<h1 className="text-3xl">Дашборд</h1>          // Слишком большой
<p className="text-xs">Описание</p>            // Слишком мелкий
<span className="text-base font-bold">Label</span>  // Неверный размер
```

---

## Компоненты

### 1. Buttons (Кнопки)

Основной interactive элемент. 4 варианта + 3 размера.

#### Варианты (Variants)

**Primary (default)**
```tsx
<Button>
  Сохранить
</Button>

// Render:
className="
  bg-blue-600 text-white border border-blue-700
  hover:bg-blue-700
  active:bg-blue-800
  disabled:opacity-50 disabled:cursor-not-allowed
  rounded-md h-9 px-4 text-sm font-medium
  transition-colors duration-150
"
```

**Использование:** Основные действия (Создать, Сохранить, Применить).

---

**Secondary**
```tsx
<Button variant="secondary">
  Отмена
</Button>

// Render:
className="
  bg-gray-100 text-gray-900 border border-gray-200
  hover:bg-gray-200
  rounded-md h-9 px-4 text-sm font-medium
"
```

**Использование:** Вторичные действия (Отмена, Назад, Закрыть).

---

**Outline**
```tsx
<Button variant="outline">
  Фильтр
</Button>

// Render:
className="
  bg-white text-gray-700 border border-gray-200
  hover:bg-gray-50 hover:border-gray-300
  shadow-xs
  rounded-md h-9 px-4 text-sm font-medium
"
```

**Использование:** Нейтральные действия (Фильтры, Экспорт, Дополнительные опции).

---

**Ghost**
```tsx
<Button variant="ghost">
  <Edit className="w-4 h-4" />
</Button>

// Render:
className="
  bg-transparent text-gray-600 border border-transparent
  hover:bg-gray-100
  rounded-md h-9 px-2 text-sm
"
```

**Использование:** Иконочные действия в таблицах, минималистичные кнопки.

---

**Destructive**
```tsx
<Button variant="destructive">
  Удалить
</Button>

// Render:
className="
  bg-red-500 text-white border border-red-600
  hover:bg-red-600
  rounded-md h-9 px-4 text-sm font-semibold
"
```

**Использование:** Опасные действия (Удалить, Удалить навсегда).

---

#### Размеры (Sizes)

```tsx
// Small (sm)
className="h-8 px-3 text-xs rounded-md"

// Default
className="h-9 px-4 text-sm rounded-md"

// Large (lg)
className="h-10 px-8 text-sm rounded-md"

// Icon
className="h-9 w-9 p-0 rounded-md"
```

#### Примеры использования

```tsx
// Primary action в форме
<Button className="w-full h-10">
  Добавить операцию
</Button>

// Toolbar actions
<div className="flex gap-2">
  <Button variant="outline" size="sm">
    <Filter className="w-4 h-4 mr-1.5" /> Фильтр
  </Button>
  <Button variant="outline" size="sm">
    <Download className="w-4 h-4 mr-1.5" /> Экспорт
  </Button>
</div>

// Table row actions
<Button variant="ghost" size="sm">
  <Edit2 className="w-4 h-4" />
</Button>
```

---

### 2. Cards (Карточки)

Контейнеры для группировки контента.

#### Standard Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Заголовок</CardTitle>
  </CardHeader>
  <CardContent>
    Контент карточки
  </CardContent>
</Card>

// Render:
className="
  rounded-xl                   /* ← Единый radius */
  border border-gray-100
  bg-white
  shadow-sm
  overflow-hidden
"

// CardHeader
className="p-5 border-b border-gray-50"

// CardTitle
className="text-sm font-semibold text-gray-900"

// CardContent
className="p-5"
```

#### KPI Card (Метрики)

Специальная карточка для отображения ключевых показателей.

```tsx
<div className="
  bg-white rounded-2xl border border-gray-100 shadow-sm p-5
  hover:shadow-md transition-shadow
">
  <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-medium text-gray-500 uppercase">
      Доходы
    </span>
    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
      <TrendingUp className="w-4 h-4 text-emerald-600" />
    </div>
  </div>
  
  <div className="text-2xl font-bold text-gray-900">
    2,500,000
  </div>
  <div className="text-xs text-gray-400 mt-1">KGS</div>
  
  {/* Optional: Delta */}
  <div className="text-xs mt-2 font-medium text-emerald-600">
    +12.5% <span className="text-gray-400 font-normal">vs прошлый мес.</span>
  </div>
</div>
```

**Правила для KPI Cards:**
- `rounded-2xl` (не `rounded-xl`)
- `p-5` (не `p-4`)
- Числа всегда `text-2xl font-bold`
- Иконка в правом верхнем углу в цветном квадрате `w-8 h-8 rounded-lg`
- Label всегда `text-xs font-medium text-gray-500 uppercase`

---

### 3. Forms (Формы)

#### Input

```tsx
<div>
  <Label className="text-xs font-medium text-gray-500 uppercase">
    Название
  </Label>
  <Input 
    className="mt-1 h-9"
    placeholder="Введите значение..."
  />
</div>

// Input render:
className="
  h-9 w-full
  px-3 py-2
  text-sm
  rounded-md
  border border-gray-200
  bg-white
  placeholder:text-gray-400
  focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
  disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
"
```

#### Select

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="mt-1 h-9 text-sm border-gray-200">
    <SelectValue placeholder="Выберите..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Опция 1</SelectItem>
    <SelectItem value="option2">Опция 2</SelectItem>
  </SelectContent>
</Select>

// Trigger render:
className="
  h-9 w-full
  flex items-center justify-between
  px-3 py-2
  text-sm
  rounded-md
  border border-gray-200
  bg-white
"
```

#### Textarea

```tsx
<Textarea 
  className="mt-1 text-sm resize-none border-gray-200"
  rows={3}
  placeholder="Введите текст..."
/>

// Render:
className="
  w-full
  px-3 py-2
  text-sm
  rounded-md
  border border-gray-200
  bg-white
  placeholder:text-gray-400
  resize-none
"
```

#### Label

```tsx
<Label className="text-xs font-medium text-gray-500 uppercase">
  Описание
</Label>

// Render:
className="
  text-xs
  font-medium
  text-gray-500
  uppercase
  tracking-wider
"
```

**Правило:** Все labels должны быть uppercase с `text-xs font-medium text-gray-500`.

---

### 4. Tables (Таблицы)

Отображение табличных данных.

```tsx
<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-gray-50/80 border-b border-gray-100">
        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
          Название
        </th>
        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
          Сумма
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
        <td className="px-4 py-2.5 text-sm text-gray-900">
          Операция 1
        </td>
        <td className="px-4 py-2.5 text-sm text-right font-mono font-semibold text-gray-900">
          250,000
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Правила для таблиц:**
- Таблица всегда обёрнута в карточку с `rounded-xl` и `overflow-hidden`
- Header: `bg-gray-50/80` (полупрозрачный серый)
- Header text: `text-xs font-semibold text-gray-400 uppercase`
- Row hover: `hover:bg-gray-50/50`
- Row border: `border-b border-gray-50` (очень светлый)
- Числа: `font-mono font-semibold`
- Padding cells: `px-4 py-2.5`

---

### 5. Badges (Бейджи)

Маленькие labels для статусов и категорий.

```tsx
// Status Badges
<Badge className="bg-emerald-100 text-emerald-700">
  Активен
</Badge>

<Badge className="bg-red-100 text-red-700">
  Просрочен
</Badge>

<Badge className="bg-amber-100 text-amber-700">
  Ожидает
</Badge>

<Badge className="bg-blue-100 text-blue-700">
  Инфо
</Badge>

<Badge className="bg-gray-100 text-gray-700">
  Завершён
</Badge>

// Render:
className="
  inline-flex items-center
  px-2.5 py-0.5
  text-xs font-semibold
  rounded-md
  border border-transparent
  whitespace-nowrap
"
```

**Цветовая схема для статусов:**
```tsx
const statusColors = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
}
```

---

### 6. Dialogs / Modals

Overlay windows для форм и деталей.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold text-gray-900">
        Заголовок модального окна
      </DialogTitle>
      <DialogDescription className="text-sm text-gray-500">
        Описание действия
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      {/* Form content */}
    </div>
    
    <DialogFooter className="flex gap-2">
      <Button variant="secondary" onClick={() => setOpen(false)}>
        Отмена
      </Button>
      <Button onClick={handleSave}>
        Сохранить
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Правила:**
- Title: `text-lg font-semibold text-gray-900`
- Description: `text-sm text-gray-500`
- Content: `space-y-4` (вертикальные отступы 16px)
- Footer: `flex gap-2` (кнопки вплотную друг к другу)

---

### 7. Right Panel (Боковая панель)

Для создания/редактирования - Adesk-style.

```tsx
{panelOpen && (
  <div className="
    fixed right-0 top-0 h-screen w-80
    bg-white
    shadow-2xl border-l border-gray-100
    flex flex-col z-50
  ">
    {/* Header */}
    <div className="
      px-5 py-4
      border-b border-gray-100
      flex items-center justify-between
      bg-gray-50
    ">
      <div className="text-sm font-semibold text-gray-800">
        Добавить операцию
      </div>
      <button 
        onClick={() => setPanelOpen(false)}
        className="text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
    
    {/* Content (scrollable) */}
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {/* Form fields */}
    </div>
    
    {/* Footer */}
    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
      <Button className="w-full">
        Сохранить
      </Button>
    </div>
  </div>
)}
```

**Правила:**
- Всегда `w-80` (320px)
- Всегда `fixed right-0 top-0 h-screen`
- Header и Footer: `bg-gray-50` + borders
- Content: `overflow-y-auto` + `space-y-4`
- Z-index: `z-50`

---

## Spacing & Layout

### Spacing Scale

Используем единую шкалу spacing из Tailwind. Основные значения:

```css
--spacing-1:  0.25rem  (4px)
--spacing-2:  0.5rem   (8px)
--spacing-3:  0.75rem  (12px)
--spacing-4:  1rem     (16px)   ← БАЗОВЫЙ
--spacing-5:  1.25rem  (20px)
--spacing-6:  1.5rem   (24px)
--spacing-8:  2rem     (32px)
```

### Gap (Расстояния между элементами)

```tsx
// ✅ РЕКОМЕНДУЕТСЯ
gap-2   // 8px  - для плотно расположенных элементов (кнопки в toolbar)
gap-3   // 12px - стандартное расстояние между элементами
gap-4   // 16px - расстояние между крупными блоками

// ⚠️ ИСПОЛЬЗОВАТЬ РЕДКО
gap-1   // 4px  - только для очень мелких элементов
gap-6   // 24px - только для больших разделов
```

**Примеры:**

```tsx
// Toolbar с кнопками
<div className="flex gap-2">
  <Button>Фильтр</Button>
  <Button>Экспорт</Button>
</div>

// Grid с карточками
<div className="grid grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>

// Вертикальный список
<div className="space-y-3">
  <Item />
  <Item />
</div>
```

### Padding (Внутренние отступы)

```tsx
// Cards
p-4    // Стандартные карточки
p-5    // KPI карточки, важный контент
p-6    // Большие модальные окна

// Table cells
px-4 py-2.5   // Стандартные ячейки

// Buttons
px-3 py-2     // Small
px-4 py-2     // Default
px-8 py-2     // Large

// Form fields
px-3 py-2     // Inputs, Selects
```

### Margin

**Принцип:** Используем `space-y-*` и `gap-*` вместо `margin`. Margin только для edge cases.

```tsx
// ✅ ПРАВИЛЬНО
<div className="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// ❌ НЕПРАВИЛЬНО
<div>
  <div className="mb-4">Item 1</div>
  <div className="mb-4">Item 2</div>
</div>
```

### Layout Containers

```tsx
// Page container
<div className="p-6 space-y-6">
  {/* Страница с отступами 24px и вертикальным spacing 24px */}
</div>

// Section container
<div className="space-y-4">
  {/* Секция с элементами через 16px */}
</div>

// Grid layouts
<div className="grid grid-cols-3 gap-4">
  {/* 3 колонки с gap 16px */}
</div>

<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Responsive: 2 на мобильных, 4 на desktop */}
</div>
```

---

## Состояния и интерактивность

### Hover States

```css
/* Buttons */
hover:bg-blue-700           /* Primary */
hover:bg-gray-200           /* Secondary */
hover:bg-gray-50            /* Outline */
hover:bg-gray-100           /* Ghost */

/* Cards */
hover:shadow-md             /* Лёгкий lift */
hover:border-gray-300       /* Усиление border */

/* Table rows */
hover:bg-gray-50/50         /* Очень лёгкий фон */

/* Links */
hover:text-blue-700
hover:underline
```

### Focus States

```css
/* Inputs */
focus:outline-none 
focus:ring-1 
focus:ring-blue-500 
focus:border-blue-500

/* Buttons */
focus-visible:outline-none 
focus-visible:ring-1 
focus-visible:ring-blue-500
```

### Active States

```css
/* Buttons */
active:bg-blue-800          /* Темнее на 1 уровень */
active:shadow-none          /* Убираем shadow */

/* Tabs */
.active {
  border-bottom: 2px solid blue-600;
  color: blue-600;
  font-weight: 600;
}
```

### Disabled States

```css
disabled:opacity-50
disabled:cursor-not-allowed
disabled:pointer-events-none
```

### Transitions

```css
/* Стандартные */
transition-colors duration-150   /* Изменение цвета */
transition-all duration-200      /* Всё вместе */
transition-shadow duration-200   /* Тени */

// В коде:
className="transition-colors duration-150"
```

---

## Примеры использования

### 1. Dashboard Page

```tsx
export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Добрый день, Администратор!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Обзор показателей на сегодня
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        {/* Repeat for other KPIs */}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Динамика доходов и расходов</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart */}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Структура расходов</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Donut chart */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 2. List Page with Table

```tsx
export default function OperationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Операции</h1>
          <p className="text-sm text-gray-500 mt-1">
            Управление приходами и расходами
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Добавить операцию
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-1.5" />
          Фильтр
        </Button>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1.5" />
          Экспорт
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
                Дата
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
                Описание
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
                Сумма
              </th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op) => (
              <tr key={op.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 text-xs text-gray-400">
                  {op.date}
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-900">{op.description}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{op.category}</div>
                </td>
                <td className={`px-4 py-2.5 text-right font-mono font-semibold ${
                  op.type === 'income' ? 'text-emerald-600' : 'text-gray-700'
                }`}>
                  {op.type === 'income' ? '+' : '−'}{formatAmount(op.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 3. Form Page

```tsx
export default function CreateProjectPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Новый проект</h1>
        <p className="text-sm text-gray-500 mt-1">
          Создайте новый строительный проект
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="p-6">
          <form className="space-y-5">
            {/* Section */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Основная информация
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-500 uppercase">
                    Название проекта *
                  </Label>
                  <Input 
                    className="mt-1 h-9"
                    placeholder='ЖК "Бишкек Хайтс"'
                  />
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">
                    Регион
                  </Label>
                  <Select>
                    <SelectTrigger className="mt-1 h-9 border-gray-200">
                      <SelectValue placeholder="Выберите регион" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bishkek">Бишкек</SelectItem>
                      <SelectItem value="osh">Ош</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </Label>
                  <Select>
                    <SelectTrigger className="mt-1 h-9 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Планирование</SelectItem>
                      <SelectItem value="active">Активен</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 pt-4 border-t border-gray-100">
              <Button type="button" variant="secondary" className="flex-1">
                Отмена
              </Button>
              <Button type="submit" className="flex-1">
                Создать проект
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Что НЕ использовать

### 1. Запрещённые цвета

```tsx
// ❌ НЕПРАВИЛЬНО - Слишком яркие неоновые цвета
bg-emerald-500     // Замените на emerald-400
bg-red-500         // Замените на red-400
bg-purple-500      // Замените на purple-400 или уберите
bg-violet-500      // Замените на indigo-500 или уберите
bg-green-500       // Замените на emerald-400
bg-pink-500        // Избегайте использования

// ✅ ПРАВИЛЬНО
bg-emerald-400     // Мягкий зелёный
bg-red-400         // Мягкий красный
bg-blue-600        // Насыщенный синий (для кнопок)
text-emerald-600   // Тёмный зелёный (для текста)
```

### 2. Запрещённые паттерны

```tsx
// ❌ НЕПРАВИЛЬНО
<div className="rounded-3xl">           // Слишком большой radius
<button className="bg-gradient-to-r">   // Градиенты (не нужны)
<div className="animate-bounce">        // Избыточная анимация
<p className="text-3xl">                // Слишком большой текст для body
<span className="font-black">           // Слишком жирный шрифт (900)

// ✅ ПРАВИЛЬНО
<div className="rounded-xl">            // Стандартный radius
<button className="bg-blue-600">        // Solid цвет
<div className="transition-colors">     // Простая transition
<p className="text-base">               // Стандартный body text
<span className="font-bold">            // Нормальный жирный (700)
```

### 3. Устаревшие классы (не использовать в новом коде)

```tsx
// Эти классы есть в старом коде, но НЕ ИСПОЛЬЗУЙТЕ их в новом:

rounded-2xl          // Только для KPI cards! Везде остальное - rounded-xl
gap-1                // Слишком мало, используйте gap-2 минимум
gap-6                // Слишком много, используйте gap-4 максимум
text-[10px]          // Избегайте, используйте text-xs минимум
p-1, p-2             // Для карточек используйте p-4 или p-5
shadow-2xl           // Слишком сильная тень, используйте shadow-sm или shadow-md
```

### 4. Anti-patterns

```tsx
// ❌ НЕПРАВИЛЬНО - Избыточная вложенность
<div className="flex items-center justify-center">
  <div className="flex items-center">
    <span>Text</span>
  </div>
</div>

// ✅ ПРАВИЛЬНО
<div className="flex items-center justify-center">
  <span>Text</span>
</div>

// ❌ НЕПРАВИЛЬНО - Inline styles
<div style={{ backgroundColor: '#3b82f6' }}>

// ✅ ПРАВИЛЬНО
<div className="bg-blue-600">

// ❌ НЕПРАВИЛЬНО - Несемантичные цвета
<Badge className="bg-purple-100 text-purple-700">Активен</Badge>

// ✅ ПРАВИЛЬНО
<Badge className="bg-emerald-100 text-emerald-700">Активен</Badge>
```

---

## Roadmap внедрения

### Phase 1: Critical Fixes (Week 1)

**Приоритет: HIGH**

1. **operations.tsx** - Убрать яркие кнопки
   ```tsx
   // Заменить
   bg-emerald-500 → bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50
   bg-red-500 → bg-white border-red-200 text-red-700 hover:bg-red-50
   bg-blue-500 → bg-blue-600
   ```

2. **dashboard.tsx** - Убрать неоновый netProfit card
   ```tsx
   // Заменить
   bg-emerald-500 → bg-white + conditional border/text colors
   ```

3. **Все KPI Cards** - Унифицировать дизайн
   - Всегда `rounded-2xl p-5`
   - Иконки в `w-8 h-8 rounded-lg` цветных квадратах
   - Цифры `text-2xl font-bold text-gray-900`

### Phase 2: Component Library (Week 2)

**Приоритет: MEDIUM**

1. Создать `/src/components/design-system/`
   - `Button.tsx` - Новые варианты с правильными цветами
   - `Card.tsx` - Обёрнутый Card с правильными defaults
   - `KPICard.tsx` - Переиспользуемый компонент
   - `StatusBadge.tsx` - Правильные цвета статусов

2. Обновить существующие UI components
   - `button.tsx` - Убрать hover-elevate, добавить правильные hover states
   - `badge.tsx` - Обновить цвета
   - `card.tsx` - Добавить варианты

### Phase 3: Global Refactor (Week 3-4)

**Приоритет: LOW (но важно для consistency)**

1. Прогнать все 112 страниц и заменить:
   - `emerald-500` → `emerald-400`
   - `red-500` → `red-400`
   - `purple-500/violet-500` → удалить или заменить на `blue-600`
   - Унифицировать `rounded-*` (карточки = xl, кнопки = md)
   - Унифицировать spacing (`gap-2`, `gap-3`, `gap-4`)

2. Создать Storybook или UI Kit страницу
   - Показать все компоненты
   - Примеры использования
   - Do's and Don'ts

### Phase 4: Documentation (Week 5)

1. Onboarding guide для новых разработчиков
2. Figma/Sketch mockups (опционально)
3. Automated linting rules (ESLint plugin для проверки запрещённых классов)

---

## Заключение

Эта дизайн-система основана на реальном анализе 112 страниц системы BuildFlow. Она объединяет лучшие практики, найденные в коде, и устраняет inconsistency и AI-tellы (яркие неоновые цвета).

**Ключевые принципы:**

1. **Мягкие цвета** - emerald-400 вместо emerald-500
2. **Единый radius** - rounded-xl для карточек, rounded-md для кнопок
3. **Четкая типографика** - text-2xl для H1, text-sm для body
4. **Spacing консистентность** - gap-2/3/4, избегать gap-1/6
5. **Semantic colors** - emerald для success, red для danger, blue для info
6. **Профессиональный вид** - без градиентов, bounce анимаций, неоновых оттенков

---

**Вопросы или предложения?**  
Контакты: dev@buildflow.kg

**Changelog:**
- v1.0.0 (6 мая 2026) - Initial release на основе аудита всех 112 страниц
