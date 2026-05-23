# Warehouse Module - Quick Reference

## API Endpoints Summary

### Items
```
GET    /warehouse/items              - List items (filters: search, category, inStock)
POST   /warehouse/items              - Create item
PATCH  /warehouse/items/:id          - Update item
DELETE /warehouse/items/:id          - Delete item (admin only)
```

### Incoming
```
GET    /warehouse/incoming           - List incoming (filters: itemId, supplierId, dates)
POST   /warehouse/incoming           - Create incoming (auto stock increase)
GET    /warehouse/incoming/:id       - Get details
PATCH  /warehouse/incoming/:id       - Update (recalculate stock)
```

### Outgoing
```
GET    /warehouse/outgoing           - List outgoing (filters: itemId, recipientType, dates)
POST   /warehouse/outgoing           - Create outgoing (auto stock decrease)
GET    /warehouse/outgoing/:id       - Get details
```

### Inventory
```
GET    /warehouse/inventory          - List inventories (filter: status)
POST   /warehouse/inventory          - Create inventory
POST   /warehouse/inventory/:id/complete - Complete & adjust stock
```

### Suppliers
```
GET    /warehouse/suppliers          - List suppliers (filter: isActive)
POST   /warehouse/suppliers          - Create supplier
PATCH  /warehouse/suppliers/:id      - Update supplier
DELETE /warehouse/suppliers/:id      - Delete supplier (admin only)
```

### Dashboard
```
GET    /warehouse/dashboard          - Stats, alerts, recent operations
```

## Key Features

### Automatic Stock Management
- **Incoming**: `POST /warehouse/incoming` → Auto increases item stock
- **Outgoing**: `POST /warehouse/outgoing` → Auto decreases item stock (with validation)
- **Inventory**: `POST /warehouse/inventory/:id/complete` → Adjusts stock to actual count

### Stock Validation
- Outgoing operations check available stock before allowing operation
- Prevents negative stock
- Returns error with available vs requested quantities

### Low Stock Alerts
- Dashboard shows items where `currentStock ≤ minStock`
- Automatically calculated

## Common Usage Patterns

### 1. Receive New Materials
```bash
curl -X POST /warehouse/incoming \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "itemId": 1,
    "quantity": 100,
    "unitPrice": 450,
    "supplierId": 1,
    "documentNumber": "ПН-2026-001"
  }'
```

### 2. Issue Materials to Construction
```bash
curl -X POST /warehouse/outgoing \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "itemId": 1,
    "quantity": 50,
    "recipientType": "construction_project",
    "recipientId": 1,
    "purpose": "Фундамент корпус А"
  }'
```

### 3. Conduct Inventory
```bash
# Step 1: Create inventory
curl -X POST /warehouse/inventory \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "inventoryDate": "2026-05-05",
    "items": [
      {"itemId": 1, "expectedQty": 150, "actualQty": 148}
    ]
  }'

# Step 2: Complete and adjust stock
curl -X POST /warehouse/inventory/1/complete \
  -H "Authorization: Bearer TOKEN"
```

### 4. Check Low Stock Items
```bash
curl -X GET /warehouse/dashboard \
  -H "Authorization: Bearer TOKEN"
```

## Database Tables

- `warehouse_items` - Inventory items
- `warehouse_suppliers` - Suppliers
- `warehouse_incoming` - Delivery records
- `warehouse_outgoing` - Usage records
- `warehouse_inventory` - Inventory checks

## Item Fields

```typescript
{
  name: string           // Required
  category: string       // Default: "materials"
  unit: string          // Required, e.g., "шт", "кг", "м"
  currentStock: number  // Auto-managed
  minStock: number      // For alerts
  maxStock: number      // Optional
  unitPrice: number     // Cost per unit
  currency: string      // Default: "KGS"
  supplier: string      // Supplier name
  sku: string          // Stock Keeping Unit
  barcode: string      // Barcode
  location: string     // Warehouse location
  description: string  // Description
}
```

## Recipient Types (Outgoing)

- `construction_project` - Link to construction project
- `department` - Internal department
- `other` - Other purposes

## Authorization

- All endpoints: Authenticated users
- DELETE operations: Admin or company_admin only
- Data isolated by companyId automatically

## Files Location

```
/lib/db/src/schema/
  ├── warehouse_items.ts
  ├── warehouse_suppliers.ts
  ├── warehouse_incoming.ts
  ├── warehouse_outgoing.ts
  └── warehouse_inventory.ts

/artifacts/api-server/src/routes/
  └── warehouse.ts

/artifacts/api-server/
  ├── WAREHOUSE_MODULE.md (full docs)
  ├── WAREHOUSE_QUICK_REFERENCE.md (this file)
  └── warehouse-api-test.sh (test script)
```

## Testing

```bash
# Run full test suite
./warehouse-api-test.sh

# Or test individual endpoints
curl -X GET http://localhost:3000/warehouse/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Codes

- `400` - Bad request (validation error)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error
