#!/bin/bash
# Warehouse API Test Commands
# Replace YOUR_AUTH_TOKEN with actual Bearer token from login

API_URL="http://localhost:3000"
TOKEN="YOUR_AUTH_TOKEN"

echo "=== Warehouse Module API Tests ==="
echo ""

# ========================================
# SUPPLIERS
# ========================================

echo "1. Create Supplier"
curl -X POST "$API_URL/warehouse/suppliers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ООО Стройматериалы",
    "contactPerson": "Иванов Иван",
    "phone": "+996555123456",
    "email": "info@stroymateriali.kg",
    "address": "г. Бишкек, ул. Строительная 10",
    "inn": "01234567890123",
    "paymentTerms": "Предоплата 50%, остаток по факту поставки",
    "rating": 5,
    "notes": "Надежный поставщик цемента и кирпича"
  }'

echo -e "\n\n2. Get All Suppliers"
curl -X GET "$API_URL/warehouse/suppliers" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n3. Get Active Suppliers Only"
curl -X GET "$API_URL/warehouse/suppliers?isActive=true" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n4. Update Supplier (ID=1)"
curl -X PATCH "$API_URL/warehouse/suppliers/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "notes": "Обновленная информация о поставщике"
  }'

# ========================================
# ITEMS
# ========================================

echo -e "\n\n5. Create Warehouse Item - Cement"
curl -X POST "$API_URL/warehouse/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'

echo -e "\n\n6. Create Warehouse Item - Brick"
curl -X POST "$API_URL/warehouse/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Кирпич красный",
    "category": "building_materials",
    "unit": "шт",
    "currentStock": 0,
    "minStock": 1000,
    "maxStock": 10000,
    "unitPrice": 15,
    "currency": "KGS",
    "sku": "BRICK-RED-STD",
    "location": "Склад Б, площадка 3",
    "description": "Кирпич красный керамический одинарный"
  }'

echo -e "\n\n7. Get All Items"
curl -X GET "$API_URL/warehouse/items" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n8. Search Items by Name"
curl -X GET "$API_URL/warehouse/items?search=цемент" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n9. Filter by Category"
curl -X GET "$API_URL/warehouse/items?category=building_materials" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n10. Get Items In Stock"
curl -X GET "$API_URL/warehouse/items?inStock=true" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n11. Update Item (ID=1)"
curl -X PATCH "$API_URL/warehouse/items/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "unitPrice": 475,
    "minStock": 60
  }'

# ========================================
# INCOMING (Поступления)
# ========================================

echo -e "\n\n12. Create Incoming Operation - Cement Delivery"
curl -X POST "$API_URL/warehouse/incoming" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 1,
    "quantity": 200,
    "unitPrice": 450,
    "currency": "KGS",
    "supplierId": 1,
    "documentNumber": "ПН-2026-0001",
    "documentDate": "2026-05-05",
    "warehouseLocation": "Склад А, стеллаж 1",
    "notes": "Первая партия цемента для строительства ЖК Восток"
  }'

echo -e "\n\n13. Create Incoming Operation - Bricks"
curl -X POST "$API_URL/warehouse/incoming" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 2,
    "quantity": 5000,
    "unitPrice": 15,
    "currency": "KGS",
    "supplierId": 1,
    "documentNumber": "ПН-2026-0002",
    "documentDate": "2026-05-05",
    "warehouseLocation": "Склад Б, площадка 3"
  }'

echo -e "\n\n14. Get All Incoming Operations"
curl -X GET "$API_URL/warehouse/incoming" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n15. Get Incoming by Item ID"
curl -X GET "$API_URL/warehouse/incoming?itemId=1" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n16. Get Incoming by Supplier"
curl -X GET "$API_URL/warehouse/incoming?supplierId=1" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n17. Get Incoming Details (ID=1)"
curl -X GET "$API_URL/warehouse/incoming/1" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n18. Update Incoming Operation"
curl -X PATCH "$API_URL/warehouse/incoming/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Доставлено в полном объеме, качество соответствует ГОСТу"
  }'

# ========================================
# OUTGOING (Списания/Выдача)
# ========================================

echo -e "\n\n19. Create Outgoing Operation - Cement to Construction"
curl -X POST "$API_URL/warehouse/outgoing" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 1,
    "quantity": 50,
    "recipientType": "construction_project",
    "recipientId": 1,
    "purpose": "Заливка фундамента корпус А",
    "documentNumber": "РН-2026-0001",
    "issuedBy": "Петров П.П.",
    "issuedDate": "2026-05-05",
    "notes": "Выдано бригаде №3"
  }'

echo -e "\n\n20. Create Outgoing - Bricks to Department"
curl -X POST "$API_URL/warehouse/outgoing" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 2,
    "quantity": 1000,
    "recipientType": "department",
    "purpose": "Облицовочные работы",
    "documentNumber": "РН-2026-0002",
    "issuedBy": "Сидоров С.С.",
    "issuedDate": "2026-05-05"
  }'

echo -e "\n\n21. Try to Create Outgoing with Insufficient Stock (should fail)"
curl -X POST "$API_URL/warehouse/outgoing" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 1,
    "quantity": 10000,
    "recipientType": "other",
    "purpose": "Test insufficient stock"
  }'

echo -e "\n\n22. Get All Outgoing Operations"
curl -X GET "$API_URL/warehouse/outgoing" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n23. Get Outgoing by Item"
curl -X GET "$API_URL/warehouse/outgoing?itemId=1" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n24. Get Outgoing by Recipient Type"
curl -X GET "$API_URL/warehouse/outgoing?recipientType=construction_project" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n25. Get Outgoing Details (ID=1)"
curl -X GET "$API_URL/warehouse/outgoing/1" \
  -H "Authorization: Bearer $TOKEN"

# ========================================
# INVENTORY (Инвентаризация)
# ========================================

echo -e "\n\n26. Create Inventory Check"
curl -X POST "$API_URL/warehouse/inventory" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'

echo -e "\n\n27. Get All Inventories"
curl -X GET "$API_URL/warehouse/inventory" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n28. Get In-Progress Inventories"
curl -X GET "$API_URL/warehouse/inventory?status=in_progress" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n29. Complete Inventory (ID=1) - Adjust Stock"
curl -X POST "$API_URL/warehouse/inventory/1/complete" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n30. Get Completed Inventories"
curl -X GET "$API_URL/warehouse/inventory?status=completed" \
  -H "Authorization: Bearer $TOKEN"

# ========================================
# DASHBOARD
# ========================================

echo -e "\n\n31. Get Warehouse Dashboard Stats"
curl -X GET "$API_URL/warehouse/dashboard" \
  -H "Authorization: Bearer $TOKEN"

# ========================================
# CLEANUP (Admin only)
# ========================================

echo -e "\n\n32. Delete Supplier (Admin only, ID=1)"
curl -X DELETE "$API_URL/warehouse/suppliers/1" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n33. Delete Item (Admin only, ID=1)"
curl -X DELETE "$API_URL/warehouse/items/1" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== Tests Complete ===\n"
