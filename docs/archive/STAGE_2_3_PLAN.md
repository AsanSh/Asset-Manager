# 🚀 План реализации Этапа 2 и 3

**Дата начала:** 05.05.2026  
**Статус:** В работе

---

## 📋 ЭТАП 2 - АВТОМАТИЗАЦИЯ И КОНТРОЛЬ

### 1. Бюджет план/факт по статьям (2-3 дня)

#### 1.1 База данных
```sql
CREATE TABLE construction_budget_categories (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  project_id INTEGER,
  name VARCHAR(255),              -- Материалы, Работы, Зарплата
  planned_amount DECIMAL(15,2),
  spent_amount DECIMAL(15,2),
  progress_percent INTEGER
);

CREATE TABLE construction_budget_line_items (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  project_id INTEGER,
  category_id INTEGER,
  name VARCHAR(255),              -- Цемент, Арматура, ...
  unit VARCHAR(50),               -- тонн, м³, шт
  quantity DECIMAL(10,2),
  unit_price DECIMAL(10,2),
  planned_amount DECIMAL(15,2),
  spent_amount DECIMAL(15,2),
  notes TEXT
);
```

#### 1.2 API Endpoints
- `GET /construction/projects/:id/budget` - Получить бюджет проекта
- `POST /construction/projects/:id/budget/categories` - Создать категорию
- `POST /construction/projects/:id/budget/line-items` - Добавить статью
- `PATCH /construction/budget/line-items/:id` - Обновить факт
- `GET /construction/projects/:id/budget/summary` - Сводка план/факт

#### 1.3 Frontend
- Страница `/construction/budget/:projectId`
- Таблица с категориями (сворачиваемые)
- Progress bars по каждой категории
- Alerts при превышении >10%
- Фильтры (все/превышение/в пределах)

---

### 2. Workflow автоматизации продаж (1-2 дня)

#### 2.1 Trigger при создании договора
```javascript
// В POST /crm/sales-contracts
async function createSalesContract(data) {
  const contract = await db.insert(crmSalesContractsTable).values(data).returning();
  
  // Если указан unit_id - обновить статус юнита
  if (data.unitId) {
    await db.update(constructionUnitsTable)
      .set({
        status: 'sold',
        salesContractId: contract.id,
        clientId: data.clientId,
        salePrice: data.totalAmount,
        saleDate: new Date().toISOString()
      })
      .where(eq(constructionUnitsTable.id, data.unitId));
    
    // Создать уведомление
    await createNotification({
      type: 'sale_completed',
      title: 'Новая продажа',
      message: `Юнит ${unit.unitNumber} продан клиенту ${client.name}`,
      projectId: unit.projectId
    });
  }
  
  return contract;
}
```

#### 2.2 Frontend интеграция
- В форме создания договора добавить поле "Юнит из шахматки"
- Autocomplete поиск по номеру юнита
- Показать детали юнита (площадь, этаж, цена)
- После сохранения - редирект на шахматку с подсветкой проданного юнита

---

### 3. Система уведомлений (1-2 дня)

#### 3.1 База данных
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  user_id INTEGER,                -- для кого (null = все)
  type VARCHAR(50),               -- budget_exceeded, sale_completed, task_overdue
  title VARCHAR(255),
  message TEXT,
  icon VARCHAR(50),               -- alert, check, warning
  color VARCHAR(20),              -- red, green, yellow
  link VARCHAR(255),              -- ссылка при клике
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Правила уведомлений
CREATE TABLE notification_rules (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  type VARCHAR(50),
  condition JSONB,                -- {field: "budget", operator: ">", value: 100}
  enabled BOOLEAN DEFAULT TRUE
);
```

#### 3.2 API Endpoints
- `GET /notifications` - Список уведомлений (непрочитанные + последние 50)
- `PATCH /notifications/:id/read` - Отметить прочитанным
- `DELETE /notifications/:id` - Удалить
- `GET /notifications/unread-count` - Количество непрочитанных
- `POST /notifications` - Создать уведомление (internal)

#### 3.3 Frontend компонент
```tsx
// Notification Bell в Header
<NotificationBell>
  <Badge>12</Badge>  {/* unread count */}
  <DropdownMenu>
    <NotificationItem type="alert">
      Бюджет проекта "ЖК Ала-Тоо" превышен на 15%
    </NotificationItem>
    <NotificationItem type="success">
      Новая продажа: Юнит A-101
    </NotificationItem>
  </DropdownMenu>
