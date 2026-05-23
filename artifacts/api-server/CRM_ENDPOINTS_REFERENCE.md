# CRM API Endpoints - Quick Reference Card

## Authentication
All endpoints require: `Authorization: Bearer {token}`

---

## 📋 LEADS

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/crm/leads` | List leads | ✅ | All |
| POST | `/crm/leads` | Create lead | ✅ | All |
| PATCH | `/crm/leads/:id` | Update lead | ✅ | All |
| PATCH | `/crm/leads/:id/status` | Change status | ✅ | All |
| DELETE | `/crm/leads/:id` | Delete lead | ✅ | admin/owner |

### Query Parameters (GET /crm/leads)
- `status` - Filter by status (new/contacted/qualified/lost/converted)
- `source` - Filter by source (call/website/referral/advertising/other)
- `assignedTo` - Filter by assigned user ID

### Lead Statuses
`new` → `contacted` → `qualified` → `converted` / `lost`

---

## 👥 CLIENTS

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/crm/clients` | List clients | ✅ | All |
| POST | `/crm/clients` | Create client | ✅ | All |
| PATCH | `/crm/clients/:id` | Update client | ✅ | All |
| GET | `/crm/clients/:id` | Get with history | ✅ | All |

### Query Parameters (GET /crm/clients)
- `type` - Filter by type (individual/company)
- `status` - Filter by status (active/inactive)

### Response Enrichment
GET `/crm/clients/:id` includes:
- `deals[]` - Array of all client deals
- `contracts[]` - Array of all client contracts

---

## 💼 DEALS

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/crm/deals` | List deals | ✅ | All |
| POST | `/crm/deals` | Create deal | ✅ | All |
| PATCH | `/crm/deals/:id` | Update deal | ✅ | All |
| PATCH | `/crm/deals/:id/stage` | Move to stage | ✅ | All |
| GET | `/crm/deals/pipeline` | Pipeline stats | ✅ | All |

### Query Parameters (GET /crm/deals)
- `stage` - Filter by stage
- `propertyId` - Filter by property
- `clientId` - Filter by client

### Deal Stages & Auto-Probability
| Stage | Probability |
|-------|-------------|
| lead | 10% |
| viewing | 25% |
| negotiation | 50% |
| contract | 75% |
| closed_won | 100% |
| closed_lost | 0% |

### Pipeline Stages Flow
`lead` → `viewing` → `negotiation` → `contract` → `closed_won` / `closed_lost`

---

## 📄 SALES CONTRACTS

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/crm/sales-contracts` | List contracts | ✅ | All |
| POST | `/crm/sales-contracts` | Create contract | ✅ | All |
| PATCH | `/crm/sales-contracts/:id` | Update contract | ✅ | All |
| GET | `/crm/sales-contracts/:id` | Get details | ✅ | All |

### Query Parameters (GET /crm/sales-contracts)
- `status` - Filter by status (draft/signed/registered/cancelled)
- `clientId` - Filter by client
- `propertyId` - Filter by property

### Contract Statuses
`draft` → `signed` → `registered` / `cancelled`

### Payment Schedule Format (JSONB)
```json
{
  "paymentSchedule": [
    {
      "date": "2026-05-10",
      "amount": 1000000,
      "status": "pending",
      "description": "First payment"
    }
  ]
}
```

---

## 🏢 SALES PROPERTIES

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/crm/sales-properties` | List properties | ✅ | All |
| POST | `/crm/sales-properties` | Add for sale | ✅ | All |
| PATCH | `/crm/sales-properties/:id` | Update | ✅ | All |

### Query Parameters (GET /crm/sales-properties)
- `status` - Filter by status (available/reserved/sold)

### Property Statuses
`available` → `reserved` → `sold`

### Photos Format (JSONB)
```json
{
  "photos": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]
}
```

---

## 📊 DASHBOARD

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/crm/dashboard` | CRM analytics | ✅ | All |

### Dashboard Response
```json
{
  "leads": {
    "total": 50,
    "active": 30,
    "converted": 15,
    "conversionRate": 30.0
  },
  "deals": {
    "total": 25,
    "byStage": {
      "lead": 5,
      "viewing": 8,
      "negotiation": 6,
      "contract": 4,
      "closed_won": 2,
      "closed_lost": 0
    },
    "revenueForecast": 15000000,
    "totalRevenue": 8000000
  },
  "contracts": {
    "total": 6,
    "active": 4,
    "registered": 2
  }
}
```

---

## 📝 Request Body Examples

### Create Lead
```json
{
  "fullName": "John Doe",
  "phone": "+996555123456",
  "email": "john@example.com",
  "source": "website",
  "status": "new",
  "propertyType": "apartment",
  "budget": "5000000",
  "currency": "KGS",
  "notes": "Interested in 2-bedroom",
  "assignedUserId": 1
}
```

