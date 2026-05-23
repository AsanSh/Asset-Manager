# Warehouse Module API Documentation

Complete backend API for warehouse management system with items, suppliers, incoming/outgoing operations, and inventory management.

## Overview

The Warehouse module provides comprehensive inventory management capabilities including:

- **Items Management** - Track materials and goods with stock levels, pricing, and locations
- **Suppliers** - Manage supplier relationships and contact information
- **Incoming Operations** - Record deliveries and automatic stock updates
- **Outgoing Operations** - Track material usage with stock validation
- **Inventory Checks** - Conduct periodic inventories with automatic stock adjustments
- **Dashboard** - Real-time statistics and alerts for low stock items

## Database Schema

### Tables Created

1. **warehouse_items** - Main inventory items
2. **warehouse_suppliers** - Supplier information
3. **warehouse_incoming** - Incoming delivery operations
4. **warehouse_outgoing** - Outgoing/usage operations
5. **warehouse_inventory** - Inventory check records

### Schema Files Location

- `/lib/db/src/schema/warehouse_items.ts`
- `/lib/db/src/schema/warehouse_suppliers.ts`
- `/lib/db/src/schema/warehouse_incoming.ts`
- `/lib/db/src/schema/warehouse_outgoing.ts`
- `/lib/db/src/schema/warehouse_inventory.ts`

## API Endpoints

Base URL: `/warehouse`

### Items (Товары/Материалы)

#### GET /warehouse/items
List all warehouse items with optional filters.

**Query Parameters:**
- `search` (optional) - Search by name, SKU, or barcode
- `category` (optional) - Filter by category
- `inStock` (optional) - Filter by stock status (true/false)

**Response:**
```json
[
  {
    "id": 1,
    "companyId": 1,
    "name": "Цемент М400",
    "category": "building_materials",
    "unit": "мешок",
    "currentStock": "200",
    "minStock": "50",
    "maxStock": "500",
    "unitPrice": "450",
    "currency": "KGS",
    "supplier": "ООО Стройматериалы",
    "sku": "CEM-M400-50KG",
    "barcode": "4606008326017",
    "location": "Склад А, стеллаж 1",
    "description": "Цемент марки М400, мешок 50 кг",
    "isActive": true,
    "createdAt": "2026-05-05T10:00:00Z",
    "updatedAt": "2026-05-05T10:00:00Z"
  }
]
```

#### POST /warehouse/items
Create a new warehouse item.

**Request Body:**
```json
{
  "name": "Цемент М400",
  "category": "building_materials",
  "unit": "мешок",
  "currentStock": 0,
  "minStock": 50,
  "maxStock": 500,
  "unitPrice": 450,
  "currency": "KGS",
  "supplier": "ООО Стройматериалы",
  "sku": "CEM-M400-50KG",
  "barcode": "4606008326017",
  "location": "Склад А, стеллаж 1",
  "description": "Цемент марки М400, мешок 50 кг"
}
```

**Required Fields:** `name`, `unit`

#### PATCH /warehouse/items/:id
Update warehouse item (stock cannot be updated directly - use incoming/outgoing operations).

#### DELETE /warehouse/items/:id
Delete warehouse item (requires admin or company_admin role).

---

### Incoming Operations (Поступления)

#### GET /warehouse/incoming
List all incoming operations with enriched data (item names, supplier names).

**Query Parameters:**
- `itemId` (optional) - Filter by item
- `supplierId` (optional) - Filter by supplier
- `startDate` (optional) - Filter from date
- `endDate` (optional) - Filter to date

**Response:**
```json
[
  {
    "id": 1,
    "companyId": 1,
    "itemId": 1,
    "itemName": "Цемент М400",
    "quantity": "200",
    "unitPrice": "450",
    "totalAmount": "90000",
    "currency": "KGS",
    "supplierId": 1,
    "supplierName": "ООО Стройматериалы",
    "documentNumber": "ПН-2026-0001",
    "documentDate": "2026-05-05",
    "warehouseLocation": "Склад А, стеллаж 1",
    "notes": "Первая партия цемента",
    "createdAt": "2026-05-05T10:00:00Z"
  }
]
```

