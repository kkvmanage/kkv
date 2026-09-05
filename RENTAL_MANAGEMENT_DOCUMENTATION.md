# Complex Rental Management Module — Architecture & Operations Guide

## 1. System Overview

The **Complex Rental Management** module is an enterprise-grade, multi-property ledger designed for rental staff and administrators. It manages commercial complexes, shop units, tenant contracts, monthly rental billings, advance credits, cash and GPay payment splits, operating expenses, and synchronization to Google Drive / Google Sheets.

### Authoritative Architecture Data Flow

```
                      RENTAL STAFF / ADMIN
                              │
                              ▼
                       REACT FRONTEND
                       (Vite + TSX)
                              │
                              ▼
                        RENTAL BACKEND
                     (Node.js + Express)
                              │
                              ▼
                    PRIMARY LOCAL DATABASE
            (Authoritative Thread-Safe Ledger)
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        Finance Admin Panel            Sync Queue
        (Live Backend API)                  │
                                            ▼
                                   Google Sheets Mirror
                                   (5 Synchronized Sheets)
```

1. **Authoritative Source of Truth**: The Backend Primary Database (`backend/KKV_GOLD_FINANCE/rental/`) is the sole authoritative source of truth for all live calculations, balances, advance credits, and reports.
2. **Google Drive / Google Sheets Mirror**: Google Sheets is an asynchronous, synchronized mirror/backup. CRUD transactions immediately commit to the Primary Database first, preventing downtime or latency if Google APIs are slow or unreachable.
3. **Admin Panel Integration**: The existing Finance Admin Panel queries `/api/rental/admin/summary` from the backend primary database, displaying live performance without reading directly from Google Sheets.
4. **Role Isolation**: `RENTAL_STAFF` accounts have access exclusively to rental management views and cannot modify loan, customer, deposit, or finance settings.

---

## 2. Data Entities & Human-Readable IDs

All financial records utilize deterministic, monotonic human-readable IDs:

| Entity | ID Format | Description |
| :--- | :--- | :--- |
| **Complex** | `CMP-0001` | Commercial complex building details & location |
| **Shop** | `SHOP-0001` | Commercial shop unit, tenant KYC, monthly rent, advance credit balance |
| **Rent Payment** | `PAY-0001` | Rent payment transaction, month, Cash/GPay split, advance generated & used |
| **Expense** | `EXP-0001` | Maintenance, utilities, repair, plumbing, electricity, cleaning expenses |
| **Audit Log** | `AUD-0001` | Immutable record of user actions and state diffs |
| **Sync Queue** | `SYNC-0001` | Asynchronous worker task for Google Sheets row updates |

---

## 3. Financial Calculation & Payment Logic

All financial computations are performed deterministically on the backend:

- **Monthly Due Calculation**:
  $$\text{Outstanding Balance} = \max(0, \text{Monthly Rent} - \text{Prior Rent Covered} - \text{Advance Applied})$$
- **Advance Generation**: If a tenant pays more than the outstanding rent for that month, the excess is credited to `availableAdvance`.
- **Advance Usage**: When paying rent, staff can allocate available advance credit to reduce the cash/GPay requirement.
- **Payment Mode Integrity**:
  - `CASH`: $100\%$ cash.
  - `GPAY`: $100\%$ digital UPI / GPay.
  - `BOTH`: Verified that $\text{Cash Amount} + \text{GPay Amount} == \text{Amount Received}$.
- **Idempotency & Duplicate Protection**: Frontend disables submit triggers during network transit; backend validates unique IDs and timestamps.

---

## 4. Google Sheets Synchronization Setup

The system mirrors records into a designated Google Spreadsheet with 5 synchronized sheets:
1. `Complexes`
2. `Shops`
3. `RentPayments`
4. `Expenses`
5. `AuditLogs`

### Environment Variables (`backend/.env`)

```env
# Google Cloud Service Account
GOOGLE_PROJECT_ID=client-2-507109
GOOGLE_CLIENT_EMAIL=kkv-gold-finance-drive@client-2-507109.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Drive & Sheets Identifiers
GOOGLE_DRIVE_FOLDER_ID=1yOKEY9Sw8xsvD5qiLHhMYuVENGTn8i5J
RENTAL_SPREADSHEET_ID=your-google-sheets-spreadsheet-id
```

### Setup Instructions
1. In the Google Cloud Console, enable **Google Sheets API** and **Google Drive API**.
2. Create a Service Account and download the JSON key.
3. Create a Google Spreadsheet and share it with the service account email (`kkv-gold-finance-drive@client-2-507109.iam.gserviceaccount.com`) as **Editor**.
4. Set `RENTAL_SPREADSHEET_ID` in `backend/.env`.
5. The backend will automatically verify headers and append/update rows during normal operations.

---

## 5. API Endpoints Reference

All Rental endpoints are prefixed with `/api/rental`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/rental/dashboard` | Aggregated dashboard stats, monthly trends, and payment mode splits |
| `GET` | `/api/rental/complexes` | List all complexes |
| `POST` | `/api/rental/complexes` | Create a new complex (`CMP-xxxx`) |
| `GET` | `/api/rental/complexes/:id` | Get single complex details |
| `PUT` | `/api/rental/complexes/:id` | Update complex name, location, or status |
| `GET` | `/api/rental/shops` | List shops with optional complex/status filters |
| `POST` | `/api/rental/shops` | Create a new shop (`SHOP-xxxx`) |
| `GET` | `/api/rental/shops/:id` | Get shop details with complete payment & expense history |
| `PUT` | `/api/rental/shops/:id` | Update shop unit, tenant KYC, or rent |
| `GET` | `/api/rental/payments` | Query payments with month, shop, complex, and mode filters |
| `POST` | `/api/rental/payments` | Record payment with balance & advance calculations (`PAY-xxxx`) |
| `GET` | `/api/rental/expenses` | Query expense ledger with category and date filters |
| `POST` | `/api/rental/expenses` | Record operating expense (`EXP-xxxx`) |
| `PUT` | `/api/rental/expenses/:id` | Update expense entry |
| `DELETE` | `/api/rental/expenses/:id` | Delete expense entry |
| `GET` | `/api/rental/reports/monthly` | Monthly rent report aggregated across complexes |
| `GET` | `/api/rental/reports/expenses` | Itemized category expense report |
| `GET` | `/api/rental/reports/payment-modes` | Cash vs GPay reconciliation report |
| `GET` | `/api/rental/admin/summary` | Admin panel executive summary & complex breakdown |
| `GET` | `/api/rental/sync/status` | Current Google Sheets synchronization summary |
| `POST` | `/api/rental/sync/retry` | Trigger immediate retry of pending/failed sync items |

---

## 6. How to Run Locally

### Start Backend
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:8080
```

### Start Frontend
```bash
npm install
npm run dev
# Running on http://localhost:5173
```