### Create Client
```json
{
  "fullName": "Jane Smith",
  "type": "individual",
  "phone": "+996777654321",
  "email": "jane@example.com",
  "address": "123 Main St, Bishkek",
  "passportData": "ID AN1234567",
  "birthDate": "1985-03-15",
  "budget": "8000000",
  "currency": "KGS",
  "creditApproved": "yes",
  "status": "active"
}
```

### Create Deal
```json
{
  "clientId": 1,
  "propertyId": 5,
  "dealAmount": "7500000",
  "currency": "KGS",
  "stage": "lead",
  "probability": 10,
  "expectedCloseDate": "2026-06-30",
  "assignedUserId": 1,
  "notes": "Initial contact"
}
```

### Create Sales Contract
```json
{
  "contractNumber": "SL-2026-001",
  "clientId": 1,
  "propertyId": 5,
  "totalAmount": "7500000",
  "currency": "KGS",
  "paymentSchedule": [
    {
      "date": "2026-05-10",
      "amount": 1000000,
      "status": "pending",
      "description": "Down payment"
    },
    {
      "date": "2026-07-10",
      "amount": 6500000,
      "status": "pending",
      "description": "Final payment"
    }
  ],
  "signDate": "2026-05-05",
  "status": "draft",
  "notes": "Contract for 2-bedroom apartment"
}
```

### Create Sales Property
```json
{
  "propertyId": 5,
  "salePrice": "7500000",
  "currency": "KGS",
  "status": "available",
  "marketingDescription": "Beautiful 2-bedroom apartment with mountain views",
  "photos": [
    "https://example.com/photos/living-room.jpg",
    "https://example.com/photos/bedroom.jpg"
  ],
  "availableFrom": "2026-05-01"
}
```

---

## 🔄 Status Change Shortcuts

### Change Lead Status
```bash
PATCH /crm/leads/:id/status
{"status": "qualified"}
```

### Move Deal Stage
```bash
PATCH /crm/deals/:id/stage
{"stage": "negotiation"}
```

Both automatically update timestamps and probabilities.

---

## 🎯 Common Filters

### Filter Active Leads
```
GET /crm/leads?status=new
GET /crm/leads?status=contacted
```

### Filter by Assignment
```
GET /crm/leads?assignedTo=1
```

### Filter Deals in Pipeline
```
GET /crm/deals?stage=negotiation
```

### Filter by Property
```
GET /crm/deals?propertyId=5
GET /crm/sales-contracts?propertyId=5
```

### Filter by Client
```
GET /crm/deals?clientId=1
GET /crm/sales-contracts?clientId=1
```

---

## 🔐 Authorization Matrix

| Endpoint | Roles Allowed | Notes |
|----------|---------------|-------|
| GET (all) | All authenticated | Company-scoped |
| POST (all) | All authenticated | Company-scoped |
| PATCH (all) | All authenticated | Company-scoped |
| DELETE leads | admin, owner | Destructive |

---

## 💡 Response Enrichment

### Leads List
- `assignedUserName` - Full name of assigned user

### Deals List
- `clientName` - Client full name
- `propertyUnitNumber` - Property unit number
- `propertyProjectName` - Project name
- `assignedUserName` - Assigned user name

### Contracts List
- `clientName` - Client full name
- `propertyUnitNumber` - Property unit number
- `propertyProjectName` - Project name

### Sales Properties List
- `unitNumber` - Property unit number
- `projectName` - Project name
- `address` - Property address
- `type` - Property type
- `area` - Property area
- `rooms` - Number of rooms

---

## 🌍 Supported Currencies

Default: `KGS`

Common values:
- `KGS` - Kyrgyzstani Som
- `USD` - US Dollar
- `EUR` - Euro
- `RUB` - Russian Ruble

All numeric values stored as `NUMERIC(15, 2)`.

---

## ⚡ Performance Tips

1. Use specific filters to reduce result sets
2. Dashboard endpoint is cached-friendly
3. Individual GET endpoints include full enrichment
4. List endpoints have optimized joins

---

## 📖 Related Documentation

- **CRM_MODULE_SUMMARY.md** - Complete technical docs
- **CRM_API_TEST_COMMANDS.md** - Full test suite
- **CRM_QUICK_START.md** - Installation guide

---

## 🐛 Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing required fields, invalid format |
| 401 | Unauthorized | Invalid/expired token |
| 403 | Forbidden | Insufficient role permissions |
| 404 | Not Found | Resource doesn't exist or wrong company |
| 500 | Server Error | Database/server issue |

---

**Last Updated:** 2026-05-05
**API Version:** 1.0
**Base Path:** `/crm`
