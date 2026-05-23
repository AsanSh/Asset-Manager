# CRM API Test Commands

This document provides curl commands to test all CRM endpoints.

**Prerequisites:**
- Set your AUTH_TOKEN from login
- Set BASE_URL (e.g., http://localhost:3000)

```bash
export AUTH_TOKEN="your-token-here"
export BASE_URL="http://localhost:3000"
```

## 1. LEADS (Лиды)

### Create a Lead
```bash
curl -X POST "$BASE_URL/crm/leads" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Иван Петров",
    "phone": "+996555123456",
    "email": "ivan.petrov@example.com",
    "source": "website",
    "status": "new",
    "propertyType": "apartment",
    "budget": "5000000",
    "currency": "KGS",
    "notes": "Интересуется 2-комнатной квартирой в центре",
    "assignedUserId": 1
  }'
```

### List All Leads
```bash
curl -X GET "$BASE_URL/crm/leads" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Filter Leads by Status
```bash
curl -X GET "$BASE_URL/crm/leads?status=new" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Filter Leads by Source and Assigned User
```bash
curl -X GET "$BASE_URL/crm/leads?source=website&assignedTo=1" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Update a Lead
```bash
curl -X PATCH "$BASE_URL/crm/leads/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "contacted",
    "lastContactDate": "2026-05-05T10:30:00Z",
    "notes": "Позвонил, назначена встреча на завтра"
  }'
```

### Change Lead Status
```bash
curl -X PATCH "$BASE_URL/crm/leads/1/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "qualified"}'
```

### Convert Lead (status → converted)
```bash
curl -X PATCH "$BASE_URL/crm/leads/1/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "converted"}'
```

### Delete a Lead (admin only)
```bash
curl -X DELETE "$BASE_URL/crm/leads/1" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

## 2. CLIENTS (Клиенты)

### Create an Individual Client
```bash
curl -X POST "$BASE_URL/crm/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Мария Сидорова",
    "type": "individual",
    "phone": "+996777654321",
    "email": "maria.sidorova@example.com",
    "address": "ул. Чуй 123, Бишкек",
    "passportData": "ID AN1234567",
    "birthDate": "1985-03-15",
    "budget": "8000000",
    "currency": "KGS",
    "creditApproved": "yes",
    "notes": "Одобрен кредит на 5 млн",
    "status": "active"
  }'
```

### Create a Company Client
```bash
curl -X POST "$BASE_URL/crm/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "ОсОО Строй-Инвест",
    "type": "company",
    "phone": "+996312555000",
    "email": "info@stroyinvest.kg",
    "address": "пр. Манас 45, Бишкек",
    "inn": "12345678900001",
    "budget": "50000000",
    "currency": "USD",
    "status": "active"
  }'
```

### List All Clients
```bash
curl -X GET "$BASE_URL/crm/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Filter Clients by Type
```bash
curl -X GET "$BASE_URL/crm/clients?type=company" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Get Client with Deals History
```bash
curl -X GET "$BASE_URL/crm/clients/1" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Update a Client
```bash
curl -X PATCH "$BASE_URL/crm/clients/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+996777999888",
    "creditApproved": "pending",
    "notes": "Клиент подал документы на кредит в банк"
  }'
```

---

## 3. DEALS (Сделки)

### Create a Deal
```bash
curl -X POST "$BASE_URL/crm/deals" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 1,
    "propertyId": 5,
    "dealAmount": "7500000",
    "currency": "KGS",
    "stage": "lead",
    "probability": 10,
    "expectedCloseDate": "2026-06-30",
    "assignedUserId": 1,
    "notes": "Первоначальный контакт, клиент интересуется 2-комн. кв."
  }'
```

### List All Deals
```bash
curl -X GET "$BASE_URL/crm/deals" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Filter Deals by Stage
```bash
curl -X GET "$BASE_URL/crm/deals?stage=negotiation" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Filter Deals by Property
```bash
curl -X GET "$BASE_URL/crm/deals?propertyId=5" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Update a Deal
```bash
curl -X PATCH "$BASE_URL/crm/deals/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dealAmount": "7200000",
    "probability": 50,
    "notes": "Клиент запросил скидку, согласовали 7.2 млн"
  }'
```

