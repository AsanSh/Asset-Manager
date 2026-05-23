# BuildFlow Design System - Quick Reference

> **Cheat Sheet** для быстрого доступа к основным стилям

---

## Colors (At a Glance)

### DO ✅

```css
/* Success (positive operations, success states) */
bg-emerald-50     text-emerald-600     bg-emerald-400
bg-emerald-100    text-emerald-700     border-emerald-200

/* Danger (negative operations, errors) */
bg-red-50         text-red-600         bg-red-400
bg-red-100        text-red-700         border-red-200

/* Info (primary actions, information) */
bg-blue-50        text-blue-600        bg-blue-600  ← Buttons
bg-blue-100       text-blue-700        border-blue-200

/* Warning (pending, alerts) */
bg-amber-50       text-amber-600       bg-amber-400
bg-amber-100      text-amber-700       border-amber-200

/* Neutral (default, inactive) */
bg-gray-50        text-gray-600        border-gray-200
bg-gray-100       text-gray-700        border-gray-300
```

### DON'T ❌

```css
/* Too bright, AI-tell colors */
bg-emerald-500    ❌ Use emerald-400 instead
bg-red-500        ❌ Use red-400 instead
bg-purple-500     ❌ Use indigo-500 or blue-600
bg-violet-500     ❌ Use indigo-500 or blue-600
bg-green-500      ❌ Use emerald-400 instead
```

---

## Typography

| Element | Class | Usage |
|---------|-------|-------|
| H1 - Page Title | `text-2xl font-bold text-gray-900` | Main page heading |
| H2 - Section | `text-xl font-semibold text-gray-900` | Section headings |
| H3 - Subsection | `text-lg font-semibold text-gray-800` | Subsection headings |
| Body - Primary | `text-sm text-gray-700` | Main body text |
| Body - Secondary | `text-sm text-gray-600` | Secondary text |
| Caption | `text-xs text-gray-500` | Labels, captions |
| Label | `text-xs font-medium text-gray-500 uppercase` | Form labels |

---

## Spacing

### Gap (между элементами)

```tsx
gap-2   // 8px  - плотные элементы (toolbar buttons)
gap-3   // 12px - стандарт (grid items)
gap-4   // 16px - большие блоки (page sections)
```

### Padding

```tsx
// Cards
p-4     // Стандартные карточки
p-5     // KPI cards

// Table cells
px-4 py-2.5

// Buttons
px-3 py-2   // Small
px-4 py-2   // Default
```

### Space-y (вертикальный)

```tsx
space-y-3   // Между элементами формы
space-y-4   // Между секциями
space-y-6   // Между крупными блоками страницы
```

---

## Border Radius

```tsx
rounded-md    // Кнопки, инпуты
rounded-xl    // Карточки, таблицы, модалы
rounded-2xl   // KPI cards ONLY
```

---

## Shadows

```tsx
shadow-sm     // Стандарт для карточек
shadow-md     // Hover states
shadow-2xl    // Модальные окна, sidebars
```

---

## Component Quick Reference

### Button

```tsx
// Primary action
<Button>Сохранить</Button>

// Secondary
<Button variant="secondary">Отмена</Button>

// Outline
<Button variant="outline">Фильтр</Button>

// Danger
<Button variant="destructive">Удалить</Button>

// With icon
<Button>
  <Plus className="w-4 h-4 mr-2" />
  Добавить
</Button>
```

### KPI Card

```tsx
<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
  <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-medium text-gray-500 uppercase">Label</span>
    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
      <Icon className="w-4 h-4 text-emerald-600" />
    </div>
  </div>
  <div className="text-2xl font-bold text-gray-900">Value</div>
  <div className="text-xs text-gray-400 mt-1">Subtitle</div>
</div>
```

### Table

```tsx
<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-gray-50/80 border-b border-gray-100">
        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
          Header
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
        <td className="px-4 py-2.5">Cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Status Badge

```tsx
// Success
<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
  Активен
</Badge>

// Danger
<Badge className="bg-red-100 text-red-700 border-red-200">
  Просрочен
</Badge>

// Warning
<Badge className="bg-amber-100 text-amber-700 border-amber-200">
  Ожидает
</Badge>

// Neutral
<Badge className="bg-gray-100 text-gray-700 border-gray-200">
  Завершён
</Badge>
```

### Form Field

```tsx
<div>
  <Label className="text-xs font-medium text-gray-500 uppercase">
    Название
  </Label>
  <Input className="mt-1 h-9" placeholder="..." />