</NotificationBell>
```

#### 3.4 Типы уведомлений
- 🔴 `budget_exceeded` - Превышение бюджета >10%
- 🟡 `budget_warning` - Приближение к бюджету >90%
- 🟢 `sale_completed` - Новая продажа
- 🔵 `payment_received` - Поступление платежа
- ⚪ `task_overdue` - Просрочка по задаче
- 🟠 `low_stock` - Низкий остаток на складе

---

### 4. Отчеты с Export в Excel (2-3 дня)

#### 4.1 Библиотека
```bash
pnpm add exceljs
pnpm add @types/exceljs -D
```

#### 4.2 API Endpoints
- `GET /construction/reports/project-cost/:id/excel` - Себестоимость (Excel)
- `GET /construction/reports/budget/:id/excel` - Бюджет план/факт (Excel)
- `GET /construction/reports/sales/:id/excel` - Отчет по продажам (Excel)
- `GET /construction/reports/pnl/:id/excel` - P&L проекта (Excel)

#### 4.3 Структура Excel файла
```
Лист 1: Общая информация
  - Название проекта
  - Период
  - Основные показатели

Лист 2: Бюджет план/факт
  Категория | План | Факт | Отклонение | %
  Материалы | 50млн | 45млн | -5млн | 90%
  ...

Лист 3: Продажи
  Юнит | Площадь | Цена | Статус | Дата
  A-101 | 45.5 | 1.75млн | Продан | 05.05.2026

Лист 4: Себестоимость
  Показатель | План | Факт | Отклонение
  Стоимость м² | 15,000 | 13,500 | -10%
```

#### 4.4 Frontend
- Кнопка "Export в Excel" на каждой странице отчета
- Loading индикатор при генерации
- Автоматическое скачивание файла
- Имя файла: `project_name_report_type_date.xlsx`

---

## 📋 ЭТАП 3 - КЛИЕНТСКИЙ ОПЫТ

### 1. Клиентский портал (2-3 дня)

#### 1.1 Роуты
```typescript
// Публичные роуты (без авторизации или с client role)
/portal/client/login            - Вход клиента
/portal/client/dashboard        - Личный кабинет
/portal/client/my-unit          - Мой юнит (3D + фото)
/portal/client/payments         - График платежей
/portal/client/documents        - Документы (договор, акты)
/portal/client/progress         - Ход строительства
/portal/client/support          - Чат с менеджером
```

#### 1.2 База данных
```sql
-- Расширить crm_clients
ALTER TABLE crm_clients ADD COLUMN portal_access BOOLEAN DEFAULT FALSE;
ALTER TABLE crm_clients ADD COLUMN portal_password VARCHAR(255);
ALTER TABLE crm_clients ADD COLUMN last_login TIMESTAMP;

-- Чат с менеджером
CREATE TABLE client_messages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER,
  from_client BOOLEAN,           -- true = от клиента, false = от менеджера
  message TEXT,
  attachments JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Функции портала
**Dashboard:**
- Приветствие с именем клиента
- Краткая информация о юните
- Прогресс строительства (%)
- Следующий платеж (сумма и дата)
- Последние уведомления

**Мой юнит:**
- 3D визуализация на шахматке
- Характеристики (площадь, этаж, комнаты)
- Планировка (изображение)
- Текущий статус строительства
- Фотогалерея этажа

**Платежи:**
- График платежей (таблица)
- Оплачено / Осталось
- Кнопка "Оплатить онлайн" (integration pending)
- История платежей
- Чеки (PDF download)

**Документы:**
- Договор купли-продажи (PDF)
- Акты приема-передачи
- Чеки об оплате
- Дополнительные соглашения

---

### 2. Фотоотчеты со стройки (1-2 дня)

#### 2.1 Загрузка фото
```typescript
// API Endpoint
POST /construction/projects/:id/photos
Content-Type: multipart/form-data

{
  file: <binary>,
  floorNumber: 5,
  description: "Монолитные работы 5 этаж",
  takenAt: "2026-05-05"
}
```

#### 2.2 Хранение
- Файлы в `/uploads/projects/{project_id}/photos/`
- Thumbnails в `/uploads/projects/{project_id}/photos/thumbs/`
- URL в БД: `construction_progress_photos`

#### 2.3 Frontend
**Страница `/construction/projects/:id/photos`:**
- Фильтр по этажам
- Сортировка по дате
- Grid layout (4 колонки)
- Lightbox при клике
- Кнопка "Загрузить фото" (для менеджеров)
- Отображение в клиентском портале

**Компонент PhotoGallery:**
```tsx
<PhotoGallery>
  <FilterBar>
    <Select>Все этажи</Select>
    <DateRange />
  </FilterBar>
  <PhotoGrid>
    <PhotoCard>
      <Image />
      <Caption>5 этаж - 05.05.2026</Caption>
    </PhotoCard>
  </PhotoGrid>
</PhotoGallery>
```

---

### 3. Маркетинговая страница проекта (2-3 дня)

#### 3.1 Публичный роут
```
/public/projects/:id              - Публичная страница проекта
/public/projects/:id/units        - Доступные юниты
/public/projects/:id/gallery      - Фотогалерея
/public/projects/:id/location     - Карта и инфраструктура
```