### Move Deal to Next Stage
```bash
curl -X PATCH "$BASE_URL/crm/deals/1/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "viewing"}'
```

### Move Deal Through Pipeline
```bash
# Lead → Viewing
curl -X PATCH "$BASE_URL/crm/deals/1/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "viewing"}'

# Viewing → Negotiation
curl -X PATCH "$BASE_URL/crm/deals/1/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "negotiation"}'

# Negotiation → Contract
curl -X PATCH "$BASE_URL/crm/deals/1/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "contract"}'

# Contract → Closed Won
curl -X PATCH "$BASE_URL/crm/deals/1/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "closed_won"}'
```

### Get Pipeline Stats
```bash
curl -X GET "$BASE_URL/crm/deals/pipeline" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

## 4. SALES CONTRACTS (Договоры продажи)

### Create a Sales Contract
```bash
curl -X POST "$BASE_URL/crm/sales-contracts" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractNumber": "SL-2026-001",
    "clientId": 1,
    "propertyId": 5,
    "totalAmount": "7200000",
    "currency": "KGS",
    "paymentSchedule": [
      {"date": "2026-05-10", "amount": 1000000, "status": "pending", "description": "Первоначальный взнос"},
      {"date": "2026-06-10", "amount": 2000000, "status": "pending", "description": "Второй платеж"},
      {"date": "2026-07-10", "amount": 4200000, "status": "pending", "description": "Окончательный расчет"}
    ],
    "signDate": "2026-05-05",
    "status": "draft",
    "notes": "Договор на 2-комн. кв. в ЖК Парус"
  }'
```

### List All Sales Contracts
```bash
curl -X GET "$BASE_URL/crm/sales-contracts" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Filter Contracts by Status
```bash
curl -X GET "$BASE_URL/crm/sales-contracts?status=signed" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Get Contract with Full Details
```bash
curl -X GET "$BASE_URL/crm/sales-contracts/1" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Update Contract Status
```bash
curl -X PATCH "$BASE_URL/crm/sales-contracts/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "signed",
    "signDate": "2026-05-06",
    "notes": "Договор подписан обеими сторонами"
  }'
```

### Register Contract
```bash
curl -X PATCH "$BASE_URL/crm/sales-contracts/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "registered",
    "registrationDate": "2026-05-10",
    "notes": "Договор зарегистрирован в Госрегистре"
  }'
```

### Update Payment Schedule
```bash
curl -X PATCH "$BASE_URL/crm/sales-contracts/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentSchedule": [
      {"date": "2026-05-10", "amount": 1000000, "status": "paid", "description": "Первоначальный взнос"},
      {"date": "2026-06-10", "amount": 2000000, "status": "pending", "description": "Второй платеж"},
      {"date": "2026-07-10", "amount": 4200000, "status": "pending", "description": "Окончательный расчет"}
    ]
  }'
```

---

## 5. SALES PROPERTIES (Объекты на продажу)

### Add Property for Sale
```bash
curl -X POST "$BASE_URL/crm/sales-properties" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": 5,
    "salePrice": "7500000",
    "currency": "KGS",
    "status": "available",
    "marketingDescription": "Отличная 2-комнатная квартира с ремонтом, 65 м², 5 этаж, панорамные окна, вид на горы. ЖК Парус, сдан в 2024 году.",
    "photos": [
      "https://example.com/photos/apt5-living-room.jpg",
      "https://example.com/photos/apt5-bedroom.jpg",
      "https://example.com/photos/apt5-kitchen.jpg"
    ],
    "availableFrom": "2026-05-01"
  }'
```

### List All Sales Properties
```bash
curl -X GET "$BASE_URL/crm/sales-properties" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Filter Available Properties
```bash
curl -X GET "$BASE_URL/crm/sales-properties?status=available" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Update Property Price
```bash
curl -X PATCH "$BASE_URL/crm/sales-properties/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salePrice": "7200000",
    "notes": "Снижена цена для быстрой продажи"
  }'
```

