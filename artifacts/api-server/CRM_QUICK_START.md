# CRM Module - Quick Start Guide

## 🚀 Installation (3 Steps)

### Step 1: Run Database Migration
```bash
cd /Users/asans/Desktop/4Project/Asset-Manager
psql -U postgres -d assetmanager -f lib/db/migrations/create_crm_tables.sql
```

### Step 2: Rebuild Database Package
```bash
cd lib/db
npm run build
```

### Step 3: Restart API Server
```bash
cd ../../artifacts/api-server
npm run dev
```

---

## ✅ Quick Test

```bash
# Set your token (get from login)
export AUTH_TOKEN="your-token-here"
export BASE_URL="http://localhost:3000"

# Test 1: Check dashboard (should return stats)
curl -X GET "$BASE_URL/crm/dashboard" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Test 2: Create a lead
curl -X POST "$BASE_URL/crm/leads" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "phone": "+996555123456",
    "source": "website",
    "propertyType": "apartment",
    "budget": "5000000"
  }'

# Test 3: List leads
curl -X GET "$BASE_URL/crm/leads" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

## 📊 All Endpoints at a Glance

### Leads
```
GET    /crm/leads                  List leads
POST   /crm/leads                  Create lead
PATCH  /crm/leads/:id              Update lead
PATCH  /crm/leads/:id/status       Change status
DELETE /crm/leads/:id              Delete (admin)
```

### Clients
```
GET    /crm/clients                List clients
POST   /crm/clients                Create client
PATCH  /crm/clients/:id            Update client
GET    /crm/clients/:id            Get with history
```

### Deals
```
GET    /crm/deals                  List deals
POST   /crm/deals                  Create deal
PATCH  /crm/deals/:id              Update deal
PATCH  /crm/deals/:id/stage        Move stage
GET    /crm/deals/pipeline         Pipeline stats
```

### Sales Contracts
```
GET    /crm/sales-contracts        List contracts
POST   /crm/sales-contracts        Create contract
PATCH  /crm/sales-contracts/:id    Update contract
GET    /crm/sales-contracts/:id    Get details
```

### Sales Properties
```
GET    /crm/sales-properties       List properties
POST   /crm/sales-properties       Add for sale
PATCH  /crm/sales-properties/:id   Update
```

### Dashboard
```
GET    /crm/dashboard              Analytics
```

---

## 🎯 Common Workflows

### Create Lead → Client → Deal
```bash
# 1. Create Lead
LEAD=$(curl -s -X POST "$BASE_URL/crm/leads" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","phone":"+996555123456","source":"call","budget":"6000000"}')
LEAD_ID=$(echo $LEAD | jq -r '.id')

# 2. Convert Lead
curl -X PATCH "$BASE_URL/crm/leads/$LEAD_ID/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"converted"}'

# 3. Create Client
CLIENT=$(curl -s -X POST "$BASE_URL/crm/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","phone":"+996555123456","type":"individual","budget":"6000000"}')
CLIENT_ID=$(echo $CLIENT | jq -r '.id')

# 4. Create Deal
curl -X POST "$BASE_URL/crm/deals" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":$CLIENT_ID,\"dealAmount\":\"6000000\",\"stage\":\"lead\"}"
```

### Progress Deal Through Pipeline
```bash
DEAL_ID=1

# Lead → Viewing
curl -X PATCH "$BASE_URL/crm/deals/$DEAL_ID/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"viewing"}'

# Viewing → Negotiation
curl -X PATCH "$BASE_URL/crm/deals/$DEAL_ID/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"negotiation"}'

# Negotiation → Contract
curl -X PATCH "$BASE_URL/crm/deals/$DEAL_ID/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"contract"}'

# Contract → Closed Won
curl -X PATCH "$BASE_URL/crm/deals/$DEAL_ID/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"closed_won"}'
```

---

## 📋 Status Flow Reference

### Lead Statuses
```
new → contacted → qualified → converted
                           ↘ lost
```

### Deal Stages
```
lead → viewing → negotiation → contract → closed_won
                                       ↘ closed_lost
```

### Contract Statuses
```
draft → signed → registered
              ↘ cancelled
```

### Property Statuses
```
available → reserved → sold
```

---

## 🔑 Key Features

✅ Complete lead-to-close pipeline
✅ Multi-currency support (KGS, USD, EUR, etc.)
✅ Automatic probability calculation by stage
✅ Activity logging for audit trail
✅ Company isolation (multi-tenant)
✅ Role-based access control
✅ Payment schedule tracking
✅ Property listing management
✅ Dashboard analytics
✅ User assignment tracking

---

## 📚 Documentation Files

- **CRM_MODULE_SUMMARY.md** - Complete technical documentation
- **CRM_API_TEST_COMMANDS.md** - Full test suite with examples
- **CRM_QUICK_START.md** - This file

---

## 🐛 Troubleshooting

### Tables Not Found
```bash
# Verify tables exist
psql -U postgres -d assetmanager -c "\dt crm_*"

# Re-run migration if needed
psql -U postgres -d assetmanager -f lib/db/migrations/create_crm_tables.sql
```

### Import Errors
```bash
# Rebuild db package
cd lib/db
npm run build

# Restart API server
cd ../../artifacts/api-server
npm run dev
```

### Authentication Failed
```bash
# Get fresh token
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

---

## 💡 Tips

1. **Use filters:** All list endpoints support query parameters
   ```bash
   /crm/leads?status=new&source=website
   /crm/deals?stage=negotiation
   /crm/clients?type=company
   ```

2. **Check dashboard regularly:** Get overview of all CRM metrics
   ```bash
   curl -X GET "$BASE_URL/crm/dashboard" -H "Authorization: Bearer $AUTH_TOKEN"
   ```

3. **Use stage endpoint:** Easier than updating full deal
   ```bash
   PATCH /crm/deals/:id/stage
   ```

4. **Assign users:** Set assignedUserId for accountability
   ```json
   {"assignedUserId": 1}
   ```

5. **Track dates:** Use lastContactDate on leads for follow-ups

---

## 🎓 Example: Complete Sale

```bash
# Setup
export AUTH_TOKEN="your-token"
export BASE_URL="http://localhost:3000"

# 1. Lead comes in
curl -X POST "$BASE_URL/crm/leads" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Anna Kim","phone":"+996777123456","source":"website","propertyType":"apartment","budget":"8000000"}'

# 2. Contact the lead
curl -X PATCH "$BASE_URL/crm/leads/1/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted"}'

# 3. Qualify the lead
curl -X PATCH "$BASE_URL/crm/leads/1/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"qualified"}'

# 4. Convert to client
curl -X PATCH "$BASE_URL/crm/leads/1/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"converted"}'

curl -X POST "$BASE_URL/crm/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Anna Kim","phone":"+996777123456","type":"individual","budget":"8000000"}'

# 5. Create deal
curl -X POST "$BASE_URL/crm/deals" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clientId":1,"propertyId":5,"dealAmount":"7800000","stage":"viewing"}'

# 6. Progress deal
curl -X PATCH "$BASE_URL/crm/deals/1/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"negotiation"}'

curl -X PATCH "$BASE_URL/crm/deals/1/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"contract"}'

# 7. Create contract
curl -X POST "$BASE_URL/crm/sales-contracts" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contractNumber":"SL-2026-001","clientId":1,"propertyId":5,"totalAmount":"7800000","status":"draft"}'

# 8. Sign contract
curl -X PATCH "$BASE_URL/crm/sales-contracts/1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"signed","signDate":"2026-05-05"}'

# 9. Close deal
curl -X PATCH "$BASE_URL/crm/deals/1/stage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"closed_won"}'

# 10. Check dashboard
curl -X GET "$BASE_URL/crm/dashboard" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

**🎉 You're ready to use the CRM module!**