#### POST /warehouse/incoming
Create incoming operation and automatically increase item stock.

**Request Body:**
```json
{
  "itemId": 1,
  "quantity": 200,
  "unitPrice": 450,
  "currency": "KGS",
  "supplierId": 1,
  "documentNumber": "ПН-2026-0001",
  "documentDate": "2026-05-05",
  "warehouseLocation": "Склад А, стеллаж 1",
  "notes": "Первая партия цемента"
}
```

**Required Fields:** `itemId`, `quantity`, `unitPrice`

**Stock Update:** Automatically adds quantity to item's currentStock.

#### GET /warehouse/incoming/:id
Get detailed information about a specific incoming operation.

#### PATCH /warehouse/incoming/:id
Update incoming operation. If quantity changes, stock is automatically recalculated.

---

### Outgoing Operations (Списания/Выдача)

#### GET /warehouse/outgoing
List all outgoing operations.

**Query Parameters:**
- `itemId` (optional) - Filter by item
- `recipientType` (optional) - Filter by recipient type
- `recipientId` (optional) - Filter by recipient ID
- `startDate` (optional) - Filter from date
- `endDate` (optional) - Filter to date

**Response:**
```json
[
  {
    "id": 1,
    "companyId": 1,
    "itemId": 1,
    "itemName": "Цемент М400",
    "quantity": "50",
    "recipientType": "construction_project",
    "recipientId": 1,
    "purpose": "Заливка фундамента корпус А",
    "documentNumber": "РН-2026-0001",
    "issuedBy": "Петров П.П.",
    "issuedDate": "2026-05-05",
    "notes": "Выдано бригаде №3",
    "createdAt": "2026-05-05T11:00:00Z"
  }
]
```

#### POST /warehouse/outgoing
Create outgoing operation and automatically decrease item stock.

**Request Body:**
```json
{
  "itemId": 1,
  "quantity": 50,
  "recipientType": "construction_project",
  "recipientId": 1,
  "purpose": "Заливка фундамента корпус А",
  "documentNumber": "РН-2026-0001",
  "issuedBy": "Петров П.П.",
  "issuedDate": "2026-05-05",
  "notes": "Выдано бригаде №3"
}
```

**Required Fields:** `itemId`, `quantity`

**Recipient Types:**
- `construction_project` - For construction projects
- `department` - For internal departments
- `other` - For other purposes

**Stock Validation:** Automatically checks if sufficient stock is available. Returns 400 error if insufficient.

**Error Response (Insufficient Stock):**
```json
{
  "error": "Insufficient stock",
  "available": 150,
  "requested": 200
}
```

#### GET /warehouse/outgoing/:id
Get detailed information about a specific outgoing operation.

---

### Inventory Checks (Инвентаризация)

#### GET /warehouse/inventory
List all inventory checks.

**Query Parameters:**
- `status` (optional) - Filter by status (in_progress/completed)

**Response:**
```json
[
  {
    "id": 1,
    "companyId": 1,
    "inventoryDate": "2026-05-05",
    "status": "in_progress",
    "items": [
      {
        "itemId": 1,
        "expectedQty": 150,
        "actualQty": 148
      },
      {
        "itemId": 2,
        "expectedQty": 4000,
        "actualQty": 4000
      }
    ],
    "conductedBy": "Комиссия: Иванов И., Петров П.",
    "completedAt": null,
    "notes": "Плановая инвентаризация склада",
    "createdAt": "2026-05-05T12:00:00Z"
  }
]
```

#### POST /warehouse/inventory
Create a new inventory check.

