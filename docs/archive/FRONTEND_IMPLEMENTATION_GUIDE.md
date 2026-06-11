# 🎨 Frontend Implementation Guide

**Backend:** ✅ Готов на 100%  
**Frontend:** ⏳ Начинаем

---

## 📋 ПРИОРИТЕТЫ

### Критичные (делаем сейчас):
1. **Компонент уведомлений** (bell + dropdown)
2. **Страница бюджета проекта** 
3. **Export кнопки**

### Важные (Этап 3):
4. Клиентский портал (базовый)
5. Фотогалерея
6. Калькулятор ипотеки

---

## 🔔 1. КОМПОНЕНТ УВЕДОМЛЕНИЙ

### Файлы:
```
/components/notifications/
  ├── NotificationBell.tsx       (иконка с badge)
  ├── NotificationDropdown.tsx   (список)
  └── NotificationItem.tsx       (одно уведомление)
```

### Интеграция в Header:
```tsx
// В /components/layout.tsx
<NotificationBell />
```

---

## 📊 2. СТРАНИЦА БЮДЖЕТА

### Файл:
```
/pages/construction/budget.tsx
```

### Структура:
- Selector проектов
- Summary cards (план/факт/отклонение)
- Таблица категорий (collapsible)
- Модалка добавления статьи
- Кнопка Export

---

## 📥 3. EXPORT КНОПКИ

```tsx
<Button onClick={() => downloadExcel(projectId, "cost-analysis")}>
  <Download /> Export Себестоимость
</Button>
```

---

## 🚀 НАЧИНАЕМ РЕАЛИЗАЦИЮ

Создаем компоненты по порядку...
