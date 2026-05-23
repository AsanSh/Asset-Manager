# BuildFlow Component Examples

> **Цель:** Ready-to-use code snippets для быстрой разработки  
> **Использование:** Copy-paste эти примеры в свой код  

---

## Table of Contents

1. [KPI Dashboard Grid](#kpi-dashboard-grid)
2. [Data Tables](#data-tables)
3. [Forms](#forms)
4. [Status Badges](#status-badges)
5. [Action Buttons](#action-buttons)
6. [Page Layouts](#page-layouts)
7. [Modals & Dialogs](#modals--dialogs)
8. [Charts & Visualizations](#charts--visualizations)
9. [Empty States](#empty-states)
10. [Loading States](#loading-states)

---

## KPI Dashboard Grid

### Basic 4-column KPI Grid

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Revenue KPI */}
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
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
    <div className="text-xs mt-2 font-medium text-emerald-600">
      +12.5% <span className="text-gray-400 font-normal">vs прошлый мес.</span>
    </div>
  </div>

  {/* Expenses KPI */}
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-gray-500 uppercase">
        Расходы
      </span>
      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
        <TrendingDown className="w-4 h-4 text-red-600" />
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900">2,000,000</div>
    <div className="text-xs text-gray-400 mt-1">KGS</div>
    <div className="text-xs mt-2 font-medium text-red-600">
      -8.3% <span className="text-gray-400 font-normal">vs прошлый мес.</span>
    </div>
  </div>

  {/* Profit KPI */}
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-gray-500 uppercase">
        Чистая прибыль
      </span>
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
        <BarChart2 className="w-4 h-4 text-blue-600" />
      </div>
    </div>
    <div className="text-2xl font-bold text-emerald-600">+500,000</div>
    <div className="text-xs text-gray-400 mt-1">KGS • рентабельность 20%</div>
  </div>

  {/* Balance KPI */}
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-gray-500 uppercase">
        Остатки на счетах
      </span>
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
        <Wallet className="w-4 h-4 text-blue-600" />
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900">5,200,000</div>
    <div className="text-xs text-gray-400 mt-1">KGS • 3 счёта</div>
  </div>
</div>
```

### KPI Card Component (Reusable)

```tsx
interface KPICardProps {
  label: string;
  value: string | number;
  currency?: string;
  icon: React.ElementType;
  iconColor: 'emerald' | 'red' | 'blue' | 'amber' | 'gray';
  delta?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
}

export function KPICard({ 
  label, 
  value, 
  currency, 
  icon: Icon, 
  iconColor,
  delta,
  subtitle 
}: KPICardProps) {
  const iconBgColors = {
    emerald: 'bg-emerald-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
    gray: 'bg-gray-100',
  };

  const iconTextColors = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    gray: 'text-gray-600',
  };

  const deltaColors = {
    positive: 'text-emerald-600',
    negative: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase">
          {label}
        </span>
        <div className={`w-8 h-8 ${iconBgColors[iconColor]} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconTextColors[iconColor]}`} />
        </div>
      </div>
      
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      
      {currency && (
        <div className="text-xs text-gray-400 mt-1">
          {currency}{subtitle && ` • ${subtitle}`}
        </div>
      )}
      
      {delta && (
        <div className={`text-xs mt-2 font-medium ${deltaColors[delta.isPositive ? 'positive' : 'negative']}`}>
          {delta.value} <span className="text-gray-400 font-normal">vs прошлый мес.</span>
        </div>
      )}
    </div>
  );
}

// Usage:
<KPICard
  label="Доходы"
  value="2,500,000"
  currency="KGS"
  icon={TrendingUp}
  iconColor="emerald"
  delta={{ value: "+12.5%", isPositive: true }}
/>
```

---

## Data Tables

### Standard Table Pattern

```tsx
<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-gray-50/80 border-b border-gray-100">
        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
          <input type="checkbox" className="rounded" />
        </th>
        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
          Дата
        </th>
        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
          Описание
        </th>
        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
          Контрагент
        </th>
        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">
          Сумма
        </th>
        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase w-20">
          Действия
        </th>
      </tr>
    </thead>
    <tbody>
      {isLoading ? (
        <tr>
          <td colSpan={6} className="text-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Загрузка...
          </td>
        </tr>
      ) : data.length === 0 ? (
        <tr>
          <td colSpan={6} className="text-center py-16 text-gray-400">
            <FileX className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            Нет данных
          </td>
        </tr>
      ) : (
        data.map((item) => (
          <tr 
            key={item.id} 
            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group"
          >
            <td className="px-4 py-2.5">
              <input 
                type="checkbox" 
                className="rounded opacity-0 group-hover:opacity-100 transition-opacity" 
              />
            </td>
            <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
              {formatDate(item.date)}
            </td>
            <td className="px-4 py-2.5">
              <div className="font-medium text-gray-900">{item.description}</div>
              {item.category && (
                <div className="text-xs text-gray-400 mt-0.5">{item.category}</div>
              )}
            </td>
            <td className="px-4 py-2.5 text-gray-600">
              {item.counterparty || '—'}
            </td>
            <td className={`px-4 py-2.5 text-right font-mono font-semibold ${
              item.type === 'income' ? 'text-emerald-600' : 'text-gray-700'
            }`}>
              {item.type === 'income' ? '+' : '−'}{formatAmount(item.amount)}
            </td>
            <td className="px-4 py-2.5 text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
  
  {/* Pagination */}
  {totalPages > 1 && (
    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
      <div className="text-xs text-gray-500">
        Показано {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} из {total}
      </div>
      <div className="flex gap-1">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map(p => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              onClick={() => setPage(p)}
              className="min-w-[32px]"
            >
              {p}
            </Button>
          ))
        }
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page === totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )}
</div>
```

### Compact Table (for nested/inline display)

```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-gray-100">
      <th className="text-left px-3 py-2 text-xs text-gray-400">Позиция</th>
      <th className="text-right px-3 py-2 text-xs text-gray-400">Кол-во</th>
      <th className="text-right px-3 py-2 text-xs text-gray-400">Цена</th>
    </tr>
  </thead>
  <tbody>
    {items.map(item => (
      <tr key={item.id} className="border-b border-gray-50 last:border-0">
        <td className="px-3 py-2 text-gray-700">{item.name}</td>
        <td className="px-3 py-2 text-right font-mono text-gray-600">{item.qty}</td>
        <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
          {formatAmount(item.price)}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## Forms

### Standard Form Layout

```tsx
<Card>
  <CardContent className="p-6">
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Section Header */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Основная информация
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Full-width field */}
          <div className="col-span-2">
            <Label className="text-xs font-medium text-gray-500 uppercase">
              Название *
            </Label>
            <Input
              className="mt-1 h-9"
              placeholder="Введите название..."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          
          {/* Two-column fields */}
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase">
              Регион
            </Label>
            <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
              <SelectTrigger className="mt-1 h-9 border-gray-200">
                <SelectValue placeholder="Выберите регион" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bishkek">Бишкек</SelectItem>
                <SelectItem value="osh">Ош</SelectItem>
                <SelectItem value="jalalabad">Джалал-Абад</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase">
              Статус
            </Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="mt-1 h-9 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Планирование</SelectItem>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="paused">Приостановлен</SelectItem>
                <SelectItem value="completed">Завершён</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date field */}
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase">
              Дата начала
            </Label>
            <Input
              type="date"
              className="mt-1 h-9"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          
          {/* Number field */}
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase">
              Сумма
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                className="flex-1 h-9 font-mono"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger className="w-20 h-9 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KGS">KGS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Textarea */}
          <div className="col-span-2">
            <Label className="text-xs font-medium text-gray-500 uppercase">
              Описание
            </Label>
            <Textarea
              className="mt-1 text-sm resize-none border-gray-200"
              rows={3}
              placeholder="Дополнительная информация..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </div>
      
      {/* Form Footer */}
      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            'Создать'
          )}
        </Button>
      </div>
    </form>
  </CardContent>
</Card>
```

### Inline Form (for quick actions)

```tsx
<div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
  <form onSubmit={handleQuickAdd} className="flex gap-2">
    <Input
      className="flex-1 h-9"
      placeholder="Быстрое добавление..."
      value={quickValue}
      onChange={e => setQuickValue(e.target.value)}
    />
    <Button type="submit" size="sm" disabled={!quickValue.trim()}>
      <Plus className="w-4 h-4 mr-1.5" />
      Добавить
    </Button>
  </form>
</div>
```

---

## Status Badges

### Status Helper

```tsx
// src/lib/status-helpers.ts

export const statusColors = {
  // Generic statuses
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  
  // Financial
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  unpaid: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  partial: "bg-blue-100 text-blue-700 border-blue-200",
  
  // Project
  planning: "bg-gray-100 text-gray-700 border-gray-200",
  inProgress: "bg-blue-100 text-blue-700 border-blue-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  
  // Lease
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  expired: "bg-amber-100 text-amber-700 border-amber-200",
  terminated: "bg-red-100 text-red-700 border-red-200",
} as const;

export const statusLabels = {
  active: "Активен",
  inactive: "Неактивен",
  pending: "Ожидает",
  completed: "Завершён",
  cancelled: "Отменён",
  paid: "Оплачено",
  unpaid: "Не оплачено",
  overdue: "Просрочено",
  partial: "Частично",
  planning: "Планирование",
  inProgress: "В работе",
  paused: "Приостановлен",
  done: "Завершён",
  draft: "Черновик",
  expired: "Истёк",
  terminated: "Расторгнут",
} as const;

export type Status = keyof typeof statusColors;

// Usage component:
interface StatusBadgeProps {
  status: Status;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Badge className={statusColors[status]}>
      {label || statusLabels[status]}
    </Badge>
  );
}
```

### Usage Examples

```tsx
// Simple
<StatusBadge status="active" />

// Custom label
<StatusBadge status="paid" label="Полностью оплачено" />

// With icon
<Badge className={statusColors.overdue}>
  <AlertCircle className="w-3 h-3 mr-1" />
  Просрочено
</Badge>

// Inline status (not badge)
<span className={`text-xs font-medium ${
  status === 'paid' ? 'text-emerald-600' : 
  status === 'overdue' ? 'text-red-600' : 
  'text-gray-600'
}`}>
  {statusLabels[status]}
</span>
```

---

## Action Buttons

### Toolbar Pattern

```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm">
    <Filter className="w-4 h-4 mr-1.5" />
    Фильтр
  </Button>
  <Button variant="outline" size="sm">
    <Download className="w-4 h-4 mr-1.5" />
    Экспорт
  </Button>
  <Button variant="outline" size="sm">
    <Upload className="w-4 h-4 mr-1.5" />
    Импорт
  </Button>
  
  <div className="flex-1" />
  
  <Button>
    <Plus className="w-4 h-4 mr-2" />
    Добавить
  </Button>
</div>
```

### Action Dropdown

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <MoreHorizontal className="w-4 h-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuItem onClick={handleEdit}>
      <Edit2 className="w-4 h-4 mr-2" />
      Редактировать
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleDuplicate}>
      <Copy className="w-4 h-4 mr-2" />
      Дублировать
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Экспортировать
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
      <Trash2 className="w-4 h-4 mr-2" />
      Удалить
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Button Group

```tsx
<div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
  {['day', 'week', 'month', 'year'].map(period => (
    <button
      key={period}
      onClick={() => setPeriod(period)}
      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
        period === selectedPeriod
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {period === 'day' ? 'День' : 
       period === 'week' ? 'Неделя' : 
       period === 'month' ? 'Месяц' : 'Год'}
    </button>
  ))}
</div>
```

---

## Page Layouts

### Standard Page Layout

```tsx
export default function StandardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Название страницы
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Краткое описание назначения страницы
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Создать
          </Button>
        </div>
      </div>

      {/* Filters/Toolbar */}
      <div className="flex items-center gap-2">
        {/* Left side filters */}
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1" />
        
        {/* Right side search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 h-9"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Content here */}
      </div>
    </div>
  );
}
```

### Dashboard Layout (with sidebar)

```tsx
export default function DashboardLayout() {
  return (
    <div className="flex gap-5">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        
        {/* KPIs, Charts, etc */}
      </div>

      {/* Right Sidebar */}
      <div className="w-64 flex-shrink-0 space-y-4">
        {/* Tasks Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              Мои задачи
              <span className="ml-auto w-5 h-5 bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center rounded-full">
                5
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Task items */}
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              Уведомления
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Notification items */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Modals & Dialogs

### Standard Modal

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold text-gray-900">
        Заголовок модального окна
      </DialogTitle>
      <DialogDescription className="text-sm text-gray-500">
        Краткое описание того, что делает это окно
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Content */}
    </div>

    <DialogFooter className="flex gap-2 pt-4 border-t border-gray-100">
      <Button variant="secondary" onClick={() => setOpen(false)}>
        Отмена
      </Button>
      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Сохранение...
          </>
        ) : (
          'Сохранить'
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Confirmation Dialog

```tsx
<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
      <AlertDialogDescription>
        Это действие нельзя отменить. Объект будет удалён навсегда.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Отмена</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirm}
        className="bg-red-600 hover:bg-red-700"
      >
        Удалить
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Charts & Visualizations

### Simple Bar Chart

```tsx
<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
  <div className="text-sm font-semibold text-gray-700 mb-4">
    Динамика расходов
  </div>
  
  <div className="space-y-2">
    {expensesByCategory.map((cat, i) => {
      const maxAmount = Math.max(...expensesByCategory.map(c => c.amount));
      const percentage = (cat.amount / maxAmount) * 100;
      
      return (
        <div key={cat.name} className="flex items-center gap-3">
          <div className="w-24 text-xs text-gray-500 truncate text-right flex-shrink-0">
            {cat.name}
          </div>
          <div className="flex-1 h-6 bg-gray-50 rounded overflow-hidden">
            <div
              className="h-full rounded flex items-center px-2"
              style={{
                width: `${percentage}%`,
                backgroundColor: chartColors[i % chartColors.length],
                minWidth: 8,
              }}
            >
              {percentage > 15 && (
                <span className="text-[10px] text-white font-medium">
                  {formatShort(cat.amount)}
                </span>
              )}
            </div>
          </div>
          <div className="w-20 text-xs font-mono text-right text-gray-600">
            {formatAmount(cat.amount)}
          </div>
        </div>
      );
    })}
  </div>
</div>
```

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <FileX className="w-12 h-12 text-gray-200 mb-3" />
  <h3 className="text-base font-semibold text-gray-900 mb-1">
    Нет данных
  </h3>
  <p className="text-sm text-gray-500 mb-4 max-w-sm">
    Пока не создано ни одного объекта. Нажмите кнопку ниже, чтобы добавить первый.
  </p>
  <Button onClick={() => setCreateOpen(true)}>
    <Plus className="w-4 h-4 mr-2" />
    Создать первый объект
  </Button>
</div>
```

---

## Loading States

```tsx
// Full page loading
<div className="flex items-center justify-center h-64">
  <div className="text-center">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
    <p className="text-sm text-gray-500">Загрузка...</p>
  </div>
</div>

// Skeleton for KPI cards
<div className="grid grid-cols-4 gap-4">
  {Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  ))}
</div>

// Skeleton for table
<div className="space-y-2">
  {Array.from({ length: 5 }).map((_, i) => (
    <Skeleton key={i} className="h-12 w-full" />
  ))}
</div>
```

---

## Usage Tips

1. **Always use semantic colors** - emerald for success, red for danger, blue for info
2. **Consistency is key** - use the same pattern throughout the app
3. **Accessibility first** - ensure color contrast meets WCAG AA
4. **Mobile responsive** - use grid cols-2 lg:cols-4 pattern
5. **Loading states** - always show feedback during async operations

---

**Copy these examples** и адаптируйте под свои нужды!

**См. также:**
- `DESIGN_SYSTEM.md` - Полная дизайн-система
- `MIGRATION_GUIDE.md` - Руководство по миграции
- `UI_AUDIT_REPORT.md` - Результаты аудита