**Request Body:**
```json
{
  "inventoryDate": "2026-05-05",
  "conductedBy": "Комиссия: Иванов И., Петров П., Сидоров С.",
  "items": [
    {
      "itemId": 1,
      "expectedQty": 150,
      "actualQty": 148
    },
    {
      "itemId": 2,
      "expectedQty": 4000,
      "actualQty": 4000
    }
  ],
  "notes": "Плановая инвентаризация склада"
}
```

**Required Fields:** `inventoryDate`, `items` (array)

**Items Array Format:**
- `itemId` - Item ID
- `expectedQty` - Expected quantity from system
- `actualQty` - Actual quantity counted

#### POST /warehouse/inventory/:id/complete
Complete inventory check and automatically adjust stock levels.

**Response:**
```json
{
  "inventory": {
    "id": 1,
    "status": "completed",
    "completedAt": "2026-05-05T14:00:00Z"
  },
  "adjustments": [
    {
      "itemId": 1,
      "itemName": "Цемент М400",
      "difference": -2,
      "newStock": "148"
    }
  ]
}
```

**Stock Adjustment:** Automatically updates item stock to match actual counted quantities.

---

### Suppliers (Поставщики)

#### GET /warehouse/suppliers
List all suppliers.

**Query Parameters:**
- `isActive` (optional) - Filter by active status (true/false)

**Response:**
```json
[
  {
    "id": 1,
    "companyId": 1,
    "name": "ООО Стройматериалы",
    "contactPerson": "Иванов Иван",
    "phone": "+996555123456",
    "email": "info@stroymateriali.kg",
    "address": "г. Бишкек, ул. Строительная 10",
    "inn": "01234567890123",
    "paymentTerms": "Предоплата 50%, остаток по факту поставки",
    "rating": 5,
    "isActive": true,
    "notes": "Надежный поставщик цемента и кирпича",
    "createdAt": "2026-05-05T09:00:00Z"
  }
]
```

#### POST /warehouse/suppliers
Create a new supplier.

**Request Body:**
```json
{
  "name": "ООО Стройматериалы",
  "contactPerson": "Иванов Иван",
  "phone": "+996555123456",
  "email": "info@stroymateriali.kg",
  "address": "г. Бишкек, ул. Строительная 10",
  "inn": "01234567890123",
  "paymentTerms": "Предоплата 50%, остаток по факту поставки",
  "rating": 5,
  "notes": "Надежный поставщик цемента и кирпича"
}
```

**Required Fields:** `name`

#### PATCH /warehouse/suppliers/:id
Update supplier information.

#### DELETE /warehouse/suppliers/:id
Delete supplier (requires admin or company_admin role).

---

### Dashboard (Статистика)

#### GET /warehouse/dashboard
Get comprehensive warehouse statistics and analytics.

**Response:**
```json
{
  "totalItems": 150,
  "activeItems": 145,
  "lowStockAlerts": 8,
  "lowStockItems": [
    {
      "id": 5,
      "name": "Гвозди 100мм",
      "currentStock": "15",
      "minStock": "50",
      "unit": "кг"
    }
  ],
  "totalValue": "2450000.00",
  "topItems": [
    {
      "id": 1,
      "name": "Цемент М400",
      "currentStock": "148",
      "unit": "мешок",
      "unitPrice": "450",
      "value": 66600
    }
  ],
  "recentIncoming": [
    {
      "id": 1,
      "itemId": 1,
      "itemName": "Цемент М400",
      "quantity": "200",
      "createdAt": "2026-05-05T10:00:00Z"
    }
  ],
  "recentOutgoing": [
    {
      "id": 1,
      "itemId": 1,
      "itemName": "Цемент М400",
      "quantity": "50",
      "createdAt": "2026-05-05T11:00:00Z"
    }
  ]
}
```

**Statistics Include:**
- Total and active items count
- Low stock alerts (items below minimum stock level)
- Total inventory value
- Top 10 items by value
- Recent 10 incoming operations
- Recent 10 outgoing operations