#### 3.2 Секции страницы
**Hero Section:**
- Большое изображение проекта
- Название и слоган
- Кнопка "Выбрать квартиру"

**Ключевые преимущества:**
- Иконки + текст (парковка, детсад, безопасность)

**Планировки:**
- Табы (1-комн, 2-комн, 3-комн)
- Изображения планировок
- Площадь и цена от

**Интерактивная шахматка:**
- Выбор этажа
- Цветовая индикация (свободен/продан)
- Клик на юнит → детали + форма заявки

**Инфраструктура:**
- Карта (Yandex Maps или Google Maps)
- Метки: школы, магазины, парки (500м, 1км)

**Галерея:**
- Фото проекта (визуализации + реальные)
- Видео-тур (если есть)

**Форма заявки:**
```tsx
<LeadForm>
  <Input name="name" placeholder="Ваше имя" />
  <Input name="phone" placeholder="Телефон" />
  <Select name="roomCount">
    <Option>1-комнатная</Option>
    <Option>2-комнатная</Option>
  </Select>
  <Button>Оставить заявку</Button>
</LeadForm>
```

При submit → создание лида в CRM (`POST /crm/leads`)

---

### 4. Калькулятор ипотеки (1 день)

#### 4.1 Компонент калькулятора
```tsx
<MortgageCalculator>
  <Input label="Стоимость квартиры" value={1750000} />
  <Input label="Первоначальный взнос" value={350000} />
  <Slider label="Срок кредита (лет)" min={1} max={30} value={15} />
  <Slider label="Процентная ставка (%)" min={1} max={25} value={12} />
  
  <Results>
    <Metric label="Ежемесячный платеж">16,800 сом</Metric>
    <Metric label="Переплата">1,764,000 сом</Metric>
    <Metric label="Общая сумма">3,024,000 сом</Metric>
  </Results>
  
  <Chart>
    {/* График: основной долг vs проценты по годам */}
  </Chart>
</MortgageCalculator>
```

#### 4.2 Формулы
```javascript
// Аннуитетный платеж
monthlyRate = yearlyRate / 12 / 100;
months = years * 12;
loanAmount = price - downPayment;

monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) 
                 / (Math.pow(1 + monthlyRate, months) - 1);

totalAmount = monthlyPayment * months;
overpayment = totalAmount - loanAmount;
```

#### 4.3 Интеграция
- Встроить в маркетинговую страницу проекта
- Добавить на страницу юнита
- Экспорт расчета в PDF
- Поделиться ссылкой на расчет

---

## 📊 ПЛАН РАБОТЫ

### Порядок реализации:

**День 1-2: Бюджет план/факт**
- [ ] Создать таблицы БД
- [ ] API endpoints
- [ ] Frontend страница бюджета
- [ ] Тестирование

**День 3: Workflow продаж**
- [ ] Trigger в CRM API
- [ ] Обновление UI формы договора
- [ ] Интеграция с уведомлениями
- [ ] Тестирование workflow

**День 4-5: Система уведомлений**
- [ ] Таблицы БД
- [ ] API endpoints
- [ ] Frontend компонент (bell + dropdown)
- [ ] Интеграция в существующие модули

**День 6-7: Export в Excel**
- [ ] Установка библиотеки
- [ ] API endpoints для отчетов
- [ ] Генерация Excel файлов
- [ ] Кнопки экспорта в UI

**День 8-10: Клиентский портал**
- [ ] Роуты и компоненты
- [ ] Авторизация клиентов
- [ ] Dashboard и страницы
- [ ] Чат с менеджером

**День 11-12: Фотоотчеты**
- [ ] Upload API
- [ ] Хранение файлов
- [ ] Галерея в UI
- [ ] Интеграция с порталом

**День 13-15: Маркетинговая страница**
- [ ] Публичные роуты
- [ ] Дизайн и верстка
- [ ] Интерактивная шахматка
- [ ] Форма заявки

**День 16: Калькулятор ипотеки**
- [ ] Компонент калькулятора
- [ ] Формулы и расчеты
- [ ] График платежей
- [ ] Интеграция в проект

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

### Этап 2:
- [ ] Бюджет проекта с категориями работает
- [ ] Автообновление юнитов при продаже работает
- [ ] Уведомления показываются в header
- [ ] Excel файлы скачиваются корректно

### Этап 3:
- [ ] Клиент может войти в портал
- [ ] Клиент видит свой юнит и платежи
- [ ] Менеджер может загружать фото
- [ ] Маркетинговая страница открывается публично
- [ ] Калькулятор ипотеки работает

---

## 🚀 НАЧИНАЕМ!

**Готов начать реализацию с Этапа 2.1 - Бюджет план/факт?**