### Mark Property as Reserved
```bash
curl -X PATCH "$BASE_URL/crm/sales-properties/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "reserved"
  }'
```

### Mark Property as Sold
```bash
curl -X PATCH "$BASE_URL/crm/sales-properties/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sold"
  }'
```

---

## 6. DASHBOARD & STATS

### Get CRM Dashboard
```bash
curl -X GET "$BASE_URL/crm/dashboard" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

Response will include:
- Total, active, and converted leads
- Conversion rate
- Deals by stage
- Revenue forecast (weighted by probability)
- Total won revenue
- Active and registered contracts

---

## Complete Workflow Example

### Step 1: Create a Lead
```bash
LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/crm/leads" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Анна Кузнецова",
    "phone": "+996555777888",
    "email": "anna.k@example.com",
    "source": "call",
    "propertyType": "apartment",
    "budget": "6000000",
    "currency": "KGS"
  }')
LEAD_ID=$(echo $LEAD_RESPONSE | jq -r '.id')
echo "Created Lead ID: $LEAD_ID"
```

### Step 2: Qualify the Lead
```bash
curl -X PATCH "$BASE_URL/crm/leads/$LEAD_ID/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "qualified"}'
```

### Step 3: Convert Lead to Client
```bash
curl -X PATCH "$BASE_URL/crm/leads/$LEAD_ID/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "converted"}'

# Create client manually
CLIENT_RESPONSE=$(curl -s -X POST "$BASE_URL/crm/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Анна Кузнецова",
    "phone": "+996555777888",
    "email": "anna.k@example.com",
    "type": "individual",
    "budget": "6000000",
    "currency": "KGS",
    "status": "active"
  }')
CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.id')
echo "Created Client ID: $CLIENT_ID"
```

### Step 4: Create a Deal
```bash
DEAL_RESPONSE=$(curl -s -X POST "$BASE_URL/crm/deals" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": $CLIENT_ID,
    \"propertyId\": 5,
    \"dealAmount\": \"6000000\",
    \"currency\": \"KGS\",
    \"stage\": \"lead\",
    \"expectedCloseDate\": \"2026-07-15\"
  }")
DEAL_ID=$(echo $DEAL_RESPONSE | jq -r '.id')
echo "Created Deal ID: $DEAL_ID"
```

### Step 5: Progress Deal Through Stages
```bash
# Viewing
curl -X PATCH "$BASE_URL/crm/deals/$DEAL_ID/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "viewing"}'

# Negotiation
curl -X PATCH "$BASE_URL/crm/deals/$DEAL_ID/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "negotiation"}'

# Contract
curl -X PATCH "$BASE_URL/crm/deals/$DEAL_ID/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "contract"}'
```

### Step 6: Create Sales Contract
```bash
CONTRACT_RESPONSE=$(curl -s -X POST "$BASE_URL/crm/sales-contracts" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"contractNumber\": \"SL-2026-$(date +%s)\",
    \"clientId\": $CLIENT_ID,
    \"propertyId\": 5,
    \"totalAmount\": \"6000000\",
    \"currency\": \"KGS\",
    \"status\": \"draft\"
  }")
CONTRACT_ID=$(echo $CONTRACT_RESPONSE | jq -r '.id')
echo "Created Contract ID: $CONTRACT_ID"
```

### Step 7: Close the Deal
```bash
curl -X PATCH "$BASE_URL/crm/deals/$DEAL_ID/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "closed_won"}'
```

### Step 8: View Dashboard
```bash
curl -X GET "$BASE_URL/crm/dashboard" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

---

## Notes

1. **Authentication**: All endpoints require Bearer token authentication
2. **Company Isolation**: All data is automatically filtered by companyId from the authenticated user
3. **Role Permissions**: DELETE operations require admin or owner role
4. **Activity Logging**: All CRM operations are logged in the activity log
5. **Status Transitions**:
   - Leads: new → contacted → qualified → converted/lost
   - Deals: lead → viewing → negotiation → contract → closed_won/closed_lost
   - Contracts: draft → signed → registered → cancelled
   - Sales Properties: available → reserved → sold

6. **Enrichment**: List endpoints automatically include related entity names (client names, property details, assigned user names)