---

## Authentication & Authorization

### Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### Authorization Roles

**All authenticated users** can:
- View items, incoming, outgoing, inventory, suppliers, dashboard
- Create incoming/outgoing operations
- Create and complete inventory checks
- Create and update suppliers

**Admin and Company Admin only** can:
- Delete items (DELETE /warehouse/items/:id)
- Delete suppliers (DELETE /warehouse/suppliers/:id)

### Company Isolation
All data is automatically isolated by `companyId` from the authenticated user's session. Users can only access data belonging to their company.

---

## Activity Logging

All warehouse operations are automatically logged to `activityLogTable` with:
- Module: "warehouse"
- Entity type: warehouse_item, warehouse_incoming, warehouse_outgoing, warehouse_inventory, warehouse_supplier
- Action type: create, update, delete
- Full snapshot of data

Activity logs can be viewed through the existing activity log API.

---

## Error Handling

All endpoints include comprehensive error handling with appropriate HTTP status codes:

- **400 Bad Request** - Missing required fields or validation errors
- **401 Unauthorized** - Invalid or missing authentication token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server errors (all logged)

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

---

## Stock Management Features

### Automatic Stock Updates

1. **Incoming Operations** - Automatically increase stock
2. **Outgoing Operations** - Automatically decrease stock (with validation)
3. **Inventory Completion** - Adjust stock to match actual counted quantities

### Stock Validation

- Outgoing operations check for sufficient stock before creating
- Returns detailed error with available vs requested quantities
- Prevents negative stock situations

### Stock Alerts

Dashboard automatically identifies items where:
```
currentStock <= minStock AND minStock > 0
```

---

## Testing

### Test Script
Use the provided test script to test all endpoints:
```bash
chmod +x warehouse-api-test.sh
./warehouse-api-test.sh
```

**Before running:**
1. Start the API server
2. Login to get authentication token
3. Replace `YOUR_AUTH_TOKEN` in the script with actual token

### Test Coverage

The test script covers:
- All CRUD operations for items, suppliers, inventory
- Incoming/outgoing operations with stock updates
- Stock validation (insufficient stock scenario)
- Inventory completion with adjustments
- Dashboard statistics
- All filter and search parameters

---

## Integration Notes

### Integration with Construction Module

Outgoing operations support `recipientType: "construction_project"` with `recipientId` linking to construction projects. This allows tracking of materials used in specific construction projects.

### Integration with Financial Module

All incoming operations include:
- `unitPrice` and `totalAmount` for cost tracking
- `currency` field for multi-currency support
- Can be integrated with accounting/expense tracking

### Future Enhancements

Potential future features:
- Barcode scanning integration
- Batch/lot tracking
- Expiration date management
- Material reservations
- Transfer between warehouses
- Purchase order management
- Supplier performance analytics

---

## Files Created

### Database Schema
- `/lib/db/src/schema/warehouse_items.ts`
- `/lib/db/src/schema/warehouse_suppliers.ts`
- `/lib/db/src/schema/warehouse_incoming.ts`
- `/lib/db/src/schema/warehouse_outgoing.ts`
- `/lib/db/src/schema/warehouse_inventory.ts`

### API Routes
- `/artifacts/api-server/src/routes/warehouse.ts`

### Documentation
- `/artifacts/api-server/WAREHOUSE_MODULE.md` (this file)
- `/artifacts/api-server/warehouse-api-test.sh` (test script)

### Updated Files
- `/lib/db/src/schema/index.ts` (exports added)
- `/artifacts/api-server/src/routes/index.ts` (router registered)

---

## Support

For issues or questions regarding the Warehouse module, please refer to:
- Technical audit: `/TECHNICAL_AUDIT.md`
- Implementation status: `/IMPLEMENTATION_STATUS.md`
- Project documentation: `/START_PROJECT.md`