</div>
```

---

## Status Colors Helper

```tsx
// src/lib/status-colors.ts
export const statusColors = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  unpaid: "bg-amber-100 text-amber-700 border-amber-200",
} as const;

// Usage:
<Badge className={statusColors.active}>Активен</Badge>
```

---

## Page Layout Template

```tsx
export default function Page() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Title</h1>
          <p className="text-sm text-gray-500 mt-1">Description</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Action
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-1.5" />
          Фильтр
        </Button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* ... */}
      </div>
    </div>
  );
}
```

---

## Common Patterns

### Loading State

```tsx
{isLoading ? (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
) : (
  // Content
)}
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16">
  <FileX className="w-12 h-12 text-gray-200 mb-3" />
  <h3 className="text-base font-semibold text-gray-900 mb-1">Нет данных</h3>
  <p className="text-sm text-gray-500 mb-4">Описание</p>
  <Button>Создать</Button>
</div>
```

### Error State

```tsx
<div className="bg-red-50 border border-red-200 rounded-xl p-4">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <h4 className="text-sm font-semibold text-red-900 mb-1">Ошибка</h4>
      <p className="text-sm text-red-700">{errorMessage}</p>
    </div>
  </div>
</div>
```

---

## Icons

### Size Standards

```tsx
w-4 h-4   // 16px - кнопки, badges
w-5 h-5   // 20px - section icons
w-6 h-6   // 24px - page headers
```

### Common Usage

```tsx
// In buttons
<Plus className="w-4 h-4 mr-2" />

// In KPI cards
<TrendingUp className="w-4 h-4 text-emerald-600" />

// In headers
<Building2 className="w-6 h-6 text-gray-700" />
```

---

## Responsive Grid

```tsx
// 2 on mobile, 4 on desktop
className="grid grid-cols-2 lg:grid-cols-4 gap-4"

// 1 on mobile, 3 on desktop
className="grid grid-cols-1 lg:grid-cols-3 gap-4"

// Auto-fit (flexible)
className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4"
```

---

## Transitions

```tsx
// Color changes
transition-colors duration-150

// All properties
transition-all duration-200

// Shadow
transition-shadow duration-200

// Common combo
hover:shadow-md transition-all duration-200
```

---

## Accessibility

### Color Contrast (WCAG AA)

✅ **PASS:**
- gray-700 on white (10.2:1)
- blue-600 on white (7.2:1)
- emerald-600 on white (4.9:1)
- red-600 on white (6.1:1)

❌ **FAIL:**
- gray-400 on white (2.6:1) ← Don't use for body text
- emerald-500 on white (3.2:1)
- amber-400 on white (2.8:1)

### Focus States

```tsx
focus:outline-none 
focus:ring-1 
focus:ring-blue-500 
focus:border-blue-500
```

---

## Migration Checklist

When updating a file:

- [ ] Replace `emerald-500` → `emerald-400` or `emerald-600`
- [ ] Replace `red-500` → `red-400` or `red-600`
- [ ] Replace `purple-*` → `indigo-*` or `blue-*`
- [ ] Unify border-radius (xl for cards, md for buttons)
- [ ] Check spacing (gap-2/3/4, p-4/5)
- [ ] Update status badges to use helper
- [ ] Ensure labels are uppercase
- [ ] Check color contrast (WCAG AA)
- [ ] Test hover/focus states

---

## Files Structure

```
/src
  /components
    /ui              # Shadcn components
    /design-system   # Custom reusable components (create this)
  /lib
    status-colors.ts # Status helper
    utils.ts         # cn, formatters, etc
  /pages
    [module]/        # Feature pages
```

---

## Quick Find & Replace

```bash
# In VS Code / IDE:

Find:    bg-emerald-500
Replace: bg-emerald-400

Find:    bg-red-500
Replace: bg-red-400

Find:    bg-purple-([0-9]+)
Replace: bg-indigo-$1

Find:    gap-1([^0-9])
Replace: gap-2$1
```

---

## Resources

- **Full Design System:** `DESIGN_SYSTEM.md`
- **Migration Guide:** `MIGRATION_GUIDE.md`
- **Audit Report:** `UI_AUDIT_REPORT.md`
- **Examples:** `COMPONENT_EXAMPLES.md`
- **This Reference:** `QUICK_REFERENCE.md`

---

## Need Help?

1. Check `DESIGN_SYSTEM.md` for detailed specs
2. Check `COMPONENT_EXAMPLES.md` for code snippets
3. Look at already-migrated files as reference
4. Contact: design@buildflow.kg

---

**Print this page** and keep it handy while coding! 🚀
